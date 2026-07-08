// Stub until Milestone 7 (RevenueCat + Play Billing, which requires the Expo Dev
// Client). Everything downstream reads through this single function so wiring in
// real entitlement state later touches one file, not every call site.
export function isPremiumUser(): boolean {
  return false;
}
