---
type: "explain"
date: "2026-07-10T06:52:17.073722+00:00"
question: "Does Codebase map (CLAUDE.md) reference all its listed theme files (tokens.ts, typography.ts, ThemeProvider.tsx, ThemeTransitionOverlay.tsx)?"
contributor: "graphify"
outcome: "corrected"
correction: "claude_codebase_map has 17 EXTRACTED reference edges, not 13 -- includes all 4 src/theme/* files"
source_nodes: ["claude_codebase_map"]
---

# Q: Does Codebase map (CLAUDE.md) reference all its listed theme files (tokens.ts, typography.ts, ThemeProvider.tsx, ThemeTransitionOverlay.tsx)?

## Answer

No -- the merge step's node-ID collision (CLAUDE.md mention-nodes sharing IDs with real AST file nodes, e.g. src_theme_tokens) silently dropped 4 genuine EXTRACTED reference edges from claude_codebase_map to tokens.ts, typography.ts, ThemeProvider.tsx, and ThemeTransitionOverlay.tsx. Verified against actual CLAUDE.md content and restored all 4 edges directly in graph.json. Node degree went from 13 to 17.

## Outcome

- Signal: corrected
- Correction: claude_codebase_map has 17 EXTRACTED reference edges, not 13 -- includes all 4 src/theme/* files

## Source Nodes

- claude_codebase_map