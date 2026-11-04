# CNTR design tokens

The visual system in one page. Every token lives at the top of `src/style.css` (`:root` = dark, `:root[data-theme="light"]` = light). Use the token, never the literal. If this file and the CSS disagree, the CSS wins: fix this file. Screens and flows: [`APP-FLOW.md`](APP-FLOW.md). Code, data and storage: [`ARCHITECTURE.md`](ARCHITECTURE.md) (tile colours, themes and languages there too).

## Colour

Quiet VS Code shell so product colours carry the personality. Text tokens are all >= 4.5:1 on every surface in both themes (checked by `tests/e2e/layout.test.mjs`).

| Token | Dark (Dark+) | Light (Light+) | Use |
|---|---|---|---|
| `--bg` | `#1e1e1e` | `#ffffff` | Page |
| `--surface-1` | `#252526` | `#f3f3f3` | Cards, sheets, inputs |
| `--surface-2` | `#2d2d2d` | `#e8e8e8` | Secondary buttons, selects |
| `--surface-3` | `#37373d` | `#e4e6f1` | Switch track (off) |
| `--line` / `--line-strong` | white 8% / 14% | black 10% / 18% | Dividers / input borders |
| `--scrim` | black 62% | black 40% | Behind sheets |
| `--selection` | `#264f78` | `#add6ff` | Text selection |
| `--text` | `#e7e7e7` | `#1e1e1e` | Primary text |
| `--text-2` | `#cccccc` | `#3b3b3b` | Secondary text |
| `--text-3` | `#9d9d9d` | `#616161` | Quiet text (labels, meta). Never fainter than this. |
| `--on-ink` | `#1e1e1e` | `#ffffff` | Text on `--text` fills (toast, compare tag) |
| `--accent` | `#8b93ff` | `#4338ca` | The one accent (indigo, owner's pick 2026-11-03 over cyan, oranges, lime and gradients; blue-violet between the QRIS blue and Card violet): primary buttons, solid icon buttons, switches and checkboxes when on, the tab pill. Never on tiles (product colour) or money (green/red). |
| `--on-accent` | `#12143a` | `#ffffff` | Text and icons on `--accent` (6.5:1 dark, 7.9:1 light) |
| `--positive` | `#4ade80` | `#116329` | Profit |
| `--negative` | `#ff6b5e` | `#c72c1c` | Deficit, danger buttons |
| `--on-negative` | `#1d0806` | `#ffffff` | Text on danger buttons |

Payment methods (same in both themes, fixed order from `src/payments.ts`): `--cash #c08024`, `--qris #4d8df0`, `--transfer #199e70`, `--card #9085e9`, `--ewallet #d55181`; `--free #8a8a93` for a price-0 counter. Every use is also labelled by name.

**Focus:** `:focus-visible` = 2px `--text` outline, 2px offset; switches and checkboxes ring their visible part.

**Tile ink rule:** a tile's background is the product colour (`--tile`), shown exactly as chosen in both themes. Its text and icons use `--ink` (white) with `--ink-soft` / `--ink-faint` / `--ink-line` fills. `needsDarkText()` (`src/formatters.ts`) computes white's contrast on the colour; below **2.6:1** (`MIN_WHITE_CONTRAST`) the tile gets `.on-light`, which swaps the ink to `#1e1e1e`. Tile text is never faded with opacity where that drops it under 2.6:1.

## Type

One family: Plus Jakarta Sans (bundled variable font, `--font`).

| Token | Size | Role |
|---|---|---|
| `--fs-xs` | 12px | Labels, captions, meta, chips, tab labels, payment labels |
| `--fs-sm` | 14px | Secondary text, notes, toasts, long tile names, setting values |
| `--fs-md` | 16px | Body (`html`), buttons, row/card titles, variant names, long tile and group names |
| `--fs-lg` | 20px | Sheet titles, report numbers (KPIs), compact counts, tile names and group titles (one size, both modes) |
| `--fs-xl` | 26px | Page titles, event name, single-tile counts |

- Off-scale sizes are listed under [Exceptions](#exceptions); nothing else may leave the scale.
- **Two weights:** `--fw-regular` 500 (body, secondary, meta) and `--fw-bold` 700 (headings, names, counts, buttons, labels). Nothing else.
- **Line-height:** `--lh-tight` 1.15 for headings, names and numbers; `--lh-body` 1.45 for sentences.
- **Caps:** only short labels: payment method names on tiles, the hero label (`.eyebrow`, e.g. NET PROFIT), month in date blocks, hex codes. Headings, buttons and sentences are sentence case.
- Hierarchy comes from size, weight, colour (`--text` > `--text-2` > `--text-3`) and space: one clear title per screen or card, numbers prominent, meta quiet.

## Space, shape, depth

- **Spacing (4/8 rhythm):** `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 20, `--s6` 24, `--s8` 32px. Page side padding `--page-x` = `--s4` (`--s3` at <= 360px).
- **Radii:** `--r-sm` 10px (small controls, wrappers), `--r-md` 14px (buttons, inputs), `--r-lg` 20px (cards, tiles, sheets), `--r-pill` 999px (chips, switches, toasts, handles), `50%` for round icons.
- **Nothing square:** every element that can be a tutorial target or focus ring gets at least `--r-sm` (the zero-specificity `:where(...)` list near the top of `style.css`); the tour's ring follows the target's radius. Exceptions: divider rows and ellipsis-clipped labels.
- **Elevation:** flat surfaces separated by `--line`; shadows only on floating layers, from two tokens: `--shadow-float` (`0 12px 32px` black 40%: menus, toast, dragged tile, tour bubble) and `--shadow-sheet` (`0 24px 60px` black 55%: colour picker). The one inset edge is the sell button's (see Tile).

## Motion

- Durations: `--dur-tap` 120ms (press), `--dur-1` 200ms, `--dur-2` 280ms, `--dur-3` 420ms (list/tile entrance), `--dur-hold` 700ms (hold to delete; `HOLD_MS` in `src/ui/dom.ts` must match), `--dur-liquid` 340ms (tab pill only).
- Easing: `--ease-out` to enter and to exit (never ease-in: it delays the moment the user watches), `--ease-emphasis` for a small overshoot (count roll), `--ease-liquid` (a spring as a `linear()` curve, 4.6% overshoot; tab pill only).
- Animate `transform` / `opacity` only (the sell button's edge also eases its inset `box-shadow`; the tab pill moves its `left`/`right` edges). `prefers-reduced-motion: reduce` sets every animation and transition to 1ms (and drops the tab pill and tab icon delays) except the fades of sheets, toasts and the colour picker (200ms, no movement): presses and the hold fill show at once, but a hold still takes 700ms.
- Entrances (`rise`, `grow-x`) play on a screen's first visit only; `openScreen` marks a screen `.entered` when it is left, which turns them off on every return. Screens that open with new content (past event, Compare, product editor) play them every time.
- The per-sale toast and checkbox tick never start from nothing: the toast slides in with `--ease-out` (no overshoot), the tick grows from 0.5 with a fade.
- Sell's revenue counts up over 200ms per sale, from the number on screen (a sale mid-count continues, it does not jump).
- Presses shrink to 0.95–0.97 (`--dur-tap`, `--ease-out`): 0.97 buttons, 0.96 icon buttons, 0.95 small controls.

## Layout

- Pages max 640px wide, centred; sheets max 520px. Sell grid: 1 column, 2 from 720px, 3 from 1080px. With 2-3 columns each column stacks on its own: a tile goes into the shortest column (owner, 0.1.2), so a tall group tile leaves no gap beside it (`src/ui/masonry.ts`, 1px grid rows; a tile may change column when a group folds).
- Short landscape (max-height 500px): Sell's title, revenue and buttons share one header row.
- Touch targets >= 44x44px (icon buttons 44px, buttons 48px tall, small visual controls grow their hit area with an absolute `::after`). Colour presets: 7 across, 6 at <= 360px, so each swatch plus its gap stays >= 44px.
- Safe areas: header, content, tab bar (`--tabbar-h` 68px) and sheets pad with `env(safe-area-inset-*)`.
- **Tab bar:** five equal columns, icon over a `--fs-xs` bold label (`--text-3`, active `--text`). The active tab has one 56x32 `--accent` pill behind its icon (icon `--on-accent`) that moves to the tapped tab like liquid (owner, 2026-11-03): its two edges spring separately (`--dur-liquid` 340ms, `--ease-liquid`; plain `--dur-2` `--ease-out` where `linear()` is unsupported), the one facing the new tab first and the other 70ms later (`openScreen` sets `data-dir`), so it stretches across the gap; it thins to 0.78 height while stretched and lands with a 1.05 swell over the same 340ms (one keyframes name per tab). A tap mid-move bends it toward the new tab from where it is. The new tab's icon turns `--on-accent` only after 200ms, once the pill is under it. Reduce-motion jumps. `.tabbar::before`, column picked with `:has()` (`--i`). Sell keeps the middle spot and a 26px icon (others 22px) but no pill of its own (owner, 2026-11-03). The layout test checks the pill is centred under each tab at 320, 412 and landscape.
- Must fit at 320-360px wide (layout test runs 320, 360, 412 and 892 wide, both themes, English and Indonesian).

## Components

- **Page header (every screen):** one row, 52px tall, starting `--s2` below the top safe-area inset: title (`.page-title`, `--fs-xl` bold, one line with ellipsis) on the left, 44px icon buttons on the right of the same row; a sub-screen's back button sits first in that row. Sell's row is the fixed `.topbar-row` (title the CNTR wordmark (`.page-title.brand`, spaced 0.32em, owner's choice), + and ⋮), with the revenue hero directly under it (no label: the figure, then sales · profit; screen readers hear "Revenue"; owner, 0.1.2); Products has + ; Event's title is the event's name (`.event-name-row`, tap to rename). No bar or label above the title. Landscape: see Layout. The layout test checks that all five tabs' rows have the same top, height and title position.
- **Product list (Products tab):** one card (`--surface-1`, `--line` border, `--r-lg`); rows split by single `--line` dividers. A row is >= 64px: a slim 4px colour bar (inset `--s3` top and bottom, `--r-pill`), name `--fs-md` bold, one meta line `--fs-xs` `--text-3`: price · profit, then the payment methods as labelled 6px dots (they wrap to a 2nd line on narrow phones rather than cut off); a Free product says "Free" with no methods. The on/off switch (`role=switch`) on the right; tap the row to edit. **Groups:** a header row (one bar for the whole group, name + variant count, the shared payments once, chevron in the switch column; tap to fold), its variants indented `--s4` with name and price · profit only. Hidden products follow under "Hidden · N" with the note that explains it. Add is the header's +; with no products the list is the empty slot (see Add controls).
- **Report (Event tab and past event, `EventScreen` + `ReportParts`), dense so more fits per screen:**
  - **Top block:** event name row, then the dates (past events) tucked right under it (the name row drops its bottom margin there), then the hero (label + fluid figure, no top padding).
  - **KPIs:** one ledger card (`.kpi-row`: `--surface-1`, `--line` border, `--r-lg`, `0 --s4` padding), one >= 44px row per figure split by `--line`: label `--fs-sm` bold `--text-2` with its hint `--fs-xs` `--text-3` on the same line (the hint wraps under the label on narrow phones), amount `--fs-lg` bold on the right, never cut or compacted. Full-width rows because three tiles side by side can't hold "Rp 4.015.000" at 320px.
  - **Expenses:** rows are 44px (`--s1` vertical padding); with edit buttons the 48px buttons set the height. Long names wrap.
  - **Payment mix:** an 88px donut (inline SVG, ring about 12px, starts at 12 o'clock, 2px surface gap between arcs; one method = a full ring) with the legend beside it, two lines per method: dot, name (bold) and share (`--fs-sm` bold `--text-2`) on top, amount (`--fs-sm` bold) and sales count (`--fs-xs` `--text-3`) under. Arcs use the method's colour class, at least 2 units long (gap included) so a tiny share stays visible; shares are whole percentages that total exactly 100 (`roundedShares`). Free isn't a method here: it shows only when nothing else sold. The SVG is `role="img"` with every method, share and amount in its `aria-label`, and the legend names each method, so nothing is colour-only. No arc animation (the card's rise is the entrance).
  - **Product rows:** two lines: dot, name (bold, ellipsis) and revenue (`--fs-sm` bold) on the right; then the sales count (`--fs-xs` `--text-3`) with "· profit" (green/red) always, even when it equals revenue (owner, 0.1.2), beside a bar for the revenue share in a fixed 40% column so bars compare across rows (rows stay sorted by units, so a low-unit, high-price product shows a long bar lower down). On narrow phones the profit wraps to its own line as a whole. Rows `--s3` apart.
  - **Highlights (ended events only):** a card right under the KPIs: up to 5 sentences (`--fs-sm`, `--lh-body`, `--text-2`), each marked by a 6px `--accent` dot; names over 40 characters are cut with an ellipsis. Fixed templates in EN and ID over `eventHighlights()` (`src/summary.ts`); arithmetic only, no advice.
  - **By day / Combined (`.view-switch`):** shown above the Products only with 2+ days of sales. One pill (`--surface-1`, `--line` border, `--s1` padding) holding two 44px halves (`--fs-sm` bold, `--text-2`); the chosen one fills `--accent` / `--on-accent`. Ended events open Combined, the live event By day; not saved.
  - **Day cards** keep profit before expenses in green (owner).
- **Tile:** product colour, `--r-lg`, `--s3` padding. Name `--fs-md` bold (over 14 chars `--fs-sm`, over 22 also wraps to 2 lines), price `--fs-sm` regular in full ink (never faded: the 2.6:1 tile rule), payment halves with label (`--fs-xs` caps) and count (`--fs-xl`). Compact tiles: no price, one row per half, same `--s3` padding (0.1.2; was `--s2`, owner: text too close to the edges).
- **Sell button (`.pay-add`), tactile:** at rest exactly the flat half (`--ink-faint`, `--r-md`, same size) plus a 2px bottom edge, `inset 0 -2px 0 var(--ink-soft)`, inside the box so nothing moves. Pressed (`:active`): the edge flattens to 0, the face sinks 1px and scales to 0.97 (`--dur-tap`). A sold compact cell keeps its `--ink-line` ring with the edge (`var(--edge)`).
- **Group tile:** group title `--fs-xl` (long ones `--fs-lg`), one pencil; one row per variant: name `--fs-md` + price `--fs-xs`, halves sell on tap (no + icon), counts `--fs-lg`. **Compact:** the name on its own line, payment labels once as column headers, rows 44px: name column 1.4fr to the counts' 2fr; variant name `--fs-sm` on one line (ellipsis) with its price `--fs-xs` 2px under it; unsold counts `--fs-md` regular, sold `--fs-lg` bold with an `--ink-line` ring. **Folded:** tap the name row; only the header shows, chevron turned.
- **Sheets:** bottom sheets, `--surface-1`, top corners `--r-lg`, title `--fs-lg` bold, text `--fs-sm`, actions as a two-button row (Cancel left). **Scroll fade:** a sheet taller than the screen fades its top/bottom edge into `--surface-1` over `--s6` (24px), only toward where there is more to scroll (`.fade-top` / `.fade-bottom` on the overlay, from `updateSheetFade`). A surface-coloured veil, not `mask-image` (a mask would also fade the sheet's own surface into the scrim); it never takes taps.
- **Switches:** 44x26 pill track (`--surface-3` off, `--accent` on, knob `--on-accent`); the whole row is the label. Checked checkboxes fill `--accent` with an `--on-accent` tick.
- **Buttons:** `.btn` 48px, `--r-md`, `--fs-md` bold. Primary = `--accent` fill / `--on-accent` text; secondary = `--surface-2`; danger = `--negative` / `--on-negative`, used for destructive confirms only (delete, discard, restore, continue without backup). End day and End event confirm with primary (nothing is lost).
- **Hold to delete (`.hold-delete`):** product/group Delete, an expense's trash and a variant row's ✕. Each button carries a `.hold-fill` copy of its icon/label in `--on-negative` on solid `--negative`; held, it is uncovered left to right (`clip-path`, `--dur-hold` linear), so the icon and label turn light exactly where the red has reached, and the delete runs at 700ms with the usual strong tap. A tap shows the toast "Hold to delete"; letting go, sliding off or `pointercancel` rolls it back (`--dur-1`). Keyboard and screen readers (a click with no press) get the confirm dialog instead (a saved variant's ✕ asks "Remove variants?"; a new, unsaved row goes at once). The hold is the confirmation: Save asks nothing more. Big actions keep their dialogs.
- **Deleting a whole thing (`.btn-delete`):** a full-width labelled button at the bottom of its screen, never a header icon: `--negative` text and 1px `--negative` outline on no fill, trash icon. Product/group: "Hold to delete" under Save (held; shown only when editing an existing one). Past event: "Delete event" under the report (a dialog: it drops a whole event). A row inside a list (an expense, a variant) keeps its own icon in the row.
- **Variant rows (product editor, group mode):** each variant is one rounded bar (`--bg`, `--line-strong` border, `--r-md`) holding name | price | cost | ✕ as borderless cells, no gaps; the column labels sit over the values. Name and price bold, cost `--text-2`, numbers tabular. The bar's border turns `--text-3` while a cell has focus, and that cell fills `--surface-2`. New rows rise in (`rise`, `--dur-3`). Add variant is the next, empty line: full width, 1px dashed `--line-strong`, `--text-2`.
- **Confirm titles** name the action as a question: "Delete product?", "Delete group?", "Delete expense?", "Remove variants?", "Delete event?", "Restore backup?". Never a generic "Are you sure?".
- **Empty states:** left-aligned: quiet icon, title `--fs-md` bold, one sentence `--fs-sm` that says what to do next.
- **Add controls (one rule per context):**
  - Adding to a list: a `+` icon button (`icon-btn icon-btn-soft`, with `aria-label`) in the header that owns the list: the screen header (Sell, Products) or the card header (Expenses).
  - Adding a row while editing a form: a dashed "next empty line" with a label (Add variant).
  - An empty list you can add to: the empty space itself is the add, a dashed slot (`.grid-empty`: 1px dashed `--line-strong`, `--r-lg`, centred title `--fs-md` bold and one sentence `--text-3`; tap opens the add). Sell's empty grid and the empty Products list use it. Empty states with nothing to add (no sales yet) stay as the plain empty state above.

## Exceptions

Edge cases where a token doesn't fit. Each covers that element only; `tests/e2e/layout.test.mjs` allows exactly the type sizes listed here.

| Element (selector) | Value | Why | Approved |
|---|---|---|---|
| `.hero-figure` (Sell: `.hero .hero-figure`, 0.75x) | fluid `clamp()` by width and digit count | Long amounts must fit one line; the type check skips it | owner-approved 2026-10-31 |
| `.hero-figure-symbol` | `0.45em` of the figure | The currency symbol follows the fluid figure | owner-approved 2026-10-31 |
| `.payment-value` at `max-width: 360px` | 24px (not `--fs-xl` 26) | Count and label fit a 360px phone's halves | owner-approved 2026-10-31 |
| `:is([data-payment='Transfer'], [data-payment='E-wallet']) .pay-label`; `.tile-group-pays .pay-label:is(...)` (compact group column header) | 10px bold caps; line box kept at the 12px label's (`--fs-xs` x `--lh-body`, header `--lh-tight`) so no row changes height; header icon gap 2px | TRANSFER / E-WALLET crowded the halves in every tile mode; now >= 8px clear to the cell's edges at 360px (layout test). Cash, QRIS, Card stay 12px | owner-approved 2026-10-31 |
| Text on a tile (`--tile`) | contrast >= 2.6:1 (not 4.5:1) | Product colours are shown exactly as chosen (Tile ink rule) | owner-approved (standing) |

## Copy

- Buttons say what they do, one or two words: "Delete", "End day", "End event", "Restore", "Discard", "Start tour". Never OK / Yes / No / Confirm; the safe choice is "Cancel" (or "Keep editing", "Same event", "Skip"). Message dialogs close with "Close".
- A sublabel only when it explains something the label can't (e.g. "Replaces all data on this phone"). No label above a heading that repeats it.
- Sentence case everywhere except the short labels above; user-typed names exactly as typed.
- Money has a no-break space after the symbol (`formatMoney`), so a sentence never wraps between "Rp" and the number. History event names stop at 3 lines.
- Toasts stay 3s; the per-sale toast 900ms. A sale is announced once, by the toast (the Sell hero is not a live region).
- English and casual Bahasa Indonesia ("kamu"), both in `src/i18n.ts`. Payment method names, CSV headers and user text are not translated.
