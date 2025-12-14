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

  const [isMounted, setIsMounted] = useState(false);

  // Sort projects by last modified (most recent first)
  const sortedProjects = [...projects].sort((a, b) =>
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );

  useEffect(() => {
    setIsMounted(true);
    loadDashboardStats();
  }, [projects]);

  const loadDashboardStats = async () => {
    if (!window.electronAPI) return;

    try {
      const totalQuestions = await window.electronAPI.questions.getCount();
      setStats({
        totalQuestions: totalQuestions || 0,
        sourceFilesImported: 128,
        testsGenerated: projects.length
      });
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    }
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

  const handleDeleteClick = (e: React.MouseEvent, projectId: string, projectTitle: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${projectTitle}"?`)) {
      onDeleteProject(projectId);
    }
  };

  const animationStyles = `
    @property --num-q { syntax: '<integer>'; initial-value: 0; inherits: false; }
    @property --num-f { syntax: '<integer>'; initial-value: 0; inherits: false; }
    @property --num-t { syntax: '<integer>'; initial-value: 0; inherits: false; }
    @keyframes count-q { from { --num-q: 0; } to { --num-q: ${stats.totalQuestions}; } }
    @keyframes count-f { from { --num-f: 0; } to { --num-f: ${stats.sourceFilesImported}; } }
    @keyframes count-t { from { --num-t: 0; } to { --num-t: ${stats.testsGenerated}; } }
    .count-up-q { animation: count-q 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards; counter-reset: num var(--num-q); }
    .count-up-q::after { content: counter(num); }
    .count-up-f { animation: count-f 2s cubic-bezier(0.25, 1, 0.5, 1) forwards; counter-reset: num var(--num-f); }
    .count-up-f::after { content: counter(num); }
    .count-up-t { animation: count-t 2.2s cubic-bezier(0.25, 1, 0.5, 1) forwards; counter-reset: num var(--num-t); }
    .count-up-t::after { content: counter(num); }
  `;

  return (
    <div className="relative flex flex-col h-full w-full font-display bg-background-light dark:bg-background-dark overflow-hidden">
      <style>{animationStyles}</style>
      {/* Animated Background */}
      <div className="fixed inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none flex justify-center items-center pt-0">
        <div className={`relative w-[800px] h-[800px] transition-opacity duration-[1500ms] ${isMounted ? 'opacity-100 animate-hero-entry' : 'opacity-0'}`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse-glow"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
          <div className="absolute inset-0 border border-primary/10 rounded-full animate-orbit-slow">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-[0_0_20px_theme(colors.primary)]"></div>
            <div className="absolute bottom-[20%] right-[20%] w-2 h-2 bg-primary/60 rounded-full"></div>
          </div>
          <div className="absolute inset-[20%] border border-primary/20 rounded-full animate-orbit-reverse">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-5 h-5 bg-primary/80 rounded-full blur-[1px] shadow-[0_0_30px_theme(colors.primary)]"></div>
          </div>
          <div className="absolute inset-[40%] border border-primary/10 rounded-full animate-orbit-medium">
            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary/80 rounded-full shadow-[0_0_15px_theme(colors.primary)]"></div>
          </div>
          <div className="absolute inset-0">
            <div className="absolute top-[25%] left-[25%] w-1.5 h-1.5 bg-primary/50 rounded-full animate-float-particle" style={{ animationDelay: '0s' }}></div>
            <div className="absolute top-[35%] right-[25%] w-2 h-2 bg-primary/40 rounded-full animate-float-particle" style={{ animationDelay: '-1.5s' }}></div>
            <div className="absolute bottom-[30%] left-[40%] w-1 h-1 bg-primary/60 rounded-full animate-float-particle" style={{ animationDelay: '-3s' }}></div>
            <div className="absolute top-[20%] right-[40%] w-2.5 h-2.5 bg-primary/30 rounded-full animate-float-particle" style={{ animationDelay: '-0.5s' }}></div>
            <div className="absolute bottom-[40%] right-[20%] w-1.5 h-1.5 bg-primary/50 rounded-full animate-float-particle" style={{ animationDelay: '-2.5s' }}></div>
            <div className="absolute top-[45%] left-[15%] w-2 h-2 bg-primary/30 rounded-full animate-float-particle" style={{ animationDelay: '-4s' }}></div>
          </div>
        </div>
      </div>

      {/* Scrollable Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 md:px-10 lg:px-20 xl:px-40 flex justify-center py-5">
          <div className="flex flex-col max-w-[960px] flex-1 z-10">

            <header className="flex items-center justify-between whitespace-nowrap px-4 py-3 mb-6" />

            <div className="flex flex-col md:flex-row flex-wrap justify-between items-start gap-4 p-4 mb-4">
              <div className="flex min-w-72 flex-col gap-2">
                <p className="text-text-main dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] animate-text-glow">Welcome back, Admin!</p>
                <p className="text-text-secondary dark:text-gray-400 text-base font-normal leading-normal">Here's a summary of your activity.</p>
              </div>
              <div className="flex flex-1 md:flex-initial gap-3 flex-wrap justify-start md:justify-end mt-2 md:mt-0">
                <button
                  onClick={onCreateNew}
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]">
                  <span className="material-symbols-outlined">edit_document</span>
                  <span className="truncate">Create New Test</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 mb-6">
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-border-light dark:border-gray-700 bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm hover:border-primary/40 hover:shadow-lg transition-all duration-300 group">
                <p className="text-text-main dark:text-gray-300 text-base font-medium leading-normal group-hover:text-primary transition-colors">Total Questions in DB</p>
                <p className="text-text-main dark:text-white tracking-light text-4xl font-bold leading-tight tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 dark:from-white dark:to-gray-200">
                  <span className="count-up-q"></span>
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-border-light dark:border-gray-700 bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm hover:border-primary/40 hover:shadow-lg transition-all duration-300 group">
                <p className="text-text-main dark:text-gray-300 text-base font-medium leading-normal group-hover:text-primary transition-colors">Source Files Imported</p>
                <p className="text-text-main dark:text-white tracking-light text-4xl font-bold leading-tight tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 dark:from-white dark:to-gray-200">
                  <span className="count-up-f"></span>
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 border border-border-light dark:border-gray-700 bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm hover:border-primary/40 hover:shadow-lg transition-all duration-300 group">
                <p className="text-text-main dark:text-gray-300 text-base font-medium leading-normal group-hover:text-primary transition-colors">Tests Generated</p>
                <p className="text-text-main dark:text-white tracking-light text-4xl font-bold leading-tight tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 dark:from-white dark:to-gray-200">
                  <span className="count-up-t"></span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 pb-3 pt-5">
              <h2 className="text-text-main dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Available Projects</h2>
              <span className="text-text-secondary dark:text-gray-400 text-sm">{sortedProjects.length} project{sortedProjects.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-col p-4 pb-8">
              {sortedProjects.length === 0 ? (
                <div className="bg-white/80 dark:bg-background-dark/80 border border-border-light dark:border-gray-700 rounded-xl p-8 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 text-primary mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">folder_open</span>
                  </div>
                  <p className="text-text-main dark:text-white font-medium mb-2">No projects yet</p>
                  <p className="text-text-secondary dark:text-gray-400 text-sm mb-4">Create your first test to get started</p>
                  <button
                    onClick={onCreateNew}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    Create New Test
                  </button>
                </div>
              ) : (
                <div className="bg-white/80 dark:bg-background-dark/80 border border-border-light dark:border-gray-700 rounded-xl overflow-hidden backdrop-blur-sm">
                  <ul className="divide-y divide-border-light dark:divide-gray-700">
                    {sortedProjects.map(project => (
                      <li key={project.id} onClick={() => onLoadProject(project.id)} className="flex items-center justify-between p-4 hover:bg-background-light/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary">
                            <span className="material-symbols-outlined">edit_document</span>
                          </div>
                          <div>
                            <p className="font-medium text-text-main dark:text-white">{project.testCode}</p>
                            <p className="text-sm text-text-secondary dark:text-gray-400">
                              {project.description || 'No description'} • {getRelativeTime(project.lastModified)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <span className="material-symbols-outlined text-sm">trending_up</span>
                            {project.progress}%
                          </div>
                          <button
                            onClick={(e) => handleDeleteClick(e, project.id, project.testCode)}
                            className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
