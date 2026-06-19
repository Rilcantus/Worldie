export type NavigationResultStatus = "success" | "cancelled" | "blocked" | "failed";

export type NavigationResult = {
  status: NavigationResultStatus;
  reason?: string;
};

export const navigationSuccess = (reason?: string): NavigationResult => ({ status: "success", reason });
export const navigationCancelled = (reason?: string): NavigationResult => ({ status: "cancelled", reason });
export const navigationBlocked = (reason?: string): NavigationResult => ({ status: "blocked", reason });
export const navigationFailed = (reason?: string): NavigationResult => ({ status: "failed", reason });

export function didNavigationSucceed(result: NavigationResult) {
  return result.status === "success";
}

export function shouldRunNavigationFollowUp(result: NavigationResult) {
  return didNavigationSucceed(result);
}

export async function resolveGuardedNavigation({
  skipGuard,
  canLeaveCurrentView,
}: {
  skipGuard?: boolean;
  canLeaveCurrentView: () => Promise<boolean>;
}): Promise<NavigationResult> {
  if (skipGuard) return navigationSuccess("guard skipped");
  try {
    return (await canLeaveCurrentView())
      ? navigationSuccess("guard passed")
      : navigationCancelled("dirty-state guard cancelled");
  } catch (error) {
    return navigationFailed(error instanceof Error ? error.message : "navigation guard failed");
  }
}
