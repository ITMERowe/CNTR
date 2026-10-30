# App flow

How a seller moves through CNTR, screen by screen. Code-level navigation (`openScreen`, back button) is in [ARCHITECTURE.md](ARCHITECTURE.md#navigation); the look is in [DESIGN.md](DESIGN.md).

## First launch

1. Empty app → offered the **tutorial** once (30 hands-on steps on practice data; real data comes back exactly on Finish, Quit, a crash or a reload). Replay: Settings → Show tutorial.
2. Language follows the phone on a fresh install; theme is resolved from the phone once, then it's the user's choice.
3. No starter products: the Sell tab's empty state leads to **Add product**.

## Tabs (bottom bar, in this order)

| Tab | What it's for |
|---|---|
| **Event** | The one live event: totals, day cards, expenses, Products card (days with sales only), End day / End event |
| **Products** | Every product: on the counter, then hidden; groups foldable; tap a row to edit, + (top right) to add |
| **Sell** (home) | Title row (+ to add, ⋮ options), revenue hero, then one tile per product or group; tap a payment half to sell, − to undo |
| **History** | Past events (tap to open, edit or compare) and recent sales |
| **Settings** | Event, Money, Looks, Sound, Sales data, Backup, About |

## Selling (the main loop)

1. Sell tab → tap the payment half (Cash, QRIS, …) of a tile: one sale at that product's current price, a light tap + tone.
2. Wrong tap → − on that half undoes the last sale of that product and payment.
3. Groups: one tile, one row per variant; tap the group name to fold or unfold (sell taps are ignored for 400 ms after a fold). Compact tiles (⋮ menu) make every tile shorter.
4. ⋮ menu: Sort by best sellers (today's units) or hold a tile 400 ms and drag to reorder.
5. Sell shows **today only**; the Event tab shows the whole event.

## Products

1. Add / edit opens the product editor: name, price, cost, payment methods (1–2), colour.
2. **Group with variants** switch: group name, shared colour and payments, one row per variant (name, price, cost). Any variant opens the whole group. Removing rows asks "Remove variants?" before saving; leaving with changes asks Keep editing / Discard.
3. Hiding a product keeps its sales; deleting never deletes sales. A sale keeps the price it was sold at.
4. **Delete** (editor trash) is **held**: press and hold about 0.7 s while the button fills, and the product (or the whole group) is deleted, no dialog. A tap only shows "Hold to delete"; letting go early, sliding off or scrolling cancels. From a keyboard or screen reader it asks "Delete product?" / "Delete group?" instead.

## Event lifecycle

1. There is always exactly one live event; its name defaults to "Event {date}".
2. **Expenses**: Event tab → +. Optional **For products** switch links the expense to products: those products then count no per-item cost in this event. An expense's trash is held to delete, like product Delete (keyboard / screen reader: "Delete expense?").
3. **End day** (confirm): closes the day, writes one replacing day backup. Or automatically with "New day when the date changes".
4. **End event** (name it; "No expenses recorded. Are you sure?" when there are none): moves it to History, writes a timestamped automatic backup (newest 20 kept), starts a new live event.
5. "Still at {name}?" asks when the last sale is over 3 days old.

## History

1. Past event → its report (same layout as the Event tab). Edit → change counts, expenses, name; leaving a changed edit asks Keep editing / Discard. Its trash asks "Delete event?" (a dialog, not a hold: it drops a whole event).
2. Compare: pick 2 events; the older is A, B shows the change.

## Data safety

- Everything stays on the phone (SQLite). Export backup / Restore from backup / Export sales as CSV live in Settings. Restore replaces all data and keeps a safety copy first.
- Nothing needs an account or internet.
- Big actions keep a dialog: End day, End event, Restore, delete a past event, remove variants on save. Small deletes (a product, a group, an expense) are held instead.

**Keep this file current:** a change that adds, removes or reorders a screen, step or confirm belongs here in the same commit.
