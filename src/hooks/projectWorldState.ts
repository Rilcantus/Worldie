import type { Project, World } from "../lib/data";
import type { LoreType } from "../lib/loreTypes";
import type { WorldUI } from "../types/ui";

export const WORLD_COLORS = ["#9d7de8", "#4caf7d", "#c9a84c", "#7c5cbf"];

export function buildLoreCategories(loreTypes: LoreType[]) {
  return loreTypes.map((type) => ({
    id: type.id,
    label: type.name,
    count: 0,
    isSystem: type.isSystem,
  }));
}

export function hydrateWorldUi(worlds: World[], loreTypes: LoreType[]): WorldUI[] {
  return worlds.map((world, index) => ({
    id: world.id,
    name: world.title,
    color: WORLD_COLORS[index % WORLD_COLORS.length],
    isOpen: index === 0,
    editorCount: 0,
    loreCount: 0,
    loreCategories: buildLoreCategories(loreTypes),
  }));
}

export function appendCreatedWorld(
  worlds: WorldUI[],
  created: World,
  loreTypes: LoreType[],
  shouldActivate: boolean,
) {
  if (worlds.some((world) => world.id === created.id)) {
    return {
      worlds,
      activeWorldId: shouldActivate ? created.id : null,
    };
  }

  const nextWorld: WorldUI = {
    id: created.id,
    name: created.title,
    color: WORLD_COLORS[worlds.length % WORLD_COLORS.length],
    isOpen: shouldActivate,
    editorCount: 0,
    loreCount: 0,
    loreCategories: buildLoreCategories(loreTypes),
  };

  if (!shouldActivate) {
    return {
      worlds: worlds.concat(nextWorld),
      activeWorldId: null,
    };
  }

  return {
    worlds: worlds
      .map((world) => (world.isOpen ? { ...world, isOpen: false } : world))
      .concat(nextWorld),
    activeWorldId: created.id,
  };
}

export function removeWorldWithFallback(worlds: WorldUI[], worldId: string) {
  const nextWorlds: WorldUI[] = [];
  let removed = false;

  for (const world of worlds) {
    if (world.id === worldId) {
      removed = true;
      continue;
    }
    nextWorlds.push(world);
  }

  return {
    worlds: nextWorlds,
    nextActiveWorldId: nextWorlds[0]?.id ?? null,
    removed,
  };
}

export function areProjectsEqual(left: Project[], right: Project[]) {
  return (
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
    })
  );
}

export function areWorldsEqual(left: WorldUI[], right: WorldUI[]) {
  return (
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
    })
  );
}
