# Debugging — known pitfalls & workflow

## Debug workflow

Identify the entry point (the screen/function named in the report or query result) → graphify
`query`/`path` from there → inspect only directly connected files → stop at root cause. No
broad repository search.

## Expo SDK pin

Phone's Expo Go must match SDK 54 exactly. On `Incompatible SDK version`: update Expo Go, or
re-pin `expo` in `package.json` then `npx expo install --fix` — never hand-edit other RN/Expo
versions.

## Expo Router quirks

- Adding/moving/deleting a route file doesn't reliably hot-reload — `npx expo start -c` +
  force-reopen Expo Go.
- Always `router.push({ pathname, params })` object form; typed routes reject template-string
  paths.

## expo-sqlite (Android)

Why the CLAUDE.md serializing-queue rule exists: concurrent statements corrupt expo-sqlite's
native state on Android. Symptom of a bypass: intermittent crashes/corruption, not a clean
error. Route everything through `db/client.ts`.

## Fetch scripts — no port, don't kill the wrong Node process

`scripts/fetch-*.mjs` (Quran/Bible/Vedas) are one-off outbound HTTP clients, **not servers** —
no port listening, nothing in a port scan. They run for minutes (bible-api.com's 15 req/30s
rate limit dominates). Everything is `node.exe`, so match on command line before killing:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'fetch-bible|fetch-quran|fetch-vedas' } |
  Select-Object ProcessId, CommandLine
```

They checkpoint to disk after every book, so killing one mid-run is wasteful, not destructive.
Prefer letting it finish.

## OTA update "not arriving"

See [deployment.md](deployment.md) — check the channel→branch link before anything else.
