---
type: "explain"
date: "2026-07-10T06:49:40.200769+00:00"
question: "Why does Codebase map connect Vocabulary+Translation, Splash+Onboarding, Book Sync+Reader, Library Shelf, Highlight Picker, and Reader Drag Selection all together?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["claude_codebase_map"]
---

# Q: Why does Codebase map connect Vocabulary+Translation, Splash+Onboarding, Book Sync+Reader, Library Shelf, Highlight Picker, and Reader Drag Selection all together?

## Answer

CLAUDE.md's Codebase map section lists one representative file per feature area (reader engine, translation, highlighting, shared components, DB layer) as explicit EXTRACTED references edges -- 13 total. Clustering groups each referenced file with its own feature community, but the map itself sits across all of them, giving it the highest betweenness centrality (0.157) in the graph. Also found an INFERRED conceptually_related_to edge to ROADMAP.md's Schema-to-feature map -- same index-everything pattern, once for code, once for the DB schema.

## Outcome

- Signal: useful

## Source Nodes

- claude_codebase_map