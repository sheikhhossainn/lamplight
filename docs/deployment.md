# Deployment — Preview builds & OTA (`eas update`)

Android only for now. Beta ships as an internal-distribution APK on the `preview` channel.
iOS is deferred (needs the $99/yr Apple Developer Program for ad-hoc/TestFlight) — don't build
or publish iOS updates.

## OTA vs. rebuild

**OTA is enough for any JS/TS change.** Rebuild (`eas build`) only for:

- a new native dependency
- a native config change (`app.json`, `eas.json`, `ios/`, `android/`)
- a `runtimeVersion` bump

Nothing else. Don't rebuild "to be safe" — it's 15+ min and it isn't the fix.

## Publishing

Publish one platform at a time:

```
eas update --branch preview --platform android --message "<what changed>"
```

Never omit `--platform`. It defaults to `all`, which bundles web, which dies on an
`expo-sqlite`/`wa-sqlite.wasm` resolve error — the app doesn't target web, so this is pure noise.

`Asset processing timed out` on upload is transient: retry, don't debug it.

## Update never reaches the device — check channel→branch link FIRST

```
eas channel:view preview     # "No branches are pointed to this channel" = silent total failure
eas channel:edit preview --branch preview
```

A channel with no branch pointed at it accepts every `eas update` happily and serves none of
them. Nothing in the CLI output, the build, or the app hints at this. It cost hours once.
`production` has never been linked — verify before the first production OTA.

Only after that link is confirmed, consider apply-timing: a downloaded update runs on the
*next* launch, so a real relaunch is close → reopen → close → reopen. Don't lead with this
diagnosis — "relaunch again" is the advice that hides a broken channel link.

## On-device update state

Settings → About shows the live `Updates.useUpdates()` state (up to date / checking /
downloading % / ready / failed) — read it on-device instead of guessing whether an update
landed. There is no top banner: `AppUpdatePrompt` (root `_layout.tsx`) renders only the
ready-to-restart confirmation, and suppresses even that inside the reader.

## runtimeVersion — do not bump `version` casually

`runtimeVersion.policy` is `appVersion`, so bumping `version` in `app.json` **orphans every
installed APK** from all future updates until testers reinstall.
