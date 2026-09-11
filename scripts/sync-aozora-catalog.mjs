// Syncs Aozora Bunko (青空文庫) public domain catalog into Supabase public.books.
// Contains 17,000+ works from Japanese literary history (Soseki, Akutagawa,
// Dazai, Miyazawa, etc.). Bibliographic metadata is stored in Supabase with
// total_chapters = 0 (unknown) and downloaded/parsed on-device on demand.
//
// RUN LOCALLY: `node scripts/sync-aozora-catalog.mjs`
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';

const AOZORA_CATALOG_ZIP_URL =
  'https://raw.githubusercontent.com/aozorabunko/aozorabunko/master/index_pages/list_person_all_extended_utf8.zip';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CURATED_COVERS = {
  // Soseki
  '773': 'https://dowrzrsaywpgfyhirxlx.supabase.co/storage/v1/object/public/book-covers/ja-kokoro.jpg', // こころ
  '752': 'https://dowrzrsaywpgfyhirxlx.supabase.co/storage/v1/object/public/book-covers/ja-botchan.jpg', // 坊っちゃん
  // Akutagawa
  '1079': 'https://dowrzrsaywpgfyhirxlx.supabase.co/storage/v1/object/public/book-covers/ja-rashomon.jpg', // 羅生門
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function getCatalogCSV() {
  const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
  const cachedCsvPath = path.join(tempDir, 'aozora_list', 'list_person_all_extended_utf8.csv');

  if (existsSync(cachedCsvPath)) {
    console.log(`Using existing cached CSV: ${cachedCsvPath}`);
    return await readFile(cachedCsvPath, 'utf8');
  }

  console.log(`Downloading Aozora Bunko master catalog from ${AOZORA_CATALOG_ZIP_URL}...`);
  const response = await fetch(AOZORA_CATALOG_ZIP_URL);
  if (!response.ok) {
    throw new Error(`Failed to download Aozora catalog ZIP (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const csvFile = Object.values(zip.files).find((f) => f.name.endsWith('.csv'));
  if (!csvFile) {
    throw new Error('No CSV file found in Aozora catalog ZIP');
  }
  const csvText = await csvFile.async('text');
  return csvText;
}

async function fetchExistingHeroIds() {
  const { data, error } = await supabase
    .from('books')
    .select('id')
    .eq('source_language', 'ja')
    .like('id', 'ja-%');
  if (error) {
    console.warn('Could not fetch existing Japanese hero IDs:', error.message);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.id));
}

async function run() {
  console.log('--- Aozora Bunko Bulk Catalog Sync ---');
  const csvText = await getCatalogCSV();
  const lines = csvText.split(/\r?\n/);
  console.log(`Total CSV lines: ${lines.length}`);

  if (lines.length === 0) throw new Error('Empty CSV');

  const headers = parseCSVLine(lines[0].replace(/^\uFEFF/, ''));
  const workIdIdx = headers.indexOf('作品ID');
  const titleIdx = headers.indexOf('作品名');
  const subtitleIdx = headers.indexOf('副題');
  const authorLastIdx = headers.indexOf('姓');
  const authorFirstIdx = headers.indexOf('名');
  const roleIdx = headers.indexOf('役割フラグ');
  const copyrightIdx = headers.indexOf('作品著作権フラグ');
  const textUrlIdx = headers.indexOf('テキストファイルURL');
  const cardUrlIdx = headers.indexOf('図書カードURL');
  const ndcIdx = headers.indexOf('分類番号');

  const heroIds = await fetchExistingHeroIds();
  console.log(`Preserving ${heroIds.size} existing hero Japanese books.`);

  // Group by workId so works with multiple authors/translators don't duplicate
  const workMap = new Map();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);
    const copyright = cols[copyrightIdx];
    const textUrl = cols[textUrlIdx];
    const rawWorkId = cols[workIdIdx];

    // Only public domain works with valid text or zip download URLs
    if (copyright !== 'なし' || !textUrl || (!textUrl.endsWith('.zip') && !textUrl.endsWith('.txt'))) {
      continue;
    }

    const workId = String(parseInt(rawWorkId, 10)); // normalize leading zeros e.g. "059898" -> "59898"
    const bookId = `aozora-${workId}`;
    if (heroIds.has(bookId)) {
      continue; // keep curated hero book
    }

    if (workMap.has(bookId)) {
      // If already present, prefer "著者" role entry
      if (cols[roleIdx] === '著者') {
        const existing = workMap.get(bookId);
        const author = `${cols[authorLastIdx]} ${cols[authorFirstIdx]}`.trim();
        existing.author = author;
      }
      continue;
    }

    const rawTitle = cols[titleIdx];
    const subtitle = cols[subtitleIdx];
    const fullTitle = subtitle ? `${rawTitle} — ${subtitle}` : rawTitle;
    const author = `${cols[authorLastIdx]} ${cols[authorFirstIdx]}`.trim() || '不詳';
    const ndc = cols[ndcIdx]?.trim() || '';
    const cardUrl = cols[cardUrlIdx]?.trim() || '';

    let genre = '日本文学';
    if (ndc.startsWith('NDC 913')) genre = '小説';
    else if (ndc.startsWith('NDC 911')) genre = '詩歌・俳句';
    else if (ndc.startsWith('NDC 914')) genre = '評論・エッセイ';
    else if (ndc.startsWith('NDC 912')) genre = '戯曲';
    else if (ndc.startsWith('NDC 93')) genre = '英米文学';
    else if (ndc.startsWith('NDC 9')) genre = '外国文学';
    else if (ndc.startsWith('NDC 1')) genre = '哲学・宗教';
    else if (ndc.startsWith('NDC 2')) genre = '歴史・伝記';

    const synopsis = `青空文庫収蔵のパブリックドメイン作品（${genre}）。底本情報および詳細は青空文庫図書カードを参照。`;
    const coverUrl = CURATED_COVERS[workId] ?? null;

    workMap.set(bookId, {
      id: bookId,
      title: fullTitle,
      author,
      source_language: 'ja',
      synopsis,
      total_chapters: 0,
      gutenberg_id: null,
      source_format: 'aozora-text',
      text_url: textUrl,
      cover_url: coverUrl,
      categories: [genre, author],
      source: 'aozora_bunko',
      is_active: true,
      is_featured: false,
    });
  }

  const allBooks = Array.from(workMap.values());
  console.log(`Parsed ${allBooks.length} eligible public domain Aozora Bunko books!`);

  // Batch upsert to Supabase in chunks of 500
  const BATCH_SIZE = 500;
  let upsertedCount = 0;

  for (let i = 0; i < allBooks.length; i += BATCH_SIZE) {
    const chunk = allBooks.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('books').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`Error upserting batch at index ${i}:`, error.message);
      throw error;
    }
    upsertedCount += chunk.length;
    console.log(`Upserted ${upsertedCount} / ${allBooks.length} books (${Math.round((upsertedCount / allBooks.length) * 100)}%)`);
  }

  console.log(`\n🎉 Successfully synced all ${upsertedCount} Aozora Bunko books into Supabase!`);
}

run().catch((err) => {
  console.error('Fatal error in sync-aozora-catalog:', err);
  process.exit(1);
});
