// Static checks on the Android and CI configuration (security review 2026-10-27, findings 5–7).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the app does not ask for internet access', () => {
  assert.doesNotMatch(read('android/app/src/main/AndroidManifest.xml'), /android\.permission\.INTERNET/);
});

test('file sharing covers only the CNTR folders', () => {
  const paths = read('android/app/src/main/res/xml/file_paths.xml');
  assert.doesNotMatch(paths, /path="\."/);
  const shared = [...paths.matchAll(/<(\w+-path)[^>]*path="([^"]*)"/g)].map(([, kind, path]) => `${kind}:${path}`);
  assert.deepEqual(shared.sort(), ['cache-path:CNTR/', 'external-path:Documents/CNTR/']);
});

test('CI runs with a read-only token, pinned third-party actions and a cleaned-up keystore', () => {
  const workflow = read('.github/workflows/build-apk.yml');
  assert.match(workflow, /^permissions:\s*\n\s+contents: read/m);
  const thirdParty = [...workflow.matchAll(/uses:\s*([^\s#]+)/g)].map(([, ref]) => ref).filter((ref) => !ref.startsWith('actions/'));
  assert.ok(thirdParty.length > 0);
  for (const ref of thirdParty) assert.match(ref, /@[0-9a-f]{40}$/, `${ref} is not pinned to a commit`);
  assert.match(workflow, /trap 'rm -f "\$CNTR_KEYSTORE_FILE"' EXIT/);
});
