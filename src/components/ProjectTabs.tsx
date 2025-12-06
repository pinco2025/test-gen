import { ProjectInfo } from '../types';
import './ProjectTabs.css';

interface ProjectTabsProps {
  projects: ProjectInfo[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCloseProject: (projectId: string) => void;
  onNewProject: () => void;
}

function ProjectTabs({
  projects,
  currentProjectId,
  onSelectProject,
  onCloseProject,
  onNewProject
}: ProjectTabsProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="project-tabs">
      <div className="tabs-container">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`tab ${currentProjectId === project.id ? 'active' : ''}`}
            onClick={() => onSelectProject(project.id)}
          >
            <div className="tab-content">
              <div className="tab-title">{project.testCode || 'Untitled'}</div>
              <div className="tab-info">
                {formatDate(project.lastModified)}
              </div>
            </div>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseProject(project.id);
              }}
              title="Close project"
            >
              ×
            </button>
          </div>
        ))}
        <button className="new-project-btn" onClick={onNewProject} title="New Project">
          + New
        </button>
      </div>
    </div>
  );
}

export default ProjectTabs;
