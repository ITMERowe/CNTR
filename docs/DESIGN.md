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
| `--fs-md` | 16px | Body (`html`), buttons, row/card titles, tile and variant names |
| `--fs-lg` | 20px | Sheet titles, report numbers (KPIs), compact counts, long group titles |
| `--fs-xl` | 26px | Page titles, event name, single-tile counts, group titles |

- Exceptions: the revenue figures (`.hero-figure`) are fluid and shrink long amounts; `.payment-value` is 24px at <= 360px wide.
- **Two weights:** `--fw-regular` 500 (body, secondary, meta) and `--fw-bold` 700 (headings, names, counts, buttons, labels). Nothing else.
- **Line-height:** `--lh-tight` 1.15 for headings, names and numbers; `--lh-body` 1.45 for sentences.
- **Caps:** only short labels: payment method names on tiles, the hero label (`.eyebrow`, e.g. NET PROFIT), month in date blocks, hex codes. Headings, buttons and sentences are sentence case.
- Hierarchy comes from size, weight, colour (`--text` > `--text-2` > `--text-3`) and space: one clear title per screen or card, numbers prominent, meta quiet.

## Space, shape, depth

- **Spacing (4/8 rhythm):** `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 20, `--s6` 24, `--s8` 32px. Page side padding `--page-x` = `--s4` (`--s3` at <= 360px).
- **Radii:** `--r-sm` 10px (small controls, wrappers), `--r-md` 14px (buttons, inputs), `--r-lg` 20px (cards, tiles, sheets), `--r-pill` 999px (chips, switches, toasts, handles), `50%` for round icons.
- **Nothing square:** every element that can be a tutorial target or focus ring gets at least `--r-sm` (the zero-specificity `:where(...)` list near the top of `style.css`); the tour's ring follows the target's radius. Exceptions: divider rows and ellipsis-clipped labels.
- **Elevation:** flat surfaces separated by `--line`; shadows only on floating layers (menus, sheets, toast, dragged tile), each a soft offset blur (`0 12px 28-32px` black 28-50%; sheets `0 24px 60px` 55%).

## Motion

- Durations: `--dur-tap` 120ms (press), `--dur-1` 200ms, `--dur-2` 280ms, `--dur-3` 420ms (list/tile entrance).
- Easing: `--ease-out` to enter, `--ease-in` to exit, `--ease-emphasis` for a small overshoot (count roll).
- Animate `transform` / `opacity` only. `prefers-reduced-motion: reduce` sets every animation and transition to 1ms.

## Layout

- Pages max 640px wide, centred; sheets max 520px. Sell grid: 1 column, 2 from 720px, 3 from 1080px.
- Short landscape (max-height 500px): header and revenue share one row.
- Touch targets >= 44x44px (icon buttons 44px, buttons 48px tall, small visual controls grow their hit area with an absolute `::after`).
- Safe areas: header, content, tab bar (`--tabbar-h` 68px) and sheets pad with `env(safe-area-inset-*)`.
- Must fit at 320-360px wide (layout test runs 320, 360, 412 and 892 wide, both themes, English and Indonesian).

## Components

- **Tile:** product colour, `--r-lg`, `--s3` padding. Name `--fs-md` bold (over 14 chars `--fs-sm`, over 22 also wraps to 2 lines), price `--fs-sm`, payment halves with label (`--fs-xs` caps) and count (`--fs-xl`). Compact tiles: no price, one row per half.
- **Group tile:** group title `--fs-xl` (long ones `--fs-lg`), one pencil; one row per variant: name `--fs-md` + price `--fs-xs`, halves sell on tap (no + icon), counts `--fs-lg`. **Compact:** the name on its own line, payment labels once as column headers, rows 44px: variant name `--fs-sm` on one line (ellipsis) with its price `--fs-xs` under it; unsold counts `--fs-md` regular, sold `--fs-lg` bold with an `--ink-line` ring. **Folded:** tap the name row; only the header shows, chevron turned.
- **Sheets:** bottom sheets, `--surface-1`, top corners `--r-lg`, title `--fs-lg` bold, text `--fs-sm`, actions as a two-button row (Cancel left).
- **Switches:** 44x26 pill track (`--surface-3` off, `--text` on); the whole row is the label.
- **Buttons:** `.btn` 48px, `--r-md`, `--fs-md` bold. Primary = `--text` fill / `--on-ink` text; secondary = `--surface-2`; danger = `--negative` / `--on-negative`, used for destructive confirms only (delete, discard, restore, continue without backup). End day and End event confirm with primary (nothing is lost).
- **Empty states:** left-aligned: quiet icon, title `--fs-md` bold, one sentence `--fs-sm` that says what to do next.

## Copy

- Buttons say what they do, one or two words: "Delete", "End day", "End event", "Restore", "Discard", "Start tour". Never OK / Yes / No / Confirm; the safe choice is "Cancel" (or "Keep editing", "Same event", "Skip"). Message dialogs close with "Close".
- A sublabel only when it explains something the label can't (e.g. "Replaces all data on this phone"). No label above a heading that repeats it.
- Sentence case everywhere except the short labels above; user-typed names exactly as typed.
- English and casual Bahasa Indonesia ("kamu"), both in `src/i18n.ts`. Payment method names, CSV headers and user text are not translated.
