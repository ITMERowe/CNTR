# Community Labeling

Graphify is running in assistant/skill mode (no API key). You are the host
assistant (Claude Code / Codex / Gemini CLI). Read the community listing below
and write 2-5 word plain-language names for each.

## Language

LANGUAGE: each community line ends with a `[lang=…]` marker giving the
language of its source nodes. Write that community's name in EXACTLY that
language. Do not normalize every name to one common language.

## Communities

Community 0: main.ts, closeColorPicker(, closeImportModal(, closeSaveModal(, compareConfirmedIds, compareDraftIds, compareReportIds, currentHSV, defaultProducts, el, EventCost, eventCosts [lang=es]
Community 1: build.gradle, capacitor.settings.gradle, settings.gradle, variables.gradle, capacitor.build.gradle, MainActivity.java, MainActivity, agents/app-overview-explanation, main, BridgeActivity, 38a01b9 add APK build workflow, 48508bc first commit [lang=pt]
Community 2: deleteSavedReport(, loadSavedReports(, renameSavedReport(, render(, saveCurrentReport(, showToast(, buildEventMarkup(, buildHistoryMarkup(, buildReportMarkup(, fmt(, fmtCompact(, getCurrentEventSnapshot( [lang=en]
Community 3: updateColorInputs(, updateFromHSV(, chooseUniqueColor(, clamp(, getContrastColor(, getUnusedPresetColor(, hexToRgb(, hsvToRgb(, normalizeHex(, openProductEditor(, openScreen(, rgbToHex( [lang=en]
Community 4: confirmCompareSelection(, getReportSummary(, buildCompareCard(, buildEventCompareCard(, closeCompareModal(, closeOptionsMenu(, hideScreenActions(, openSaveModal(, renderCompareEventPage(, renderCompareSalesPage(, updateSaveModalButton( [lang=en]
Community 5: isImportSelectionValid(, openImportModal(, renderImportList(, updateImportModalButton( [lang=en]
Community 6: addEventCost(, removeEventCost(, saveEventCosts( [lang=en]
Community 7: makeTiles(, rebuildGrid( [lang=en]
Community 8: openCompareModal(, renderCompareSelectionList( [lang=en]
Community 9: openExpenseModalForEdit(, updateExpenseButtonState( [lang=en]
Community 10: saveProducts(, syncProductState( [lang=en]

## Instructions

Write a single JSON object mapping each community id (as a string) to its
2-5 word name to: C:\Users\User\Downloads\The Hub\CNTR\.graphify\label-instructions\communities.json

Example:
```json
{
  "0": "Authentication Flow",
  "1": "Authentication Flow",
  "2": "Authentication Flow"
}
```

Then re-run `graphify update` (or `graphify label`) to ingest the names.
