# Architecture

CNTR is a single-page app with no framework and no backend. `index.html` holds every screen and dialog; `src/main.ts` shows and hides them and re-renders their contents from in-memory state.

## Data model

| Type | Meaning |
|---|---|
| `Product` | `name`, `price`, `cost`, `color`. **The name is the identity key**: sales, history and reports all refer to products by name. |
| `SaleRecord` | One tap of **+**: product name, price and cost *at the time*, payment (`Cash`/`QRIS`), timestamp. |
| `EventCost` | An event expense: `id`, `name`, `amount`. |
| `SavedReport` | A frozen snapshot (`type: 'sales' \| 'event'`) of products, sales and expenses. |

Because names are identity, the product editor refuses a rename that would collide with an existing product (it would merge them). Renaming a product also renames its recorded sales.

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
- Settings are cached in memory (`fmt()` runs hundreds of times per render); `saveSettings()` invalidates the cache.
- Saved reports are re-read from storage when needed rather than cached, so a mutated copy never leaks between screens.
- Saving never throws to the UI: a full storage quota is logged to the console.

## State and rendering

Module-level state in `main.ts`: `products`, `productHistory`, `tx` (live sales), `eventCosts`, `importedEventReport`, and `previewReport` (a saved report currently being viewed).

- **`render()`** is the single refresh: it updates tile counters, the header stats, both report cards, and every history list. Call it after any state change.
- **`makeTiles()`** rebuilds the product tiles; only needed when the product list itself changes (`rebuildGrid()`).
- **`getEventView()`** decides what the event screen shows: the previewed saved event report if there is one, otherwise the live imported event. Saving an event report and editing expenses both go through it, so they always act on what is on screen.

## Navigation

`openScreen(id)` is the only way to change screens. Besides toggling the `.screen.active` section it also:

- highlights the bottom-nav tab (sub-screens map to their parent via `PARENT_TAB`),
- shows the Revenue/Profit bar only on the sales screen,
- calls `hideScreenActions()` to show the header buttons that make sense for that screen (add product, clear, options).

Add new screens to `index.html` as a `<section class="screen">` and, if they are a sub-screen, to `PARENT_TAB`.

## Conventions

- **Escape user text.** Anything a user typed (product, report and expense names) must go through `escapeHtml()` before it is put into an HTML template string.
- **Wire static elements once.** Listeners on markup that lives in `index.html` are attached at startup. Content that `render()` rebuilds (the event card) uses one delegated listener on its container. Never attach listeners inside `render()`.
- **Confirm destructive actions** with `openConfirmModal()` (clear sales, delete report, remove product).
- **Styling** uses the tokens at the top of `src/style.css` (`--text`, `--label`, `--muted`, `--danger`, `--success`, ...) instead of one-off colours. Headings are title-cased by CSS; buttons and menu items use sentence case; user-entered names are shown exactly as typed.

## Build pipeline

`npm run build` → `dist/` → `npx cap sync android` copies it into `android/app/src/main/assets/public` → Gradle builds the APK. `.github/workflows/build-apk.yml` runs exactly these steps on every push and uploads `app-debug.apk` as an artifact.
