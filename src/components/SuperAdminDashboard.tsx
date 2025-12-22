import React from 'react';

interface SuperAdminDashboardProps {
  onClose: () => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-[#121121] text-gray-900 dark:text-white overflow-hidden animate-fade-in">
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1e1e2d] border-b border-gray-200 dark:border-[#2d2d3b]">
        <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">admin_panel_settings</span>
            Super Admin Dashboard
        </h1>
        <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252535] transition-colors"
        >
            <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            <div className="bg-white dark:bg-[#1e1e2d] p-6 rounded-xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">bug_report</span>
                    Debug Tools
                </h2>
                <div className="space-y-2">
                    <button onClick={() => console.log('Dumping Local Storage:', localStorage)} className="w-full text-left px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-[#252535] text-sm">
                        Dump LocalStorage to Console
                    </button>
                    <button onClick={() => window.location.reload()} className="w-full text-left px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-[#252535] text-sm text-red-500">
                        Force Reload Window
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e1e2d] p-6 rounded-xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500">component_exchange</span>
                    Component Tester
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                    Isolate and test specific UI components.
                </p>
                <button className="w-full bg-primary/10 text-primary py-2 rounded-lg font-medium hover:bg-primary/20 transition-colors">
                    Open Component Gallery
                </button>
            </div>

            <div className="bg-white dark:bg-[#1e1e2d] p-6 rounded-xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm">
                <h2 className="font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500">database</span>
                    Data Management
                </h2>
                <div className="space-y-2">
                    <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-[#252535] text-sm">
                        Inspect Active Project State
                    </button>
                    <button className="w-full text-left px-4 py-2 rounded hover:bg-gray-50 dark:hover:bg-[#252535] text-sm">
                        Validate Database Schema
                    </button>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
