import { useMemo } from "react";
import type { TabKind, WorldUI } from "../types/ui";
import { buildStatusBarModel } from "./statusBarState";

type UseStatusBarModelArgs = {
  hasActiveProject: boolean;
  activeNav: TabKind;
  projectTitle: string;
  activeWorld?: WorldUI;
  documentTitle: string;
  loreTitle: string;
  saveState: "idle" | "dirty" | "saving" | "saved" | "error";
  saveTimestamp: number | null;
};

export function useStatusBarModel({
  hasActiveProject,
  activeNav,
  projectTitle,
  activeWorld,
  documentTitle,
  loreTitle,
  saveState,
  saveTimestamp,
}: UseStatusBarModelArgs) {
  return useMemo(() => buildStatusBarModel({
    hasActiveProject,
    activeNav,
    projectTitle,
    activeWorld,
    documentTitle,
    loreTitle,
    saveState,
    saveTimestamp,
  }), [hasActiveProject, activeNav, projectTitle, activeWorld, documentTitle, loreTitle, saveState, saveTimestamp]);
}
