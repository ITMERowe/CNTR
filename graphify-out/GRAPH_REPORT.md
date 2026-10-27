# Graph Report - CNTR  (2026-10-27)

## Corpus Check
- 110 files · ~112,483 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1010 nodes · 1983 edges · 76 communities (63 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `94dd52b3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- EventScreen.tsx
- storage.ts
- dependencies
- How it works (decided)
- Review Focus
- compilerOptions
- AppDelegate
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
- state.ts
- Cookies
- Browser Automation with playwright-cli
- 3. Heal
- Browser Session Management
- Tracing
- Changelog
- HANDOFF
- Product
- backup.ts
- lib.mjs
- devDependencies
- main.ts
- productEditor.ts
- Running Custom Playwright Code
- t
- scripts
- package.json
- CNTR 0.1: fixes, light mode, Indonesian, security review
- Review Focus
- playwright-cli/SKILL.md
- element-attributes.md
- preact
- Video Recording
- formatters.ts
- confirmDeletePastEvent
- tutorial.ts
- start
- render
- Advanced Mocking with run-code
- @capacitor/filesystem
- @capacitor/android
- Attaching Screenshots and Videos to Pull Requests
- Trace Output Files
- Security review: CNTR repository and app (2026-10-27)
- @capacitor-community/sqlite

## God Nodes (most connected - your core abstractions)
1. `t()` - 76 edges
2. `render()` - 35 edges
3. `start()` - 30 edges
4. `feedback` - 26 edges
5. `loadSettings()` - 24 edges
6. `fmt()` - 19 edges
7. `sleep()` - 18 edges
8. `showToast()` - 17 edges
9. `openProductEditor()` - 17 edges
10. `compilerOptions` - 17 edges

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

## Communities (76 total, 13 thin omitted)

### Community 0 - "EventScreen.tsx"
Cohesion: 0.06
Nodes (75): adjustCount(), breakTime(), defaultEventName(), eventSummary(), formatDay(), saleTime(), snapshotProducts(), splitDays() (+67 more)

### Community 1 - "storage.ts"
Cohesion: 0.07
Nodes (45): localStorageStore, openSqliteStore(), cache, CURRENCIES, DEFAULT_SETTINGS, endTutorialData(), errorText(), EVENT_COST_STORAGE_KEY (+37 more)

### Community 2 - "dependencies"
Cohesion: 0.13
Nodes (15): @capacitor/app, @capacitor/core, @capacitor/haptics, @capacitor/ios, @capacitor/share, @fontsource-variable/plus-jakarta-sans, lucide, dependencies (+7 more)

### Community 3 - "How it works (decided)"
Cohesion: 0.12
Nodes (16): Anti-goals (would make this a failure even if it works), Backup, restore, CSV, Constraints, Data, End day, End event, Events: one live event, multi-day, History you can edit, Goals (+8 more)

### Community 4 - "Review Focus"
Cohesion: 0.17
Nodes (11): Events Implementation Plan, Global Constraints, Review Focus, Task 1: Event maths and atomic batches, Task 2: Storage keys, state, backup and CSV for events, Task 3: Merged Event screen (live), Task 4: End day and End event, Task 5: History list, view and Compare (+3 more)

### Community 5 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, isolatedModules, jsx (+14 more)

### Community 6 - "AppDelegate"
Cohesion: 0.08
Nodes (23): Any, Bool, Capacitor, AppDelegate, NSUserActivity, UIScene, UISceneSession, UIWindow (+15 more)

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
Cohesion: 0.17
Nodes (11): Architecture, Build pipeline, Conventions, Data model, Navigation, Rendering, Source layout, State (+3 more)

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

### Community 39 - "state.ts"
Cohesion: 0.23
Nodes (17): generateUUID(), addExpense(), assignProductIds(), dedupeByName(), deleteProduct(), endEvent(), initState(), newLiveEvent() (+9 more)

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
Cohesion: 0.17
Nodes (12): 1. Start Tracing Before the Problem, 2. Clean Up Old Traces, Analyzing Performance, Basic Usage, Best Practices, Capturing Evidence, Debugging Failed Actions, Limitations (+4 more)

### Community 45 - "Changelog"
Cohesion: 0.09
Nodes (22): 0.1 (branch `feature/signing-tests-about`), 2026-10-26 (merged to `main`), 2026-10-26 (merged to `main` from `ui/revamp`), Added, Added, Added, Build, Changed (+14 more)

### Community 46 - "HANDOFF"
Cohesion: 0.18
Nodes (10): Calls made during the 0.1 build (owner to check), Deferred minors, Goal, HANDOFF, Ideas not chosen yet (ask the owner first), Known issues (unresolved), Other known limits, Owner to-dos (+2 more)

### Community 47 - "Product"
Cohesion: 0.17
Nodes (11): Accessibility & Inclusion, Brand Commitments, Capabilities and Constraints, Evidence on Hand, Operating Context, Platform, Positioning, Product (+3 more)

### Community 48 - "backup.ts"
Cohesion: 0.11
Nodes (28): BACKUP_APP, BACKUP_FORMAT, BackupFile, BackupSummary, checkCost(), checkEvent(), checkList(), checkLiveEvent() (+20 more)

### Community 49 - "lib.mjs"
Cohesion: 0.05
Nodes (53): language(), { check, done }, fakeNative(), legacySales, message(), newPage(), restoreWith(), toSettings() (+45 more)

### Community 50 - "devDependencies"
Cohesion: 0.15
Nodes (13): @capacitor/cli, chokidar-cli, devDependencies, @capacitor/cli, chokidar-cli, @playwright/cli, playwright-core, typescript (+5 more)

### Community 51 - "main.ts"
Cohesion: 0.11
Nodes (35): download(), pickTextFile(), saveAutoBackup(), SavedFile, saveFile(), saveSafetyCopy(), parseCurrencyInput(), activeExpenses() (+27 more)

### Community 52 - "productEditor.ts"
Cohesion: 0.20
Nodes (22): ensureProductHistory(), formatInputNumber(), renameSales(), state, loadSettings(), closeColorPicker(), getPickerColor(), el (+14 more)

### Community 53 - "Running Custom Playwright Code"
Cohesion: 0.15
Nodes (13): Clipboard, Complex Workflows, Error Handling, File Downloads, Frames and Iframes, Geolocation, JavaScript Execution, Media Emulation (+5 more)

### Community 54 - "t"
Cohesion: 0.15
Nodes (31): buildBackup(), t(), applyRestore(), blockedByTutorial(), confirmEndEvent(), endTutorial(), errorText(), exportBackup() (+23 more)

### Community 55 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, build:watch, cap:sync, dev, preview, test, test:e2e

### Community 56 - "package.json"
Cohesion: 0.33
Nodes (5): license, name, private, type, version

### Community 57 - "CNTR 0.1: fixes, light mode, Indonesian, security review"
Cohesion: 0.12
Nodes (15): 1. Bug fixes, 1a. Deleting a product keeps its sales (owner decided), 1b. Cancel while saving a past-event edit (builder's call, below), 1c. Empty day card date (builder's call), 2. Light mode (owner decided: VS Code Light+ colours), 3. Indonesian (owner decided), 4. Security review (report first), Anti-goals (a failure even if it "works") (+7 more)

### Community 58 - "Review Focus"
Cohesion: 0.14
Nodes (13): CNTR 0.1 Update Implementation Plan, Global Constraints, Review Focus, Task 0: Commit the current work, Task 1: Security review (report only), Task 1b: Security fixes (owner approved all of findings 1–7 on 2026-10-27), Task 2: Deleting a product keeps its sales, Task 3: Cancel can never save a past-event edit (+5 more)

### Community 62 - "Video Recording"
Cohesion: 0.20
Nodes (10): 1. Use Descriptive Filenames, 2. Record entire hero scripts., 3. Attach the recording to the pull request, Basic Recording, Best Practices, Cursor, Target Highlight and Click Point, Limitations, Overlay API Summary (+2 more)

### Community 63 - "formatters.ts"
Cohesion: 0.14
Nodes (23): chooseUniqueColor(), CURRENCY_LOCALES, CURRENCY_SEPARATORS, CURRENCY_SYMBOLS, escapeForRegExp(), formatMoney(), formatNumeric(), needsDarkText() (+15 more)

### Community 64 - "confirmDeletePastEvent"
Cohesion: 0.21
Nodes (14): cancelEditing(), closePastEvent(), confirmDeletePastEvent(), goBack(), goTo(), openPastEvent(), saveEditing(), setSaving() (+6 more)

### Community 65 - "tutorial.ts"
Cohesion: 0.15
Nodes (12): Key, salesCounts(), todayLiveSales(), GUARDED, on(), runTour(), sold(), TOUR_SESSION_KEY (+4 more)

### Community 66 - "start"
Cohesion: 0.31
Nodes (10): translateStatic(), applyLanguage(), confirmStartTutorial(), hasOwnData(), productsChanged(), start(), wireSettings(), tutorialActive() (+2 more)

### Community 67 - "render"
Cohesion: 0.16
Nodes (19): feedback, isNative, NOTES, play(), addSale(), adjustDraft(), confirmEndDay(), deleteExpense() (+11 more)

### Community 68 - "Advanced Mocking with run-code"
Cohesion: 0.22
Nodes (8): Advanced Mocking with run-code, CLI Route Commands, Conditional Response Based on Request, Delayed Response, Modify Real Response, Request Mocking, Simulate Network Failures, URL Patterns

### Community 71 - "Attaching Screenshots and Videos to Pull Requests"
Cohesion: 0.40
Nodes (5): Attaching Screenshots and Videos to Pull Requests, From a local session, From CI, Limits, When to attach

### Community 72 - "Trace Output Files"
Cohesion: 0.50
Nodes (4): `resources/`, Trace Output Files, `trace-{timestamp}.network`, `trace-{timestamp}.trace`

### Community 73 - "Security review: CNTR repository and app (2026-10-27)"
Cohesion: 0.50
Nodes (3): Checked and fine, Findings, most serious first, Security review: CNTR repository and app (2026-10-27)

## Knowledge Gaps
- **432 isolated node(s):** `name`, `private`, `license`, `type`, `dev` (+427 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `language()` connect `lib.mjs` to `EventScreen.tsx`, `main.ts`, `t`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `@capacitor/filesystem`, `@capacitor/android`, `@capacitor-community/sqlite`, `package.json`, `preact`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `t()` connect `t` to `EventScreen.tsx`, `confirmDeletePastEvent`, `start`, `render`, `storage.ts`, `tutorial.ts`, `backup.ts`, `main.ts`, `productEditor.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `render()` (e.g. with `addSale()` and `confirmEndDay()`) actually correct?**
  _`render()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `start()` (e.g. with `confirmStartTutorial()` and `goBack()`) actually correct?**
  _`start()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `license` to the rest of the system?**
  _432 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `EventScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.062038073908174694 - nodes in this community are weakly interconnected._