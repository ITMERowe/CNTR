# Graph Report - .  (2026-08-12)

## Corpus Check
- Corpus is ~22.428 words - fits in a single context window. You may not need a graph.

## Summary
- 127 nodes · 227 edges · 11 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 105 · calls: 90 · MODIFIES: 13 · ON_BRANCH: 10 · PARENT_OF: 5 · method: 2 · imports: 1 · inherits: 1


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 47 · Candidates: 2366
- Excluded: 108 untracked · 26031 ignored · 0 sensitive · 4 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `d276d37`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `render()` - 20 edges
2. `loadSavedReports()` - 11 edges
3. `updateColorInputs()` - 9 edges
4. `confirmCompareSelection()` - 8 edges
5. `saveCurrentReport()` - 7 edges
6. `updateFromHSV()` - 7 edges
7. `showToast()` - 7 edges
8. `deleteSavedReport()` - 5 edges
9. `renameSavedReport()` - 5 edges
10. `getReportSummary()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `addEventCost()` --calls--> `render()`  [EXTRACTED]
  src/main.ts → src/main.ts  _Bridges community 6 → community 2_
- `confirmCompareSelection()` --calls--> `openScreen()`  [EXTRACTED]
  src/main.ts → src/main.ts  _Bridges community 4 → community 3_
- `confirmCompareSelection()` --calls--> `render()`  [EXTRACTED]
  src/main.ts → src/main.ts  _Bridges community 4 → community 2_
- `rebuildGrid()` --calls--> `render()`  [EXTRACTED]
  src/main.ts → src/main.ts  _Bridges community 7 → community 2_
- `renderCompareSelectionList()` --calls--> `loadSavedReports()`  [EXTRACTED]
  src/main.ts → src/main.ts  _Bridges community 8 → community 2_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (23): compareConfirmedIds, compareDraftIds, compareReportIds, currentHSV, defaultProducts, el, EventCost, eventCosts (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (12): MainActivity, agents/app-overview-explanation, main, BridgeActivity, 38a01b9 add APK build workflow, 48508bc first commit, 6edd319 Added animations, 8386cc8 Convert from HTML to mobile. (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (23): buildEventMarkup(), buildHistoryMarkup(), buildReportMarkup(), deleteSavedReport(), fmt(), fmtCompact(), getCurrentEventSnapshot(), loadSavedReports() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (16): chooseUniqueColor(), clamp(), getContrastColor(), getUnusedPresetColor(), hexToRgb(), hsvToRgb(), normalizeHex(), openProductEditor() (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.24
Nodes (11): buildCompareCard(), buildEventCompareCard(), closeCompareModal(), closeOptionsMenu(), confirmCompareSelection(), getReportSummary(), hideScreenActions(), openSaveModal() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.50
Nodes (4): isImportSelectionValid(), openImportModal(), renderImportList(), updateImportModalButton()

### Community 6 - "Community 6"
Cohesion: 0.67
Nodes (3): addEventCost(), removeEventCost(), saveEventCosts()

### Community 7 - "Community 7"
Cohesion: 1.00
Nodes (2): makeTiles(), rebuildGrid()

### Community 8 - "Community 8"
Cohesion: 1.00
Nodes (2): openCompareModal(), renderCompareSelectionList()

### Community 9 - "Community 9"
Cohesion: 1.00
Nodes (2): openExpenseModalForEdit(), updateExpenseButtonState()

### Community 10 - "Community 10"
Cohesion: 1.00
Nodes (2): saveProducts(), syncProductState()

## Knowledge Gaps
- **23 isolated node(s):** `products`, `productHistory`, `payments`, `tx`, `eventCosts` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 7`** (2 nodes): `makeTiles()`, `rebuildGrid()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (2 nodes): `openCompareModal()`, `renderCompareSelectionList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (2 nodes): `openExpenseModalForEdit()`, `updateExpenseButtonState()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (2 nodes): `saveProducts()`, `syncProductState()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `render()` connect `Community 2` to `Community 0`, `Community 6`, `Community 4`, `Community 7`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `products`, `productHistory`, `payments` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11594202898550725 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1422924901185771 - nodes in this community are weakly interconnected._