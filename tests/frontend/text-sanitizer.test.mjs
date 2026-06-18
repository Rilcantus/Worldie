import test from "node:test";
import assert from "node:assert/strict";

import {
  containsSuspiciousMojibake,
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

test("containsSuspiciousMojibake detects corrupted smart punctuation sequences only", () => {
  const clean = "\u201cSend Valral,\u201d he said. \u201cYou\u2019re not pale.\u201d\nI\u2019d rather keep this \u2014 even if it\u2019s strange.\n[[Urzoth]] watched.\n\n\ud83d\udd25";

  assert.equal(containsSuspiciousMojibake(clean), false);
  assert.equal(containsSuspiciousMojibake("\u00e2\u20ac\u0153Send Valral,\u00e2\u20ac\ufffd"), true);
  assert.equal(containsSuspiciousMojibake("You\u00e2\u20ac\u2122re not pale."), true);
  assert.equal(containsSuspiciousMojibake("word \u00e2\u20ac\u201d word"), true);
  assert.equal(containsSuspiciousMojibake("caf\u00c3\u00a9"), true);
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

test("sanitizeTextForPersistence preserves known-good unicode sample exactly", () => {
  const text = "\u201cSend Valral,\u201d he said. \u201cYou\u2019re not pale.\u201d\nI\u2019d rather keep this \u2014 even if it\u2019s strange.\n[[Urzoth]] watched.\n\n\ud83d\udd25";

  assert.equal(sanitizeTextForPersistence(text), text);
});
