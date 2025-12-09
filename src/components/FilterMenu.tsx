import React, { useState, useRef, useEffect } from 'react';
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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

  return (
    <div className="filter-menu-container" ref={menuRef} style={{ position: 'relative' }}>
      <button
        className={`btn-secondary ${activeFilterCount > 0 ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
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

      {isOpen && (
        <div className="filter-dropdown" style={{
          position: 'absolute',
          top: 'calc(100% + 0.5rem)',
          right: 0,
          width: '360px',
          maxHeight: '80vh',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '1.25rem',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div className="filter-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Filters & Sorting</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Clear all
              </button>
            )}
          </div>

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
      )}
    </div>
  );
};

export default FilterMenu;
