import { useCallback, useMemo } from "react";

type UseSidebarActionsArgs = {
  projectTitle: string;
  setProjectDraft: (value: string) => void;
  setIsEditingProject: (value: boolean) => void;
  removeProject: () => Promise<boolean>;
  setIsSidebarCollapsed: (value: boolean) => void;
  setEditingWorldId: (value: string | null) => void;
  removeWorld: (worldId: string) => Promise<void>;
  openSpecialTab: (kind: "rels" | "timeline", worldId?: string | null) => Promise<void>;
};

export function useSidebarActions({
  projectTitle,
  setProjectDraft,
  setIsEditingProject,
  removeProject,
  setIsSidebarCollapsed,
  setEditingWorldId,
  removeWorld,
  openSpecialTab,
}: UseSidebarActionsArgs) {
  const cancelProjectEdit = useCallback(() => {
    setProjectDraft(projectTitle);
    setIsEditingProject(false);
  }, [projectTitle, setIsEditingProject, setProjectDraft]);

  const startProjectEdit = useCallback(() => {
    setIsEditingProject(true);
  }, [setIsEditingProject]);

  const handleRemoveProject = useCallback(() => {
    void removeProject();
  }, [removeProject]);

  const collapseSidebar = useCallback(() => {
    setIsSidebarCollapsed(true);
  }, [setIsSidebarCollapsed]);

  const cancelWorldEdit = useCallback(() => {
    setEditingWorldId(null);
  }, [setEditingWorldId]);

  const handleRemoveWorld = useCallback(
    (worldId: string) => {
      void removeWorld(worldId);
    },
    [removeWorld],
  );

  const openRelationshipsForWorld = useCallback(
    (worldId: string) => {
      void openSpecialTab("rels", worldId);
    },
    [openSpecialTab],
  );

  const openTimelineForWorld = useCallback(
    (worldId: string) => {
      void openSpecialTab("timeline", worldId);
    },
    [openSpecialTab],
  );

  return useMemo(
    () => ({
      cancelProjectEdit,
      startProjectEdit,
      removeProject: handleRemoveProject,
      collapseSidebar,
      cancelWorldEdit,
      removeWorld: handleRemoveWorld,
      openRelationshipsForWorld,
      openTimelineForWorld,
    }),
    [
      cancelProjectEdit,
      startProjectEdit,
      handleRemoveProject,
      collapseSidebar,
      cancelWorldEdit,
      handleRemoveWorld,
      openRelationshipsForWorld,
      openTimelineForWorld,
    ],
  );
}
