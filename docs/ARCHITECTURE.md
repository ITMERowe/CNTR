# Architecture

CNTR is a single-page app with no backend. `index.html` holds every screen and dialog shell; TypeScript fills them in. Screens whose content changes are rendered with [Preact](https://preactjs.com) (React-style components, ~4 KB); static controls are wired once with plain DOM listeners.

## Source layout

```
src/
  main.ts              Controller: wires static controls once, owns render(), handles dialogs
  state.ts             App state and every rule for changing it (no DOM)
  storage.ts           In-memory data with write-through to the store, startup, settings cache
  kv.ts                Key-value stores: SQLite (phone) and localStorage (browser / fallback)
  migrate.ts           One-time, verified copy of legacy localStorage data into SQLite
  backup.ts            Backup format, validation and CSV (no runtime imports; tested by tests/)
  files.ts             Save backup files (Documents/CNTR + share sheet) and pick a file to restore
  tutorial.ts          The hands-on tour: practice data, the steps, and the hint bubble
  feedback.ts          Haptics (phone) and soft Web Audio tones (Settings → Sound)
  theme.ts             Light/dark: sets <html data-theme>; "Phone setting" follows prefers-color-scheme live
  i18n.ts              English + Bahasa Indonesia dictionaries, t() / tn(), locale(), first-launch language, data-i18n markup
  groups.ts            Product groups: report names ("Poster A3"), Sell tiles per group, shared colour/payments, the group form's save plan
  reports.ts           Pure report maths: totals, product breakdowns, compare rows
  formatters.ts        Money formatting/parsing, colour helpers
  data.ts              Default products, product-history helper, UUIDs
  types.ts             Shared types
  ui/
    dom.ts             Element refs, toast, confirm dialog, scroll lock, openScreen()
    productEditor.ts   Add / edit / remove product screen (colour field = live tile preview); Group switch = a whole group with its variant rows
    colorPicker.ts     HSV colour picker
    icons.ts           Bundled Lucide SVG icons; hydrateIcons() fills <i data-icon> in index.html
  views/               Preact components
    SalesGrid.tsx      Sell tab tiles (counters, undo, haptic-triggering callbacks)
    SalesHero.tsx      Revenue total at the top of the Sell tab (count-up animation)
    EventScreen.tsx    Event tab (live) and a past event in History (read-only or editing)
    Lists.tsx          Recent sales, Products, past-event list, compare checklist
    Compare.tsx        Compare sales / compare events
    ReportParts.tsx    Shared pieces: hero figure, KPI tiles, payment split, hourly chart, product rows, empty states
    Icon.tsx           SVG icon component
```

Dependencies point one way: `views/` and `ui/` read `state.ts`; `state.ts` never touches the DOM; `main.ts` connects them. Modules that need to trigger a re-render get a callback (e.g. `initProductEditor(productsChanged)`) instead of importing `main.ts`.

## Data model

| Type | Meaning |
|---|---|
| `Product` | `name`, `price`, `cost`, `color`, `payments` (1–2 of `PAYMENT_METHODS` in `src/payments.ts`; missing on older data = Cash + QRIS). Optional `group`: products sharing it are one Sell tile (one row per variant) and share the group's colour and payments; the name is the full "Group Variant" and reports ignore the group. Products have an `id`; new sales store it as `productId`, and older sales (before ids) match by name, so names stay unique (case-insensitive). |
| `SaleRecord` | One sell tap: product name and `productId`, price and cost *at the time*, payment (one of `PAYMENT_METHODS`, or `Free` for price 0), timestamp. |
| `EventCost` | An event expense: `id`, `name`, `amount`, optional `productIds` (the products it pays for: in that event their per-item cost counts as 0, see `withLinkedCosts()`). |
| `LiveEventMeta` | The live event's `id`, `name` (null = default "Event <date>"), `startedAt` and `dayBreaks` (times End day was pressed). Its sales and expenses are the live `cntrSales` / `cntrEventCosts`. |
| `PastEvent` | A finished event: name, dates, `dayBreaks`, a `products` snapshot (colours and prices for edits), `sales`, `expenses`. |

Event maths live in `src/events.ts` (pure, Node-tested): `splitDays()` (a sale belongs to the first day whose break is after it), `todaySales()`, `eventSummary()` (net = product profit − expenses), `adjustCount()` (History edits), `snapshotProducts()`. Every screen, Compare and the CSV use them, so totals always agree.

Because older sales match by name, the product editor refuses a name that collides with another product, ignoring case (it would merge them). Renaming a product also renames its recorded sales.

Groups are made in the editor: with the Group switch on it edits the whole group (group name, shared colour and payments, one row per variant). `planGroup` (`groups.ts`) turns the form into the products to save and hide, all or nothing: existing variants keep their ids (sales and expense links follow), a removed row is hidden like Delete, and a clashing group or name refuses the save. Opening any grouped product opens its whole group; the switch turns off only with one variant left (`ungroup`).

## State

`state.ts` exports one mutable `state` object: `products`, `productHistory`, `sales` and `eventCosts` (the live event's), `liveEvent` (its name and day breaks) and `pastEvents`. Change it only through the functions in `state.ts` (`recordSale`, `addExpense`, `endDay`, `endEvent`, `replacePastEvent`, ...): they apply the rules and persist the result. Then call `render()`.

The Sell tab shows `todayLiveSales()` (after the last End day); `removeLastSale()` never reaches an ended day. Editing a past event works on a copy (`draft` in `main.ts`); Save replaces the stored event after an automatic backup, Cancel or Android back drops it.

## Storage

Data is a set of JSON values under these keys. On the phone they live in an SQLite table `kv (key, value)` in the app's private storage (`src/kv.ts`; iOS: `Library/CapacitorDatabase`, not iCloud-synced). `readAll()` reads each value in 250,000-character pieces, because Android reads a result row through a 2 MB window and all past events are one value. In a browser they stay in `localStorage`. The JSON format is the same in both and in backups.

| Key | Contents |
|---|---|
| `cntrProducts` | Active products (the tiles on the sales screen) |
| `cntrProductHistory` | Every product ever created, including deactivated ones |
| `cntrSales` | The live event's sales (all days) |
| `cntrEventCosts` | The live event's expenses |
| `cntrLiveEvent` | The live event's name, start and day breaks (`LiveEventMeta`); created on first launch from the existing sales |
| `cntrEvents` | Past events (`PastEvent[]`), oldest first |
| `cntrSettings` | Currency, compact money, products per day, new day on date change, sort by best sellers, compact tiles, `collapsedGroups` (folded Sell groups, lowercased), sound effects, `theme` (light/dark, resolved from the phone once), `language` (en/id; saved on first launch: `id` only for a fresh install on an Indonesian phone) |

- List loaders only accept arrays, so corrupt data falls back to empty instead of crashing startup.
- Settings are cached in memory (`fmt()` runs for every amount on screen); `saveSettings()` invalidates the cache.
- Old saved reports (`cntrSavedReports`, `cntrImportedEventReport`) were dropped when events replaced them: no longer read, backed up or restored, but never deleted. The first launch with events writes one automatic backup that still includes them (`cntr-auto-<timestamp>-saved-reports.json`). Restoring an old backup brings back its live sales and expenses as the live event.
- **Days are split by time**, so `saleTime()` / `breakTime()` stamp a sale after the last End day and an End day after every sale, even if the phone's clock was set back. Editing a product's price applies only to sales made after it; every sale keeps the price it was sold at.
- **Writes made in the same tick go into one all-or-nothing batch** (`flush()` waits one microtask), so End event, which writes `cntrEvents`, `cntrSales`, `cntrEventCosts` and `cntrLiveEvent`, can never be half-applied.
- **Reads are synchronous** from an in-memory copy loaded by `initStorage()` before the app starts (`main.ts` `start()`, then `initState()`). **Writes** update that copy at once and are written to the store in order, a few milliseconds later. A failed write (e.g. disk full) is kept, retried every 5 s, and shown in a warning banner until it succeeds; it is never dropped.
- **Migration** (`migrate.ts`, first launch on the phone): copy the legacy `localStorage` keys into SQLite, read them back and compare, then set `cntrMeta.migratedFromLocalStorage`. The legacy copy is never changed or deleted. Rerunning is harmless: values are written by key, and once the flag is set it does nothing. If the database cannot be opened before migration ever succeeded, the app keeps running on `localStorage` (still the only, current copy) with a warning and retries next launch. Once the database has been used (`cntrMeta.usingDatabase` in `localStorage`), a database failure shows a "Try again" screen instead, because the old copy is stale.
- **Backup** (`backup.ts`): `{ app: "CNTR", format: 1, exportedAt, data: { <key>: <parsed value> } }`. `parseBackup()` validates every record before anything changes and rejects the whole file on any problem. Restore saves a safety copy (`Documents/CNTR/cntr-before-restore-*.json`, else app-private storage), writes all keys in one SQLite transaction (keys missing from the backup are deleted), then reloads.
- `cntrMeta.lastBackup` (when the last backup was exported) is not part of backups.
- **Automatic backups** (`main.ts` `withAutoBackup()`, `files.ts` `saveAutoBackup()`): before ending an event, saving an edit to a past event or deleting one, a full backup is written to `Documents/CNTR/auto/cntr-auto-<timestamp>.json` (app-private storage if Documents is refused); the newest 20 are kept. If it fails before a destructive action, the user is asked before going ahead. Native only; the browser build writes nothing.
- **Tutorial** (`tutorial.ts`, `storage.ts` `startTutorialData()` / `endTutorialData()`): offered once on an empty first launch (`cntrMeta.tutorialOffered`), and from Settings → Show tutorial. Starting writes, in one all-or-nothing step, the practice data over the data keys and a copy of the real data under `cntrMeta.tutorialSavedData` (not a data key, so never in a backup), then reloads with `cntrTourRunning` in `sessionStorage`. Finish or Quit writes the real data back and drops the copy, again in one step. A launch that finds the copy but no `cntrTourRunning` (the app was closed mid-tour) puts the real data back before anything else. While practice data is in place, automatic backups are skipped and Export, CSV and Restore are refused. The tour polls each step's `done()` every 250 ms. It is on rails: a capture-phase guard on `window` swallows taps outside the bubble, the step's target and its `allow` list (and Cancel/close/back buttons inside the target), Escape is swallowed, and `goBack()` does nothing while `tourRunning()`.

## Tile colours

Tiles take the product colour as `--tile`. `needsDarkText()` (`formatters.ts`) gives dark text only when white would fall below 2.6:1 on that colour (owner's choice: white stays on pink, green, orange; yellow, beige and pastels get dark); then the tile (and the product editor's preview) gets `.on-light`, which swaps the `--ink` tokens to dark.

## Rendering

`render()` in `main.ts` is the single refresh. It renders each Preact view (revenue hero, sales tiles, reports, lists) into its container (`renderView(h(EventScreen, props), el.eventReport)`). Preact diffs against the previous render, so calling it after every change is cheap.

- **Views are pure**: they receive data and callbacks as props and never read `state` or `localStorage` themselves.
- **Sales tiles** are the `SalesGrid` component. A counter's element is re-keyed when its value changes, which restarts its CSS roll animation; `pulse` says which counter changed and in which direction.
- **Dialogs** are bottom sheets: static shells in `index.html` opened by toggling `.open`. The compare list is a Preact `EventChecklist`, and the confirm handler reads the checked inputs. The name sheet (`saveModal*`) is shared by rename, End event and rename-while-editing.
- **Haptics** (`@capacitor/haptics`) fire on add/undo, on the native app only.

## Navigation

`openScreen(id)` in `ui/dom.ts` is the only way to change screens. Besides toggling the `.screen.active` section it highlights the bottom-nav tab (sub-screens map to their parent via `PARENT_TAB`), shows the revenue hero only on the Sell screen, and sets the header buttons for that screen. Add new screens to `index.html` as a `<section class="screen">` and, if they are a sub-screen, to `PARENT_TAB`.

**Android back** (`@capacitor/app` `backButton`, native only) runs `goBack()` in `main.ts`: it closes the colour picker or an open sheet (by clicking its `…CloseBtn`), else cancels an edit of a past event, else clicks the active screen's visible `.back-btn`, else opens Sell, else minimises the app. A new sub-screen therefore needs a `.back-btn` for back to work there.

## Conventions

- **New UI is a Preact component** in `views/`. Pass data and callbacks as props; Preact escapes text, so never use `dangerouslySetInnerHTML` for user input.
- **Wire static elements once** at startup; never attach listeners inside `render()`.
- **Confirm destructive actions** with `openConfirmModal()` (End day, End event, delete an event, remove a product).
- **Styling** uses the tokens at the top of `src/style.css`: surfaces (`--bg`, `--surface-1..3`, VS Code dark palette), text (`--text`, `--text-2`, `--text-3`, all >= 4.5:1), meaning (`--positive`, `--negative`, `--cash`, `--qris`), radii, a 4/8px spacing scale, a 5-step type scale with 2 weights, and motion. Never hard-code a colour or a size in a component. Every token and component rule: [`DESIGN.md`](DESIGN.md).
- **Product colours** are shown exactly as chosen; tile text and icons are white, or `#1e1e1e` where white falls below 2.6:1 (see Tile colours).
- **Motion** uses only the motion tokens (`--dur-tap` 120ms, `--dur-1` 200ms, `--dur-2` 280ms, `--dur-3` 420ms; `--ease-out` to enter, `--ease-in` to exit) and animates only `transform`/`opacity`. `prefers-reduced-motion` turns it all off.
- **Charts** follow the dataviz rules: thin bars with 4px rounded data-ends, a hairline baseline, values in text colour (never series colour), a written fallback instead of a one-bar chart. `--cash`/`--qris` were validated as a colour-blind-safe pair on the card surface; re-validate if you change either or the surface.
- **Icons**: add new ones to `ICONS` in `ui/icons.ts` (Lucide), never an icon font or emoji.
- Buttons and menu items use sentence case; user-entered names are shown exactly as typed.
- `tsconfig.json` has `noUnusedLocals`/`noUnusedParameters` on: dead code fails `npm run build`.

## Build pipeline

`npm run build` (type-check + Vite) → `dist/` → `npx cap sync android` copies it into the Android project → Gradle builds the APK. `.github/workflows/build-apk.yml` runs these steps on every push and uploads the APK as an artifact named `CNTR_<versionName>.apk`.

Versioning: `android/app/build.gradle` sets `versionName` from `package.json` (CI adds `VERSION_SUFFIX` on non-release builds) and `versionCode = BUILD_NUMBER` (the GitHub Actions run number; local builds use 1), so every CI build is newer, as Android and Google Play require.

Platform: Capacitor 8, Android `compileSdk`/`targetSdk` 36, `minSdk` 24 (Android 7.0), Android Gradle Plugin 8.13, Gradle 8.14.3, JDK 21.

## Themes and languages

- **Themes**: `:root` holds the Dark+ tokens; `:root[data-theme="light"]` overrides them with Light+ (`--bg #ffffff`, `--surface-1 #f3f3f3`, `--text #1e1e1e`, `--positive #116329`, `--negative #c72c1c`, `--on-negative`, `--bar-bg`). The phone's setting (`matchMedia`) only picks the first theme on a fresh install; after that it is the user's Dark theme switch. `applyTheme()` also updates `<meta name="theme-color">`. Tile colours do not change with the theme.
- **Languages**: every user-facing string is a key in `src/i18n.ts` (`en`, and `id: Record<Key, string>` so a missing translation fails the build). Static markup uses `data-i18n` (text) and `data-i18n-aria` / `-title` / `-placeholder`; `translateStatic()` fills them on start and on a language change, then `render()` redraws the views. Counts use `tn()` with English `"one|other"` forms. Never translated: payment method names, CSV headers, user-typed text. `tests/e2e/i18n.test.mjs` walks every screen in Indonesian and fails on leftover English words.

## Requirements

What every change must keep true (the product reasons are in `PRODUCT.md`):

- **Offline only:** no INTERNET permission, no network request, every asset bundled (font, icons). The Content-Security-Policy in `index.html` blocks anything else.
- **A sale never waits:** a sell tap updates the screen in the same frame; the write follows a few ms later and is retried, never dropped. Work done on every render must not grow with History (cache per event, as `EventList` does).
- **No data loss:** destructive actions confirm first; restore validates the whole file before changing anything; writes in one tick are all-or-nothing.
- **Scale:** years of events (about 200,000 sales) must still start, back up (compact JSON, restore cap 200 MB) and stay responsive.
- **Security:** user text is never HTML (Preact escapes it); CSV cells that start like a formula get a leading `'`; FileProvider shares only `Documents/CNTR` and CNTR's cache; backups are validated at the trust boundary with length caps.
- **Platforms:** Android 7.0+ (`minSdk` 24), phones from 320px wide up to tablets; light and dark; English and Bahasa Indonesia; respects reduce-motion and system text size.

## Testing and release

- `npx tsc --noEmit` and `npm test` (Node unit tests in `tests/*.test.ts`: event maths, groups, storage and backups, payments, i18n, config).
- `npm run build`, then `npm run test:e2e`: browser suites in `tests/e2e/` against `vite preview` (port 4320, or `CNTR_URL`), including a fake Android bridge with an in-memory SQLite for data-safety. A new screen, flow or rule gets a check there.
- CI (`.github/workflows/build-apk.yml`) runs the browser tests, then builds a signed APK on every push. Branches: `dev` (daily work) → `main` (tested) → `playstore` (releases only: a push there creates the GitHub Release and uploads to Google Play). Release notes come from the version's section in `CHANGELOG.md`.
