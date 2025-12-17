import React from 'react';

interface LandingPageProps {
  onSelectMode: (mode: 'test-generation' | 'database-cleaning') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectMode }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50 dark:bg-[#121121] text-gray-900 dark:text-white">
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
    </div>
  );
};

export default LandingPage;
