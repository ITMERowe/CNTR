# Node Description Batch 2 of 4

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
Write every description in English (en). Do not switch languages.
No marketing language.
Respond ONLY with a JSON object mapping each node id (as a string) to its
one-sentence description — no prose, no markdown fences.

- "src_main_hidescreenactions": "hideScreenActions()" | kind=code-symbol | source=src/main.ts:L1688 | neighbors=[main.ts, confirmCompareSelection(), closeOptionsMenu()]
- "src_main_hsvtorgb": "hsvToRgb()" | kind=code-symbol | source=src/main.ts:L1860 | neighbors=[main.ts, updateColorInputs(), updateFromHSV()]
- "src_main_opensavemodal": "openSaveModal()" | kind=code-symbol | source=src/main.ts:L2215 | neighbors=[main.ts, closeOptionsMenu(), updateSaveModalButton()]
- "src_main_openscreen": "openScreen()" | kind=code-symbol | source=src/main.ts:L1707 | neighbors=[main.ts, confirmCompareSelection(), openProductEditor()]
- "src_main_rebuildgrid": "rebuildGrid()" | kind=code-symbol | source=src/main.ts:L1701 | neighbors=[main.ts, makeTiles(), render()]
- "src_main_removeeventcost": "removeEventCost()" | kind=code-symbol | source=src/main.ts:L258 | neighbors=[main.ts, render(), saveEventCosts()]
- "src_main_rendercompareselectionlist": "renderCompareSelectionList()" | kind=code-symbol | source=src/main.ts:L1425 | neighbors=[main.ts, openCompareModal(), loadSavedReports()]
- "src_main_rendersavedeventreporthistory": "renderSavedEventReportHistory()" | kind=code-symbol | source=src/main.ts:L1052 | neighbors=[main.ts, render(), loadSavedReports()]
- "src_main_rendersavedsalesreporthistory": "renderSavedSalesReportHistory()" | kind=code-symbol | source=src/main.ts:L975 | neighbors=[main.ts, render(), loadSavedReports()]
- "src_main_rgbtohex": "rgbToHex()" | kind=code-symbol | source=src/main.ts:L1830 | neighbors=[main.ts, updateColorInputs(), updateFromHSV()]
- "src_main_saveeventcosts": "saveEventCosts()" | kind=code-symbol | source=src/main.ts:L132 | neighbors=[main.ts, addEventCost(), removeEventCost()]
- "src_main_savesales": "saveSales()" | kind=code-symbol | source=src/main.ts:L124 | neighbors=[main.ts, recordSale(), removeLastMatching()]
- "src_main_updatehueposition": "updateHuePosition()" | kind=code-symbol | source=src/main.ts:L1943 | neighbors=[main.ts, clamp(), updateFromHSV()]
- "src_main_updateimportmodalbutton": "updateImportModalButton()" | kind=code-symbol | source=src/main.ts:L1560 | neighbors=[main.ts, renderImportList(), isImportSelectionValid()]
- "src_main_updatesurfaceposition": "updateSurfacePosition()" | kind=code-symbol | source=src/main.ts:L1934 | neighbors=[main.ts, clamp(), updateFromHSV()]
- "app_mainactivity_mainactivity": "MainActivity" | kind=code-symbol | source=android/app/src/main/java/com/cntr/app/MainActivity.java:L5 | neighbors=[MainActivity.java, BridgeActivity]
- "bridgeactivity": "BridgeActivity" | kind=code-symbol | neighbors=[MainActivity.java, MainActivity]
- "commit:repo:github.com/ITMERowe/CNTR@d276d37f18794d6705d12160de1cc72eb144518f": "d276d37 fix APK build" | kind=Commit | source=git | neighbors=[38a01b9 add APK build workflow, main]
- "myapp_exampleinstrumentedtest": "ExampleInstrumentedTest.java" | kind=code-symbol | source=android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java:L1 | neighbors=[8386cc8 Convert from HTML to mobile., ExampleInstrumentedTest]
- "myapp_exampleinstrumentedtest_exampleinstrumentedtest": "ExampleInstrumentedTest" | kind=code-symbol | source=android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java:L16 | neighbors=[ExampleInstrumentedTest.java, .useAppContext()]
- "myapp_exampleunittest": "ExampleUnitTest.java" | kind=code-symbol | source=android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java:L1 | neighbors=[8386cc8 Convert from HTML to mobile., ExampleUnitTest]
- "myapp_exampleunittest_exampleunittest": "ExampleUnitTest" | kind=code-symbol | source=android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java:L12 | neighbors=[ExampleUnitTest.java, .addition_isCorrect()]
- "src_main_closecomparemodal": "closeCompareModal()" | kind=code-symbol | source=src/main.ts:L1458 | neighbors=[main.ts, confirmCompareSelection()]
- "src_main_fmtcompact": "fmtCompact()" | kind=code-symbol | source=src/main.ts:L262 | neighbors=[main.ts, buildReportMarkup()]
- "src_main_getcurrenteventsnapshot": "getCurrentEventSnapshot()" | kind=code-symbol | source=src/main.ts:L167 | neighbors=[main.ts, saveCurrentReport()]
- "src_main_getunusedpresetcolor": "getUnusedPresetColor()" | kind=code-symbol | source=src/main.ts:L979 | neighbors=[main.ts, chooseUniqueColor()]
- "src_main_isimportselectionvalid": "isImportSelectionValid()" | kind=code-symbol | source=src/main.ts:L1554 | neighbors=[main.ts, updateImportModalButton()]
- "src_main_maketiles": "makeTiles()" | kind=code-symbol | source=src/main.ts:L726 | neighbors=[main.ts, rebuildGrid()]
- "src_main_opencomparemodal": "openCompareModal()" | kind=code-symbol | source=src/main.ts:L1446 | neighbors=[main.ts, renderCompareSelectionList()]
- "src_main_openexpensemodalforedit": "openExpenseModalForEdit()" | kind=code-symbol | source=src/main.ts:L267 | neighbors=[main.ts, updateExpenseButtonState()]
- "src_main_openimportmodal": "openImportModal()" | kind=code-symbol | source=src/main.ts:L1598 | neighbors=[main.ts, renderImportList()]
- "src_main_renderproducthistory": "renderProductHistory()" | kind=code-symbol | source=src/main.ts:L913 | neighbors=[main.ts, render()]
- "src_main_rgbtohsv": "rgbToHsv()" | kind=code-symbol | source=src/main.ts:L1834 | neighbors=[main.ts, updateColorInputs()]
- "src_main_saveimportedeventreport": "saveImportedEventReport()" | kind=code-symbol | source=src/main.ts:L88 | neighbors=[main.ts, saveCurrentReport()]
- "src_main_saveproducts": "saveProducts()" | kind=code-symbol | source=src/main.ts:L96 | neighbors=[main.ts, syncProductState()]
- "src_main_syncproductstate": "syncProductState()" | kind=code-symbol | source=src/main.ts:L37 | neighbors=[main.ts, saveProducts()]
- "src_main_totals": "totals()" | kind=code-symbol | source=src/main.ts:L644 | neighbors=[main.ts, render()]
- "src_main_updateexpensebuttonstate": "updateExpenseButtonState()" | kind=code-symbol | source=src/main.ts:L585 | neighbors=[main.ts, openExpenseModalForEdit()]
- "src_main_updatepreviewheaders": "updatePreviewHeaders()" | kind=code-symbol | source=src/main.ts:L1611 | neighbors=[main.ts, render()]
- "src_main_updatesavemodalbutton": "updateSaveModalButton()" | kind=code-symbol | source=src/main.ts:L2210 | neighbors=[main.ts, openSaveModal()]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\User\Downloads\The Hub\CNTR\.graphify\description-instructions\batch-001.json

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
