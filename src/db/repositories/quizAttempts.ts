import { getDb } from '@/db/client';
import { generateId } from '@/lib/id';
import { enqueueMutation } from './syncOutbox';
import type { SQLiteDatabase } from 'expo-sqlite';

export type QuizAnswerDetail = {
  savedWordId: string;
  isCorrect: boolean;
  latencyMs?: number;
  mode?: string;
  enrichmentUsed?: boolean;
};

export type QuizAttempt = {
  id: string;
  bookId: string;
  mode: string;
  startedAt: number;
  completedAt: number | null;
  correctCount: number;
  questionCount: number;
  answers: QuizAnswerDetail[];
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

type QuizAttemptSqlRow = {
  id: string;
  book_id: string;
  mode: string;
  started_at: number;
  completed_at: number | null;
  correct_count: number;
  question_count: number;
  answers_json: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

function fromSqlRow(row: QuizAttemptSqlRow): QuizAttempt {
  let answers: QuizAnswerDetail[] = [];
  try {
    answers = JSON.parse(row.answers_json);
  } catch {
    answers = [];
  }
  return {
    id: row.id,
    bookId: row.book_id,
    mode: row.mode,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    correctCount: row.correct_count,
    questionCount: row.question_count,
    answers,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function createQuizAttempt(
  input: {
    bookId: string;
    mode: string;
    startedAt?: number;
    completedAt?: number | null;
    correctCount: number;
    questionCount: number;
    answers: QuizAnswerDetail[];
  },
  dbHandle?: SQLiteDatabase,
): Promise<QuizAttempt> {
  const db = dbHandle ?? (await getDb());
  const id = generateId();
  const now = Date.now();
  const startedAt = input.startedAt ?? now;
  const completedAt = input.completedAt ?? now;
  const answersJson = JSON.stringify(input.answers);

  await db.runAsync(
    `INSERT INTO quiz_attempts (
       id, book_id, mode, started_at, completed_at, correct_count, question_count, answers_json, created_at, updated_at, deleted_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      id,
      input.bookId,
      input.mode,
      startedAt,
      completedAt,
      input.correctCount,
      input.questionCount,
      answersJson,
      now,
      now,
    ],
  );

  const attempt: QuizAttempt = {
    id,
    bookId: input.bookId,
    mode: input.mode,
    startedAt,
    completedAt,
    correctCount: input.correctCount,
    questionCount: input.questionCount,
    answers: input.answers,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  // When attempt is completed, enqueue to outbox append-only
  if (completedAt) {
    await enqueueMutation(
      {
        entityType: 'quiz_attempt',
        entityId: id,
        operation: 'upsert',
        payload: attempt,
        idempotencyKey: `quiz_attempt:${id}`,
      },
      db,
    );
  }

  return attempt;
}

export async function listQuizAttemptsForBook(
  bookId: string,
  limit: number = 20,
  dbHandle?: SQLiteDatabase,
): Promise<QuizAttempt[]> {
  const db = dbHandle ?? (await getDb());
  const rows = await db.getAllAsync<QuizAttemptSqlRow>(
    `SELECT * FROM quiz_attempts
     WHERE book_id = ? AND deleted_at IS NULL
     ORDER BY completed_at DESC, created_at DESC
     LIMIT ?`,
    [bookId, limit],
  );
  return rows.map(fromSqlRow);
}

export async function getLatestQuizScoreForBook(
  bookId: string,
  dbHandle?: SQLiteDatabase,
): Promise<{ correctCount: number; questionCount: number; completedAt: number } | null> {
  const db = dbHandle ?? (await getDb());
  const row = await db.getFirstAsync<QuizAttemptSqlRow>(
    `SELECT correct_count, question_count, completed_at
     FROM quiz_attempts
     WHERE book_id = ? AND completed_at IS NOT NULL AND deleted_at IS NULL
     ORDER BY completed_at DESC
     LIMIT 1`,
    [bookId],
  );
  if (!row || !row.completed_at) return null;
  return {
    correctCount: row.correct_count,
    questionCount: row.question_count,
    completedAt: row.completed_at,
  };
}
