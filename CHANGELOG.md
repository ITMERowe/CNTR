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
- Changing the currency now updates the prices on the sales tiles immediately.
- The tap "bounce" on a sales counter plays fully (it was cut off halfway).
- The options menu closes when you tap elsewhere; Escape also closes the compare dialog.

### Changed
- **Capacitor 8** with Android target API 36 (required by Google Play since Aug 31, 2026). Minimum Android version is now 7.0 (API 24).
- Screens that show data are now **Preact** components (`src/views/`); state, report maths, navigation, product editor and colour picker moved out of `main.ts` into their own modules. `main.ts` went from ~2,250 to ~620 lines.
- Clearing sales, clearing the event, deleting a saved report and removing a product now ask for confirmation.
- Sales and event reports use the same product row layout: profit and revenue on the left, sales count and share on the right. Profit is green, zero is grey, losses are red.
- Consistent wording: "expense" everywhere, plural-aware counts, "Import sales" dialog, "Saved sales/event reports" in Settings.
- Negative amounts read `-Rp 410.000`.
- Consistent dialog buttons, form fields, row buttons and colour tokens; removed unused CSS.
- Faster rendering: settings are cached, saved reports are read once per render, and tile counts are computed in one pass.

### Build
- The APK workflow now runs on every branch, not only `main`; it uses `setup-android@v4` (v3 broke when Google removed the legacy SDK `tools` package) and is pinned to Ubuntu 24.04.
- Gradle 8.14.3, Android Gradle Plugin 8.13.0.
- Workflow actions moved to their Node 24 versions (`checkout`, `setup-node`, `upload-artifact` v7) ahead of GitHub retiring Node 20; the APK is now uploaded as a plain `.apk` instead of a zip.
- APKs are named `CNTR_<version>.apk` (e.g. `CNTR_1.0.42.apk`); `versionCode` and `versionName` come from the CI run number, so every build is a newer version.
- `dist/` and `node_modules/` are no longer tracked in git (CI builds them); `.gitignore` also covers signing keystores, env files, editor files and graphify caches.
- TypeScript now fails the build on unused code.
- Removed the obsolete `.graphify/` folder, the template Android example tests and an always-hidden button.
