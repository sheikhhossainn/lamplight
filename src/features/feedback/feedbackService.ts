import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getDb } from '@/db/client';
import { getSession } from '@/lib/supabaseAuth';
import { getSetting, setSetting } from '@/db/repositories/appSettings';
import { generateId } from '@/lib/id';
import { logEvent } from '@/features/analytics/analytics';

export type FeedbackCategory = 'general' | 'bug' | 'feature' | 'translation';
export type FeedbackTargetType = 'app' | 'book' | 'translation';

export type FeedbackSubmission = {
  rating?: number; // 1 to 5
  category: FeedbackCategory;
  targetType?: FeedbackTargetType;
  targetId?: string;
  message: string;
  tags?: string[];
};

export type FeedbackOutboxRow = {
  id: string;
  rating: number | null;
  category: string;
  target_type: string;
  target_id: string | null;
  message: string;
  tags_json: string;
  metadata_json: string;
  created_at: number;
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const KEY_LAST_FEEDBACK_PROMPT_MS = 'last_feedback_prompt_ms';
const KEY_FEEDBACK_ALREADY_GIVEN = 'feedback_already_given';
const PROMPT_COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

/**
 * Builds diagnostic device metadata attached to feedback.
 */
async function buildClientMetadata(): Promise<Record<string, unknown>> {
  const [targetLang, motherTongue, readingTheme] = await Promise.all([
    getSetting('target_language'),
    getSetting('mother_tongue'),
    getSetting('reading_theme'),
  ]);

  return {
    app_version: Constants.expoConfig?.version ?? '1.0.0',
    platform: Platform.OS,
    os_version: Platform.Version,
    target_language: targetLang ?? 'bn',
    mother_tongue: motherTongue ?? 'en',
    reading_theme: readingTheme ?? 'western',
  };
}

/**
 * Submits feedback or rating.
 * Sends directly to Supabase if reachable, or safely queues in SQLite if offline.
 */
export async function submitFeedback(
  input: FeedbackSubmission,
): Promise<{ success: boolean; queuedOffline?: boolean; message: string }> {
  const metadata = await buildClientMetadata();
  const tags = input.tags ?? [];
  const targetType = input.targetType ?? 'app';

  // Mark that user has provided feedback so future milestone prompts remain quiet
  void setSetting(KEY_FEEDBACK_ALREADY_GIVEN, 'true');

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      let token = SUPABASE_ANON_KEY;
      let uid: string | null = null;
      try {
        const session = await getSession();
        if (session.accessToken) token = session.accessToken;
        if (session.userId) uid = session.userId;
      } catch {
        // Guest user fallback
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          owner_id: uid,
          rating: input.rating ?? null,
          category: input.category,
          target_type: targetType,
          target_id: input.targetId ?? null,
          message: input.message.trim(),
          tags,
          client_metadata: metadata,
          status: 'new',
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (res.ok) {
        logEvent('feedback_submitted', {
          rating: input.rating,
          category: input.category,
          target_type: targetType,
        });
        void flushPendingFeedback();
        return { success: true, message: 'Thank you for helping us improve Lamplight!' };
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[FeedbackService] Remote submission failed (${res.status}):`, errText);
      }
    } catch (err) {
      console.warn('[FeedbackService] Submission network error, queueing offline:', err);
    }
  }

  // Queue locally in SQLite for deferred sync
  try {
    const db = await getDb();
    const id = generateId();
    await db.runAsync(
      `INSERT INTO feedback_outbox (
        id, rating, category, target_type, target_id, message, tags_json, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.rating ?? null,
        input.category,
        targetType,
        input.targetId ?? null,
        input.message.trim(),
        JSON.stringify(tags),
        JSON.stringify(metadata),
        Date.now(),
      ],
    );

    return {
      success: true,
      queuedOffline: true,
      message: "Feedback saved offline. We'll deliver it once you're back online.",
    };
  } catch (err) {
    console.warn('[FeedbackService] Failed to queue feedback offline:', err);
    return { success: false, message: 'Could not save feedback. Please try again later.' };
  }
}

/**
 * Flushes any feedback queued in SQLite to Supabase.
 */
export async function flushPendingFeedback(): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return 0;

  try {
    const db = await getDb();
    const rows = await db.getAllAsync<FeedbackOutboxRow>(
      'SELECT * FROM feedback_outbox ORDER BY created_at ASC LIMIT 20',
    );

    if (rows.length === 0) return 0;

    let token = SUPABASE_ANON_KEY;
    let uid: string | null = null;
    try {
      const session = await getSession();
      if (session.accessToken) token = session.accessToken;
      if (session.userId) uid = session.userId;
    } catch {
      // Guest fallback
    }

    let sentCount = 0;
    const sentIds: string[] = [];

    for (const row of rows) {
      try {
        const payload = {
          owner_id: uid,
          rating: row.rating,
          category: row.category,
          target_type: row.target_type,
          target_id: row.target_id,
          message: row.message,
          tags: JSON.parse(row.tags_json || '[]'),
          client_metadata: JSON.parse(row.metadata_json || '{}'),
          status: 'new',
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          sentIds.push(row.id);
          sentCount++;
        }
      } catch {
        break; // Stop iteration on connection failure
      }
    }

    if (sentIds.length > 0) {
      const placeholders = sentIds.map(() => '?').join(',');
      await db.runAsync(`DELETE FROM feedback_outbox WHERE id IN (${placeholders})`, sentIds);
    }

    return sentCount;
  } catch (err) {
    console.warn('[FeedbackService] Error flushing pending feedback:', err);
    return 0;
  }
}

/**
 * Checks if the contextual milestone rating prompt should be shown.
 * Enforces a 60-day cooldown and avoids re-prompting once submitted.
 */
export async function shouldShowMilestonePrompt(): Promise<boolean> {
  try {
    const alreadyGiven = await getSetting(KEY_FEEDBACK_ALREADY_GIVEN);
    if (alreadyGiven === 'true') return false;

    const lastPromptStr = await getSetting(KEY_LAST_FEEDBACK_PROMPT_MS);
    if (!lastPromptStr) return true;

    const lastPromptTime = Number(lastPromptStr);
    if (Date.now() - lastPromptTime < PROMPT_COOLDOWN_MS) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Records that a milestone prompt was shown to reset cooldown.
 */
export async function recordMilestonePromptShown(): Promise<void> {
  await setSetting(KEY_LAST_FEEDBACK_PROMPT_MS, String(Date.now()));
}
