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
}

interface FilterMenuProps {
  chapters: Chapter[];
  availableTypes: string[];
  availableYears: string[];
  currentFilters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
}

const FilterMenu: React.FC<FilterMenuProps> = ({
  chapters,
  availableTypes,
  availableYears,
  currentFilters,
  onFilterChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount =
    (currentFilters.chapter !== 'all' ? 1 : 0) +
    (currentFilters.difficulty !== 'all' ? 1 : 0) +
    (currentFilters.division !== 'all' ? 1 : 0) +
    (currentFilters.type !== 'all' ? 1 : 0) +
    (currentFilters.year !== 'all' ? 1 : 0) +
    (currentFilters.tag1 !== '' ? 1 : 0) +
    (currentFilters.tag4 !== '' ? 1 : 0) +
    (currentFilters.selectedOnly ? 1 : 0);

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
      selectedOnly: false
    });
  };

  const menuContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="flex flex-col w-full max-w-md max-h-[85vh] overflow-hidden bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
          <h3 className="text-lg font-bold">Filters & Sorting</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-full text-text-secondary hover:bg-black/5 dark:hover:bg-white/10"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6">

            {/* Sort Section */}
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-text-secondary">
                  Sort By
                </label>
                <select
                  value={currentFilters.sort}
                  onChange={(e) => onFilterChange({ sort: e.target.value })}
                  className="w-full p-2 text-sm border rounded-md bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="default">Default</option>
                  <option value="year_desc">Year (Newest First)</option>
                  <option value="year_asc">Year (Oldest First)</option>
                  <option value="freq_asc">Frequency (Low to High)</option>
                  <option value="freq_desc">Frequency (High to Low)</option>
                </select>
            </div>

            {/* Difficulty Filter */}
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-text-secondary">
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
                          : 'bg-transparent border-border-light dark:border-border-dark hover:border-border-dark dark:hover:border-border-light'
                      }`}
                    >
                      {opt === 'all' ? 'All' : opt === 'E' ? 'Easy' : opt === 'M' ? 'Medium' : 'Hard'}
                    </button>
                  ))}
                </div>
            </div>

            {/* Division Filter */}
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-text-secondary">
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
                          : 'bg-transparent border-border-light dark:border-border-dark hover:border-border-dark dark:hover:border-border-light'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
            </div>

            {/* Show Selected Only Filter */}
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-text-secondary">
                  Selection Filter
                </label>
                <button
                  onClick={() => onFilterChange({ selectedOnly: !currentFilters.selectedOnly })}
                  className={`w-full px-4 py-2.5 text-sm rounded-md border transition-colors flex items-center justify-between ${
                    currentFilters.selectedOnly
                      ? 'bg-primary/10 border-primary text-primary font-semibold'
                      : 'bg-transparent border-border-light dark:border-border-dark hover:border-border-dark dark:hover:border-border-light'
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

            {/* Type Filter */}
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-text-secondary">
                  Type
                </label>
                <select
                  value={currentFilters.type}
                  onChange={(e) => onFilterChange({ type: e.target.value })}
                  className="w-full p-2 text-sm border rounded-md bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="all">All Types</option>
                  {availableTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                  ))}
                </select>
            </div>

            {/* Year Filter */}
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-text-secondary">
                  Year
                </label>
                <select
                  value={currentFilters.year}
                  onChange={(e) => onFilterChange({ year: e.target.value })}
                  className="w-full p-2 text-sm border rounded-md bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="all">All Years</option>
                  {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                  ))}
                </select>
            </div>

            {/* Chapter Filter */}
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-text-secondary">
                  Chapter
                </label>
                <select
                  value={currentFilters.chapter}
                  onChange={(e) => onFilterChange({ chapter: e.target.value })}
                  className="w-full p-2 text-sm border rounded-md bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="all">All Chapters</option>
                  {chapters.map(ch => (
                      <option key={ch.code} value={ch.code}>
                      {ch.code} - {ch.name}
                      </option>
                  ))}
                </select>
            </div>

            {/* Tags Filter */}
            <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase text-text-secondary">
                  Additional Tags
                </label>
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="Tag 1 (e.g. Topic)"
                        value={currentFilters.tag1}
                        onChange={(e) => onFilterChange({ tag1: e.target.value })}
                        className="w-full p-2 text-sm border rounded-md bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <input
                        type="text"
                        placeholder="Tag 4 (e.g. Sub-topic)"
                        value={currentFilters.tag4}
                        onChange={(e) => onFilterChange({ tag4: e.target.value })}
                        className="w-full p-2 text-sm border rounded-md bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark">
             {activeFilterCount > 0 && (
                <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-sm font-semibold transition-colors border rounded-md text-text-secondary border-border-light dark:border-border-dark hover:bg-black/5 dark:hover:bg-white/5"
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
    <div>
      <button
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors border rounded-lg ${
          activeFilterCount > 0
            ? 'bg-primary/10 border-primary/50 text-primary'
            : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark hover:border-border-dark dark:hover:border-border-light'
        }`}
        onClick={() => setIsOpen(true)}
      >
        <span className="material-symbols-outlined text-base">filter_list</span>
        Filter / Sort
        {activeFilterCount > 0 && (
          <span className="flex items-center justify-center text-xs font-bold text-white rounded-full size-5 bg-primary">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && createPortal(menuContent, document.body)}
    </div>
  );
};

export default FilterMenu;
