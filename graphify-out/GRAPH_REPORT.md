# Graph Report - CNTR  (2026-10-26)

## Corpus Check
- 82 files · ~78,922 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 778 nodes · 1356 edges · 50 communities (43 shown, 7 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a09eb61e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ReportParts.tsx
- storage.ts
- dependencies
- main.ts
- formatters.ts
- compilerOptions
- .application
- What You Must Do When Invoked
- Bottom tab navigation
- CNTR HTML app shell
- Architecture
- Graphify-first token-efficient workflow
- gradlew
- MainActivity.java
- What You Must Do When Invoked
- graphify reference: extra exports and benchmark
- graphify reference: extra exports and benchmark
- graphify reference: query, path, explain
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- .claude/skills/graphify/references/extraction-spec.md
- .codex/skills/graphify/references/extraction-spec.md
- Running Custom Playwright Code
- Cookies
- Browser Automation with playwright-cli
- 3. Heal
- Browser Session Management
- Tracing
- 2026-10-26 (merged to `main`)
- HANDOFF
- Product
- backup.ts
- restoreBackup

## God Nodes (most connected - your core abstractions)
1. `render()` - 32 edges
2. `fmt()` - 19 edges
3. `wireDialogs()` - 18 edges
4. `compilerOptions` - 17 edges
5. `start()` - 16 edges
6. `loadSettings()` - 16 edges
7. `showToast()` - 16 edges
8. `Browser Automation with playwright-cli` - 16 edges
9. `HANDOFF` - 16 edges
10. `plural()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Graphify-first token-efficient workflow` --semantically_similar_to--> `AGENTS.md Graphify required workflow`  [INFERRED] [semantically similar]
  .claude/CLAUDE.md → AGENTS.md
- `AGENTS.md Graphify required workflow` --semantically_similar_to--> `CLAUDE.md graphify rules`  [INFERRED] [semantically similar]
  AGENTS.md → CLAUDE.md
- `CNTR-Debug-APK artifact` --references--> `Android launcher icon (blue cross logo)`  [INFERRED]
  .github/workflows/build-apk.yml → android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
- `Android launcher icon (blue cross logo)` --semantically_similar_to--> `iOS splash screen (centered blue cross logo)`  [INFERRED] [semantically similar]
  android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png → ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png
- `Capacitor sync android` --references--> `CNTR HTML app shell`  [INFERRED]
  .github/workflows/build-apk.yml → index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **APK build pipeline** — _github_workflows_build_apk_build_apk, _github_workflows_build_apk_capacitor_sync, _github_workflows_build_apk_gradle_assembledebug, _github_workflows_build_apk_cntr_debug_apk [EXTRACTED 1.00]
- **Graphify-first agent instructions** — _claude_claude_graphify_first_workflow, agents_graphify_required_workflow, claude_graphify_rules, claude_graphify_knowledge_graph [INFERRED 0.95]

## Communities (50 total, 7 thin omitted)

### Community 0 - "ReportParts.tsx"
Cohesion: 0.09
Nodes (52): fmt(), buildProductBreakdown(), compareProductCounts(), getReportSummary(), marginPercent(), plural(), ProductTotals, totalCost() (+44 more)

### Community 1 - "storage.ts"
Cohesion: 0.07
Nodes (44): openSqliteStore(), cache, CURRENCIES, DEFAULT_SETTINGS, errorText(), EVENT_COST_STORAGE_KEY, flush(), IMPORTED_EVENT_REPORT_KEY (+36 more)

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (46): @capacitor/android, @capacitor/app, @capacitor/cli, @capacitor-community/sqlite, @capacitor/core, @capacitor/filesystem, @capacitor/haptics, @capacitor/ios (+38 more)

### Community 3 - "main.ts"
Cohesion: 0.07
Nodes (98): defaultProducts, ensureProductHistory(), generateUUID(), formatInputNumber(), parseCurrencyInput(), addSale(), checkedValues(), closeCompareModal() (+90 more)

### Community 4 - "formatters.ts"
Cohesion: 0.13
Nodes (22): chooseUniqueColor(), CURRENCY_LOCALES, CURRENCY_SEPARATORS, CURRENCY_SYMBOLS, escapeForRegExp(), formatMoney(), formatNumeric(), normalizeHex() (+14 more)

### Community 5 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, isolatedModules, jsx (+14 more)

### Community 6 - ".application"
Cohesion: 0.08
Nodes (24): Any, Bool, Capacitor, AppDelegate, NSUserActivity, UIScene, UISceneSession, UIWindow (+16 more)

### Community 7 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 8 - "Bottom tab navigation"
Cohesion: 0.25
Nodes (9): Bottom tab navigation, Compare Sales / Compare Events screens, Event report screen, History screen, Save/Compare/Confirm/Import/Expense modals, Product edit screen with color picker, Sales report screen, Sales screen (product grid) (+1 more)

### Community 9 - "CNTR HTML app shell"
Cohesion: 0.25
Nodes (8): Build APK workflow, Capacitor sync android, CNTR-Debug-APK artifact, Gradle assembleDebug, Android launcher icon (blue cross logo), CNTR HTML app shell, iOS splash screen (centered blue cross logo), CNTR project

### Community 10 - "Architecture"
Cohesion: 0.20
Nodes (9): Architecture, Build pipeline, Conventions, Data model, Navigation, Rendering, Source layout, State (+1 more)

### Community 11 - "Graphify-first token-efficient workflow"
Cohesion: 0.60
Nodes (5): Graphify-first token-efficient workflow, Graphify Skill (.claude), AGENTS.md Graphify required workflow, graphify-out knowledge graph, CLAUDE.md graphify rules

### Community 12 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 21 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 22 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 23 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 24 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 25 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 26 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 27 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 28 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 29 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 30 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 31 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 39 - "Running Custom Playwright Code"
Cohesion: 0.04
Nodes (40): Examples, Inspecting Element Attributes, Debugging Playwright Tests, Running Playwright Tests, Attaching Screenshots and Videos to Pull Requests, From a local session, From CI, Limits (+32 more)

### Community 40 - "Cookies"
Cohesion: 0.06
Nodes (35): Advanced: Multiple Cookies or Custom Options, Advanced: Multiple Operations, Authentication State Reuse, Clear All Cookies, Clear All localStorage, Clear sessionStorage, Common Patterns, Cookies (+27 more)

### Community 41 - "Browser Automation with playwright-cli"
Cohesion: 0.07
Nodes (27): Attaching screenshots and videos to pull requests, Browser Automation with playwright-cli, Browser Sessions, Commands, Core, DevTools, Emulation, Example: Debugging with DevTools (+19 more)

### Community 42 - "3. Heal"
Cohesion: 0.09
Nodes (23): 0. How generation works, 1.1 Prerequisite: workspace, 1.2 Prerequisite: seed test, 1.3 Explore the app, 1.4 Write the spec file, 1. Planning, 2.1 Inputs, 2.2 Generate one scenario (+15 more)

### Community 43 - "Browser Session Management"
Cohesion: 0.10
Nodes (20): 1. Name Browser Sessions Semantically, 2. Always Clean Up, 3. Delete Stale Browser Data, A/B Testing Sessions, Attach by channel name, Attach via browser extension, Attach via CDP endpoint, Attaching to a Running Browser (+12 more)

### Community 44 - "Tracing"
Cohesion: 0.12
Nodes (16): 1. Start Tracing Before the Problem, 2. Clean Up Old Traces, Analyzing Performance, Basic Usage, Best Practices, Capturing Evidence, Debugging Failed Actions, Limitations (+8 more)

### Community 45 - "2026-10-26 (merged to `main`)"
Cohesion: 0.15
Nodes (12): 2026-10-26 (merged to `main`), 2026-10-26 (merged to `main` from `ui/revamp`), Added, Build, Changed, Changed, Changed, Changelog (+4 more)

### Community 46 - "HANDOFF"
Cohesion: 0.12
Nodes (16): Cleanup session: files changed (committed), Commits and push, Compact layout session (2026-10-26). Committed in `96bd03b`, merged to `main`, Current state (verified 2026-10-26), Decisions, GitHub metadata to apply (owner), Goal, HANDOFF (+8 more)

### Community 47 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 48 - "backup.ts"
Cohesion: 0.11
Nodes (26): BACKUP_APP, BACKUP_FORMAT, BackupFile, BackupSummary, checkCost(), checkList(), checkProduct(), checkReport() (+18 more)

### Community 49 - "restoreBackup"
Cohesion: 0.18
Nodes (19): buildBackup(), download(), pickTextFile(), SavedFile, saveFile(), saveSafetyCopy(), applyRestore(), errorText() (+11 more)

## Knowledge Gaps
- **342 isolated node(s):** `name`, `private`, `license`, `version`, `type` (+337 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Browser Automation with playwright-cli` connect `Browser Automation with playwright-cli` to `Running Custom Playwright Code`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `Test generation (plan → generate → heal)` connect `3. Heal` to `Running Custom Playwright Code`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `render()` (e.g. with `addSale()` and `openImportModal()`) actually correct?**
  _`render()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `wireDialogs()` (e.g. with `closeCompareModal()` and `closeExpenseModal()`) actually correct?**
  _`wireDialogs()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `start()` (e.g. with `goBack()` and `productsChanged()`) actually correct?**
  _`start()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `license` to the rest of the system?**
  _342 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ReportParts.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08509615384615385 - nodes in this community are weakly interconnected._