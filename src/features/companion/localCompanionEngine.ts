/**
 * Local AI Reading Companion Engine (FULLAPP.md §16)
 *
 * Provides intelligent, on-device literary analysis when offline,
 * when edge services are unreachable, or as an instantaneous smart fallback.
 *
 * Guarantees:
 * - 100% spoiler-free scope (never leaks events beyond provided chapter).
 * - Rich literary understanding: diction, tone, classical allusions,
 *   archaic vocabulary translation, and character tracking.
 */

import type {
  CompanionCharactersResult,
  CompanionExplainResult,
  CompanionReflectionsResult,
  CompanionSimplifyResult,
  CompanionSummaryResult,
} from './readingCompanionService';

export type CompanionAskResult = {
  answer: string;
  keyThemes?: string[];
  suggestedFollowUps?: string[];
  version: string;
};

// Rich lexicon of archaic, Victorian, and classical literary vocabulary
const ARCHAIC_LEXICON: Record<string, string> = {
  abhor: 'detest or strongly despise',
  afeard: 'afraid or frightened',
  alack: 'an expression of regret or sorrow',
  anon: 'soon or shortly',
  art: 'are',
  beguile: 'charm, enchant, or deceive pleasantly',
  beseech: 'fervently plead or beg',
  betwixt: 'between',
  chide: 'scold or reprimand gently',
  cleave: 'cling tightly to, or split apart',
  countenance: 'facial expression or demeanor',
  cuckold: 'a betrayed spouse',
  disposition: 'inherent temperament or character',
  dost: 'do',
  doth: 'does',
  ere: 'before',
  fain: 'gladly or willingly',
  forbear: 'restrain oneself from action',
  forsooth: 'in truth or indeed',
  fortnight: 'a period of two weeks (fourteen nights)',
  hark: 'listen attentively',
  hast: 'have',
  hath: 'has',
  hearken: 'listen closely and give heed',
  heretofore: 'before this time',
  hither: 'to this place or here',
  importune: 'persistently press or urge someone',
  inasmuch: 'to the extent that',
  kine: 'cattle',
  lo: 'look, see, or behold',
  melancholy: 'deep, pensive sadness',
  nay: 'no, or rather',
  nigh: 'near or close at hand',
  parley: 'negotiate or hold a formal discussion',
  perchance: 'perhaps or by chance',
  plight: 'a solemn pledge, or an unfortunate predicament',
  quoth: 'said or spoke',
  raiment: 'fine clothing or garments',
  recompense: 'repayment, compensation, or reward',
  scant: 'barely sufficient or scarce',
  shalt: 'shall',
  smite: 'strike with heavy force',
  sunder: 'break or sever apart',
  surfeit: 'an excessive overindulgence',
  tarry: 'delay, linger, or stay behind',
  thee: 'you (object pronoun)',
  thine: 'yours (possessive)',
  thou: 'you (subject pronoun)',
  thy: 'your (possessive determiner)',
  unwonted: 'unusual or unaccustomed',
  vex: 'annoy, provoke, or distress',
  visage: 'face, appearance, or countenance',
  vouchsafe: 'condescend to grant or bestow',
  wan: 'pale, sickly, or faint',
  wherefore: 'why or for what reason',
  whilst: 'while',
  wilt: 'will',
  wistful: 'characterized by melancholy yearning',
  withal: 'in addition, nevertheless, or with',
  woe: 'deep distress or affliction',
  wont: 'custom, habit, or accustomed practice',
  ye: 'you (plural or formal)',
  yield: 'surrender, produce, or submit',
  yonder: 'at that distant place over there',
  zeal: 'fervent passion or enthusiasm',
};

// Classical, mythological, biblical, and historical allusion signatures
const ALLUSIONS_DATABASE: Array<{
  pattern: RegExp;
  title: string;
  note: string;
}> = [
  {
    pattern: /\b(achilles|patroclus|myrmidons?)\b/i,
    title: 'Homeric Epics (Iliad)',
    note: 'Allusion to Achilles, the quintessential tragic Greek hero of the Trojan War, symbolizing overwhelming martial prowess intertwined with tragic vulnerability and fatal pride.',
  },
  {
    pattern: /\b(eden|paradise|serpent|tree of knowledge|forbidden fruit|fall of man)\b/i,
    title: 'Biblical Genesis & Miltonic Fall',
    note: 'Evokes the pristine innocence and catastrophic loss of Eden, representing a state of uncorrupted grace before moral transgressions or irreversible knowledge.',
  },
  {
    pattern: /\b(babel|tower of babel|confounding of tongues)\b/i,
    title: 'Tower of Babel (Genesis 11)',
    note: 'Signifies human hubris attempting to rival the divine, resulting in mutual misunderstanding, fractured communication, and dispersion.',
  },
  {
    pattern: /\b(job|patient job|whirlwind|comforters?)\b/i,
    title: 'The Book of Job',
    note: 'Invokes profound, inexplicable suffering endured without loss of spiritual integrity; questioning divine justice amidst innocent catastrophe.',
  },
  {
    pattern: /\b(prometheus|promethean|unbound|fire from heaven)\b/i,
    title: 'Promethean Myth',
    note: 'Signifies the noble, defiant rebel who steals illumination or technological knowledge for humanity despite enduring eternal personal torment.',
  },
  {
    pattern: /\b(lethe|forgetfulness|waters of lethe)\b/i,
    title: 'River Lethe (Classical Underworld)',
    note: 'The mythical subterranean river whose waters grant total oblivion and erasure of past grief, memory, and guilt.',
  },
  {
    pattern: /\b(styx|acheron|charon|obol)\b/i,
    title: 'Stygian Crossing (Underworld)',
    note: 'References the boundary river between the living earth and the realm of the dead, representing finality, irreversible passage, and mortality.',
  },
  {
    pattern: /\b(icarus|daedalus|waxen wings|wax wings)\b/i,
    title: 'Myth of Icarus',
    note: 'Archetypal cautionary tale of youthful impetuosity and fatal ambition flying too close to the scorching sun.',
  },
  {
    pattern: /\b(caesar|rubicon|brutus|ides of march)\b/i,
    title: 'Roman History & Shakespearean Tragedy',
    note: 'Signifies crossing a point of irreversible political commitment (the Rubicon), accompanied by the poignant betrayal of trust by beloved comrades.',
  },
  {
    pattern: /\b(faust|faustian|mephistopheles|sold.*soul)\b/i,
    title: 'Faustian Bargain',
    note: 'Metaphor for surrendering supreme moral, ethical, or spiritual values in exchange for worldly power, knowledge, or fleeting gratification.',
  },
  {
    pattern: /\b(nemesis|retribution|unsparing fate)\b/i,
    title: 'Greek Nemesis (Divine Retribution)',
    note: 'The inescapable mythological force that humbles arrogant fortune and exacts cosmic equilibrium upon hubristic pride.',
  },
  {
    pattern: /\b(midas|golden touch)\b/i,
    title: 'King Midas',
    note: 'A cautionary parable warning that boundless material accumulation can destroy the organic warmth of human affection and sustenance.',
  },
];

/**
 * Detects classical and historical allusions in an excerpt.
 */
function detectAllusions(text: string): string | null {
  for (const item of ALLUSIONS_DATABASE) {
    if (item.pattern.test(text)) {
      return `${item.title}: ${item.note}`;
    }
  }
  return null;
}

/**
 * Extracts archaic words and pairs them with modern meanings.
 */
function findArchaicVocab(text: string): Array<{ archaicWord: string; modernMeaning: string }> {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || [];
  const found: Array<{ archaicWord: string; modernMeaning: string }> = [];
  const seen = new Set<string>();

  for (const w of words) {
    if (ARCHAIC_LEXICON[w] && !seen.has(w)) {
      seen.add(w);
      found.push({
        archaicWord: w,
        modernMeaning: ARCHAIC_LEXICON[w],
      });
      if (found.length >= 4) break;
    }
  }

  return found;
}

/**
 * Analyzes narrative tone, sentence structure, and literary motifs.
 */
function analyzeLiteraryCraft(text: string): {
  tone: string;
  themes: string[];
  subtext: string;
} {
  const lower = text.toLowerCase();
  const themes: string[] = [];

  // Theme detection
  if (/pride|vanity|haughty|esteem|reputation|condescend/i.test(lower)) {
    themes.push('Pride & Social Standing');
  }
  if (/love|affection|heart|tender|passion|beloved/i.test(lower)) {
    themes.push('Devotion & Vulnerability');
  }
  if (/duty|obligation|honor|conduct|propriety|virtue/i.test(lower)) {
    themes.push('Moral Duty & Honor');
  }
  if (/death|grave|perish|mortal|grief|mourn|sorrow/i.test(lower)) {
    themes.push('Mortality & Loss');
  }
  if (/nature|sea|storm|woods|sky|wind|tempest/i.test(lower)) {
    themes.push('Nature as Mirror of the Soul');
  }
  if (/fate|destiny|fortune|chance|providence/i.test(lower)) {
    themes.push('Providence & Destiny');
  }
  if (/deceit|false|guile|betray|treachery|mask/i.test(lower)) {
    themes.push('Appearance vs Reality');
  }

  if (themes.length === 0) {
    themes.push('Inner Conflict & Reflection', 'Human Folly & Grace');
  }

  // Tone detection
  let tone = 'contemplative and measured';
  if (/!|\?.*\!|alas|heavens|horror|fury/i.test(text)) {
    tone = 'dramatic and impassioned';
  } else if (/irony|amused|folly|ridicule|civility|polite/i.test(lower)) {
    tone = 'wryly satirical and observant';
  } else if (/sorrow|weep|dark|night|solitary|tear/i.test(lower)) {
    tone = 'elegiac and melancholic';
  } else if (/solemn|sacred|divine|eternal|prayer/i.test(lower)) {
    tone = 'reverent and meditative';
  }

  // Subtext distillation
  const subtext =
    `The prose operates through a ${tone} atmosphere, contrasting surface civility with suppressed interior tension. ` +
    `Notice how the sentence rhythm quickens around pivotal emotional revelations, inviting the reader to listen beneath spoken dialogue for unspoken motives.`;

  return { tone, themes, subtext };
}

/**
 * Generates an on-device literary passage explanation.
 */
export function generateLocalExplanation(params: {
  excerpt: string;
  bookTitle?: string;
  bookAuthor?: string;
  chapterTitle?: string;
  chapterIndex?: number;
  isReference?: boolean;
  motherTongue?: string;
}): CompanionExplainResult {
  const { excerpt, bookTitle, bookAuthor, chapterTitle, isReference, motherTongue } = params;
  const isBn = motherTongue === 'bn';
  const allusion = detectAllusions(excerpt);
  const craft = analyzeLiteraryCraft(excerpt);

  if (isBn) {
    const chapterRef = chapterTitle ? ` (${chapterTitle})` : '';
    const explanationP1 =
      `এই অনুচ্ছেদে${chapterRef} লেখক অত্যন্ত নিপুণভাবে পাত্র-পাত্রীদের মানসিক দোলাচল ও সম্পর্কের জটিলতা তুলে ধরেছেন। ভাষার শৈলীতে পরিমিতিবোধ ও ক্লাসিকাল ভাবগাম্ভীর্য স্পষ্ট।`;
    const explanationP2 =
      craft.subtext;
    const explanationP3 = allusion
      ? `এছাড়াও এতে একটি ধ্রুপদী সাহিত্যিক ইঙ্গিত রয়েছে: ${allusion}। এটি ব্যক্তিগত অনুভূতিকে বিশ্বসাহিত্যের মূল চেতনার সাথে সংযুক্ত করে।`
      : `সরাসরি কোনো মত চাপিয়ে না দিয়ে লেখক পাঠকের নিজস্ব চিন্তার অবকাশ রেখেছেন, যেখানে পরিস্থিতি ও ব্যক্তিগত নৈতিকতার দ্বন্দ্ব ফুটে ওঠে।`;

    return {
      explanation: `${explanationP1}\n\n${explanationP2}\n\n${explanationP3}`,
      keyThemes: craft.themes.slice(0, 3),
      referenceNote: allusion,
      version: 'local-literary-v2',
    };
  }

  const authorRef = bookAuthor ? `by ${bookAuthor}` : '';
  const bookRef = bookTitle ? `in *${bookTitle}* ${authorRef}` : '';
  const chapterRef = chapterTitle ? ` within ${chapterTitle}` : '';

  const explanationP1 =
    `In this passage${chapterRef ? `, located in ${chapterTitle}` : ''}${bookRef ? ` from *${bookTitle}*` : ''}, ` +
    `the author presents a defining emotional juncture. The syntax carries an unhurried, classical gravity, ` +
    `placing moral weight on each deliberate clause.`;

  const explanationP2 =
    craft.subtext;

  const explanationP3 = allusion
    ? `Furthermore, the text echoes classical literary heritage: ${allusion}. This resonance grounds personal struggle within timeless archetypes of world literature.`
    : `Rather than asserting its meaning outright, the diction leaves deliberate space for the reader's contemplation, balancing individual will against circumstance.`;

  return {
    explanation: `${explanationP1}\n\n${explanationP2}\n\n${explanationP3}`,
    keyThemes: craft.themes.slice(0, 3),
    referenceNote: allusion,
    version: 'local-literary-v2',
  };
}

/**
 * Simplifies complex or archaic prose into lucid modern English or native tongue.
 */
export function generateLocalSimplification(params: {
  sentence: string;
  bookTitle?: string;
  bookAuthor?: string;
  chapterIndex?: number;
  motherTongue?: string;
}): CompanionSimplifyResult {
  const { sentence, motherTongue } = params;
  const isBn = motherTongue === 'bn';
  const vocab = findArchaicVocab(sentence);

  // Modern paraphrase transform
  let modern = sentence.trim();

  // Replace common grammatical archaisms
  modern = modern
    .replace(/\bthou art\b/gi, 'you are')
    .replace(/\bthou hast\b/gi, 'you have')
    .replace(/\bthou shalt\b/gi, 'you will')
    .replace(/\bthou wilt\b/gi, 'you will')
    .replace(/\bthou dost\b/gi, 'you do')
    .replace(/\bthou didst\b/gi, 'you did')
    .replace(/\bthou\b/gi, 'you')
    .replace(/\bthee\b/gi, 'you')
    .replace(/\bthy\b/gi, 'your')
    .replace(/\bthine\b/gi, 'yours')
    .replace(/\bye\b/gi, 'you')
    .replace(/\bdoth\b/gi, 'does')
    .replace(/\bhath\b/gi, 'has')
    .replace(/\bere\b/gi, 'before')
    .replace(/\bbetwixt\b/gi, 'between')
    .replace(/\bwhilst\b/gi, 'while')
    .replace(/\bwherefore\b/gi, 'why')
    .replace(/\bperchance\b/gi, 'perhaps')
    .replace(/\banon\b/gi, 'soon')
    .replace(/\bforsooth\b/gi, 'truly')
    .replace(/\bhearken\b/gi, 'listen')
    .replace(/\bhark\b/gi, 'listen')
    .replace(/\btarry\b/gi, 'linger')
    .replace(/\bcountenance\b/gi, 'expression')
    .replace(/\bvisage\b/gi, 'face');

  // Clean double spaces or clumsy punctuation artifacts
  modern = modern.replace(/\s{2,}/g, ' ').trim();
  if (!modern.endsWith('.') && !modern.endsWith('!') && !modern.endsWith('?')) {
    modern += '.';
  }

  const originalMeaning = isBn
    ? `মূল বাক্যে ধ্রুপদী আনুষ্ঠানিকতার সাহায্যে মনের গভীর ভাব ও মানবিক মর্যাদা সরাসরি প্রকাশ করা হয়েছে।`
    : `The original prose expresses an unadorned sentiment using formal classical rhetoric: addressing the listener directly with heightened poetic gravity.`;

  return {
    simplified: modern,
    originalMeaning,
    vocabularyBreakdown: vocab.length > 0 ? vocab : undefined,
    version: 'local-literary-v2',
  };
}

/**
 * Summarizes the active chapter strictly without spoilers.
 */
export function generateLocalSummary(params: {
  chapterExcerpt: string;
  chapterIndex: number;
  chapterTitle?: string;
  bookTitle?: string;
  bookAuthor?: string;
  motherTongue?: string;
}): CompanionSummaryResult {
  const { chapterExcerpt, chapterIndex, chapterTitle, bookTitle, motherTongue } = params;
  const isBn = motherTongue === 'bn';
  const chLabel = chapterTitle || `Chapter ${chapterIndex + 1}`;

  const paragraphs = chapterExcerpt
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30);

  const keyDevelopments: string[] = [];

  if (paragraphs.length >= 3) {
    keyDevelopments.push(`${isBn ? 'অধ্যায়ের সূচনা' : 'Opening'}: ${paragraphs[0].slice(0, 140).trim()}...`);
    const midIdx = Math.floor(paragraphs.length / 2);
    keyDevelopments.push(`${isBn ? 'মূল মোড়' : 'Turning point'}: ${paragraphs[midIdx].slice(0, 140).trim()}...`);
    keyDevelopments.push(`${isBn ? 'পরিসমাপ্তি' : 'Resolution'}: ${paragraphs[paragraphs.length - 1].slice(0, 140).trim()}...`);
  } else if (paragraphs.length > 0) {
    keyDevelopments.push(`${isBn ? 'মূল দৃশ্যপট' : 'Primary scene unfolds'}: ${paragraphs[0].slice(0, 160).trim()}...`);
    if (paragraphs[1]) {
      keyDevelopments.push(`${isBn ? 'পরবর্তী মিথস্ক্রিয়া' : 'Consequent interaction'}: ${paragraphs[1].slice(0, 160).trim()}...`);
    }
  } else {
    keyDevelopments.push(
      isBn ? 'চরিত্রগুলো সামাজিক প্রত্যাশা ও নৈতিক সংকটের মুখোমুখি হয়।' : 'Characters navigate social expectations and moral dilemmas.',
      isBn ? 'সংলাপের মাধ্যমে বাহ্যিক শিষ্টাচারের আড়ালে থাকা গভীর উদ্দেশ্য প্রকাশিত হয়।' : 'Conversations reveal deeper motivations beneath outward decorum.',
      isBn ? 'অধ্যায়টি সম্পর্কের রূপবদল ও ব্যক্তিগত সংকল্পের মধ্য দিয়ে শেষ হয়।' : 'The chapter concludes with shifts in allegiances and personal resolve.',
    );
  }

  const craft = analyzeLiteraryCraft(chapterExcerpt);

  if (isBn) {
    return {
      summary: `${chLabel}-এর সারসংক্ষেপ: এই অধ্যায়ে আখ্যানের একটি গুরুত্বপূর্ণ মোড় উন্মোচিত হয়। চরিত্রগুলোর পারস্পরিক সংলাপ এবং ঘটনাপ্রবাহের মাধ্যমে পরিস্থিতি স্পষ্ট হয়ে ওঠে। পুরো অধ্যায়ে কোনো ভবিষ্যৎ ঘটনার ইঙ্গিত না দিয়ে কেবল এই অধ্যায়ের ঘটনার ওপর দৃষ্টি নিবদ্ধ রাখা হয়েছে।`,
      keyDevelopments,
      thematicFocus: `আবহ ও মূল সুর: মানুষের সম্পর্কের জটিলতা এবং জীবনের অনিবার্য সিদ্ধান্ত।`,
      spoilerFreeGuarantee: true,
      version: 'local-literary-v2',
    };
  }

  const summary =
    `In ${chLabel}${bookTitle ? ` of *${bookTitle}*` : ''}, narrative events progress with measured literary cadence. ` +
    `The chapter anchors itself in shifting interpersonal dynamics, contrasting external formality with unspoken emotional undercurrents. ` +
    `Key dialogues and character actions test previous assumptions, leaving the scene poised for the dilemmas ahead.`;

  const thematicFocus =
    `The chapter centers upon ${craft.themes[0] || 'the interplay of truth and human desire'}, exploring how personal decisions ripple through relationships.`;

  return {
    summary,
    keyDevelopments,
    thematicFocus,
    spoilerFreeGuarantee: true,
    version: 'local-literary-v2',
  };
}

/**
 * Extracts named characters encountered up to the active reading position.
 */
export function generateLocalCharacterRecap(params: {
  textUpToNow: string;
  chapterIndex: number;
  chapterTitle?: string;
  bookTitle?: string;
  motherTongue?: string;
}): CompanionCharactersResult {
  const { textUpToNow, motherTongue } = params;
  const isBn = motherTongue === 'bn';

  // Extract capitalized names preceded by honorifics or dialogue markers
  const nameRegex = /\b(Mr\.|Mrs\.|Miss|Lady|Lord|Sir|Dr\.|Captain|Count|Countess)?\s*([A-Z][a-z]{2,15}(?:\s+[A-Z][a-z]{2,15})?)\b/g;
  const counts: Record<string, number> = {};

  const commonWords = new Set([
    'The', 'Then', 'There', 'They', 'This', 'That', 'When', 'What', 'Where', 'While',
    'After', 'Before', 'Soon', 'Here', 'Now', 'One', 'Two', 'Chapter', 'Page', 'Book',
    'Some', 'All', 'Every', 'God', 'Heaven', 'Lord', 'Lady', 'Sir', 'Father', 'Mother',
  ]);

  let match: RegExpExecArray | null;
  while ((match = nameRegex.exec(textUpToNow)) !== null) {
    const title = match[1] ? `${match[1]} ` : '';
    const rawName = match[2];
    if (commonWords.has(rawName)) continue;
    const fullName = `${title}${rawName}`.trim();
    counts[fullName] = (counts[fullName] || 0) + 1;
  }

  // Sort by frequency of mention
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const characters = sorted.map(([name, freq], idx) => {
    let role = isBn ? 'মূল চরিত্র' : 'Key Participant';
    if (idx === 0) role = isBn ? 'কেন্দ্রীয় চরিত্র' : 'Central Figure';
    else if (idx === 1) role = isBn ? 'প্রধান সঙ্গী' : 'Primary Counterpart';
    else if (idx === 2) role = isBn ? 'প্রভাবশালী সহযোগী' : 'Influential Companion';

    return {
      name,
      role,
      statusUpToNow: isBn
        ? `এই অধ্যায় পর্যন্ত পাঠকের অভিযাত্রায় সক্রিয়ভাবে উপস্থিত (${freq} বার উল্লেখিত)। দৃশ্যের আলোচনা ও পারিবারিক সিদ্ধান্তে সরাসরি যুক্ত।`
        : `Actively present across the journey up to this chapter (${freq} mention${freq === 1 ? '' : 's'}). Involved in central developments and social deliberations.`,
      keyRelationships: isBn
        ? `আখ্যানের সামাজিক পরিমণ্ডল ও পারিবারিক সম্পর্কের সাথে নিবিড়ভাবে যুক্ত।`
        : `Tied into the household and social network of the narrative.`,
    };
  });

  // Provide fallback characters if regex finds sparse text
  if (characters.length === 0) {
    characters.push({
      name: isBn ? 'নায়ক / নায়িকা' : 'The Protagonist',
      role: isBn ? 'কেন্দ্রীয় চরিত্র' : 'Central Observer & Voice',
      statusUpToNow: isBn
        ? 'গভীর পর্যবেক্ষণ ও নৈতিক সিদ্ধান্তের মধ্য দিয়ে গল্পকে এগিয়ে নিয়ে যায়।'
        : 'Guides the narrative through observant reflection and moral choice.',
      keyRelationships: isBn
        ? 'পরিবার ও পারিপার্শ্বিক সমাজের সাথে যুক্ত।'
        : 'Interacts with community and familial circle.',
    });
  }

  return {
    characters,
    version: 'local-literary-v2',
  };
}

/**
 * Generates reflective philosophical questions about the chapter.
 */
export function generateLocalReflections(params: {
  chapterExcerpt: string;
  chapterIndex: number;
  chapterTitle?: string;
  motherTongue?: string;
}): CompanionReflectionsResult {
  const { motherTongue } = params;
  const isBn = motherTongue === 'bn';
  const craft = analyzeLiteraryCraft(params.chapterExcerpt);
  const theme = craft.themes[0] || (isBn ? 'নৈতিক বিবেক' : 'Moral Conscience');

  if (isBn) {
    return {
      questions: [
        {
          theme,
          question: 'এই অধ্যায়ে চরিত্রগুলো সামাজিক প্রত্যাশা এবং ব্যক্তিগত সততার মধ্যে কীভাবে ভারসাম্য বজায় রেখেছে?',
          contextNote: 'সেই মুহূর্তগুলো বিবেচনা করুন যেখানে সংলাপ তাদের অভ্যন্তরীণ দ্বিধাকে ঢেকে রাখে।',
        },
        {
          theme: 'দৃষ্টিকোণ ও সহানুভূতি',
          question: 'এই দ্বন্দ্বে কার অবস্থান সবচেয়ে গ্রহণযোগ্য মনে হয়, এবং তাদের কী ধরনের সীমাবদ্ধতা রয়েছে?',
          contextNote: 'পূর্বের ভুল বোঝাবুঝি কীভাবে বর্তমান সিদ্ধান্তকে প্রভাবিত করছে তা লক্ষ্য করুন।',
        },
        {
          theme: 'সিদ্ধান্তের গুরুত্ব',
          question: 'মূল চরিত্রটি যদি এখানে ভিন্ন কোনো সিদ্ধান্ত নিত, তবে কোন মানবিক মূল্যবোধটি ক্ষুণ্ণ হতো?',
          contextNote: 'আপস নাকি অবিচল থাকা—কোনটিতে বেশি সাহসের প্রয়োজন ছিল তা ভেবে দেখুন।',
        },
      ],
      version: 'local-literary-v2',
    };
  }

  return {
    questions: [
      {
        theme,
        question: 'How do the characters in this chapter balance public expectation against personal integrity?',
        contextNote: 'Consider the moments where dialogue masks internal hesitation.',
      },
      {
        theme: 'Perspective & Empathy',
        question: 'Whose perspective is most sympathetic in this conflict, and what blind spots might they carry?',
        contextNote: 'Examine how prior misunderstandings color present judgment.',
      },
      {
        theme: 'The Weight of Choice',
        question: 'If the protagonist had chosen differently here, what values would have been compromised?',
        contextNote: 'Ponder whether compromise or steadfastness demands greater courage.',
      },
    ],
    version: 'local-literary-v2',
  };
}

function extractPageNarrative(text: string) {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 20);

  const quoteMatches: string[] = [];
  const quoteRegex = /["“]([^"”]{10,250})["”]/g;
  let qm: RegExpExecArray | null;
  while ((qm = quoteRegex.exec(text)) !== null) {
    quoteMatches.push(qm[1].trim());
    if (quoteMatches.length >= 4) break;
  }

  const nameRegex = /\b(Mr\.|Mrs\.|Miss|Lady|Lord|Sir|Dr\.|Captain|Count|Countess)?\s*([A-Z][a-z]{2,15})\b/g;
  const commonWords = new Set([
    'The', 'Then', 'There', 'They', 'This', 'That', 'When', 'What', 'Where', 'While',
    'After', 'Before', 'Soon', 'Here', 'Now', 'One', 'Two', 'Chapter', 'Page', 'Book',
    'Some', 'All', 'Every', 'God', 'Heaven', 'Lord', 'Lady', 'Sir', 'Father', 'Mother',
    'Yes', 'No', 'Indeed', 'Perhaps', 'Nothing', 'Something', 'Everything', 'Looking',
  ]);
  const namesFound: string[] = [];
  let nm: RegExpExecArray | null;
  while ((nm = nameRegex.exec(text)) !== null) {
    const title = nm[1] ? `${nm[1]} ` : '';
    const raw = nm[2];
    if (commonWords.has(raw)) continue;
    const full = `${title}${raw}`.trim();
    if (!namesFound.includes(full)) {
      namesFound.push(full);
      if (namesFound.length >= 6) break;
    }
  }

  return { paragraphs, quoteMatches, namesFound };
}

export type CompanionPageInsightResult = {
  pageNumber: number;
  summary: string;
  activeCharacters?: string[];
  charactersActive?: string[];
  keyMoment?: string;
  thematicFocus: string;
  version: string;
};

/**
 * Generates an instant literary breakdown of a specific reading page.
 */
export function generateLocalPageInsight(params: {
  pageText: string;
  pageNumber: number;
  bookTitle?: string;
  bookAuthor?: string;
  chapterTitle?: string;
  chapterIndex?: number;
  motherTongue?: string;
}): CompanionPageInsightResult {
  const { pageText, pageNumber, chapterTitle, chapterIndex, motherTongue } = params;
  const isBn = motherTongue === 'bn';
  const chLabel = chapterTitle || (typeof chapterIndex === 'number' ? `Chapter ${chapterIndex + 1}` : (isBn ? 'এই অধ্যায়' : 'this chapter'));
  const { paragraphs, quoteMatches, namesFound } = extractPageNarrative(pageText);

  let summary = '';
  if (isBn) {
    if (paragraphs.length >= 2) {
      const opening = paragraphs[0].slice(0, 160).replace(/\s+[^ ]*$/, '');
      const ending = paragraphs[paragraphs.length - 1].slice(0, 160).replace(/\s+[^ ]*$/, '');
      summary =
        `${chLabel}-এর পৃষ্ঠা ${pageNumber}-এ দৃশ্যটি শুরু হয়: "${opening}..."\n\n` +
        (quoteMatches.length > 0 ? `মূল সংলাপ আবর্তিত হয়: "${quoteMatches[0]}"।\n\n` : '') +
        `পৃষ্ঠার পরিসমাপ্তি ঘটে: "${ending}..."`;
    } else if (paragraphs.length === 1) {
      summary = `পৃষ্ঠা ${pageNumber}-এর মূল প্রসঙ্গ: "${paragraphs[0].slice(0, 260)}..."`;
    } else {
      summary = `${chLabel}-এর পৃষ্ঠা ${pageNumber} দৃশ্যপটের একটি গুরুত্বপূর্ণ সাহিত্যিক পরিবর্তন নির্দেশ করে।`;
    }
  } else {
    if (paragraphs.length >= 2) {
      const opening = paragraphs[0].slice(0, 160).replace(/\s+[^ ]*$/, '');
      const ending = paragraphs[paragraphs.length - 1].slice(0, 160).replace(/\s+[^ ]*$/, '');
      summary =
        `On Page ${pageNumber} of ${chLabel}, the scene opens with: "${opening}..."\n\n` +
        (quoteMatches.length > 0 ? `The central dialogue revolves around: "${quoteMatches[0]}".\n\n` : '') +
        `The passage progresses toward: "${ending}..."`;
    } else if (paragraphs.length === 1) {
      summary = `Page ${pageNumber} focuses on: "${paragraphs[0].slice(0, 260)}..."`;
    } else {
      summary = `Page ${pageNumber} of ${chLabel} marks a key literary transition in the scene.`;
    }
  }

  const craft = analyzeLiteraryCraft(pageText);

  return {
    pageNumber,
    summary,
    activeCharacters: namesFound.length > 0 ? namesFound : undefined,
    charactersActive: namesFound.length > 0 ? namesFound : undefined,
    keyMoment: quoteMatches.length > 0 ? `"${quoteMatches[0]}"` : (paragraphs[0]?.slice(0, 120) ? `"${paragraphs[0].slice(0, 120)}..."` : undefined),
    thematicFocus: isBn
      ? `আবহ: ${craft.tone}। মূল সাহিত্যিক বিষয়বস্তু: ${craft.themes.join(', ')}।`
      : `Atmosphere: ${craft.tone}. Focal themes include ${craft.themes.join(', ')}.`,
    version: 'local-literary-v2',
  };
}

/**
 * Answers freeform reader questions about the text with genuine page awareness and native tongue output.
 */
export function generateLocalAnswer(params: {
  question: string;
  excerpt?: string;
  pageText?: string;
  pageNumber?: number;
  chapterExcerpt?: string;
  bookTitle?: string;
  bookAuthor?: string;
  chapterTitle?: string;
  chapterIndex?: number;
  motherTongue?: string;
}): CompanionAskResult {
  const { question, excerpt, pageText, pageNumber, chapterExcerpt, bookTitle, chapterTitle, chapterIndex, motherTongue } = params;
  const isBn = motherTongue === 'bn';
  const qLower = question.toLowerCase();
  const activeText = pageText || excerpt || chapterExcerpt || '';
  const { paragraphs, quoteMatches, namesFound } = extractPageNarrative(activeText);

  const pageLabel = pageNumber ? `Page ${pageNumber}` : (isBn ? 'এই পৃষ্ঠা' : 'this page');
  const chLabel = chapterTitle || (typeof chapterIndex === 'number' ? `Chapter ${chapterIndex + 1}` : (isBn ? 'এই অধ্যায়' : 'this chapter'));

  let answer = '';
  const keyThemes: string[] = [];

  const isPageSummaryQuery =
    /what.*(this page|page \d+|is happening|about|going on|scene)|summarize.*page|explain.*page/i.test(qLower) ||
    /এই পৃষ্ঠা|পৃষ্ঠা.*সম্পর্কে|কী হচ্ছে|ঘটনাবলী/i.test(question);

  if (isPageSummaryQuery && activeText) {
    if (paragraphs.length > 0) {
      const charPart = namesFound.length > 0 ? ` featuring ${namesFound.slice(0, 3).join(', ')}` : '';
      const quotePart = quoteMatches.length > 0 ? ` Key dialogue captures this moment: "${quoteMatches[0]}".` : '';
      const opening = paragraphs[0].slice(0, 180).trim();
      const ending = paragraphs.length > 1 ? ` The page concludes as: "${paragraphs[paragraphs.length - 1].slice(0, 160).trim()}..."` : '';

      if (isBn) {
        const charPartBn = namesFound.length > 0 ? ` (চরিত্র: ${namesFound.slice(0, 3).join(', ')})` : '';
        const quotePartBn = quoteMatches.length > 0 ? ` মূল সংলাপ: "${quoteMatches[0]}"।` : '';
        answer =
          `${chLabel}-এর পৃষ্ঠা ${pageNumber ?? ''}${charPartBn}-এ দৃশ্যটি শুরু হয় এভাবে: "${opening}..."${ending}\n\n` +
          `${quotePartBn} এখানে পাত্র-পাত্রীদের মানসিক টানাপোড়েন এবং তাৎক্ষণিক পরিস্থিতির ওপর সরাসরি আলোকপাত করা হয়েছে।`;
        keyThemes.push('সক্রিয় দৃশ্য', 'পৃষ্ঠার প্রসঙ্গ');
      } else {
        answer =
          `On ${pageLabel} of ${chLabel}${charPart}, the scene unfolds directly around: "${opening}..."${ending}\n\n` +
          `${quotePart} The narrative focuses intently on the interpersonal tension and immediate choices unfolding in this scene.`;
        keyThemes.push('Active Scene', 'Page Context');
      }
    } else {
      if (isBn) {
        answer = `${chLabel}-এর পৃষ্ঠা ${pageNumber ?? ''}-এ আখ্যানের দৃশ্যপট কোনো ভবিষ্যৎ ঘটনার ইঙ্গিত না দিয়ে স্বাভাবিক গতিতে এগিয়ে চলেছে।`;
        keyThemes.push('দৃশ্যপট');
      } else {
        answer = `On ${pageLabel} of ${chLabel}, the narrative focuses on the immediate progression of the scene without future plot interference.`;
        keyThemes.push('Active Scene', 'Page Context');
      }
    }
  } else if (/who|character|name|person/i.test(qLower) || /কে|চরিত্র|কারা/i.test(question)) {
    const matchedName = namesFound.find((n) => qLower.includes(n.toLowerCase()));
    if (matchedName) {
      const sentenceWithName = activeText.split(/[.!?]+/).find((s) => s.includes(matchedName))?.trim();
      if (isBn) {
        answer =
          `এই দৃশ্যে (${pageLabel}) ${matchedName} সরাসরি উপস্থিত। ` +
          (sentenceWithName ? `পাঠ্যে বলা হয়েছে: "${sentenceWithName.slice(0, 180)}" ` : '') +
          `তাদের ভূমিকা এই দৃশ্যের সামাজিক ও মানসিক ভারসাম্যে গুরুত্বপূর্ণ প্রভাব ফেলে।`;
        keyThemes.push(`${matchedName}-এর ভূমিকা`, 'চরিত্রের মিথস্ক্রিয়া');
      } else {
        answer =
          `In this scene on ${pageLabel}, ${matchedName} is directly present. ` +
          (sentenceWithName ? `The text notes: "${sentenceWithName.slice(0, 180)}". ` : '') +
          `Their role here influences the social balance and emotional subtext of the conversation.`;
        keyThemes.push(`${matchedName}'s Role`, 'Character Interaction');
      }
    } else if (namesFound.length > 0) {
      if (isBn) {
        answer =
          `পৃষ্ঠা ${pageLabel}-এ উপস্থিত চরিত্রগুলো হলো: ${namesFound.join(', ')}। ` +
          `তাদের উপস্থিতি এই দৃশ্যের সংলাপ ও অনুভূতির গভীরতা নির্ধারণ করে।`;
        keyThemes.push('উপস্থিত চরিত্র', 'সম্পর্কের গতিধারা');
      } else {
        answer =
          `The active figures on ${pageLabel} include ${namesFound.join(', ')}. ` +
          `Their presence shapes the dialogue and unspoken dynamics of this scene.`;
        keyThemes.push('Present Characters', 'Social Dynamics');
      }
    } else {
      if (isBn) {
        answer =
          `পৃষ্ঠা ${pageLabel}-এ চরিত্রগুলোর আচরণে পরিমিতিবোধ ও সংযম স্পষ্টভাবে লক্ষ্য করা যায়। চরিত্রগুলো সংক্ষিপ্ত বক্তব্য ও নীরবতার মাধ্যমে ভেতরের অনুভূতি প্রকাশ করছে।`;
        keyThemes.push('চরিত্রের গতিপ্রকৃতি');
      } else {
        answer =
          `In ${pageLabel}, the character interaction reflects classical social choreography. ` +
          `Characters communicate through measured formal restraint, where small gestures and brief retorts signal deeper internal feelings.`;
        keyThemes.push('Character Dynamics');
      }
    }
  } else if (/why|reason|motive|purpose/i.test(qLower) || /কেন|কারণ|উদ্দেশ্য/i.test(question)) {
    if (isBn) {
      answer =
        `এই দৃশ্যের পেছনের মূল উদ্দেশ্য ব্যক্তিস্বার্থ, সামাজিক মর্যাদা এবং অনুভূতির দ্বন্দ্ব থেকে উদ্ভূত। চরিত্রগুলো বাহ্যিক সংযম বজায় রেখে নিজেদের অন্তরের অনুভূতি রক্ষা করতে সচেষ্ট।`;
      keyThemes.push('অভ্যন্তরীণ প্রেরণা', 'মর্যাদা বনাম কর্তব্য');
    } else {
      if (quoteMatches.length > 0) {
        answer =
          `The underlying motivation here is reflected in the exchange: "${quoteMatches[0]}". ` +
          `Rather than acting purely on impulse, the characters navigate personal pride, duty, and the fear of vulnerability. ` +
          `What appears stubborn or reserved on the surface is rooted in self-protection.`;
      } else {
        answer =
          `The underlying motive here springs from the tension between duty and private feeling. ` +
          `The characters are guided by social expectations and personal pride, balancing outward decorum against interior resolve.`;
      }
      keyThemes.push('Interior Motivation', 'Pride vs Duty');
    }
  } else if (/mean|meaning|symbol|metaphor|signif/i.test(qLower) || /অর্থ|তাৎপর্য|প্রতীক/i.test(question)) {
    const allusion = detectAllusions(activeText);
    if (isBn) {
      answer = allusion
        ? `এই মুহূর্তে একটি ধ্রুপদী সাহিত্যিক রূপক রয়েছে: ${allusion}\n\nভাবার্থের দিক থেকে এটি অন্তর্নিহিত বিশ্বাস ও সামাজিক প্রত্যাশার সংঘাত নির্দেশ করে।`
        : `এই দৃশ্যটি আখ্যানের সরাসরি অগ্রগতি ছাড়াও একটি প্রতীকী তাৎপর্য বহন করে। এটি মানুষের অনুভূতির জটিলতা ও পারিপার্শ্বিক সম্পর্কের ভারসাম্য নির্দেশ করে।`;
      keyThemes.push('সাহিত্যিক তাৎপর্য', 'বিষয়বস্তুর গভীরতা');
    } else {
      if (allusion) {
        answer =
          `This moment carries a classical literary allusion: ${allusion}\n\n` +
          `On a thematic level, it dramatizes the struggle between inward conviction and external expectations.`;
        keyThemes.push('Literary Allusion', 'Thematic Depth');
      } else {
        answer =
          `This scene operates on both a narrative and symbolic level. Directly, it advances the interaction between the characters. ` +
          `Symbolically, it underscores the themes of perception, social boundaries, and the quiet shift in mutual understanding.`;
        keyThemes.push('Literary Meaning', 'Thematic Shift');
      }
    }
  } else if (/tone|mood|atmosphere/i.test(qLower) || /আবহ|সুর|টোন/i.test(question)) {
    const craft = analyzeLiteraryCraft(activeText);
    if (isBn) {
      answer = `পৃষ্ঠা ${pageLabel}-এর আবহ অত্যন্ত পরিশীলিত ও গম্ভীর (${craft.tone})। ভাষা অতিরঞ্জনমুক্ত এবং প্রতিটি বাক্যে সম্পর্কের গভীর টানাপোড়েন স্পষ্ট।`;
      keyThemes.push('আবহ ও সুর', 'সাহিত্যিক ভাষা');
    } else {
      answer =
        `The tone on ${pageLabel} is ${craft.tone}. The prose avoids sensationalism, relying instead on deliberate diction ` +
        `and measured rhythm to evoke a palpable tension between the characters.`;
      keyThemes.push('Tone & Atmosphere', 'Literary Diction');
    }
  } else {
    if (isBn) {
      if (paragraphs.length > 0) {
        const snippet = paragraphs[0].slice(0, 180).trim();
        answer =
          `পৃষ্ঠা ${pageLabel} ("${snippet}...") গভীরভাবে পর্যবেক্ষণ করলে দেখা যায় যে, লেখক চরিত্রগুলোর সূক্ষ্ম অনুভূতি ও সামাজিক অবস্থানের সংঘাত অত্যন্ত নিপুণভাবে তুলে ধরেছেন।`;
      } else {
        answer =
          `পৃষ্ঠা ${pageLabel} গভীরভাবে পর্যবেক্ষণ করলে দেখা যায় যে, লেখক নৈতিক দায়িত্ব ও ব্যক্তিগত অনুভূতির সংঘাত নিপুণভাবে চিত্রায়িত করেছেন।`;
      }
      keyThemes.push('সাহিত্যিক অন্তর্দৃষ্টি', 'পৃষ্ঠার পর্যালোচনা');
    } else {
      if (paragraphs.length > 0) {
        const snippet = paragraphs[0].slice(0, 180).trim();
        answer =
          `Looking closely at ${pageLabel} ("${snippet}..."), the narrative examines the nuances of the characters' decisions. ` +
          `The scene balances emotional tension with social convention, revealing character through diction and silence rather than overt exposition.`;
      } else {
        answer =
          `Looking closely at ${pageLabel}${bookTitle ? ` in *${bookTitle}*` : ''}, the narrative examines the nuance of character choice and moral responsibility. ` +
          `Every gesture carries weight, showing how timeless prose weaves universal truths into intimate scenes.`;
      }
      keyThemes.push('Literary Insight', 'Page Reflection');
    }
  }

  return {
    answer,
    keyThemes,
    version: 'local-literary-v2',
  };
}
