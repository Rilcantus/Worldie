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

  const activeWorld = useMemo(
    () => worlds.find((world) => world.id === activeWorldId) ?? worlds[0],
    [worlds, activeWorldId],
  );
  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  );
  const recentProjects = useMemo(() => projects.slice(0, 6), [projects]);
  const isProjectActionPending = projectActionState.status !== "idle";

  const setProjectActionStateIfChanged = (nextState: ProjectActionState) => {
    setProjectActionState((current) =>
      current.status === nextState.status && current.message === nextState.message ? current : nextState,
    );
  };

  const runProjectAction = async <T,>(
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
  };

  const applyActiveProject = async (project: Project | null) => {
    setIsEditingProject((current) => (current ? false : current));
    setEditingWorldId((current) => (current === null ? current : null));
    setWorldDraft((current) => (current === "" ? current : ""));
    if (!project) {
      setActiveProjectId((current) => (current === null ? current : null));
      setProjectTitle((current) => (current === "No Project Open" ? current : "No Project Open"));
      setProjectDraft((current) => (current === "" ? current : ""));
      setWorlds((current) => (current.length === 0 ? current : []));
      setActiveWorldId((current) => (current === null ? current : null));
      return false;
    }
    setWorlds((current) => (current.length === 0 ? current : []));
    setActiveWorldId((current) => (current === null ? current : null));
    setActiveProjectId((current) => (current === project.id ? current : project.id));
    setProjectTitle((current) => (current === project.title ? current : project.title));
    setProjectDraft((current) => (current === project.title ? current : project.title));
    await hydrateWorlds(project.id);
    return true;
  };

  const hydrateWorlds = async (projectId: string) => {
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
      setWorlds(initial);
      setActiveWorldId(created.id);
      return;
    }

    const hydrated = hydrateWorldUi(storedWorlds, currentLoreTypesRef.current);
    setWorlds(hydrated);
    setActiveWorldId(hydrated[0]?.id ?? null);
  };

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
      setProjects(loadedProjects);
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
  }, []);

  const syncLoreTypes = useCallback((loreTypes: LoreType[]) => {
    currentLoreTypesRef.current = loreTypes;
    setWorlds((prev) => {
      let changed = false;
      const next = prev.map((world) => {
        const nextLoreCategories = buildLoreCategories(loreTypes).map((category) => {
          const existing = world.loreCategories.find((item) => item.id === category.id);
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

  const toggleWorld = (id: string) => {
    setWorlds((prev) =>
      prev.map((world) =>
        world.id === id ? { ...world, isOpen: !world.isOpen } : world,
      ),
    );
  };

  const addWorld = () => {
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
        setWorlds((prev) => prev.map((world) => ({ ...world, isOpen: false })).concat(newWorld));
        setActiveWorldId(newWorld.id);
      })
      .catch((error) => {
        showToast(error instanceof Error ? error.message : "Worldie could not create a new world.");
      });
  };

  const addProject = async () => {
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
      setProjects(nextProjects);
      const project = nextProjects.find((item) => item.filepath === filepath) ?? nextProjects[0];
      if (!project) return false;
      try {
        await applyActiveProject(project);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not load the new project.");
        return false;
      }
      return true;
    });
  };

  const addDemoProject = async () => {
    return runProjectAction("creatingDemo", "Creating demo project...", async () => {
      let nextProjects: Project[] = [];
      try {
        nextProjects = await createDemoProjectBundle();
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not create the demo project.");
        return false;
      }
      setProjects(nextProjects);
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
  };

  const openProject = async () => {
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
      setProjects(nextProjects);
      const project = nextProjects.find((item) => item.filepath === filepath) ?? nextProjects[0];
      if (!project) return false;
      try {
        await applyActiveProject(project);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not load that project.");
        return false;
      }
      return true;
    });
  };

  const openRecentProject = async (projectId: string) => {
    return runProjectAction("openingRecent", "Opening recent project...", async () => {
      const project = projects.find((item) => item.id === projectId);
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
      setProjects(nextProjects);
      const reopened = nextProjects.find((item) => item.filepath === project.filepath) ?? nextProjects[0];
      if (!reopened) return false;
      try {
        await applyActiveProject(reopened);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not load that recent project.");
        return false;
      }
      return true;
    });
  };

  const saveCurrentProjectAs = async () => {
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
      setProjects(nextProjects);
      const savedProject = nextProjects.find((item) => item.filepath === filepath) ?? nextProjects[0];
      if (!savedProject) return false;
      try {
        await applyActiveProject(savedProject);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not load the saved project copy.");
        return false;
      }
      return true;
    });
  };

  const switchProject = async (projectId: string) => {
    return runProjectAction("switching", "Switching project...", async () => {
      const project = projects.find((item) => item.id === projectId);
      if (!project) {
        showToast("Worldie could not find that project.");
        return false;
      }
      return applyActiveProject(project);
    });
  };

  const commitProjectTitle = async () => {
    if (!activeProjectId) return;
    const nextTitle = projectDraft.trim();
    if (!nextTitle || nextTitle === projectTitle) {
      setProjectDraft(projectTitle);
      setIsEditingProject(false);
      return;
    }
    let nextProjects: Project[] = [];
    try {
      nextProjects = await updateProjectTitle(activeProjectId, nextTitle);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not rename the project.");
      return;
    }
    setProjects(nextProjects);
    setProjectTitle(nextTitle);
    setIsEditingProject(false);
  };

  const startWorldEdit = (world: WorldUI) => {
    setEditingWorldId(world.id);
    setWorldDraft(world.name);
  };

  const commitWorldTitle = async () => {
    if (!editingWorldId) return;
    const nextTitle = worldDraft.trim();
    if (!nextTitle) {
      setEditingWorldId(null);
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
    setEditingWorldId(null);
  };

  const removeProject = async () => {
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
    setProjects(nextProjects);
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
  };

  const removeWorld = async (worldId: string) => {
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
      setEditingWorldId(null);
      setWorldDraft("");
    }
    setWorlds(nextWorlds);
    if (activeWorldId === worldId) {
      setActiveWorldId(nextWorlds[0]?.id ?? null);
    }
  };

  return {
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
  };
}
