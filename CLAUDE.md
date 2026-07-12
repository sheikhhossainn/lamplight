# Lamplight — Reading App

React Native + Expo SDK 54, Expo Router (`src/app/`), TypeScript. Deep gotchas, institutional
memory, and architecture rationale not covered below live in `context.md` — read it only if
graphify + source don't answer the question.

## Role

Senior React Native (Expo) engineer. Match the design exactly — never redesign unless asked.
Concise output: don't restate the diff, don't explain obvious code, no summary unless asked.

## Context loading strategy — graphify first, always

Never cold-scan the repo (no blind `grep`/`ls`/directory walk as a first move). Order:

1. `graphify query "<question>"` (or `path`/`explain`) — this is how you discover architecture,
   dependencies, and features. The graph is the map; don't rebuild it by reading files.
2. **Staleness check**: if `graphify-out/GRAPH_REPORT.md`'s date is older than the most recent
   commit touching the area you're working in, the graph may describe deleted/renamed code — run
   `/graphify --update` before trusting it for that area. A stale graph is worse than no graph.
3. From the query result, identify the **smallest relevant community**. Stay inside it — never
   follow edges into an unrelated community "just in case," never walk the whole graph.
4. Read only the files graphify actually named for this task. Expand to one more file only if
   the community's result is genuinely insufficient.
5. Stop reading the moment you have enough to implement. Reading source is the *last* step,
   after graphify, not the first.

**God-node files** — `useTheme()`, `getDb()`, `ReaderScreen()`, `useTargetLanguage()` — fan out
into nearly every community. Query graphify for the specific edge/behavior you need from them;
don't open the file itself unless the change is actually inside it.

## Design system — pointer, not documentation

Source of truth, in order: `src/theme/tokens.ts` (colors/spacing/radius/motion), `typography.ts`
(named type styles), `ThemeProvider.tsx` (`useTheme()`, Day/Lamp). Never hardcode a hex/px/
fontFamily that already exists as a token — extend the token file if a value is genuinely
missing, don't ad-hoc it in the screen. For anything else about color/spacing/type/motion:
query graphify or read tokens.ts — don't ask, don't guess, and don't duplicate it here.

Two constants locked enough to state directly (cheap guardrail — wrong values here are a visible
regression, not just a missing lookup):
- Brand (fixed, never altered): Primary Dark `#1C1B1E`, Flame Amber `#F5A623` (the one recurring
  accent), Parchment `#F5EDE1`.
- Reading body floor: Lora, never below 17px, never tighten line-height below 1.85.

## Engineering rules

- Smallest possible diff. Never refactor or "clean up" code unrelated to the task.
- Reuse an existing component before writing a new one.
- No new dependency, and no native config change (`app.json`, `ios/`, `android/`), without
  asking first.
- Don't chase performance unless asked — it competes with "smallest diff."
- Ask instead of guessing when a spec or interaction isn't covered by tokens/graphify/code.

## React Native / Expo — hard-won, not generic advice

- **SDK pin**: phone's Expo Go must match SDK 54 exactly. On `Incompatible SDK version`: update
  Expo Go, or re-pin `expo` in `package.json` then `npx expo install --fix` — never hand-edit
  other RN/Expo versions.
- **Expo Router**: adding/moving/deleting a route file doesn't reliably hot-reload —
  `npx expo start -c` + force-reopen Expo Go. Always `router.push({ pathname, params })` object
  form; typed routes reject template-string paths.
- **expo-sqlite (Android)**: concurrent statements corrupt native state — every DB call goes
  through the serializing queue in `db/client.ts`. Never bypass it, never call the raw db handle.

## Preview builds & OTA (`eas update`) — Android only for now

Beta ships as an internal-distribution APK on the `preview` channel. iOS is deferred (needs the
$99/yr Apple Developer Program for ad-hoc/TestFlight) — don't build or publish iOS updates.

**OTA is enough for any JS/TS change.** Rebuild (`eas build`) only for: a new native dependency,
a native config change (`app.json`, `eas.json`, `ios/`, `android/`), or a `runtimeVersion` bump.
Nothing else. Don't rebuild "to be safe" — it's 15+ min and it isn't the fix.

**Publish one platform at a time:**
```
eas update --branch preview --platform android --message "<what changed>"
```
Never omit `--platform`. It defaults to `all`, which bundles web, which dies on an
`expo-sqlite`/`wa-sqlite.wasm` resolve error — the app doesn't target web, so this is pure noise.
`Asset processing timed out` on upload is transient: retry, don't debug it.

**If an update never reaches the device, check the channel→branch link FIRST:**
```
eas channel:view preview     # "No branches are pointed to this channel" = silent total failure
eas channel:edit preview --branch preview
```
A channel with no branch pointed at it accepts every `eas update` happily and serves none of them.
Nothing in the CLI output, the build, or the app hints at this. It cost hours once. `production`
has never been linked — verify before the first production OTA.

Only after that link is confirmed, consider apply-timing: a downloaded update runs on the *next*
launch, so a real relaunch is close → reopen → close → reopen. Don't lead with this diagnosis —
"relaunch again" is the advice that hides a broken channel link.

Settings → About shows the live `Updates.useUpdates()` state (up to date / checking / downloading %
/ ready / failed) — read it on-device instead of guessing whether an update landed. There is no
top banner: `AppUpdatePrompt` (root `_layout.tsx`) renders only the ready-to-restart confirmation,
and suppresses even that inside the reader.

`runtimeVersion.policy` is `appVersion`, so bumping `version` in `app.json` **orphans every
installed APK** from all future updates until testers reinstall. Don't bump it casually.

## Implementation workflow

Understand request → `graphify query` → smallest relevant community → read only files named
there → implement (smallest diff) → `npx tsc --noEmit` → for a visual/interactive change, ask
the user what they see on-device, don't assume it worked → stop. Never continue "improving"
code outside the task's community.

## Debug workflow

Identify the entry point (the screen/function named in the report or query result) → graphify
`query`/`path` from there → inspect only directly connected files → stop at root cause. No
broad repository search.
