import type { SrsCardState } from '@/features/vocabulary/srsAlgorithm';

export type CourseProgressStatus = 'locked' | 'open' | 'done';

export type CourseProgressRecord = {
  lang: string;
  lessonId: string;
  status: CourseProgressStatus;
  exerciseIndex: number;
  bestAccuracy: number | null;
  completedAt: number | null;
  updatedAt: number;
};

export type CourseItemRecord = {
  lang: string;
  itemId: string;
  srsStage: number;
  srsIntervalDays: number;
  srsEaseFactor: number;
  srsDueDate: number;
  srsReps: number;
  srsLapses: number;
  updatedAt: number;
};

type CourseProgressSqlRow = {
  lang: string;
  lesson_id: string;
  status: string;
  exercise_index: number;
  best_accuracy: number | null;
  completed_at: number | null;
  updated_at: number;
};

type CourseItemSqlRow = {
  lang: string;
  item_id: string;
  srs_stage: number;
  srs_interval_days: number;
  srs_ease_factor: number;
  srs_due_date: number;
  srs_reps: number;
  srs_lapses: number;
  updated_at: number;
};

async function loadDb() {
  const { getDb } = await import('@/db/client');
  return getDb();
}

function progressFromRow(row: CourseProgressSqlRow): CourseProgressRecord {
  return {
    lang: row.lang,
    lessonId: row.lesson_id,
    status: (row.status as CourseProgressStatus) || 'open',
    exerciseIndex: row.exercise_index ?? 0,
    bestAccuracy: row.best_accuracy ?? null,
    completedAt: row.completed_at ?? null,
    updatedAt: row.updated_at,
  };
}

function itemFromRow(row: CourseItemSqlRow): CourseItemRecord {
  return {
    lang: row.lang,
    itemId: row.item_id,
    srsStage: row.srs_stage ?? 0,
    srsIntervalDays: row.srs_interval_days ?? 0,
    srsEaseFactor: row.srs_ease_factor ?? 2.5,
    srsDueDate: row.srs_due_date ?? 0,
    srsReps: row.srs_reps ?? 0,
    srsLapses: row.srs_lapses ?? 0,
    updatedAt: row.updated_at,
  };
}

/**
 * Computes whether a lesson is locked, open, or done given existing progress
 * records and the canonical sequential order of lessons in the course.
 */
export function computeLessonStatus(
  lessonId: string,
  progressMap: Map<string, CourseProgressRecord>,
  allLessonsInOrder: string[],
): CourseProgressStatus {
  const recorded = progressMap.get(lessonId);
  if (recorded?.status === 'done') return 'done';
  if (recorded?.status === 'open') return 'open';

  // First lesson in course is always open
  const idx = allLessonsInOrder.indexOf(lessonId);
  if (idx <= 0) return 'open';

  // Unlocked once the immediately preceding lesson is completed
  const prevId = allLessonsInOrder[idx - 1];
  const prevProgress = progressMap.get(prevId);
  if (prevProgress?.status === 'done') return 'open';

  return 'locked';
}

/**
 * Pure evaluation for best accuracy preservation.
 */
export function calculateBestAccuracy(
  existing: number | null | undefined,
  incoming: number | null | undefined,
): number | null {
  if (incoming === undefined || incoming === null) return existing ?? null;
  if (existing === undefined || existing === null) return incoming;
  return Math.max(existing, incoming);
}

// ---------------------------------------------------------------------------
// Course Progress
// ---------------------------------------------------------------------------

export async function getCourseProgress(
  lang: string,
  lessonId: string,
): Promise<CourseProgressRecord | null> {
  const db = await loadDb();
  const row = await db.getFirstAsync<CourseProgressSqlRow>(
    'SELECT * FROM course_progress WHERE lang = ? AND lesson_id = ?',
    [lang, lessonId],
  );
  return row ? progressFromRow(row) : null;
}

export async function getAllCourseProgress(lang: string): Promise<CourseProgressRecord[]> {
  const db = await loadDb();
  const rows = await db.getAllAsync<CourseProgressSqlRow>(
    'SELECT * FROM course_progress WHERE lang = ? ORDER BY lesson_id ASC',
    [lang],
  );
  return rows.map(progressFromRow);
}

export async function setCourseProgress(params: {
  lang: string;
  lessonId: string;
  status: CourseProgressStatus;
  exerciseIndex?: number;
  bestAccuracy?: number | null;
  completedAt?: number | null;
}): Promise<void> {
  const db = await loadDb();
  const now = Date.now();
  const existing = await getCourseProgress(params.lang, params.lessonId);

  const bestAccuracy =
    params.bestAccuracy !== undefined
      ? params.bestAccuracy
      : existing?.bestAccuracy ?? null;

  const completedAt =
    params.completedAt !== undefined
      ? params.completedAt
      : existing?.completedAt ?? null;

  const exerciseIndex =
    params.exerciseIndex !== undefined
      ? params.exerciseIndex
      : existing?.exerciseIndex ?? 0;

  await db.runAsync(
    `INSERT INTO course_progress (lang, lesson_id, status, exercise_index, best_accuracy, completed_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(lang, lesson_id) DO UPDATE SET
       status = excluded.status,
       exercise_index = excluded.exercise_index,
       best_accuracy = COALESCE(excluded.best_accuracy, course_progress.best_accuracy),
       completed_at = COALESCE(excluded.completed_at, course_progress.completed_at),
       updated_at = excluded.updated_at`,
    [
      params.lang,
      params.lessonId,
      params.status,
      exerciseIndex,
      bestAccuracy,
      completedAt,
      now,
    ],
  );
}

export async function updateExerciseIndex(
  lang: string,
  lessonId: string,
  exerciseIndex: number,
): Promise<void> {
  const db = await loadDb();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO course_progress (lang, lesson_id, status, exercise_index, updated_at)
     VALUES (?, ?, 'open', ?, ?)
     ON CONFLICT(lang, lesson_id) DO UPDATE SET
       exercise_index = excluded.exercise_index,
       updated_at = excluded.updated_at`,
    [lang, lessonId, exerciseIndex, now],
  );
}

export async function completeLesson(
  lang: string,
  lessonId: string,
  accuracy?: number | null,
): Promise<void> {
  const db = await loadDb();
  const now = Date.now();
  const existing = await getCourseProgress(lang, lessonId);
  const bestAccuracy =
    accuracy !== undefined && accuracy !== null
      ? existing?.bestAccuracy !== null && existing?.bestAccuracy !== undefined
        ? Math.max(existing.bestAccuracy, accuracy)
        : accuracy
      : existing?.bestAccuracy ?? null;

  await db.runAsync(
    `INSERT INTO course_progress (lang, lesson_id, status, exercise_index, best_accuracy, completed_at, updated_at)
     VALUES (?, ?, 'done', 0, ?, ?, ?)
     ON CONFLICT(lang, lesson_id) DO UPDATE SET
       status = 'done',
       exercise_index = 0,
       best_accuracy = COALESCE(excluded.best_accuracy, course_progress.best_accuracy),
       completed_at = COALESCE(course_progress.completed_at, excluded.completed_at),
       updated_at = excluded.updated_at`,
    [lang, lessonId, bestAccuracy, now, now],
  );
}

// ---------------------------------------------------------------------------
// Course Items (SRS)
// ---------------------------------------------------------------------------

export async function getCourseItem(
  lang: string,
  itemId: string,
): Promise<CourseItemRecord | null> {
  const db = await loadDb();
  const row = await db.getFirstAsync<CourseItemSqlRow>(
    'SELECT * FROM course_items WHERE lang = ? AND item_id = ?',
    [lang, itemId],
  );
  return row ? itemFromRow(row) : null;
}

export async function getAllCourseItems(lang: string): Promise<CourseItemRecord[]> {
  const db = await loadDb();
  const rows = await db.getAllAsync<CourseItemSqlRow>(
    'SELECT * FROM course_items WHERE lang = ? ORDER BY item_id ASC',
    [lang],
  );
  return rows.map(itemFromRow);
}

export async function getDueCourseItems(
  lang: string,
  asOfMs: number = Date.now(),
): Promise<CourseItemRecord[]> {
  const db = await loadDb();
  const rows = await db.getAllAsync<CourseItemSqlRow>(
    'SELECT * FROM course_items WHERE lang = ? AND srs_due_date <= ? ORDER BY srs_due_date ASC',
    [lang, asOfMs],
  );
  return rows.map(itemFromRow);
}

export async function upsertCourseItem(
  item: Partial<CourseItemRecord> & { lang: string; itemId: string },
): Promise<void> {
  const db = await loadDb();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO course_items (
       lang, item_id, srs_stage, srs_interval_days, srs_ease_factor,
       srs_due_date, srs_reps, srs_lapses, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(lang, item_id) DO UPDATE SET
       srs_stage = excluded.srs_stage,
       srs_interval_days = excluded.srs_interval_days,
       srs_ease_factor = excluded.srs_ease_factor,
       srs_due_date = excluded.srs_due_date,
       srs_reps = excluded.srs_reps,
       srs_lapses = excluded.srs_lapses,
       updated_at = excluded.updated_at`,
    [
      item.lang,
      item.itemId,
      item.srsStage ?? 0,
      item.srsIntervalDays ?? 0,
      item.srsEaseFactor ?? 2.5,
      item.srsDueDate ?? 0,
      item.srsReps ?? 0,
      item.srsLapses ?? 0,
      now,
    ],
  );
}

export async function updateCourseItemSrs(
  lang: string,
  itemId: string,
  srs: SrsCardState,
): Promise<void> {
  await upsertCourseItem({
    lang,
    itemId,
    srsStage: srs.stage,
    srsIntervalDays: srs.intervalDays,
    srsEaseFactor: srs.easeFactor,
    srsDueDate: srs.dueDate,
    srsReps: srs.reps,
    srsLapses: srs.lapses,
  });
}

/**
 * Stage 1 data migration: copies legacy `script_learned:<lang>` characters
 * into `course_items`, then deletes the legacy setting.
 */
export async function migrateLegacyScriptProgress(lang: string): Promise<number> {
  const { getSetting, setSetting } = await import('@/db/repositories/appSettings');
  const legacyKey = `script_learned:${lang}`;
  const raw = await getSetting(legacyKey);
  if (!raw) return 0;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return 0;

    let count = 0;
    const now = Date.now();
    for (const char of parsed) {
      if (typeof char === 'string' && char.length > 0) {
        // Record as an initially learned item (stage 1)
        await upsertCourseItem({
          lang,
          itemId: `letter:${char}`,
          srsStage: 1,
          srsIntervalDays: 1,
          srsEaseFactor: 2.5,
          srsDueDate: now + 24 * 60 * 60 * 1000,
          srsReps: 1,
          srsLapses: 0,
        });
        count++;
      }
    }

    // Delete legacy setting once migrated
    await setSetting(legacyKey, '');
    return count;
  } catch {
    return 0;
  }
}
