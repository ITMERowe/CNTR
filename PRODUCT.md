# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

A web UI (Preact) packaged with Capacitor as an Android app, the shipping target (Google Play). iOS is included but never built. The design follows its own visual language, not Material, but respects Android behaviour (back button and gesture, touch targets, system text size, edge-to-edge).

## Users

Small booth sellers, mainly in Indonesia (IDR currency, QRIS payments), selling their own goods at conventions and pop-up events. The app is going public on Google Play. These sellers record sales with one hand during rushes, often with poor or no signal at the venue.

## Product Purpose

CNTR is an offline sales counter. The seller taps a product's Cash or QRIS half to record a sale. The app keeps one always-live event, split into days when the seller presses End day, and subtracts booth expenses to show whether the event paid off. CNTR succeeds when a sale never waits on the app and the seller leaves knowing their net result.

## Positioning

CNTR is built for these three things, which a generic POS or a notes app does not offer together:
- **One-tap speed:** a sale is one tap, with no cart or checkout flow.
- **Fully offline:** no account, no server and no network needed.
- **Event profit:** booth costs are subtracted, so the seller sees the event's net profit or deficit.

## Operating Context

- Used standing at a booth, often in a rush, on a phone held in one hand.
- The owner's reference phone is about 412×892 CSS px. Layouts must also work down to 320px.
- Each sale is either cash or QRIS (a digital payment). Sellers check the split to match the cash box.
- One live event at a time: sell, optionally End day each evening, add expenses, End event when it is over; past events stay in History to view, fix, or compare.

## Capabilities and Constraints

- **Screens:** Sell (product tiles), Event (live), History (past events, edit), Compare, Products, Settings.
- **Settings:** 8 currencies (IDR, USD, EUR, SGD, AUD, GBP, JPY, MYR) and an optional compact money format.
- **Storage:** data is stored on the device, in an SQLite database on the phone (WebView `localStorage` in a browser). CNTR has no sync or cloud and no INTERNET permission; Android's own Auto Backup may include the data in the user's Google account backup if the user has it on. Settings → Backup exports a JSON backup (and sales CSV) to a local file and restores from one.
- **Offline assets:** the font (Plus Jakarta Sans) and the Lucide icons are bundled. Nothing may load from the network.
- **Native features:** haptic feedback on taps. The app respects the system reduce-motion setting.
- **Destructive actions** need a confirmation first.
- Not yet tested on a real device.

## Brand Commitments

- Name: CNTR. The logo is a blue cross (launcher icon and splash).
- Owner-set visual decisions (recorded here only so they are not lost; DESIGN.md owns the visual system):
  - VS Code dark palette: `#1e1e1e` background, `#252526` panels.
  - Product tiles use each product's own colour, with white text and icons.
  - Cash and QRIS colours are `#C08024` and `#4D8DF0`.

## Evidence on Hand

- README screenshots in `docs/screenshots/`.
- No testimonials, user counts, reviews or press exist. Do not invent any.

## Product Principles

1. A sale never waits: the most common action takes one tap, needs no confirmation, and can be undone in one tap.
2. Works with no network: nothing may depend on a connection.
3. The answer is the net result: reports lead with what the seller earned after costs.
4. Data loss is the worst failure: anything that destroys data needs a confirmation.

## Accessibility & Inclusion

- Large tap targets for one-handed use in a rush.
- Respect reduce-motion.
- Known gap, accepted by the owner for now: white text on light product colours has low contrast (about 2:1 on yellow).
