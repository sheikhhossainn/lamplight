// Canonical Library shelf categories, derived on-device from each book's raw
// Gutendex subjects/bookshelves (books.categories, a JSON string array cached
// locally — see schema v6). Gutendex subjects are messy Library-of-Congress
// headings ("Detective and mystery stories", "England -- Fiction", "Love
// stories"), so this maps them into a small, readable set of buckets by
// keyword. Pure + cheap: run over the already-loaded book list, memoized in
// the Library screen — no DB precompute, so the taxonomy can be tuned freely.

export type BookCategory = {
  id: string;
  label: string;
  // Lowercased substrings matched against each raw subject string.
  keywords: string[];
};

// Order is display order in the filter row. "Fiction" is intentionally broad
// (a catch-all for novels); the non-fiction buckets are the selective ones.
export const BOOK_CATEGORIES: BookCategory[] = [
  { id: 'fiction', label: 'Fiction', keywords: ['fiction'] },
  {
    id: 'adventure',
    label: 'Adventure',
    keywords: ['adventure', 'sea stories', 'voyages', 'survival', 'pirate', 'western stories', 'robinsonades'],
  },
  { id: 'mystery', label: 'Mystery & Crime', keywords: ['detective', 'mystery', 'crime', 'thriller'] },
  {
    id: 'scifi-fantasy',
    label: 'Sci-Fi & Fantasy',
    keywords: ['science fiction', 'fantasy', 'fairy tale', 'utopias'],
  },
  { id: 'romance', label: 'Romance', keywords: ['romance', 'love stories', 'courtship', 'domestic fiction'] },
  { id: 'horror', label: 'Horror', keywords: ['horror', 'ghost stories', 'gothic', 'vampire'] },
  { id: 'philosophy', label: 'Philosophy', keywords: ['philosophy', 'ethics', 'logic', 'metaphysics'] },
  {
    id: 'religion',
    label: 'Religion',
    keywords: ['religion', 'bible', 'christian', 'theology', 'spiritual', 'mythology', 'sermons'],
  },
  {
    id: 'politics',
    label: 'Politics & Society',
    keywords: ['political', 'politics', 'government', 'economic', 'socialism', 'sociology', 'social science', 'war'],
  },
  {
    id: 'history',
    label: 'History',
    keywords: ['history', 'historical', 'biography', 'memoir', 'autobiograph'],
  },
  {
    id: 'science',
    label: 'Science & Nature',
    keywords: ['natural history', 'physics', 'biology', 'astronomy', 'mathematics', 'medicine', 'botany', 'chemistry', 'zoology', 'science'],
  },
  {
    id: 'poetry-drama',
    label: 'Poetry & Drama',
    keywords: ['poetry', 'poems', 'drama', 'plays', 'tragedy', 'comedies', 'verse'],
  },
  { id: 'children', label: "Children's", keywords: ['children', 'juvenile', 'nursery', 'fairy tale'] },
];

const BY_ID = new Map(BOOK_CATEGORIES.map((c) => [c.id, c]));

export function categoryLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

// The canonical category ids a book falls under, from its raw subject strings.
// A book can match several (a book is both Fiction and Adventure).
export function categoriesForBook(rawSubjects: string[]): string[] {
  const hay = rawSubjects.map((s) => s.toLowerCase());
  const result: string[] = [];
  for (const cat of BOOK_CATEGORIES) {
    const matched = hay.some((subj) => {
      // "science fiction" / "social science" both contain "science" but belong
      // to other buckets — don't let them leak into Science & Nature.
      if (cat.id === 'science' && (subj.includes('science fiction') || subj.includes('social science'))) {
        return false;
      }
      return cat.keywords.some((k) => subj.includes(k));
    });
    if (matched) result.push(cat.id);
  }
  return result;
}
