# CNTR

A fast, offline sales counter for booths at conventions and pop-up events. Tap **+** under Cash or QRIS to record a sale, and CNTR keeps running totals, product breakdowns, and an event profit report after your expenses.

Built with TypeScript, Preact and Vite, packaged for Android (and iOS) with Capacitor 8. All data stays on the device in `localStorage`; there is no server and no account.

## Features

- **Sales counter**: one tile per product, with separate Cash and QRIS counters. Tap − to undo the last sale.
- **Reports**: revenue, profit, margin, payment mix and per-product distribution for the current session.
- **Event report**: import sales (live or from saved reports), add booth or transport expenses, and see net profit or deficit.
- **Saved reports & compare**: save sales or event snapshots, rename or delete them, and compare any two side by side.
- **Products**: add, edit, recolour, deactivate (keep history) or permanently delete products.
- **Settings**: 8 currencies (IDR, USD, EUR, SGD, AUD, GBP, JPY, MYR) and an optional compact format (`Rp 1,5M`).

## Quick start

Requires **Node.js 22**.

```bash
npm install
npm run dev        # http://localhost:5173 (also reachable from your phone on the same Wi-Fi)
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check (`tsc --noEmit`) and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run cap:sync` | Copy `dist/` into the native Android/iOS projects |

## Install the APK on your phone

Every push to GitHub builds a debug APK automatically.

1. Open the repo on GitHub → **Actions** → **Build APK** → the newest run with a green check.
2. Scroll to **Artifacts** and download **CNTR-Debug-APK** (you must be signed in to GitHub). It is a `.zip`.
3. Extract it to get `app-debug.apk`, then open it on your phone. Android will ask you to allow installs from that app (browser or Files). Allow it once.
4. Requires Android 7.0 (API 24) or newer.

> **Updating:** each CI run signs the APK with a fresh debug key, so Android refuses to install a new build over an old one ("App not installed"). Uninstall the old version first. **Uninstalling deletes the app's saved data**, so save or note anything you need before updating. A fixed signing key would remove this step; see [Releasing](#releasing).

## Build the APK locally

Needs JDK 21 and the Android SDK 36 (easiest via Android Studio Otter 2025.2.1 or newer).

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug        # Windows: gradlew.bat assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Or run `npx cap open android` and press Run in Android Studio with your phone connected over USB.

## Project structure

```
index.html            All screens and dialog shells (static markup)
src/main.ts           Controller: wires controls, owns render(), dialogs
src/state.ts          App state and the rules for changing it (no DOM)
src/storage.ts        localStorage read/write, settings cache
src/reports.ts        Report maths: totals, product breakdowns, compare rows
src/formatters.ts     Money formatting/parsing, colour helpers
src/ui/               Navigation chrome, product editor, colour picker
src/views/            Preact components for every data-driven screen
src/style.css         All styles (design tokens at the top)
android/, ios/        Capacitor 8 native projects (Android target API 36)
.github/workflows/    CI that builds the debug APK
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how state, storage and rendering fit together, and [CHANGELOG.md](CHANGELOG.md) for recent changes.

## Releasing

The CI build is a **debug** APK: fine for testing, not for the Play Store. To ship, create a release keystore, add it to the repo as GitHub Actions secrets, and add a signed `assembleRelease` step. The same keystore also makes updates install over the previous version without uninstalling.
