// Sell's wide-screen columns: each tile goes into the shortest column. Run with `npm test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placeColumns } from '../src/ui/masonry.ts';

test('a tall tile leaves no gap: the next tiles stack in the shorter column', () => {
  // Owner's case: a tall Fanservice group beside short tiles.
  assert.deepEqual(placeColumns([400, 150, 150, 150], 2, 8), [
    { col: 0, top: 0 },
    { col: 1, top: 0 },
    { col: 1, top: 158 },
    { col: 1, top: 316 },
  ]);
});

test('ties go to the leftmost column; one column stacks in order', () => {
  assert.deepEqual(placeColumns([100, 100, 100], 3, 8).map((p) => p.col), [0, 1, 2]);
  assert.deepEqual(placeColumns([100, 50], 1, 8), [{ col: 0, top: 0 }, { col: 0, top: 108 }]);
});
