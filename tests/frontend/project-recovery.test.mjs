import test from "node:test";
import assert from "node:assert/strict";

import {
  getProjectByFilepath,
  isMissingProjectFileError,
  normalizeProjectPathText,
  removeItemWithFallback,
} from "../../.tmp-frontend-tests/src/hooks/projectRecovery.js";

test("normalizeProjectPathText lowercases and normalizes separators", () => {
  assert.equal(
    normalizeProjectPathText("C:\\Worldie\\Projects\\Alpha.WORLDIE"),
    "c:/worldie/projects/alpha.worldie",
  );
});

test("getProjectByFilepath returns the matching project when the filepath exists", () => {
  const project = { id: "1", title: "Alpha", filepath: "C:/Worldie/Alpha.worldie" };
  const result = getProjectByFilepath(
    [project, { id: "2", title: "Beta", filepath: "C:/Worldie/Beta.worldie" }],
    "C:/Worldie/Alpha.worldie",
  );

  assert.deepEqual(result, project);
});

test("isMissingProjectFileError detects full-path, filename, and generic not-found messages", () => {
  const project = { id: "1", title: "Alpha", filepath: "C:\\Worldie\\Alpha.worldie" };

  assert.equal(
    isMissingProjectFileError(project, new Error("Project file not found: C:/Worldie/Alpha.worldie")),
    true,
  );
  assert.equal(
    isMissingProjectFileError(project, new Error("Could not open alpha.worldie because the project file is missing.")),
    true,
  );
  assert.equal(
    isMissingProjectFileError(project, new Error("Project file not found")),
    true,
  );
  assert.equal(
    isMissingProjectFileError(project, new Error("Permission denied while opening the database")),
    false,
  );
});

test("removeItemWithFallback returns the first remaining item after removal", () => {
  const result = removeItemWithFallback(
    [
      { id: "world-1", name: "Alpha" },
      { id: "world-2", name: "Beta" },
      { id: "world-3", name: "Gamma" },
    ],
    "world-1",
  );

  assert.equal(result.removed, true);
  assert.deepEqual(result.first, { id: "world-2", name: "Beta" });
  assert.deepEqual(result.next, [
    { id: "world-2", name: "Beta" },
    { id: "world-3", name: "Gamma" },
  ]);
});
