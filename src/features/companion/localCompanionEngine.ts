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
}): CompanionExplainResult {
  const { excerpt, bookTitle, bookAuthor, chapterTitle } = params;
  const allusion = detectAllusions(excerpt);
  const craft = analyzeLiteraryCraft(excerpt);

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
    version: 'local-literary-v1',
  };
}

/**
 * Simplifies complex or archaic prose into lucid modern English.
 */
export function generateLocalSimplification(params: {
  sentence: string;
  bookTitle?: string;
  bookAuthor?: string;
  chapterIndex?: number;
}): CompanionSimplifyResult {
  const { sentence } = params;
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

  const originalMeaning =
    `The original prose expresses an unadorned sentiment using formal classical rhetoric: ` +
    `addressing the listener directly with heightened poetic gravity.`;

  return {
    simplified: modern,
    originalMeaning,
    vocabularyBreakdown: vocab.length > 0 ? vocab : undefined,
    version: 'local-literary-v1',
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
}): CompanionSummaryResult {
  const { chapterExcerpt, chapterIndex, chapterTitle, bookTitle } = params;
  const chLabel = chapterTitle || `Chapter ${chapterIndex + 1}`;

  const paragraphs = chapterExcerpt
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30);

  const keyDevelopments: string[] = [];

  if (paragraphs.length >= 3) {
    keyDevelopments.push(`Opening: ${paragraphs[0].slice(0, 140).trim()}...`);
    const midIdx = Math.floor(paragraphs.length / 2);
    keyDevelopments.push(`Turning point: ${paragraphs[midIdx].slice(0, 140).trim()}...`);
    keyDevelopments.push(`Resolution: ${paragraphs[paragraphs.length - 1].slice(0, 140).trim()}...`);
  } else if (paragraphs.length > 0) {
    keyDevelopments.push(`Primary scene unfolds: ${paragraphs[0].slice(0, 160).trim()}...`);
    if (paragraphs[1]) {
      keyDevelopments.push(`Consequent interaction: ${paragraphs[1].slice(0, 160).trim()}...`);
    }
  } else {
    keyDevelopments.push(
      'Characters navigate social expectations and moral dilemmas.',
      'Conversations reveal deeper motivations beneath outward decorum.',
      'The chapter concludes with shifts in allegiances and personal resolve.',
    );
  }

  const craft = analyzeLiteraryCraft(chapterExcerpt);

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
    version: 'local-literary-v1',
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
}): CompanionCharactersResult {
  const { textUpToNow } = params;

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
    let role = 'Key Participant';
    if (idx === 0) role = 'Central Figure';
    else if (idx === 1) role = 'Primary Counterpart';
    else if (idx === 2) role = 'Influential Companion';

    return {
      name,
      role,
      statusUpToNow: `Actively present across the journey up to this chapter (${freq} mention${freq === 1 ? '' : 's'}). Involved in central developments and social deliberations.`,
      keyRelationships: `Tied into the household and social network of the narrative.`,
    };
  });

  // Provide fallback characters if regex finds sparse text
  if (characters.length === 0) {
    characters.push({
      name: 'The Protagonist',
      role: 'Central Observer & Voice',
      statusUpToNow: 'Guides the narrative through observant reflection and moral choice.',
      keyRelationships: 'Interacts with community and familial circle.',
    });
  }

  return {
    characters,
    version: 'local-literary-v1',
  };
}

/**
 * Generates reflective philosophical questions about the chapter.
 */
export function generateLocalReflections(params: {
  chapterExcerpt: string;
  chapterIndex: number;
  chapterTitle?: string;
}): CompanionReflectionsResult {
  const craft = analyzeLiteraryCraft(params.chapterExcerpt);
  const theme = craft.themes[0] || 'Moral Conscience';

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
    version: 'local-literary-v1',
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
}): CompanionPageInsightResult {
  const { pageText, pageNumber, chapterTitle, chapterIndex } = params;
  const chLabel = chapterTitle || (typeof chapterIndex === 'number' ? `Chapter ${chapterIndex + 1}` : 'this chapter');
  const { paragraphs, quoteMatches, namesFound } = extractPageNarrative(pageText);

  let summary = '';
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

  const craft = analyzeLiteraryCraft(pageText);

  return {
    pageNumber,
    summary,
    activeCharacters: namesFound.length > 0 ? namesFound : undefined,
    charactersActive: namesFound.length > 0 ? namesFound : undefined,
    keyMoment: quoteMatches.length > 0 ? `"${quoteMatches[0]}"` : (paragraphs[0]?.slice(0, 120) ? `"${paragraphs[0].slice(0, 120)}..."` : undefined),
    thematicFocus: `Atmosphere: ${craft.tone}. Focal themes include ${craft.themes.join(', ')}.`,
    version: 'local-literary-v2',
  };
}

/**
 * Answers freeform reader questions about the text with genuine page awareness.
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
}): CompanionAskResult {
  const { question, excerpt, pageText, pageNumber, chapterExcerpt, bookTitle, chapterTitle, chapterIndex } = params;
  const qLower = question.toLowerCase();
  const activeText = pageText || excerpt || chapterExcerpt || '';
  const { paragraphs, quoteMatches, namesFound } = extractPageNarrative(activeText);

  const pageLabel = pageNumber ? `Page ${pageNumber}` : 'this page';
  const chLabel = chapterTitle || (typeof chapterIndex === 'number' ? `Chapter ${chapterIndex + 1}` : 'this chapter');

  let answer = '';
  const keyThemes: string[] = [];

  const isPageSummaryQuery =
    /what.*(this page|page \d+|is happening|about|going on|scene)|summarize.*page|explain.*page/i.test(qLower);

  if (isPageSummaryQuery && activeText) {
    if (paragraphs.length > 0) {
      const charPart = namesFound.length > 0 ? ` featuring ${namesFound.slice(0, 3).join(', ')}` : '';
      const quotePart = quoteMatches.length > 0 ? ` Key dialogue captures this moment: "${quoteMatches[0]}".` : '';
      const opening = paragraphs[0].slice(0, 180).trim();
      const ending = paragraphs.length > 1 ? ` The page concludes as: "${paragraphs[paragraphs.length - 1].slice(0, 160).trim()}..."` : '';

      answer =
        `On ${pageLabel} of ${chLabel}${charPart}, the scene unfolds directly around: "${opening}..."${ending}\n\n` +
        `${quotePart} The narrative focuses intently on the interpersonal tension and immediate choices unfolding in this scene.`;
    } else {
      answer = `On ${pageLabel} of ${chLabel}, the narrative focuses on the immediate progression of the scene without future plot interference.`;
    }
    keyThemes.push('Active Scene', 'Page Context');
  } else if (/who|character|name|person/i.test(qLower)) {
    const matchedName = namesFound.find((n) => qLower.includes(n.toLowerCase()));
    if (matchedName) {
      const sentenceWithName = activeText.split(/[.!?]+/).find((s) => s.includes(matchedName))?.trim();
      answer =
        `In this scene on ${pageLabel}, ${matchedName} is directly present. ` +
        (sentenceWithName ? `The text notes: "${sentenceWithName.slice(0, 180)}". ` : '') +
        `Their role here influences the social balance and emotional subtext of the conversation.`;
      keyThemes.push(`${matchedName}'s Role`, 'Character Interaction');
    } else if (namesFound.length > 0) {
      answer =
        `The active figures on ${pageLabel} include ${namesFound.join(', ')}. ` +
        `Their presence shapes the dialogue and unspoken dynamics of this scene.`;
      keyThemes.push('Present Characters', 'Social Dynamics');
    } else {
      answer =
        `In ${pageLabel}, the character interaction reflects classical social choreography. ` +
        `Characters communicate through measured formal restraint, where small gestures and brief retorts signal deeper internal feelings.`;
      keyThemes.push('Character Dynamics');
    }
  } else if (/why|reason|motive|purpose/i.test(qLower)) {
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
  } else if (/mean|meaning|symbol|metaphor|signif/i.test(qLower)) {
    const allusion = detectAllusions(activeText);
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
  } else if (/tone|mood|atmosphere/i.test(qLower)) {
    const craft = analyzeLiteraryCraft(activeText);
    answer =
      `The tone on ${pageLabel} is ${craft.tone}. The prose avoids sensationalism, relying instead on deliberate diction ` +
      `and measured rhythm to evoke a palpable tension between the characters.`;
    keyThemes.push('Tone & Atmosphere', 'Literary Diction');
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

  return {
    answer,
    keyThemes,
    version: 'local-literary-v2',
  };
}
