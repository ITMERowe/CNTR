# Node Description Batch 3 of 4

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
Write every description in English (en). Do not switch languages.
No marketing language.
Respond ONLY with a JSON object mapping each node id (as a string) to its
one-sentence description — no prose, no markdown fences.

- "src_main_wireeventactions": "wireEventActions()" | kind=code-symbol | source=src/main.ts:L614 | neighbors=[main.ts, render()]
- "android_build": "build.gradle" | kind=code-symbol | source=android/build.gradle:L1 | neighbors=[8386cc8 Convert from HTML to mobile.]
- "android_capacitor_settings": "capacitor.settings.gradle" | kind=code-symbol | source=android/capacitor.settings.gradle:L1 | neighbors=[8386cc8 Convert from HTML to mobile.]
- "android_settings": "settings.gradle" | kind=code-symbol | source=android/settings.gradle:L1 | neighbors=[8386cc8 Convert from HTML to mobile.]
- "android_variables": "variables.gradle" | kind=code-symbol | source=android/variables.gradle:L1 | neighbors=[8386cc8 Convert from HTML to mobile.]
- "app_build": "build.gradle" | kind=code-symbol | source=android/app/build.gradle:L1 | neighbors=[8386cc8 Convert from HTML to mobile.]
- "app_capacitor_build": "capacitor.build.gradle" | kind=code-symbol | source=android/app/capacitor.build.gradle:L1 | neighbors=[8386cc8 Convert from HTML to mobile.]
- "myapp_exampleinstrumentedtest_exampleinstrumentedtest_useappcontext": ".useAppContext()" | kind=code-symbol | source=android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java:L19 | neighbors=[ExampleInstrumentedTest]
- "myapp_exampleunittest_exampleunittest_addition_iscorrect": ".addition_isCorrect()" | kind=code-symbol | source=android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java:L14 | neighbors=[ExampleUnitTest]
- "src_main_closecolorpicker": "closeColorPicker()" | kind=code-symbol | source=src/main.ts:L1893 | neighbors=[main.ts]
- "src_main_closeimportmodal": "closeImportModal()" | kind=code-symbol | source=src/main.ts:L1605 | neighbors=[main.ts]
- "src_main_closesavemodal": "closeSaveModal()" | kind=code-symbol | source=src/main.ts:L2226 | neighbors=[main.ts]
- "src_main_compareconfirmedids": "compareConfirmedIds" | kind=code-symbol | source=src/main.ts:L1421 | neighbors=[main.ts]
- "src_main_comparedraftids": "compareDraftIds" | kind=code-symbol | source=src/main.ts:L1422 | neighbors=[main.ts]
- "src_main_comparereportids": "compareReportIds" | kind=code-symbol | source=src/main.ts:L1420 | neighbors=[main.ts]
- "src_main_currenthsv": "currentHSV" | kind=code-symbol | source=src/main.ts:L1815 | neighbors=[main.ts]
- "src_main_defaultproducts": "defaultProducts" | kind=code-symbol | source=src/main.ts:L37 | neighbors=[main.ts]
- "src_main_el": "el" | kind=code-symbol | source=src/main.ts:L293 | neighbors=[main.ts]
- "src_main_eventcost": "EventCost" | kind=code-symbol | source=src/main.ts:L25 | neighbors=[main.ts]
- "src_main_eventcosts": "eventCosts" | kind=code-symbol | source=src/main.ts:L79 | neighbors=[main.ts]
- "src_main_hsv": "HSV" | kind=code-symbol | source=src/main.ts:L19 | neighbors=[main.ts]
- "src_main_importedeventreport": "importedEventReport" | kind=code-symbol | source=src/main.ts:L81 | neighbors=[main.ts]
- "src_main_label": "label()" | kind=code-symbol | source=src/main.ts:L271 | neighbors=[main.ts]
- "src_main_loadeventcosts": "loadEventCosts()" | kind=code-symbol | source=src/main.ts:L128 | neighbors=[main.ts]
- "src_main_loadimportedeventreport": "loadImportedEventReport()" | kind=code-symbol | source=src/main.ts:L84 | neighbors=[main.ts]
- "src_main_loadproducthistory": "loadProductHistory()" | kind=code-symbol | source=src/main.ts:L101 | neighbors=[main.ts]
- "src_main_loadproducts": "loadProducts()" | kind=code-symbol | source=src/main.ts:L92 | neighbors=[main.ts]
- "src_main_loadsales": "loadSales()" | kind=code-symbol | source=src/main.ts:L120 | neighbors=[main.ts]
- "src_main_openaboutmenubtn": "openAboutMenuBtn" | kind=code-symbol | source=src/main.ts:L2014 | neighbors=[main.ts]
- "src_main_opencolorpicker": "openColorPicker()" | kind=code-symbol | source=src/main.ts:L1889 | neighbors=[main.ts]
- "src_main_openeventreportmenubtn": "openEventReportMenuBtn" | kind=code-symbol | source=src/main.ts:L1998 | neighbors=[main.ts]
- "src_main_opensalesreportmenubtn": "openSalesReportMenuBtn" | kind=code-symbol | source=src/main.ts:L1982 | neighbors=[main.ts]
- "src_main_payments": "payments" | kind=code-symbol | source=src/main.ts:L77 | neighbors=[main.ts]
- "src_main_preset_colors": "PRESET_COLORS" | kind=code-symbol | source=src/main.ts:L977 | neighbors=[main.ts]
- "src_main_product": "Product" | kind=code-symbol | source=src/main.ts:L4 | neighbors=[main.ts]
- "src_main_producthistory": "productHistory" | kind=code-symbol | source=src/main.ts:L35 | neighbors=[main.ts]
- "src_main_products": "products" | kind=code-symbol | source=src/main.ts:L34 | neighbors=[main.ts]
- "src_main_resetexpensemodal": "resetExpenseModal()" | kind=code-symbol | source=src/main.ts:L596 | neighbors=[main.ts]
- "src_main_salerecord": "SaleRecord" | kind=code-symbol | source=src/main.ts:L11 | neighbors=[main.ts]
- "src_main_savedreport": "SavedReport" | kind=code-symbol | source=src/main.ts:L144 | neighbors=[main.ts]

## Instructions

Write a single JSON object mapping each node id to a one-sentence description
to: C:\Users\User\Downloads\The Hub\CNTR\.graphify\description-instructions\batch-002.json

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
