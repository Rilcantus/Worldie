import type { Project } from "../lib/data";

function getProjectFilename(project: Pick<Project, "filepath" | "title"> | null | undefined) {
  if (!project?.filepath) return `${project?.title ?? "Project"}.worldie`;
  const normalized = project.filepath.split("\\").join("/");
  return normalized.split("/").pop() || `${project.title}.worldie`;
}

export function getProjectByFilepath(projects: Project[], filepath: string) {
  for (const project of projects) {
    if (project.filepath === filepath) {
      return project;
    }
  }
  return null;
}

export function normalizeProjectPathText(value: string) {
  return value.split("\\").join("/").toLowerCase();
}

export function isMissingProjectFileError(project: Project, error: unknown) {
  if (!(error instanceof Error) || !project.filepath) return false;
  const message = error.message.trim();
  if (!message) return false;
  const normalizedMessage = normalizeProjectPathText(message);
  const normalizedPath = normalizeProjectPathText(project.filepath);
  const normalizedFilename = normalizeProjectPathText(getProjectFilename(project));
  return (
    normalizedMessage.includes(normalizedPath) ||
    normalizedMessage.includes(normalizedFilename) ||
    normalizedMessage.includes("project file not found")
  );
}

export function removeItemWithFallback<T extends { id: string }>(items: T[], itemId: string) {
  const next: T[] = [];
  let removed = false;

  for (const item of items) {
    if (item.id === itemId) {
      removed = true;
      continue;
    }
    next.push(item);
  }

  return {
    next,
    first: next[0] ?? null,
    removed,
  };
}
