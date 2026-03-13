import { useCallback, useEffect, useMemo, useRef } from "react";

type UseSidebarActionsArgs = {
  projectTitle: string;
  setProjectDraft: (value: string) => void;
  setIsEditingProject: (value: boolean) => void;
  removeProject: () => Promise<boolean>;
  setIsSidebarCollapsed: (value: boolean) => void;
  setEditingWorldId: (value: string | null) => void;
  addWorld: () => void;
  removeWorld: (worldId: string) => Promise<void>;
  activeWorldId: string | null;
  canLeaveCurrentView: () => Promise<boolean>;
  openSpecialTab: (kind: "rels" | "timeline", worldId?: string | null) => Promise<void>;
};

export function useSidebarActions({
  projectTitle,
  setProjectDraft,
  setIsEditingProject,
  removeProject,
  setIsSidebarCollapsed,
  setEditingWorldId,
  addWorld,
  removeWorld,
  activeWorldId,
  canLeaveCurrentView,
  openSpecialTab,
}: UseSidebarActionsArgs) {
  const activeWorldIdRef = useRef(activeWorldId);

  useEffect(() => {
    activeWorldIdRef.current = activeWorldId;
  }, [activeWorldId]);

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

  const handleAddWorld = useCallback(async () => {
    const startingWorldId = activeWorldId;
    if (!(await canLeaveCurrentView())) return;
    if (activeWorldIdRef.current !== startingWorldId) return;
    addWorld();
  }, [activeWorldId, addWorld, canLeaveCurrentView]);

  const handleRemoveWorld = useCallback(
    async (worldId: string) => {
      const startingWorldId = activeWorldId;
      if (worldId === activeWorldId && !(await canLeaveCurrentView())) return;
      if (activeWorldIdRef.current !== startingWorldId) return;
      await removeWorld(worldId);
    },
    [activeWorldId, canLeaveCurrentView, removeWorld],
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
      addWorld: handleAddWorld,
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
      handleAddWorld,
      handleRemoveWorld,
      openRelationshipsForWorld,
      openTimelineForWorld,
    ],
  );
}
