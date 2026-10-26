// Runs every browser suite against `vite preview` of the current build. Usage: npm run test:e2e
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { URL, sleep } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const port = new globalThis.URL(URL).port;
const root = join(here, '../..');
// vite's own entry run by node (no npx or shell), so server.kill() stops it on every platform.
const server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--port', port, '--strictPort'], { cwd: root, stdio: 'ignore' });

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  await sleep(500);
  up = await fetch(URL).then((r) => r.ok, () => false);
}
if (!up) {
  console.error(`Preview server did not start on ${URL} (run \`npm run build\` first; is the port free?)`);
  server.kill();
  process.exit(1);
}

const suites = readdirSync(here).filter((file) => file.endsWith('.test.mjs')).sort();
const failed = [];
for (const suite of suites) {
  console.log(`\n=== ${suite}`);
  const code = await new Promise((resolve) => spawn(process.execPath, [join(here, suite)], { stdio: 'inherit' }).on('exit', resolve));
  if (code !== 0) failed.push(suite);
}

server.kill();

console.log(failed.length ? `\nFAILED: ${failed.join(', ')}` : `\nAll ${suites.length} suites passed`);
process.exit(failed.length ? 1 : 0);
