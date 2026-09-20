import { getDb } from '@/db/client';
import { getSession, verifyEmailOtp } from '@/lib/supabaseAuth';
import {
  createMergeJournal,
  updateMergeJournalState,
} from '@/db/repositories/syncMergeJournal';
import { enqueueMutation } from '@/db/repositories/syncOutbox';
import { triggerSync } from '@/features/sync/syncWorker';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export type LocalDataSnapshot = {
  savedWordsCount: number;
  highlightsCount: number;
  booksCount: number;
  shelvesCount: number;
  reviewEventsCount: number;
  timestamp: number;
  data: {
    savedWords: any[];
    highlights: any[];
    readingPositions: any[];
    shelves: any[];
    shelfItems: any[];
    reviewEvents: any[];
  };
};

/**
 * Creates an in-memory snapshot of all personal local SQLite rows
 * before initiating an existing-account sign-in or merge.
 */
export async function snapshotLocalData(): Promise<LocalDataSnapshot> {
  const db = await getDb();

  const [savedWords, highlights, readingPositions, shelves, shelfItems, reviewEvents] =
    await Promise.all([
      db.getAllAsync<any>('SELECT * FROM saved_words'),
      db.getAllAsync<any>('SELECT * FROM highlights'),
      db.getAllAsync<any>('SELECT * FROM reading_positions'),
      db.getAllAsync<any>('SELECT * FROM shelves'),
      db.getAllAsync<any>('SELECT * FROM shelf_items'),
      db.getAllAsync<any>('SELECT * FROM review_events'),
    ]);

  return {
    savedWordsCount: savedWords.length,
    highlightsCount: highlights.length,
    booksCount: readingPositions.length,
    shelvesCount: shelves.length,
    reviewEventsCount: reviewEvents.length,
    timestamp: Date.now(),
    data: {
      savedWords,
      highlights,
      readingPositions,
      shelves,
      shelfItems,
      reviewEvents,
    },
  };
}

/**
 * Pulls cloud records for an authenticated user from Supabase REST API.
 */
async function fetchCloudData(accessToken: string): Promise<{
  readingPositions: any[];
  savedWords: any[];
  highlights: any[];
  shelves: any[];
  shelfItems: any[];
}> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      readingPositions: [],
      savedWords: [],
      highlights: [],
      shelves: [],
      shelfItems: [],
    };
  }

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const [posRes, wordsRes, hlRes, shelvesRes, itemsRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/reading_positions?select=*`, { headers }).catch(() => null),
    fetch(`${SUPABASE_URL}/rest/v1/saved_words?select=*`, { headers }).catch(() => null),
    fetch(`${SUPABASE_URL}/rest/v1/highlights?select=*`, { headers }).catch(() => null),
    fetch(`${SUPABASE_URL}/rest/v1/shelves?select=*`, { headers }).catch(() => null),
    fetch(`${SUPABASE_URL}/rest/v1/shelf_items?select=*`, { headers }).catch(() => null),
  ]);

  const [readingPositions, savedWords, highlights, shelves, shelfItems] = await Promise.all([
    posRes && posRes.ok ? posRes.json().catch(() => []) : [],
    wordsRes && wordsRes.ok ? wordsRes.json().catch(() => []) : [],
    hlRes && hlRes.ok ? hlRes.json().catch(() => []) : [],
    shelvesRes && shelvesRes.ok ? shelvesRes.json().catch(() => []) : [],
    itemsRes && itemsRes.ok ? itemsRes.json().catch(() => []) : [],
  ]);

  return {
    readingPositions: Array.isArray(readingPositions) ? readingPositions : [],
    savedWords: Array.isArray(savedWords) ? savedWords : [],
    highlights: Array.isArray(highlights) ? highlights : [],
    shelves: Array.isArray(shelves) ? shelves : [],
    shelfItems: Array.isArray(shelfItems) ? shelfItems : [],
  };
}

/**
 * Executes existing-account sign-in and local-to-cloud merge:
 * 1. Writes merge journal entry
 * 2. Authenticates the existing account via verified OTP
 * 3. Pulls cloud data into staging
 * 4. Resolves conflicts and merges records inside a serialized SQLite transaction
 * 5. Enqueues local-only records under the target account ID
 * 6. Marks journal completed and triggers sync
 */
export async function executeAccountMerge(
  email: string,
  token: string,
  snapshot: LocalDataSnapshot,
): Promise<{ success: boolean; message?: string }> {
  let journalId: string | null = null;
  const db = await getDb();

  try {
    const priorSession = await getSession().catch(() => null);
    const priorAccountId = priorSession?.userId ?? null;

    // Step 1: Initialize journal
    journalId = await createMergeJournal(
      priorAccountId,
      email,
      JSON.stringify({
        wordCount: snapshot.savedWordsCount,
        booksCount: snapshot.booksCount,
        highlightsCount: snapshot.highlightsCount,
      }),
    );

    await updateMergeJournalState(journalId, 'staging');

    // Step 2: Sign into existing account
    const verifyRes = await verifyEmailOtp(email, token);
    if (!verifyRes.success) {
      await updateMergeJournalState(journalId, 'failed');
      return { success: false, message: verifyRes.message || 'Verification failed.' };
    }

    const session = await getSession();
    const targetAccountId = session.userId;

    // Step 3: Pull cloud data into staging
    const cloudData = await fetchCloudData(session.accessToken);

    await updateMergeJournalState(journalId, 'merging');

    // Step 4: Execute merge transaction in SQLite
    await db.withTransactionAsync(async () => {
      // 4.1 Merge Reading Positions: latest timestamp wins, furthest percent retained
      const cloudPositionsMap = new Map(cloudData.readingPositions.map((p) => [p.book_id, p]));
      for (const localPos of snapshot.data.readingPositions) {
        const cloudPos = cloudPositionsMap.get(localPos.book_id);
        if (cloudPos) {
          const newestTime = Math.max(localPos.updated_at, new Date(cloudPos.updated_at ?? 0).getTime());
          const maxPercent = Math.max(localPos.percent_complete, cloudPos.percent_complete ?? 0);
          const activeChapter = localPos.updated_at >= new Date(cloudPos.updated_at ?? 0).getTime()
            ? localPos.chapter_index
            : cloudPos.chapter_index;
          const activePage = localPos.updated_at >= new Date(cloudPos.updated_at ?? 0).getTime()
            ? localPos.page_index
            : cloudPos.page_index;

          await db.runAsync(
            `INSERT INTO reading_positions (book_id, chapter_index, page_index, percent_complete, updated_at, continue_hidden)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(book_id) DO UPDATE SET
               chapter_index = excluded.chapter_index,
               page_index = excluded.page_index,
               percent_complete = excluded.percent_complete,
               updated_at = excluded.updated_at`,
            [localPos.book_id, activeChapter, activePage, maxPercent, newestTime, localPos.continue_hidden ?? 0],
          );
        } else {
          // Local-only position: enqueue for upload under new owner
          await enqueueMutation(
            {
              entityType: 'reading_position',
              entityId: localPos.book_id,
              operation: 'upsert',
              payload: {
                bookId: localPos.book_id,
                chapterIndex: localPos.chapter_index,
                pageIndex: localPos.page_index,
                percentComplete: localPos.percent_complete,
                updatedAt: localPos.updated_at,
              },
            },
            db,
          );
        }
      }

      // Upsert any cloud-only positions into local DB
      const localPositionsMap = new Map(snapshot.data.readingPositions.map((p) => [p.book_id, p]));
      for (const cp of cloudData.readingPositions) {
        if (!localPositionsMap.has(cp.book_id)) {
          await db.runAsync(
            `INSERT OR IGNORE INTO reading_positions (book_id, chapter_index, page_index, percent_complete, updated_at, continue_hidden)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              cp.book_id,
              cp.chapter_index ?? 0,
              cp.page_index ?? 0,
              cp.percent_complete ?? 0,
              new Date(cp.updated_at ?? Date.now()).getTime(),
              0,
            ],
          );
        }
      }

      // 4.2 Merge Saved Words: union by id or (book_id, source_word)
      const cloudWordsMap = new Map(cloudData.savedWords.map((w) => [w.id, w]));
      const cloudWordKeyMap = new Map(
        cloudData.savedWords.map((w) => [`${w.book_id}:${w.source_word.toLowerCase()}`, w]),
      );

      for (const lw of snapshot.data.savedWords) {
        const key = `${lw.book_id}:${lw.source_word.toLowerCase()}`;
        const match = cloudWordsMap.get(lw.id) ?? cloudWordKeyMap.get(key);
        if (!match) {
          // Local-only word: enqueue to upload to cloud
          await enqueueMutation(
            {
              entityType: 'saved_word',
              entityId: lw.id,
              operation: 'upsert',
              payload: {
                id: lw.id,
                bookId: lw.book_id,
                sourceWord: lw.source_word,
                sourceLang: lw.source_lang,
                targetLang: lw.target_lang,
                translation: lw.translation,
                contextSentence: lw.context_sentence,
                chapterIndex: lw.chapter_index,
                pageIndex: lw.page_index ?? 0,
                paragraphIndex: lw.paragraph_index ?? 0,
                srsStage: lw.srs_stage ?? 0,
                srsEaseFactor: lw.srs_ease_factor ?? 2.5,
                srsDueDate: lw.srs_due_date,
                createdAt: lw.created_at,
              },
            },
            db,
          );
        }
      }

      // Insert cloud words that do not exist locally
      const localWordsMap = new Map(snapshot.data.savedWords.map((w) => [w.id, w]));
      for (const cw of cloudData.savedWords) {
        if (!localWordsMap.has(cw.id)) {
          await db.runAsync(
            `INSERT OR IGNORE INTO saved_words (
              id, book_id, source_word, source_lang, target_lang, translation,
              context_sentence, chapter_index, page_index, paragraph_index, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cw.id,
              cw.book_id,
              cw.source_word,
              cw.source_lang,
              cw.target_lang,
              cw.translation,
              cw.context_sentence,
              cw.chapter_index ?? 0,
              cw.page_index ?? 0,
              cw.paragraph_index ?? 0,
              new Date(cw.created_at ?? Date.now()).getTime(),
            ],
          );
        }
      }

      // 4.3 Merge Highlights: union
      const cloudHlMap = new Map(cloudData.highlights.map((h) => [h.id, h]));
      for (const lh of snapshot.data.highlights) {
        if (!cloudHlMap.has(lh.id)) {
          await enqueueMutation(
            {
              entityType: 'highlight',
              entityId: lh.id,
              operation: 'upsert',
              payload: {
                id: lh.id,
                bookId: lh.book_id,
                chapterIndex: lh.chapter_index ?? 0,
                pageIndex: lh.page_index ?? 0,
                startOffset: lh.start_offset ?? 0,
                endOffset: lh.end_offset ?? 0,
                colorKey: lh.color_key ?? 'amber',
                quoteText: lh.quote_text ?? '',
                createdAt: lh.created_at,
              },
            },
            db,
          );
        }
      }
      const localHlMap = new Map(snapshot.data.highlights.map((h) => [h.id, h]));
      for (const ch of cloudData.highlights) {
        if (!localHlMap.has(ch.id)) {
          await db.runAsync(
            `INSERT OR IGNORE INTO highlights (
              id, book_id, chapter_index, page_index, start_offset, end_offset, color_key, quote_text, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ch.id,
              ch.book_id,
              ch.chapter_index ?? 0,
              ch.page_index ?? 0,
              ch.start_offset ?? 0,
              ch.end_offset ?? 0,
              ch.color_key ?? 'amber',
              ch.quote_text ?? '',
              new Date(ch.created_at ?? Date.now()).getTime(),
            ],
          );
        }
      }

      // 4.4 Merge Shelves & Shelf Items
      const cloudShelvesMap = new Map(cloudData.shelves.map((s) => [s.id, s]));
      for (const ls of snapshot.data.shelves) {
        if (!cloudShelvesMap.has(ls.id)) {
          await enqueueMutation(
            {
              entityType: 'shelf',
              entityId: ls.id,
              operation: 'upsert',
              payload: {
                id: ls.id,
                name: ls.name,
                sortOrder: ls.sort_order ?? 0,
                createdAt: ls.created_at,
              },
            },
            db,
          );
        }
      }
      const localShelvesMap = new Map(snapshot.data.shelves.map((s) => [s.id, s]));
      for (const cs of cloudData.shelves) {
        if (!localShelvesMap.has(cs.id)) {
          await db.runAsync(
            `INSERT OR IGNORE INTO shelves (id, name, created_at) VALUES (?, ?, ?)`,
            [cs.id, cs.name, new Date(cs.created_at ?? Date.now()).getTime()],
          );
        }
      }
      for (const csi of cloudData.shelfItems) {
        await db.runAsync(
          `INSERT OR IGNORE INTO shelf_items (shelf_id, book_id, added_at) VALUES (?, ?, ?)`,
          [csi.shelf_id, csi.book_id, new Date(csi.added_at ?? Date.now()).getTime()],
        );
      }
    });

    // Step 5: Mark journal as completed
    await updateMergeJournalState(journalId, 'completed', Date.now());

    // Step 6: Trigger immediate cloud sync
    void triggerSync({ forceImmediate: true });

    return { success: true };
  } catch (err: unknown) {
    console.error('[AccountMerge] Error during merge execution:', err);
    if (journalId) {
      await updateMergeJournalState(journalId, 'failed');
    }
    return {
      success: false,
      message: (err as Error)?.message || 'An unexpected error occurred during account merge.',
    };
  }
}
