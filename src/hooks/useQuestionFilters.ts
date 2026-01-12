import { useState, useMemo, useEffect, useCallback } from 'react';
import { Question } from '../types';

// ==========================================
// Types
// ==========================================

export interface FilterState {
    // Basic Metadata
    chapter: string; // 'all' or specific code
    type: string;    // 'all' or specific type
    year: string;    // 'all' or specific year

    // Complexity & Status
    difficulty: string; // 'all', 'E', 'M', 'H'
    division: string;   // 'all', '1', '2'

    // Verification
    verificationLevel1: string; // 'all', 'pending', 'approved', 'rejected'
    verificationLevel2: string; // 'all', 'pending', 'approved', 'rejected'

    // Content Filters (Boolean / Existence)
    hasImage: boolean | 'ignore';    // true=must have, false=must not, 'ignore'=doesn't matter
    hasSolution: boolean | 'ignore';
    isSelected: boolean;             // Only show selected questions

    // Search
    searchText: string;
    searchUuid: string;

    // Tags (Flexible)
    tag1: string;
    tag2: string; // usually chapter code, but can be filtered explicitly if needed
    tag3: string; // usually difficulty
    tag4: string;

    // Sorting
    sort: string; // 'default', 'year_desc', 'year_asc', 'freq_desc', 'freq_asc', 'created_desc'
}

export const DEFAULT_FILTERS: FilterState = {
    chapter: 'all',
    type: 'all',
    year: 'all',
    difficulty: 'all',
    division: 'all',
    verificationLevel1: 'all',
    verificationLevel2: 'all',
    hasImage: 'ignore',
    hasSolution: 'ignore',
    isSelected: false,
    searchText: '',
    searchUuid: '',
    tag1: '',
    tag2: '',
    tag3: '',
    tag4: '',
    sort: 'default'
};

const STORAGE_KEY = 'prepAIred_filter_preferences';

// ==========================================
// Hook
// ==========================================

export const useQuestionFilters = (
    initialQuestions: Question[],
    selectedUuids: Set<string>,
    // examType removed as it was unused
    persistenceKey?: string // NEW: Optional key for scoped persistence
) => {
    // 1. State Initialization (Lazy load from localStorage)
    const [filters, setFilters] = useState<FilterState>(() => {
        try {
            // Priority: Scoped Persistence > Global Persistence > Defaults
            if (persistenceKey) {
                const scopedStored = localStorage.getItem(persistenceKey);
                if (scopedStored) {
                    return { ...DEFAULT_FILTERS, ...JSON.parse(scopedStored) };
                }
            }

            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                // Merge stored filters with defaults to ensure all keys exist (migrations)
                const parsed = JSON.parse(stored);
                // Reset some transient filters that shouldn't persist globally (but WILL persist if scoped)
                return {
                    ...DEFAULT_FILTERS,
                    ...parsed,
                    searchText: '',
                    searchUuid: '',
                    isSelected: false,
                    chapter: 'all' // Usually reset chapter as navigation changes context
                };
            }
        } catch (e) {
            console.error('Failed to parse stored filters', e);
        }
        return DEFAULT_FILTERS;
    });

    // 2. Persistence Effect
    useEffect(() => {
        if (persistenceKey) {
            // SCOPED PERSISTENCE: Save EVERYTHING including ephemeral state (search, chapter)
            localStorage.setItem(persistenceKey, JSON.stringify(filters));
        }

        // GLOBAL PERSISTENCE (Backwards compatibility / User preferences)
        // Only persist "preference" type filters, not "context" type filters
        const toPersist = {
            sort: filters.sort,
            difficulty: filters.difficulty,
            division: filters.division,
            type: filters.type,
            // We don't persist specific chapter/text search globally
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    }, [filters, persistenceKey]);


    // 3. Helper: Check Division (Legacy Logic)
    const isNumericalAnswer = (question: Question): boolean => {
        if (question.division_override === 1) return false;
        if (question.division_override === 2) return true;
        return !['A', 'B', 'C', 'D'].includes(question.answer?.toUpperCase().trim() || '');
    };


    // 4. Filtering Logic (Memoized)
    const filteredQuestions = useMemo(() => {
        return initialQuestions.filter(q => {
            // --- Basic Metadata ---
            if (filters.chapter !== 'all' && q.tag_2 !== filters.chapter) return false;
            if (filters.type !== 'all' && q.type !== filters.type) return false;
            if (filters.year !== 'all' && q.year !== filters.year) return false;

            // --- Complexity & Status ---
            if (filters.difficulty !== 'all' && q.tag_3 !== filters.difficulty) return false;

            if (filters.division !== 'all') {
                const isDiv2 = isNumericalAnswer(q);
                if (filters.division === '1' && isDiv2) return false;
                if (filters.division === '2' && !isDiv2) return false;
            }

            // --- Content Filters ---
            if (filters.hasImage !== 'ignore') {
                const hasImg = !!q.question_image_url;
                if (filters.hasImage === true && !hasImg) return false;
                if (filters.hasImage === false && hasImg) return false;
            }

            // Note: checking "hasSolution" requires checking the DB or assuming pre-fetched data. 
            // For now, we assume if we need this, the question object might need extension or separate check.
            // Leaving placeholder logic for now if property existed:
            // if (filters.hasSolution !== 'ignore' && q.hasSolution !== filters.hasSolution) return false;

            // --- Selection ---
            if (filters.isSelected && !selectedUuids.has(q.uuid)) return false;

            // --- Verification ---
            if (filters.verificationLevel1 !== 'all' && (q.verification_level_1 || 'pending') !== filters.verificationLevel1) return false;
            if (filters.verificationLevel2 !== 'all' && (q.verification_level_2 || 'pending') !== filters.verificationLevel2) return false;

            // --- Search ---
            if (filters.searchText) {
                const searchLower = filters.searchText.toLowerCase();
                const contentMatch = (q.question || '').toLowerCase().includes(searchLower) ||
                    (q.option_a || '').toLowerCase().includes(searchLower) ||
                    (q.option_b || '').toLowerCase().includes(searchLower) ||
                    (q.option_c || '').toLowerCase().includes(searchLower) ||
                    (q.option_d || '').toLowerCase().includes(searchLower);
                if (!contentMatch) return false;
            }

            if (filters.searchUuid && !q.uuid.toLowerCase().includes(filters.searchUuid.toLowerCase())) return false;

            // --- Tags ---
            if (filters.tag1 && !q.tag_1?.toLowerCase().includes(filters.tag1.toLowerCase())) return false;
            if (filters.tag4 && !q.tag_4?.toLowerCase().includes(filters.tag4.toLowerCase())) return false;


            return true;
        }).sort((a, b) => {
            // --- Sorting ---
            switch (filters.sort) {
                case 'year_desc':
                    return String(b.year || '').localeCompare(String(a.year || ''));
                case 'year_asc':
                    return String(a.year || '').localeCompare(String(b.year || ''));
                case 'freq_desc':
                    return (b.frequency || 0) - (a.frequency || 0);
                case 'freq_asc':
                    return (a.frequency || 0) - (b.frequency || 0);
                case 'created_desc':
                    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
                default:
                    return 0;
            }
        });
    }, [initialQuestions, filters, selectedUuids]);


    // 5. Actions
    const setFilter = useCallback((key: keyof FilterState, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetFilters = useCallback((overrides: Partial<FilterState> = {}) => {
        setFilters({ ...DEFAULT_FILTERS, ...overrides });
    }, []);

    const updateFilters = useCallback((updates: Partial<FilterState>) => {
        setFilters(prev => ({ ...prev, ...updates }));
    }, []);

    return {
        filters,
        filteredQuestions,
        setFilter,
        updateFilters,
        resetFilters,
        totalCount: initialQuestions.length,
        filteredCount: filteredQuestions.length
    };
};
