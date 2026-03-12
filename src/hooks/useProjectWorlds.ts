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

const WORLD_COLORS = ["#9d7de8", "#4caf7d", "#c9a84c", "#7c5cbf"];

const buildLoreCategories = (loreTypes: LoreType[]) =>
  loreTypes.map((type) => ({
    id: type.id,
    label: type.name,
    count: 0,
    isSystem: type.isSystem,
  }));

const hydrateWorldUi = (
  worlds: Awaited<ReturnType<typeof listWorlds>>,
  loreTypes: LoreType[],
): WorldUI[] =>
  worlds.map((world, index) => ({
    id: world.id,
    name: world.title,
    color: WORLD_COLORS[index % WORLD_COLORS.length],
    isOpen: index === 0,
    editorCount: 0,
    loreCount: 0,
    loreCategories: buildLoreCategories(loreTypes),
  }));

const areProjectsEqual = (left: Project[], right: Project[]) =>
  left.length === right.length &&
  left.every((project, index) => {
    const other = right[index];
    return (
      !!other &&
      project.id === other.id &&
      project.title === other.title &&
      project.filepath === other.filepath &&
      project.lastEdited === other.lastEdited &&
      project.createdAt === other.createdAt
    );
  });

const areWorldsEqual = (left: WorldUI[], right: WorldUI[]) =>
  left.length === right.length &&
  left.every((world, index) => {
    const other = right[index];
    return (
      !!other &&
      world.id === other.id &&
      world.name === other.name &&
      world.color === other.color &&
      world.isOpen === other.isOpen &&
      world.editorCount === other.editorCount &&
      world.loreCount === other.loreCount &&
      world.loreCategories.length === other.loreCategories.length &&
      world.loreCategories.every((category, categoryIndex) => {
        const otherCategory = other.loreCategories[categoryIndex];
        return (
          !!otherCategory &&
          category.id === otherCategory.id &&
          category.label === otherCategory.label &&
          category.count === otherCategory.count &&
          category.isSystem === otherCategory.isSystem
        );
      })
    );
  });

const getProjectByFilepath = (projects: Project[], filepath: string) =>
  projects.find((project) => project.filepath === filepath) ?? projects[0];

type UseProjectWorldsArgs = {
  confirmAction: (message: string) => Promise<boolean>;
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
    action: () => Promise<T>,
  ) => {
    setProjectActionStateIfChanged({ status, message });
    try {
      return await action();
    } finally {
      setProjectActionStateIfChanged(IDLE_PROJECT_ACTION_STATE);
    }
  }, [setProjectActionStateIfChanged]);

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
      setActiveProjectId((current) => (current === null ? current : null));
      setProjectTitle((current) => (current === "No Project Open" ? current : "No Project Open"));
      setProjectDraft((current) => (current === "" ? current : ""));
      setWorldsIfChanged([]);
      setActiveWorldId((current) => (current === null ? current : null));
      return false;
    }
    const isSameProjectActive = activeProjectId === project.id && worlds.length > 0;
    setActiveProjectId((current) => (current === project.id ? current : project.id));
    setProjectTitle((current) => (current === project.title ? current : project.title));
    setProjectDraft((current) => (current === project.title ? current : project.title));
    if (isSameProjectActive) {
      return true;
    }
    setWorldsIfChanged([]);
    setActiveWorldId((current) => (current === null ? current : null));
    await hydrateWorlds(project.id);
    return true;
  }, [activeProjectId, hydrateWorlds, setWorldsIfChanged, worlds.length]);

  useEffect(() => {
    const load = async () => {
      setProjectActionStateIfChanged({ status: "loading", message: "Loading recent projects..." });
      const requestId = ++hydrateRequestId.current;
      let loadedProjects: Project[] = [];
      try {
        loadedProjects = await listProjects();
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not load recent project files.");
      }
      if (requestId !== hydrateRequestId.current) return;
      setProjectsIfChanged(loadedProjects);
      const project = loadedProjects[0];
      if (!project) {
        await applyActiveProject(null);
        setProjectActionStateIfChanged(IDLE_PROJECT_ACTION_STATE);
        return;
      }
      try {
        await applyActiveProject(project);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not load worlds for the active project.");
      }
      setProjectActionStateIfChanged(IDLE_PROJECT_ACTION_STATE);
    };

    void load();
  }, [applyActiveProject, setProjectActionStateIfChanged, setProjectsIfChanged, showToast]);

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

  const addWorld = useCallback(() => {
    if (!activeProjectId) return;
    const index = worlds.length + 1;
    const title = `New World ${index}`;
    const nextColor = WORLD_COLORS[index % WORLD_COLORS.length];
    void createWorld(activeProjectId, title)
      .then((created) => {
        const newWorld: WorldUI = {
          id: created.id,
          name: created.title,
          color: nextColor,
          isOpen: true,
          editorCount: 0,
          loreCount: 0,
          loreCategories: buildLoreCategories(currentLoreTypesRef.current),
        };
        setWorlds((prev) => {
          let changed = false;
          const closed = prev.map((world) => {
            if (!world.isOpen) return world;
            changed = true;
            return { ...world, isOpen: false };
          });
          return (changed ? closed : prev).concat(newWorld);
        });
        setActiveWorldId((current) => (current === newWorld.id ? current : newWorld.id));
      })
      .catch((error) => {
        showToast(error instanceof Error ? error.message : "Worldie could not create a new world.");
      });
  }, [activeProjectId, showToast, worlds.length]);

  const addProject = useCallback(async () => {
    return runProjectAction("creating", "Creating project file...", async () => {
      const suggestedTitle = `New Project ${projects.length + 1}`;
      const filepath = await pickNewProjectFile(`${suggestedTitle}.worldie`);
      if (!filepath) return false;
      let nextProjects: Project[] = [];
      try {
        nextProjects = await createProjectAtPath(
          getProjectFilename({ filepath, title: suggestedTitle }).replace(/\.worldie$/i, ""),
          filepath,
        );
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not create the new project file.");
        return false;
      }
      setProjectsIfChanged(nextProjects);
      const project = getProjectByFilepath(nextProjects, filepath);
      if (!project) return false;
      try {
        await applyActiveProject(project);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not load the new project.");
        return false;
      }
      return true;
    });
  }, [applyActiveProject, projects.length, runProjectAction, setProjectsIfChanged, showToast]);

  const addDemoProject = useCallback(async () => {
    return runProjectAction("creatingDemo", "Creating demo project...", async () => {
      let nextProjects: Project[] = [];
      try {
        nextProjects = await createDemoProjectBundle();
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not create the demo project.");
        return false;
      }
      setProjectsIfChanged(nextProjects);
      const project = nextProjects[0];
      if (!project) return false;
      try {
        await applyActiveProject(project);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not load the demo project.");
        return false;
      }
      return true;
    });
  }, [applyActiveProject, runProjectAction, setProjectsIfChanged, showToast]);

  const openProject = useCallback(async () => {
    return runProjectAction("opening", "Opening project file...", async () => {
      const filepath = await pickOpenProjectFile();
      if (!filepath) return false;
      let nextProjects: Project[] = [];
      try {
        nextProjects = await openProjectFile(filepath);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not open that project file.");
        return false;
      }
      setProjectsIfChanged(nextProjects);
      const project = getProjectByFilepath(nextProjects, filepath);
      if (!project) return false;
      try {
        await applyActiveProject(project);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not load that project.");
        return false;
      }
      return true;
    });
  }, [applyActiveProject, runProjectAction, setProjectsIfChanged, showToast]);

  const openRecentProject = useCallback(async (projectId: string) => {
    return runProjectAction("openingRecent", "Opening recent project...", async () => {
      const project = projectsById.get(projectId);
      if (!project) {
        showToast("Worldie could not find that recent project.");
        return false;
      }
      if (!project?.filepath) {
        try {
          const switched = await applyActiveProject(project);
          if (!switched) {
            showToast("Worldie could not switch to that recent project.");
            return false;
          }
        } catch (error) {
          showToast(error instanceof Error ? error.message : "Worldie could not switch projects.");
          return false;
        }
        return true;
      }
      let nextProjects: Project[] = [];
      try {
        nextProjects = await openProjectFile(project.filepath);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not reopen that project file.");
        return false;
      }
      setProjectsIfChanged(nextProjects);
      const reopened = getProjectByFilepath(nextProjects, project.filepath);
      if (!reopened) return false;
      try {
        await applyActiveProject(reopened);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not load that recent project.");
        return false;
      }
      return true;
    });
  }, [applyActiveProject, projectsById, runProjectAction, setProjectsIfChanged, showToast]);

  const saveCurrentProjectAs = useCallback(async () => {
    if (!activeProjectId) return false;
    return runProjectAction("savingAs", "Saving project copy...", async () => {
      const suggestedName = getProjectFilename(activeProject);
      const filepath = await pickSaveProjectAsFile(suggestedName);
      if (!filepath) return false;
      let nextProjects: Project[] = [];
      try {
        nextProjects = await saveProjectAs(activeProjectId, filepath);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not save a copy of this project.");
        return false;
      }
      setProjectsIfChanged(nextProjects);
      const savedProject = getProjectByFilepath(nextProjects, filepath);
      if (!savedProject) return false;
      try {
        await applyActiveProject(savedProject);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not load the saved project copy.");
        return false;
      }
      return true;
    });
  }, [activeProject, activeProjectId, applyActiveProject, runProjectAction, setProjectsIfChanged, showToast]);

  const switchProject = useCallback(async (projectId: string) => {
    return runProjectAction("switching", "Switching project...", async () => {
      const project = projectsById.get(projectId);
      if (!project) {
        showToast("Worldie could not find that project.");
        return false;
      }
      return applyActiveProject(project);
    });
  }, [applyActiveProject, projectsById, runProjectAction, showToast]);

  const commitProjectTitle = useCallback(async () => {
    if (!activeProjectId) return;
    const nextTitle = projectDraft.trim();
    if (!nextTitle || nextTitle === projectTitle) {
      setProjectDraft((current) => (current === projectTitle ? current : projectTitle));
      setIsEditingProject((current) => (current ? false : current));
      return;
    }
    let nextProjects: Project[] = [];
    try {
      nextProjects = await updateProjectTitle(activeProjectId, nextTitle);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not rename the project.");
      return;
    }
    setProjectsIfChanged(nextProjects);
    setProjectTitle((current) => (current === nextTitle ? current : nextTitle));
    setIsEditingProject((current) => (current ? false : current));
  }, [activeProjectId, projectDraft, projectTitle, setProjectsIfChanged, showToast]);

  const startWorldEdit = useCallback((world: WorldUI) => {
    setEditingWorldId((current) => (current === world.id ? current : world.id));
    setWorldDraft((current) => (current === world.name ? current : world.name));
  }, []);

  const commitWorldTitle = useCallback(async () => {
    if (!editingWorldId) return;
    const nextTitle = worldDraft.trim();
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
    if (!activeProjectId) return;
    try {
      await updateWorldTitle(activeProjectId, editingWorldId, nextTitle);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not rename the world.");
      return;
    }
    setWorlds((prev) =>
      prev.map((world) =>
        world.id === editingWorldId ? { ...world, name: nextTitle } : world,
      ),
    );
    setEditingWorldId((current) => (current === null ? current : null));
  }, [activeProjectId, editingWorldId, showToast, worldDraft, worldsById]);

  const removeProject = useCallback(async () => {
    if (!activeProjectId) return false;
    const confirmDelete = await confirmAction("Delete this project and all its data?");
    if (!confirmDelete) return false;
    let nextProjects: Project[] = [];
    try {
      nextProjects = await deleteProject(activeProjectId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not delete the project.");
      return false;
    }
    setProjectsIfChanged(nextProjects);
    const next = nextProjects[0];
    if (!next) {
      await applyActiveProject(null);
      return true;
    }
    try {
      await applyActiveProject(next);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not load the next available project.");
      return false;
    }
    return true;
  }, [activeProjectId, applyActiveProject, confirmAction, setProjectsIfChanged, showToast]);

  const removeWorld = useCallback(async (worldId: string) => {
    if (worlds.length <= 1) {
      showToast("A project needs at least one world.");
      return;
    }
    const confirmDelete = await confirmAction("Delete this world and all its data?");
    if (!confirmDelete) return;
    if (!activeProjectId) return;
    try {
      await deleteWorld(activeProjectId, worldId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not delete the world.");
      return;
    }
    const nextWorlds = worlds.filter((world) => world.id !== worldId);
    if (editingWorldId === worldId) {
      setEditingWorldId((current) => (current === null ? current : null));
      setWorldDraft((current) => (current === "" ? current : ""));
    }
    setWorlds(nextWorlds);
    if (activeWorldId === worldId) {
      setActiveWorldId((current) => {
        const nextActiveWorldId = nextWorlds[0]?.id ?? null;
        return current === nextActiveWorldId ? current : nextActiveWorldId;
      });
    }
  }, [activeProjectId, activeWorldId, confirmAction, editingWorldId, showToast, worlds]);

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
      syncLoreTypes,
    ],
  );
}
