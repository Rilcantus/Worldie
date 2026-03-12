import { useMemo } from "react";
import type { TabKind, WorldUI } from "../types/ui";

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
  return useMemo(() => {
    if (!hasActiveProject) {
      return {
        projectTitle: "No Project Open",
        worldName: "No world selected",
        sectionLabel: "Launcher",
        detailLabel: "Open Project",
        saveState: "saved" as const,
        saveTimestamp: null,
      };
    }

    const sectionLabel =
      activeNav === "workbench"
        ? "Workbench"
        : activeNav === "editor"
          ? "Editor"
          : activeNav === "lore"
            ? "Lore"
            : activeNav === "rels"
              ? "Relationships"
              : activeNav === "timeline"
                ? "Timeline"
                : "New Tab";

    const detailLabel =
      activeNav === "workbench"
        ? projectTitle
        : activeNav === "editor"
          ? documentTitle || "Untitled"
          : activeNav === "lore"
            ? loreTitle || "Untitled"
            : activeNav === "new"
              ? "Open Page"
              : activeNav === "rels"
                ? "Relationships"
                : "Timeline";

    return {
      projectTitle,
      worldName: activeWorld?.name ?? "No world selected",
      sectionLabel,
      detailLabel,
      saveState,
      saveTimestamp,
    };
  }, [hasActiveProject, activeNav, projectTitle, activeWorld, documentTitle, loreTitle, saveState, saveTimestamp]);
}
