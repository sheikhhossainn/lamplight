// One-off fetch of the full Quran (Arabic Uthmani script, Sahih International English
// translation, English transliteration, and Al-Jalalayn tafsir/commentary) into static JSON
// assets bundled with the app. Text comes from alquran.cloud (Islamic Network's free, no-key
// REST API); tafsir from spa5k/tafsir_api (free, no-key, CDN-hosted static JSON on jsdelivr).
// Unlike sync-books.mjs, this writes local files, not Supabase — the Quran text is
// fixed/canonical and small enough to ship in the binary rather than fetch and cache on-device
// like prose books.
//
// RUN LOCALLY (`npm run fetch:quran`). Re-run only if switching translation/tafsir editions;
// the output is committed to the repo.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://api.alquran.cloud/v1';
const TAFSIR_BASE = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/en-al-jalalayn';
const OUT_DIR = path.join(process.cwd(), 'assets', 'quran');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchRaw(url, attempt = 1) {
  const res = await fetch(url);
  if ((res.status === 429 || res.status === 503) && attempt <= 5) {
    const backoffMs = attempt * 2000;
    console.log(`${res.status}, retrying in ${backoffMs}ms (attempt ${attempt}) — ${url}`);
    await sleep(backoffMs);
    return fetchRaw(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`Fetch failed for ${url} (${res.status})`);
  return res.json();
}

async function fetchJson(url, attempt = 1) {
  const body = await fetchRaw(url, attempt);
  if (body.code !== 200) throw new Error(`Unexpected API response for ${url}: ${JSON.stringify(body)}`);
  return body.data;
}

async function fetchSurahTafsir(number) {
  const body = await fetchRaw(`${TAFSIR_BASE}/${number}.json`);
  const byAyah = new Map(body.ayahs.map((a) => [a.ayah, a.text]));
  return byAyah;
}

async function fetchSurahList() {
  const surahs = await fetchJson(`${BASE}/surah`);
  return surahs.map((s) => ({
    number: s.number,
    nameArabic: s.name,
    nameEnglish: s.englishName,
    nameTranslation: s.englishNameTranslation,
    revelationType: s.revelationType,
    verseCount: s.numberOfAyahs,
  }));
}

async function fetchSurahVerses(number) {
  const [arabic, english, transliteration] = await fetchJson(
    `${BASE}/surah/${number}/editions/quran-uthmani,en.sahih,en.transliteration`,
  );
  if (arabic.ayahs.length !== english.ayahs.length || arabic.ayahs.length !== transliteration.ayahs.length) {
    throw new Error(
      `Surah ${number}: ayah count mismatch (arabic ${arabic.ayahs.length}, english ${english.ayahs.length}, transliteration ${transliteration.ayahs.length})`,
    );
  }
  const tafsirByAyah = await fetchSurahTafsir(number);
  return arabic.ayahs.map((ayah, i) => ({
    number: ayah.numberInSurah,
    textArabic: ayah.text,
    textEnglish: english.ayahs[i].text,
    textTransliteration: transliteration.ayahs[i].text,
    textTafsir: tafsirByAyah.get(ayah.numberInSurah) ?? '',
  }));
}

await mkdir(OUT_DIR, { recursive: true });

const surahs = await fetchSurahList();
await writeFile(path.join(OUT_DIR, 'surahs.json'), JSON.stringify(surahs, null, 2));
console.log(`Wrote ${surahs.length} surahs to assets/quran/surahs.json`);

// One combined file (not one file per surah) — Metro can't `require()` a
// dynamic path, so per-surah files would need a 114-entry static require map
// anyway; a single keyed object is simpler and still small enough to bundle.
const versesBySurah = {};
for (const surah of surahs) {
  const verses = await fetchSurahVerses(surah.number);
  versesBySurah[surah.number] = verses;
  console.log(`Surah ${surah.number} (${surah.nameEnglish}): ${verses.length} verses`);
  await sleep(250); // stay well under the API's rate limit
}
await writeFile(path.join(OUT_DIR, 'verses.json'), JSON.stringify(versesBySurah));
console.log('Wrote assets/quran/verses.json');

console.log('Done.');
