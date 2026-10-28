# Events: one live event, multi-day, History you can edit

Date: 2026-10-27. Status: reviewed by a builder check; waiting for owner approval.

## Why

The owner sells at conventions that last more than one day. Last time they used a plain counter, wrote the revenue down each evening, and asked ChatGPT for the totals and the profit. CNTR must do that itself: always show live figures, keep each day apart when wanted, and give the event total and net profit without any saving, importing or adding up by hand.

Today's app splits this across two screens (Reports for the live counter, Event for imported sales plus expenses) and needs "Save report", "Import sales" and "Save event report" to join the days. That is the friction this design removes.

The reference pattern is a restaurant till's shift / "Z report": the till is always counting; closing a shift freezes it and starts the next; the day's report is just what was counted.

## Goals

- One **live event** at all times. Selling on the Sell tab always adds to it. Its screen updates on every sale, with no save or import step.
- **Multi-day**: an optional **End day** splits the event into days. Each finished day is frozen; today stays live. The event total covers all days.
- **End event** finishes it: confirm the name, it moves to **History**, and a fresh live event starts.
- **History**: list past events, view one (same layout as the live screen, frozen), compare two or more, and **edit**: rename, fix Cash/QRIS counts per product per day ("a friend counted one I missed"), and add, change or delete expenses (e.g. Rp 2.500.000 → Rp 2.496.820).
- Net profit is always one glance away: product profit (revenue − product cost) − expenses.

## Non-goals

- End-of-day cash count / cash reconciliation (owner: left out for now).
- Undo for End day, moving or removing a day break, or editing the live event (owner: the confirm is enough; fixes happen in History).
- Keeping old saved reports (owner: dropped; the app is not live and the owner is the only tester).
- Several live events at once, sync, accounts, or any network use (the app stays 100% offline).
- Stock counts, discounts, bundles.

## Anti-goals (would make this a failure even if it works)

- Losing a single sale, or a day's sales, through End day, End event, an edit or the migration.
- Any "did you remember to save?" step coming back. If the owner has to save or import to see a total, the design failed.
- A prompt that interrupts selling (no "start a new day?" question; the first tap simply sells).
- Totals that disagree between the live screen, the day cards, History and Compare.

## How it works (decided)

### The live event

- There is always exactly one live event. It is created empty with the name **"Event <date>"** (the date it starts, in the app's date format). An empty live event is created the first time it is needed (first launch, after End event); the name's date is the date of its **first sale**, or of creation if renamed before any sale (builder's call on the exact rule, as long as a fresh event shows a sensible name).
- The name is tappable and renamable while live.
- Products stay global (the Sell tiles, as today). Each sale already stores its own price and cost, so changing a product's price later never changes past sales.
- Expenses belong to the event (today's `cntrEventCosts` becomes the live event's expenses).

### End day

- Optional. If it is never pressed, the event is one block and the screen shows no day cards.
- Pressing it (with a confirm) records a day break at that moment. From then on the screen shows **frozen day cards** (Day 1, Day 2, …, each with its date, revenue and profit) and **today** live.
- A day is "the sales between two breaks". Expenses are for the whole event, not per day, so a day card's profit is that day's product profit, before expenses (_my call; owner will judge it when testing_); the hero's net profit subtracts expenses once, for the event.
- No Undo (D3). The protection is the "are you sure?" confirm (owner: accidentally pressing End day *and* confirming is unlikely). Day breaks cannot be moved or removed, and the live event's finished days are not editable; count fixes happen in History after End event.
- **Sell tab after End day (owner): today only.** The Sell tiles' Cash/QRIS counters and the Sell hero show today's sales, like a till shift, and reset at each End day. The tiles' − (undo) only removes today's sales, so a finished day is never changed from Sell. Event totals are on the Event tab.

### End event

- Asks for the final name (prefilled with the current name), then moves the event to History and starts a fresh live event. Confirm before ending; an automatic backup is made first (existing automatic-backup mechanism).
- Ending an event with no sales and no expenses is allowed but does nothing useful; the builder may disable the button in that case.

### The merged screen (replaces Reports + Event)

Top to bottom: event name (tap to rename) → live net-profit hero → Revenue / Profit / Expenses cards (current 2-column KPI layout) → day cards (only after the first End day) → expenses list with add → top products (Cash/QRIS per product, current breakdown) → End day and End event buttons.

Removed: Save report, Save event report, Import sales, the clear buttons on these screens. Tabs go from 5 to 4: **Event, Sell, History, Settings** (Sell stays the default tab).

### History

- Lists past events, newest first: name, dates (first–last day), revenue, net profit.
- Tap → the same layout as the live screen, frozen, with an Edit action.
- Compare: pick **two** events (the current two-column Compare screen, fed by events instead of saved reports). (Owner: two only; more would not fit a phone screen.) Net profit everywhere, Compare included, is **product profit − expenses** (owner), where product profit is revenue − product cost, the figure the app already shows. Today's Compare uses revenue − expenses, so its figures will change.
- Edit:
  - rename (D4: saved events stay renamable);
  - per day, per product: Cash and QRIS counts with − / + (the sales are adjusted to match). _My calls:_ + adds a sale at the price and cost of that product's most recent sale **on that day**, or, if it had none that day, its price and cost in the event's product snapshot; − removes one of that product's sales of that payment type on that day (owner: you edit per product, so which one does not matter; the builder picks any, e.g. the latest). Products offered are those in the event's snapshot (everything sold in the event); a product never sold in the event cannot be added here. An added sale is timestamped inside that day (just before the day's end).
  - expenses: add, change, delete.
  - An automatic backup is made before each saved edit. Edits are saved explicitly (Save / Cancel), not on every tap, so one backup covers one edit session.
- Deleting a past event: allowed with a confirm and an automatic backup first (the current app can delete saved reports).

### Data

- New stored shape (builder may refine names):
  - `Event { id, name, startedAt, endedAt?, products: Product[] (snapshot of the products sold, for colours and edit prices), sales: SaleRecord[], expenses: EventCost[], dayBreaks: string[] (ISO times) }`.
  - One live event key and one list of past events. Same `kv` store, same JSON-string values, so backup, the browser build and SQLite keep one format.
- Event maths (totals, per-day split, net profit) live in `src/reports.ts` and are shared by the live screen, History, Compare and CSV, so all figures agree.

### Migration (one time, on first launch of the new version)

- Automatic backup first.
- Today's live sales (`cntrSales`) and expenses (`cntrEventCosts`) become the live event (one block, no day breaks), named "Event <date of the first sale>".
- `cntrSavedReports` and `cntrImportedEventReport` are **dropped** (D1). They are not deleted until the new data has been written and read back; then they are no longer read. (Whether to delete the old keys or just stop reading them: builder's call; the backup taken first keeps them either way.)
- Verified by read-back and by comparing totals before and after; safe to run twice; a failure part-way leaves the old data in charge.

### Backup, restore, CSV

- Backups contain the live event and past events. Restoring an **old** backup file (from 1.0.21) still works: its live sales and expenses become the live event; its saved reports are ignored (D1).
- CSV export: one row per sale with event name and day number added.

## Constraints

- Offline only; no new runtime dependency unless unavoidable.
- Existing standards: VS Code-dark palette, original product colours, 44px tap targets, no overflow at 320 / 360 / 412 px and landscape, Android back steps back through every new screen and sheet.
- Storage rules from the safe-storage work hold: ordered write-through, no dropped writes, restore all-or-nothing.
- Tests: unit tests for event maths and migration (old-format data, failure mid-way); browser tests for the full flow (sell → End day → sell → End event → History → edit → compare), migration via the fake bridge, layout and contrast. Remove tests of removed features.

## Left to the builder

- Exact storage key names and module split.
- Exact wording of buttons, confirms and empty states (plain, short, matching current copy).
- The exact rule for the default name's date (see "The live event").
- Whether to delete or merely stop reading the old keys after migration.
- Visual details of the day cards and History rows, within the existing design system.
