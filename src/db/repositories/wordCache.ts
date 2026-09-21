import { getDb } from '@/db/client';

export type ClozeQuestion = {
  sentence: string;
  answer: string;
  distractors: string[];
};

export async function getClozeCache(wordId: string): Promise<ClozeQuestion | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{
      sentence: string;
      answer: string;
      distractors: string;
    }>('SELECT sentence, answer, distractors FROM cloze_cache WHERE word_id = ?', [wordId]);
    if (!row) return null;
    return { sentence: row.sentence, answer: row.answer, distractors: JSON.parse(row.distractors) as string[] };
  } catch (err) {
    console.warn('[wordCache] getClozeCache error:', err);
    return null;
  }
}

export async function setClozeCache(wordId: string, q: ClozeQuestion): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO cloze_cache (word_id, sentence, answer, distractors, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [wordId, q.sentence, q.answer, JSON.stringify(q.distractors), Date.now()],
    );
  } catch (err) {
    console.warn('[wordCache] setClozeCache error:', err);
  }
}

export async function getUsageNoteCache(wordId: string, motherTongue: string): Promise<string | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ note: string }>(
      'SELECT note FROM usage_note_cache WHERE word_id = ? AND mother_tongue = ?',
      [wordId, motherTongue],
    );
    return row?.note ?? null;
  } catch (err) {
    console.warn('[wordCache] getUsageNoteCache error:', err);
    return null;
  }
}

export async function setUsageNoteCache(wordId: string, note: string, motherTongue: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO usage_note_cache (word_id, note, mother_tongue, created_at)
       VALUES (?, ?, ?, ?)`,
      [wordId, note, motherTongue, Date.now()],
    );
  } catch (err) {
    console.warn('[wordCache] setUsageNoteCache error:', err);
  }
}

export type WordRelated = { word: string; meaning: string };

export type WordCluster = {
  usageNote: string;
  synonyms: WordRelated[];
  antonyms: WordRelated[];
};

export async function getWordCluster(wordId: string, motherTongue: string): Promise<WordCluster | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{
      usage_note: string;
      synonyms: string;
      antonyms: string;
    }>(
      'SELECT usage_note, synonyms, antonyms FROM word_cluster_cache WHERE word_id = ? AND mother_tongue = ?',
      [wordId, motherTongue],
    );
    if (!row) return null;
    return {
      usageNote: row.usage_note,
      synonyms: JSON.parse(row.synonyms) as WordRelated[],
      antonyms: JSON.parse(row.antonyms) as WordRelated[],
    };
  } catch (err) {
    console.warn('[wordCache] getWordCluster error:', err);
    return null;
  }
}

export async function setWordCluster(wordId: string, motherTongue: string, cluster: WordCluster): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO word_cluster_cache (word_id, mother_tongue, usage_note, synonyms, antonyms, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        wordId,
        motherTongue,
        cluster.usageNote,
        JSON.stringify(cluster.synonyms),
        JSON.stringify(cluster.antonyms),
        Date.now(),
      ],
    );
  } catch (err) {
    console.warn('[wordCache] setWordCluster error:', err);
  }
}
