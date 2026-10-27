# HANDOFF

Session-to-session context for CNTR. **Read this before starting work; update it at the end of each session, after milestones, and when a blocker or decision comes up.** If this file disagrees with the code, trust the code and fix this file.

_Last updated: 2026-10-27, events build session (merged Event screen, multi-day events, History edit). Built and tested; NOT committed._

## Start here (next session)

- **Checked out:** branch `feature/signing-tests-about` (`0631f5c` code + `f6081e4` docs + a HANDOFF commit), based on `main` `3c0255d`. **Committed locally, NOT pushed.**
- **Waiting on the owner:** add the 3 GitHub secrets for release signing (`CNTR_KEYSTORE_BASE64`, `CNTR_KEYSTORE_PASSWORD`, `CNTR_KEY_ALIAS` = `cntr`; values in `C:/Users/User/CNTR-signing`, see its `README.txt`) and back that folder up off this computer. **Then push** the branch (owner approval for the push still needed; it was deferred until the secrets exist so the first CI build is release-signed).
- **After the push, check CI:** run should show the release APK `CNTR_1.0.N.apk` + `CNTR_1.0.N.aab`, and the new "Browser tests" step (`npm run test:e2e`, Chrome on Ubuntu) must pass; both are untested on CI so far. Then the owner merges (they used a GitHub PR for #2; ask which way).
- **On the phone (owner has `CNTR_1.0.21.apk`, a debug build):** export a backup in 1.0.21 → uninstall → install the first release APK → restore. That is the last forced uninstall.
- **Events build (2026-10-27): committed `22e4514` and pushed** (owner approved) to `origin/feature/signing-tests-about`. CI run #22 (40381607702) **success**: unit tests, browser tests on Linux/Chrome (first time on CI: pass), APK `CNTR_1.0.22.apk` (13.4 MB). It is a **debug** build (no `.aab`, "Upload Play bundle" skipped): the signing secrets were not set yet. Owner then added the 3 secrets and re-ran: run #22 attempt 2 **success, release-signed**: `CNTR_1.0.22.apk` (12.1 MB) + `CNTR_1.0.22.aab` (8.2 MB), "Upload Play bundle" ran. Signing works on CI (verified via public API: artifacts + step results). Not yet verified: installing it on the phone (needs one last uninstall from debug 1.0.21; backup → uninstall → install → restore). See "Task list: merged Event screen + multi-day events" below.
- **Uncommitted on purpose (owner's, machine-specific):** `.claude/settings.json`, `.claude/skills/playwright-cli/`, `.playwright/`. Do not commit.
- **How to verify locally:** `npx tsc --noEmit`, `npm run build`, `npm test` (22 unit), `npm run test:e2e` (6 suites, 134 checks; serves `dist/` on port 4320, Edge on Windows). Last run 2026-10-27 on the events code: all pass.
- **Tooling notes:** no JDK/Android SDK, Xcode or `gh` on this machine (APK builds only via CI; GitHub API read-only, 60 req/h). In Git Bash, piping node+playwright output into `grep` can swallow it: write to a file first.

## Goal

- **Project:** CNTR, an offline sales counter for convention/pop-up booths (TypeScript + Preact + Vite, packaged with Capacitor 8 for Android). Owner wants it **published on Google Play**.
- **Last task (latest session):** release signing, browser tests in the repo, About screen, automatic backups, readable tile text, Sell revenue figure at 3/4 size (see "Signing, tests, About session").
- **Before that:** make data storage reliable and 100% offline: SQLite instead of localStorage, safe migration, JSON/CSV export, validated restore, failure handling, tests (see "Safe storage session").
- **Before that:** clean up, verify, commit, push, and merge everything into `main` (owner authorized the push and merge).
- **Before that:** polish with all applicable skills, and make Android back (button/gesture) step back inside the app (see "Multi-skill polish + Android back").
- **Earlier:** make the Sell and Event screens compact, so 4 tiles fit and amounts in the millions are not cut off.
- **Task before that:** clean up the project locally and on GitHub; rewrite the README; add a license (owner chose **MIT**); prepare the GitHub description and topics.
- **Standing design decisions from the owner:** VS Code-dark palette (`#1e1e1e` bg, `#252526` panels); product tiles use the **original product colours**; text and icons are white, or dark (`#1e1e1e`) only where white would be below 2.6:1 (owner raised the cutoff on 2026-10-27: pink #f76495 2.91, green #31b500 2.71, orange #f16900 3.11 stay white; beige 2.50 and yellow get dark). The layout test allows 2.6:1 for tile text only. Sell revenue figure is 3/4 the size of the report figures (owner's request).

## Current state (verified 2026-10-26)

| Branch | State |
|---|---|
| `feature/signing-tests-about` | **Current branch.** Signing, e2e tests, About, automatic backups, dark tile text, smaller revenue figure. Local only, not pushed. |
| `main` (`3c0255d`) | Everything up to safe storage: `ui/revamp` (merged `ac94981`) + `feature/safe-storage` (owner merged PR #2). CI run #21 → `CNTR_1.0.21.apk` (on the owner's phone). |
| `feature/safe-storage` | Merged into `main` via PR #2. Safe to delete once the owner agrees. |
| `ui/revamp` | Fully merged into `main`. Kept (not deleted); safe to delete once the owner agrees. |
| `fix/bugs-ui-docs` | Fully merged into `main`; safe to delete (owner approval needed, not done). |
| `agents/app-overview-explanation` | **Local only**, checked out as a worktree at `../CNTR.worktrees/app-overview-explanation`, at old commit `6edd319`. Not created in these sessions; left untouched. Owner to decide. |

Architecture (details in `docs/ARCHITECTURE.md`):
- `src/state.ts`: state and rules (no DOM).
- `src/storage.ts`: in-memory data, written through to `src/kv.ts` (SQLite on the phone, localStorage in a browser); `src/migrate.ts` (one-time localStorage → SQLite), `src/backup.ts` (backup format/validation/CSV), `src/files.ts` (backup files, automatic backups).
- `src/reports.ts`: report maths.
- `src/ui/`: DOM chrome (`dom.ts`, `productEditor.ts`, `colorPicker.ts`, `icons.ts`).
- `src/views/*.tsx`: Preact screens, including `SalesGrid.tsx` (tiles) and `SalesHero.tsx`.
- `src/main.ts`: controller.
- `src/style.css`: design tokens.
- Tests: `tests/storage.test.ts` (unit, `npm test`), `tests/e2e/*.test.mjs` (browser, `npm run test:e2e`).
- CI: `.github/workflows/build-apk.yml` runs on every branch push: unit tests, build, browser tests (on the new branch), then `CNTR_1.0.<run_number>.apk` (release-signed + `.aab` when the signing secrets exist, else debug).

## Cleanup session: files changed (committed)

Created:
- `LICENSE`: MIT, "Copyright (c) 2026 ITMERowe" (owner approved MIT).
- `docs/screenshots/{sell,reports,event,product-editor}.png`: README screenshots (headless-browser renders of `ui/revamp` with sample data, 412px wide, about 50 KB each).
- `HANDOFF.md`: this file.

Modified:
- `README.md`: rewritten from the code. Purpose, features, stack, layout, setup, commands, Android (CI and local), iOS status, data/backup limits, testing, contributing, license and third-party licenses.
- `docs/ARCHITECTURE.md`: removed stale `escapeHtml` and "legacy string templates" mentions; updated rendering and navigation wording.
- `CHANGELOG.md`: relabelled sections ("Unreleased (branch `ui/revamp`)" vs "2026-10-26 (merged to `main`)"); added a Project entry.
- `package.json` / `package-lock.json`: added `"license": "MIT"`; **removed unused `@types/node`**.
- `src/formatters.ts`: removed the unused `escapeHtml` (no screen builds HTML strings any more).
- `src/style.css`: removed the unused `.nowrap`.
- `CLAUDE.md`, `AGENTS.md`: added a "Session handoff" rule (read and maintain `HANDOFF.md`).
- `graphify-out/*`: regenerated by `graphify update .`.

Deliberately **not** changed:
- `chokidar-cli` kept: it powers `build:watch`, which type-checks on every rebuild; `vite build --watch` would drop that.
- Agent tooling kept as tracked (`.claude/skills/graphify`, `.codex/`, `graphify-out/`). `.claude/settings.json` and `.codex/hooks.json` contain machine-specific absolute paths, which would break hooks for other machines (pre-existing).
- Owner's uncommitted work left alone: `.claude/settings.json` (local edit), `.claude/skills/playwright-cli/`, `.playwright/cli.config.json`.
- Ignored local build output (`android/build`, `android/.gradle`, `dist/`, ...) left on disk; it is correctly ignored and regenerable.

## Inspection results

- Secrets: none found in tracked files or anywhere in git history (scanned for keystores/env/credential files and key/token patterns).
- `.gitignore` already covers node_modules, dist, keystores/`keystore.properties`, env files, logs, editor/OS files, Playwright CLI output and graphify caches. No change needed.
- Dependencies: all used except `@types/node` (removed). Licenses: Preact/Capacitor/Vite MIT, Lucide ISC, Plus Jakarta Sans OFL-1.1, all compatible with MIT.
- Dead code: one unused export (`escapeHtml`) and one unused CSS class, both removed.
- No linter, formatter or automated test suite is configured in the repo (pre-existing; not added).

## Decisions

- **License: MIT** (owner's choice). Anyone may reuse or republish the code, including on app stores, with attribution.
- **Cleanup lives on `ui/revamp`**, so the README describes the code that exists on that branch; it reaches `main` when `ui/revamp` is merged.
- Earlier decisions still stand: Preact; bundled fonts and icons (offline); Cash/QRIS colours `#C08024`/`#4D8DF0` validated on `#252526` (re-validate if changed); original tile colours; Gradle 8.14.3 / AGP 8.13.0.

## Compact layout session (2026-10-26). Committed in `96bd03b`, merged to `main`

Now committed (`96bd03b`) and merged to `main`. Files: `src/style.css`, `src/views/ReportParts.tsx`, `src/views/SalesHero.tsx`, `HANDOFF.md`, `graphify-out/*`.

Owner's phone is about **412×892 CSS px** (1280×2772 physical). Use that size for layout checks.

1. **Sell tiles compact** (owner wanted at least 4 tiles visible). In `src/style.css`:
   - name and price on one line (the name gets "…" if too long);
   - Cash/QRIS halves `min-height: 80px` (were 92px); counts 28px (24px at ≤360px);
   - +/− circles 26px and the edit button 32px; edit and undo keep larger tap areas through `::after { inset: -6px }`;
   - tile padding 12px, radius `--r-lg`, grid gap 8px.
   - Result: tiles are 144px (were about 194px). At 412×892 the 4th tile ends at 795px and the nav starts at 824px.
   - 70px was tried first, but the undo button's tap area then overlapped the + circle (a low tap undid a sale). At 80px there is a 12px gap and no overlap (verified with `elementFromPoint`).
2. **Event KPI cards**: `.kpi-row-3` is now a 2-column grid. Revenue and Profit are on the first row; Expenses wraps to the second row at the **same width**, with an empty space beside it. The owner rejected a full-width Expenses card as awkward. Values are 17px (15px at ≤360px).
3. **Hero figure overflow (existing bug fixed)**: a long amount (e.g. `-Rp 124.500.000`) made the whole page wider than the screen. Fix:
   - `.hero-figure` font-size `min(clamp(40px, 12vw, 52px), calc((min(100vw, 520px) - 40px) / (var(--chars, 1) * 0.6)))`;
   - `--chars` (the text length) is set inline in `Hero` (`ReportParts.tsx`) and `SalesHero.tsx`;
   - `.report-hero { min-width: 0 }`.
   - Short amounts keep their old size. `0.6` is an estimated character width for Plus Jakarta Sans bold.

Verified (headless Edge via `playwright-core`, `vite preview` on port 4317):
- `npx tsc --noEmit` and `npm run build` pass.
- At 412, 360 and 320px with a Rp 125.500.000 expense: no KPI value or hero cut off, and the page is no wider than the screen.
- At 900px wide, `-Rp 1.124.500.000` fits at 47px.

Not verified:
- Real phone: tap accuracy with the smaller buttons, fonts.
- A billion-rupiah KPI value at 320px would still be cut off with "…" (accepted; unlikely).

Test scripts live in this session's scratchpad (`shot.mjs`, `event.mjs`, `fix.mjs`), not in the repo. They import `playwright-core` from an older session's scratchpad (`...\67ae2af9-914b-4f40-abfd-0726aac79ea7\scratchpad\ci-check\node_modules`), because `playwright` is not installed in the project. To see Event data in the browser, you must click **Import sales**, tick "current-live" and confirm.

## Polish pass (2026-10-26, impeccable `polish`). Committed in `96bd03b`, merged to `main`

The impeccable skill is now installed. A polish pass across all 21 screens/states, with screenshots at 412 and 320px, found three defects. All other screens (Sell, Reports, Event, History, compare, modals, colour picker, saved reports) needed no change.
1. **Products list cut off the cost** ("cost Rp 12...." at 412px). Price and cost now sit on their own lines (`Lists.tsx` spans + `.list-sub-text > span` in `style.css`). At 412px everything shows in full; at 320px the cost still gets "…" (the edit/delete/switch buttons take the width; accepted).
2. **Report hero was inset 4px** from the page title and the Sell hero: `.report-hero` horizontal padding is now 0.
3. **Text selection used the browser default**: added `::selection` with VS Code's selection blue `#264f78`.

Verified: `npx tsc --noEmit` and `npm run build` pass. A scan of all 5 tabs at 320, 360 and 412px found no overflowing text and no page wider than the screen (scripts `shots.mjs` and `overflow.mjs` are in this session's scratchpad; they now import `playwright-core` from the project's own `node_modules`). The impeccable detector found only the existing `--ease-emphasis` overshoot curve (advisory; left as is).
Note: an old `vite preview` is still holding port 4179 from an earlier session; this session used port 4318.
Not verified: real phone.

Owner requests still open:
- The `ui-ux-pro-max` polish offered earlier was replaced by the impeccable polish above.

## Multi-skill polish + Android back (2026-10-26). Committed in `a13e3af` + `96bd03b`, merged to `main`

Skills used: ui-ux-pro-max (touch targets, contrast, 375px/landscape checklist), dataviz (charts), impeccable `audit` checklist, superpowers `verification-before-completion`. The owner has since written `PRODUCT.md` (impeccable product context).

Changes:
1. **Android back (button and gesture)** (`src/main.ts` `goBack()`, `@capacitor/app` ^8.1.2 added, `npx cap sync android` done; `android/app/capacitor.build.gradle` and `android/capacitor.settings.gradle` changed by the sync). Before, back closed the app. Order: colour picker → options menu → open sheet (its X button) → the screen's visible `.back-btn` → Sell tab → `App.minimizeApp()` (app goes to the background; data is kept). It runs only on native.
2. **Colour picker drag stuck after `pointercancel`** (`src/ui/colorPicker.ts`): Android cancels the pointer on system gestures, and the drag then followed any later finger movement. It now ends on cancel.
3. **44px tap areas** (`style.css`): undo `::after` inset −9px (was −6px; 38→44px; the + circle still ends 3px above it); `.btn-small` gets an invisible 44px hit area (Event "Import sales"); currency `select` is 44px tall (was 40).
4. `--selection` token for the `::selection` colour (no raw hex outside `:root`).

No change needed (checked): the Cash/QRIS palette passes the dataviz validator on `#252526` (CVD ΔE 27.8); the charts have text labels, aria, and tap-to-read; reduced motion handled; heading structure fine; colour picker uses `touch-action: none`.

Verified (fresh run, final code): `npx tsc --noEmit` exit 0; `npm run build` exit 0. Audit at 412×892, 375×812 and 892×412 (landscape): no tap target under 44px, no unlabeled control, no page wider than the screen. Overflow scan at 320/360/412: none. Android back: simulated the native bridge in headless Edge (`back.mjs`); all 10 cases behave as listed above. Picker fix red-green: without the fix the colour changed after cancel (`#F1EAEC → #0E0005`); with it, it stays.
Known, accepted: white text on light tile colours (contrast 1.95–3.1:1; owner decision). Products cost still gets "…" at 320px.
Not verified: real Android device (the back gesture on a phone, predictive back animation on Android 14+, haptics); large system font size (Android text zoom was not emulated).
Tooling note: in this shell, piping node+playwright output into `grep` swallows it; write the output to a file and read that instead. Scripts are in this session's scratchpad (`audit.mjs`, `overflow.mjs`, `back.mjs`, `check.mjs`, `shots.mjs`); server: `npx vite preview --port 4318`.

## Impeccable init (2026-10-26). `PRODUCT.md` committed in `049b3a6`, merged to `main`

- Created `PRODUCT.md` from the repo plus the owner's answers:
  - users are any small booth seller (a public Play Store app, mainly Indonesia);
  - the edge is one-tap speed, working offline, and event profit;
  - the platform is `web` (a custom design language, not Material).
- Not done: no DESIGN.md (run `/impeccable document` if wanted). No `.impeccable/config.json` (no image generation available). Live mode not configured.
- Also rebuilt `graphify-out/` this session. The vendored graphify skill docs were left out of the graph, with the owner's approval.

## Safe storage session (2026-10-26). Merged into `main` via PR #2 (`3c0255d`)

Decision: **SQLite** (`@capacitor-community/sqlite` 8.1.1) over `@capacitor/preferences`. Preferences is a small key-value store (Android rewrites one XML file per save; no multi-key atomicity), unsuitable for growing sales history. SQLite gives transactional writes, so a restore is all-or-nothing. Data model unchanged: one table `kv(key, value)` holding the same JSON strings as before, so backups, the browser build and migration all use one format. Also added `@capacitor/filesystem` 8.1.5 and `@capacitor/share` 8.0.3 (backup files). All offline; no network at runtime.

Files:
- New: `src/kv.ts` (SQLite + localStorage stores; localStorage write rolls back on failure), `src/migrate.ts` (verified, idempotent copy), `src/backup.ts` (format, validation, CSV), `src/files.ts` (Documents/CNTR + share sheet; safety copy; file picker), `tests/storage.test.ts` (11 unit tests).
- Changed: `src/storage.ts` (in-memory cache, ordered write-through, retry + warning, `initStorage`, `replaceAllData`, last-backup date), `src/state.ts` (`initState()` instead of loading at import), `src/main.ts` (async `start()`, startup-error screen, Backup actions), `src/ui/dom.ts` (`showMessage`, confirm sheet title/tone), `src/ui/icons.ts` (3 icons), `index.html` (Settings → Backup group + data-loss note, file input, warning banner), `src/style.css` (`[hidden]`, banner, note, startup error), `tsconfig.json` (`allowImportingTsExtensions`, for Node-runnable modules), `package.json` (`npm test`, 3 deps), `.github/workflows/build-apk.yml` (runs `npm test`), `capacitor.config.json` (SQLite: no encryption, iOS `Library/CapacitorDatabase`), `AndroidManifest.xml` (READ/WRITE_EXTERNAL_STORAGE maxSdk 29, `requestLegacyExternalStorage` for Android 10), `ios/App/App/Info.plist` (`UIFileSharingEnabled`, `LSSupportsOpeningDocumentsInPlace`: backups visible in Files), `npx cap sync` changes (`capacitor.build.gradle`, `capacitor.settings.gradle`, `ios/App/Podfile`), docs (README, ARCHITECTURE, PRODUCT, CHANGELOG).

Migration behaviour: first launch on the phone copies the 7 legacy keys to SQLite, reads back and compares, then sets `cntrMeta.migratedFromLocalStorage` (in the DB) and `cntrMeta.usingDatabase` (in localStorage). Legacy localStorage is never modified or deleted (stays as a stale copy). If the DB cannot open and migration never succeeded, the app runs on localStorage with a warning and retries next launch. If the DB fails after it has been used, a "Try again" screen is shown (never the stale copy).

Owner decision on offline caveats: commit as is (Android Auto Backup `allowBackup="true"` and the default `INTERNET` permission kept; the app makes no network requests).

Verified (fresh run on the final code, rerun before commit with the same results):
- `npx tsc --noEmit` 0; `npm run build` 0; `npm test` 11/11; `npx cap sync` found 5 plugins on Android and iOS (CocoaPods/xcodebuild not installed here: pod install skipped).
- E2E (`e2e.mjs`, headless Edge, scratchpad) **31/31**: browser build (persistence across reload, JSON + CSV export, 4 kinds of malformed backup rejected with data untouched, restore, storage-full warning + retry, offline with zero non-local requests) and a **simulated Android bridge** (migration + verify, legacy untouched, restart reads SQLite not the stale copy, no rerun/duplicates, DB write failure + retry, export to Documents/CNTR, "not saved" when Documents and share both fail, interrupted restore changes nothing, safety copy before restore, DB failure after use → Try again → recovers, first-migration failure → works on localStorage → migrates next launch, no network, no page errors).
- Mutation checks: removing the migration verify, dropping failed writes, or allowing the stale fallback each makes the matching test fail.
- Regression: functional 19/19 (3 of the old checks read localStorage synchronously right after a tap; with a 30 ms wait they pass: writes are now asynchronous, not lost), motion 5/5, picker 4/4, back 10/10, audit (tap targets/labels) clean, overflow clean.
- Commits `301ec8e` (feature) + `0da494f` (docs), pushed to `origin/feature/safe-storage` (verified). CI run 40350838170 (#20) **success**, including `npm test` and the native build with the SQLite/Filesystem/Share plugins: artifact `CNTR_1.0.20.apk` (13.4 MB). The owner then merged PR #2 on GitHub; CI run #21 on `main` (`3c0255d`) **success** → `CNTR_1.0.21.apk`, same code.
- Bundle scan: no runtime network use (only Vite's same-origin chunk preload and unused Capacitor HTTP / Filesystem download helpers).

Not verified / remaining risks:
- **No real device or emulator**: the native SQLite, Filesystem (Documents on Android 10 / 11+ / iOS) and Share calls were tested only against a fake bridge. The APK has not been built with the new plugins (CI builds it on push). iOS never built (no Xcode/CocoaPods).
- Writes land a few ms after a tap (async native call); killing the app in that instant can lose that one tap.
- Uninstall / Clear data / lost phone delete everything; only an exported backup kept off the phone survives (stated in Settings).
- Android Auto Backup (`allowBackup="true"`, pre-existing) may copy the database to the user's Google account; that is an OS feature, not app sync. Left as it was.
- The SQLite plugin bundles SQLCipher on Android, making the APK a few MB larger.
- Browser build: restore into localStorage is rolled back on failure but is not a true transaction (development only).

## Signing, tests, About session (2026-10-26). Committed locally on `feature/signing-tests-about`, not pushed

Owner asked for items 1, 2, 3, 5, 6 of the suggestions (signing key, tests in repo, About, automatic backups, readable tile text), plus the Sell revenue figure at 3/4 size.

1. **Release signing.** Key generated with OpenSSL (no JDK here): PKCS#12 `C:/Users/User/CNTR-signing/cntr-release.p12`, alias `cntr`, RSA 4096, valid to 2056, random password in `PASSWORD.txt`; `CNTR_KEYSTORE_BASE64.txt` holds the secret value; `README.txt` there lists the steps. The private key exists only inside the password-protected .p12. **Nothing of it is in the repo** (`.gitignore` now also ignores `*.p12` and `dist-apk/`). `android/app/build.gradle` signs `release` from env vars (`CNTR_KEYSTORE_FILE`, `CNTR_KEYSTORE_PASSWORD`, `CNTR_KEY_ALIAS`, `CNTR_KEY_PASSWORD`); without them the release build is unsigned. CI (`build-apk.yml`): with secret `CNTR_KEYSTORE_BASE64` set it builds `assembleRelease bundleRelease`, uploads `CNTR_1.0.N.apk` and `CNTR_1.0.N.aab`; otherwise `assembleDebug` with a warning. Key password and store password are the same value (OpenSSL PKCS#12).
2. **Browser tests in the repo** (`tests/e2e/`, `npm run test:e2e`, run in CI after the build): `data-safety` (35 checks: the 31 from the storage session + 4 for automatic backups), `functional` (19), `interaction` (17: colour picker fit and drag cancel, undo/+ tap areas, About, Android back via a fake bridge), `layout` (22: overflow, 44px targets, labels, contrast, 4 tiles at 412x892, revenue at 3/4, at 320/360/412 and landscape), `motion` (5). `run.mjs` starts vite preview on port 4320 and stops it afterwards. Browser: Edge on Windows, Chrome on Linux CI (`CNTR_BROWSER` overrides). `playwright-core` added as an exact dev dependency (already installed through `@playwright/cli`; lockfile +1 line).
3. **About screen** (`#aboutScreen`, sub-screen of Settings): version (`App.getInfo()` on the phone, package.json in the browser), MIT license, privacy statement, open-source licenses. Back arrow and Android back work.
4. **Automatic backups** (see ARCHITECTURE "Automatic backups"): `Documents/CNTR/auto`, newest 20, before clear/delete and after saving a report; asks before going ahead if it fails. Settings note mentions it.
5. **Tile text**: `needsDarkText()`; with the default colours Gacha, Cheki, Poster, Photocard and Keychain get dark text (white was 1.95-3.11:1, dark is 5.37-8.55:1); Sticker, Acrylic Stand and Tote Bag stay white. The layout test now checks tile text contrast on every tab and passes.
6. **Sell revenue figure** at 0.75 of the shared hero size (`.hero .hero-figure`).
7. **Fixed** (found by the new layout test): `.stack` grid items did not shrink, so at 320-360px the Event cards were wider than the screen with a long expense amount (add/delete buttons cut off); `.stack > * { min-width: 0 }` and expense names now wrap.

Verified (fresh, final code): `npx tsc --noEmit` 0; `npm run build` 0; `npm test` 11/11; `npm run test:e2e` all 5 suites (35+19+17+22+5 = 98 checks) pass, and the preview server is stopped afterwards. Screenshots checked: tiles with dark text, About, editor preview, Event at 320px.
Not verified: the release build itself (no JDK/Android SDK here; first verified by CI once the secrets exist); the e2e suite on Linux CI with Chrome (first run after push); automatic backups on a real phone.
Owner action needed: add GitHub secrets `CNTR_KEYSTORE_BASE64`, `CNTR_KEYSTORE_PASSWORD`, `CNTR_KEY_ALIAS` (=`cntr`), and back up the `CNTR-signing` folder off this computer. Switching from the debug 1.0.21 to the first release build needs one last uninstall (export a backup first).

## Live Event screen (2026-10-26, next session). REMOVED 2026-10-27 (stashed, superseded by the merged Event design)

Owner asked for the Event screen to update automatically, like Reports, to check net profit quickly.
- `getEventView()` (`src/state.ts`): with nothing imported, the event uses the live counter's sales (hero shows once there are sales or expenses). An import stores only the saved reports' sales plus `includeLive`; when set, the live sales are added on every render instead of being copied once.
- `ImportedEventReport.includeLive` (`types.ts`, read in `storage.ts`). Old stored imports have no flag: shown as before (frozen copy). "Clear event" returns to following the live counter.
- Texts: import modal live row subtitle, Event empty state.
- Test: `functional` 2b (2 checks). Verified: `tsc` 0, `npm test` 11/11, build 0, `npm run test:e2e` all 5 suites (35+21+17+22+5 = 100) pass.
- Not committed yet (owner to approve). Not checked on a phone.

## Task list: merged Event screen + multi-day events (planning; NO code written yet)

Owner's brief (2026-10-27): merge Reports and Event into one screen; multi-day events; always show live data. Last time they used a plain counter, wrote the revenue down each evening, and asked ChatGPT for the total and profit: CNTR must do that itself. Agreed in chat: always one live event (the first tap starts "Event <date>"), renamable while live; optional **End day** (never pressed = one block; once pressed, frozen day cards + today live; no "new day?" prompt); **End event** = final name → History → fresh event; History: view, compare, edit (rename, fix product Cash/QRIS counts "a friend counted one I missed", add/edit/delete expenses, e.g. Rp 2.500.000 → 2.496.820). Restaurant-till "shift / Z report" pattern is the reference.

Owner decisions (2026-10-27; the app is not live, the owner is the only tester):
- [x] D1. Old saved reports are **dropped**, not converted (no migration of saved reports).
- [x] D2. End-of-day cash count: left out for now.
- [x] D3. No Undo for End day: editing past days covers mistakes.
- [x] D4. Saved events stay renamable.
- [x] The uncommitted "Live Event screen" change was removed (it was mostly import logic, which the merged screen drops). Kept recoverable as `git stash` entry "Live Event screen (superseded by merged Event design)".

Steps for me, in order (tick as done; record verification here):
- [x] 1. Write the design doc `docs/superpowers/specs/2026-10-27-events-design.md` from the brief above; builder-check subagent; bring back only owner-only questions; owner approves. **Written + builder-checked 2026-10-27; owner answered: End day = confirm only, no live editing; Sell tab shows today only. Owner APPROVED 2026-10-27** (Compare = 2 events; net profit = product profit − expenses; day-card profit before expenses, owner judges when testing; History − removes any one sale of that product/payment/day).
- Owner instruction for the build: use all relevant skills, test along the way, loop until done. **Failsafe:** if session usage nears 50% before done, stop, report done/not done, update this task list and HANDOFF, and wait for the owner.
- [x] 2. Implementation plan `docs/superpowers/plans/2026-10-27-events.md` (owner said start; executed inline).
- [x] 3. Uncommitted "Live Event screen" change: removed (stashed), see decisions above.
- [x] 4. Data model: live event = existing `cntrSales` + `cntrEventCosts` + new `cntrLiveEvent` (name, startedAt, dayBreaks); past events in `cntrEvents` (`PastEvent`). Event maths in `src/events.ts` (unit-tested, `tests/events.test.ts`).
- [x] 5. Migration: nothing to copy (the live keys are reused); first launch only creates `cntrLiveEvent`. Old `cntrSavedReports` / `cntrImportedEventReport` are no longer read, backed up or restored, and never deleted. (No backup-first step needed since no data is changed.)
- [x] 6. Backup/restore/CSV understand events; old backups restore their live sales/expenses (unit tests). CSV: Event, Day, Time, Product, Payment, Price, Cost.
- [x] 7. Merged screen: name (tap to rename), live net-profit hero, Revenue/Profit/Expenses, day cards (only after first End day), expenses, top products, End day, End event (name prompt). Remove Save report, Save event report, Import sales, clear buttons; 5 tabs → 4.
- [x] 8. History: list past events, view (same layout, frozen), compare 2, edit (rename, Cash/QRIS counts per product per day, expenses); automatic backup before each saved edit.
- [x] 9. Android back on the new screens/sheets (edit mode: back = Cancel); options menu and Clear button removed.
- [x] 10. Browser tests (new `tests/e2e/events.test.mjs`, 24 checks; data-safety B22 checks End event is one write): new flow end to end (sell → End day → sell → End event → History → edit → compare), migration via fake bridge, layout at 320/360/412 + landscape, tap targets, contrast; remove tests of removed features.
- [x] 11. Verify fresh (2026-10-27, after review fixes: tsc 0, npm test 22/22, build 0, test:e2e 38+26+15+20+30+5 = 134 pass; screenshots checked at 412×892). Whole-change review (fresh Opus reviewer): 0 critical; 4 important fixed with RED→GREEN tests (old saved reports backed up once on first launch; clock set back can't move sales between days; price edits don't reprice ended days; past event starts at its first sale). Deferred minors are listed under Known issues. Ledger: `.superpowers/sdd/2026-10-27-events/progress.md` (git-ignored locally). `npx tsc --noEmit`, `npm test`, `npm run build`, `npm run test:e2e`; screenshots at 412×892.
- [x] 12. Docs (README + new screenshots incl. history.png, reports.png removed; ARCHITECTURE, PRODUCT, CHANGELOG; graphify update done): README (+ screenshots), ARCHITECTURE, CHANGELOG, PRODUCT if needed, this file; `graphify update .`.
- [ ] 13. Commit (ask owner), push only with owner approval; owner tests on the phone (migration of real data: export a backup first).

## Products per day setting (2026-10-27, owner request). Uncommitted

- Settings → Event → *Products per day* (`AppSettings.productsPerDay`, default ON since the owner asked; older saved settings get the default). On: the Event screen (live and past) shows one `<details class="card products-day">` per day, latest open, others collapsed; tap to open. Off: one Products card as before.
- Files: `index.html`, `src/types.ts`, `src/storage.ts`, `src/ui/dom.ts`, `src/main.ts`, `src/views/EventScreen.tsx` (`ProductBreakdown` extracted), `src/style.css`, `tests/e2e/events.test.mjs` (check 4c, RED then GREEN), README, CHANGELOG.
- Verified: tsc 0, npm test 22/22, test:e2e all 6 suites pass (events 29/29), screenshot at 412×892 checked. Not verified on the phone.

## Payment methods per product + no starter products (2026-10-27, owner request). Uncommitted

- Owner chose: methods Cash, QRIS, Transfer, Card, E-wallet; 1 or 2 per product; default Cash + QRIS (old products without `payments` behave the same).
- `src/payments.ts` (rules, unit-tested in `tests/payments.test.ts`), `Product.payments?`, editor picker (`#editPayments`, max 2 / min 1), tiles (`.tile-pay-single` for one method; icons landmark/credit-card/wallet), payment mix and History steppers follow the methods used, backup validates `payments`, `snapshotProducts` copies it. Starter products (`defaultProducts`) removed; suites seed `SAMPLE_PRODUCTS` (tests/e2e/lib.mjs).
- Colours `--transfer #199e70`, `--card #9085e9`, `--ewallet #d55181`: dataviz validator passes on adjacent pairs in the fixed order; no 5-colour set passes all pairs, so every use carries the method's name (legend, chips, labels). Weakest pairs: Card vs QRIS, E-wallet vs Transfer (deutan).
- Verified: tsc 0, npm test 29/29, test:e2e 7 suites pass (new `payments` 13/13), screenshots checked. Not verified on the phone.

## Settings rework (2026-10-27, owner request; impeccable + ui-ux-pro-max; the "taste" skill is not installed). Uncommitted

- Owner chose: Backup second to last, About last (rest my call: Products, Event, Money, Sales data, Backup, About); no backup-overdue warning; delete removed from Products rows.
- Settings: `data-group` sections; `#productsSummary` live count; CSV in its own "Sales data" group; Backup = "Last backup" row (`#lastBackupText`: date or "Never"), Export, Restore, two short notes.
- Products (`ProductList` in `Lists.tsx`): sections `data-section="counter|hidden"`, rows `.product-item` with `.product-edit-btn` (tap to edit) and `.product-toggle-btn`, `#addProductBtn`. Editor trash = permanent `deleteProduct()` for active and hidden products (before: only "remove from counter", which the switch already does).
- Tests: new `tests/e2e/settings.test.mjs` (11); layout scans the Products screen at 320/360/412/landscape. Verified: tsc 0, npm test 29/29, test:e2e 8 suites pass; impeccable detector: only the old `--ease-emphasis` advisory. Not verified on the phone.

## Known issues / blockers (unresolved)

- **Events build, deferred minors (from the review):** Save then Cancel while the automatic backup runs still saves the edit; deleting a product deletes its sales from ended days of the live event (pre-existing); restoring a 1.0.21 backup empties History without saying so (a safety copy is taken); CSV calls an unnamed live event "Current event" (screen: "Event <date>"); an empty Day 1 card shows today's date; History +1 on the last day can be stamped after the event's end (hour chart only).
- **Events build, not verified:** real phone (SQLite with the new keys, the one-time saved-reports backup, End day/End event, edit), iOS. Day-card profit before expenses is the owner's to judge when testing.

- **GitHub repository description and topics are not updated:** there is no `gh` CLI or API token on this machine. The owner must apply them; text is below.
- White text on light product colours has low contrast (e.g. about 2:1 on yellow). Accepted by the owner for now.
- Release key created (`C:/Users/User/CNTR-signing`, outside the repo) and CI wired for it, but **the owner must add the 3 GitHub secrets**; until then CI still builds debug APKs that need an uninstall (which wipes data).
- Data-loss risks that remain after the safe-storage work (see that section): native SQLite path tested only against a simulated bridge, never on a device; uninstall / clear data / lost phone still delete everything unless the user exported a backup.
- Not tested on a real device (haptics, safe areas / edge-to-edge, performance). iOS never built.
- Local machine has no JDK/Android SDK and no `gh`. APK builds are verified only via GitHub Actions and the public API (60 requests/hour).

## GitHub metadata to apply (owner)

- **Description:** `Offline sales counter for convention and pop-up booths: tap-to-sell tiles, Cash/QRIS totals, sales and event profit reports. Preact + Capacitor Android app.`
- **Topics:** `point-of-sale`, `sales-tracker`, `offline-first`, `capacitor`, `preact`, `typescript`, `vite`, `android`, `mobile-app`

## Next steps (priority order)

1. Owner: add the 3 signing secrets, then push `feature/signing-tests-about` (CI builds the first release-signed APK and runs the browser tests on Linux). Export a backup in 1.0.21, uninstall, install the release APK, restore. After that, updates install without uninstalling.
2. Owner: apply the GitHub description and topics above (repo → About → ⚙).
3. Owner: decide on deleting the merged `ui/revamp` and `fix/bugs-ui-docs` branches and the old local `agents/app-overview-explanation` worktree.
4. Play Store: signing and the `.aab` are ready once the secrets exist. Still needed: a hosted privacy policy (the About screen text is the basis), store listing and screenshots, then the owner's 12-tester / 14-day closed test.
5. Owner tests on the phone: storage persistence after restart, export/restore, automatic backups in `Documents/CNTR/auto`, airplane mode, About, dark tile text.
6. Suggested but not chosen yet: backup reminder after saving a report; stock counts / sold-out; multi-day events; discounts/bundles (ask the owner first).

## Verification log

This session, on the cleaned `ui/revamp` working tree:
- `npx tsc --noEmit`: pass.
- `npm run build`: pass (built in 6.5s).
- `npx cap sync android`: pass; no tracked native files changed.
- Browser suites (headless Edge against `vite preview`; scripts in the session scratchpad, not in the repo):
  - functional **19/19 pass**,
  - motion/reduced-motion **5/5 pass**,
  - colour-picker fit at 320–412px **4/4 pass**.
- Secrets scan of the tree and history: nothing found.

Earlier: `main` `3b5bf59` CI success; `ui/revamp` `9c08b1e` CI success (run 40301551082 → `CNTR_1.0.16.apk`).

Not verified:
- Real device.
- iOS.
- Local Gradle build.
- Lint/format (not configured).

## Commits and push

Pushed to `origin/ui/revamp` (verified: branch in sync; `LICENSE`, `README.md`, `HANDOFF.md` and screenshots served from GitHub):
- `dbe0249` Remove unused code and the unused `@types/node` dependency.
- `33ac2d6` Add MIT license, rewrite README, add session handoff. CI **success**: run 40323977225 → `CNTR_1.0.17.apk`.
- A follow-up commit recording this section (`[skip ci]`, no code changes).

All of the above is now on `main` too (see "Merge session").

## Merge session (2026-10-26): cleanup, verify, merge into `main`

Owner's task: clean up locally and on GitHub, verify, push, and merge into `main` (push and merge explicitly authorized).

Cleanup findings:
- No dead code: `tsc --noUnusedLocals --noUnusedParameters` is clean; exports that nothing imports (e.g. `formatMoney`, storage keys, `profitClass`) are all used inside their own file, so they were left as they are (removing `export` would be churn).
- Dependencies: all used. `@capacitor/app` added for Android back; `@playwright/cli` (committed earlier) is the owner's tooling, kept.
- No build artifacts, keystores or secrets tracked; `.gitignore` unchanged (still correct). Diff scan: no secrets.
- Docs were stale: README screenshots showed the old, taller tiles (re-rendered `sell`, `reports`, `event`; `product-editor` was identical); README and `docs/ARCHITECTURE.md` now describe Android back and `@capacitor/app`; CHANGELOG entries added.
- Left uncommitted on purpose (owner's machine-specific or untracked work): `.claude/settings.json` (local graphify paths), `.claude/skills/playwright-cli/`, `.playwright/`.

Commits (on `ui/revamp`, pushed, then merged):
- `a13e3af` Handle Android back and fix a stuck colour-picker drag.
- `96bd03b` Compact Sell and Event layout, 44px tap targets, small polish.
- `049b3a6` Update docs and screenshots for Android back and the compact layout (also adds `PRODUCT.md`, refreshes `graphify-out/`).
- `ac94981` Merge branch `ui/revamp` into `main` (`--no-ff`, same as the earlier `fix/bugs-ui-docs` merge). `origin/main` had not moved (`3b5bf59`) and `main` is not branch-protected (public API: `"protected": false`), so no PR was needed and no conflicts arose.
- This HANDOFF update: a `[skip ci]` commit on `main`.

Verification (all fresh, final code):
- `npx tsc --noEmit` and `npm run build`: pass on `ui/revamp` and again on merged `main` (`main` tree is identical to `ui/revamp`).
- Browser suites, headless Edge against `vite preview` (port 4318): functional **19/19** (rerun on merged `main`: 19/19), motion/reduced-motion **5/5**, colour-picker fit **4/4**, Android back **10/10** cases (rerun on `main`), tap-target/contrast/label audit at 412×892, 375×812 and 892×412 (only the accepted white-on-tile contrast), overflow scan at 320/360/412: none.
- `npx cap sync android`: pass.
- CI: `ui/revamp` `049b3a6` run 40341818197 **success** (`CNTR_1.0.18.apk`); `main` `ac94981` run 40342530089 **success** (`CNTR_1.0.19.apk`).
- Remote verified: `origin/main` = `ac94981`; raw GitHub serves `LICENSE`, `README.md`, `HANDOFF.md`, `PRODUCT.md` and the screenshots from `main`, and `package.json` there includes `@capacitor/app`. GitHub now detects the license as **MIT**.

Still not done / blockers:
- GitHub description is still `counting app` and topics are empty: no `gh` or API token here; owner applies the text below.
- No branches deleted (`ui/revamp`, `fix/bugs-ui-docs` are both merged): owner decision.
- Not verified on a real phone; no lint or test suite in the repo (tests live in session scratchpads).

Useful commands:
- `npm run dev`
- `npm run build`
- `npx cap sync android`
- `graphify update .` after code changes
