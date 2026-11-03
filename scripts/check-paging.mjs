// Run: npx tsx scripts/check-paging.mjs  (or node --experimental-strip-types)
import assert from "node:assert/strict";
import { buildMergedPages, displayPage } from "../src/app/data/paging.ts";
const cases = { 0: [0], 30: [30], 50: [50], 51: [51], 99: [99], 100: [50, 50], 230: [80, 50, 50, 50] };
for (const [n, sizes] of Object.entries(cases)) {
  const asc = Array.from({ length: +n }, (_, i) => i);
  const { pages, uiPageCount } = buildMergedPages(asc, 50);
  assert.deepEqual(pages.map((p) => p.length), sizes, `total ${n}`);
  assert.equal(uiPageCount, sizes.length);
  assert.deepEqual(pages.slice().reverse().flat(), asc, `contiguous cover ${n}`);
  console.log(n, "->", sizes.join("+"));
}
const d = displayPage(Array.from({ length: 230 }, (_, i) => 229 - i), 1, 50);
assert.equal(d.items[0], 229); assert.equal(d.items.at(-1), 150);
assert.deepEqual(displayPage(Array.from({ length: 230 }, (_, i) => 229 - i), 4, 50).items.slice(0,1), [49]);
console.log("ok");
