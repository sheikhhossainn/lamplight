// The closed mood vocabulary — must match the CHECK constraint on
// scripture_verses.mood_tags in supabase/schema.sql exactly.
export const MOOD_OPTIONS = [
  { key: 'grief', label: 'Grief' },
  { key: 'hope', label: 'Hope' },
  { key: 'patience', label: 'Patience' },
  { key: 'gratitude', label: 'Gratitude' },
  { key: 'fear', label: 'Fear' },
  { key: 'peace', label: 'Peace' },
  { key: 'guidance', label: 'Guidance' },
  { key: 'forgiveness', label: 'Forgiveness' },
  { key: 'strength', label: 'Strength' },
  { key: 'doubt', label: 'Doubt' },
] as const;

export type MoodKey = (typeof MOOD_OPTIONS)[number]['key'];

export const TRADITION_LABELS: Record<string, string> = {
  quran: 'Quran',
  'bible-ot': 'Bible — Old Testament',
  'bible-nt': 'Bible — New Testament',
  torah: 'Torah',
  vedas: 'Vedas',
};

// Shared shape for a single scripture_verses row as rendered by VerseDeckView,
// whether it came from the mood-tag RPC or the context-search Edge Function.
export type ScriptureVerseCard = {
  id: string;
  tradition: 'quran' | 'bible-ot' | 'bible-nt' | 'torah' | 'vedas';
  book: string;
  chapter: number;
  verseNumber: number;
  originalText: string;
  translation: string | null;
  moodTags?: string[];
  similarity?: number;
};
