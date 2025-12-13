import React from 'react';
import { ProjectInfo } from '../types';

interface ProjectTabsProps {
  projects: ProjectInfo[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCloseProject: (projectId: string) => void;
  onNewProject: () => void;
  onDashboard: () => void;
}

const ProjectTabs: React.FC<ProjectTabsProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onCloseProject,
  onNewProject,
  onDashboard,
}) => {
  const isDashboardActive = !currentProjectId;

  return (
    <div className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark">
      <div className="flex items-end gap-px px-2 pt-1">
        {/* Dashboard Tab */}
        <button
          onClick={onDashboard}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border border-b-0 transition-colors ${
            isDashboardActive
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
              className={`group flex items-center justify-between gap-2 px-4 py-2 rounded-t-lg border border-b-0 cursor-pointer transition-colors max-w-[200px] ${
                isActive
                  ? 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark'
                  : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg' // Use full rounded corners on hover for cleaner floating look, or stick to rounded-t-lg but ensure it looks grounded?
                  // User complained about "weird shape". Usually floating tabs look better if fully rounded when not active, or if they have a bottom border.
                  // But standard is rounded-t.
                  // Let's try matching the active shape more closely but fixing potentially sharp corners if it's floating.
                  // Actually, if we just use rounded-lg on hover it might look like a button.
                  // Let's stick to rounded-t-lg but ensure no border artifacts.
                  // The previous code had hover:bg-gray-200 on a rounded-t-lg div.
                  // If I change it to rounded-lg on hover, it creates a "floating pill" look which is often nicer for inactive tabs.
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
          onClick={onNewProject}
          className="ml-1 mb-1 p-1.5 rounded-full hover:bg-primary/10 text-primary transition-colors"
          title="Create New Project"
        >
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
      </div>
    </div>
  );
};

export default ProjectTabs;
