# Changelog

## 0.1 (branch `feature/signing-tests-about`)

### Added
- **Hands-on tutorial**: a 28-step tour on rails (like a game tutorial: only the highlighted button responds, the rest is dimmed) with practice products and events (sell, undo, add a product, expenses, End day, End event, edit a past event, Compare). Offered once on an empty first launch; replay from Settings → Show tutorial. The real data is put aside and comes back exactly as it was on Finish, Quit, or the next launch after a crash. No backup files are written during the tour, and Export/Restore wait until it ends.
- **Haptics and sound effects**: a tap on every sale, undo, stepper, switch and payment pick; a success buzz and soft chime on End day, End event, saved edits and exports; a warning buzz on refusals and failures. Settings → Sound → *Sound effects* turns the tones off (vibration stays).

### Changed
- Version names are now `0.1.<build>` (e.g. `CNTR_0.1.24.apk`): pre-release until it is ready to ship, which will be 1.0. Builds were named `1.0.<build>` before; the build number (`versionCode`) keeps rising, so 0.1.24 still installs as an update over 1.0.23.
- The two explanation notes under Settings → Backup were removed (the About → Privacy text stays).

## Earlier builds, named 1.0.x (branch `feature/signing-tests-about`)

### Changed (events)
- **Reports and Event are one always-live Event screen.** Every sale counts at once; no Save report, Save event report, Import sales or Clear buttons. 4 tabs: Event, Sell, History, Settings.
- **Multi-day events**: End day freezes the day (day cards on the Event screen; the Sell counters and revenue restart for the new day); End event names the event and moves it to History.
- **History** lists past events. Open one to view it, edit it (rename, fix Cash/QRIS counts per product per day, change expenses; saved after an automatic backup), delete it, or compare two.
- Net profit everywhere (including Compare) is product profit − expenses; it used to be revenue − expenses on the Event and Compare screens.
- Old saved reports are no longer shown (dropped, not deleted); the first launch saves one automatic backup that still contains them. Restoring an older backup restores its live sales and expenses.
- Changing a product's price no longer reprices sales from ended days.
- CSV export: one row per sale with the event name and day number.
- **Payment methods per product**: pick 1 or 2 of Cash, QRIS, Transfer, Card, E-wallet in the product editor. One method gives one full-width button on the tile. The payment mix, History edit and backups follow each product's methods. Existing products keep Cash + QRIS. Colours for the new methods are dataviz-validated (adjacent pairs) and always shown with the method's name.
- Tile text stays white down to 2.6:1 contrast (pink, green, orange tiles are white again); only lighter colours (yellow, beige, pastels) get dark text.
- **Settings reworked**: Products first (with a live "3 on the counter · 1 hidden" summary), then Event, Money, Sales data (CSV, labelled "Not a backup"), Backup (a plain "Last backup" row, Export, Restore, two short notes) and About.
- **Products screen**: "On the counter" and "Hidden" sections with counts; rows show price, profit per item and payment methods; tap a row to edit; the switch moves a product between sections; an Add product button at the end. The delete button left the rows: deleting is done in the product editor (works for hidden products too), always with a confirm.
- **No starter products**: a fresh install starts with an empty counter. Existing products are untouched.
- Settings → Event → *Products per day* (on by default): the Event screen's Products card is one collapsible card per day (the latest open); turn it off for one card for the whole event.
- A multi-key change (End event) is saved in one all-or-nothing write.

### Added
- **About screen** (Settings → About): version, license, a privacy statement (no account, server or internet; data stays on the phone) and the open-source licenses.
- **Automatic backups**: before ending an event, saving an edit to a past event or deleting one, CNTR writes a backup to `Documents/CNTR/auto` (newest 20 kept). If that backup fails, it asks before going ahead.
- **Release signing in CI**: with the release key in GitHub secrets, CI builds a release APK signed with one permanent key (installs as an update, keeping the data) and a Play `.aab`; without it, a debug APK as before.
- Browser tests in the repo (`tests/e2e`, `npm run test:e2e`), run in CI with the unit tests.

### Changed
- Product tiles use dark text on light colours (yellow, pink, green, orange, beige) so names and counts are readable; dark colours keep white text. The product editor preview follows the same rule.
- The Sell screen's revenue figure is 3/4 of its previous size, leaving more room for tiles.

### Fixed
- On narrow phones (320–360px) the Event screen's cards were wider than the screen when an expense had a long amount, cutting off the add and delete buttons.

## Previously unreleased (merged to `main` via PR #2)

### Changed
- **Data is now stored in SQLite on the phone** instead of WebView `localStorage`, which the OS may clear. The first launch after updating copies the existing data into the database, checks the copy, and leaves the old copy untouched; it runs once and cannot duplicate records.
- Saving no longer fails silently: if a write fails (e.g. the phone is out of storage), the change is kept, retried, and a warning stays on screen until it is saved.

### Added
- **Settings → Backup**: export all data as a JSON file (saved to `Documents/CNTR`, then the share sheet to keep a copy elsewhere), export sales as CSV, and restore from a backup. A restore checks the whole file first, saves a copy of the current data, then replaces everything in one step; a damaged or cut-off file is rejected with the reason and nothing changes.
- A clear note in Settings that uninstalling, clearing app data or losing the phone deletes the data.
- Unit tests (`npm test`, also run in CI) for migration, backup validation and CSV.

## 2026-10-26 (merged to `main` from `ui/revamp`)

### Changed
- New visual system: VS Code-dark surfaces, white ink accent, product colours as the hero, 4/8px spacing, one set of motion tokens. Designed with the ui-ux-pro-max (POS: Swiss minimal, high contrast, large targets) and dataviz skills.
- Sell tab: big revenue figure that counts up; tiles where each Cash/QRIS half is one large tap target with a separate undo; rolling counters; haptic feedback on the phone; tiles keep the original product colours with white text and icons.
- Reports: hero revenue, profit and average-sale tiles, a Cash/QRIS split bar with a labelled legend, a sales-by-hour chart (busiest hour highlighted, tap a column to read it), product rows with unsold products collapsed into one line.
- Event: net profit/deficit as the hero figure, revenue/profit/expenses tiles, empty state with an Import button.
- Dialogs are bottom sheets; the tab bar has labels and an animated active indicator; Settings is grouped; History shows product colours and payment chips; the product editor's colour field is a live preview of the tile.
- Subtle motion throughout (screen fade, staggered card/row entrance, bar growth, sheet slide, toast pop), all off with the system reduce-motion setting.
- Android back (button or gesture) now steps back inside the app: it closes the colour picker, options menu or sheet first, then follows the screen's back arrow, then returns to Sell; on Sell it puts the app in the background. Before, it closed the app. Adds `@capacitor/app`.
- Compact Sell tiles (4 fit on a 412×892 screen) and 2-column Event tiles.
- Small buttons (undo, Import sales, currency picker) have 44px tap areas; Products shows price and cost on separate lines so neither is cut off.

### Fixed
- The colour picker kept following the finger after Android cancelled a drag (e.g. a system back swipe).
- Very long amounts no longer push the page wider than the screen.
- Icons and the font no longer depend on the internet (they were loaded from Google Fonts, so offline the icons showed as words like "add" and "delete").

### Project
- Added an MIT `LICENSE`; rewrote the README (features, setup, Android builds, data and backup limits, testing, license) with screenshots in `docs/screenshots/`.
- Added `HANDOFF.md` for session-to-session context, and a rule in `CLAUDE.md`/`AGENTS.md` to read it first.
- Removed the unused `@types/node` dev dependency, the unused `escapeHtml` helper and an unused CSS class.

## 2026-10-26 (merged to `main`)

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
- The colour presets in the product editor no longer overflow the picker on phones (swatches had a 44px minimum width).
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
