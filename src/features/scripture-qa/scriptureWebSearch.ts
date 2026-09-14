/**
 * Fetches concise public encyclopedic & theological context for a scripture inquiry.
 * Uses open Wikipedia Search API with typo-suggestion fallback (e.g. "punishement" -> "punishment").
 * Operates purely via standard fetch with timeout; fails silently to empty string if offline.
 */

const STOP_WORDS = new Set([
  'what', 'does', 'do', 'say', 'says', 'saying', 'said', 'tells', 'tell',
  'about', 'regarding', 'concerning', 'the', 'and', 'for', 'are', 'but',
  'not', 'you', 'all', 'any', 'can', 'her', 'was', 'one', 'our', 'out',
  'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old',
  'see', 'two', 'way', 'who', 'did', 'its', 'let', 'put', 'she', 'too',
  'use', 'with', 'from', 'this', 'that', 'these', 'those', 'them', 'they',
  'their', 'there', 'then', 'than', 'into', 'have', 'had', 'were', 'will',
  'would', 'could', 'should', 'been', 'each', 'other', 'which', 'some',
  'such', 'very', 'even', 'most', 'also', 'many', 'much', 'only', 'own',
  'same', 'religion', 'religions', 'religious', 'scripture', 'scriptures',
]);

type WikiSearchItem = {
  title: string;
  snippet: string;
};

type WikiSearchResponse = {
  query?: {
    search?: WikiSearchItem[];
    searchinfo?: {
      totalhits?: number;
      suggestion?: string;
    };
  };
};

export async function fetchScripturalWebContext(query: string): Promise<string> {
  try {
    const rawTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

    const searchTerm = rawTokens.length > 0 ? rawTokens.join(' ') : query.trim();
    if (!searchTerm) return '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const executeSearch = async (term: string): Promise<{ hits: WikiSearchItem[]; suggestion?: string }> => {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        term + ' scripture religion'
      )}&utf8=&format=json`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LamplightApp/1.0; +https://github.com/sheikhhossainn/lamplight)',
        },
        signal: controller.signal,
      });

      if (!res.ok) return { hits: [] };
      const data = (await res.json()) as WikiSearchResponse;
      return {
        hits: data.query?.search || [],
        suggestion: data.query?.searchinfo?.suggestion,
      };
    };

    let result = await executeSearch(searchTerm);

    // If zero hits and Wikipedia offered a spelling suggestion, retry with suggestion
    if (result.hits.length === 0 && result.suggestion) {
      result = await executeSearch(result.suggestion);
    }

    clearTimeout(timeoutId);

    if (result.hits.length === 0) return '';

    // Format top 2-3 snippets
    const formattedSnippets = result.hits
      .slice(0, 3)
      .map((item) => {
        const cleanSnippet = item.snippet.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        return `• ${item.title}: ${cleanSnippet}`;
      })
      .join('\n');

    return formattedSnippets;
  } catch {
    // Fail silently on network errors or timeouts to never block the inquiry
    return '';
  }
}
