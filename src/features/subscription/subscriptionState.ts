import {
  getEntitlementSnapshot,
  canUse,
  requireFeature,
  subscribeToEntitlements,
  refreshEntitlements,
  restorePurchases,
  hydrateEntitlements,
  resetEntitlementsToFree,
  type PremiumFeature,
  type EntitlementSnapshot,
  type RestoreResult,
} from './entitlementService';

/**
 * Returns true if the user currently holds an active Premium entitlement (paid, trial, or grace).
 * Backward-compatible helper for legacy checks.
 */
export function isPremiumUser(): boolean {
  const snapshot = getEntitlementSnapshot();
  return snapshot.status === 'premium' || snapshot.status === 'trial' || snapshot.status === 'grace';
}

export {
  canUse,
  requireFeature,
  getEntitlementSnapshot,
  subscribeToEntitlements,
  refreshEntitlements,
  restorePurchases,
  hydrateEntitlements,
  resetEntitlementsToFree,
  type PremiumFeature,
  type EntitlementSnapshot,
  type RestoreResult,
};
