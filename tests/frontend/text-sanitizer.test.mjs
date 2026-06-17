import test from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeInvalidUnicodeSurrogates,
  sanitizeTextForPersistence,
} from "../../.tmp-frontend-tests/src/lib/textSanitizer.js";

test("sanitizeInvalidUnicodeSurrogates replaces invalid lone surrogates", () => {
  assert.equal(sanitizeInvalidUnicodeSurrogates("A\udc9dB"), "A\uFFFDB");
  assert.equal(sanitizeInvalidUnicodeSurrogates("A\ud83dB"), "A\uFFFDB");
});

test("sanitizeInvalidUnicodeSurrogates preserves valid unicode and page breaks", () => {
  const text = "Smart \u201cquotes\u201d, apostrophe \u2019, dash \u2014, emoji \ud83d\udc96\n***\nNext";
  assert.equal(sanitizeInvalidUnicodeSurrogates(text), text);
});

test("sanitizeTextForPersistence recursively sanitizes save payload text", () => {
  assert.deepEqual(
    sanitizeTextForPersistence({
      title: "Chapter \udc9d",
      contentJson: "Body \udc9d",
      customFields: {
        note: "Lore \udc9d",
        count: 3,
        active: true,
      },
    }),
    {
      title: "Chapter \uFFFD",
      contentJson: "Body \uFFFD",
      customFields: {
        note: "Lore \uFFFD",
        count: 3,
        active: true,
      },
    },
  );
});
