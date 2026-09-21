import { getSession } from '@/lib/supabaseAuth';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export type FeedbackCategory = 'general' | 'bug' | 'feature_request';

export async function submitFeedback(
  category: FeedbackCategory,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { success: false, error: 'Feedback message cannot be empty.' };
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { success: false, error: 'Feedback service is not configured.' };
  }

  try {
    const session = await getSession();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        owner_id: session.userId,
        category,
        message: trimmed,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { success: false, error: errText || 'Failed to submit feedback.' };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: 'Unable to submit feedback. Please check your internet connection.',
    };
  }
}
