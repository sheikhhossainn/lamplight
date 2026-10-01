import { Directory, File, Paths } from 'expo-file-system';

export {
  BIBLE_AUDIO_BASE,
  BIBLE_AUDIO_STEMS,
  QURAN_AYAH_AUDIO_BASE,
  QURAN_SURAH_VERSE_COUNTS,
  bibleChapterNarrationUrl,
  quranAyahRecitationUrl,
} from './scriptureAudioUrls';

import { quranAyahRecitationUrl } from './scriptureAudioUrls';

function getQuranRecitationsDirectory(): Directory {
  return new Directory(Paths.document, 'quran-recitations', 'alafasy-128');
}

function quranSurahRecitationDirectory(surahNumber: number): Directory {
  return new Directory(getQuranRecitationsDirectory(), String(surahNumber));
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
