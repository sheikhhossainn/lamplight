# RevenueCat integration research for Lamplight

Status: implementation guidance  
Researched: 2026-09-24  
Target: React Native + Expo SDK 57 + Expo Router + Supabase Auth/Postgres

This note contains the payment-specific research and implementation contract for Lamplight. It uses primary sources only: RevenueCat, Expo, Supabase, Apple, and Google.

## Decision summary

RevenueCat setup is free to start. The current Pro plan includes the subscription backend and webhooks at no charge until the documented monthly tracked-revenue threshold; above that threshold RevenueCat charges its published percentage. Store developer-account fees and App Store/Google Play transaction commissions remain separate from RevenueCat pricing.

Use RevenueCat as the client purchase SDK, receipt-validation service, and cross-store entitlement source.

- Install react-native-purchases for the purchase API.
- Install react-native-purchases-ui only if Lamplight will use RevenueCat Paywalls or Customer Center. The current implementation keeps the Lamplight-styled custom paywall and uses `react-native-purchases` only.
- Use one RevenueCat entitlement named premium. Attach every monthly and annual store product to it.
- Use Offerings and Packages in application code. Do not hardcode product prices or use product IDs as feature flags.
- Use the current Supabase Auth user UUID as the RevenueCat App User ID, including Supabase anonymous users.
- Wait for Supabase to create or restore its session before configuring RevenueCat. Configure RevenueCat once per process.
- On a switch to a different Supabase account UUID, call Purchases.logIn(newUserId). Do not call Purchases.logOut when Lamplight always has a Supabase identity; logOut creates an unrelated RevenueCat anonymous identity.
- Use CustomerInfo.entitlements.active.premium as the immediate client-side access decision.
- Mirror entitlements into Supabase through a RevenueCat webhook for backend authorization, support, and analytics. The webhook must be authenticated, idempotent, and followed by a RevenueCat REST subscriber refresh.
- Keep the current free reading experience available. RevenueCat controls only explicitly documented Premium capabilities.
- Provide visible Restore Purchases and Manage Subscription actions.

RevenueCat defines the product relationship as Product → Entitlement → Offering/Package, and recommends checking an entitlement instead of raw subscription/product state: [Configuring Products](https://www.revenuecat.com/docs/projects/configuring-products), [CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info).

## Expo constraints

RevenueCat contains native code. Expo's official in-app-purchase guide says real IAP requires a development build because Expo Go cannot configure arbitrary native libraries. Current RevenueCat SDK releases may load in Expo Go's Preview API Mode with mocks, but Preview Mode cannot perform real purchases. Treat a development build as mandatory for integration tests and store sandbox tests: [Expo IAP guide](https://docs.expo.dev/guides/in-app-purchases/), [RevenueCat Expo guide](https://www.revenuecat.com/docs/getting-started/installation/expo), [RevenueCat React Native SDK](https://github.com/RevenueCat/react-native-purchases).

Adding the packages changes the native runtime. It therefore requires:

1. Approval for the new dependencies and native build change under this repository's engineering rules.
2. A fresh development build after installation. Hot reload cannot add the native module to an already-installed client.
3. Reading docs/deployment.md before running EAS commands, as required by this repository.

Proposed install command:

~~~sh
npx expo install react-native-purchases
~~~

Do not pin a version from this document. Let Expo resolve a version compatible with the installed Expo/React Native stack, then commit the exact lockfile version and record it in the implementation PR.

## RevenueCat dashboard model

### Project and apps

Create one RevenueCat project for Lamplight with separate app configurations for:

- Apple App Store, using Lamplight's exact iOS bundle ID.
- Google Play, using Lamplight's exact Android application ID.
- RevenueCat Test Store for early development.

RevenueCat issues separate public SDK keys for iOS, Android, and Test Store. Hybrid apps must select the platform-specific key. A Test Store key must never ship in a store build: [SDK configuration](https://www.revenuecat.com/docs/getting-started/configuring-sdk), [Launch checklist](https://www.revenuecat.com/docs/test-and-launch/launch-checklist).

Suggested Expo environment variables:

~~~text
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
EXPO_PUBLIC_REVENUECAT_TEST_API_KEY
~~~

These are RevenueCat public SDK keys and are expected to be present in the client. Never put a RevenueCat secret REST API key, webhook shared secret, webhook HMAC secret, Apple private key, or Google service-account JSON in an EXPO_PUBLIC variable.

Use separate build profiles or an explicit build-channel variable to choose Test Store versus real-store keys. Do not infer production solely from __DEV__; preview and internal-distribution builds may need real sandbox products.

### Product catalog

Start with a single access tier:

- Entitlement identifier: premium
- Offering identifier: default
- Packages: monthly and annual

Suggested store product identifiers:

~~~text
com.lamplight.premium.monthly
com.lamplight.premium.annual
~~~

The exact identifiers are permanent once released, so confirm the real bundle/application IDs and naming convention before creating them.

Create equivalent products in App Store Connect and Google Play Console, import them into RevenueCat, attach both products to premium, place the products into monthly and annual packages, and mark the offering as Current. Offerings allow pricing and package presentation to change without an app update; the app must render localized price strings supplied by the store package, never calculate or hardcode currency: [Displaying Products](https://www.revenuecat.com/docs/getting-started/displaying-products).

Recommended launch shape:

- Monthly auto-renewing subscription.
- Annual auto-renewing subscription, visually recommended only when it is genuinely better value.
- Optional trial only after renewal, expiration, and trial-eligibility behavior has been tested on both stores.
- No lifetime purchase at launch. It complicates pricing, support, and restore semantics without validating subscription demand.

### Restore behavior

Select Transfer to new App User ID for both sandbox and production unless the product team establishes a strict one-account-only purchase policy. Lamplight allows guest use and account upgrades, so RevenueCat recommends transfer behavior for optional-login apps. Test this choice deliberately because the project-level setting also applies when a receipt is already attached to another identified user: [Restore Behavior](https://www.revenuecat.com/docs/projects/restore-behavior).

## Apple configuration

Before real App Store purchases:

1. Accept the Paid Applications Agreement.
2. Complete tax and banking details.
3. Ensure the App Store Connect app record uses the same bundle ID as the Expo app.
4. Enable the In-App Purchase capability for that bundle/target.
5. Create one subscription group and add monthly and annual products.
6. Complete localization, prices, review screenshot, and product metadata.
7. Create and upload the required In-App Purchase Key to RevenueCat.
8. Add an App Store Connect API key if RevenueCat should import products/prices.
9. Configure App Store Server Notifications through RevenueCat.
10. Test with Sandbox and TestFlight.

RevenueCat states that its In-App Purchase Key is required for current React Native SDKs; without it, StoreKit 2 transactions may not be recorded: [App Store credentials](https://www.revenuecat.com/docs/store-configuration/app-store/service-credentials-index), [In-App Purchase Key](https://www.revenuecat.com/docs/service-credentials/itunesconnect-app-specific-shared-secret/in-app-purchase-key-configuration).

For Expo/CNG, verify the generated native target and remote Apple capability before the first store build. Expo explains that EAS synchronizes supported capabilities from the introspected app configuration and that unsupported/no-entitlement capabilities can require manual Apple/Xcode setup: [Expo iOS capabilities](https://docs.expo.dev/build-reference/ios-capabilities/). Do not edit app.json or native projects as part of implementation without the repository-required approval.

Apple requires the purchase screen to state the subscription name, duration, included service, prominent full renewal price, and trial conversion terms. It must provide restore/sign-in, Terms of Use, and Privacy Policy links: [Apple auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/).

## Google Play configuration

Before real Play purchases:

1. Create the app in Play Console with Lamplight's exact application ID.
2. Upload a signed AAB to an internal or closed testing track.
3. Create the subscription product and activate monthly/annual base plans.
4. Create a Google Cloud service account with the RevenueCat-required Play permissions.
5. Add the service account to the Play app and upload its JSON credential to RevenueCat.
6. Configure Google Real-Time Developer Notifications through RevenueCat.
7. Add license testers and testing-track testers.
8. Make each tester open the opt-in URL.
9. Install the Play-distributed test build on a device whose primary Play account is the licensed tester.

Google credentials may take up to 36 hours to validate. A signed build must exist in Play Console before real product tests: [Google service credentials](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials), [RevenueCat Play sandbox](https://www.revenuecat.com/docs/test-and-launch/sandbox/google-play-store).

Check the generated Android Activity launchMode. RevenueCat warns that singleTask can cancel a purchase when the user leaves for bank verification; standard or singleTop is required: [React Native installation](https://www.revenuecat.com/docs/getting-started/installation/reactnative).

Google requires transparent pricing, billing frequency, renewal terms, and a direct, easy-to-use way to manage/cancel a subscription from account settings: [Google Play subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533).

## Client architecture

Keep RevenueCat behind a small application-owned module. UI components must not import RevenueCat directly except the dedicated paywall/customer-center screen.

Suggested files:

~~~text
src/features/billing/constants.ts
src/features/billing/revenueCatClient.ts
src/features/billing/billingTypes.ts
src/features/billing/BillingProvider.tsx
src/features/billing/useBilling.ts
src/features/billing/__tests__/...
~~~

The public application interface should be narrow:

~~~ts
type BillingStatus =
  | { state: 'loading' }
  | { state: 'free'; lastCheckedAt: number | null }
  | {
      state: 'premium';
      expiresAt: string | null;
      willRenew: boolean;
      productId: string;
      managementURL: string | null;
    }
  | { state: 'error'; hasCachedPremium: boolean; message: string };

type BillingApi = {
  status: BillingStatus;
  refresh(): Promise<void>;
  getPackages(): Promise<ReadonlyArray<PremiumPackage>>;
  purchase(packageId: string): Promise<PurchaseOutcome>;
  restore(): Promise<RestoreOutcome>;
  openManagement(): Promise<void>;
};
~~~

Feature code asks a single selector such as hasPremiumAccess(status). It must not check product IDs, trial state, or local booleans itself.

### Initialization

Initialization belongs near the root Expo Router layout, after Supabase Auth has produced a user UUID:

~~~ts
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

let configured = false;

export async function configureBilling(appUserID: string): Promise<void> {
  if (configured) {
    const currentId = await Purchases.getAppUserID();
    if (currentId !== appUserID) {
      await Purchases.logIn(appUserID);
    }
    return;
  }

  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

  if (!apiKey) throw new Error('Missing RevenueCat public SDK key');

  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey, appUserID });
  configured = true;
}
~~~

Production code also needs:

- An explicit unsupported-platform branch.
- A build-profile choice for Test Store.
- Redacted production logging.
- One CustomerInfo listener registered by BillingProvider and removed on unmount.
- A call to getCustomerInfo on startup and app foreground.
- Unit tests using an adapter/mock rather than loading the native module in Jest.

Configure Purchases only once. RevenueCat notes that CustomerInfo changes are not remotely pushed into a running app; the listener fires after SDK operations/network refreshes. Refresh on foreground and after identity changes: [SDK configuration](https://www.revenuecat.com/docs/getting-started/configuring-sdk), [CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info).

### CustomerInfo mapping

The only access check is:

~~~ts
const premium = customerInfo.entitlements.active.premium;
const hasPremium = premium !== undefined;
~~~

Map these fields into BillingStatus:

- isActive/access through membership in active.
- expirationDate; null can mean lifetime.
- willRenew.
- productIdentifier.
- periodType.
- store.
- isSandbox.
- billingIssueDetectedAt.
- unsubscribeDetectedAt.
- managementURL from CustomerInfo.

Do not revoke access merely because willRenew is false: a canceled subscription remains active until expiration. Do not revoke during a store grace period: RevenueCat reports that entitlement as active. Account hold/expired states are inactive and should lose Premium access: [CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info), [Grace periods](https://www.revenuecat.com/docs/subscription-guidance/how-grace-periods-work).

Trusted Entitlements response verification is informational by default on current native SDKs. Log verification failures and deny server-metered Premium operations until a backend check succeeds. Avoid abruptly blocking already-downloaded local content only because the device is offline. RevenueCat documents the verification result and its limitations: [Trusted Entitlements](https://www.revenuecat.com/docs/customers/trusted-entitlements).

## Supabase identity contract

Lamplight already creates a Supabase anonymous Auth user. A Supabase anonymous user has a real UUID and runs as the authenticated database role; it is not the same thing as an unauthenticated anon-key request: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Use that UUID as RevenueCat appUserID from the first launch:

~~~text
RevenueCat App User ID = Supabase auth.users.id
~~~

Benefits:

- Non-guessable UUID.
- Stable through a guest-to-new-email upgrade when Supabase preserves the user.
- Same identifier in RevenueCat, webhook payloads, profiles, and support tools.
- Cross-device access after the same permanent account signs in.
- No email address or other PII in the billing identity.

RevenueCat recommends non-guessable IDs, rejects several placeholder IDs, and advises against email as App User ID: [Identifying Customers](https://www.revenuecat.com/docs/customers/identifying-customers).

### Identity transitions

Implement and test these transitions:

| Supabase transition | RevenueCat action |
|---|---|
| App launch restores the same session UUID | Configure once with that UUID |
| New anonymous Supabase session | Configure with its UUID |
| Anonymous account upgraded to a new email but UUID stays the same | No identity call; refresh CustomerInfo |
| User signs into an existing account with a different UUID | Purchases.logIn(target UUID), use returned CustomerInfo |
| User signs out and Lamplight immediately creates a new anonymous Supabase user | Purchases.logIn(new anonymous Supabase UUID) |
| Auth is temporarily unavailable | Do not create a RevenueCat anonymous identity; show cached/indeterminate billing state until Supabase identity resolves |

Do not use Purchases.logOut in the normal Lamplight flow. RevenueCat logOut creates a $RCAnonymousID. RevenueCat specifically recommends switching custom identities with logIn when an app uses only custom App User IDs: [Identifying Customers](https://www.revenuecat.com/docs/customers/identifying-customers).

Important limitation: moving from one custom App User ID to another does not merge the two RevenueCat customers. This matters when an anonymous Supabase user elects to sign into a different, existing Supabase account. After the switch:

1. Call logIn(target UUID).
2. If premium is absent, explain that purchases belong to the store account and offer a user-initiated Restore Purchases action.
3. With the recommended transfer behavior, restore can transfer the receipt to the target App User ID.
4. Never call syncPurchases silently for routine login; RevenueCat warns it can transfer or alias purchases.
5. Include this scenario in store sandbox testing.

### Account deletion

Deleting a Supabase account does not cancel an Apple/Google subscription. Before final deletion:

- Warn the user explicitly.
- Show Manage Subscription and Restore Purchase support information.
- Do not claim that deleting the account stops billing.
- Decide whether to retain a minimal billing audit row for legal/accounting needs; document retention in Privacy Policy.
- If a returning store customer restores into a new account, the configured restore behavior determines transfer.

## Purchase, restore, and management flows

### Fetching packages

~~~ts
const offerings = await Purchases.getOfferings();
const packages = offerings.current?.availablePackages ?? [];
~~~

If current or packages is empty, show a retryable configuration/network error. Do not invent prices or fall back to stale hardcoded product IDs. RevenueCat says empty packages normally indicate a store or dashboard configuration problem: [Displaying Products](https://www.revenuecat.com/docs/getting-started/displaying-products).

Use package.product.priceString, title, description, subscriptionPeriod, and introductory-price data from the SDK. Keep the annual total price more prominent than any monthly equivalent.

### Purchase

~~~ts
try {
  const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
  const unlocked = customerInfo.entitlements.active.premium !== undefined;
  if (!unlocked) {
    return { type: 'completed_without_entitlement' };
  }
  return { type: 'purchased' };
} catch (error) {
  if (isRevenueCatCancellation(error)) return { type: 'cancelled' };
  return { type: 'failed', message: toSafeBillingMessage(error) };
}
~~~

Rules:

- Disable the purchase CTA while a purchase is in flight.
- Treat user cancellation as a neutral result, not an error toast.
- Unlock only from returned CustomerInfo, never merely because the store sheet closed.
- Refresh the existing entitlement store immediately after purchase.
- Track paywall view, package selected, purchase started, cancellation, failure category, and entitlement granted. Never log receipts, keys, full CustomerInfo, or payment data.
- RevenueCat automatically finishes/acknowledges transactions in the normal integration: [Making Purchases](https://www.revenuecat.com/docs/getting-started/making-purchases).

RevenueCat Paywalls can be presented with RevenueCatUI.presentPaywall or presentPaywallIfNeeded. If a custom Lamplight paywall is retained, use RevenueCat Packages and purchasePackage underneath it. RevenueCat Paywalls reduce remote-pricing and disclosure mistakes; a custom paywall gives tighter visual control. Whichever is chosen, match the existing Lamplight design and validate all disclosures: [Displaying Paywalls](https://www.revenuecat.com/docs/tools/paywalls/displaying-paywalls).

### Restore

Restore must be attached to a visible button in both the paywall and Settings:

~~~ts
const customerInfo = await Purchases.restorePurchases();
const restored = customerInfo.entitlements.active.premium !== undefined;
~~~

Return distinct copy for restored, nothing found, cancelled/credential prompt, offline, and failure. Do not automatically call restorePurchases; it can show an operating-system sign-in prompt. RevenueCat recommends a user-triggered restore action and reserves syncPurchases for controlled migration scenarios: [Restoring Purchases](https://www.revenuecat.com/docs/getting-started/restoring-purchases).

### Manage subscription

For a minimal implementation, open CustomerInfo.managementURL when available. It directs the user to the correct store management page. Add a fallback help screen when null: [CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info).

If the RevenueCat plan includes it, Customer Center provides restore, cancel, support, iOS refunds/plan changes, and retention prompts. It is a Pro/Enterprise feature and should be evaluated against its ongoing cost before becoming required: [Customer Center](https://www.revenuecat.com/docs/tools/customer-center).

## RevenueCat-to-Supabase synchronization

### Why both client and server state exist

Use the RevenueCat SDK CustomerInfo for immediate device UI. Use the Supabase mirror for:

- Authorizing Premium Edge Functions and expensive AI endpoints.
- Applying server-side quotas.
- Support/admin inspection.
- Cross-device reporting.
- Subscription lifecycle messaging.
- Recovery when a webhook is delayed.

Never trust a client-written premium boolean. Customer attributes are also client-writable and RevenueCat explicitly says they are not secure entitlement storage: [Customer Attributes](https://www.revenuecat.com/docs/customers/customer-attributes).

### Proposed schema

Use migrations and adapt names to the existing entitlement schema rather than creating duplicate sources of truth.

~~~sql
create table if not exists public.revenuecat_webhook_events (
  event_id text primary key,
  event_type text not null,
  environment text not null,
  app_user_id text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null,
  processing_error text
);

create table if not exists public.billing_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_id text not null,
  is_active boolean not null default false,
  product_id text,
  store text,
  environment text,
  period_type text,
  will_renew boolean,
  purchased_at timestamptz,
  expires_at timestamptz,
  unsubscribe_detected_at timestamptz,
  billing_issue_detected_at timestamptz,
  revenuecat_updated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  primary key (user_id, entitlement_id)
);

alter table public.revenuecat_webhook_events enable row level security;
alter table public.billing_entitlements enable row level security;

-- No client policies for webhook events.
-- Authenticated users may read only their own normalized entitlement row.
create policy "users read own billing entitlement"
on public.billing_entitlements
for select
to authenticated
using ((select auth.uid()) = user_id);
~~~

Revoke insert/update/delete on both tables from app-facing roles. Only the server/Edge Function secret client may mutate them. Supabase says secret/service-role keys bypass RLS and must never ship in a client: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Securing data](https://supabase.com/docs/guides/database/secure-data).

If account deletion must not erase required transaction audit, separate non-PII financial audit data from the user-scoped entitlement row and define a documented retention period. Do not retain raw webhook bodies indefinitely by default; they can contain subscriber attributes.

### Webhook Edge Function

Create a dedicated function such as supabase/functions/revenuecat-webhook/index.ts.

Configuration:

~~~toml
[functions.revenuecat-webhook]
verify_jwt = false
~~~

External webhooks do not carry a Supabase user JWT, so the gateway JWT check must be disabled for this function. The function itself must authenticate RevenueCat. Supabase documents this exact pattern for external webhooks: [Function configuration](https://supabase.com/docs/guides/functions/function-configuration), [Authorization headers](https://supabase.com/docs/guides/functions/auth-headers).

Store these only as Supabase Edge Function secrets:

~~~text
REVENUECAT_WEBHOOK_HMAC_SECRET
REVENUECAT_WEBHOOK_AUTH_TOKEN
REVENUECAT_SECRET_API_KEY
REVENUECAT_PROJECT_ID
~~~

Implementation algorithm:

1. Accept POST only.
2. Read the raw request body as text/bytes before JSON parsing.
3. Verify X-RevenueCat-Webhook-Signature:
   - Parse t and v1.
   - Compute HMAC-SHA256 over t + "." + raw body.
   - Compare in constant time.
   - Reject timestamps outside a small replay window such as five minutes.
4. Also validate the configured authorization header if enabled.
5. Parse JSON only after verification.
6. Validate api_version, event.id, event.type, environment, app_id, and identity fields.
7. Reject events for unknown RevenueCat app IDs.
8. Insert event.id into revenuecat_webhook_events. On unique conflict, return 200 only when processed_at is already set; otherwise retry the unfinished processing.
9. Refresh canonical subscriber state through RevenueCat's GET /subscribers REST endpoint using the server-only secret key.
10. Normalize premium into billing_entitlements with an upsert.
11. Set processed_at and return 200 promptly. On processing failure, store a bounded/sanitized processing_error and return a retryable non-2xx response.
12. Add a scheduled reconciliation job for recorded rows whose processed_at is still null, because RevenueCat stops automatic delivery after its retry limit.

RevenueCat retries failed webhooks up to five times, recommends fast acknowledgement, can deliver duplicates, and recommends calling GET /subscribers after every event rather than building a fragile event-state machine: [Webhooks](https://www.revenuecat.com/docs/integrations/webhooks).

HMAC must use the exact raw body; parsing and re-serializing changes the signed bytes. RevenueCat retries reuse event.id, making it the idempotency key. Webhooks are currently a RevenueCat Pro integration, so confirm plan cost before treating the Supabase mirror as launch-critical.

### Identity handling in the webhook

RevenueCat webhook identity fields can include app_user_id, original_app_user_id, and aliases. Search all of them when resolving a known user. Transfer events also contain transferred_from and transferred_to. RevenueCat explicitly advises searching original_app_user_id and aliases: [Event fields](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields).

Safe rules:

- Accept only valid UUID identifiers that exist in the expected Supabase project.
- Ignore/record RevenueCat-generated $RCAnonymousID values instead of trying to cast them to UUID.
- For a TRANSFER event, refresh every valid UUID in transferred_from and transferred_to.
- Separate SANDBOX and PRODUCTION state. Sandbox events must never grant production Premium.
- A webhook is a signal to refresh canonical state, not sufficient proof by itself.
- Make event processing monotonic using RevenueCat timestamps so a delayed event cannot overwrite a newer snapshot.

### Backend authorization

Every Premium Edge Function should use a shared helper:

~~~ts
async function requirePremium(userId: string): Promise<void> {
  const entitlement = await loadBillingEntitlement(userId, 'premium');
  if (!entitlement?.is_active) throw new PremiumRequiredError();
  if (entitlement.environment !== 'PRODUCTION' && isProductionRuntime()) {
    throw new PremiumRequiredError();
  }
}
~~~

For highly valuable or destructive operations, if the mirror is stale or ambiguous, refresh from RevenueCat server-side before denying/granting. Do not accept a client CustomerInfo payload as server authorization.

## Feature gating contract

Create one declarative feature policy rather than scattered checks:

~~~ts
type PremiumFeature =
  | 'unlimited_translation'
  | 'unlimited_vocabulary'
  | 'advanced_quizzes'
  | 'multi_device_sync'
  | 'reading_insights'
  | 'premium_ambience'
  | 'premium_quote_cards';

function canUsePremiumFeature(
  feature: PremiumFeature,
  entitlement: BillingStatus,
  usage: UsageSnapshot
): FeatureDecision;
~~~

Each decision returns allowed, free-limit-remaining, paywall reason, and whether server verification is required. The existing entitlement/promo-code infrastructure should become an input or compatibility adapter, not a second independent premium truth. Define precedence explicitly:

1. Active RevenueCat premium.
2. Valid server-issued promotional entitlement.
3. Temporary grace/offline policy already supported by Lamplight.
4. Free limits.

Never gate core reading, imported EPUB access, already-downloaded free books, essential accessibility, basic highlighting, account deletion, restore, or subscription management.

## Test strategy

### Automated unit tests

Mock the billing adapter and cover:

- Loading → free and loading → premium.
- Canceled-but-not-expired remains premium.
- Grace period remains premium.
- Expired/account-hold becomes free.
- Listener updates state.
- User-cancelled purchase emits no error.
- Successful store result without premium entitlement is treated as failure/needs refresh.
- Empty offering/package list.
- Offline cached status.
- UUID identity switch and same-UUID account upgrade.
- No feature imports RevenueCat directly outside the billing module.

### Supabase tests

- Valid HMAC accepted.
- Invalid signature and stale timestamp rejected.
- Duplicate event.id acknowledged without duplicate work.
- Sandbox event cannot activate production state.
- Unknown app_id rejected.
- Invalid/non-UUID App User ID recorded safely.
- Out-of-order event does not overwrite newer state.
- Transfer refreshes source and destination.
- RLS lets a user read only their own entitlement.
- Client cannot mutate entitlement rows.
- Secret values never appear in response/log output.

### RevenueCat Test Store

Use Test Store to build UI/state handling before store setup. Exercise purchase, renewal, cancellation, expiration, restore, billing issue, identity switch, and webhook test events. Test Store uses a distinct API key; never submit it to a store: [Configuring Products](https://www.revenuecat.com/docs/projects/configuring-products), [Launch checklist](https://www.revenuecat.com/docs/test-and-launch/launch-checklist).

### Apple sandbox/TestFlight

Test on a physical device:

- Fresh purchase for monthly and annual.
- Trial eligibility and conversion if offered.
- Cancel while access remains active.
- Expiration.
- Billing retry/grace period.
- Restore after reinstall.
- Restore after switching to an existing Supabase account.
- Purchase on one device and sign in on another.
- Refund/revocation.
- Paywall localization, price, legal links, and accessibility.
- App-review account/instructions can reach every subscription benefit.

New Apple products work in Sandbox/TestFlight once Ready to Submit, but must be submitted/approved for production: [Apple sandbox](https://www.revenuecat.com/docs/test-and-launch/sandbox/apple-app-store), [App Store rejection guidance](https://www.revenuecat.com/docs/test-and-launch/app-store-rejections).

### Google Play testing

Test with a Play-distributed build and licensed tester:

- Monthly/annual purchase.
- Accelerated renewals and expiration.
- Grace period and account hold.
- Pending purchase where supported.
- Cancellation and resubscribe.
- Upgrade/downgrade if later added.
- Restore after reinstall/account switch.
- Bank-app interruption/background return.
- Refund/revocation.

The app/products must be published to a test or production track for license testing. New personal Play developer accounts may also require a closed test with at least 12 opted-in testers for 14 continuous days before production access: [Google billing testing](https://support.google.com/googleplay/android-developer/answer/6062777), [New-account testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).

## Release checklist

- [ ] Dependency/native-change approval obtained.
- [ ] docs/deployment.md read before EAS work.
- [ ] Correct iOS bundle ID and Android application ID confirmed.
- [ ] RevenueCat Apple/Google apps and credentials validated.
- [ ] Store products active and mapped to premium.
- [ ] Current Offering contains monthly and annual packages.
- [ ] Production profiles use platform SDK keys, never Test Store key.
- [ ] Debug logging disabled or reduced in production.
- [ ] Purchase, cancel, restore, expiry, refund, grace, and account-switch tests pass.
- [ ] Webhook HMAC/auth/idempotency tests pass.
- [ ] Apple App Store Server Notifications and Google RTDN are connected.
- [ ] Paid agreements, tax, and banking are complete.
- [ ] Paywall shows localized full price, duration, renewal, trial terms, Terms, and Privacy.
- [ ] Settings contains Restore Purchases and Manage Subscription.
- [ ] Account deletion warns that store billing is not automatically canceled.
- [ ] Privacy/Data Safety disclosures include RevenueCat and purchase analytics.
- [ ] App review notes and reviewer access are prepared.
- [ ] Rollout is staged and billing dashboards/alerts are monitored.

## Common failure modes

| Failure | Prevention |
|---|---|
| NativeEventEmitter/null native module after install | Rebuild the development client; hot reload is insufficient |
| Purchases tested only in Expo Go | Use a development build and store-distributed sandbox builds |
| Same API key on both platforms | Select the RevenueCat public SDK key by platform |
| Test Store key ships to production | Separate build profiles and add a release assertion |
| Products/offerings are empty | Verify store agreements, product state, identifiers, credentials, current Offering, and tester track |
| Hardcoded prices become wrong or non-localized | Render package.product price strings |
| Premium unlocks from successful modal close | Check returned CustomerInfo active premium entitlement |
| Cancellation revokes access too early | Use isActive, not willRenew |
| Existing account login loses a guest purchase | Offer user-triggered restore and test configured transfer behavior |
| Calling RevenueCat logOut creates stray identities | Switch custom Supabase UUIDs with logIn |
| Webhook duplicates corrupt state | Unique event.id plus canonical subscriber refresh |
| Forged webhook grants access | Verify raw-body HMAC, auth token, app_id, environment, and user UUID |
| Secret key exposed in app | Client receives only public SDK keys; REST/HMAC/store credentials stay server-side |
| Sandbox grants production access | Persist and enforce environment |
| Account deletion is mistaken for cancellation | Show manage-subscription warning before deletion |
| Android purchase cancels after bank verification | Confirm Activity launchMode is standard or singleTop |
| Store review cannot fetch first products | Submit products with the app and ensure all metadata is Ready to Submit |

## Implementation order

1. Product decisions: approve monthly/annual pricing, Premium benefits, free limits, trial, and restore-transfer policy.
2. Dashboard setup: RevenueCat project, Test Store product, entitlement, offering, and paywall.
3. Client foundation: dependencies, development build, billing adapter/provider, CustomerInfo mapping, identity switching.
4. Paywall flows: offerings, purchase, restore, management, legal disclosure, analytics.
5. Gate one low-risk feature end to end and verify offline behavior.
6. Supabase migration and signed/idempotent webhook.
7. Move Premium server features and quotas to backend authorization.
8. Apple and Google product/credential/server-notification configuration.
9. Real-store sandbox test matrix.
10. Staged store release and dashboard monitoring.

Do not enable the production paywall until every item in the release checklist passes and every advertised Premium capability is implemented.

## Primary-source index

- RevenueCat Expo installation: https://www.revenuecat.com/docs/getting-started/installation/expo
- Expo in-app purchases: https://docs.expo.dev/guides/in-app-purchases/
- RevenueCat SDK configuration: https://www.revenuecat.com/docs/getting-started/configuring-sdk
- Products, entitlements, offerings: https://www.revenuecat.com/docs/projects/configuring-products
- Displaying products: https://www.revenuecat.com/docs/getting-started/displaying-products
- Making purchases: https://www.revenuecat.com/docs/getting-started/making-purchases
- Restoring purchases: https://www.revenuecat.com/docs/getting-started/restoring-purchases
- Customer identity: https://www.revenuecat.com/docs/customers/identifying-customers
- CustomerInfo: https://www.revenuecat.com/docs/customers/customer-info
- Webhooks: https://www.revenuecat.com/docs/integrations/webhooks
- Webhook event fields: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
- Apple credentials: https://www.revenuecat.com/docs/store-configuration/app-store/service-credentials-index
- Google credentials: https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials
- RevenueCat launch checklist: https://www.revenuecat.com/docs/test-and-launch/launch-checklist
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase function authentication: https://supabase.com/docs/guides/functions/auth-headers
- Supabase secrets: https://supabase.com/docs/guides/functions/secrets
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Apple subscription requirements: https://developer.apple.com/app-store/subscriptions/
- Google Play subscription policy: https://support.google.com/googleplay/android-developer/answer/9900533
