import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Chapter } from '../types';

export interface FilterState {
  chapter: string;
  difficulty: string;
  division: string;
  type: string;
  year: string;
  tag1: string;
  tag4: string;
  sort: string;
  selectedOnly: boolean;
  verificationLevel1: string;
  verificationLevel2: string;
}

interface FilterMenuProps {
  chapters: Chapter[];
  availableTypes: string[];
  availableYears: string[];
  currentFilters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  hiddenFilters?: string[]; // Array of filter keys to hide
  defaultFilters?: Partial<FilterState>; // Default values for reset
}

const FilterMenu: React.FC<FilterMenuProps> = ({
  chapters,
  availableTypes,
  availableYears,
  currentFilters,
  onFilterChange,
  hiddenFilters = [],
  defaultFilters = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to check if a filter is active (not default 'all') AND not hidden
  const isFilterActive = (key: keyof FilterState, defaultValue: any) => {
      if (hiddenFilters.includes(key)) return false;
      return currentFilters[key] !== defaultValue;
  };

  const activeFilterCount =
    (isFilterActive('chapter', 'all') ? 1 : 0) +
    (isFilterActive('difficulty', 'all') ? 1 : 0) +
    (isFilterActive('division', 'all') ? 1 : 0) +
    (isFilterActive('type', 'all') ? 1 : 0) +
    (isFilterActive('year', 'all') ? 1 : 0) +
    (isFilterActive('tag1', '') ? 1 : 0) +
    (isFilterActive('tag4', '') ? 1 : 0) +
    (isFilterActive('selectedOnly', false) ? 1 : 0) +
    (isFilterActive('verificationLevel1', 'all') ? 1 : 0) +
    (isFilterActive('verificationLevel2', 'all') ? 1 : 0);

  const resetFilters = () => {
    onFilterChange({
      chapter: 'all',
      difficulty: 'all',
      division: 'all',
      type: 'all',
      year: 'all',
      tag1: '',
      tag4: '',
      sort: 'default',
      selectedOnly: false,
      verificationLevel1: 'all',
      verificationLevel2: 'all',
      ...defaultFilters
    });
  };

  const menuContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="flex flex-col w-full max-w-md max-h-[85vh] overflow-hidden bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-xl shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#2d2d3b] bg-gray-50 dark:bg-[#252535]">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filters & Sorting</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-full text-gray-500 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6 text-gray-900 dark:text-gray-100">

            {/* Sort Section */}
            {!hiddenFilters.includes('sort') && (
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Sort By
                </label>
                <select
                  value={currentFilters.sort}
                  onChange={(e) => onFilterChange({ sort: e.target.value })}
                  className="w-full p-2 text-sm border rounded-md bg-white dark:bg-[#252535] border-gray-200 dark:border-[#2d2d3b] focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 dark:text-white"
                >
                  <option value="default">Default</option>
                  <option value="year_desc">Year (Newest First)</option>
                  <option value="year_asc">Year (Oldest First)</option>
                  <option value="freq_asc">Frequency (Low to High)</option>
                  <option value="freq_desc">Frequency (High to Low)</option>
                </select>
            </div>
            )}

            {/* Difficulty Filter */}
            {!hiddenFilters.includes('difficulty') && (
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Difficulty
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['all', 'E', 'M', 'H'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => onFilterChange({ difficulty: opt })}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        currentFilters.difficulty === opt
                          ? 'bg-primary/10 border-primary text-primary font-semibold'
                          : 'bg-transparent border-gray-200 dark:border-[#2d2d3b] hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {opt === 'all' ? 'All' : opt === 'E' ? 'Easy' : opt === 'M' ? 'Medium' : 'Hard'}
                    </button>
                  ))}
                </div>
            </div>
            )}

            {/* Division Filter */}
            {!hiddenFilters.includes('division') && (
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Division
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                      { val: 'all', label: 'All' },
                      { val: '1', label: 'Div 1 (MCQ)' },
                      { val: '2', label: 'Div 2 (Num)' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => onFilterChange({ division: opt.val })}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        currentFilters.division === opt.val
                          ? 'bg-primary/10 border-primary text-primary font-semibold'
                          : 'bg-transparent border-gray-200 dark:border-[#2d2d3b] hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
            </div>
            )}

            {/* Verification Level 1 Filter */}
            {!hiddenFilters.includes('verificationLevel1') && (
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Verification Level 1
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['all', 'pending', 'approved', 'rejected'].map(status => (
                    <button
                      key={status}
                      onClick={() => onFilterChange({ verificationLevel1: status })}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        (currentFilters.verificationLevel1 || 'all') === status
                          ? 'bg-primary/10 border-primary text-primary font-semibold'
                          : 'bg-transparent border-gray-200 dark:border-[#2d2d3b] hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
            </div>
            )}

            {/* Verification Level 2 Filter */}
            {!hiddenFilters.includes('verificationLevel2') && (
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Verification Level 2
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['all', 'pending', 'approved', 'rejected'].map(status => (
                    <button
                      key={status}
                      onClick={() => onFilterChange({ verificationLevel2: status })}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                        (currentFilters.verificationLevel2 || 'all') === status
                          ? 'bg-primary/10 border-primary text-primary font-semibold'
                          : 'bg-transparent border-gray-200 dark:border-[#2d2d3b] hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
            </div>
            )}

            {/* Show Selected Only Filter */}
            {!hiddenFilters.includes('selectedOnly') && (
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Selection Filter
                </label>
                <button
                  onClick={() => onFilterChange({ selectedOnly: !currentFilters.selectedOnly })}
                  className={`w-full px-4 py-2.5 text-sm rounded-md border transition-colors flex items-center justify-between ${
                    currentFilters.selectedOnly
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'bg-transparent border-gray-200 dark:border-[#2d2d3b] hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      {currentFilters.selectedOnly ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    Show Only Selected Questions
                  </span>
                </button>
            </div>
            )}

            {/* Type Filter */}
            {!hiddenFilters.includes('type') && (
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Type
                </label>
                <select
                  value={currentFilters.type}
                  onChange={(e) => onFilterChange({ type: e.target.value })}
                  className="w-full p-2 text-sm border rounded-md bg-white dark:bg-[#252535] border-gray-200 dark:border-[#2d2d3b] focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 dark:text-white"
                >
                  <option value="all">All Types</option>
                  {availableTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                  ))}
                </select>
            </div>
            )}

            {/* Year Filter */}
            {!hiddenFilters.includes('year') && (
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Year
                </label>
                <select
                  value={currentFilters.year}
                  onChange={(e) => onFilterChange({ year: e.target.value })}
                  className="w-full p-2 text-sm border rounded-md bg-white dark:bg-[#252535] border-gray-200 dark:border-[#2d2d3b] focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 dark:text-white"
                >
                  <option value="all">All Years</option>
                  {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                  ))}
                </select>
            </div>
            )}

            {/* Chapter Filter */}
            {!hiddenFilters.includes('chapter') && (
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Chapter
                </label>
                <select
                  value={currentFilters.chapter}
                  onChange={(e) => onFilterChange({ chapter: e.target.value })}
                  className="w-full p-2 text-sm border rounded-md bg-white dark:bg-[#252535] border-gray-200 dark:border-[#2d2d3b] focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 dark:text-white"
                >
                  <option value="all">All Chapters</option>
                  {chapters.map(ch => (
                      <option key={ch.code} value={ch.code}>
                      {ch.code} - {ch.name}
                      </option>
                  ))}
                </select>
            </div>
            )}

            {/* Tags Filter */}
            {!hiddenFilters.includes('tag1') && !hiddenFilters.includes('tag4') && (
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  Additional Tags
                </label>
                <div className="space-y-3">
                    {!hiddenFilters.includes('tag1') && (
                    <input
                        type="text"
                        placeholder="Tag 1 (e.g. Topic)"
                        value={currentFilters.tag1}
                        onChange={(e) => onFilterChange({ tag1: e.target.value })}
                        className="w-full p-2 text-sm border rounded-md bg-white dark:bg-[#252535] border-gray-200 dark:border-[#2d2d3b] focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 dark:text-white"
                    />
                    )}
                    {!hiddenFilters.includes('tag4') && (
                    <input
                        type="text"
                        placeholder="Tag 4 (e.g. Sub-topic)"
                        value={currentFilters.tag4}
                        onChange={(e) => onFilterChange({ tag4: e.target.value })}
                        className="w-full p-2 text-sm border rounded-md bg-white dark:bg-[#252535] border-gray-200 dark:border-[#2d2d3b] focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 dark:text-white"
                    />
                    )}
                </div>
            </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-[#2d2d3b] bg-gray-50 dark:bg-[#252535]">
             {activeFilterCount > 0 && (
                <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-sm font-semibold transition-colors border rounded-md text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#2d2d3b] hover:bg-black/5 dark:hover:bg-white/5"
                >
                    Clear All
                </button>
            )}
            <button
                className="px-6 py-2 text-sm font-bold text-white transition-all bg-primary rounded-md shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary/90"
                onClick={() => setIsOpen(false)}
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 border rounded-full transition-all whitespace-nowrap ${
          activeFilterCount > 0
            ? 'bg-primary/10 border-primary text-primary font-semibold'
            : 'bg-white dark:bg-[#252535] border-gray-200 dark:border-[#2d2d3b] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a3c]'
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">filter_list</span>
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 ml-1 text-xs text-white rounded-full bg-primary">
            {activeFilterCount}
          </span>
        )}
      </button>
      {isOpen && createPortal(menuContent, document.body)}
    </>
  );
};

export default FilterMenu;
