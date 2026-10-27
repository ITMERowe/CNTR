# HANDOFF

Session-to-session context for CNTR. **Read this before starting work; update it at the end of each session, after milestones, and when a blocker or decision comes up.** If this file disagrees with the code, trust the code and fix this file. Past session details live in `CHANGELOG.md` and git history, not here.

_Last updated: 2026-10-27._

## Start here

- **Branch:** `feature/signing-tests-about`, pushed to origin at `c58f58f`. It is ahead of `main` (`3c0255d`) with: release signing, browser tests, About screen, automatic backups, the merged live Event screen with multi-day events and editable History, payment methods per product, Products per day, the Settings/Products rework. **Not merged into `main` yet** (the owner merged the last branch via a GitHub PR; ask which way).
- **CI:** run #23 (`40445431090`) for `c58f58f` **succeeded** (all tests on Linux/Chrome): release-signed `CNTR_1.0.23.apk` (12.1 MB) + `CNTR_1.0.23.aab` (8.2 MB). Signing has worked since run #22.
- **Do not commit** (owner's machine-specific files): `.claude/settings.json`, `.claude/skills/playwright-cli/`, `.playwright/`.
- **0.1 update: built and committed locally, NOT pushed** (10 commits `af96c1a`..`7a45bc3` on top of `c58f58f`; final whole-branch review done: no Critical, one Important data-loss finding fixed with tests B33/B34, one Important left for a phone check, 10 deferred minors below): tutorial + sound + 0.1 version, security fixes, the 3 bug fixes, light mode, language setting, Bahasa Indonesia. **Waiting for the owner to choose:** merge to `main` locally, push and open a PR, or keep the branch as is. CI has not built 0.1 yet: after a push, check the run and the `CNTR_0.1.<build>.apk`.
- **Verify locally:** `npx tsc --noEmit`, `npm test` (37 unit), `npm run build`, `npm run test:e2e` (10 suites, 296 checks; serves `dist/` on port 4320 with Edge on Windows, so stop any preview you started on 4320 first). Last run 2026-10-27: all pass. Run `graphify update .` after code changes.
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
- **Light mode** (`src/theme.ts`): Settings → Appearance → Theme: Phone setting (default, follows the phone live) / Light / Dark. Light = VS Code Light+ (`#ffffff` bg, `#f3f3f3` panels, `#1e1e1e` text), money green `#116329`, red `#c72c1c`; payment colours unchanged. Every text ≥ 4.5:1 in both themes (layout suite runs both).
- **Language** (`src/i18n.ts`, `t()` / `tn()` for counts, `data-i18n` in `index.html`): English and Bahasa Indonesia (casual "kamu"). Fresh install: Indonesian if the phone is Indonesian, else English; **updating users stay English** until they pick it (Settings → Appearance → Language). Not translated: payment method names, CSV headers (and its "Current event" value), user-typed text. Month names follow the app language (English dates are day-month-year). Practice products stay "Sticker"/"Keychain". Owner to review the Indonesian copy on the phone.
- **Deleting a product never deletes its sales** (owner): they stay in every report under its name; a new product with the same name picks them up.
- **Settings order:** Products, Event, Money, Appearance (Theme, Language), Sound, Sales data, Backup (second to last), About (last). No backup-overdue warning. No explanation notes under Backup (the "data lives only on this phone" and automatic-copies notes were removed as too much text; the About → Privacy text stays). Products are deleted only from the product editor (with a confirm), never from list rows.
- **Tutorial** (`src/tutorial.ts`): hands-on, 28 steps **on rails** (only the spotlighted target and the bubble take taps; Cancel/close/Escape/Android back do nothing; "do" steps have no Skip unless the target is missing for 2 s) on practice data (2 products, 2 practice events): sell Cash/QRIS, undo, totals, add a product (details, payment methods, colour, save), Event tab, add an expense, End day, End event, History open/edit/+1/save/back, Compare, done. **No Settings pass** (owner). Offered once on an empty first launch (Start tour / Skip); Settings → About section → **Show tutorial** replays it, asking first if real data exists. Real data is put aside and comes back exactly on Finish, Quit, or the next launch after a crash (the tour does not resume). No automatic backups during the tour; Export/CSV/Restore refused. Browser tests use `launch()` that pre-marks the offer as seen; `tutorial.test.mjs` uses `launch({ welcome: true })`.
- **Version 0.1** (pre-release): `versionName` `0.1.<run number>` (`android/app/build.gradle`, the `.aab` name in `build-apk.yml`), `package.json` 0.1.0. **1.0 is reserved for when the app is ready to ship.** Earlier builds were named 1.0.x; `versionCode` (the run number) keeps rising, so 0.1.x installs over 1.0.23 as an update.
- License: MIT. Data stays on the phone (SQLite); Android Auto Backup kept (the privacy text now says it may back up to the user's Google account). **No INTERNET permission** and a Content-Security-Policy since the security review (`docs/security-review-2026-10-27.md`).
- The 0.1 design and plan: `docs/superpowers/specs/2026-10-27-0.1-update-design.md`, `docs/superpowers/plans/2026-10-27-0.1-update.md` (all tasks done).

## Owner to-dos

0. **Security follow-ups (from `docs/security-review-2026-10-27.md`):** turn on GitHub → Settings → Emails → *Keep my email address private* and *Block command line pushes that expose my email* (this repo now commits as `38850947+ITMERowe@users.noreply.github.com`; the 80 old commits keep the Gmail, by choice). On the phone, check that Export backup, the share sheet, Restore and automatic backups still work: the INTERNET permission is gone, the share sheet only reaches `Documents/CNTR` and the app's `CNTR` cache folder, and a Content-Security-Policy is in place.

1. After the push, install `0.1.<build>` over 1.0.23 (an update). Test: the tutorial, sounds and vibration, light mode (and "Phone setting" following the phone), Bahasa Indonesia (read the copy), deleting a product (its sales stay), saving an edited past event, export/share/restore without the INTERNET permission. Earlier 1.0.23 results: colours right, payment methods work; End day/End event, History edit, Settings/Products not reported yet.
2. Back up `C:/Users/User/CNTR-signing` (release key + password) somewhere off this computer. Losing it means no more Play updates under the same key. The 3 GitHub secrets are set.
3. Decide how to merge `feature/signing-tests-about` into `main`, and whether to delete the merged branches `feature/safe-storage`, `ui/revamp`, `fix/bugs-ui-docs` and the old local worktree `../CNTR.worktrees/app-overview-explanation` (`agents/app-overview-explanation`).
4. Apply the GitHub description and topics (repo → About → ⚙):
   - Description: `Offline sales counter for convention and pop-up booths: tap-to-sell tiles, Cash/QRIS totals, sales and event profit reports. Preact + Capacitor Android app.`
   - Topics: `point-of-sale`, `sales-tracker`, `offline-first`, `capacitor`, `preact`, `typescript`, `vite`, `android`, `mobile-app`
5. Play Store, still needed: a hosted privacy policy (the About text is the basis), the store listing and screenshots, then the 12-tester / 14-day closed test.

## Known issues (unresolved)

- **Tutorial and sound not tried on a phone:** on Android the tour relies on `sessionStorage` surviving `location.reload()` and being cleared when the app process dies (true for WebView; unverified here). The SQLite swap is tested against the fake native bridge (B25–B28), but the crash-mid-tour case only in the browser (the fake database lives in `sessionStorage`). The bubble was checked by screenshot at 412×892 only.
- **Never run on a real device:** native SQLite, Filesystem/Share (backups), haptics, Android back gesture, safe areas, large system text. All tested only in a browser and against a fake native bridge. iOS never built.
- **Check on the phone (from the 0.1 final review, graded Important, needs a device):** with Theme = Phone setting, switch the phone between dark and light while CNTR is open. If CNTR does not follow until restarted: `MainActivity` handles `uiMode` itself (`configChanges` in `AndroidManifest.xml`), so forward `onConfigurationChanged` to the WebView/JS, or drop `uiMode` from `configChanges` (that recreates the activity on a theme switch).

### Deferred minors (all open; none loses saved data unless stated)

From the 0.1 final review (2026-10-27):
1. **A sale tapped while the tutorial is starting can land in the practice data.** Between Start tour and the reload (`main.ts` `startTutorial()`, `storage.ts` `startTutorialData()`), the screen still takes taps; a sale written in that second is not in the saved real copy and is dropped when the tour ends. *Fix:* a busy overlay or a lock from Start tour until the reload.
2. **A WebView reload mid-tour restarts the tour at step 1** on practice data that has already changed (e.g. the event already ended); later steps then wait on states that cannot happen and show Skip after 2 s. Harmless but confusing (`main.ts` start: `runTour` when `cntrTourRunning` is set). *Fix:* store the step index in `sessionStorage` and resume, or end the tutorial on such a reload.
3. **Startup storage messages are always English** (`storage.ts` `initStorage`: "could not open/read its data", "could not be moved to safer storage"), because they are made before the language is applied. *Fix:* read the saved language first, or translate when shown.
4. **Restoring a backup made before 0.1 switches an Indonesian user to English** (the backup's `cntrSettings` has no `language`; after the reload it is not a fresh install, so English is chosen and saved). *Fix:* keep the current language when the restored settings have none.
5. **Editing a re-created product's price also reprices today's sales of the deleted product with the same name** (`productEditor.ts` → `renameSales` matches by name). Follows the existing "edits apply to today's sales" rule. *Fix (if wanted):* only when the owner decides products need an id instead of the name.
6. **Switching language while a dialog is open** leaves that dialog's text in the old language until it is reopened (`translateStatic` skips text set by code). *Fix:* close open dialogs, or re-render them, on a language change.
7. **Flaky check:** `tests/e2e/motion.test.mjs` "[reduced motion] sheet in place almost immediately" failed once in a full run on a busy machine, then passed 3/3 alone. *Fix:* give it a slightly larger time window if it fails again (watch CI).

From the earlier events code review:
8. Restoring an old 1.0.21 backup empties History without saying so (a safety copy is taken first).
9. CSV calls an unnamed live event "Current event" while the screen says "Event <date>" (CSV stays English by owner decision).
10. History +1 on an event's last day can be timed after the event ended (affects only the hour chart).

### Calls made during the 0.1 build (owner to check)
- Saving an edited past event always finishes once started: Save, Cancel and Android back are locked meanwhile; switching tabs does not cancel it.
- An empty day card says just "No sales yet".
- Light mode: contrast checked with the layout suite's WCAG scan; money green `#116329`, red `#c72c1c`; payment colours unchanged.
- The Language row sits in the Appearance group next to Theme.
- Indonesian uses the casual "kamu" (one search-and-replace in `src/i18n.ts` to switch to "Anda"); practice products stay "Sticker"/"Keychain"; backup error messages are translated too; CSV stays English.
- No special colour for a deleted product's sales (the screens already fall back to grey).

### Other known limits
- Tile text on pink/green/orange is below WCAG 4.5:1 (owner's choice).
- A sale is written a few ms after the tap; killing the app in that instant can lose that tap.
- Uninstalling, clearing app data or losing the phone deletes everything unless a backup was exported (stated only in About → Privacy now).
- The impeccable detector flags the `--ease-emphasis` overshoot curve (advisory; left as is).
- No DESIGN.md (run `/impeccable document` if wanted).
- `git stash` holds "Live Event screen (superseded by merged Event design)"; it is obsolete and can be dropped.

## Ideas not chosen yet (ask the owner first)

Stock counts / sold-out; discounts and bundles; end-of-day cash count.
