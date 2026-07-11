import { cacheImportedBook } from '@/features/content-ingestion/bookDownloader';
import { parseEpub } from '@/features/content-ingestion/epubParser';
import { createLocalBook, type BookRow } from '@/db/repositories/books';
import { generateId } from '@/lib/id';

// Import EPUB (Library's "+ Import EPUB"): unlike catalog books, there's no
// Supabase row and no text_url to download from later — parse once here,
// cache the result the same way an on-demand download would, then insert a
// local `books` row pointing at it. Typed structurally (not `expo-file-system`'s
// `File`) because `File.pickFileAsync`'s static return type and the instance
// type constructed via `new File(...)` are two distinct, incompatible classes.
export async function importEpubFromFile(file: { base64(): Promise<string> }): Promise<BookRow> {
  const base64 = await file.base64();
  const parsed = await parseEpub(base64);

  const id = generateId();
  cacheImportedBook(id, { chapters: parsed.chapters });

  return createLocalBook({
    id,
    title: parsed.title,
    author: parsed.author,
    sourceLanguage: parsed.language,
    totalChapters: parsed.chapters.length,
  });
}
