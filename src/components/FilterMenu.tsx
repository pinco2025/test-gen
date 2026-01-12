import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Chapter } from '../types';
import { FilterState, DEFAULT_FILTERS } from '../hooks/useQuestionFilters';

interface FilterMenuProps {
  chapters: Chapter[];
  availableTypes: string[];
  availableYears: string[];
  currentFilters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onReset: () => void;
  hiddenFilters?: string[]; // Array of filter keys to hide
  resultCount?: number;
}

const FilterMenu: React.FC<FilterMenuProps> = ({
  chapters,
  availableTypes,
  availableYears,
  currentFilters,
  onFilterChange,
  onReset,
  hiddenFilters = [],
  resultCount
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate active filter count (excluding defaults)
  const activeCount = Object.keys(currentFilters).reduce((count, key) => {
    const k = key as keyof FilterState;
    if (hiddenFilters.includes(key)) return count;
    // content filters
    if (k === 'hasImage' || k === 'hasSolution') {
      return currentFilters[k] !== 'ignore' ? count + 1 : count;
    }
    // boolean
    if (k === 'isSelected') return currentFilters[k] ? count + 1 : count;
    // strings
    if (typeof currentFilters[k] === 'string') {
      // @ts-ignore - simplistic check against default
      if (DEFAULT_FILTERS[k] !== undefined && currentFilters[k] !== DEFAULT_FILTERS[k]) return count + 1;
    }
    return count;
  }, 0);

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const SectionHeader = ({ title, icon }: { title: string, icon: string }) => (
    <div className="flex items-center gap-2 mb-3 mt-6 pb-2 border-b border-gray-100 dark:border-[#2d2d3b]">
      <span className="material-symbols-outlined text-primary text-sm">{icon}</span>
      <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider text-nowrap">{title}</h4>
      <div className="h-px bg-gray-100 dark:bg-[#2d2d3b] w-full ml-2"></div>
    </div>
  );

  const FilterChip = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${active
          ? 'bg-primary text-white border-primary shadow-sm'
          : 'bg-white dark:bg-[#252535] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#2d2d3b] hover:border-gray-300 dark:hover:border-gray-500'
        }`}
    >
      {label}
    </button>
  );

  const menuContent = (
    <div className="fixed inset-0 z-[100] flex justify-end isolat">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Side Panel */}
      <div
        className={`relative w-full max-w-md h-full bg-white dark:bg-[#1e1e2d] shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100 dark:border-[#2d2d3b] flex justify-between items-center bg-white/50 dark:bg-[#1e1e2d]/50 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              Filters
              {activeCount > 0 && (
                <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full font-bold">{activeCount}</span>
              )}
            </h2>
            {resultCount !== undefined && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Showing {resultCount} questions</p>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#2d2d3b] text-gray-500 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">

          {/* Quick Filters - Top Section */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="Has Image"
                active={currentFilters.hasImage === true}
                onClick={() => onFilterChange({ hasImage: currentFilters.hasImage === true ? 'ignore' : true })}
              />
              <FilterChip
                label="Has Solution"
                active={currentFilters.hasSolution === true}
                onClick={() => onFilterChange({ hasSolution: currentFilters.hasSolution === true ? 'ignore' : true })}
              />
              <FilterChip
                label="Selected Only"
                active={currentFilters.isSelected}
                onClick={() => onFilterChange({ isSelected: !currentFilters.isSelected })}
              />
              <FilterChip
                label="No Solution"
                active={currentFilters.hasSolution === false}
                onClick={() => onFilterChange({ hasSolution: currentFilters.hasSolution === false ? 'ignore' : false })}
              />
            </div>
          </div>

          {!hiddenFilters.includes('sort') && (
            <div className="mb-6">
              <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Sort By</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'default', label: 'Default' },
                  { val: 'year_desc', label: 'Newest First' },
                  { val: 'year_asc', label: 'Oldest First' },
                  { val: 'freq_desc', label: 'Most Frequent' },
                  { val: 'freq_asc', label: 'Least Frequent' },
                  { val: 'created_desc', label: 'Recently Added' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => onFilterChange({ sort: opt.val })}
                    className={`px-3 py-2 text-sm rounded-lg flex items-center gap-2 border transition-all ${currentFilters.sort === opt.val
                        ? 'bg-primary/5 border-primary text-primary font-bold shadow-sm ring-1 ring-primary/20'
                        : 'bg-white dark:bg-[#252535] border-gray-200 dark:border-[#2d2d3b] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a3c]'
                      }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {opt.val.includes('year') ? 'calendar_month' : opt.val.includes('freq') ? 'bar_chart' : opt.val.includes('created') ? 'history' : 'sort'}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <SectionHeader title="Classification" icon="category" />

          <div className="space-y-4">
            {/* Type & Year Group */}
            <div className="grid grid-cols-2 gap-4">
              {!hiddenFilters.includes('type') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Type</label>
                  <select
                    value={currentFilters.type}
                    onChange={(e) => onFilterChange({ type: e.target.value })}
                    className="w-full p-2.5 text-sm bg-gray-50 dark:bg-[#252535] border border-gray-200 dark:border-[#2d2d3b] rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                  >
                    <option value="all">Any Type</option>
                    {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              {!hiddenFilters.includes('year') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Year</label>
                  <select
                    value={currentFilters.year}
                    onChange={(e) => onFilterChange({ year: e.target.value })}
                    className="w-full p-2.5 text-sm bg-gray-50 dark:bg-[#252535] border border-gray-200 dark:border-[#2d2d3b] rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white"
                  >
                    <option value="all">Any Year</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Chapter */}
            {!hiddenFilters.includes('chapter') && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Chapter</label>
                <select
                  value={currentFilters.chapter}
                  onChange={(e) => onFilterChange({ chapter: e.target.value })}
                  className="w-full p-2.5 text-sm bg-gray-50 dark:bg-[#252535] border border-gray-200 dark:border-[#2d2d3b] rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all dark:text-white font-medium"
                >
                  <option value="all">All Chapters</option>
                  {chapters.map(ch => (
                    <option key={ch.code} value={ch.code}>{ch.code} - {ch.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>


          <SectionHeader title="Complexity" icon="psychology" />

          <div className="space-y-4">
            {/* Difficulty */}
            {!hiddenFilters.includes('difficulty') && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Difficulty Level</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-[#2d2d3b]">
                  {['all', 'E', 'M', 'H'].map((d, idx) => (
                    <button
                      key={d}
                      onClick={() => onFilterChange({ difficulty: d })}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${currentFilters.difficulty === d
                          ? 'bg-primary text-white'
                          : 'bg-gray-50 dark:bg-[#252535] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a3c]'
                        } ${idx !== 3 ? 'border-r border-gray-200 dark:border-[#2d2d3b]' : ''}`}
                    >
                      {d === 'all' ? 'Any' : d === 'E' ? 'Easy' : d === 'M' ? 'Medium' : 'Hard'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Division */}
            {!hiddenFilters.includes('division') && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Division</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'all', label: 'Any', icon: 'apps' },
                    { val: '1', label: 'Div 1 (MCQ)', icon: 'check_circle' },
                    { val: '2', label: 'Div 2 (Num)', icon: '123' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => onFilterChange({ division: opt.val })}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all ${currentFilters.division === opt.val
                          ? 'bg-primary/5 border-primary text-primary'
                          : 'bg-white dark:bg-[#252535] border-gray-200 dark:border-[#2d2d3b] text-gray-500 hover:border-gray-300'
                        }`}
                    >
                      <span className={`material-symbols-outlined text-lg mb-1 ${currentFilters.division === opt.val ? 'text-primary' : 'text-gray-400'}`}>{opt.icon}</span>
                      <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <SectionHeader title="Verification Status" icon="verified" />

          <div className="space-y-4">
            {!hiddenFilters.includes('verificationLevel1') && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Level 1 (Subject Matter)</label>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {['all', 'pending', 'approved', 'rejected'].map(s => (
                    <button
                      key={s}
                      onClick={() => onFilterChange({ verificationLevel1: s })}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${(currentFilters.verificationLevel1 || 'all') === s
                          ? s === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : s === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-primary/10 text-primary border-primary'
                          : 'bg-white dark:bg-[#252535] text-gray-500 border-gray-200 dark:border-[#2d2d3b]'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!hiddenFilters.includes('verificationLevel2') && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Level 2 (Data Entry)</label>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {['all', 'pending', 'approved', 'rejected'].map(s => (
                    <button
                      key={s}
                      onClick={() => onFilterChange({ verificationLevel2: s })}
                      className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${(currentFilters.verificationLevel2 || 'all') === s
                          ? s === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : s === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-primary/10 text-primary border-primary'
                          : 'bg-white dark:bg-[#252535] text-gray-500 border-gray-200 dark:border-[#2d2d3b]'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-5 border-t border-gray-100 dark:border-[#2d2d3b] bg-gray-50/50 dark:bg-[#1e1e2d] backdrop-blur-sm flex justify-between items-center z-10">
          <button
            onClick={onReset}
            className="text-sm font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            Reset Defaults
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="bg-primary text-white text-sm font-bold px-8 py-2.5 rounded-lg shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:bg-primary/90 transform active:scale-95 transition-all"
          >
            View Results
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`relative flex items-center gap-2 px-4 py-2 border rounded-full transition-all group ${activeCount > 0
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-white dark:bg-[#252535] border-gray-200 dark:border-[#2d2d3b] text-gray-600 dark:text-gray-300 hover:border-primary/50 hover:text-primary'
          }`}
      >
        <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">tune</span>
        <span className="text-sm font-semibold">Filters</span>
        {activeCount > 0 && (
          <span className="flex items-center justify-center size-5 text-[10px] font-bold text-white rounded-full bg-primary shadow-sm">
            {activeCount}
          </span>
        )}
      </button>
      {isOpen && createPortal(menuContent, document.body)}
    </>
  );
};

export default FilterMenu;
