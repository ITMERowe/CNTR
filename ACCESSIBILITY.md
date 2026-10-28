# Accessibility

CNTR is used at busy booths, often one-handed, in bright light or a dim hall. We want everyone to be able to record a sale quickly and read their totals, including people who use larger text, a screen reader, or reduced motion.

## What we do

- **Contrast:** all text meets WCAG 2.1 AA contrast (at least 4.5:1) in both light and dark theme, with one exception below. This is checked by an automated test.
- **Touch targets:** buttons are at least 44 × 44 px; each payment button on a product tile covers half the tile. An automated test scans every screen.
- **Screen readers:** buttons have labels that say what they do (e.g. "Add Cash sale of Sticker, 3 so far"). Dialogs move focus to their safe action (Cancel) and return it when they close; the content behind an open dialog is hidden from screen readers.
- **Motion:** animations are turned off when the phone's *Remove animations* / reduce-motion setting is on.
- **Feedback beyond color:** payment methods always show their name next to their color; every sale and undo also gives haptic feedback (sounds are optional).
- **Languages:** English and Bahasa Indonesia.
- **Layouts:** tested at phone widths from 320 to 412 px and in landscape.

## Supported environments

- Android 7.0 (API 24) or newer, in portrait and landscape.
- Android's own accessibility features: TalkBack, font size and display size, Remove animations.
- iOS is not supported yet.

## Known limitations

- **Product tile text** sits on the product's own color. On some colors (pink, green, orange) it is below 4.5:1, at least 2.6:1. Product names on tiles are large and bold, and the same information is shown at full contrast in lists and reports.
- **Reordering tiles** needs a press-and-hold drag; there is no screen-reader-friendly alternative yet. The order can also be set with *Sort by best sellers*.
- **Large system text, TalkBack and Switch Access** have not yet been tested on real devices. Automated tests cover labels, focus, contrast and touch target sizes in a browser.

## Report a barrier

If something in CNTR is hard or impossible for you to use, please [open an issue](../../issues/new/choose) and describe:

- what you were trying to do;
- what got in the way;
- the assistive technology or setting you use (e.g. TalkBack, large font), your phone and Android version.

We aim to reply within 7 days. Accessibility problems that block recording sales or reading totals are treated as high-priority bugs.
