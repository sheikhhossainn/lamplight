# Lamplight — Reading App

React Native + Expo SDK 54, Expo Router (`src/app/`), TypeScript, expo-sqlite, Supabase.

## Role & communication

Senior React Native (Expo) engineer. Match the design exactly — never redesign unless asked.
Think silently. Concise output: don't restate the diff, don't explain obvious code, no summary
unless asked. Ask questions only when genuinely blocked; otherwise implement.

## Engineering rules

- Smallest possible diff. Never refactor or "clean up" code unrelated to the task.
- Reuse an existing component before writing a new one.
- No new dependency, and no native config change (`app.json`, `ios/`, `android/`), without
  asking first.
- Don't chase performance unless asked — it competes with "smallest diff."
- Don't guess a spec or interaction not covered by tokens/graphify/code — ask.

## Context loading — graphify, scoped

Use `graphify query` (or `path`/`explain`) when: architecture is unknown, the implementation
location is unknown, dependencies need tracing, or the code is unfamiliar.

Skip graphify when the file path is already known: styling tweaks, copy changes, localized bug
fixes, small edits in already-open files — just read the file.

When using it:

- **Staleness check**: if `graphify-out/GRAPH_REPORT.md` is older than the latest commit
  touching the area, run `/graphify --update` first. A stale graph is worse than no graph.
- Stay inside the smallest relevant community; read only the files graphify identifies as
  necessary for the requested task; stop reading once you have enough to implement.
- Never cold-scan the repo (no blind `grep`/`ls`/directory walks) unless explicitly asked.

## Context budget

Prefer the smallest possible context. Use file paths already provided before reaching for
graphify. Read only the minimum required files — never "for context." Load a doc from the
table below only when the task actually touches its area.

## Implementation workflow

Understand request → graphify only if needed → read minimum files → implement (smallest diff)
→ `npx tsc --noEmit` → for a visual/interactive change, ask the user what they see on-device
→ STOP. No unrelated improvements, no extra file inspection, no unrequested proposals.

## Hard constraints

- **expo-sqlite (Android)**: every DB call goes through the serializing queue in
  `db/client.ts`. Never bypass it, never call the raw db handle.
- **SDK pin**: Expo Go on-device must match SDK 54 exactly (fix procedure:
  `docs/debugging.md`).
- **OTA covers any JS/TS change** — never run `eas build`, `eas update`, or bump `version` in
  `app.json` without reading `docs/deployment.md` first.

## Design system

Source of truth, in order: `src/theme/tokens.ts`, `typography.ts`, `ThemeProvider.tsx`
(`useTheme()`, Day/Lamp). Never hardcode a value that exists as a token. Two locked constants:

- Brand (never altered): Primary Dark `#1C1B1E`, Flame Amber `#F5A623`, Parchment `#F5EDE1`.
- Reading body floor: Lora, never below 17px, line-height never below 1.85.

Everything else: `docs/design.md`.

## Docs — read on demand, don't preload

| File | When |
|---|---|
| `docs/architecture.md` | Project layout, feature boundaries, conventions |
| `docs/design.md` | Design detail beyond the constants above |
| `docs/deployment.md` | Any EAS build/update/release work |
| `docs/debugging.md` | Known pitfalls (Router, SQLite, SDK, fetch scripts), debug workflow |
| `docs/scriptures.md` | Scripture verticals (Quran/Bible/Vedas): sources, recipe |
| `docs/context-verses.md` | Mood→verse semantic search, embeddings, Edge Function |
| `ROADMAP.md` | Product phasing, free-tier caps, schema-to-feature map |
