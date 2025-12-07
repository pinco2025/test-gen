import { ProjectInfo } from '../types';
import './ProjectTabs.css';

interface ProjectTabsProps {
  projects: ProjectInfo[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCloseProject: (projectId: string) => void;
  onNewProject: () => void;
  onDashboard: () => void;
}

function ProjectTabs({
  projects,
  currentProjectId,
  onSelectProject,
  onCloseProject,
  onNewProject,
  onDashboard
}: ProjectTabsProps) {
  const hasOpenTabs = projects.length > 0;
  const isOnDashboard = currentProjectId === null;

  return (
    <div className="project-tabs">
      <div className="tabs-container">
        {/* Dashboard/Home Tab */}
        <div
          className={`tab dashboard-tab ${isOnDashboard ? 'active' : ''}`}
          onClick={onDashboard}
          title="View all projects"
        >
          <div className="tab-content">
            <div className="tab-title">All Projects</div>
          </div>
        </div>

        {/* Separator */}
        {hasOpenTabs && <div className="tab-separator" />}

        {/* Open Project Tabs */}
        {projects.map((project) => (
          <div
            key={project.id}
            className={`tab ${currentProjectId === project.id ? 'active' : ''}`}
            onClick={() => onSelectProject(project.id)}
          >
            <div className="tab-content">
              <div className="tab-title">{project.testCode || 'Untitled'}</div>
            </div>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseProject(project.id);
              }}
              title="Close tab"
            >
              ×
            </button>
          </div>
        ))}

        {/* New Project Button */}
        <button className="new-tab-btn" onClick={onNewProject} title="Create new project">
          +
        </button>
      </div>
    </div>
  );
}

export default ProjectTabs;
