type AppStatusBarProps = {
  projectTitle: string;
  worldName: string;
  sectionLabel: string;
  detailLabel: string;
  projectFileLabel: string;
  saveState: "idle" | "dirty" | "saving" | "saved" | "error";
};

export function AppStatusBar({
  projectTitle,
  worldName,
  sectionLabel,
  detailLabel,
  projectFileLabel,
  saveState,
}: AppStatusBarProps) {
  const fileLabel = projectFileLabel
    ? projectFileLabel.split("\\").join("/").split("/").pop()
    : "No file open";
  const saveLabel =
    saveState === "saving"
      ? "Saving"
      : saveState === "dirty"
        ? "Unsaved"
        : saveState === "error"
          ? "Save failed"
          : "Saved";
  const saveClass = `sb-item sb-save-state sb-save-${saveState}`;
  return (
    <div className="status-bar">
      <div className={saveClass}>
        <div className={`sb-dot sb-dot-${saveState}`}></div>
        {saveLabel}
      </div>
      <div className="sb-item">Project: {projectTitle}</div>
      <div className="sb-item">World: {worldName}</div>
      <div className="sb-item" title={projectFileLabel || undefined}>File: {fileLabel}</div>
      <div className="sb-spacer"></div>
      <div className="sb-item">{sectionLabel}</div>
      <div className="sb-item sb-accent">{detailLabel}</div>
    </div>
  );
}
