import { useMemo } from "react";
import type { TabKind, WorldUI } from "../types/ui";

type UseStatusBarModelArgs = {
  activeNav: TabKind;
  projectTitle: string;
  activeWorld?: WorldUI;
  documentTitle: string;
  loreTitle: string;
  saveState: "idle" | "dirty" | "saving" | "saved" | "error";
};

export function useStatusBarModel({
  activeNav,
  projectTitle,
  activeWorld,
  documentTitle,
  loreTitle,
  saveState,
}: UseStatusBarModelArgs) {
  return useMemo(() => {
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
      worldName: activeWorld?.name ?? "",
      sectionLabel,
      detailLabel,
      saveState,
    };
  }, [activeNav, projectTitle, activeWorld, documentTitle, loreTitle, saveState]);
}
