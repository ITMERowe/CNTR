# Changelog

## Unreleased

### Fixed
- Closing or opening the expense dialog no longer jumps the page to the top, and its handlers no longer pile up on every sale (they were re-attached on each render).
- Saving an inactive product edited from **Products** now works even if it is the first product opened.
- **Add product** no longer overwrites a product whose edit was abandoned earlier.
- Adding, editing or deleting an expense while viewing a saved event report now changes that report, not the live event.
- **Save event report** saves exactly what the event screen shows.
- Sales and event comparisons keep separate selections instead of clearing each other.
- Sales of deactivated products still appear in report breakdowns (they were counted in revenue but missing from the list).
- Product, report and expense names containing `<`, `&` or quotes are displayed as text instead of breaking the page.
- Renaming a product to an existing name is refused instead of silently merging the two.
- Corrupt saved data no longer prevents the app from starting.
- On a fresh install, **Products** now lists the default products.
- Compare screens no longer overflow off the right edge of the screen.
- Product names are no longer shrunk to 12px on phones narrower than 381px.
- Header buttons, the stats bar and the highlighted tab are now correct on every screen (e.g. no "add product" button inside the product editor, no "clear sales" on Compare).

### Changed
- Clearing sales, clearing the event, deleting a saved report and removing a product now ask for confirmation.
- Sales and event reports use the same product row layout: profit and revenue on the left, sales count and share on the right. Profit is green, zero is grey, losses are red.
- Consistent wording: "expense" everywhere, plural-aware counts, "Import sales" dialog, "Saved sales/event reports" in Settings.
- Negative amounts read `-Rp 410.000`.
- Consistent dialog buttons, form fields, row buttons and colour tokens; removed unused CSS.
- Faster rendering: settings are cached, saved reports are read once per render, and tile counts are computed in one pass.

### Build
- The APK workflow now runs on every branch, not only `main`.
- `dist/` and `node_modules/` are no longer tracked in git (CI builds them).
