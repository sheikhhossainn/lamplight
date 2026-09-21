# Lamplight — Reading App

React Native + Expo SDK 57, Expo Router (`src/app/`), TypeScript, expo-sqlite, Supabase.

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

Use `graphify query` (or `path`/`explain`) when: a topic/feature is missing or not properly
documented in `docs/`, architecture is unknown, implementation location is unknown, dependencies
need tracing, or the code is unfamiliar.

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

- **Dynamic Git author & push identity**:
  - All commits and pushes must inherit and respect the active developer's environment (`git config user.name` and `git config user.email`, falling back to global git config). Never hardcode, alter, or override the author, committer, or push identity to a specific account (e.g. never force `sheikhhossainn` or any other account).
  - Never execute commands that set local git credentials or user identities (`git config user.name ...`, `git config user.email ...`) to force a specific collaborator's name. Adapt dynamically to whoever is actively working in the repository.
  - When pushing (only upon direct user command), never specify or inject a hardcoded GitHub username, email, token, or custom credentials into the push command or remote URL (e.g. never push via `https://<username>@github.com/...`). Rely entirely on the active developer's native Git Credential Manager, SSH keys, or GitHub CLI (`gh auth`) session.
- **NEVER push without explicit user permission**: NEVER execute `git push` without the user explicitly
  and directly commanding you to push. This rule is absolute and strictly enforced across ALL modes —
  including turbo mode, bypass mode, auto-pilot, or any mode that bypasses terminal confirmations. All
  work must remain strictly local until the user explicitly requests a push.
- **NEVER push directly to main or dev branch**: NEVER push directly to `main` or `dev` branches under any circumstances. Always work on and push to dedicated feature branches (`feature/*`), or perform local merges only upon direct user request.
- **NEVER delete protected branches**: NEVER delete the `main` or `dev` branch under any circumstances,
  locally or remotely.
- **expo-sqlite (Android)**: every DB call goes through the serializing queue in
  `db/client.ts`. Never bypass it, never call the raw db handle.
- **SDK pin**: Expo Go on-device must match SDK 57 exactly (fix procedure:
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
| `docs/APP_VISUAL_BLUEPRINT.md` | Complete visual blueprint, ASCII wireframes, and design context for AI |
| `ROADMAP.md` | Product phasing, free-tier caps, schema-to-feature map |

### Docs fallback to graphify

If a feature, mechanism, or component is not properly documented in `docs/`:
1. **Never guess** or run blind directory scans (`grep`/`find`).
2. Check `graphify-out/GRAPH_REPORT.md` under **Community Hubs** to find the owning community.
3. Run `graphify explain "<SymbolOrFile>"` or `graphify query "<feature keyword>"` to map dependencies and call flow.
4. Read only the specific target files identified in that minimal cluster, implement the smallest diff, and verify.
