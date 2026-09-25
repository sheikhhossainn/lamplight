import type { PurchasesPackage } from 'react-native-purchases';

export type BillingStatus =
  | { state: 'loading' }
  | { state: 'unavailable'; reason: 'missing_key' | 'unsupported_platform' }
  | { state: 'free'; lastCheckedAt: number | null }
  | {
      state: 'premium';
      expiresAt: string | null;
      willRenew: boolean;
      productId: string;
      managementURL: string | null;
      isSandbox: boolean;
    }
  | { state: 'error'; hasCachedPremium: boolean; message: string };

export type PremiumPackage = {
  identifier: string;
  packageType: string;
  priceString: string;
  title: string;
  description: string;
  subscriptionPeriod: string | null;
  source: PurchasesPackage;
};

export type PurchaseOutcome =
  | { type: 'purchased'; status: BillingStatus }
  | { type: 'cancelled' }
  | { type: 'completed_without_entitlement'; status: BillingStatus }
  | { type: 'failed'; message: string };

export type RestoreOutcome =
  | { type: 'restored'; status: BillingStatus }
  | { type: 'nothing_found'; status: BillingStatus }
  | { type: 'failed'; message: string };
