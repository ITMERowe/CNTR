# Architecture

CNTR is a single-page app with no backend. `index.html` holds every screen and dialog shell; TypeScript fills them in. Screens whose content changes are rendered with [Preact](https://preactjs.com) (React-style components, ~4 KB); static controls are wired once with plain DOM listeners.

## Source layout

```
src/
  main.ts              Controller: wires static controls once, owns render(), handles dialogs
  state.ts             App state and every rule for changing it (no DOM)
  storage.ts           localStorage read/write, settings cache
  reports.ts           Pure report maths: totals, product breakdowns, compare rows
  formatters.ts        Money formatting/parsing, colour helpers
  data.ts              Default products, product-history helper, UUIDs
  types.ts             Shared types
  ui/
    dom.ts             Element refs, toast, confirm dialog, scroll lock, openScreen()
    productEditor.ts   Add / edit / remove product screen (colour field = live tile preview)
    colorPicker.ts     HSV colour picker
    icons.ts           Bundled Lucide SVG icons; hydrateIcons() fills <i data-icon> in index.html
  views/               Preact components
    SalesGrid.tsx      Sell tab tiles (counters, undo, haptic-triggering callbacks)
    SalesHero.tsx      Revenue total at the top of the Sell tab (count-up animation)
    SalesReport.tsx    Reports tab
    EventReport.tsx    Event tab (expenses, top products)
    Lists.tsx          Recent sales, Products, saved-report lists, report checklists
    Compare.tsx        Compare sales / compare events
    ReportParts.tsx    Shared pieces: hero figure, KPI tiles, payment split, hourly chart, product rows, empty states
    Icon.tsx           SVG icon component
```

Dependencies point one way: `views/` and `ui/` read `state.ts`; `state.ts` never touches the DOM; `main.ts` connects them. Modules that need to trigger a re-render get a callback (e.g. `initProductEditor(productsChanged)`) instead of importing `main.ts`.

## Data model

| Type | Meaning |
|---|---|
| `Product` | `name`, `price`, `cost`, `color`. **The name is the identity key**: sales, history and reports all refer to products by name. |
| `SaleRecord` | One tap of **+**: product name, price and cost *at the time*, payment (`Cash`/`QRIS`), timestamp. |
| `EventCost` | An event expense: `id`, `name`, `amount`. |
| `SavedReport` | A frozen snapshot (`type: 'sales' \| 'event'`) of products, sales and expenses. |
| `EventView` | What the event screen shows: a previewed saved event report, else the live imported event. |

Because names are identity, the product editor refuses a rename that would collide with an existing product (it would merge them). Renaming a product also renames its recorded sales.

## State

`state.ts` exports one mutable `state` object: `products`, `productHistory`, `sales` (live), `eventCosts` (live), `importedEventReport`, and `previewReport` (a saved report being viewed). Change it only through the functions in `state.ts` (`recordSale`, `addExpense`, `importEventSales`, `saveCurrentReport`, ...): they apply the rules and persist the result. Then call `render()`.

`getEventView()` is the single answer to "what is the event screen showing?". Saving an event report and editing expenses both go through it, so they always act on what is on screen.

## Storage

Everything lives in `localStorage` as JSON (`src/storage.ts`):

| Key | Contents |
|---|---|
| `cntrProducts` | Active products (the tiles on the sales screen) |
| `cntrProductHistory` | Every product ever created, including deactivated ones |
| `cntrSales` | Live sales for the current session |
| `cntrEventCosts` | Live event expenses |
| `cntrImportedEventReport` | Sales + products imported into the live event screen |
| `cntrSavedReports` | All saved sales and event reports |
| `cntrSettings` | Currency and compact-money preference |

- List loaders only accept arrays, so corrupt data falls back to empty instead of crashing startup.
- Settings are cached in memory (`fmt()` runs for every amount on screen); `saveSettings()` invalidates the cache.
- Saved reports are re-read from storage when needed rather than cached, so a mutated copy never leaks between screens.
- A failed write (e.g. storage full) is logged, not thrown.

## Rendering

`render()` in `main.ts` is the single refresh. It renders each Preact view (revenue hero, sales tiles, reports, lists) into its container (`renderView(h(SalesReport, props), el.report)`). Preact diffs against the previous render, so calling it after every change is cheap.

- **Views are pure**: they receive data and callbacks as props and never read `state` or `localStorage` themselves.
- **Sales tiles** are the `SalesGrid` component. A counter's element is re-keyed when its value changes, which restarts its CSS roll animation; `pulse` says which counter changed and in which direction.
- **Dialogs** are bottom sheets: static shells in `index.html` opened by toggling `.open`. Their lists (compare, import) are Preact `ReportChecklist`s, and the confirm handlers read the checked inputs.
- **Haptics** (`@capacitor/haptics`) fire on add/undo, on the native app only.

## Navigation

`openScreen(id)` in `ui/dom.ts` is the only way to change screens. Besides toggling the `.screen.active` section it highlights the bottom-nav tab (sub-screens map to their parent via `PARENT_TAB`), shows the revenue hero only on the Sell screen, and sets the header buttons for that screen. Add new screens to `index.html` as a `<section class="screen">` and, if they are a sub-screen, to `PARENT_TAB`.

**Android back** (`@capacitor/app` `backButton`, native only) runs `goBack()` in `main.ts`: it closes the colour picker, the options menu or an open sheet (by clicking its `…CloseBtn`), else clicks the active screen's visible `.back-btn`, else opens Sell, else minimises the app. A new sub-screen therefore needs a `.back-btn` for back to work there.

## Conventions

- **New UI is a Preact component** in `views/`. Pass data and callbacks as props; Preact escapes text, so never use `dangerouslySetInnerHTML` for user input.
- **Wire static elements once** at startup; never attach listeners inside `render()`.
- **Confirm destructive actions** with `openConfirmModal()` (clear sales, delete report, remove product).
- **Styling** uses the tokens at the top of `src/style.css`: surfaces (`--bg`, `--surface-1..3`, VS Code dark palette), text (`--text`, `--text-2`, `--text-3`, all >= 4.5:1), meaning (`--positive`, `--negative`, `--cash`, `--qris`), radii, a 4/8px spacing scale and motion. Never hard-code a colour in a component.
- **Product colours** are shown exactly as chosen; text and icons on a tile are always white. Light colours (e.g. yellow) give white text low contrast, so prefer mid-to-dark colours for products.
- **Motion** uses only the motion tokens (`--dur-tap` 120ms, `--dur-1` 200ms, `--dur-2` 280ms, `--dur-3` 420ms; `--ease-out` to enter, `--ease-in` to exit) and animates only `transform`/`opacity`. `prefers-reduced-motion` turns it all off.
- **Charts** follow the dataviz rules: thin bars with 4px rounded data-ends, a hairline baseline, values in text colour (never series colour), a written fallback instead of a one-bar chart. `--cash`/`--qris` were validated as a colour-blind-safe pair on the card surface; re-validate if you change either or the surface.
- **Icons**: add new ones to `ICONS` in `ui/icons.ts` (Lucide), never an icon font or emoji.
- Buttons and menu items use sentence case; user-entered names are shown exactly as typed.
- `tsconfig.json` has `noUnusedLocals`/`noUnusedParameters` on: dead code fails `npm run build`.

## Build pipeline

`npm run build` (type-check + Vite) → `dist/` → `npx cap sync android` copies it into the Android project → Gradle builds the APK. `.github/workflows/build-apk.yml` runs these steps on every push and uploads the APK as an artifact named `CNTR_<versionName>.apk`.

Versioning: `android/app/build.gradle` reads `BUILD_NUMBER` (CI passes the GitHub Actions run number; local builds use 1) and sets `versionCode = BUILD_NUMBER` and `versionName = 1.0.BUILD_NUMBER`, so every CI build is a newer version, as Android and Google Play require.

Platform: Capacitor 8, Android `compileSdk`/`targetSdk` 36, `minSdk` 24 (Android 7.0), Android Gradle Plugin 8.13, Gradle 8.14.3, JDK 21.
