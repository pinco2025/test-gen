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
      const totalQuestions = await window.electronAPI.questions.getCount();
      setStats({
        totalQuestions: totalQuestions || 0,
        sourceFilesImported: 128, // Mock data
        testsGenerated: projects.length
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
  };

  const loadRecentActivities = () => {
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
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    return then.toLocaleDateString();
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex-1">
            {/* Welcome Message */}
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, Admin!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Here's a summary of your activity.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCreateNew}
              className="bg-[#5248e5] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#4339d9] transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <span className="material-symbols-outlined">rocket_launch</span>
              Create New Test
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          {/* Total Questions Card */}
          <div className="bg-white dark:bg-[#1e1e2d] rounded-2xl p-6 border border-gray-200 dark:border-[#2d2d3b] shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Total Questions in DB
            </div>
            <div className="text-5xl font-bold text-gray-900 dark:text-white">
              {stats.totalQuestions.toLocaleString()}
            </div>
          </div>

          {/* Source Files Card */}
          <div className="bg-white dark:bg-[#1e1e2d] rounded-2xl p-6 border border-gray-200 dark:border-[#2d2d3b] shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Source Files Imported
            </div>
            <div className="text-5xl font-bold text-gray-900 dark:text-white">
              {stats.sourceFilesImported}
            </div>
          </div>

          {/* Tests Generated Card */}
          <div className="bg-white dark:bg-[#1e1e2d] rounded-2xl p-6 border border-gray-200 dark:border-[#2d2d3b] shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Tests Generated
            </div>
            <div className="text-5xl font-bold text-gray-900 dark:text-white">
              {stats.testsGenerated}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-[#1e1e2d] rounded-2xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm mb-10 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-[#2d2d3b]">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-[#2d2d3b]">
            {activities.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No recent activity. Create your first test to get started!
                </p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => onLoadProject(activity.id)}
                  className="px-6 py-5 hover:bg-gray-50 dark:hover:bg-[#252535] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-[#5248e5]/10 dark:bg-[#5248e5]/20 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-2xl text-[#5248e5]">
                        {activity.icon}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-[#5248e5] transition-colors">
                        {activity.title}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {getRelativeTime(activity.timestamp)}
                      </div>
                    </div>

                    {/* More Button */}
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-200 dark:hover:bg-[#3a3a4a] rounded-lg">
                      <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">
                        more_vert
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Projects Table */}
        {projects.length > 0 && (
          <div className="bg-white dark:bg-[#1e1e2d] rounded-2xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-[#2d2d3b]">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                All Projects
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-[#121121]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Last Modified
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#2d2d3b]">
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      onClick={() => onLoadProject(project.id)}
                      className="hover:bg-gray-50 dark:hover:bg-[#252535] cursor-pointer group transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {project.testCode}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {project.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(project.lastModified).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete "${project.testCode}"?`)) {
                              onDeleteProject(project.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"
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
    </div>
  );
};

export default Dashboard;
