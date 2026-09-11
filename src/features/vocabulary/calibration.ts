import { getSetting, setSetting } from '@/db/repositories/appSettings';
import type { LiteraryThemeCode } from '@/features/settings/literaryTheme';
import type { TargetReadingLanguageCode } from '@/features/settings/targetReadingLanguage';

export type CalibrationBand = 1 | 2 | 3 | 4;

export type CalibrationWord = {
  id: string;
  word: string;
  phonetic?: string;
  meaning: string;
  band: CalibrationBand;
};

export type CalibrationPreset = 'foundational' | 'intermediate' | 'advanced' | 'scholar';

export const CALIBRATION_WORDS: Record<TargetReadingLanguageCode, CalibrationWord[]> = {
  en: [
    // Band 1: Foundational (~1,000 common words)
    { id: 'en_1', word: 'journey', meaning: 'voyage · travel', band: 1 },
    { id: 'en_2', word: 'ancient', meaning: 'very old · historic', band: 1 },
    { id: 'en_3', word: 'wander', meaning: 'stroll · roam freely', band: 1 },

    // Band 2: Intermediate (~1,000 – 3,000 words)
    { id: 'en_4', word: 'solitude', meaning: 'state of being alone', band: 2 },
    { id: 'en_5', word: 'melancholy', meaning: 'pensive sadness', band: 2 },
    { id: 'en_6', word: 'deliberate', meaning: 'careful and unhurried', band: 2 },

    // Band 3: Advanced (~3,000 – 5,000 words)
    { id: 'en_7', word: 'labyrinth', meaning: 'intricate winding maze', band: 3 },
    { id: 'en_8', word: 'ephemeral', meaning: 'fleeting · transient', band: 3 },
    { id: 'en_9', word: 'incandescent', meaning: 'glowing with warm light', band: 3 },

    // Band 4: Literary / Victorian (~5,000+ words)
    { id: 'en_10', word: 'penumbra', meaning: 'twilight shadowed fringe', band: 4 },
    { id: 'en_11', word: 'vicissitude', meaning: 'unforeseen turn of fortune', band: 4 },
    { id: 'en_12', word: 'quintessential', meaning: 'purest, ideal embodiment', band: 4 },
  ],

  ja: [
    // Band 1: N5-N4 Foundational
    { id: 'ja_1', word: '時間', phonetic: 'じかん', meaning: 'time · hour', band: 1 },
    { id: 'ja_2', word: '旅行', phonetic: 'りょこう', meaning: 'journey · travel', band: 1 },
    { id: 'ja_3', word: '静か', phonetic: 'しずか', meaning: 'quiet · serene', band: 1 },

    // Band 2: N3 Intermediate
    { id: 'ja_4', word: '孤独', phonetic: 'こどく', meaning: 'solitude · loneliness', band: 2 },
    { id: 'ja_5', word: '感情', phonetic: 'かんじょう', meaning: 'emotion · feeling', band: 2 },
    { id: 'ja_6', word: '経験', phonetic: 'けいけん', meaning: 'experience', band: 2 },

    // Band 3: N2-N1 Advanced
    { id: 'ja_7', word: '彷徨う', phonetic: 'さまよう', meaning: 'wander · roam', band: 3 },
    { id: 'ja_8', word: '刹那', phonetic: 'せつな', meaning: 'fleeting moment', band: 3 },
    { id: 'ja_9', word: '憂鬱', phonetic: 'ゆううつ', meaning: 'melancholy · gloom', band: 3 },

    // Band 4: Aozora Literary
    { id: 'ja_10', word: '朧月', phonetic: 'おぼろづき', meaning: 'hazy springtime moon', band: 4 },
    { id: 'ja_11', word: '瞑想', phonetic: 'めいそう', meaning: 'silent contemplation', band: 4 },
    { id: 'ja_12', word: '憐憫', phonetic: 'れんびん', meaning: 'tender pity · mercy', band: 4 },
  ],

  bn: [
    // Band 1: Foundational
    { id: 'bn_1', word: 'সময়', phonetic: 'shomoy', meaning: 'time · moment', band: 1 },
    { id: 'bn_2', word: 'যাত্রা', phonetic: 'jatra', meaning: 'voyage · journey', band: 1 },
    { id: 'bn_3', word: 'নীরব', phonetic: 'nirob', meaning: 'silent · peaceful', band: 1 },

    // Band 2: Intermediate
    { id: 'bn_4', word: 'একাকীত্ব', phonetic: 'ekakitto', meaning: 'solitude · seclusion', band: 2 },
    { id: 'bn_5', word: 'স্মৃতিকথা', phonetic: 'smritikotha', meaning: 'reminiscence', band: 2 },
    { id: 'bn_6', word: 'অনুভূতি', phonetic: 'onubhuti', meaning: 'deep sentiment', band: 2 },

    // Band 3: Advanced
    { id: 'bn_7', word: 'গোলকধাঁধা', phonetic: 'golokdhadha', meaning: 'labyrinth · maze', band: 3 },
    { id: 'bn_8', word: 'ক্ষণস্থায়ী', phonetic: 'khonosthayi', meaning: 'ephemeral · fleeting', band: 3 },
    { id: 'bn_9', word: 'অনুশোচনা', phonetic: 'onushochona', meaning: 'remorse · regret', band: 3 },

    // Band 4: Literary Classics
    { id: 'bn_10', word: 'নিস্তব্ধতা', phonetic: 'nistobdhota', meaning: 'absolute stillness', band: 4 },
    { id: 'bn_11', word: 'মরীচিকা', phonetic: 'morichika', meaning: 'mirage · illusion', band: 4 },
    { id: 'bn_12', word: 'বিহ্বল', phonetic: 'bihbol', meaning: 'overwhelmed · charmed', band: 4 },
  ],

  ko: [
    // Band 1: Foundational
    { id: 'ko_1', word: '시간', phonetic: 'sigan', meaning: 'time · period', band: 1 },
    { id: 'ko_2', word: '여행', phonetic: 'yeohaeng', meaning: 'journey · travel', band: 1 },
    { id: 'ko_3', word: '고요', phonetic: 'goyo', meaning: 'stillness · quiet', band: 1 },

    // Band 2: Intermediate
    { id: 'ko_4', word: '고독', phonetic: 'godok', meaning: 'solitude · loneliness', band: 2 },
    { id: 'ko_5', word: '슬픔', phonetic: 'seulpeum', meaning: 'sorrow · grief', band: 2 },
    { id: 'ko_6', word: '추억', phonetic: 'chueok', meaning: 'treasured memory', band: 2 },

    // Band 3: Advanced
    { id: 'ko_7', word: '미궁', phonetic: 'migung', meaning: 'labyrinth · maze', band: 3 },
    { id: 'ko_8', word: '찰나', phonetic: 'chalna', meaning: 'fleeting instant', band: 3 },
    { id: 'ko_9', word: '황홀', phonetic: 'hwanghol', meaning: 'ecstasy · enchantment', band: 3 },

    // Band 4: Literary
    { id: 'ko_10', word: '여명', phonetic: 'yeomyeong', meaning: 'first light of dawn', band: 4 },
    { id: 'ko_11', word: '적막', phonetic: 'jeongmak', meaning: 'solemn silence', band: 4 },
    { id: 'ko_12', word: '비애', phonetic: 'biae', meaning: 'poignant grief', band: 4 },
  ],
};

export type CalibratedStartingBook = {
  id: string;
  title: string;
  author: string;
  synopsis: string;
  coveragePercent: number;
  coverageBadge: string;
  reason: string;
};

export type VocabularyEstimate = {
  count: number;
  countLabel: string;
  tierLabel: string;
  unlockedBook: string;
  coverageBadge: string;
  startingBook: CalibratedStartingBook;
};

export function getPresetWordIds(
  lang: TargetReadingLanguageCode,
  preset: CalibrationPreset,
): string[] {
  const words = CALIBRATION_WORDS[lang] ?? CALIBRATION_WORDS.en;
  switch (preset) {
    case 'foundational':
      return words.filter((w) => w.band === 1).map((w) => w.id);
    case 'intermediate':
      return words.filter((w) => w.band <= 2).map((w) => w.id);
    case 'advanced':
      return words.filter((w) => w.band <= 3).map((w) => w.id);
    case 'scholar':
      return words.map((w) => w.id);
  }
}

export function getCalibratedStartingBook(
  lang: TargetReadingLanguageCode,
  theme: LiteraryThemeCode = 'romance',
  vocabCount: number = 3500,
): CalibratedStartingBook {
  if (lang === 'ja') {
    if (theme === 'gothic') {
      return {
        id: 'aozora-rashomon',
        title: '羅生門 (Rashomon)',
        author: '芥川龍之介 (Akutagawa)',
        synopsis: 'A chilling psychological encounter at the southern gate of Kyoto amidst moral ruin.',
        coveragePercent: 96,
        coverageBadge: '96% Ready',
        reason: 'Matches your taste for Gothic mystery and ~' + vocabCount.toLocaleString() + ' words lexicon.',
      };
    }
    if (theme === 'philosophy') {
      return {
        id: 'aozora-kokoro',
        title: 'こころ (Kokoro)',
        author: '夏目漱石 (Natsume Soseki)',
        synopsis: 'A profound exploration of isolation, guilt, and the changing soul of Meiji Japan.',
        coveragePercent: 97,
        coverageBadge: '97% Ready',
        reason: 'Tailored for philosophical inquiry with optimal reading comprehension.',
      };
    }
    if (theme === 'adventure') {
      return {
        id: 'aozora-gingatetsudo',
        title: '銀河鉄道の夜',
        author: '宮沢賢治 (Kenji Miyazawa)',
        synopsis: 'A magical steam-train voyage across the incandescent constellations of the night sky.',
        coveragePercent: 98,
        coverageBadge: '98% Ready',
        reason: 'Effortless mythic voyage calibrated to your vocabulary level.',
      };
    }
    return {
      id: 'aozora-wagahai',
      title: '吾輩は猫である (I Am a Cat)',
      author: '夏目漱石 (Natsume Soseki)',
      synopsis: 'A witty, observant house cat comments on the eccentricities of human society.',
      coveragePercent: 96,
      coverageBadge: '96% Ready',
      reason: 'Perfect balance of social satire and comfortable reading speed.',
    };
  }

  if (lang === 'bn') {
    if (theme === 'philosophy') {
      return {
        id: 'bn-gitanjali',
        title: 'গীতাঞ্জলি (Song Offerings)',
        author: 'রবীন্দ্রনাথ ঠাকুর',
        synopsis: 'আধ্যাত্মিক নিবেদন ও মানবতার চিরন্তন সুর নিয়ে রচিত নোবেলজয়ী কাব্যগ্রন্থ।',
        coveragePercent: 98,
        coverageBadge: '98% Ready',
        reason: 'আপনার দর্শনের আগ্রহ এবং শব্দভাণ্ডারের জন্য নিখুঁত মিল।',
      };
    }
    if (theme === 'adventure') {
      return {
        id: 'bn-pather-panchali',
        title: 'পথের পাঁচালী (Song of the Little Road)',
        author: 'বিভূতিভূষণ বন্দ্যোপাধ্যায়',
        synopsis: 'বাংলার প্রকৃতির রূপ, অপুর শৈশব আর অবিস্মরণীয় জীবনের অন্বেষণ।',
        coveragePercent: 96,
        coverageBadge: '96% Ready',
        reason: 'প্রকৃতি ও রোমাঞ্চকর জীবনের চিত্ররূপ, যা অনায়াসে পাঠযোগ্য।',
      };
    }
    if (theme === 'gothic') {
      return {
        id: 'bn-golpoguchho',
        title: 'কঙ্কাল ও অলৌকিক গল্প (গল্পগুচ্ছ)',
        author: 'রবীন্দ্রনাথ ঠাকুর',
        synopsis: 'রহস্য, মায়া ও অদ্ভুত অনুভূতির মেলবন্ধনে রচিত অলৌকিক কথামালা।',
        coveragePercent: 96,
        coverageBadge: '96% Ready',
        reason: 'রহস্যময় গা ছমছমে আবহ যা আপনার শব্দস্তরের সাথে নিখুঁতভাবে খাপ খায়।',
      };
    }
    return {
      id: 'bn-shesher-kobita',
      title: 'শেষের কবিতা (The Last Poem)',
      author: 'রবীন্দ্রনাথ ঠাকুর',
      synopsis: 'শিলং পাহাড়ের পটভূমিতে অমিত ও লাবণ্যের আধুনিক, রসাল প্রেমকাব্য।',
      coveragePercent: 97,
      coverageBadge: '97% Ready',
      reason: 'বুদ্ধিদীপ্ত প্রেমের উপন্যাস যা ৯৭% সাবলীলভাবে পাঠ করা সম্ভব।',
    };
  }

  if (lang === 'ko') {
    if (theme === 'philosophy') {
      return {
        id: 'ko-nalgae',
        title: '날개 (Wings)',
        author: '이상 (Yi Sang)',
        synopsis: '현대인의 내면적 고독과 자아 분열을 그린 한국 모더니즘 문학의 기념비적 작품.',
        coveragePercent: 96,
        coverageBadge: '96% Ready',
        reason: '철학적 성찰과 섬세한 내면 묘사가 당신의 어휘 수준과 완벽히 일치합니다.',
      };
    }
    if (theme === 'adventure') {
      return {
        id: 'ko-buckwheat',
        title: '메밀꽃 필 무렵',
        author: '이효석 (Lee Hyo-seok)',
        synopsis: '달밤 메밀꽃이 소금처럼 흐드러지게 핀 길을 걷는 장돌뱅이의 서정적 여정.',
        coveragePercent: 98,
        coverageBadge: '98% Ready',
        reason: '달빛 아래 펼쳐지는 서정적 여정을 편안하게 감상할 수 있습니다.',
      };
    }
    if (theme === 'gothic') {
      return {
        id: 'ko-lucky-day',
        title: '운수 좋은 날 (A Lucky Day)',
        author: '현진건 (Hyun Jin-geon)',
        synopsis: '비 내리는 서울 거리, 인력거꾼 김첨지의 기묘하고 비극적인 하루.',
        coveragePercent: 96,
        coverageBadge: '96% Ready',
        reason: '어둠과 비극의 긴장감이 어휘 수준에 맞게 최적화되어 있습니다.',
      };
    }
    return {
      id: 'ko-spring',
      title: '봄·봄 (Spring, Spring)',
      author: '김유정 (Kim Yu-jeong)',
      synopsis: '순박한 데릴사위와 능청스러운 장인 사이의 해학적인 갈등과 로맨스.',
      coveragePercent: 97,
      coverageBadge: '97% Ready',
      reason: '위트 넘치는 대화와 서사로 읽기 피로도가 거의 없습니다.',
    };
  }

  // English Literature
  if (theme === 'gothic') {
    if (vocabCount < 5500) {
      return {
        id: 'frankenstein',
        title: 'Frankenstein',
        author: 'Mary Shelley',
        synopsis: 'A scientist breathes life into a creature of his own making, igniting a haunting exploration of solitude and moral reckoning.',
        coveragePercent: 96,
        coverageBadge: '96% Ready',
        reason: 'Matches your love for Gothic mystery and your ~' + vocabCount.toLocaleString() + ' vocabulary.',
      };
    }
    return {
      id: 'dracula',
      title: 'Dracula',
      author: 'Bram Stoker',
      synopsis: 'The quintessential epistolary vampire gothic, tracing Count Dracula’s crossing from the Carpathians to England.',
      coveragePercent: 98,
      coverageBadge: '98% Ready',
      reason: 'Near-effortless reading speed for your advanced lexicon.',
    };
  }

  if (theme === 'philosophy') {
    if (vocabCount < 5500) {
      return {
        id: 'crime-and-punishment',
        title: 'Crime and Punishment',
        author: 'Fyodor Dostoevsky',
        synopsis: 'A destitute student commits a calculated murder, then spends the novel in a psychological labyrinth of conscience and redemption.',
        coveragePercent: 95,
        coverageBadge: '95% Ready',
        reason: 'A profound moral inquiry right in your optimal comprehension zone.',
      };
    }
    return {
      id: 'anna-karenina',
      title: 'Anna Karenina',
      author: 'Leo Tolstoy',
      synopsis: 'An epic exploration of human desire, high society morality, and spiritual search for meaning in 19th-century Russia.',
      coveragePercent: 98,
      coverageBadge: '98% Ready',
      reason: 'Philosophical masterpiece matched to your advanced vocabulary.',
    };
  }

  if (theme === 'adventure') {
    if (vocabCount < 5500) {
      return {
        id: 'don-quixote',
        title: 'Don Quixote',
        author: 'Miguel de Cervantes',
        synopsis: 'The noble knight errant sets out into a comedic world where chivalric romance meets hard reality.',
        coveragePercent: 96,
        coverageBadge: '96% Ready',
        reason: 'Classic epic adventure calibrated for smooth reading.',
      };
    }
    return {
      id: 'the-odyssey',
      title: 'The Odyssey',
      author: 'Homer',
      synopsis: 'Odysseus’s ten-year voyage home through monsters, sirens, and divine wrath.',
      coveragePercent: 98,
      coverageBadge: '98% Ready',
      reason: 'Legendary epic accessible at 98% comprehension with zero reading fatigue.',
    };
  }

  // Default: Romance & Social Wit
  return {
    id: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    synopsis: 'A sparkling novel of manners, courtship, and first impressions undone among the landed gentry of Regency England.',
    coveragePercent: vocabCount >= 4000 ? 98 : 96,
    coverageBadge: vocabCount >= 4000 ? '98% Ready' : '96% Ready',
    reason: 'Matches your taste for social wit and your ~' + vocabCount.toLocaleString() + ' vocabulary.',
  };
}

export function calculateVocabularyEstimate(
  lang: TargetReadingLanguageCode,
  selectedWordIds: Set<string> | string[],
  theme: LiteraryThemeCode = 'romance',
): VocabularyEstimate {
  const selectedSet = selectedWordIds instanceof Set ? selectedWordIds : new Set(selectedWordIds);
  const words = CALIBRATION_WORDS[lang] ?? CALIBRATION_WORDS.en;

  let band1Count = 0;
  let band2Count = 0;
  let band3Count = 0;
  let band4Count = 0;

  for (const w of words) {
    if (selectedSet.has(w.id)) {
      if (w.band === 1) band1Count++;
      else if (w.band === 2) band2Count++;
      else if (w.band === 3) band3Count++;
      else if (w.band === 4) band4Count++;
    }
  }

  const totalWords = 1000 + band1Count * 300 + band2Count * 700 + band3Count * 1200 + band4Count * 1500;
  const startingBook = getCalibratedStartingBook(lang, theme, totalWords);

  let tierLabel = 'Intermediate Reader';
  if (totalWords < 2500) tierLabel = 'Foundational Reader';
  else if (totalWords < 5500) tierLabel = 'Intermediate Reader';
  else if (totalWords < 9000) tierLabel = 'Advanced Literature Reader';
  else tierLabel = 'Literary Scholar';

  return {
    count: totalWords,
    countLabel: `~${totalWords.toLocaleString()} words`,
    tierLabel,
    unlockedBook: `${startingBook.title} (${startingBook.coverageBadge})`,
    coverageBadge: startingBook.coverageBadge,
    startingBook,
  };
}

const STORAGE_CALIBRATION_KEY = 'baseline_vocab_size';
const STORAGE_CALIBRATION_TIER = 'baseline_vocab_tier';
const STORAGE_CALIBRATION_WORDS = 'baseline_calibration_words';
const STORAGE_CALIBRATED_FLAG = 'baseline_calibrated';
const STORAGE_RECOMMENDED_BOOK = 'calibrated_starting_book_id';

export async function saveCalibrationData(params: {
  targetReadingLanguage: TargetReadingLanguageCode;
  estimatedWords: number;
  tierLabel: string;
  selectedWordIds: string[];
  recommendedBookId?: string;
}): Promise<void> {
  const tasks: Promise<void>[] = [
    setSetting(STORAGE_CALIBRATION_KEY, String(params.estimatedWords)),
    setSetting(STORAGE_CALIBRATION_TIER, params.tierLabel),
    setSetting(STORAGE_CALIBRATION_WORDS, JSON.stringify(params.selectedWordIds)),
    setSetting(STORAGE_CALIBRATED_FLAG, 'true'),
  ];
  if (params.recommendedBookId) {
    tasks.push(setSetting(STORAGE_RECOMMENDED_BOOK, params.recommendedBookId));
  }
  await Promise.all(tasks);
}

export async function getStoredCalibrationData(): Promise<{
  estimatedWords: number;
  tierLabel: string;
  isCalibrated: boolean;
  recommendedBookId: string | null;
} | null> {
  const flag = await getSetting(STORAGE_CALIBRATED_FLAG);
  if (flag !== 'true') return null;

  const countStr = await getSetting(STORAGE_CALIBRATION_KEY);
  const tier = await getSetting(STORAGE_CALIBRATION_TIER);
  const bookId = await getSetting(STORAGE_RECOMMENDED_BOOK);

  return {
    estimatedWords: countStr ? parseInt(countStr, 10) : 3500,
    tierLabel: tier ?? 'Intermediate Reader',
    isCalibrated: true,
    recommendedBookId: bookId ?? null,
  };
}
