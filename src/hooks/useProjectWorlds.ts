import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createProjectAtPath,
  createDemoProjectBundle,
  createWorld,
  deleteProject,
  deleteWorld,
  getProjectFilename,
  openProjectFile,
  pickNewProjectFile,
  pickOpenProjectFile,
  pickSaveProjectAsFile,
  listProjects,
  saveProjectAs,
  listWorlds,
  updateProjectTitle,
  updateWorldTitle,
  type Project,
} from "../lib/data";
import type { LoreType } from "../lib/loreTypes";
import type { WorldUI } from "../types/ui";
import {
  appendCreatedWorld,
  areProjectsEqual,
  areWorldsEqual,
  buildLoreCategories,
  hydrateWorldUi,
  removeWorldWithFallback,
  WORLD_COLORS,
} from "./projectWorldState";
import { getProjectByFilepath, isMissingProjectFileError } from "./projectRecovery";

type UseProjectWorldsArgs = {
  confirmAction: (
    message: string,
    options?: { confirmLabel?: string; tone?: "default" | "danger" },
  ) => Promise<boolean>;
  showToast: (message: string) => void;
  initialLoreTypes: LoreType[];
};

type ProjectActionState =
  | { status: "idle"; message: "" }
  | { status: "loading"; message: string }
  | { status: "creating"; message: string }
  | { status: "creatingDemo"; message: string }
  | { status: "opening"; message: string }
  | { status: "openingRecent"; message: string }
  | { status: "switching"; message: string }
  | { status: "savingAs"; message: string };

const IDLE_PROJECT_ACTION_STATE: ProjectActionState = { status: "idle", message: "" };

export function useProjectWorlds({ confirmAction, showToast, initialLoreTypes }: UseProjectWorldsArgs) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTitle, setProjectTitle] = useState("No Project Open");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectDraft, setProjectDraft] = useState("");

  const [worlds, setWorlds] = useState<WorldUI[]>([]);
  const [activeWorldId, setActiveWorldId] = useState<string | null>(null);
  const [editingWorldId, setEditingWorldId] = useState<string | null>(null);
  const [worldDraft, setWorldDraft] = useState("");
  const hydrateRequestId = useRef(0);
  const currentLoreTypesRef = useRef(initialLoreTypes);
  const activeProjectIdRef = useRef<string | null>(null);
  const activeWorldIdRef = useRef<string | null>(null);
  const worldsLengthRef = useRef(0);
  const projectActionRequestIdRef = useRef(0);
  const currentProjectRenameVersionRef = useRef(0);
  const currentProjectRenameRequestIdRef = useRef(0);
  const currentWorldRenameVersionRef = useRef(0);
  const currentWorldRenameRequestIdRef = useRef(0);
  const worldCreateRequestIdRef = useRef(0);
  const currentScopeRef = useRef<{ projectId: string | null; worldId: string | null }>({
    projectId: null,
    worldId: null,
  });
  const missingProjectRecoveryPromisesRef = useRef(new Map<string, Promise<boolean>>());
  const [projectActionState, setProjectActionState] = useState<ProjectActionState>(IDLE_PROJECT_ACTION_STATE);
  const worldsById = useMemo(() => new Map(worlds.map((world) => [world.id, world])), [worlds]);
  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  const activeWorld = useMemo(
    () => (activeWorldId ? worldsById.get(activeWorldId) : undefined) ?? worlds[0],
    [activeWorldId, worlds, worldsById],
  );
  const activeProject = useMemo(
    () => (activeProjectId ? projectsById.get(activeProjectId) : null) ?? null,
    [activeProjectId, projectsById],
  );
  const recentProjects = useMemo(() => projects.slice(0, 6), [projects]);
  const isProjectActionPending = projectActionState.status !== "idle";

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    activeWorldIdRef.current = activeWorldId;
  }, [activeWorldId]);

  useEffect(() => {
    currentScopeRef.current = {
      projectId: activeProjectId,
      worldId: activeWorldId,
    };
  }, [activeProjectId, activeWorldId]);

  useEffect(() => {
    currentProjectRenameVersionRef.current += 1;
  }, [activeProjectId, projectDraft]);

  useEffect(() => {
    currentWorldRenameVersionRef.current += 1;
  }, [editingWorldId, worldDraft]);

  useEffect(() => {
    worldsLengthRef.current = worlds.length;
  }, [worlds.length]);

  const setProjectActionStateIfChanged = useCallback((nextState: ProjectActionState) => {
    setProjectActionState((current) =>
      current.status === nextState.status && current.message === nextState.message ? current : nextState,
    );
  }, []);

  const setProjectsIfChanged = useCallback((nextProjects: Project[]) => {
    setProjects((current) => (areProjectsEqual(current, nextProjects) ? current : nextProjects));
  }, []);

  const setWorldsIfChanged = useCallback((nextWorlds: WorldUI[]) => {
    setWorlds((current) => (areWorldsEqual(current, nextWorlds) ? current : nextWorlds));
  }, []);

  const runProjectAction = useCallback(async <T,>(
    status: Exclude<ProjectActionState["status"], "idle">,
    message: string,
    action: (requestId: number) => Promise<T>,
  ) => {
    const requestId = ++projectActionRequestIdRef.current;
    setProjectActionStateIfChanged({ status, message });
    try {
      return await action(requestId);
    } finally {
      if (projectActionRequestIdRef.current === requestId) {
        setProjectActionStateIfChanged(IDLE_PROJECT_ACTION_STATE);
      }
    }
  }, [setProjectActionStateIfChanged]);

  const invalidateWorldHydration = useCallback(() => {
    hydrateRequestId.current += 1;
  }, []);

  const hydrateWorlds = useCallback(async (projectId: string) => {
    const requestId = ++hydrateRequestId.current;
    const storedWorlds = await listWorlds(projectId);
    if (requestId !== hydrateRequestId.current) return;
    if (storedWorlds.length === 0) {
      const created = await createWorld(projectId, "Valdris Prime");
      if (requestId !== hydrateRequestId.current) return;
      const initial: WorldUI[] = [
        {
          id: created.id,
          name: created.title,
          color: WORLD_COLORS[0],
          isOpen: true,
          editorCount: 0,
          loreCount: 0,
          loreCategories: buildLoreCategories(currentLoreTypesRef.current),
        },
      ];
      setWorldsIfChanged(initial);
      setActiveWorldId((current) => (current === created.id ? current : created.id));
      return;
    }

    const hydrated = hydrateWorldUi(storedWorlds, currentLoreTypesRef.current);
    setWorldsIfChanged(hydrated);
    setActiveWorldId((current) => {
      const nextActiveWorldId = hydrated[0]?.id ?? null;
      return current === nextActiveWorldId ? current : nextActiveWorldId;
    });
  }, [setWorldsIfChanged]);

  const applyActiveProject = useCallback(async (project: Project | null) => {
    setIsEditingProject((current) => (current ? false : current));
    setEditingWorldId((current) => (current === null ? current : null));
    setWorldDraft((current) => (current === "" ? current : ""));
    if (!project) {
      invalidateWorldHydration();
      setActiveProjectId((current) => (current === null ? current : null));
      setProjectTitle((current) => (current === "No Project Open" ? current : "No Project Open"));
      setProjectDraft((current) => (current === "" ? current : ""));
      setWorldsIfChanged([]);
      setActiveWorldId((current) => (current === null ? current : null));
      return false;
    }
    const isSameProjectActive = activeProjectIdRef.current === project.id && worldsLengthRef.current > 0;
    if (isSameProjectActive) {
      setActiveProjectId((current) => (current === project.id ? current : project.id));
      setProjectTitle((current) => (current === project.title ? current : project.title));
      setProjectDraft((current) => (current === project.title ? current : project.title));
      return true;
    }
    setWorldsIfChanged([]);
    setActiveWorldId((current) => (current === null ? current : null));
    await hydrateWorlds(project.id);
    setActiveProjectId((current) => (current === project.id ? current : project.id));
    setProjectTitle((current) => (current === project.title ? current : project.title));
    setProjectDraft((current) => (current === project.title ? current : project.title));
    return true;
  }, [hydrateWorlds, invalidateWorldHydration, setWorldsIfChanged]);

  const syncLoreTypes = useCallback((loreTypes: LoreType[]) => {
    currentLoreTypesRef.current = loreTypes;
    setWorlds((prev) => {
      let changed = false;
      const next = prev.map((world) => {
        const existingCategoriesById = new Map(world.loreCategories.map((item) => [item.id, item]));
        const nextLoreCategories = buildLoreCategories(loreTypes).map((category) => {
          const existing = existingCategoriesById.get(category.id);
          return existing ? { ...category, count: existing.count } : category;
        });

        const categoriesChanged =
          nextLoreCategories.length !== world.loreCategories.length ||
          nextLoreCategories.some((category, index) => {
            const current = world.loreCategories[index];
            return (
              !current ||
              current.id !== category.id ||
              current.label !== category.label ||
              current.count !== category.count ||
              current.isSystem !== category.isSystem
            );
          });

        if (!categoriesChanged) return world;
        changed = true;
        return {
          ...world,
          loreCategories: nextLoreCategories,
        };
      });

      return changed ? next : prev;
    });
  }, []);

  const toggleWorld = useCallback((id: string) => {
    setWorlds((prev) => {
      let changed = false;
      const next = prev.map((world) => {
        if (world.id !== id) return world;
        changed = true;
        return { ...world, isOpen: !world.isOpen };
      });
      return changed ? next : prev;
    });
  }, []);

  const recoverMissingProject = useCallback(async (
    project: Project,
    error: unknown,
    options?: { activateFallback?: boolean; skipConfirm?: boolean },
  ): Promise<boolean> => {
    const inFlightRecovery = missingProjectRecoveryPromisesRef.current.get(project.id);
    if (inFlightRecovery) {
      return inFlightRecovery;
    }

    const recoveryPromise: Promise<boolean> = (async (): Promise<boolean> => {
    const actionRequestId = projectActionRequestIdRef.current;
    const isCurrentRecovery = () => projectActionRequestIdRef.current === actionRequestId;
    const message = error instanceof Error ? error.message : "Worldie could not load that project file.";
    if (!isMissingProjectFileError(project, error)) {
      if (!isCurrentRecovery()) return false;
      showToast(message);
      return false;
    }

    if (!options?.skipConfirm) {
      const confirmRemove = await confirmAction(
        `${getProjectFilename(project)} is missing. Remove it from recent projects?`,
        { confirmLabel: "Remove", tone: "danger" },
      );
      if (!isCurrentRecovery()) return false;
      if (!confirmRemove) {
        showToast(message);
        return false;
      }
    }

    if (!isCurrentRecovery()) return false;
    let nextProjects: Project[] = [];
    try {
      nextProjects = await deleteProject(project.id);
    } catch (deleteError) {
      if (!isCurrentRecovery()) return false;
      showToast(deleteError instanceof Error ? deleteError.message : "Worldie could not remove the missing project.");
      return false;
    }

    if (!isCurrentRecovery()) return false;
    setProjectsIfChanged(nextProjects);
    const shouldActivateFallback = options?.activateFallback || activeProjectIdRef.current === project.id;
    if (shouldActivateFallback) {
      await applyActiveProject(null);
      if (!isCurrentRecovery()) return false;
      const nextProject = nextProjects[0] ?? null;
      try {
        await applyActiveProject(nextProject);
      } catch (applyError) {
        if (!isCurrentRecovery()) return false;
        if (nextProject) {
          return recoverMissingProject(nextProject, applyError, { activateFallback: true, skipConfirm: true });
        }
        showToast(applyError instanceof Error ? applyError.message : "Worldie could not load the next available project.");
        return false;
      }
    }

    if (!isCurrentRecovery()) return false;
    showToast(`${getProjectFilename(project)} was removed from recent projects.`);
    return shouldActivateFallback;
    })();

    missingProjectRecoveryPromisesRef.current.set(project.id, recoveryPromise);
    try {
      return await recoveryPromise;
    } finally {
      missingProjectRecoveryPromisesRef.current.delete(project.id);
    }
  }, [applyActiveProject, confirmAction, setProjectsIfChanged, showToast]);

  const recoverActiveProjectError = useCallback(async (error: unknown, fallbackMessage: string) => {
    if (activeProject) {
      return recoverMissingProject(activeProject, error, { activateFallback: true });
    }
    showToast(error instanceof Error ? error.message : fallbackMessage);
    return false;
  }, [activeProject, recoverMissingProject, showToast]);

  const addWorld = useCallback(() => {
    if (!activeProjectId) return;
    const actionProjectId = activeProjectId;
    const startedActiveWorldId = activeWorldId;
    const index = worlds.length + 1;
    const title = `New World ${index}`;
    const requestId = ++worldCreateRequestIdRef.current;
    void createWorld(actionProjectId, title)
      .then((created) => {
        if (currentScopeRef.current.projectId !== actionProjectId) return;
        let nextActiveWorldId: string | null = null;
        setWorlds((prev) => {
          const shouldActivate = worldCreateRequestIdRef.current === requestId;
          const nextState = appendCreatedWorld(prev, created, currentLoreTypesRef.current, shouldActivate);
          nextActiveWorldId = nextState.activeWorldId;
          return nextState.worlds;
        });
        if (worldCreateRequestIdRef.current !== requestId) return;
        if (activeWorldIdRef.current !== startedActiveWorldId) return;
        if (!nextActiveWorldId) return;
        setActiveWorldId((current) => (current === nextActiveWorldId ? current : nextActiveWorldId));
      })
      .catch((error) => {
        if (currentScopeRef.current.projectId !== actionProjectId) return;
        void recoverActiveProjectError(error, "Worldie could not create a new world.");
      });
  }, [activeProjectId, activeWorldId, recoverActiveProjectError, worlds.length]);

  const addProject = useCallback(async () => {
    return runProjectAction("creating", "Creating project file...", async (requestId) => {
      const suggestedTitle = `New Project ${projects.length + 1}`;
      const filepath = await pickNewProjectFile(`${suggestedTitle}.worldie`);
      if (!filepath) return false;
      let nextProjects: Project[] = [];
      let project: Project | null = null;
      try {
        const result = await createProjectAtPath(
          getProjectFilename({ filepath, title: suggestedTitle }).replace(/\.worldie$/i, ""),
          filepath,
        );
        nextProjects = result.projects;
        project = result.project;
      } catch (error) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        showToast(error instanceof Error ? error.message : "Worldie could not create the new project file.");
        return false;
      }
      if (projectActionRequestIdRef.current !== requestId) return false;
      setProjectsIfChanged(nextProjects);
      project ??= getProjectByFilepath(nextProjects, filepath);
      if (!project) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        showToast("Worldie could not find the newly created project file.");
        return false;
      }
      try {
        if (projectActionRequestIdRef.current !== requestId) return false;
        await applyActiveProject(project);
      } catch (error) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        return recoverMissingProject(project, error);
      }
      return true;
    });
  }, [applyActiveProject, projects.length, recoverMissingProject, runProjectAction, setProjectsIfChanged, showToast]);

  const addDemoProject = useCallback(async () => {
    return runProjectAction("creatingDemo", "Creating demo project...", async (requestId) => {
      let nextProjects: Project[] = [];
      try {
        nextProjects = await createDemoProjectBundle();
      } catch (error) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        showToast(error instanceof Error ? error.message : "Worldie could not create the demo project.");
        return false;
      }
      if (projectActionRequestIdRef.current !== requestId) return false;
      setProjectsIfChanged(nextProjects);
      const project = nextProjects[0];
      if (!project) return false;
      try {
        if (projectActionRequestIdRef.current !== requestId) return false;
        await applyActiveProject(project);
      } catch (error) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        return recoverMissingProject(project, error);
      }
      return true;
    });
  }, [applyActiveProject, recoverMissingProject, runProjectAction, setProjectsIfChanged, showToast]);

  useEffect(() => {
    const load = async () => {
      const actionRequestId = ++projectActionRequestIdRef.current;
      setProjectActionStateIfChanged({ status: "loading", message: "Loading recent projects..." });
      const requestId = ++hydrateRequestId.current;
      let loadedProjects: Project[] = [];
      try {
        loadedProjects = await listProjects();
      } catch (error) {
        if (projectActionRequestIdRef.current !== actionRequestId) return;
        showToast(error instanceof Error ? error.message : "Worldie could not load recent project files.");
      }
      if (requestId !== hydrateRequestId.current || projectActionRequestIdRef.current !== actionRequestId) return;
      setProjectsIfChanged(loadedProjects);
      const project = loadedProjects[0];
      if (!project) {
        await applyActiveProject(null);
        if (projectActionRequestIdRef.current === actionRequestId) {
          setProjectActionStateIfChanged(IDLE_PROJECT_ACTION_STATE);
        }
        return;
      }
      try {
        await applyActiveProject(project);
      } catch (error) {
        if (projectActionRequestIdRef.current !== actionRequestId) return;
        await recoverMissingProject(project, error, { activateFallback: true });
      }
      if (projectActionRequestIdRef.current === actionRequestId) {
        setProjectActionStateIfChanged(IDLE_PROJECT_ACTION_STATE);
      }
    };

    void load();
  }, [applyActiveProject, recoverMissingProject, setProjectActionStateIfChanged, setProjectsIfChanged, showToast]);

  const openProject = useCallback(async () => {
    return runProjectAction("opening", "Opening project file...", async (requestId) => {
      const filepath = await pickOpenProjectFile();
      if (!filepath) return false;
      let nextProjects: Project[] = [];
      let project: Project | null = null;
      try {
        const result = await openProjectFile(filepath);
        nextProjects = result.projects;
        project = result.project;
      } catch (error) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        showToast(error instanceof Error ? error.message : "Worldie could not open that project file.");
        return false;
      }
      if (projectActionRequestIdRef.current !== requestId) return false;
      setProjectsIfChanged(nextProjects);
      project ??= getProjectByFilepath(nextProjects, filepath);
      if (!project) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        showToast("Worldie could not find the opened project in the project list.");
        return false;
      }
      try {
        if (projectActionRequestIdRef.current !== requestId) return false;
        await applyActiveProject(project);
      } catch (error) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        return recoverMissingProject(project, error);
      }
      return true;
    });
  }, [applyActiveProject, recoverMissingProject, runProjectAction, setProjectsIfChanged, showToast]);

  const openRecentProject = useCallback(async (projectId: string) => {
    return runProjectAction("openingRecent", "Opening recent project...", async (requestId) => {
      const project = projectsById.get(projectId);
      if (!project) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        showToast("Worldie could not find that recent project.");
        return false;
      }
      if (!project?.filepath) {
        try {
          if (projectActionRequestIdRef.current !== requestId) return false;
          const switched = await applyActiveProject(project);
          if (!switched) {
            if (projectActionRequestIdRef.current !== requestId) return false;
            showToast("Worldie could not switch to that recent project.");
            return false;
          }
        } catch (error) {
          if (projectActionRequestIdRef.current !== requestId) return false;
          showToast(error instanceof Error ? error.message : "Worldie could not switch projects.");
          return false;
        }
        return true;
      }
      let nextProjects: Project[] = [];
      let reopened: Project | null = null;
      try {
        const result = await openProjectFile(project.filepath);
        nextProjects = result.projects;
        reopened = result.project;
      } catch (error) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        return recoverMissingProject(project, error);
      }
      if (projectActionRequestIdRef.current !== requestId) return false;
      setProjectsIfChanged(nextProjects);
      reopened ??= getProjectByFilepath(nextProjects, project.filepath);
      if (!reopened) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        showToast("Worldie could not find the reopened recent project.");
        return false;
      }
      try {
        if (projectActionRequestIdRef.current !== requestId) return false;
        await applyActiveProject(reopened);
      } catch (error) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        return recoverMissingProject(reopened, error);
      }
      return true;
    });
  }, [applyActiveProject, projectsById, recoverMissingProject, runProjectAction, setProjectsIfChanged, showToast]);

  const saveCurrentProjectAs = useCallback(async () => {
    if (!activeProjectId) return false;
    return runProjectAction("savingAs", "Saving project copy...", async (requestId) => {
      const suggestedName = getProjectFilename(activeProject);
      const filepath = await pickSaveProjectAsFile(suggestedName);
      if (!filepath) return false;
      let nextProjects: Project[] = [];
      let savedProject: Project | null = null;
      try {
        const result = await saveProjectAs(activeProjectId, filepath);
        nextProjects = result.projects;
        savedProject = result.project;
      } catch (error) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        return recoverActiveProjectError(error, "Worldie could not save a copy of this project.");
      }
      if (projectActionRequestIdRef.current !== requestId) return false;
      setProjectsIfChanged(nextProjects);
      savedProject ??= getProjectByFilepath(nextProjects, filepath);
      if (!savedProject) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        showToast("Worldie could not find the saved project copy.");
        return false;
      }
      try {
        if (projectActionRequestIdRef.current !== requestId) return false;
        await applyActiveProject(savedProject);
      } catch (error) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        return recoverMissingProject(savedProject, error);
      }
      return true;
    });
  }, [activeProject, activeProjectId, applyActiveProject, recoverActiveProjectError, runProjectAction, setProjectsIfChanged, showToast]);

  const switchProject = useCallback(async (projectId: string) => {
    return runProjectAction("switching", "Switching project...", async (requestId) => {
      const project = projectsById.get(projectId);
      if (!project) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        showToast("Worldie could not find that project.");
        return false;
      }
      try {
        if (projectActionRequestIdRef.current !== requestId) return false;
        return await applyActiveProject(project);
      } catch (error) {
        if (projectActionRequestIdRef.current !== requestId) return false;
        return recoverMissingProject(project, error);
      }
    });
  }, [applyActiveProject, projectsById, recoverMissingProject, runProjectAction, showToast]);

  const commitProjectTitle = useCallback(async () => {
    if (!activeProjectId) return;
    const actionProjectId = activeProjectId;
    const nextTitle = projectDraft.trim();
    const renameVersion = currentProjectRenameVersionRef.current;
    const renameRequestId = ++currentProjectRenameRequestIdRef.current;
    if (!nextTitle || nextTitle === projectTitle) {
      setProjectDraft((current) => (current === projectTitle ? current : projectTitle));
      setIsEditingProject((current) => (current ? false : current));
      return;
    }
    let nextProjects: Project[] = [];
    try {
      nextProjects = await updateProjectTitle(actionProjectId, nextTitle);
    } catch (error) {
      if (currentProjectRenameRequestIdRef.current !== renameRequestId) return;
      if (currentProjectRenameVersionRef.current !== renameVersion) return;
      await recoverActiveProjectError(error, "Worldie could not rename the project.");
      return;
    }
    if (currentProjectRenameRequestIdRef.current !== renameRequestId) return;
    if (currentProjectRenameVersionRef.current !== renameVersion) return;
    setProjectsIfChanged(nextProjects);
    if (currentScopeRef.current.projectId !== actionProjectId) return;
    setProjectTitle((current) => (current === nextTitle ? current : nextTitle));
    setIsEditingProject((current) => (current ? false : current));
  }, [activeProjectId, projectDraft, projectTitle, recoverActiveProjectError, setProjectsIfChanged]);

  const startWorldEdit = useCallback((world: WorldUI) => {
    setEditingWorldId((current) => (current === world.id ? current : world.id));
    setWorldDraft((current) => (current === world.name ? current : world.name));
  }, []);

  const commitWorldTitle = useCallback(async () => {
    if (!editingWorldId) return;
    const actionProjectId = activeProjectId;
    const actionWorldId = editingWorldId;
    const nextTitle = worldDraft.trim();
    const renameVersion = currentWorldRenameVersionRef.current;
    const renameRequestId = ++currentWorldRenameRequestIdRef.current;
    const currentWorldName = worldsById.get(editingWorldId)?.name ?? "";
    if (!nextTitle) {
      setEditingWorldId((current) => (current === null ? current : null));
      return;
    }
    if (nextTitle === currentWorldName) {
      setWorldDraft((current) => (current === currentWorldName ? current : currentWorldName));
      setEditingWorldId((current) => (current === null ? current : null));
      return;
    }
    if (!actionProjectId) return;
    try {
      await updateWorldTitle(actionProjectId, actionWorldId, nextTitle);
    } catch (error) {
      if (currentWorldRenameRequestIdRef.current !== renameRequestId) return;
      if (currentWorldRenameVersionRef.current !== renameVersion) return;
      await recoverActiveProjectError(error, "Worldie could not rename the world.");
      return;
    }
    if (currentWorldRenameRequestIdRef.current !== renameRequestId) return;
    if (currentWorldRenameVersionRef.current !== renameVersion) return;
    if (currentScopeRef.current.projectId !== actionProjectId) return;
    setWorlds((prev) =>
      prev.map((world) =>
        world.id === actionWorldId ? { ...world, name: nextTitle } : world,
      ),
    );
    setEditingWorldId((current) => (current === null ? current : null));
  }, [activeProjectId, editingWorldId, recoverActiveProjectError, worldDraft, worldsById]);

  const removeProject = useCallback(async () => {
    if (!activeProjectId) return false;
    const deletedProjectId = activeProjectId;
    const confirmDelete = await confirmAction("Delete this project and all its data?");
    if (!confirmDelete) return false;
    let nextProjects: Project[] = [];
    try {
      nextProjects = await deleteProject(deletedProjectId);
    } catch (error) {
      return recoverActiveProjectError(error, "Worldie could not delete the project.");
    }
    setProjectsIfChanged(nextProjects);
    if (activeProjectIdRef.current !== deletedProjectId) {
      return true;
    }
    await applyActiveProject(null);
    const next = nextProjects[0];
    if (!next) {
      return true;
    }
    try {
      await applyActiveProject(next);
    } catch (error) {
      return recoverMissingProject(next, error, { activateFallback: true });
    }
    return true;
  }, [activeProjectId, applyActiveProject, confirmAction, recoverActiveProjectError, recoverMissingProject, setProjectsIfChanged]);

  const removeWorld = useCallback(async (worldId: string) => {
    if (worlds.length <= 1) {
      showToast("A project needs at least one world.");
      return;
    }
    const confirmDelete = await confirmAction("Delete this world and all its data?");
    if (!confirmDelete) return;
    if (!activeProjectId) return;
    const actionProjectId = activeProjectId;
    const startedActiveWorldId = activeWorldId;
    try {
      await deleteWorld(actionProjectId, worldId);
    } catch (error) {
      await recoverActiveProjectError(error, "Worldie could not delete the world.");
      return;
    }
    if (currentScopeRef.current.projectId !== actionProjectId) return;
    let nextActiveWorldId: string | null = null;
    if (editingWorldId === worldId) {
      setEditingWorldId((current) => (current === null ? current : null));
      setWorldDraft((current) => (current === "" ? current : ""));
    }
    setWorlds((prev) => {
      const nextState = removeWorldWithFallback(prev, worldId);
      if (!nextState.removed) {
        nextActiveWorldId = activeWorldIdRef.current;
        return prev;
      }
      nextActiveWorldId = nextState.nextActiveWorldId;
      return nextState.worlds;
    });
    if (startedActiveWorldId === worldId && activeWorldIdRef.current === worldId) {
      setActiveWorldId((current) => {
        return current === nextActiveWorldId ? current : nextActiveWorldId;
      });
    }
  }, [activeProjectId, activeWorldId, confirmAction, editingWorldId, recoverActiveProjectError, worlds]);

  return useMemo(
    () => ({
      projects,
      activeProject,
      recentProjects,
      projectActionState,
      isProjectActionPending,
      projectTitle,
      activeProjectId,
      isEditingProject,
      projectDraft,
      worlds,
      activeWorld,
      activeWorldId,
      editingWorldId,
      worldDraft,
      setIsEditingProject,
      setProjectDraft,
      setWorlds,
      setActiveWorldId,
      setWorldDraft,
      setEditingWorldId,
      hydrateWorlds,
      toggleWorld,
      addWorld,
      addProject,
      addDemoProject,
      openProject,
      openRecentProject,
      saveCurrentProjectAs,
      switchProject,
      commitProjectTitle,
      startWorldEdit,
      commitWorldTitle,
      removeProject,
      removeWorld,
      recoverActiveProjectError,
      syncLoreTypes,
    }),
    [
      projects,
      activeProject,
      recentProjects,
      projectActionState,
      isProjectActionPending,
      projectTitle,
      activeProjectId,
      isEditingProject,
      projectDraft,
      worlds,
      activeWorld,
      activeWorldId,
      editingWorldId,
      worldDraft,
      hydrateWorlds,
      toggleWorld,
      addWorld,
      addProject,
      addDemoProject,
      openProject,
      openRecentProject,
      saveCurrentProjectAs,
      switchProject,
      commitProjectTitle,
      startWorldEdit,
      commitWorldTitle,
      removeProject,
      removeWorld,
      recoverActiveProjectError,
      syncLoreTypes,
    ],
  );
}
