# Architecture

CNTR is a single-page app with no backend. `index.html` holds every screen and dialog shell; TypeScript fills them in. Screens whose content changes are rendered with [Preact](https://preactjs.com) (React-style components, ~4 KB); static controls are wired once with plain DOM listeners.

## Source layout

```
src/
  main.ts              Controller: wires static controls once, owns render(), handles dialogs
  state.ts             App state and every rule for changing it (no DOM)
  storage.ts           localStorage read/write, settings cache
  reports.ts           Pure report maths: totals, product breakdowns, compare rows
  formatters.ts        Money formatting/parsing, colour helpers, escapeHtml
  data.ts              Default products, product-history helper, UUIDs
  types.ts             Shared types
  ui/
    dom.ts             Element refs, toast, confirm dialog, scroll lock, openScreen()
    productEditor.ts   Add / edit / remove product screen
    colorPicker.ts     HSV colour picker
  views/               Preact components
    SalesReport.tsx    Reports tab
    EventReport.tsx    Event tab (expenses, top products)
    Lists.tsx          Recent sales, Products, saved-report lists, report checklists
    Compare.tsx        Compare sales / compare events
    ReportParts.tsx    Shared pieces: summary tiles, product rows, icons
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

`render()` in `main.ts` is the single refresh. It updates the header stats and tile counters, then renders each Preact view into its container (`renderView(h(SalesReport, props), el.report)`). Preact diffs against the previous render, so calling it after every change is cheap.

- **Views are pure**: they receive data and callbacks as props and never read `state` or `localStorage` themselves.
- **Sales tiles** are still plain DOM (`makeTiles()`), rebuilt only when the product list or currency changes (`productsChanged()`); counters are updated in place so the tap animation is smooth.
- **Dialogs** are static shells in `index.html`; their lists (compare, import) are Preact `ReportChecklist`s, and the confirm handlers read the checked inputs.

## Navigation

`openScreen(id)` in `ui/dom.ts` is the only way to change screens. Besides toggling the `.screen.active` section it highlights the bottom-nav tab (sub-screens map to their parent via `PARENT_TAB`), shows the Revenue/Profit bar only on the sales screen, and sets the header buttons for that screen. Add new screens to `index.html` as a `<section class="screen">` and, if they are a sub-screen, to `PARENT_TAB`.

## Conventions

- **New UI is a Preact component** in `views/`. Pass data and callbacks as props; Preact escapes text, so never use `dangerouslySetInnerHTML` for user input.
- **Legacy string templates** (sales tiles, header stats) must pass user text through `escapeHtml()`.
- **Wire static elements once** at startup; never attach listeners inside `render()`.
- **Confirm destructive actions** with `openConfirmModal()` (clear sales, delete report, remove product).
- **Styling** uses the tokens at the top of `src/style.css` (`--text`, `--label`, `--muted`, `--danger`, `--success`, ...) instead of one-off colours. Headings are title-cased by CSS; buttons and menu items use sentence case; user-entered names are shown exactly as typed.
- `tsconfig.json` has `noUnusedLocals`/`noUnusedParameters` on: dead code fails `npm run build`.

## Build pipeline

`npm run build` (type-check + Vite) → `dist/` → `npx cap sync android` copies it into the Android project → Gradle builds the APK. `.github/workflows/build-apk.yml` runs these steps on every push and uploads the APK as an artifact named `CNTR_<versionName>.apk`.

Versioning: `android/app/build.gradle` reads `BUILD_NUMBER` (CI passes the GitHub Actions run number; local builds use 1) and sets `versionCode = BUILD_NUMBER` and `versionName = 1.0.BUILD_NUMBER`, so every CI build is a newer version, as Android and Google Play require.

Platform: Capacitor 8, Android `compileSdk`/`targetSdk` 36, `minSdk` 24 (Android 7.0), Android Gradle Plugin 8.13, Gradle 8.14.3, JDK 21.
