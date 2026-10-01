import { Linking, Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

import type { PremiumPackage } from './billingTypes';
import { REVENUECAT_CURRENT_OFFERING } from './constants';

let configured = false;
let configuredUserId: string | null = null;

function getApiKey(): string | null {
  if (process.env.EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE === 'true') {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? null;
  }

  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? null;
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? null;
  return null;
}

export function isBillingSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function hasBillingKey(): boolean {
  return Boolean(getApiKey());
}

export async function configureBilling(appUserId: string): Promise<boolean> {
  if (!isBillingSupported()) return false;

  const apiKey = getApiKey();
  if (!apiKey) return false;

  if (configured) {
    if (configuredUserId !== appUserId) {
      await Purchases.logIn(appUserId);
      configuredUserId = appUserId;
    }
    return true;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey, appUserID: appUserId });
  configured = true;
  configuredUserId = appUserId;
  return true;
}

export function isConfigured(): boolean {
  return configured;
}

export async function logOutBilling(): Promise<void> {
  if (!isBillingSupported() || !configured) return;
  try {
    await Purchases.logOut();
    configuredUserId = null;
  } catch (err) {
    console.warn('[RevenueCat] Log out error:', err);
  }
}

export function addCustomerInfoListener(listener: (info: CustomerInfo) => void): () => void {
  if (!configured) return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export async function getPremiumPackages(): Promise<PremiumPackage[]> {
  const offerings = await Purchases.getOfferings();
  const offering = offerings.current?.identifier === REVENUECAT_CURRENT_OFFERING
    ? offerings.current
    : offerings.all[REVENUECAT_CURRENT_OFFERING] ?? offerings.current;
  return (offering?.availablePackages ?? []).map(mapPackage);
}

export async function purchasePackage(packageItem: PurchasesPackage): Promise<CustomerInfo> {
  const result = await Purchases.purchasePackage(packageItem);
  return result.customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function openSubscriptionManagement(url: string | null): Promise<void> {
  if (!url) return;
  await Linking.openURL(url);
}

export function isPurchaseCancelled(error: unknown): boolean {
  const candidate = error as { userCancelled?: boolean; code?: string } | null;
  return candidate?.userCancelled === true || candidate?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export function toSafeBillingMessage(error: unknown): string {
  const candidate = error as { message?: unknown; userInfo?: { readableErrorCode?: unknown } } | null;
  const readable = candidate?.userInfo?.readableErrorCode;
  if (typeof readable === 'string' && readable.length > 0) return readable;
  if (typeof candidate?.message === 'string' && candidate.message.length > 0) return candidate.message;
  return 'Billing is temporarily unavailable. Please try again.';
}

function mapPackage(packageItem: PurchasesPackage): PremiumPackage {
  return {
    identifier: packageItem.identifier,
    packageType: String(packageItem.packageType),
    priceString: packageItem.product.priceString,
    title: packageItem.product.title,
    description: packageItem.product.description,
    subscriptionPeriod: packageItem.product.subscriptionPeriod,
    source: packageItem,
  };
}
