import test from "node:test";
import assert from "node:assert/strict";

import {
  navigationBlocked,
  navigationSuccess,
  resolveGuardedNavigation,
  shouldRunNavigationFollowUp,
} from "../../.tmp-frontend-tests/src/hooks/navigationResult.js";

test("successful guarded navigation returns success", async () => {
  const result = await resolveGuardedNavigation({
    canLeaveCurrentView: async () => true,
  });

  assert.equal(result.status, "success");
  assert.equal(shouldRunNavigationFollowUp(result), true);
});

test("cancelled dirty-state navigation returns cancelled", async () => {
  const result = await resolveGuardedNavigation({
    canLeaveCurrentView: async () => false,
  });

  assert.equal(result.status, "cancelled");
  assert.equal(shouldRunNavigationFollowUp(result), false);
});

test("failed dirty-state guard returns failed", async () => {
  const result = await resolveGuardedNavigation({
    canLeaveCurrentView: async () => {
      throw new Error("guard failed");
    },
  });

  assert.equal(result.status, "failed");
  assert.equal(shouldRunNavigationFollowUp(result), false);
});

test("callers do not run follow-up selection when navigation is blocked", () => {
  const selected = [];
  const result = navigationBlocked("project changed");

  if (shouldRunNavigationFollowUp(result)) {
    selected.push("event-1");
  }

  assert.deepEqual(selected, []);
});

test("callers may run follow-up selection after successful navigation", () => {
  const selected = [];
  const result = navigationSuccess("opened");

  if (shouldRunNavigationFollowUp(result)) {
    selected.push("event-1");
  }

  assert.deepEqual(selected, ["event-1"]);
});
