// One-off fetch of the Rigveda (Ralph T.H. Griffith translation — public domain)
// from the indraai/deva.veda repository (free, no-key public data on GitHub)
// into static JSON assets bundled with the app.
//
// RUN LOCALLY (`npm run fetch:vedas`).
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'https://raw.githubusercontent.com/indraai/deva.veda/main/data/rigveda/books';
const OUT_DIR = path.join(process.cwd(), 'assets', 'vedas');

const BOOK_MEANINGS = {
  'RV01': 'Hymns to Agni, Indra, Varuna, and other deities by various sages',
  'RV02': 'Hymns chiefly by the sage Gritsamada',
  'RV03': 'Hymns chiefly by Visvamitra, containing the Gayatri Mantra',
  'RV04': 'Hymns chiefly by Vamadeva, focusing on Agni and Indra',
  'RV05': 'Hymns chiefly by the Atri clan',
  'RV06': 'Hymns chiefly by Bharadvaja',
  'RV07': 'Hymns chiefly by Vasistha',
  'RV08': 'Hymns chiefly by the Kanva clan, with Pragatha strophes',
  'RV09': 'Hymns entirely dedicated to Soma Pavamana (the purified drink)',
  'RV10': 'Later hymns containing philosophical, cosmic, and marriage verses',
};

function decodeHtmlEntities(str) {
  return str
    .replace(/&#257;/g, 'ā')
    .replace(/&#256;/g, 'Ā')
    .replace(/&#299;/g, 'ī')
    .replace(/&#298;/g, 'Ī')
    .replace(/&#363;/g, 'ū')
    .replace(/&#362;/g, 'Ū')
    .replace(/&#7749;/g, 'ṁ')
    .replace(/&#7748;/g, 'Ṁ')
    .replace(/&#7789;/g, 'ṭ')
    .replace(/&#7788;/g, 'Ṭ')
    .replace(/&#7693;/g, 'ḍ')
    .replace(/&#7692;/g, 'Ḍ')
    .replace(/&#7751;/g, 'ṇ')
    .replace(/&#7750;/g, 'Ṇ')
    .replace(/&#7779;/g, 'ṣ')
    .replace(/&#7778;/g, 'Ṣ')
    .replace(/&#347;/g, 'ś')
    .replace(/&#346;/g, 'Ś')
    .replace(/&#7717;/g, 'ḥ')
    .replace(/&#7716;/g, 'Ḥ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function fetchBook(bookNum) {
  const padBook = String(bookNum).padStart(2, '0');
  const url = `${BASE_URL}/${padBook}.json`;
  console.log(`Fetching ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch book ${bookNum} from ${url}`);
  }
  return res.json();
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });

  const books = [];
  const versesByBook = {};

  for (let i = 1; i <= 10; i++) {
    const rawData = await fetchBook(i);
    const bookId = `RV${String(i).padStart(2, '0')}`;
    const name = `Mandala ${i}`;
    const chapterCount = rawData.data.length; // Number of hymns

    books.push({
      id: bookId,
      name,
      chapterCount,
      meaning: BOOK_MEANINGS[bookId] || rawData.describe || '',
    });

    const chapters = {};
    for (let h = 0; h < rawData.data.length; h++) {
      const hymn = rawData.data[h];
      const chapterNumber = h + 1;

      // Extract and clean verses
      const rawContent = hymn.content || '';
      const lines = rawContent.split('\n').map(l => l.trim()).filter(Boolean);
      
      const verses = lines.map((line, vIdx) => {
        let text = line;
        if (text.startsWith('p:')) {
          text = text.slice(2).trim();
        }
        text = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        return {
          number: vIdx + 1,
          text: decodeHtmlEntities(text),
        };
      });

      chapters[chapterNumber] = verses;
    }

    versesByBook[bookId] = chapters;
    console.log(`Processed Mandala ${i}: ${chapterCount} hymns`);
  }

  await writeFile(path.join(OUT_DIR, 'books.json'), JSON.stringify(books, null, 2));
  await writeFile(path.join(OUT_DIR, 'verses.json'), JSON.stringify(versesByBook));

  console.log('Successfully wrote books.json and verses.json to assets/vedas/');
}

run().catch(console.error);
