import { useEffect, useMemo, useRef, useState } from "react";
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
  loreTypes: LoreType[];
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

export function useProjectWorlds({ confirmAction, showToast, loreTypes }: UseProjectWorldsArgs) {
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

  const runProjectAction = async <T,>(
    status: Exclude<ProjectActionState["status"], "idle">,
    message: string,
    action: () => Promise<T>,
  ) => {
    setProjectActionState({ status, message });
    try {
      return await action();
    } finally {
      setProjectActionState(IDLE_PROJECT_ACTION_STATE);
    }
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
          loreCategories: buildLoreCategories(loreTypes),
        },
      ];
      setWorlds(initial);
      setActiveWorldId(created.id);
      return;
    }

    const hydrated = hydrateWorldUi(storedWorlds, loreTypes);
    setWorlds(hydrated);
    setActiveWorldId(hydrated[0]?.id ?? null);
  };

  useEffect(() => {
    const load = async () => {
      setProjectActionState({ status: "loading", message: "Loading recent projects..." });
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
        setActiveProjectId(null);
        setProjectTitle("No Project Open");
        setProjectDraft("");
        setWorlds([]);
        setActiveWorldId(null);
        setProjectActionState(IDLE_PROJECT_ACTION_STATE);
        return;
      }
      setActiveProjectId(project.id);
      setProjectTitle(project.title);
      setProjectDraft(project.title);
      try {
        await hydrateWorlds(project.id);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Worldie could not load worlds for the active project.");
      }
      setProjectActionState(IDLE_PROJECT_ACTION_STATE);
    };

    void load();
  }, []);

  useEffect(() => {
    setWorlds((prev) =>
      prev.map((world) => ({
        ...world,
        loreCategories: buildLoreCategories(loreTypes).map((category) => {
          const existing = world.loreCategories.find((item) => item.id === category.id);
          return existing ? { ...category, count: existing.count } : category;
        }),
      })),
    );
  }, [loreTypes]);

  const toggleWorld = (id: string) => {
    setWorlds((prev) =>
      prev.map((world) =>
        world.id === id ? { ...world, isOpen: !world.isOpen } : world,
      ),
    );
    setActiveWorldId(id);
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
          loreCategories: buildLoreCategories(loreTypes),
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
      setActiveProjectId(project.id);
      setProjectTitle(project.title);
      setProjectDraft(project.title);
      try {
        await hydrateWorlds(project.id);
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
      setActiveProjectId(project.id);
      setProjectTitle(project.title);
      setProjectDraft(project.title);
      try {
        await hydrateWorlds(project.id);
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
      setActiveProjectId(project.id);
      setProjectTitle(project.title);
      setProjectDraft(project.title);
      try {
        await hydrateWorlds(project.id);
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
      if (!project?.filepath) {
        try {
          const switched = await switchProject(projectId);
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
      setActiveProjectId(reopened.id);
      setProjectTitle(reopened.title);
      setProjectDraft(reopened.title);
      try {
        await hydrateWorlds(reopened.id);
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
      setActiveProjectId(savedProject.id);
      setProjectTitle(savedProject.title);
      setProjectDraft(savedProject.title);
      try {
        await hydrateWorlds(savedProject.id);
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
      if (!project) return false;
      setActiveProjectId(project.id);
      setProjectTitle(project.title);
      setProjectDraft(project.title);
      await hydrateWorlds(project.id);
      return true;
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
    if (!activeProjectId) return;
    const confirmDelete = await confirmAction("Delete this project and all its data?");
    if (!confirmDelete) return;
    let nextProjects: Project[] = [];
    try {
      nextProjects = await deleteProject(activeProjectId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not delete the project.");
      return;
    }
    setProjects(nextProjects);
    const next = nextProjects[0];
    if (!next) {
      setActiveProjectId(null);
      setProjectTitle("No Projects");
      setProjectDraft("");
      setWorlds([]);
      setActiveWorldId(null);
      return;
    }
    setActiveProjectId(next.id);
    setProjectTitle(next.title);
    setProjectDraft(next.title);
    try {
      await hydrateWorlds(next.id);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Worldie could not load the next available project.");
    }
  };

  const removeWorld = async (worldId: string) => {
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
  };
}
