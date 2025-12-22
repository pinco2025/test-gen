import React, { useState } from 'react';
import SuperAdminDashboard from './SuperAdminDashboard';

interface LandingPageProps {
  onSelectMode: (mode: 'test-generation' | 'database-cleaning') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectMode }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const [password, setPassword] = useState('');

  const handleSuperAdminLogin = () => {
      // Simple hardcoded password for demonstration as requested "asks for a password"
      if (password === 'admin123') { // Replace with robust auth if needed
          setShowSuperAdmin(true);
          setShowPasswordModal(false);
          setPassword('');
      } else {
          alert('Incorrect password');
      }
  };

  if (showSuperAdmin) {
      return <SuperAdminDashboard onClose={() => setShowSuperAdmin(false)} />;
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50 dark:bg-[#121121] text-gray-900 dark:text-white">
      {/* Hidden Super Admin Trigger */}
      <button
        onClick={() => setShowPasswordModal(true)}
        className="absolute top-4 right-4 p-2 text-gray-300 dark:text-gray-700 hover:text-primary dark:hover:text-primary transition-colors opacity-50 hover:opacity-100"
        title="Admin Access"
      >
        <span className="material-symbols-outlined">shield</span>
      </button>

      <h1 className="text-5xl font-bold mb-12">Welcome</h1>

      <div className="flex flex-col md:flex-row gap-8 max-w-4xl w-full">
        {/* Test Generation Card */}
        <button
          onClick={() => onSelectMode('test-generation')}
          className="flex-1 bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex flex-col items-center group"
        >
          <div className="bg-primary/10 dark:bg-primary/20 rounded-full p-6 mb-6 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
            <span className="material-symbols-outlined text-6xl text-primary">description</span>
          </div>
          <h2 className="text-2xl font-bold mb-3">Test Generation System</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create, configure, and export practice tests with advanced question selection and constraints.
          </p>
        </button>

        {/* Database Cleaning Card */}
        <button
          onClick={() => onSelectMode('database-cleaning')}
          className="flex-1 bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex flex-col items-center group"
        >
          <div className="bg-orange-100 dark:bg-orange-900/30 rounded-full p-6 mb-6 group-hover:bg-orange-200 dark:group-hover:bg-orange-900/40 transition-colors">
            <span className="material-symbols-outlined text-6xl text-orange-600 dark:text-orange-400">database</span>
          </div>
          <h2 className="text-2xl font-bold mb-3">Database Tagging & Cleaning</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Browse, search, edit, and organize the entire question database without test generation constraints.
          </p>
        </button>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#1e1e2d] p-6 rounded-xl shadow-xl w-80 border border-gray-200 dark:border-[#2d2d3b]">
                <h3 className="text-lg font-bold mb-4">Admin Access</h3>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-gray-50 dark:bg-[#121121] focus:ring-2 focus:ring-primary outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSuperAdminLogin()}
                />
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setShowPasswordModal(false)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252535] rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSuperAdminLogin}
                        className="px-3 py-1.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg"
                    >
                        Login
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
