# HANDOFF

Session-to-session context for CNTR. **Read this before starting work; update it at the end of each session, after milestones, and when a blocker or decision comes up.** If this file disagrees with the code, trust the code and fix this file. Past session details live in `CHANGELOG.md` and git history, not here.

_Last updated: 2026-10-27._

## Start here

- **Branch:** `feature/signing-tests-about`, pushed to origin at `c58f58f`. It is ahead of `main` (`3c0255d`) with: release signing, browser tests, About screen, automatic backups, the merged live Event screen with multi-day events and editable History, payment methods per product, Products per day, the Settings/Products rework. **Not merged into `main` yet** (the owner merged the last branch via a GitHub PR; ask which way).
- **CI:** run #23 (`40445431090`) for `c58f58f` **succeeded** (all tests on Linux/Chrome): release-signed `CNTR_1.0.23.apk` (12.1 MB) + `CNTR_1.0.23.aab` (8.2 MB). Signing has worked since run #22.
- **Do not commit** (owner's machine-specific files): `.claude/settings.json`, `.claude/skills/playwright-cli/`, `.playwright/`.
- **Uncommitted work (version 0.1):** Backup notes removed, haptics + sound (Settings → Sound), the hands-on tutorial, version names `0.1.<build>`. All local checks pass; nothing committed or pushed yet, so CI has not built 0.1.
- **Verify locally:** `npx tsc --noEmit`, `npm test` (29 unit), `npm run build`, `npm run test:e2e` (9 suites, 190 checks; serves `dist/` on port 4320 with Edge on Windows, so stop any preview you started on 4320 first). Last run 2026-10-27: all pass. Run `graphify update .` after code changes.
- **Tooling:** no JDK/Android SDK, Xcode or `gh` here: APKs are built only by CI, and the GitHub API is read-only (60 requests/hour). In Git Bash, piping node+playwright output into `grep` can swallow it: write to a file, then read it.

## Goal

CNTR is an offline sales counter for convention/pop-up booths (TypeScript + Preact + Vite, Capacitor 8 for Android). The owner wants it **published on Google Play**. Product context: `PRODUCT.md` (platform: android). Architecture: `docs/ARCHITECTURE.md`.

## Standing owner decisions

- VS Code dark palette (`#1e1e1e` background, `#252526` panels); product tiles use the product's own colour.
- Tile text is white, or dark (`#1e1e1e`) only where white is below 2.6:1 (pink, green and orange stay white; beige and yellow get dark). The layout test allows 2.6:1 for tile text only.
- Sell revenue figure is 3/4 the size of the report figures.
- **Events:** always one live event; optional End day (confirm only, no undo); End event (name, automatic backup) moves it to History. The Sell tab shows today only. Net profit = product profit − expenses everywhere. Day cards show profit before expenses (owner to judge when testing). Compare = 2 events. Old saved reports were dropped (kept in the database and in one automatic backup on first launch).
- **Products per day** (Settings → Event) is on by default.
- **Payment methods:** each product takes 1 or 2 of Cash, QRIS, Transfer, Card, E-wallet; default and old products = Cash + QRIS. Colours: Cash `#c08024`, QRIS `#4d8df0`, Transfer `#199e70`, Card `#9085e9`, E-wallet `#d55181` (dataviz-validated for adjacent pairs; always shown with the method's name).
- No starter products: a fresh install starts empty.
- **Haptics and sound** (`src/feedback.ts`, one `feedback(kind)` call): sale = light tap + high soft tone; undo = medium tap + low tone; steppers, switches, payment picks, product saved = light tap only; deletes = medium tap only; End day, End event, event edit saved, backup/CSV exported = success buzz + two-note chime; refusals and failures = warning buzz only. Tones are generated with Web Audio (no files). Settings → Sound → **Sound effects** (on by default) turns tones off; vibration is always on. Not yet felt or heard on a real phone.
- **Settings order:** Products, Event, Money, Sound, Sales data, Backup (second to last), About (last). No backup-overdue warning. No explanation notes under Backup (the "data lives only on this phone" and automatic-copies notes were removed as too much text; the About → Privacy text stays). Products are deleted only from the product editor (with a confirm), never from list rows.
- **Tutorial** (`src/tutorial.ts`): hands-on, 28 steps **on rails** (only the spotlighted target and the bubble take taps; Cancel/close/Escape/Android back do nothing; "do" steps have no Skip unless the target is missing for 2 s) on practice data (2 products, 2 practice events): sell Cash/QRIS, undo, totals, add a product (details, payment methods, colour, save), Event tab, add an expense, End day, End event, History open/edit/+1/save/back, Compare, done. **No Settings pass** (owner). Offered once on an empty first launch (Start tour / Skip); Settings → About section → **Show tutorial** replays it, asking first if real data exists. Real data is put aside and comes back exactly on Finish, Quit, or the next launch after a crash (the tour does not resume). No automatic backups during the tour; Export/CSV/Restore refused. Browser tests use `launch()` that pre-marks the offer as seen; `tutorial.test.mjs` uses `launch({ welcome: true })`.
- **Version 0.1** (pre-release): `versionName` `0.1.<run number>` (`android/app/build.gradle`, the `.aab` name in `build-apk.yml`), `package.json` 0.1.0. **1.0 is reserved for when the app is ready to ship.** Earlier builds were named 1.0.x; `versionCode` (the run number) keeps rising, so 0.1.x installs over 1.0.23 as an update.
- License: MIT. Data stays on the phone (SQLite); Android Auto Backup and the default INTERNET permission were kept as they were.

- **Next big update (0.1, planned, not started):** design in `docs/superpowers/specs/2026-10-27-0.1-update-design.md`: security review (report first), 3 bug fixes (deleting a product keeps all its sales; Cancel during a past-event save; empty day shows "No sales yet"), light mode (VS Code Light+, Appearance: Phone setting/Light/Dark), Indonesian (fresh install follows phone if Indonesian; updating users stay English; payment names and CSV headers stay English; months follow app language). Design approved 2026-10-27. Plan: `docs/superpowers/plans/2026-10-27-0.1-update.md` (Tasks 0–8; Task 1 stops for the owner to read the security report). Waiting for the owner to review the plan and pick how it is executed.

## Owner to-dos

1. Owner is testing `1.0.23` on the phone (it installed as an update, no uninstall needed). Confirmed so far: tile and text colours are right; products with one payment method work; the other payment methods work. Still to report: End day/End event, History edit, Settings/Products.
2. Back up `C:/Users/User/CNTR-signing` (release key + password) somewhere off this computer. Losing it means no more Play updates under the same key. The 3 GitHub secrets are set.
3. Decide how to merge `feature/signing-tests-about` into `main`, and whether to delete the merged branches `feature/safe-storage`, `ui/revamp`, `fix/bugs-ui-docs` and the old local worktree `../CNTR.worktrees/app-overview-explanation` (`agents/app-overview-explanation`).
4. Apply the GitHub description and topics (repo → About → ⚙):
   - Description: `Offline sales counter for convention and pop-up booths: tap-to-sell tiles, Cash/QRIS totals, sales and event profit reports. Preact + Capacitor Android app.`
   - Topics: `point-of-sale`, `sales-tracker`, `offline-first`, `capacitor`, `preact`, `typescript`, `vite`, `android`, `mobile-app`
5. Play Store, still needed: a hosted privacy policy (the About text is the basis), the store listing and screenshots, then the 12-tester / 14-day closed test.

## Known issues (unresolved)

- **Tutorial and sound not tried on a phone:** on Android the tour relies on `sessionStorage` surviving `location.reload()` and being cleared when the app process dies (true for WebView; unverified here). The SQLite swap is tested against the fake native bridge (B25–B28), but the crash-mid-tour case only in the browser (the fake database lives in `sessionStorage`). The bubble was checked by screenshot at 412×892 only.
- **Never run on a real device:** native SQLite, Filesystem/Share (backups), haptics, Android back gesture, safe areas, large system text. All tested only in a browser and against a fake native bridge. iOS never built.
- **Deferred minor findings (from the events code review):**
  - Pressing Cancel while Save's automatic backup is running still saves the edit.
  - Deleting a product also deletes its sales from ended days of the live event.
  - Restoring an old 1.0.21 backup empties History without saying so (a safety copy is taken first).
  - CSV calls an unnamed live event "Current event" (the screen says "Event <date>").
  - An empty Day 1 card shows today's date.
  - History +1 on an event's last day can be timed after the event ended (affects only the hour chart).
- Tile text on pink/green/orange is below WCAG 4.5:1 (owner's choice).
- A sale is written a few ms after the tap; killing the app in that instant can lose that tap.
- Uninstalling, clearing app data or losing the phone deletes everything unless a backup was exported (stated only in About → Privacy now).
- The impeccable detector flags the `--ease-emphasis` overshoot curve (advisory; left as is).
- No DESIGN.md (run `/impeccable document` if wanted).
- `git stash` holds "Live Event screen (superseded by merged Event design)"; it is obsolete and can be dropped.

## Ideas not chosen yet (ask the owner first)

Stock counts / sold-out; discounts and bundles; end-of-day cash count.
