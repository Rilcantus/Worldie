import type { TabKind, WorldUI } from "../types/ui";

type BuildStatusBarModelArgs = {
  hasActiveProject: boolean;
  activeNav: TabKind;
  projectTitle: string;
  activeWorld?: WorldUI;
  documentTitle: string;
  loreTitle: string;
  saveState: "idle" | "dirty" | "saving" | "saved" | "error";
  saveTimestamp: number | null;
};

export function buildStatusBarModel({
  hasActiveProject,
  activeNav,
  projectTitle,
  activeWorld,
  documentTitle,
  loreTitle,
  saveState,
  saveTimestamp,
}: BuildStatusBarModelArgs) {
  const activeWorldName = activeWorld?.name ?? "No world selected";

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
              : activeNav === "atlas"
                ? "Atlas"
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
              : activeNav === "timeline"
                ? "Timeline"
                : activeNav === "atlas"
                  ? "Atlas"
                  : "Open Page";

  return {
    projectTitle,
    worldName: activeWorldName,
    sectionLabel,
    detailLabel,
    saveState,
    saveTimestamp,
  };
}
