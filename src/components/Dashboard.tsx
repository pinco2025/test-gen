import { useEffect, useState } from 'react';
import { ProjectInfo } from '../types';

interface DashboardProps {
  projects: ProjectInfo[];
  onLoadProject: (projectId: string) => void;
  onCreateNew: () => void;
  onDeleteProject: (projectId: string) => void;
}

interface DashboardStats {
  totalQuestions: number;
  sourceFilesImported: number;
  testsGenerated: number;
}

interface ActivityItem {
  id: string;
  type: 'generated' | 'imported';
  title: string;
  timestamp: string;
  icon: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  onLoadProject,
  onCreateNew,
  onDeleteProject
}) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalQuestions: 0,
    sourceFilesImported: 0,
    testsGenerated: projects.length
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    loadDashboardStats();
    loadRecentActivities();
  }, [projects]);

  const loadDashboardStats = async () => {
    if (!window.electronAPI) return;

    try {
      // Get total questions from database
      const totalQuestions = await window.electronAPI.questions.getCount();

      setStats({
        totalQuestions: totalQuestions || 0,
        sourceFilesImported: 0, // This would come from import tracking
        testsGenerated: projects.length
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  };

  const loadRecentActivities = () => {
    // Generate recent activities from projects
    const recentActivities: ActivityItem[] = projects
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, 5)
      .map(project => ({
        id: project.id,
        type: 'generated' as const,
        title: `Generated '${project.testCode}'`,
        timestamp: project.lastModified,
        icon: 'description'
      }));

    setActivities(recentActivities);
  };

  const getRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    return then.toLocaleDateString();
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-primary text-3xl">star</span>
            <h1 className="text-3xl font-bold text-text-main dark:text-white">
              Test Generator Pro
            </h1>
          </div>
          <div className="mt-4">
            <h2 className="text-4xl font-bold text-text-main dark:text-white mb-1">
              Welcome back, Admin!
            </h2>
            <p className="text-text-secondary">Here's a summary of your activity.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCreateNew}
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined">rocket_launch</span>
            Create New Test
          </button>
          <button
            className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-main dark:text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 hover:bg-background-light dark:hover:bg-background-dark transition-colors"
          >
            <span className="material-symbols-outlined">upload</span>
            Import Questions
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-sm">
          <div className="text-sm font-medium text-text-secondary mb-2">
            Total Questions in DB
          </div>
          <div className="text-4xl font-bold text-text-main dark:text-white">
            {stats.totalQuestions.toLocaleString()}
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-sm">
          <div className="text-sm font-medium text-text-secondary mb-2">
            Source Files Imported
          </div>
          <div className="text-4xl font-bold text-text-main dark:text-white">
            {stats.sourceFilesImported}
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-6 border border-border-light dark:border-border-dark shadow-sm">
          <div className="text-sm font-medium text-text-secondary mb-2">
            Tests Generated
          </div>
          <div className="text-4xl font-bold text-text-main dark:text-white">
            {stats.testsGenerated}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
          <h3 className="text-lg font-semibold text-text-main dark:text-white">
            Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-border-light dark:divide-border-dark">
          {activities.length === 0 ? (
            <div className="px-6 py-8 text-center text-text-secondary">
              No recent activity. Create your first test to get started!
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="px-6 py-4 hover:bg-background-light dark:hover:bg-background-dark transition-colors cursor-pointer group"
                onClick={() => onLoadProject(activity.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    activity.type === 'generated'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    <span className="material-symbols-outlined text-2xl">
                      {activity.icon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-main dark:text-white group-hover:text-primary transition-colors">
                      {activity.title}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {getRelativeTime(activity.timestamp)}
                    </div>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-text-secondary hover:text-text-main dark:hover:text-white">
                      more_vert
                    </span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Projects List */}
      {projects.length > 0 && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
            <h3 className="text-lg font-semibold text-text-main dark:text-white">
              All Projects
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-light dark:divide-border-dark">
              <thead className="bg-background-light dark:bg-background-dark">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Last Modified
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface-light dark:bg-surface-dark divide-y divide-border-light dark:divide-border-dark">
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => onLoadProject(project.id)}
                    className="hover:bg-background-light dark:hover:bg-background-dark cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-main dark:text-white">
                      {project.testCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {project.description || 'No description'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {new Date(project.lastModified).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className="text-red-600 hover:text-red-900 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${project.testCode}"?`)) {
                            onDeleteProject(project.id);
                          }
                        }}
                        title="Delete project"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
