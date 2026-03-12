export type LoreCategory = {
  id: string;
  label: string;
  count: number;
  isSystem?: boolean;
};

export type WorldUI = {
  id: string;
  name: string;
  color: string;
  isOpen: boolean;
  editorCount: number;
  loreCount: number;
  loreCategories: LoreCategory[];
};

export type RecentItem = {
  id: string;
  label: string;
  color: string;
};

export type TabKind = "workbench" | "editor" | "lore" | "rels" | "timeline" | "templates" | "ltypes" | "lcreate" | "new";

export type TabItem = {
  id: string;
  kind: TabKind;
  label: string;
  icon: string;
  refId?: string | null;
  worldId?: string | null;
};
