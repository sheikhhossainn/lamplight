import { usePathname } from 'expo-router';
import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CustomerInfo } from 'react-native-purchases';

import { getSession } from '@/lib/supabaseAuth';
import { logEvent } from '@/features/analytics/analytics';
import { applyRevenueCatEntitlement } from '@/features/subscription/entitlementService';
import { REVENUECAT_PREMIUM_ENTITLEMENT } from './constants';

import {
  addCustomerInfoListener,
  configureBilling,
  getCustomerInfo,
  getPremiumPackages,
  hasBillingKey,
  isBillingSupported,
  isConfigured,
  isPurchaseCancelled,
  openSubscriptionManagement,
  purchasePackage,
  restorePurchases,
  toSafeBillingMessage,
} from './revenueCatClient';
import type { BillingStatus, PremiumPackage, PurchaseOutcome, RestoreOutcome } from './billingTypes';

type BillingContextValue = {
  status: BillingStatus;
  packages: PremiumPackage[];
  isLoadingPackages: boolean;
  refresh: () => Promise<void>;
  purchase: (packageId: string) => Promise<PurchaseOutcome>;
  restore: () => Promise<RestoreOutcome>;
  openManagement: () => Promise<void>;
};

const BillingContext = createContext<BillingContextValue | null>(null);

function statusFromCustomerInfo(info: CustomerInfo): BillingStatus {
  const entitlement = info.entitlements.active[REVENUECAT_PREMIUM_ENTITLEMENT];
  if (!entitlement) return { state: 'free', lastCheckedAt: Date.now() };

  return {
    state: 'premium',
    expiresAt: entitlement.expirationDate,
    willRenew: entitlement.willRenew,
    productId: entitlement.productIdentifier,
    managementURL: info.managementURL,
    isSandbox: entitlement.isSandbox,
  };
}

function hasPremium(status: BillingStatus): boolean {
  return status.state === 'premium';
}

export function BillingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<BillingStatus>({ state: 'loading' });
  const [packages, setPackages] = useState<PremiumPackage[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  const applyCustomerInfo = useCallback(async (info: CustomerInfo) => {
    const nextStatus = statusFromCustomerInfo(info);
    setStatus(nextStatus);
    await applyRevenueCatEntitlement(info);
  }, []);

  const refresh = useCallback(async () => {
    if (!isBillingSupported()) {
      setSdkReady(false);
      setStatus({ state: 'unavailable', reason: 'unsupported_platform' });
      return;
    }
    if (!hasBillingKey()) {
      setSdkReady(false);
      setStatus({ state: 'unavailable', reason: 'missing_key' });
      return;
    }

    try {
      const session = await getSession();
      const ready = await configureBilling(session.userId);
      if (!ready) {
        setSdkReady(false);
        setStatus({ state: 'unavailable', reason: 'missing_key' });
        return;
      }
      setSdkReady(true);
      const info = await getCustomerInfo();
      await applyCustomerInfo(info);
    } catch (error) {
      setStatus((previous) => ({
        state: 'error',
        hasCachedPremium: hasPremium(previous),
        message: toSafeBillingMessage(error),
      }));
    }
  }, [applyCustomerInfo]);

  const loadPackages = useCallback(async () => {
    if (!isConfigured()) return;
    setIsLoadingPackages(true);
    try {
      setPackages(await getPremiumPackages());
    } catch (error) {
      setPackages([]);
      logEvent('purchase_failed', { stage: 'offerings', message: toSafeBillingMessage(error) });
    } finally {
      setIsLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      await refresh();
      if (active) await loadPackages();
    };
    void initialize();
    return () => {
      active = false;
    };
  }, [loadPackages, refresh]);

  useEffect(() => {
    if (!sdkReady || !isConfigured()) return;
    return addCustomerInfoListener((info) => {
      void applyCustomerInfo(info);
    });
  }, [applyCustomerInfo, sdkReady]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const purchase = useCallback(async (packageId: string): Promise<PurchaseOutcome> => {
    const selected = packages.find((item) => item.identifier === packageId);
    if (!selected) return { type: 'failed', message: 'That Premium package is no longer available.' };

    logEvent('purchase_started', { package_id: packageId });
    try {
      const info = await purchasePackage(selected.source);
      await applyCustomerInfo(info);
      const nextStatus = statusFromCustomerInfo(info);
      if (nextStatus.state !== 'premium') {
        return { type: 'completed_without_entitlement', status: nextStatus };
      }
      logEvent('purchase_completed', { package_id: packageId });
      return { type: 'purchased', status: nextStatus };
    } catch (error) {
      if (isPurchaseCancelled(error)) {
        logEvent('purchase_cancelled', { package_id: packageId });
        return { type: 'cancelled' };
      }
      const message = toSafeBillingMessage(error);
      logEvent('purchase_failed', { package_id: packageId, message });
      return { type: 'failed', message };
    }
  }, [applyCustomerInfo, packages]);

  const restore = useCallback(async (): Promise<RestoreOutcome> => {
    logEvent('restore_started', {});
    try {
      const info = await restorePurchases();
      await applyCustomerInfo(info);
      const nextStatus = statusFromCustomerInfo(info);
      if (nextStatus.state === 'premium') {
        logEvent('restore_completed', { restored: true });
        return { type: 'restored', status: nextStatus };
      }
      logEvent('restore_completed', { restored: false });
      return { type: 'nothing_found', status: nextStatus };
    } catch (error) {
      const message = toSafeBillingMessage(error);
      logEvent('purchase_failed', { stage: 'restore', message });
      return { type: 'failed', message };
    }
  }, [applyCustomerInfo]);

  const value = useMemo<BillingContextValue>(() => ({
    status,
    packages,
    isLoadingPackages,
    refresh,
    purchase,
    restore,
    openManagement: async () => {
      if (status.state === 'premium') await openSubscriptionManagement(status.managementURL);
    },
  }), [isLoadingPackages, packages, purchase, refresh, restore, status]);

  // Avoid an unused pathname warning while keeping a billing refresh tied to
  // returning to the paywall after auth or account transitions.
  useEffect(() => {
    if (pathname === '/paywall') void refresh();
  }, [pathname, refresh]);

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling(): BillingContextValue {
  const context = useContext(BillingContext);
  if (!context) throw new Error('useBilling must be used inside BillingProvider');
  return context;
}
