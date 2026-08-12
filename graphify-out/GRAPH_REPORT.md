# Graph Report - CNTR  (2026-08-12)

## Corpus Check
- 47 files · ~46,924 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 328 nodes · 452 edges · 38 communities (28 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d276d37f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- render
- package.json
- What You Must Do When Invoked
- compilerOptions
- AppDelegate
- What You Must Do When Invoked
- storage.ts
- main.ts
- graphify reference: extra exports and benchmark
- graphify reference: extra exports and benchmark
- org.junit.Test
- graphify reference: query, path, explain
- graphify reference: query, path, explain
- gradlew
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- MainActivity.java
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- .claude/skills/graphify/references/extraction-spec.md
- .codex/skills/graphify/references/extraction-spec.md

## God Nodes (most connected - your core abstractions)
1. `render()` - 17 edges
2. `openProductEditor()` - 15 edges
3. `compilerOptions` - 15 edges
4. `What You Must Do When Invoked` - 12 edges
5. `What You Must Do When Invoked` - 12 edges
6. `/graphify` - 11 edges
7. `AppDelegate` - 10 edges
8. `/graphify` - 10 edges
9. `updateColorInputs()` - 9 edges
10. `fmt()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `render()` --calls--> `totals()`  [EXTRACTED]
  src/main.ts → src/data.ts
- `openProductEditor()` --calls--> `ensureProductHistory()`  [EXTRACTED]
  src/main.ts → src/data.ts
- `addEventCost()` --calls--> `generateUUID()`  [EXTRACTED]
  src/main.ts → src/data.ts
- `saveCurrentReport()` --calls--> `generateUUID()`  [EXTRACTED]
  src/main.ts → src/data.ts
- `buildReportMarkup()` --calls--> `fmt()`  [EXTRACTED]
  src/main.ts → src/formatters.ts

## Import Cycles
- None detected.

## Communities (38 total, 10 thin omitted)

### Community 0 - "render"
Cohesion: 0.15
Nodes (27): fmt(), addEventCost(), buildEventMarkup(), buildHistoryMarkup(), closeColorPicker(), deleteSavedReport(), loadSavedReports(), makeTiles() (+19 more)

### Community 1 - "package.json"
Cohesion: 0.08
Nodes (25): @capacitor/android, @capacitor/cli, @capacitor/core, @capacitor/ios, dependencies, @capacitor/android, @capacitor/cli, @capacitor/core (+17 more)

### Community 2 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 3 - "compilerOptions"
Cohesion: 0.10
Nodes (20): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, isolatedModules, lib (+12 more)

### Community 4 - "AppDelegate"
Cohesion: 0.13
Nodes (13): Any, Bool, Capacitor, AppDelegate, NSUserActivity, UIApplication, UIApplicationDelegate, UIKit (+5 more)

### Community 5 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 6 - "storage.ts"
Cohesion: 0.09
Nodes (29): loadEventCosts(), loadProductHistory(), loadProducts(), loadSales(), saveImportedEventReport(), saveProductHistory(), saveProducts(), syncProductState() (+21 more)

### Community 7 - "main.ts"
Cohesion: 0.07
Nodes (44): buildEmptyEventCost(), defaultProducts, ensureProductHistory(), generateUUID(), totals(), chooseUniqueColor(), fmtCompact(), getContrastColor() (+36 more)

### Community 8 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 9 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 10 - "org.junit.Test"
Cohesion: 0.36
Nodes (4): ExampleInstrumentedTest, ExampleUnitTest, org.junit.runner.RunWith, org.junit.Test

### Community 11 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 12 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 13 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 14 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 15 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 16 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 17 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 18 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 19 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **138 isolated node(s):** `UIKit`, `Capacitor`, `name`, `private`, `version` (+133 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `UIKit`, `Capacitor`, `name` to the rest of the system?**
  _138 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `What You Must Do When Invoked` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `AppDelegate` be split into smaller, more focused modules?**
  _Cohesion score 0.12631578947368421 - nodes in this community are weakly interconnected._
- **Should `What You Must Do When Invoked` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `storage.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08735632183908046 - nodes in this community are weakly interconnected._