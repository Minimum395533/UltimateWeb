import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

test('production bundle omits the development editor and API', async () => {
  const assetFiles = await readdir('dist/assets');
  const bundles = assetFiles
    .filter((file) => file.endsWith('.js'))
    .map((file) => readFile(`dist/assets/${file}`, 'utf8'));
  const source = (await Promise.all(bundles)).join('\n');

  assert.doesNotMatch(source, /\/api\/dev\/frame-data/);
  assert.doesNotMatch(source, /\/dev\/frame-data/);
  assert.doesNotMatch(source, /frame-data-development-api/);
});
