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
