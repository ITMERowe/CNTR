# Security policy

## Supported versions

CNTR is in early development (version 0.1.x). Only the **latest release** (the `playstore` branch and its GitHub Release) gets security fixes.

## Reporting a vulnerability

**Please don't open a public issue for security problems.**

Report it privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Include:

- what the problem is and what an attacker could do with it;
- steps to reproduce, or a proof of concept;
- the app version (Settings → About) and Android version, if it's about the app.

You can expect an acknowledgement within 7 days and an assessment within 30 days. Once a fix is released, you'll be credited in the changelog unless you'd rather not be.

## What's in scope

- The Android app: data stored on the device, backup files (export, automatic backups and restore), CSV export, file sharing, permissions.
- The web code in this repository and its build and CI setup.

## Security model, for context

- CNTR is offline by design: it has **no INTERNET permission**, no server, no account and no analytics.
- Data is stored in the app's private storage (SQLite). Android's own Auto Backup may include it in the user's Google account backup if the user has turned that on.
- Backup files are plain JSON in `Documents/CNTR` and are **not encrypted**; anyone with access to the file can read the sales data. Restoring checks the whole file before changing anything.
- A Content-Security-Policy blocks outside scripts and network connections.

Reports about these known properties (e.g. "backup files are readable") are still welcome if you see a practical attack.
