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
    (currentFilters.tag4 !== '' ? 1 : 0);

  const resetFilters = () => {
    onFilterChange({
      chapter: 'all',
      difficulty: 'all',
      division: 'all',
      type: 'all',
      year: 'all',
      tag1: '',
      tag4: '',
      sort: 'default'
    });
  };

  const menuContent = (
    <div
      className="filter-modal-overlay"
      onClick={() => setIsOpen(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="filter-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '400px',
          maxHeight: '85vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden' // Ensure header/footer stick if content scrolls
        }}
      >
        {/* Header */}
        <div className="filter-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-main)'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Filters & Sorting</h3>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              color: 'var(--text-secondary)',
              display: 'flex'
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="filter-body" style={{
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
        }}>

            {/* Sort Section */}
            <div className="filter-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Sort By
                </label>
                <select
                value={currentFilters.sort}
                onChange={(e) => onFilterChange({ sort: e.target.value })}
                style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                }}
                >
                <option value="default">Default</option>
                <option value="year_desc">Year (Newest First)</option>
                <option value="year_asc">Year (Oldest First)</option>
                <option value="freq_asc">Frequency (Low to High)</option>
                <option value="freq_desc">Frequency (High to Low)</option>
                </select>
            </div>

            {/* Difficulty Filter */}
            <div className="filter-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Difficulty
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['all', 'E', 'M', 'H'].map(opt => (
                    <button
                    key={opt}
                    onClick={() => onFilterChange({ difficulty: opt })}
                    style={{
                        flex: 1,
                        padding: '0.375rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid',
                        borderColor: currentFilters.difficulty === opt ? 'var(--primary)' : 'var(--border-color)',
                        background: currentFilters.difficulty === opt ? 'var(--primary-light)' : 'var(--bg-main)',
                        color: currentFilters.difficulty === opt ? 'var(--primary)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                    >
                    {opt === 'all' ? 'All' : opt === 'E' ? 'Easy' : opt === 'M' ? 'Medium' : 'Hard'}
                    </button>
                ))}
                </div>
            </div>

            {/* Division Filter */}
            <div className="filter-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Division
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                    { val: 'all', label: 'All' },
                    { val: '1', label: 'Div 1 (MCQ)' },
                    { val: '2', label: 'Div 2 (Num)' }
                ].map(opt => (
                    <button
                    key={opt.val}
                    onClick={() => onFilterChange({ division: opt.val })}
                    style={{
                        flex: 1,
                        padding: '0.375rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid',
                        borderColor: currentFilters.division === opt.val ? 'var(--primary)' : 'var(--border-color)',
                        background: currentFilters.division === opt.val ? 'var(--primary-light)' : 'var(--bg-main)',
                        color: currentFilters.division === opt.val ? 'var(--primary)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                    >
                    {opt.label}
                    </button>
                ))}
                </div>
            </div>

            {/* Type Filter */}
            <div className="filter-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Type
                </label>
                <select
                value={currentFilters.type}
                onChange={(e) => onFilterChange({ type: e.target.value })}
                style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                }}
                >
                <option value="all">All Types</option>
                {availableTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
                </select>
            </div>

            {/* Year Filter */}
            <div className="filter-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Year
                </label>
                <select
                value={currentFilters.year}
                onChange={(e) => onFilterChange({ year: e.target.value })}
                style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                }}
                >
                <option value="all">All Years</option>
                {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
                </select>
            </div>

            {/* Chapter Filter */}
            <div className="filter-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Chapter
                </label>
                <select
                value={currentFilters.chapter}
                onChange={(e) => onFilterChange({ chapter: e.target.value })}
                style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                }}
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
            <div className="filter-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Additional Tags
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                    <input
                        type="text"
                        placeholder="Tag 1 (e.g. Topic)"
                        value={currentFilters.tag1}
                        onChange={(e) => onFilterChange({ tag1: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Tag 4 (e.g. Sub-topic)"
                        value={currentFilters.tag4}
                        onChange={(e) => onFilterChange({ tag4: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="filter-footer" style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-main)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem'
        }}>
             {activeFilterCount > 0 && (
                <button
                    onClick={resetFilters}
                    className="btn-secondary"
                    style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                >
                    Clear All
                </button>
            )}
            <button
                className="btn-primary"
                onClick={() => setIsOpen(false)}
                style={{ fontSize: '0.9rem', padding: '0.5rem 1.5rem' }}
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="filter-menu-container">
      <button
        className={`btn-secondary ${activeFilterCount > 0 ? 'active' : ''}`}
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1rem',
          margin: 0,
          background: activeFilterCount > 0 ? 'var(--primary-light)' : 'var(--bg-card)',
          borderColor: activeFilterCount > 0 ? 'var(--primary)' : 'var(--border-color)',
          color: activeFilterCount > 0 ? 'var(--primary)' : 'var(--text-primary)'
        }}
      >
        <span className="material-symbols-outlined">filter_list</span>
        Filter / Sort
        {activeFilterCount > 0 && (
          <span style={{
            background: 'var(--primary)',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 'bold'
          }}>
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && createPortal(menuContent, document.body)}
    </div>
  );
};

export default FilterMenu;
