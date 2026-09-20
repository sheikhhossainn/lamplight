import { isAuthenticatedAccount, isOnline } from '@/lib/supabaseAuth';
import { isPremiumUser, type PremiumFeature } from './subscriptionState';

export type GateCheckResult = {
  allowed: boolean;
  reason?: 'auth_required' | 'offline_blocked' | 'subscription_required';
  title?: string;
  message?: string;
};

/**
 * Validates whether a user can access a specific feature under the free/premium tier rules.
 *
 * Free features (offline reading, EPUB imports, bookmarks, local word-taps) are 100% unrestricted
 * even offline and without any account login.
 *
 * Premium features strictly require:
 * 1. An authenticated permanent account (not guest).
 * 2. An active internet connection.
 * 3. An active premium entitlement.
 */
export async function checkFeatureGate(
  feature: PremiumFeature | 'free_core',
): Promise<GateCheckResult> {
  // Free core features are accessible to anyone, anywhere, offline or online
  if (feature === 'free_core') {
    return { allowed: true };
  }

  // 1. Account check: Premium features require an authenticated account
  const isAuth = await isAuthenticatedAccount();
  if (!isAuth) {
    return {
      allowed: false,
      reason: 'auth_required',
      title: 'Account Required',
      message: 'Sign in or create an account to access Premium features and sync your library across devices.',
    };
  }

  // 2. Connectivity check: Premium features require internet
  const online = await isOnline();
  if (!online) {
    return {
      allowed: false,
      reason: 'offline_blocked',
      title: 'Internet Connection Required',
      message: 'Premium features require an active internet connection to verify your subscription and access cloud intelligence.',
    };
  }

  // 3. Premium entitlement check
  const hasPremium = isPremiumUser();
  if (!hasPremium) {
    return {
      allowed: false,
      reason: 'subscription_required',
      title: 'Lamplight Premium',
      message: 'This feature is part of Lamplight Premium. Upgrade to unlock unlimited learning, AI insights, and cloud sync.',
    };
  }

  return { allowed: true };
}
