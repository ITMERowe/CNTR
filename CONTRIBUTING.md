# Contributing to CNTR

Thanks for helping. CNTR is an offline sales counter for booth sellers, so changes are judged on one thing above all: **it must stay fast, reliable and fully offline at a busy booth, and it must never lose a seller's data.**

Security problems go through the [security policy](SECURITY.md), not public issues.

## Before you start

- **Bugs:** open a [bug report](../../issues/new/choose) with steps to reproduce, the app version (Settings → About) and your phone model.
- **Ideas and bigger changes:** open a feature request first, so we can agree on the approach before you write code.
- **Small fixes** (typos, wording, obvious bugs) can go straight to a pull request.

## Set up

Prerequisites: **Node.js 22** and npm.

```bash
npm install
npm run dev        # http://localhost:5173 (this computer only)
```

To try it on a phone on the same Wi-Fi, run `npm run dev -- --host`, only on a network you trust. Android builds come from CI on every push, or locally with JDK 21 and Android SDK 36 (see the [README](README.md#building-for-android)).

## Making a change

1. Fork the repo and create a branch from **`dev`** (e.g. `fix/undo-on-free-items`); open your pull request against `dev`. (`main` holds tested work and `playstore` only released versions; the maintainer merges those.)
2. Keep the change focused: one fix or feature per pull request.
3. Follow the conventions in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#conventions):
   - new UI as Preact components;
   - colors, spacing and motion from the CSS tokens at the top of `src/style.css`;
   - every user-facing text in `src/i18n.ts`, in **both English and Bahasa Indonesia**;
   - ask before anything destructive (deleting, ending, restoring).
4. Data safety:
   - don't change stored data formats without a migration and tests;
   - a recorded sale keeps the price it was sold at;
   - deleting a product never deletes its sales;
   - nothing may need the internet: the app has no INTERNET permission.
5. Add or update tests for what you changed.
6. Add a line to [CHANGELOG.md](CHANGELOG.md) for anything a user would notice.

## Checks before you open a pull request

```bash
npx tsc --noEmit     # types
npm test             # unit tests
npm run build        # production build
npm run test:e2e     # browser tests of the built app (uses Edge on Windows, Chrome elsewhere)
```

CI runs the tests and builds an APK on every push. Check the flows you touched in a phone-sized browser window too, and on a real phone for anything native (haptics, files, Android back).

## Pull requests

- Fill in the pull request template.
- Explain *why*, not just *what*; link the issue it closes.
- Add screenshots for visible changes, in light and dark theme.
- Keep commits readable; they're squashed or merged as the maintainer sees fit.

## License

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).
