const QURAN_AYAH_AUDIO_BASE = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy';
const BIBLE_AUDIO_BASE = 'https://ebible.org/engwebu/mp3';
const quranRecitationsDirectory = new Directory(Paths.document, 'quran-recitations', 'alafasy-128');

// The verified public-domain WEB recording set currently contains Genesis and
// the full New Testament. Keep this deliberately partial rather than silently
// substituting text-to-speech or a different Bible edition for the other books.
const BIBLE_AUDIO_STEMS: Record<string, string> = {
  GEN: '02_GEN',
  MAT: 'WEB-070-Matt',
  MRK: 'WEB-071-Mark',
  LUK: 'WEB-072-Luke',
  JHN: 'WEB-073-John',
  ACT: 'WEB-074-Acts',
  ROM: 'WEB-075-Romans',
  '1CO': 'WEB-076-1_Cor',
  '2CO': 'WEB-077-2_Cor',
  GAL: 'WEB-078-Gal',
  EPH: 'WEB-079-Eph',
  PHP: 'WEB-080-PHN',
  COL: 'WEB-081-COL',
  '1TH': 'WEB-082-1TH',
  '2TH': 'WEB-083-2TH',
  '1TI': 'WEB-084-1TI',
  '2TI': 'WEB-085-2TI',
  TIT: 'WEB-086-TIT',
  PHM: 'WEB-087-PHM',
  HEB: 'WEB-088-HEB',
  JAS: 'WEB-089-JAS',
  '1PE': 'WEB-090-1PE',
  '2PE': 'WEB-091-2PE',
  '1JN': 'WEB-092-1JN',
  '2JN': 'WEB-093-2JN',
  '3JN': 'WEB-094-3JN',
  JUD: 'WEB-095-JUD',
  REV: 'WEB-096-REV',
};

export function quranAyahRecitationUrl(surahNumber: number, verseNumber: number): string {
  const ayahsBeforeSurah = QURAN_SURAH_VERSE_COUNTS.slice(0, surahNumber - 1).reduce(
    (total, count) => total + count,
    0,
  );
  return `${QURAN_AYAH_AUDIO_BASE}/${ayahsBeforeSurah + verseNumber}.mp3`;
}

function quranSurahRecitationDirectory(surahNumber: number): Directory {
  return new Directory(quranRecitationsDirectory, String(surahNumber));
}

function quranSurahCompletionFile(surahNumber: number): File {
  return new File(quranSurahRecitationDirectory(surahNumber), '.complete');
}

function quranAyahRecitationFile(surahNumber: number, verseNumber: number): File {
  return new File(quranSurahRecitationDirectory(surahNumber), `${verseNumber}.mp3`);
}

export function isQuranSurahRecitationDownloaded(surahNumber: number): boolean {
  return quranSurahCompletionFile(surahNumber).exists;
}

export function quranAyahRecitationSource(
  surahNumber: number,
  verseNumber: number,
  preferOffline: boolean,
): string {
  const offlineFile = quranAyahRecitationFile(surahNumber, verseNumber);
  return preferOffline && offlineFile.exists ? offlineFile.uri : quranAyahRecitationUrl(surahNumber, verseNumber);
}

export async function downloadQuranSurahRecitation(
  surahNumber: number,
  verseNumbers: number[],
  onProgress: (completed: number, total: number) => void,
): Promise<void> {
  const directory = quranSurahRecitationDirectory(surahNumber);
  if (!directory.exists) directory.create({ intermediates: true });

  // Completion is written only after every ayah succeeds. If Android leaves a
  // partial file after an interrupted download, the next attempt overwrites it.
  for (let index = 0; index < verseNumbers.length; index += 1) {
    const verseNumber = verseNumbers[index];
    await File.downloadFileAsync(
      quranAyahRecitationUrl(surahNumber, verseNumber),
      quranAyahRecitationFile(surahNumber, verseNumber),
      { idempotent: true },
    );
    onProgress(index + 1, verseNumbers.length);
  }
  quranSurahCompletionFile(surahNumber).write('complete');
}

const QURAN_SURAH_VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53,
  89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12,
  12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26,
  30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

export function bibleChapterNarrationUrl(bookId: string, chapter: number): string | null {
  const stem = BIBLE_AUDIO_STEMS[bookId];
  if (!stem) return null;
  return `${BIBLE_AUDIO_BASE}/${stem}_${String(chapter).padStart(2, '0')}.mp3`;
}
import { Directory, File, Paths } from 'expo-file-system';
