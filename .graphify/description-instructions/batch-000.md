# Node Description Batch 1 of 4

Graphify is running in assistant/skill mode (no API key). You are the host
assistant (Claude Code / Codex / Gemini CLI). Read the prompt below and write
your JSON answer to the answer file.

## Prompt

You are documenting nodes in a knowledge graph.
For each entry below, write ONE concise factual plain-language sentence
describing what it is or does. Use only the provided context.
For a code symbol (kind=code-symbol — a function, class, or constant),
describe what the function/symbol does based on its name, source location
and neighbors — e.g. "Resolves the configured ontology profile from graphify.yaml.".
For an entity node (any other kind — e.g. a person, place, event, object),
describe what the entity is and its role, grounded in its type, its
relations (neighbors) and the provided citations/evidence — e.g.
"Lady Carfax, a wealthy heiress who disappears en route to Lausanne.".
Ground entity descriptions in the citations/evidence when present; do not
speculate beyond the context, so a node with no supporting context may be
left out of the reply.
LANGUAGE: each entry has a `lang=` marker giving the language of its source.
Write that entry's description in EXACTLY that language. Do not translate to
a single common language — match each node's source language individually.
No marketing language.
Respond ONLY with a JSON object mapping each node id (as a string) to its
one-sentence description — no prose, no markdown fences.

- "src_main": "main.ts" | kind=code-symbol | source=src/main.ts:L1 | neighbors=[6edd319 Added animations, 8386cc8 Convert from HTML to mobile., dab6dd6 Fix event report preview render…, addEventCost(), buildCompareCard(), buildEventCompareCard()] | lang=en
- "src_main_render": "render()" | kind=code-symbol | source=src/main.ts:L1499 | neighbors=[main.ts, addEventCost(), confirmCompareSelection(), deleteSavedReport(), rebuildGrid(), recordSale()] | lang=en
- "commit:repo:github.com/ITMERowe/CNTR@8386cc81004a4ef276d30f35a86ad5778d218f1f": "8386cc8 Convert from HTML to mobile." | kind=Commit | source=git | neighbors=[48508bc first commit, build.gradle, capacitor.settings.gradle, settings.gradle, variables.gradle, build.gradle] | lang=en
- "src_main_loadsavedreports": "loadSavedReports()" | kind=code-symbol | source=src/main.ts:L136 | neighbors=[main.ts, buildHistoryMarkup(), deleteSavedReport(), renameSavedReport(), renderCompareEventPage(), renderCompareSalesPage()] | lang=en
- "src_main_updatecolorinputs": "updateColorInputs()" | kind=code-symbol | source=src/main.ts:L1897 | neighbors=[main.ts, openProductEditor(), hexToRgb(), hsvToRgb(), rgbToHex(), rgbToHsv()] | lang=en
- "src_main_confirmcompareselection": "confirmCompareSelection()" | kind=code-symbol | source=src/main.ts:L1467 | neighbors=[main.ts, closeCompareModal(), hideScreenActions(), openScreen(), render(), renderCompareEventPage()] | lang=en
- "src_main_savecurrentreport": "saveCurrentReport()" | kind=code-symbol | source=src/main.ts:L209 | neighbors=[main.ts, getCurrentEventSnapshot(), loadSavedReports(), render(), saveImportedEventReport(), saveSavedReports()] | lang=en
- "src_main_showtoast": "showToast()" | kind=code-symbol | source=src/main.ts:L2145 | neighbors=[main.ts, confirmCompareSelection(), deleteSavedReport(), recordSale(), removeLastMatching(), renameSavedReport()] | lang=en
- "src_main_updatefromhsv": "updateFromHSV()" | kind=code-symbol | source=src/main.ts:L1917 | neighbors=[main.ts, hsvToRgb(), rgbToHex(), setColorField(), updateHuePosition(), updateSurfacePosition()] | lang=en
- "branch:repo:github.com/ITMERowe/CNTR#main": "main" | kind=Branch | source=git | neighbors=[38a01b9 add APK build workflow, 48508bc first commit, 6edd319 Added animations, 8386cc8 Convert from HTML to mobile., d276d37 fix APK build, dab6dd6 Fix event report preview render…] | lang=en
- "commit:repo:github.com/ITMERowe/CNTR@6edd319f07846bdc3b3346bcf6f18d5ff38c1d8e": "6edd319 Added animations" | kind=Commit | source=git | neighbors=[agents/app-overview-explanation, main, 38a01b9 add APK build workflow, main.ts, dab6dd6 Fix event report preview render…] | lang=en
- "commit:repo:github.com/ITMERowe/CNTR@dab6dd6fa033dad1a03fe3e7af3bb4aff9cdf9f6": "dab6dd6 Fix event report preview rendering and sales summary display" | kind=Commit | source=git | neighbors=[8386cc8 Convert from HTML to mobile., agents/app-overview-explanation, main, 6edd319 Added animations, main.ts] | lang=en
- "src_main_deletesavedreport": "deleteSavedReport()" | kind=code-symbol | source=src/main.ts:L144 | neighbors=[main.ts, loadSavedReports(), render(), saveSavedReports(), showToast()] | lang=en
- "src_main_getreportsummary": "getReportSummary()" | kind=code-symbol | source=src/main.ts:L1129 | neighbors=[main.ts, buildCompareCard(), buildEventCompareCard(), renderCompareEventPage(), renderCompareSalesPage()] | lang=en
- "src_main_renamesavedreport": "renameSavedReport()" | kind=code-symbol | source=src/main.ts:L154 | neighbors=[main.ts, loadSavedReports(), render(), saveSavedReports(), showToast()] | lang=en
- "src_main_rendercompareeventpage": "renderCompareEventPage()" | kind=code-symbol | source=src/main.ts:L1350 | neighbors=[main.ts, confirmCompareSelection(), buildEventCompareCard(), getReportSummary(), loadSavedReports()] | lang=en
- "src_main_rendercomparesalespage": "renderCompareSalesPage()" | kind=code-symbol | source=src/main.ts:L1280 | neighbors=[main.ts, confirmCompareSelection(), buildCompareCard(), getReportSummary(), loadSavedReports()] | lang=en
- "branch:repo:github.com/ITMERowe/CNTR#agents/app-overview-explanation": "agents/app-overview-explanation" | kind=Branch | source=git | neighbors=[48508bc first commit, 6edd319 Added animations, 8386cc8 Convert from HTML to mobile., dab6dd6 Fix event report preview render…] | lang=en
- "src_main_buildreportmarkup": "buildReportMarkup()" | kind=code-symbol | source=src/main.ts:L368 | neighbors=[main.ts, render(), fmt(), fmtCompact()] | lang=en
- "src_main_chooseuniquecolor": "chooseUniqueColor()" | kind=code-symbol | source=src/main.ts:L984 | neighbors=[main.ts, getUnusedPresetColor(), normalizeHex(), openProductEditor()] | lang=en
- "src_main_fmt": "fmt()" | kind=code-symbol | source=src/main.ts:L258 | neighbors=[main.ts, buildEventMarkup(), buildReportMarkup(), render()] | lang=en
- "src_main_getcontrastcolor": "getContrastColor()" | kind=code-symbol | source=src/main.ts:L1185 | neighbors=[main.ts, setColorField(), updateColorInputs(), updateFromHSV()] | lang=en
- "src_main_normalizehex": "normalizeHex()" | kind=code-symbol | source=src/main.ts:L991 | neighbors=[main.ts, chooseUniqueColor(), hexToRgb(), updateColorInputs()] | lang=en
- "src_main_openproducteditor": "openProductEditor()" | kind=code-symbol | source=src/main.ts:L1713 | neighbors=[main.ts, openScreen(), updateColorInputs(), chooseUniqueColor()] | lang=en
- "src_main_recordsale": "recordSale()" | kind=code-symbol | source=src/main.ts:L796 | neighbors=[main.ts, render(), saveSales(), showToast()] | lang=en
- "src_main_removelastmatching": "removeLastMatching()" | kind=code-symbol | source=src/main.ts:L805 | neighbors=[main.ts, render(), saveSales(), showToast()] | lang=en
- "src_main_renderimportlist": "renderImportList()" | kind=code-symbol | source=src/main.ts:L1565 | neighbors=[main.ts, openImportModal(), loadSavedReports(), updateImportModalButton()] | lang=en
- "src_main_savesavedreports": "saveSavedReports()" | kind=code-symbol | source=src/main.ts:L140 | neighbors=[main.ts, deleteSavedReport(), renameSavedReport(), saveCurrentReport()] | lang=en
- "src_main_setcolorfield": "setColorField()" | kind=code-symbol | source=src/main.ts:L2138 | neighbors=[main.ts, updateColorInputs(), updateFromHSV(), getContrastColor()] | lang=en
- "app_mainactivity": "MainActivity.java" | kind=code-symbol | source=android/app/src/main/java/com/cntr/app/MainActivity.java:L1 | neighbors=[MainActivity, BridgeActivity, 8386cc8 Convert from HTML to mobile.] | lang=en
- "commit:repo:github.com/ITMERowe/CNTR@38a01b9c40f46962d55901104570b20f8c8204c3": "38a01b9 add APK build workflow" | kind=Commit | source=git | neighbors=[main, d276d37 fix APK build, 6edd319 Added animations] | lang=pt
- "commit:repo:github.com/ITMERowe/CNTR@48508bc3f34a9a7f12acef2743020015cee5386a": "48508bc first commit" | kind=Commit | source=git | neighbors=[agents/app-overview-explanation, main, 8386cc8 Convert from HTML to mobile.] | lang=en
- "src_main_addeventcost": "addEventCost()" | kind=code-symbol | source=src/main.ts:L252 | neighbors=[main.ts, render(), saveEventCosts()] | lang=en
- "src_main_buildcomparecard": "buildCompareCard()" | kind=code-symbol | source=src/main.ts:L1153 | neighbors=[main.ts, getReportSummary(), renderCompareSalesPage()] | lang=en
- "src_main_buildeventcomparecard": "buildEventCompareCard()" | kind=code-symbol | source=src/main.ts:L1196 | neighbors=[main.ts, getReportSummary(), renderCompareEventPage()] | lang=en
- "src_main_buildeventmarkup": "buildEventMarkup()" | kind=code-symbol | source=src/main.ts:L466 | neighbors=[main.ts, render(), fmt()] | lang=en
- "src_main_buildhistorymarkup": "buildHistoryMarkup()" | kind=code-symbol | source=src/main.ts:L820 | neighbors=[main.ts, loadSavedReports(), render()] | lang=en
- "src_main_clamp": "clamp()" | kind=code-symbol | source=src/main.ts:L1818 | neighbors=[main.ts, updateHuePosition(), updateSurfacePosition()] | lang=en
- "src_main_closeoptionsmenu": "closeOptionsMenu()" | kind=code-symbol | source=src/main.ts:L1680 | neighbors=[main.ts, hideScreenActions(), openSaveModal()] | lang=en
- "src_main_hextorgb": "hexToRgb()" | kind=code-symbol | source=src/main.ts:L1822 | neighbors=[main.ts, updateColorInputs(), normalizeHex()] | lang=en

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\User\Downloads\The Hub\CNTR\.graphify\description-instructions\batch-000.json

Keep each description factual and concise (one sentence). No markdown, no prose
outside the JSON object. It is acceptable to omit a node if context is
insufficient — but include every node you can ground confidently.

Example answer format:
```json
{
  "node_id_1": "Resolves the configured ontology profile from graphify.yaml.",
  "node_id_2": "Colonel James Barclay, an antagonist in The Crooked Man."
}
```
