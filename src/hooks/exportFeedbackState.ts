export type ExportCounts = {
  worldCount?: number;
  documentCount: number;
  lorePageCount: number;
  relationshipCount: number;
  timelineEventCount: number;
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildExportCountSummary(counts: ExportCounts) {
  const parts = [];
  if (counts.worldCount !== undefined) {
    parts.push(pluralize(counts.worldCount, "world"));
  }
  parts.push(pluralize(counts.documentCount, "document"));
  parts.push(pluralize(counts.lorePageCount, "lore page"));
  parts.push(pluralize(counts.relationshipCount, "relationship"));
  parts.push(pluralize(counts.timelineEventCount, "timeline event"));
  return parts.join(", ");
}

export function buildWorldExportSuccessMessage(result: ExportCounts & { exportPath: string }) {
  return `Active world Markdown export complete: ${buildExportCountSummary(result)} written to ${result.exportPath}.`;
}

export function buildProjectExportSuccessMessage(result: ExportCounts & { exportPath: string; worldCount: number }) {
  return `Full project Markdown export complete: ${buildExportCountSummary(result)} written to ${result.exportPath}.`;
}
