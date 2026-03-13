export type ResizeTarget = "sidebar" | "doclist" | "right";

export function getPanelBounds(viewportWidth: number) {
  if (viewportWidth >= 1720) {
    return {
      sidebar: { min: 220, max: 320, initial: 248 },
      doclist: { min: 240, max: 340, initial: 272 },
      right: { min: 220, max: 320, initial: 252 },
      collapseRightByDefault: false,
    };
  }

  if (viewportWidth >= 1440) {
    return {
      sidebar: { min: 210, max: 280, initial: 232 },
      doclist: { min: 228, max: 300, initial: 252 },
      right: { min: 210, max: 280, initial: 228 },
      collapseRightByDefault: false,
    };
  }

  return {
    sidebar: { min: 200, max: 240, initial: 216 },
    doclist: { min: 220, max: 260, initial: 236 },
    right: { min: 200, max: 236, initial: 216 },
    collapseRightByDefault: true,
  };
}

export function clampPanelWidth(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function resolveResizedPanelWidth(
  target: ResizeTarget,
  startWidth: number,
  startX: number,
  clientX: number,
  viewportWidth: number,
) {
  const delta = clientX - startX;
  const bounds = getPanelBounds(viewportWidth);

  if (target === "sidebar") {
    return clampPanelWidth(startWidth + delta, bounds.sidebar.min, bounds.sidebar.max);
  }
  if (target === "doclist") {
    return clampPanelWidth(startWidth + delta, bounds.doclist.min, bounds.doclist.max);
  }
  return clampPanelWidth(startWidth - delta, bounds.right.min, bounds.right.max);
}

export function clampPanelWidths(
  widths: { sidebarWidth: number; docListWidth: number; rightPanelWidth: number },
  viewportWidth: number,
) {
  const bounds = getPanelBounds(viewportWidth);
  return {
    sidebarWidth: clampPanelWidth(widths.sidebarWidth, bounds.sidebar.min, bounds.sidebar.max),
    docListWidth: clampPanelWidth(widths.docListWidth, bounds.doclist.min, bounds.doclist.max),
    rightPanelWidth: clampPanelWidth(widths.rightPanelWidth, bounds.right.min, bounds.right.max),
  };
}
