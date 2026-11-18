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
| `--accent` | `#fd6e6e` | `#fd6e6e` | The one accent (coral orange, owner's pick 2026-11-18, replacing indigo): primary buttons, solid icon buttons, switches and checkboxes when on, the tab pill. Never on tiles (product colour) or money (green/red). |
| `--on-accent` | `#2b0d0d` | `#2b0d0d` | Text and icons on `--accent` (dark ink in both themes; white on coral fails contrast) |
| `--positive` | `#4ade80` | `#116329` | Profit |
| `--negative` | `#ff6b5e` | `#c72c1c` | Deficit, danger buttons |
| `--on-negative` | `#1d0806` | `#ffffff` | Text on danger buttons |

Payment methods (same in both themes, fixed order from `src/payments.ts`): `--cash #c08024`, `--qris #4d8df0`, `--transfer #199e70`, `--card #9085e9`, `--ewallet #d55181`; `--free #8a8a93` for a price-0 counter. Every use is also labelled by name. `--chart-rest` (`#46464d` dark / `#d4d4d4` light) is the payment-mix donut's empty ring and the fallback for a slice or swatch with no method colour.

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
- **Line-height:** `--lh-tight` 1.15 for headings, names and numbers; `--lh-body` 1.45 for sentences. A tight line box ends above the font's descenders, so tight text that clips (`overflow: hidden`) also needs the `0.12em` bottom padding rule near the end of `style.css`, or it cuts g, y and p; the layout test checks this.
- **Caps:** only short labels: payment method names on tiles, the hero label (`.eyebrow`, e.g. NET PROFIT), month in date blocks, hex codes. Headings, buttons and sentences are sentence case.
- Hierarchy comes from size, weight, colour (`--text` > `--text-2` > `--text-3`) and space: one clear title per screen or card, numbers prominent, meta quiet.

## Space, shape, depth

- **Spacing (4/8 rhythm):** `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 20, `--s6` 24, `--s8` 32px. Page side padding `--page-x` = `--s4` (`--s3` at <= 360px).
- **Radii:** `--r-sm` 10px (small controls, wrappers), `--r-md` 14px (buttons, inputs), `--r-lg` 20px (cards, tiles, sheets), `--r-pill` 999px (chips, switches, toasts, handles), `50%` for round icons.
- **Nothing square:** every element that can be a tutorial target or focus ring gets at least `--r-sm` (the zero-specificity `:where(...)` list near the top of `style.css`); the tour's ring follows the target's radius. Exceptions: divider rows and ellipsis-clipped labels.
- **Elevation:** flat surfaces separated by `--line`; shadows only on floating layers, from two tokens: `--shadow-float` (`0 12px 32px` black 40%: menus, toast, dragged tile, tour bubble) and `--shadow-sheet` (`0 24px 60px` black 55%: colour picker). The one inset edge is the sell button's (see Tile).

## Motion

Motion explains what changed (a sale landed, a sheet came up, a tab switched); it never decorates and never delays a sale. Every animation and transition in the app is in the catalogue below. A new one goes in the table in the same commit.

### Tokens

- **Durations:** `--dur-tap` 120ms (press), `--dur-1` 200ms (small state changes, exits), `--dur-2` 280ms (sheets, folds, screen and row entrances), `--dur-3` 420ms (card and tile entrances, the theme circle), `--dur-hold` 700ms (hold to delete; `HOLD_MS` in `src/ui/dom.ts` must match), `--dur-liquid` 340ms (the two liquid pills and the switch knob; `DROP_MS` in `src/ui/switches.ts` must match). Never `parseFloat` a duration token in JS: the build minifies `340ms` to `.34s`.
- **Easing:** `--ease-out` to enter and to exit (never ease-in: it delays the moment the user watches); `--ease-emphasis` for a small overshoot (the checkbox tick); `--ease-liquid` (a spring as a `linear()` curve, 4.6% overshoot; the two liquid pills and the switch knob only; plain `--dur-2` `--ease-out` where `linear()` is unsupported); `--ease-reveal` (the theme circle only, the one curve with a slow start: a full-screen circle's first frames are its slowest, and `--ease-out` put its fastest movement on them, so it read as a jump); `linear` for the hold fill only (it shows time passing).

### Rules

- Animate `transform` / `opacity` only. Allowed exceptions, each cheap: the sell button's inset `box-shadow` edge, the two pills' `left`/`right` edges, the switch knob's `left`, the switch fill's `background-size`, the hold fill's and the theme circle's `clip-path`, folds' `block-size`, colours on state changes. Chrome drops a CSS transition on a property a script animates (even with `composite: 'add'`), so a script never animates a property that CSS transitions.
- **Entrances** (`rise`, `grow-x`) play on a screen's first visit only; `openScreen` marks a screen `.entered` when it is left, which turns them off on every return (`display: none` to `block` would replay them). Screens that open with new content (past event, Compare, product editor) play them every time. Lists stagger by `--i`, capped at 8 items so a long list never waits.
- **Nothing starts from nothing:** the toast slides from 12px below, the tick grows from 0.5, sheets slide from their own height. No scale from 0.
- **No motion in the rush:** Sell's group tiles fold at once (tiles under the finger must not slide), counts roll only 60% of their height, and sell taps are ignored for 400ms after a fold. No number or chart animates beyond the catalogue (owner, 2026-11-04).
- **Presses** shrink on `--dur-tap` `--ease-out`: 0.97 buttons, chips and the By day / Combined halves; 0.96 icon buttons and the tile pencil; 0.95 small controls (stepper, colour preset, −, tab icon). Large surfaces shrink less so they don't seem to jump: the empty slot 0.98, the colour preview 0.99. List rows and setting rows fill `--surface-2` instead of shrinking; a solid icon button dims to 0.85.
- **Reduced motion** (`prefers-reduced-motion: reduce`): every animation and transition takes 1ms with no delay (the pill, tab icon and By day / Combined delays are cleared too), except that sheets, the colour picker and toasts still fade over `--dur-1` without moving. Presses and the hold fill show at once, but a hold still takes 700ms. The switch shape, theme circle and count-up don't play.
- **Older WebViews** without `linear()`, `::details-content` or View Transitions get the plain version: `--ease-out` edges, folds that snap, an instant theme switch.

### Catalogue

| What | Trigger | Motion | Timing | Where |
|---|---|---|---|---|
| Screen | Tab or sub-screen opens | Fade + 6px up (`screen-in`) | `--dur-2` `--ease-out` | `.screen.active` |
| Tab pill | Tab tap | Edges spring separately (leading first, the other 70ms later), thins to 0.78 height, lands with a 1.05 swell (`pill-squash-N`); the icon turns `--on-accent` after 200ms | `--dur-liquid` `--ease-liquid` | `.tabbar::before`; see Layout |
| Tab icon | Press | Scale 0.95; colour over `--dur-1` | `--dur-tap` | `.tab .icon` |
| Sell tiles | First visit to Sell, a new tile | `rise` (fade + 8px up), 40ms stagger | `--dur-3` | `.tile` |
| Tile count | A sale or an undo | The new number rolls in from below (sale) or above (undo), 60% of its height, with a fade (`roll-up` / `roll-down`) | `--dur-2` | `.payment-value.roll-*` |
| Sell revenue | A sale | Counts up from the number on screen (a sale mid-count continues) | 200ms, rAF | `SalesHero.tsx` |
| Sell button | Press | Edge flattens, face sinks 1px, scale 0.97 | `--dur-tap` | `.pay-add` |
| Undo (−) | Count leaves / reaches 0 | Fades in / out; press 0.95 | `--dur-1` | `.pay-undo` |
| Group tile fold | Tap the name row | Body shows or hides at once; chevron turns | chevron `--dur-2` | `.tile-group-toggle` |
| Tile reorder | Hold and drag | Held tile lifts (scale 1.02, `--shadow-float`) and follows the finger; the others slide out of its way | `--dur-2` | `.is-reordering`, `src/ui/tileDrag.ts` |
| Columns | Tile added, folded or resized | Re-placed into the shortest column on the next frame; no animation | rAF | `src/ui/masonry.ts` |
| Cards, report hero, KPIs, Settings groups | First visit | `rise`; cards 40ms apart (up to 120ms) | `--dur-3` | `.card`, `.report-hero`, `.kpi-row`, `.group` |
| List rows (History, Products, report products) | First visit | `rise`, 30ms stagger | `--dur-2` | `.list-row`, `.product-item`, `.product-row` |
| Product share bars | First visit | Grow from the left (`grow-x`) | `--dur-3` | `.rank-fill` |
| Highlights | An ended report opens | Sentences `rise` one by one: 120ms, then 60ms apart | `--dur-2` | `.highlights li` |
| By day / Combined | Tap a half | Pill moves like the tab pill; the label darkens after 120ms; the Products below slide in 16px from the side the pill moved to, with a fade (`view-in-left/right`). Never on a return to the tab | pill `--dur-liquid`, Products `--dur-2` | `.view-switch`, `.view-swap` |
| Folds (Products groups, By day cards) | Tap the header | Height + fade (`::details-content`); chevron turns | `--dur-2` (day chevron `--dur-1`) | `.product-group`, `.products-day` |
| Expense checklist group | Tap its fold | Chevron turns | `--dur-2` | `.check-fold` |
| Form part | A switch shows it (Group with variants, For products) | `rise` | `--dur-2` | `.reveal` |
| Variant row | Add variant; focus | `rise`; the focused cell fills `--surface-2`, the bar's border turns `--text-3` | `--dur-3`, colours `--dur-1` | `.variant-row` |
| Switch | Tap | Knob slides (`left`), stretches to 1.55 x 0.8, squishes to 0.82 x 1.14 at the edge and settles; the accent fills in behind it. Shape from a tap only | `--dur-liquid` `--ease-liquid` | `.switch-track`, `src/ui/switches.ts` |
| Checkbox | Tick | Box fills `--accent`; tick grows from 0.5 with a small overshoot + fade | `--dur-1` `--ease-emphasis` | `.check-box::after` |
| Checklist row, input | Check / focus / invalid | Border and fill colour | `--dur-1` | `.check-row`, `.input` |
| Hold to delete | Press and hold | Red copy uncovered left to right (`clip-path`); letting go rolls it back | `--dur-hold` linear; back `--dur-1` | `.hold-fill` |
| Sheet | Open / close | Scrim fades; the sheet slides up its full height / back down | open `--dur-2`, close `--dur-1` | `.sheet-overlay`, `.sheet` |
| Sheet scroll fade | More to scroll that way | Top/bottom veil fades in | `--dur-1` | `.sheet-overlay::before/::after` |
| Colour picker | Open / close | Fade, dropping 6px into place from 0.98 | `--dur-1` | `.color-picker` |
| Colour preview | New colour | Background and ink ease to it; press 0.99 | `--dur-2` | `.color-swatch` |
| Menu (Sell ⋮) | Open | Fade in | `--dur-2` | `.menu` |
| Toast | Show / hide | Fade + 12px up, 0.98 to 1, no overshoot | `--dur-1` | `.toast` |
| Tour | Each step | Ring and dim appear in place (no travel); the bubble fades in | `--dur-2` | `.tour-in`, `src/tutorial.ts` |
| Theme circle | Dark theme switch | The knob lands, then 260ms after the tap the light page is a circle centred on the switch, growing (going light) or shrinking (going dark); all CSS transitions are off meanwhile (`data-reveal`), since the page under the circle is live | `--dur-3` `--ease-reveal` | `revealTheme`, `src/theme.ts` (owner's recording, 2026-11-04) |

## Layout

- Pages max 640px wide, centred; sheets max 520px. Sell grid: 1 column, 2 from 808px, 3 from 1168px (720px / 1080px of content plus the 88px nav rail). With 2-3 columns each column stacks on its own: a tile goes into the shortest column (owner, 0.1.2), so a tall group tile leaves no gap beside it (`src/ui/masonry.ts`, 1px grid rows; a tile may change column when a group folds).
- Short landscape (max-height 500px): Sell's title, revenue and buttons share one header row.
- Touch targets >= 44x44px (icon buttons 44px, buttons 48px tall, small visual controls grow their hit area with an absolute `::after`). Colour presets: 7 across, 6 at <= 360px, so each swatch plus its gap stays >= 44px.
- Safe areas: header, content, tab bar (`--tabbar-h` 68px) and sheets pad with `env(safe-area-inset-*)`.
- **Tab bar:** five equal columns, icon over a `--fs-xs` bold label (`--text-3`, active `--text`). The active tab has one 56x32 `--accent` pill behind its icon (icon `--on-accent`) that moves to the tapped tab like liquid (owner, 2026-11-03): its two edges spring separately (`--dur-liquid` 340ms, `--ease-liquid`; plain `--dur-2` `--ease-out` where `linear()` is unsupported), the one facing the new tab first and the other 70ms later (`openScreen` sets `data-dir`), so it stretches across the gap; it thins to 0.78 height while stretched and lands with a 1.05 swell over the same 340ms (one keyframes name per tab). A tap mid-move bends it toward the new tab from where it is. The new tab's icon turns `--on-accent` only after 200ms, once the pill is under it. Reduce-motion jumps. `.tabbar::before`, column picked with `:has()` (`--i`). Sell keeps the middle spot and a 26px icon (others 22px) but no pill of its own (owner, 2026-11-03). The layout test checks the pill is centred under each tab at 320 and 412.
- **Nav rail (from 720px wide: tablets and landscape phones; judgement call, owner to confirm the breakpoint):** the same five tabs in a left rail, 88px + the left safe area, 64px per tab from the top (`--s4` + the top inset down), `--bg` with a `--line` right border. `--tabbar-h` becomes 0, so content padding, scroll padding and the toast stop leaving room for a bottom bar (the toast centres on the content column). `.app` pads left by the rail. The pill is the same 56x32, centred in the rail, and travels down and up: its top and bottom edges spring separately (the one facing the new tab first), and it thins sideways (`pill-squash-vN`). While a past event is edited the rail stays (Save / Cancel dock in the content column; leaving still asks).
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
  - **By day / Combined (`.view-switch`):** shown above the Products only with 2+ days of sales. One pill (`--surface-1`, `--line` border, `--s1` padding) holding two 44px halves (`--fs-sm` bold, `--text-2`). An `--accent` pill sits behind the chosen half (label `--on-accent`) and moves like the tab pill (owner, 2026-11-04): edges spring separately, the leading one first, the other 70ms later, same thin and swell; the label darkens after 120ms. The Products below slide in as one block from the side the pill moved to (16px + fade, `--dur-2`). Only a tap plays this, never a return to the tab. Ended events open Combined, the live event By day; not saved.
  - **Day cards** keep profit before expenses in green (owner), labelled "before costs" so it isn't read as the event's result (`profit.beforeCosts`).
- **Tile:** product colour, `--r-lg`, `--s3` padding. Name `--fs-lg` bold (over 14 chars `--fs-md`, over 22 also wraps to 2 lines), price `--fs-sm` regular in full ink (never faded: the 2.6:1 tile rule), payment halves with label (`--fs-xs` caps) and count (`--fs-xl`). Compact tiles: no price, one row per half, same `--s3` padding (0.1.2; was `--s2`, owner: text too close to the edges).
- **Sell button (`.pay-add`), tactile:** at rest exactly the flat half (`--ink-faint`, `--r-md`, same size) plus a 2px bottom edge, `inset 0 -2px 0 var(--ink-soft)`, inside the box so nothing moves. Pressed (`:active`): the edge flattens to 0, the face sinks 1px and scales to 0.97 (`--dur-tap`). A sold compact cell keeps its `--ink-line` ring with the edge (`var(--edge)`).
- **Group tile:** group title `--fs-lg`, the single tile name's size (long ones `--fs-md`), one pencil; one row per variant: name `--fs-md` + price `--fs-xs`, halves sell on tap (no + icon), counts `--fs-lg`. **Compact:** the name on its own line, payment labels once as column headers, rows 44px: name column 1.4fr to the counts' 2fr; variant name `--fs-sm` on one line (ellipsis) with its price `--fs-xs` 2px under it; unsold counts `--fs-md` regular, sold `--fs-lg` bold with an `--ink-line` ring. **Folded:** tap the name row; only the header shows, chevron turned.
- **Sheets:** bottom sheets, `--surface-1`, top corners `--r-lg`, title `--fs-lg` bold, text `--fs-sm`, actions as a two-button row (Cancel left). **Scroll fade:** a sheet taller than the screen fades its top/bottom edge into `--surface-1` over `--s6` (24px), only toward where there is more to scroll (`.fade-top` / `.fade-bottom` on the overlay, from `updateSheetFade`). A surface-coloured veil, not `mask-image` (a mask would also fade the sheet's own surface into the scrim); it never takes taps.
- **Switches:** 44x26 pill track (`--surface-3` off, `--accent` on, knob `--on-accent`); the whole row is the label. The knob moves like a liquid drop (owner's reference, 2026-11-04): it slides on `--dur-liquid` / `--ease-liquid`, stretches to 1.55 x 0.8 on the way, squishes to 0.82 x 1.14 at the edge and settles; the accent fills in behind it on the same timing. The slide is `left`, not `transform` (a 20px knob, so it costs nothing, and Chrome drops a transition on a property a script animates); the shape plays on `transform` from a tap only (`src/ui/switches.ts`), so opening a screen never replays it; reduced motion drops it. Checked checkboxes fill `--accent` with an `--on-accent` tick.
- **Buttons:** `.btn` 48px, `--r-md`, `--fs-md` bold. Primary = `--accent` fill / `--on-accent` text; secondary = `--surface-2`; danger = `--negative` / `--on-negative`, used for destructive confirms only (delete, discard, restore, continue without backup). End day and End event confirm with primary (nothing is lost).
- **Hold to delete (`.hold-delete`):** product/group Delete, an expense's trash and a variant row's ✕. Each button carries a `.hold-fill` copy of its icon/label in `--on-negative` on solid `--negative`; held, it is uncovered left to right (`clip-path`, `--dur-hold` linear), so the icon and label turn light exactly where the red has reached, and the delete runs at 700ms with the usual strong tap. A tap shows the toast "Hold to delete"; letting go, sliding off or `pointercancel` rolls it back (`--dur-1`). Keyboard and screen readers (a click with no press) get the confirm dialog instead (a saved variant's ✕ asks "Remove variants?"; a new, unsaved row goes at once). The hold is the confirmation: Save asks nothing more. Big actions keep their dialogs.
- **Deleting a whole thing (`.btn-delete`):** a full-width labelled button at the bottom of its screen, never a header icon: `--negative` text and 1px `--negative` outline on no fill, trash icon. Product/group: "Hold to delete" under Save (held; shown only when editing an existing one). Past event: "Delete event" under the report (a dialog: it drops a whole event). A row inside a list (an expense, a variant) keeps its own icon in the row.
- **Variant rows (product editor, group mode):** each variant is one rounded bar (`--bg`, `--line-strong` border, `--r-md`) holding name | price | cost | ✕ as borderless cells, no gaps; the column labels sit over the values. Name and price bold, cost `--text-2`, numbers tabular. The bar's border turns `--text-3` while a cell has focus, and that cell fills `--surface-2`. New rows rise in (`rise`, `--dur-3`). Add variant is the next, empty line: full width, 1px dashed `--line-strong`, `--text-2`.
- **Confirm titles** name the action as a question: "Delete product?", "Delete group?", "Delete expense?", "Remove variants?", "Delete event?", "Restore backup?". Never a generic "Are you sure?".
- **Empty states:** left-aligned: quiet icon, title `--fs-md` bold, one sentence `--fs-sm` that says what to do next.
- **Sell ⋮ menu (`.menu`):** a dropdown under the button, up to 320px wide (page width minus `--s4` each side on phones), `--surface-1`, `--line-strong` border, `--r-lg`, `--shadow-float`. Its rows are the Settings switch rows.
- **Tile pencil and undo:** the pencil (`.tile-edit`) sits in the tile's head on `--ink-soft`. Each half's − (`.pay-undo`) is a 26px `--ink-soft` circle in its bottom-right corner, with a 44px hit area that stops inside the 8px gap so it never covers a neighbouring sell button; it is hidden while the count is 0.
- **Toast (`.toast`):** a `--text` pill with `--on-ink` text (`--fs-sm` bold, one line with ellipsis), centred `--s3` above the tab bar (on the nav rail layout, centred in the content column), `--shadow-float`, never takes taps. Stays 3s; the per-sale toast 900ms.
- **Forms:** fields stack `--s5` apart; a label is `--fs-xs` bold `--text-3` over its input. Two fields side by side (`.field-row`) align to the bottom, so a label that wraps (longer in Indonesian) never pushes its input down. Inputs are 52px, `--surface-1`, `--line-strong` border, `--r-md`, `--fs-md`; focus = `--text-2` border plus a 3px `--line` glow; invalid = `--negative` border. The big amount input (`.input-lg`) is 56px at `--fs-lg`.
- **Payment method chips (product editor):** 44px pills, `--line-strong` border, `--fs-sm` bold `--text-2`, an 8px dot in the method's colour first. Chosen: `--surface-3` fill, border in the method's colour, `--text`.
- **Colour field and picker:** the field is a live preview of the tile (72px, `--r-lg`, the product colour with its ink). Tapping it opens the picker (`.color-picker`): `--surface-2`, `--line-strong` border, `--r-lg`, `--shadow-sheet`, presets 7 across (6 at <= 360px, each with its gaps >= 44px), then a hex input.
- **Settings:** groups with a `--fs-sm` bold `--text-3` title over one `--surface-1` card (`--line` border, `--r-lg`); rows are >= 60px with the label left and the value or switch right; a row that opens something fills `--surface-2` when pressed.
- **History rows:** the event's start date replaces an icon: a 40px `--surface-2` block (`--r-md`), day `--fs-md` bold over the month `--fs-xs` bold caps `--text-3`. Event names wrap and stop at 3 lines.
- **History edit:** each product gets one row of steppers per payment method (labelled dot, 44px `--surface-2` − / + buttons at `--r-sm`, count bold tabular; disabled at 0.38 opacity). Save / Cancel dock flat at the bottom (`.edit-bar`, `--surface-1`, `--line-strong` top border) in place of the tab bar, which hides while editing.
- **Compare:** two value columns (A | B) under the two event heads; each head has a round `--text` tag with `--on-ink` letter, the name `--fs-md` bold and the dates `--fs-xs` `--text-3`. Each row's label (`--fs-xs` `--text-2`) sits above its two values (`--fs-md` bold tabular, deficits `--negative`), rows split by `--line`.
- **Checklists (expense "For products", Compare's event picker):** rows >= 60px, `--surface-2`, `--r-md`, a 22px checkbox (`--r-sm`, 2px `--text-3` border; checked: `--accent` fill, `--on-accent` tick). A group is its own row with a fold; its variants are indented under it.
- **Data alerts:** a storage problem shows as a `--surface-1` box with a 1px `--negative` border and `--fs-sm` text above the screen's content (`.storage-alert`, `role=alert`); a startup failure is a centred message with its action.
- **Tutorial (`src/tutorial.ts`):** everything except the step's target is dimmed with `--scrim` and a 1px blur (a `clip-path` hole, taps pass through); a 2px `--text` ring with a 4px `--line-strong` halo outlines the target and follows its radius; the hint bubble (`--surface-3`, `--line-strong` border, `--r-lg`, `--shadow-float`, max 480px) shows the step count (`--fs-xs` `--text-2`), the hint (`--fs-md`, `--lh-body`), Quit tour on the left and Next on the right (Skip when the step can't be done, Finish on the last). With nothing to point at, the whole screen dims and the ring hides.

### States

- **Pressed:** see Motion → Rules (scale or a `--surface-2` fill, never both on a list row).
- **Disabled:** `.btn` turns `--surface-2` with `--text-3` text (no opacity, so it stays readable); small controls (steppers) drop to 0.38 opacity; an unavailable − hides.
- **Focus:** `:focus-visible` outline (see Colour); inputs use their own border and glow; a screen focused from code after Back shows no outline.
- **Selected:** `--accent` with `--on-accent` (tab pill, By day / Combined, switches, checkboxes); chips use the method's colour instead, tiles never take the accent.
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
