import type { WorldUI } from "../types/ui";

type UseSidebarActionsArgs = {
  projectTitle: string;
  setProjectDraft: (value: string) => void;
  setIsEditingProject: (value: boolean) => void;
  removeProject: () => Promise<void>;
  setIsSidebarCollapsed: (value: boolean) => void;
  setEditingWorldId: (value: string | null) => void;
  removeWorld: (worldId: string) => Promise<void>;
  setActiveWorldId: (worldId: string) => void;
  openSpecialTab: (kind: "rels" | "timeline") => void;
};

export function useSidebarActions({
  projectTitle,
  setProjectDraft,
  setIsEditingProject,
  removeProject,
  setIsSidebarCollapsed,
  setEditingWorldId,
  removeWorld,
  setActiveWorldId,
  openSpecialTab,
}: UseSidebarActionsArgs) {
  return {
    cancelProjectEdit: () => {
      setProjectDraft(projectTitle);
      setIsEditingProject(false);
    },
    startProjectEdit: () => setIsEditingProject(true),
    removeProject: () => void removeProject(),
    collapseSidebar: () => setIsSidebarCollapsed(true),
    cancelWorldEdit: () => setEditingWorldId(null),
    removeWorld: (worldId: string) => void removeWorld(worldId),
    openRelationshipsForWorld: (worldId: string) => {
      setActiveWorldId(worldId);
      openSpecialTab("rels");
    },
    openTimelineForWorld: (worldId: string) => {
      setActiveWorldId(worldId);
      openSpecialTab("timeline");
    },
  };
}
