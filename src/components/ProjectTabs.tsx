import React from 'react';
import { ProjectInfo } from '../types';

interface ProjectTabsProps {
  projects: ProjectInfo[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCloseProject: (projectId: string) => void;
  onNewProject: () => void;
  onDashboard: () => void;
  showWindowControls?: boolean;
}

const ProjectTabs: React.FC<ProjectTabsProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onCloseProject,
  onNewProject,
  onDashboard,
  showWindowControls = true,
}) => {
  const isDashboardActive = !currentProjectId;

  return (
    <div
      className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        {/* Tabs Section */}
        <div
          className="flex items-end gap-px px-2 pt-1 flex-1 overflow-x-auto"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Dashboard Tab */}
          <button
            onClick={onDashboard}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border border-b-0 transition-colors flex-shrink-0 ${isDashboardActive
              ? 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark'
              : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            <span className={`material-symbols-outlined text-base ${isDashboardActive ? 'text-primary' : 'text-text-secondary'}`}>dashboard</span>
            <span className={`text-sm font-medium ${isDashboardActive ? 'text-primary' : 'text-text-secondary'}`}>All Projects</span>
          </button>

          {projects.map(project => {
            const isActive = project.id === currentProjectId;
            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`group flex items-center justify-between gap-2 px-4 py-2 rounded-t-lg border border-b-0 cursor-pointer transition-colors max-w-[200px] flex-shrink-0 ${isActive
                  ? 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark'
                  : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
              >
                <span className="truncate text-sm font-medium text-text-main dark:text-white">{project.testCode}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseProject(project.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 rounded-full p-0.5 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 transition-opacity"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            );
          })}

          <button
            onClick={() => onNewProject()}
            className="ml-1 mb-1 p-1.5 rounded-full hover:bg-primary/10 text-primary transition-colors flex-shrink-0"
            title="Create New Project"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
        </div>

        {/* Window Controls */}
        {showWindowControls && (
          <div
            className="flex items-center gap-1 px-2 py-1 flex-shrink-0"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={async () => window.electronAPI?.window.minimize()}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title="Minimize"
            >
              <span className="material-symbols-outlined text-lg">remove</span>
            </button>
            <button
              onClick={async () => window.electronAPI?.window.maximize()}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title="Maximize"
            >
              <span className="material-symbols-outlined text-lg">crop_square</span>
            </button>
            <button
              onClick={async () => window.electronAPI?.window.close()}
              className="p-1.5 rounded hover:bg-red-500 hover:text-white text-gray-500 dark:text-gray-400 transition-colors"
              title="Close"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectTabs;
