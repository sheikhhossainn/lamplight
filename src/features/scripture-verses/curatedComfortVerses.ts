// Curated collection of high-resonance comforting scripture verses across traditions,
// indexed with emotional situations and comfort dimensions for instant, empathetic reflection.
import type { ScriptureVerseCard } from './moods';

export type CuratedComfortVerse = ScriptureVerseCard & {
  comfortDimension: 'peace' | 'strength' | 'rest' | 'reassurance' | 'light' | 'forgiveness' | 'patience' | 'gratitude' | 'guidance' | 'courage' | 'hope' | 'joy';
  situations: string[];
  reflectionHint: string;
};

export const CURATED_COMFORT_VERSES: CuratedComfortVerse[] = [
  {
    "id": "comfort-quran-94-5",
    "tradition": "quran",
    "book": "Ash-Sharh",
    "chapter": 94,
    "verseNumber": 5,
    "originalText": "فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
    "translation": "For indeed, with hardship [will be] ease.",
    "comfortDimension": "peace",
    "situations": [
      "anxiety",
      "worried",
      "panic",
      "overwhelmed",
      "stress",
      "hardship",
      "struggling",
      "burden",
      "heavy"
    ],
    "reflectionHint": "A timeless promise: ease is not just coming after hardship, but is woven alongside it."
  },
  {
    "id": "comfort-quran-94-6",
    "tradition": "quran",
    "book": "Ash-Sharh",
    "chapter": 94,
    "verseNumber": 6,
    "originalText": "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا",
    "translation": "Indeed, with hardship [will be] ease.",
    "comfortDimension": "peace",
    "situations": [
      "anxiety",
      "worried",
      "panic",
      "overwhelmed",
      "stress",
      "hardship",
      "struggling",
      "patience"
    ],
    "reflectionHint": "Reiterated for absolute reassurance: ease will triumph over every difficulty."
  },
  {
    "id": "comfort-quran-13-28",
    "tradition": "quran",
    "book": "Ar-Ra'd",
    "chapter": 13,
    "verseNumber": 28,
    "originalText": "ٱلَّذِينَ ءَامَنُوا۟ وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ ٱللَّهِ ۗ أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ",
    "translation": "Those who have believed and whose hearts are assured by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts are assured.\"",
    "comfortDimension": "peace",
    "situations": [
      "anxiety",
      "restless",
      "racing thoughts",
      "troubled",
      "unease",
      "stress",
      "seeking peace",
      "calm"
    ],
    "reflectionHint": "True stillness of the heart is found by remembering the Eternal."
  },
  {
    "id": "comfort-quran-65-3",
    "tradition": "quran",
    "book": "At-Talaaq",
    "chapter": 65,
    "verseNumber": 3,
    "originalText": "وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥٓ ۚ إِنَّ ٱللَّهَ بَٰلِغُ أَمْرِهِۦ ۚ قَدْ جَعَلَ ٱللَّهُ لِكُلِّ شَىْءٍۢ قَدْرًۭا",
    "translation": "And will provide for him from where he does not expect. And whoever relies upon Allah - then He is sufficient for him. Indeed, Allah will accomplish His purpose. Allah has already set for everything a [decreed] extent.",
    "comfortDimension": "reassurance",
    "situations": [
      "anxiety",
      "financial worry",
      "uncertainty",
      "future",
      "trust",
      "security",
      "fear",
      "lost control"
    ],
    "reflectionHint": "Whoever places their trust in God will find Him entirely sufficient."
  },
  {
    "id": "comfort-quran-2-286",
    "tradition": "quran",
    "book": "Al-Baqara",
    "chapter": 2,
    "verseNumber": 286,
    "originalText": "لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا ٱكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَآ إِن نَّسِينَآ أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَآ إِصْرًۭا كَمَا حَمَلْتَهُۥ عَلَى ٱلَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِۦ ۖ وَٱعْفُ عَنَّا وَٱغْفِرْ لَنَا وَٱرْحَمْنَآ ۚ أَنتَ مَوْلَىٰنَا فَٱنصُرْنَا عَلَى ٱلْقَوْمِ ٱلْكَٰفِرِينَ",
    "translation": "Allah does not charge a soul except [with that within] its capacity. It will have [the consequence of] what [good] it has gained, and it will bear [the consequence of] what [evil] it has earned. \"Our Lord, do not impose blame upon us if we have forgotten or erred. Our Lord, and lay not upon us a burden like that which You laid upon those before us. Our Lord, and burden us not with that which we have no ability to bear. And pardon us; and forgive us; and have mercy upon us. You are our protector, so give us victory over the disbelieving people.\"",
    "comfortDimension": "strength",
    "situations": [
      "overwhelmed",
      "burnout",
      "exhaustion",
      "can't take it",
      "breaking point",
      "too much",
      "burden"
    ],
    "reflectionHint": "You were never given a burden heavier than your soul has the capacity to bear."
  },
  {
    "id": "comfort-quran-2-153",
    "tradition": "quran",
    "book": "Al-Baqara",
    "chapter": 2,
    "verseNumber": 153,
    "originalText": "يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ ۚ إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ",
    "translation": "O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.",
    "comfortDimension": "patience",
    "situations": [
      "waiting",
      "patience",
      "hardship",
      "endurance",
      "frustrated",
      "exhausted",
      "prayer"
    ],
    "reflectionHint": "Patience and prayer anchor you: the Divine is with those who endure gently."
  },
  {
    "id": "comfort-bible-ot-PSA-23-4",
    "tradition": "bible-ot",
    "book": "Psalms",
    "bookId": "PSA",
    "chapter": 23,
    "verseNumber": 4,
    "originalText": "Even though I walk through the valley of the shadow of death,\nI will fear no evil, for you are with me.\nYour rod and your staff,\nthey comfort me.",
    "translation": null,
    "comfortDimension": "courage",
    "situations": [
      "fear",
      "darkness",
      "death",
      "shadow",
      "danger",
      "alone in the dark",
      "terror",
      "anxiety"
    ],
    "reflectionHint": "Even in the deepest shadow, you walk not alone, but shepherded and protected."
  },
  {
    "id": "comfort-bible-ot-PSA-46-1",
    "tradition": "bible-ot",
    "book": "Psalms",
    "bookId": "PSA",
    "chapter": 46,
    "verseNumber": 1,
    "originalText": "God is our refuge and strength,\na very present help in trouble.",
    "translation": null,
    "comfortDimension": "strength",
    "situations": [
      "trouble",
      "crisis",
      "shaken",
      "refuge",
      "shelter",
      "chaos",
      "afraid",
      "helpless"
    ],
    "reflectionHint": "An ever-present refuge and fortress when circumstances crumble."
  },
  {
    "id": "comfort-bible-ot-PSA-56-3",
    "tradition": "bible-ot",
    "book": "Psalms",
    "bookId": "PSA",
    "chapter": 56,
    "verseNumber": 3,
    "originalText": "When I am afraid,\nI will put my trust in you.",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "fear",
      "afraid",
      "scared",
      "dread",
      "terror",
      "anxiety",
      "trembling"
    ],
    "reflectionHint": "Fear is human, but surrender transforms fear into steady trust."
  },
  {
    "id": "comfort-bible-ot-ISA-41-10",
    "tradition": "bible-ot",
    "book": "Isaiah",
    "bookId": "ISA",
    "chapter": 41,
    "verseNumber": 10,
    "originalText": "Don’t you be afraid, for I am with you.\nDon’t be dismayed, for I am your God.\nI will strengthen you.\nYes, I will help you.\nYes, I will uphold you with the right hand of my righteousness.",
    "translation": null,
    "comfortDimension": "courage",
    "situations": [
      "fear",
      "dismayed",
      "weak",
      "powerless",
      "terrified",
      "shaking",
      "alone",
      "need strength"
    ],
    "reflectionHint": "Do not be dismayed: an upholding hand holds you steady."
  },
  {
    "id": "comfort-bible-nt-PHP-4-6",
    "tradition": "bible-nt",
    "book": "Philippians",
    "bookId": "PHP",
    "chapter": 4,
    "verseNumber": 6,
    "originalText": "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God.",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "anxious",
      "worry",
      "freaking out",
      "nervous",
      "overthinking",
      "racing mind",
      "panic"
    ],
    "reflectionHint": "Release anxiety through quiet, honest petition and open hands."
  },
  {
    "id": "comfort-bible-nt-PHP-4-7",
    "tradition": "bible-nt",
    "book": "Philippians",
    "bookId": "PHP",
    "chapter": 4,
    "verseNumber": 7,
    "originalText": "And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "peace",
      "serenity",
      "calm",
      "troubled mind",
      "guarded heart",
      "stillness"
    ],
    "reflectionHint": "A peace that surpasses human logic guards your heart and thoughts."
  },
  {
    "id": "comfort-bible-nt-MAT-6-34",
    "tradition": "bible-nt",
    "book": "Matthew",
    "bookId": "MAT",
    "chapter": 6,
    "verseNumber": 34,
    "originalText": "Therefore don’t be anxious for tomorrow, for tomorrow will be anxious for itself. Each day’s own evil is sufficient.",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "tomorrow",
      "future",
      "planning",
      "anticipation anxiety",
      "dread",
      "what if",
      "worry"
    ],
    "reflectionHint": "Today has enough cares of its own; tomorrow's grace will meet tomorrow's day."
  },
  {
    "id": "comfort-bible-nt-1PE-5-7",
    "tradition": "bible-nt",
    "book": "1 Peter",
    "bookId": "1PE",
    "chapter": 5,
    "verseNumber": 7,
    "originalText": "casting all your worries on him, because he cares for you.",
    "translation": null,
    "comfortDimension": "rest",
    "situations": [
      "worried",
      "cares",
      "heavy heart",
      "anxious",
      "weight on shoulders",
      "crying"
    ],
    "reflectionHint": "Cast your cares upon the One who gently holds and cares for you."
  },
  {
    "id": "comfort-bible-nt-JHN-14-27",
    "tradition": "bible-nt",
    "book": "John",
    "bookId": "JHN",
    "chapter": 14,
    "verseNumber": 27,
    "originalText": "Peace I leave with you. My peace I give to you; not as the world gives, give I to you. Don’t let your heart be troubled, neither let it be fearful.",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "fearful",
      "troubled",
      "peace",
      "goodbye",
      "parting",
      "restless heart"
    ],
    "reflectionHint": "A peace unlike anything this turbulent world can give."
  },
  {
    "id": "comfort-torah-NUM-6-24",
    "tradition": "torah",
    "book": "Numbers",
    "bookId": "NUM",
    "chapter": 6,
    "verseNumber": 24,
    "originalText": "‘Yahweh bless you, and keep you.",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "blessing",
      "protection",
      "safe",
      "kept",
      "shelter",
      "care",
      "children",
      "family"
    ],
    "reflectionHint": "The ancient Aaronic blessing: to be kept, sheltered, and guarded."
  },
  {
    "id": "comfort-torah-NUM-6-26",
    "tradition": "torah",
    "book": "Numbers",
    "bookId": "NUM",
    "chapter": 6,
    "verseNumber": 26,
    "originalText": "Yahweh lift up his face toward you,\nand give you peace.’",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "peace",
      "favor",
      "grace",
      "calm",
      "blessing",
      "light"
    ],
    "reflectionHint": "May the Divine countenance shine upon you and bestow deep shalom."
  },
  {
    "id": "comfort-torah-EXO-14-14",
    "tradition": "torah",
    "book": "Exodus",
    "bookId": "EXO",
    "chapter": 14,
    "verseNumber": 14,
    "originalText": "Yahweh will fight for you, and you shall be still.”",
    "translation": null,
    "comfortDimension": "reassurance",
    "situations": [
      "fighting",
      "trapped",
      "cornered",
      "nowhere to go",
      "hopeless battle",
      "be still"
    ],
    "reflectionHint": "When your back is against the sea: you have only to be still."
  },
  {
    "id": "comfort-vedas-RV01-11-2",
    "tradition": "vedas",
    "book": "Mandala 1",
    "bookId": "RV01",
    "chapter": 11,
    "verseNumber": 2,
    "originalText": "Strong in thy friendship, Indra, Lord of power and might, we have no fear. We glorify with praises thee, the never-conquered conqueror.",
    "translation": null,
    "comfortDimension": "courage",
    "situations": [
      "fear",
      "danger",
      "courage",
      "protection",
      "enemies",
      "adversity"
    ],
    "reflectionHint": "Calling upon strength and protection amid the storms of life."
  },
  {
    "id": "comfort-quran-93-3",
    "tradition": "quran",
    "book": "Ad-Dhuhaa",
    "chapter": 93,
    "verseNumber": 3,
    "originalText": "مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ",
    "translation": "Your Lord has not taken leave of you, [O Muhammad], nor has He detested [you].",
    "comfortDimension": "reassurance",
    "situations": [
      "abandoned",
      "feeling unloved",
      "failed",
      "silent god",
      "empty",
      "lonely",
      "forgotten",
      "impostor"
    ],
    "reflectionHint": "Your Lord has not abandoned you, nor does He detest you."
  },
  {
    "id": "comfort-quran-93-5",
    "tradition": "quran",
    "book": "Ad-Dhuhaa",
    "chapter": 93,
    "verseNumber": 5,
    "originalText": "وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰٓ",
    "translation": "And your Lord is going to give you, and you will be satisfied.",
    "comfortDimension": "hope",
    "situations": [
      "hopeless",
      "exhausted",
      "will it get better",
      "satisfaction",
      "future",
      "weary"
    ],
    "reflectionHint": "What is yet to come will unfold until your soul is truly satisfied."
  },
  {
    "id": "comfort-quran-3-139",
    "tradition": "quran",
    "book": "Aal-i-Imraan",
    "chapter": 3,
    "verseNumber": 139,
    "originalText": "وَلَا تَهِنُوا۟ وَلَا تَحْزَنُوا۟ وَأَنتُمُ ٱلْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ",
    "translation": "So do not weaken and do not grieve, and you will be superior if you are [true] believers.",
    "comfortDimension": "courage",
    "situations": [
      "defeated",
      "lost",
      "inferior",
      "failing",
      "weak",
      "grieving defeat",
      "demoralized"
    ],
    "reflectionHint": "Do not lose heart and do not grieve: your spirit will rise above this defeat."
  },
  {
    "id": "comfort-bible-ot-ISA-40-29",
    "tradition": "bible-ot",
    "book": "Isaiah",
    "bookId": "ISA",
    "chapter": 40,
    "verseNumber": 29,
    "originalText": "He gives power to the weak.\nHe increases the strength of him who has no might.",
    "translation": null,
    "comfortDimension": "strength",
    "situations": [
      "faint",
      "exhaustion",
      "no energy",
      "burnout",
      "drained",
      "empty cup",
      "fatigue"
    ],
    "reflectionHint": "He gives power to the faint and multiplies strength to those who have none left."
  },
  {
    "id": "comfort-bible-ot-ISA-40-31",
    "tradition": "bible-ot",
    "book": "Isaiah",
    "bookId": "ISA",
    "chapter": 40,
    "verseNumber": 31,
    "originalText": "But those who wait for Yahweh will renew their strength.\nThey will mount up with wings like eagles.\nThey will run, and not be weary.\nThey will walk, and not faint.",
    "translation": null,
    "comfortDimension": "strength",
    "situations": [
      "burnout",
      "weary",
      "waiting",
      "exhausted",
      "renewed",
      "soaring",
      "endurance"
    ],
    "reflectionHint": "Those who wait upon the Eternal shall mount up with wings like eagles."
  },
  {
    "id": "comfort-bible-ot-PSA-73-26",
    "tradition": "bible-ot",
    "book": "Psalms",
    "bookId": "PSA",
    "chapter": 73,
    "verseNumber": 26,
    "originalText": "My flesh and my heart fails,\nbut God is the strength of my heart and my portion forever.",
    "translation": null,
    "comfortDimension": "strength",
    "situations": [
      "failing",
      "body giving up",
      "faint heart",
      "weakness",
      "inadequate",
      "falling behind"
    ],
    "reflectionHint": "Though flesh and heart fail, God remains the steadfast rock of your heart."
  },
  {
    "id": "comfort-bible-nt-MAT-11-28",
    "tradition": "bible-nt",
    "book": "Matthew",
    "bookId": "MAT",
    "chapter": 11,
    "verseNumber": 28,
    "originalText": "“Come to me, all you who labor and are heavily burdened, and I will give you rest.",
    "translation": null,
    "comfortDimension": "rest",
    "situations": [
      "tired",
      "heavy burden",
      "burnout",
      "exhaustion",
      "labor",
      "weary",
      "need rest"
    ],
    "reflectionHint": "An open invitation to all who carry heavy burdens: come and find true rest."
  },
  {
    "id": "comfort-bible-nt-2CO-12-9",
    "tradition": "bible-nt",
    "book": "2 Corinthians",
    "bookId": "2CO",
    "chapter": 12,
    "verseNumber": 9,
    "originalText": "He has said to me,\n“My grace is sufficient for you, for my power is made perfect in weakness.” Most gladly therefore I will rather glory in my weaknesses, that the power of Christ may rest on me.",
    "translation": null,
    "comfortDimension": "reassurance",
    "situations": [
      "weak",
      "inadequate",
      "impostor",
      "flawed",
      "failing",
      "not enough",
      "struggling"
    ],
    "reflectionHint": "Grace is sufficient: divine strength shines brightest through our human fragility."
  },
  {
    "id": "comfort-bible-nt-PHP-4-13",
    "tradition": "bible-nt",
    "book": "Philippians",
    "bookId": "PHP",
    "chapter": 4,
    "verseNumber": 13,
    "originalText": "I can do all things through Christ, who strengthens me.",
    "translation": null,
    "comfortDimension": "strength",
    "situations": [
      "can't do it",
      "hard task",
      "challenge",
      "impossible",
      "courage",
      "perseverance"
    ],
    "reflectionHint": "Strength flows not from self-reliance, but through the One who empowers you."
  },
  {
    "id": "comfort-vedas-RV01-2-9",
    "tradition": "vedas",
    "book": "Mandala 1",
    "bookId": "RV01",
    "chapter": 2,
    "verseNumber": 9,
    "originalText": "Our Sages, Mitra-Varuṇa, wide dominion, strong by birth, Vouchsafe us strength that worketh well.",
    "translation": null,
    "comfortDimension": "strength",
    "situations": [
      "weariness",
      "need energy",
      "vitality",
      "strength",
      "dawn",
      "awakening"
    ],
    "reflectionHint": "Invoking the life-giving vigor that awakens every renewed soul."
  },
  {
    "id": "comfort-quran-2-156",
    "tradition": "quran",
    "book": "Al-Baqara",
    "chapter": 2,
    "verseNumber": 156,
    "originalText": "ٱلَّذِينَ إِذَآ أَصَٰبَتْهُم مُّصِيبَةٌۭ قَالُوٓا۟ إِنَّا لِلَّهِ وَإِنَّآ إِلَيْهِ رَٰجِعُونَ",
    "translation": "Who, when disaster strikes them, say, \"Indeed we belong to Allah, and indeed to Him we will return.\"",
    "comfortDimension": "reassurance",
    "situations": [
      "death",
      "loss",
      "grief",
      "mourning",
      "bereavement",
      "goodbye",
      "passed away"
    ],
    "reflectionHint": "We belong to the Infinite, and into that same loving embrace we all return."
  },
  {
    "id": "comfort-quran-12-86",
    "tradition": "quran",
    "book": "Yusuf",
    "chapter": 12,
    "verseNumber": 86,
    "originalText": "قَالَ إِنَّمَآ أَشْكُوا۟ بَثِّى وَحُزْنِىٓ إِلَى ٱللَّهِ وَأَعْلَمُ مِنَ ٱللَّهِ مَا لَا تَعْلَمُونَ",
    "translation": "He said, \"I only complain of my suffering and my grief to Allah, and I know from Allah that which you do not know.",
    "comfortDimension": "patience",
    "situations": [
      "grief",
      "crying",
      "broken heart",
      "sadness",
      "tears",
      "ache",
      "sorrow",
      "father",
      "child"
    ],
    "reflectionHint": "Pour out your grief and sorrow honestly: it is fully known and heard."
  },
  {
    "id": "comfort-quran-50-16",
    "tradition": "quran",
    "book": "Qaaf",
    "chapter": 50,
    "verseNumber": 16,
    "originalText": "وَلَقَدْ خَلَقْنَا ٱلْإِنسَٰنَ وَنَعْلَمُ مَا تُوَسْوِسُ بِهِۦ نَفْسُهُۥ ۖ وَنَحْنُ أَقْرَبُ إِلَيْهِ مِنْ حَبْلِ ٱلْوَرِيدِ",
    "translation": "And We have already created man and know what his soul whispers to him, and We are closer to him than [his] jugular vein",
    "comfortDimension": "reassurance",
    "situations": [
      "lonely",
      "abandoned",
      "alone",
      "nobody understands",
      "isolated",
      "nearness"
    ],
    "reflectionHint": "Closer to you than the very pulse beating within your throat."
  },
  {
    "id": "comfort-quran-2-186",
    "tradition": "quran",
    "book": "Al-Baqara",
    "chapter": 2,
    "verseNumber": 186,
    "originalText": "وَإِذَا سَأَلَكَ عِبَادِى عَنِّى فَإِنِّى قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ ٱلدَّاعِ إِذَا دَعَانِ ۖ فَلْيَسْتَجِيبُوا۟ لِى وَلْيُؤْمِنُوا۟ بِى لَعَلَّهُمْ يَرْشُدُونَ",
    "translation": "And when My servants ask you, [O Muhammad], concerning Me - indeed I am near. I respond to the invocation of the supplicant when he calls upon Me. So let them respond to Me [by obedience] and believe in Me that they may be [rightly] guided.",
    "comfortDimension": "reassurance",
    "situations": [
      "praying",
      "unanswered",
      "is anyone listening",
      "lonely",
      "calling out",
      "crying"
    ],
    "reflectionHint": "Whenever you ask: know that the Divine is intimately near and responds."
  },
  {
    "id": "comfort-bible-ot-PSA-34-18",
    "tradition": "bible-ot",
    "book": "Psalms",
    "bookId": "PSA",
    "chapter": 34,
    "verseNumber": 18,
    "originalText": "Yahweh is near to those who have a broken heart,\nand saves those who have a crushed spirit.",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "broken heart",
      "crushed spirit",
      "grief",
      "heartbreak",
      "shattered",
      "depression"
    ],
    "reflectionHint": "The Lord is nearest to those with a broken heart and a crushed spirit."
  },
  {
    "id": "comfort-bible-ot-PSA-30-5",
    "tradition": "bible-ot",
    "book": "Psalms",
    "bookId": "PSA",
    "chapter": 30,
    "verseNumber": 5,
    "originalText": "For his anger is but for a moment.\nHis favor is for a lifetime.\nWeeping may stay for the night,\nbut joy comes in the morning.",
    "translation": null,
    "comfortDimension": "hope",
    "situations": [
      "crying all night",
      "weeping",
      "sorrow",
      "dark night",
      "will joy return",
      "grief"
    ],
    "reflectionHint": "Weeping may endure for a night, but joy greets the rising morning."
  },
  {
    "id": "comfort-bible-ot-PSA-147-3",
    "tradition": "bible-ot",
    "book": "Psalms",
    "bookId": "PSA",
    "chapter": 147,
    "verseNumber": 3,
    "originalText": "He heals the broken in heart,\nand binds up their wounds.",
    "translation": null,
    "comfortDimension": "reassurance",
    "situations": [
      "brokenhearted",
      "wounded",
      "emotional pain",
      "trauma",
      "healing",
      "hurt"
    ],
    "reflectionHint": "He gently binds up every tender wound and heals the broken in heart."
  },
  {
    "id": "comfort-bible-ot-LAM-3-22",
    "tradition": "bible-ot",
    "book": "Lamentations",
    "bookId": "LAM",
    "chapter": 3,
    "verseNumber": 22,
    "originalText": "It is because of Yahweh’s loving kindnesses that we are not consumed,\nbecause his compassion doesn’t fail.",
    "translation": null,
    "comfortDimension": "hope",
    "situations": [
      "not consumed",
      "ruins",
      "hopeless",
      "loss",
      "faithful",
      "mercy",
      "grief"
    ],
    "reflectionHint": "Compassion that never fails: new every morning, steadfast and deep."
  },
  {
    "id": "comfort-bible-nt-MAT-5-4",
    "tradition": "bible-nt",
    "book": "Matthew",
    "bookId": "MAT",
    "chapter": 5,
    "verseNumber": 4,
    "originalText": "Blessed are those who mourn,\nfor they shall be comforted.",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "mourning",
      "loss",
      "grief",
      "sad",
      "crying",
      "tears",
      "bereaved"
    ],
    "reflectionHint": "Blessed are those who mourn: their tears are sacred and will be comforted."
  },
  {
    "id": "comfort-bible-nt-2CO-1-3",
    "tradition": "bible-nt",
    "book": "2 Corinthians",
    "bookId": "2CO",
    "chapter": 1,
    "verseNumber": 3,
    "originalText": "Blessed be the God and Father of our Lord Jesus Christ, the Father of mercies and God of all comfort;",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "comfort",
      "mercy",
      "affliction",
      "hurting",
      "consolation",
      "god of comfort"
    ],
    "reflectionHint": "The Father of mercies and the God of all comfort meets you in every affliction."
  },
  {
    "id": "comfort-torah-GEN-37-35",
    "tradition": "torah",
    "book": "Genesis",
    "bookId": "GEN",
    "chapter": 37,
    "verseNumber": 35,
    "originalText": "All his sons and all his daughters rose up to comfort him, but he refused to be comforted. He said, “For I will go down to Sheol to my son mourning.” His father wept for him.",
    "translation": null,
    "comfortDimension": "patience",
    "situations": [
      "mourning",
      "unconsolable",
      "loss of loved one",
      "parent grief",
      "weeping"
    ],
    "reflectionHint": "Acknowledging the depth of human grief, where love and sorrow meet."
  },
  {
    "id": "comfort-vedas-RV01-12-7",
    "tradition": "vedas",
    "book": "Mandala 1",
    "bookId": "RV01",
    "chapter": 12,
    "verseNumber": 7,
    "originalText": "Praise Agni in the sacrifice, the Sage whose ways are ever true, The God who driveth grief away.",
    "translation": null,
    "comfortDimension": "hope",
    "situations": [
      "sorrow",
      "darkness",
      "grief",
      "distress",
      "renewal"
    ],
    "reflectionHint": "A prayer to dispel the shadows of sorrow and make life expansive again."
  },
  {
    "id": "comfort-quran-39-53",
    "tradition": "quran",
    "book": "Az-Zumar",
    "chapter": 39,
    "verseNumber": 53,
    "originalText": "۞ قُلْ يَٰعِبَادِىَ ٱلَّذِينَ أَسْرَفُوا۟ عَلَىٰٓ أَنفُسِهِمْ لَا تَقْنَطُوا۟ مِن رَّحْمَةِ ٱللَّهِ ۚ إِنَّ ٱللَّهَ يَغْفِرُ ٱلذُّنُوبَ جَمِيعًا ۚ إِنَّهُۥ هُوَ ٱلْغَفُورُ ٱلرَّحِيمُ",
    "translation": "Say, \"O My servants who have transgressed against themselves [by sinning], do not despair of the mercy of Allah. Indeed, Allah forgives all sins. Indeed, it is He who is the Forgiving, the Merciful.\"",
    "comfortDimension": "forgiveness",
    "situations": [
      "guilt",
      "regret",
      "sinned",
      "mistake",
      "ashamed",
      "unforgivable",
      "shame",
      "despair of mercy"
    ],
    "reflectionHint": "Never despair of mercy: all sins are embraced in vast forgiveness."
  },
  {
    "id": "comfort-quran-4-110",
    "tradition": "quran",
    "book": "An-Nisaa",
    "chapter": 4,
    "verseNumber": 110,
    "originalText": "وَمَن يَعْمَلْ سُوٓءًا أَوْ يَظْلِمْ نَفْسَهُۥ ثُمَّ يَسْتَغْفِرِ ٱللَّهَ يَجِدِ ٱللَّهَ غَفُورًۭا رَّحِيمًۭا",
    "translation": "And whoever does a wrong or wrongs himself but then seeks forgiveness of Allah will find Allah Forgiving and Merciful.",
    "comfortDimension": "forgiveness",
    "situations": [
      "guilt",
      "wronged myself",
      "messed up",
      "regret",
      "remorse",
      "second chance"
    ],
    "reflectionHint": "Whoever turns back with remorse will find boundless forgiveness."
  },
  {
    "id": "comfort-bible-ot-PSA-103-12",
    "tradition": "bible-ot",
    "book": "Psalms",
    "bookId": "PSA",
    "chapter": 103,
    "verseNumber": 12,
    "originalText": "As far as the east is from the west,\nso far has he removed our transgressions from us.",
    "translation": null,
    "comfortDimension": "forgiveness",
    "situations": [
      "guilt",
      "shame",
      "past mistakes",
      "cannot forgive myself",
      "clean slate"
    ],
    "reflectionHint": "As far as the east is from the west, so far are your transgressions removed."
  },
  {
    "id": "comfort-bible-nt-1JN-1-9",
    "tradition": "bible-nt",
    "book": "1 John",
    "bookId": "1JN",
    "chapter": 1,
    "verseNumber": 9,
    "originalText": "If we confess our sins, he is faithful and righteous to forgive us the sins, and to cleanse us from all unrighteousness.",
    "translation": null,
    "comfortDimension": "forgiveness",
    "situations": [
      "confession",
      "guilt",
      "unrighteous",
      "shame",
      "cleansed",
      "forgiven"
    ],
    "reflectionHint": "Faithful and just: to forgive and gently cleanse every trace of unrighteousness."
  },
  {
    "id": "comfort-torah-EXO-34-6",
    "tradition": "torah",
    "book": "Exodus",
    "bookId": "EXO",
    "chapter": 34,
    "verseNumber": 6,
    "originalText": "Yahweh passed by before him, and proclaimed, “Yahweh! Yahweh, a merciful and gracious God, slow to anger, and abundant in loving kindness and truth,",
    "translation": null,
    "comfortDimension": "forgiveness",
    "situations": [
      "grace",
      "mercy",
      "slow to anger",
      "patience with flaws",
      "unconditional love"
    ],
    "reflectionHint": "Abundant in steadfast love and truth, patient with human frailty."
  },
  {
    "id": "comfort-quran-1-6",
    "tradition": "quran",
    "book": "Al-Faatiha",
    "chapter": 1,
    "verseNumber": 6,
    "originalText": "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ",
    "translation": "Guide us to the straight path -",
    "comfortDimension": "guidance",
    "situations": [
      "lost",
      "confused",
      "which way",
      "crossroads",
      "decision",
      "seeking path"
    ],
    "reflectionHint": "The primal human prayer: guide our trembling steps upon the straight path."
  },
  {
    "id": "comfort-bible-ot-PRO-3-5",
    "tradition": "bible-ot",
    "book": "Proverbs",
    "bookId": "PRO",
    "chapter": 3,
    "verseNumber": 5,
    "originalText": "Trust in Yahweh with all your heart,\nand don’t lean on your own understanding.",
    "translation": null,
    "comfortDimension": "guidance",
    "situations": [
      "decisions",
      "understanding",
      "trust",
      "uncertainty",
      "crossroads",
      "doubt",
      "life path"
    ],
    "reflectionHint": "Trust with your whole heart; do not lean solely on your own limited sight."
  },
  {
    "id": "comfort-bible-ot-PSA-119-105",
    "tradition": "bible-ot",
    "book": "Psalms",
    "bookId": "PSA",
    "chapter": 119,
    "verseNumber": 105,
    "originalText": "Your word is a lamp to my feet,\nand a light for my path.",
    "translation": null,
    "comfortDimension": "light",
    "situations": [
      "darkness",
      "direction",
      "lamp",
      "lost",
      "where to go",
      "guidance"
    ],
    "reflectionHint": "A lantern to guide your immediate steps and a light upon your wider road."
  },
  {
    "id": "comfort-vedas-RV01-90-1",
    "tradition": "vedas",
    "book": "Mandala 1",
    "bookId": "RV01",
    "chapter": 90,
    "verseNumber": 1,
    "originalText": "MAY Varuṇa with guidance straight, and Mitra lead us, he who knows, And Aryaman in accord with Gods.",
    "translation": null,
    "comfortDimension": "guidance",
    "situations": [
      "path",
      "guidance",
      "clarity",
      "safe journey",
      "light"
    ],
    "reflectionHint": "Let the path of virtue and clarity unfold brightly before our eyes."
  },
  {
    "id": "comfort-quran-14-7",
    "tradition": "quran",
    "book": "Ibrahim",
    "chapter": 14,
    "verseNumber": 7,
    "originalText": "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ ۖ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِى لَشَدِيدٌۭ",
    "translation": "And [remember] when your Lord proclaimed, 'If you are grateful, I will surely increase you [in favor]; but if you deny, indeed, My punishment is severe.' \"",
    "comfortDimension": "gratitude",
    "situations": [
      "grateful",
      "thankful",
      "blessed",
      "abundance",
      "appreciation",
      "joy"
    ],
    "reflectionHint": "If you are grateful, the blessings of life will surely increase and deepen."
  },
  {
    "id": "comfort-bible-nt-ROM-15-13",
    "tradition": "bible-nt",
    "book": "Romans",
    "bookId": "ROM",
    "chapter": 15,
    "verseNumber": 13,
    "originalText": "Now may the God of hope fill you with all joy and peace in believing, that you may abound in hope, in the power of the Holy Spirit.",
    "translation": null,
    "comfortDimension": "hope",
    "situations": [
      "hope",
      "joy",
      "peace",
      "renewed",
      "abound",
      "faith"
    ],
    "reflectionHint": "May the God of hope fill you with all joy and peace as you trust."
  },
  {
    "id": "comfort-vedas-RV01-90-6",
    "tradition": "vedas",
    "book": "Mandala 1",
    "bookId": "RV01",
    "chapter": 90,
    "verseNumber": 6,
    "originalText": "The winds waft sweets, the rivers pour sweets for the man who keeps the Law So may the plants be sweet for us.",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "nature",
      "peace",
      "sweetness",
      "harmony",
      "serenity",
      "gratitude",
      "calm"
    ],
    "reflectionHint": "May the winds blow sweetness, and the rivers flow sweet for a peaceful heart."
  },
  {
    "id": "comfort-vedas-RV01-1-1",
    "tradition": "vedas",
    "book": "Mandala 1",
    "bookId": "RV01",
    "chapter": 1,
    "verseNumber": 1,
    "originalText": "I Laud Agni, the chosen Priest, God, minister of sacrifice, The hotar, lavishest of wealth.",
    "translation": null,
    "comfortDimension": "light",
    "situations": [
      "morning",
      "dawn",
      "light",
      "prayer",
      "new beginning",
      "reverence"
    ],
    "reflectionHint": "Greeting the dawn of inner illumination and sacred renewal."
  },
  {
    "id": "comfort-quran-10-58",
    "tradition": "quran",
    "book": "Yunus",
    "chapter": 10,
    "verseNumber": 58,
    "originalText": "قُلْ بِفَضْلِ ٱللَّهِ وَبِرَحْمَتِهِۦ فَبِذَٰلِكَ فَلْيَفْرَحُوا۟ هُوَ خَيْرٌۭ مِّمَّا يَجْمَعُونَ",
    "translation": "Say, 'In the bounty of Allah and in His mercy - in that let them rejoice; it is better than what they accumulate.'",
    "comfortDimension": "joy",
    "situations": [
      "happy",
      "happiness",
      "joy",
      "joyful",
      "celebration",
      "rejoice",
      "blessed",
      "mercy",
      "content",
      "good news"
    ],
    "reflectionHint": "True joy is rejoicing in divine grace and gentle mercy, far richer than anything worldly."
  },
  {
    "id": "comfort-quran-53-43",
    "tradition": "quran",
    "book": "An-Najm",
    "chapter": 53,
    "verseNumber": 43,
    "originalText": "وَأَنَّهُۥ هُوَ أَضْحَكَ وَأَبْكَىٰ",
    "translation": "And that it is He who makes [one] laugh and weep.",
    "comfortDimension": "joy",
    "situations": [
      "happy",
      "laughter",
      "smile",
      "joy",
      "cheerful",
      "delight",
      "relief",
      "lighthearted"
    ],
    "reflectionHint": "Laughter and tears are both holy gifts from the Creator who understands every season of your soul."
  },
  {
    "id": "comfort-quran-14-7",
    "tradition": "quran",
    "book": "Ibrahim",
    "chapter": 14,
    "verseNumber": 7,
    "originalText": "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
    "translation": "And [remember] when your Lord proclaimed, 'If you are grateful, I will surely increase you [in favor].'",
    "comfortDimension": "gratitude",
    "situations": [
      "grateful",
      "gratitude",
      "thankful",
      "blessed",
      "happy",
      "abundance",
      "celebration"
    ],
    "reflectionHint": "Gratitude unlocks an ever-widening river of sacred blessings."
  },
  {
    "id": "comfort-torah-DEU-16-15",
    "tradition": "torah",
    "book": "Deuteronomy",
    "bookId": "DEU",
    "chapter": 16,
    "verseNumber": 15,
    "originalText": "Seven days you shall keep a feast to the LORD your God in the place which the LORD chooses; because the LORD your God will bless you in all your increase, and in all the work of your hands, and you shall be altogether joyful.",
    "translation": null,
    "comfortDimension": "joy",
    "situations": [
      "happy",
      "happiness",
      "joy",
      "joyful",
      "celebration",
      "feast",
      "blessing",
      "success",
      "accomplishment"
    ],
    "reflectionHint": "A sacred invitation to be completely and wholeheartedly joyful."
  },
  {
    "id": "comfort-torah-GEN-21-6",
    "tradition": "torah",
    "book": "Genesis",
    "bookId": "GEN",
    "chapter": 21,
    "verseNumber": 6,
    "originalText": "Sarah said, 'God has made laughter for me. Everyone who hears will laugh with me.'",
    "translation": null,
    "comfortDimension": "joy",
    "situations": [
      "happy",
      "laughter",
      "smile",
      "joy",
      "miracle",
      "wonder",
      "good news",
      "delight"
    ],
    "reflectionHint": "When unexpected joy arrives, it fills the heart with pure sacred laughter."
  },
  {
    "id": "comfort-torah-NUM-6-24",
    "tradition": "torah",
    "book": "Numbers",
    "bookId": "NUM",
    "chapter": 6,
    "verseNumber": 24,
    "originalText": "The LORD bless you, and keep you. The LORD make His face shine on you, and be gracious to you. The LORD lift up His countenance on you, and give you peace.",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "peace",
      "blessing",
      "protection",
      "serenity",
      "calm",
      "safe",
      "happy",
      "grace"
    ],
    "reflectionHint": "The ancient threefold blessing of perpetual peace and gentle light."
  },
  {
    "id": "comfort-torah-DEU-6-5",
    "tradition": "torah",
    "book": "Deuteronomy",
    "bookId": "DEU",
    "chapter": 6,
    "verseNumber": 5,
    "originalText": "You shall love the LORD your God with all your heart, and with all your soul, and with all your might.",
    "translation": null,
    "comfortDimension": "strength",
    "situations": [
      "love",
      "heart",
      "devotion",
      "strength",
      "purpose",
      "dedication"
    ],
    "reflectionHint": "Living with wholehearted love and devotion in every breath."
  },
  {
    "id": "comfort-bible-ot-PSA-126-2",
    "tradition": "bible-ot",
    "book": "Psalms",
    "bookId": "PSA",
    "chapter": 126,
    "verseNumber": 2,
    "originalText": "Then our mouth was filled with laughter, and our tongue with singing. Then they said among the nations, 'The LORD has done great things for them.'",
    "translation": null,
    "comfortDimension": "joy",
    "situations": [
      "happy",
      "happiness",
      "laughter",
      "singing",
      "joy",
      "celebration",
      "triumph",
      "miracle",
      "relieved"
    ],
    "reflectionHint": "Tears give way to overflowing laughter and song."
  },
  {
    "id": "comfort-bible-ot-PSA-118-24",
    "tradition": "bible-ot",
    "book": "Psalms",
    "bookId": "PSA",
    "chapter": 118,
    "verseNumber": 24,
    "originalText": "This is the day that the LORD has made. We will rejoice and be glad in it.",
    "translation": null,
    "comfortDimension": "joy",
    "situations": [
      "happy",
      "today",
      "morning",
      "rejoice",
      "glad",
      "celebrate",
      "gratitude",
      "wonderful"
    ],
    "reflectionHint": "Today is a fresh creation—greet it with rejoicing and gladness."
  },
  {
    "id": "comfort-bible-ot-PRO-17-22",
    "tradition": "bible-ot",
    "book": "Proverbs",
    "bookId": "PRO",
    "chapter": 17,
    "verseNumber": 22,
    "originalText": "A cheerful heart is good medicine, but a crushed spirit dries up the bones.",
    "translation": null,
    "comfortDimension": "joy",
    "situations": [
      "happy",
      "cheerful",
      "healing",
      "laughter",
      "good mood",
      "medicine",
      "lighthearted"
    ],
    "reflectionHint": "A cheerful spirit brings physical healing and warmth to your bones."
  },
  {
    "id": "comfort-bible-ot-PSA-100-1",
    "tradition": "bible-ot",
    "book": "Psalms",
    "bookId": "PSA",
    "chapter": 100,
    "verseNumber": 1,
    "originalText": "Shout for joy to the LORD, all you lands! Serve the LORD with gladness. Come before His presence with singing.",
    "translation": null,
    "comfortDimension": "joy",
    "situations": [
      "joy",
      "gladness",
      "singing",
      "praise",
      "happy",
      "gratitude",
      "celebration"
    ],
    "reflectionHint": "Enter the sanctuary of the present moment with gladness and song."
  },
  {
    "id": "comfort-bible-nt-PHP-4-4",
    "tradition": "bible-nt",
    "book": "Philippians",
    "bookId": "PHP",
    "chapter": 4,
    "verseNumber": 4,
    "originalText": "Rejoice in the Lord always! Again I will say, Rejoice!",
    "translation": null,
    "comfortDimension": "joy",
    "situations": [
      "happy",
      "happiness",
      "joy",
      "rejoice",
      "always",
      "celebration",
      "uplifted",
      "excited"
    ],
    "reflectionHint": "A resilient joy that remains steady through all winds of life."
  },
  {
    "id": "comfort-bible-nt-JHN-15-11",
    "tradition": "bible-nt",
    "book": "John",
    "bookId": "JHN",
    "chapter": 15,
    "verseNumber": 11,
    "originalText": "I have said these things to you, that my joy may be in you, and that your joy may be full.",
    "translation": null,
    "comfortDimension": "joy",
    "situations": [
      "joy",
      "fullness",
      "happy",
      "complete",
      "peace",
      "overflowing",
      "content"
    ],
    "reflectionHint": "An invitation to receive a joy so complete that it overflows."
  },
  {
    "id": "comfort-bible-nt-GAL-5-22",
    "tradition": "bible-nt",
    "book": "Galatians",
    "bookId": "GAL",
    "chapter": 5,
    "verseNumber": 22,
    "originalText": "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control.",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "love",
      "joy",
      "peace",
      "kindness",
      "gentleness",
      "happy",
      "character",
      "blessing"
    ],
    "reflectionHint": "Love and joy blooming naturally as the quiet fruit of a grounded soul."
  },
  {
    "id": "comfort-bible-nt-1TH-5-16",
    "tradition": "bible-nt",
    "book": "1 Thessalonians",
    "bookId": "1TH",
    "chapter": 5,
    "verseNumber": 16,
    "originalText": "Rejoice always. Pray without ceasing. In everything give thanks.",
    "translation": null,
    "comfortDimension": "gratitude",
    "situations": [
      "rejoice",
      "thankful",
      "gratitude",
      "happy",
      "prayer",
      "always"
    ],
    "reflectionHint": "The sacred rhythm of constant rejoicing and continuous gratitude."
  },
  {
    "id": "comfort-vedas-RV10-85-42",
    "tradition": "vedas",
    "book": "Mandala 10",
    "bookId": "RV10",
    "chapter": 85,
    "verseNumber": 42,
    "originalText": "Be not divided; stay here together; enjoy the full span of your life, playing with sons and grandsons, rejoicing in your home.",
    "translation": null,
    "comfortDimension": "joy",
    "situations": [
      "happy",
      "happiness",
      "joy",
      "family",
      "home",
      "together",
      "celebration",
      "rejoicing",
      "life"
    ],
    "reflectionHint": "A warm ancient blessing for a home filled with laughter, togetherness, and lifelong joy."
  },
  {
    "id": "comfort-vedas-RV08-48-3",
    "tradition": "vedas",
    "book": "Mandala 8",
    "bookId": "RV08",
    "chapter": 48,
    "verseNumber": 3,
    "originalText": "We have drunk the nectar, we have become immortal; we have gone to the light, we have found the Gods. What can an adversary do to harm us now?",
    "translation": null,
    "comfortDimension": "light",
    "situations": [
      "happy",
      "elated",
      "ecstatic",
      "light",
      "victorious",
      "invincible",
      "bliss",
      "triumph"
    ],
    "reflectionHint": "Touching the radiant eternal light within, where no shadow or fear can reach."
  },
  {
    "id": "comfort-vedas-RV10-191-2",
    "tradition": "vedas",
    "book": "Mandala 10",
    "bookId": "RV10",
    "chapter": 191,
    "verseNumber": 2,
    "originalText": "Meet together, speak together, let your minds be of one accord, common be your counsel, united be your hearts, that it may be well with you.",
    "translation": null,
    "comfortDimension": "peace",
    "situations": [
      "peace",
      "unity",
      "harmony",
      "friendship",
      "love",
      "community",
      "together",
      "understanding"
    ],
    "reflectionHint": "May your hearts be united and your thoughts in harmony, so peace blossoms around you."
  }
];
