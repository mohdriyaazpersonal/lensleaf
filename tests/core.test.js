import test from "node:test";
import assert from "node:assert/strict";
import {
  validateFile,
  parseTags,
  filterPhotos,
  demoPhotos,
  MAX_BYTES,
} from "../core.js";
test("uploads reject unsupported active formats and size limits", () => {
  assert.equal(validateFile({ type: "image/png", size: 1 }), true);
  assert.equal(validateFile({ type: "image/jpeg", size: MAX_BYTES }), true);
  for (const f of [
    { type: "image/svg+xml", size: 20 },
    { type: "image/png", size: 0 },
    { type: "image/png", size: MAX_BYTES + 1 },
    { type: "text/html", size: 5 },
  ])
    assert.throws(() => validateFile(f));
});
test("tags normalize, deduplicate and cap metadata", () => {
  assert.deepEqual(parseTags(" Travel, travel, , HOME "), ["travel", "home"]);
  assert.equal(
    parseTags(Array.from({ length: 20 }, (_, i) => `tag${i}`).join(",")).length,
    12,
  );
});
test("gallery combines collection, favorite, tag and text filters", () => {
  assert.equal(filterPhotos(demoPhotos, { favorite: true }).length, 2);
  assert.deepEqual(
    filterPhotos(demoPhotos, {
      collection: "Coast & water",
      tag: "blue",
      query: "HOUR",
    }).map((p) => p.id),
    ["blue-hour"],
  );
  assert.equal(
    filterPhotos(demoPhotos, { favorite: true, tag: "warm" }).length,
    0,
  );
  assert.equal(
    filterPhotos(demoPhotos, { sort: "title" })[0].title,
    "Amber coast",
  );
});
