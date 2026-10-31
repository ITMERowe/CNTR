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
| `--text` | `#e7e7e7` | `#1e1e1e` | Primary text; primary button fill |
| `--text-2` | `#cccccc` | `#3b3b3b` | Secondary text |
| `--text-3` | `#9d9d9d` | `#616161` | Quiet text (labels, meta). Never fainter than this. |
| `--on-ink` | `#1e1e1e` | `#ffffff` | Text on `--text` fills |
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

- Durations: `--dur-tap` 120ms (press), `--dur-1` 200ms, `--dur-2` 280ms, `--dur-3` 420ms (list/tile entrance), `--dur-hold` 700ms (hold to delete; `HOLD_MS` in `src/ui/dom.ts` must match).
- Easing: `--ease-out` to enter, `--ease-in` to exit, `--ease-emphasis` for a small overshoot (count roll).
- Animate `transform` / `opacity` only (the sell button's edge also eases its inset `box-shadow`). `prefers-reduced-motion: reduce` sets every animation and transition to 1ms: presses and the hold fill show at once, but a hold still takes 700ms.

## Layout

- Pages max 640px wide, centred; sheets max 520px. Sell grid: 1 column, 2 from 720px, 3 from 1080px.
- Short landscape (max-height 500px): Sell's title, revenue and buttons share one header row.
- Touch targets >= 44x44px (icon buttons 44px, buttons 48px tall, small visual controls grow their hit area with an absolute `::after`).
- Safe areas: header, content, tab bar (`--tabbar-h` 68px) and sheets pad with `env(safe-area-inset-*)`.
- Must fit at 320-360px wide (layout test runs 320, 360, 412 and 892 wide, both themes, English and Indonesian).

## Components

- **Page header (every screen):** one row, 52px tall, starting `--s2` below the top safe-area inset: title (`.page-title`, `--fs-xl` bold, one line with ellipsis) on the left, 44px icon buttons on the right of the same row; a sub-screen's back button sits first in that row. Sell's row is the fixed `.topbar-row` (title the CNTR wordmark (`.page-title.brand`, spaced 0.32em, owner's choice), + and ⋮), with the revenue hero directly under it; Products has + ; Event's title is the event's name (`.event-name-row`, tap to rename). No bar or label above the title. Landscape: see Layout. The layout test checks that all five tabs' rows have the same top, height and title position.
- **Product list (Products tab):** one card (`--surface-1`, `--line` border, `--r-lg`); rows split by single `--line` dividers. A row is >= 64px: a slim 4px colour bar (inset `--s3` top and bottom, `--r-pill`), name `--fs-md` bold, one meta line `--fs-xs` `--text-3`: price · profit, then the payment methods as labelled 6px dots (they wrap to a 2nd line on narrow phones rather than cut off); a Free product says "Free" with no methods. The on/off switch (`role=switch`) on the right; tap the row to edit. **Groups:** a header row (one bar for the whole group, name + variant count, the shared payments once, chevron in the switch column; tap to fold), its variants indented `--s4` with name and price · profit only. Hidden products follow under "Hidden · N" with the note that explains it. Add is the header's +; the card-less "Add product" button shows only in the empty state.
- **Tile:** product colour, `--r-lg`, `--s3` padding. Name `--fs-md` bold (over 14 chars `--fs-sm`, over 22 also wraps to 2 lines), price `--fs-sm`, payment halves with label (`--fs-xs` caps) and count (`--fs-xl`). Compact tiles: no price, one row per half.
- **Sell button (`.pay-add`), tactile:** at rest exactly the flat half (`--ink-faint`, `--r-md`, same size) plus a 2px bottom edge, `inset 0 -2px 0 var(--ink-soft)`, inside the box so nothing moves. Pressed (`:active`): the edge flattens to 0, the face sinks 1px and scales to 0.97 (`--dur-tap`). A sold compact cell keeps its `--ink-line` ring with the edge (`var(--edge)`).
- **Group tile:** group title `--fs-xl` (long ones `--fs-lg`), one pencil; one row per variant: name `--fs-md` + price `--fs-xs`, halves sell on tap (no + icon), counts `--fs-lg`. **Compact:** the name on its own line, payment labels once as column headers, rows 44px: variant name `--fs-sm` on one line (ellipsis) with its price `--fs-xs` under it; unsold counts `--fs-md` regular, sold `--fs-lg` bold with an `--ink-line` ring. **Folded:** tap the name row; only the header shows, chevron turned.
- **Sheets:** bottom sheets, `--surface-1`, top corners `--r-lg`, title `--fs-lg` bold, text `--fs-sm`, actions as a two-button row (Cancel left). **Scroll fade:** a sheet taller than the screen fades its top/bottom edge into `--surface-1` over `--s6` (24px), only toward where there is more to scroll (`.fade-top` / `.fade-bottom` on the overlay, from `updateSheetFade`). A surface-coloured veil, not `mask-image` (a mask would also fade the sheet's own surface into the scrim); it never takes taps.
- **Switches:** 44x26 pill track (`--surface-3` off, `--text` on); the whole row is the label.
- **Buttons:** `.btn` 48px, `--r-md`, `--fs-md` bold. Primary = `--text` fill / `--on-ink` text; secondary = `--surface-2`; danger = `--negative` / `--on-negative`, used for destructive confirms only (delete, discard, restore, continue without backup). End day and End event confirm with primary (nothing is lost).
- **Hold to delete (`.hold-delete`):** product/group Delete, an expense's trash and a variant row's ✕. Each button carries a `.hold-fill` copy of its icon/label in `--on-negative` on solid `--negative`; held, it is uncovered left to right (`clip-path`, `--dur-hold` linear), so the icon and label turn light exactly where the red has reached, and the delete runs at 700ms with the usual strong tap. A tap shows the toast "Hold to delete"; letting go, sliding off or `pointercancel` rolls it back (`--dur-1`). Keyboard and screen readers (a click with no press) get the confirm dialog instead (a saved variant's ✕ asks "Remove variants?"; a new, unsaved row goes at once). The hold is the confirmation: Save asks nothing more. Big actions keep their dialogs.
- **Deleting a whole thing (`.btn-delete`):** a full-width labelled button at the bottom of its screen, never a header icon: `--negative` text and 1px `--negative` outline on no fill, trash icon. Product/group: "Hold to delete" under Save (held; shown only when editing an existing one). Past event: "Delete event" under the report (a dialog: it drops a whole event). A row inside a list (an expense, a variant) keeps its own icon in the row.
- **Variant rows (product editor, group mode):** each variant is one rounded bar (`--bg`, `--line-strong` border, `--r-md`) holding name | price | cost | ✕ as borderless cells, no gaps; the column labels sit over the values. Name and price bold, cost `--text-2`, numbers tabular. The bar's border turns `--text-3` while a cell has focus, and that cell fills `--surface-2`. New rows rise in (`rise`, `--dur-3`). Add variant is the next, empty line: full width, 1px dashed `--line-strong`, `--text-2`.
- **Confirm titles** name the action as a question: "Delete product?", "Delete group?", "Delete expense?", "Remove variants?", "Delete event?", "Restore backup?". Never a generic "Are you sure?".
- **Empty states:** left-aligned: quiet icon, title `--fs-md` bold, one sentence `--fs-sm` that says what to do next.

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
- English and casual Bahasa Indonesia ("kamu"), both in `src/i18n.ts`. Payment method names, CSV headers and user text are not translated.
