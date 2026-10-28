// Builds the GitHub Release notes and Google Play's "What's new" text for one version from CHANGELOG.md.
// Usage: node .github/scripts/release-notes.mjs <version> [previous tag]
// Writes release-notes.md and whatsnew/whatsnew-en-US. No dependencies.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const [version, previousTag = ''] = process.argv.slice(2);
if (!version) throw new Error('usage: release-notes.mjs <version> [previous tag]');
const repo = process.env.GITHUB_REPOSITORY ?? 'ITMERowe/CNTR';
const tag = `v${version}`;

// The "## <version> (date)" section, up to the next "## ".
const lines = readFileSync('CHANGELOG.md', 'utf8').split(/\r?\n/);
const start = lines.findIndex((line) => line.startsWith(`## ${version} `) || line === `## ${version}`);
if (start < 0) throw new Error(`CHANGELOG.md has no "## ${version}" section: add one before releasing.`);
const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
const section = lines.slice(start + 1, end < 0 ? undefined : end);

// "### Highlights" is the short, user-facing list; everything else is the full list of changes.
const subsections = [];
for (const line of section) {
  if (line.startsWith('### ')) subsections.push({ title: line.slice(4).trim(), body: [] });
  else if (subsections.length) subsections.at(-1).body.push(line);
}
const highlights = subsections.find((s) => s.title.toLowerCase() === 'highlights');
const details = subsections.filter((s) => s !== highlights);
const text = (lines) => lines.join('\n').trim();
if (!highlights || !text(highlights.body)) throw new Error(`CHANGELOG.md "## ${version}" needs a "### Highlights" list before releasing.`);

const template = readFileSync('.github/release-template.md', 'utf8');
const fill = {
  VERSION: version,
  HIGHLIGHTS: text(highlights.body),
  CHANGES: details.map((s) => `### ${s.title}\n\n${text(s.body)}`).join('\n\n') || '_No other changes._',
  CHANGELOG_URL: `https://github.com/${repo}/blob/${tag}/CHANGELOG.md`,
  COMPARE: previousTag ? ` · [Compare with ${previousTag}](https://github.com/${repo}/compare/${previousTag}...${tag})` : '',
};
writeFileSync('release-notes.md', template.replace(/\{\{(\w+)\}\}/g, (_, key) => fill[key] ?? ''));

// Google Play's "What's new" allows 500 characters of plain text: the highlights without Markdown.
const plain = text(highlights.body)
  .replace(/\*\*|__|`/g, '')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/^\s*[-*]\s+/gm, '• ');
const whatsNew = plain.length <= 500 ? plain : `${plain.slice(0, 497).replace(/\s+\S*$/, '')}…`;
mkdirSync('whatsnew', { recursive: true });
writeFileSync('whatsnew/whatsnew-en-US', `${whatsNew}\n`);
console.log(`Release notes for ${tag}: ${details.length} change sections; Play "What's new" ${whatsNew.length}/500 characters.`);
