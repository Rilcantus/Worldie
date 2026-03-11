import { getProjectFilename, getProjectPathDisplay, type Project } from "../lib/data";

type StartScreenProps = {
  recentProjects: Project[];
  onNewProject: () => void;
  onOpenProject: () => void;
  onOpenRecentProject: (projectId: string) => void;
};

export function StartScreen({
  recentProjects,
  onNewProject,
  onOpenProject,
  onOpenRecentProject,
}: StartScreenProps) {
  return (
    <div className="start-screen">
      <div className="start-screen-card">
        <div className="start-kicker">Worldie</div>
        <h1 className="start-title">Open your world and keep writing.</h1>
        <p className="start-copy">
          A Worldie project is a single file. Open one, create a new one, or jump back into a recent world.
        </p>
        <div className="start-actions">
          <button className="tb-btn tb-save start-action-primary" type="button" onClick={onOpenProject}>
            Open Project
          </button>
          <button className="tb-btn start-action-secondary" type="button" onClick={onNewProject}>
            New Project
          </button>
        </div>

        <div className="start-recent">
          <div className="linked-lore-label">Recent Projects</div>
          {recentProjects.length === 0 ? (
            <div className="rp-empty">No recent project files yet.</div>
          ) : (
            <div className="start-recent-list">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  className="start-recent-item"
                  type="button"
                  onClick={() => onOpenRecentProject(project.id)}
                  title={project.filepath ?? undefined}
                >
                  <span className="start-recent-title">{project.title}</span>
                  <span className="start-recent-path">
                    {getProjectFilename(project)}{getProjectPathDisplay(project) ? ` · ${getProjectPathDisplay(project)}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
