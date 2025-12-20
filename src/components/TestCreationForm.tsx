import { useState, useEffect } from 'react';
import { TestMetadata, TestType, Chapter } from '../types';

interface TestCreationFormProps {
  onSubmit: (metadata: TestMetadata, sectionsChapters: Chapter[][]) => void;
}

export const TestCreationForm: React.FC<TestCreationFormProps> = ({
  onSubmit
}) => {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [testType, setTestType] = useState<TestType>('Full');

  const [availableCodesInDb, setAvailableCodesInDb] = useState<Set<string>>(new Set());
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [chaptersData, setChaptersData] = useState<any>({ Physics: [], Chemistry: [], Mathematics: [] });

  const [physicsChapters, setPhysicsChapters] = useState<Chapter[]>([]);
  const [chemistryChapters, setChemistryChapters] = useState<Chapter[]>([]);
  const [mathChapters, setMathChapters] = useState<Chapter[]>([]);

  const [physicsSearch, setPhysicsSearch] = useState('');
  const [chemistrySearch, setChemistrySearch] = useState('');
  const [mathSearch, setMathSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setChaptersLoading(true);
      try {
        // Load available codes from DB
        const dbChapters = await window.electronAPI.db.getChaptersByType();
        const codesSet = new Set<string>();
        Object.values(dbChapters).forEach((codes) => {
          if (Array.isArray(codes)) {
            codes.forEach(code => codesSet.add(code));
          }
        });
        setAvailableCodesInDb(codesSet);

        // Load chapters structure from file
        const data = await window.electronAPI.chapters.load();
        if (data) {
          setChaptersData(data);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setAvailableCodesInDb(new Set());
      } finally {
        setChaptersLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const metadata: TestMetadata = { code, description, testType, createdAt: new Date().toISOString() };
    const sectionsChapters = [physicsChapters, chemistryChapters, mathChapters];
    onSubmit(metadata, sectionsChapters);
  };

  const handleChapterToggle = (section: 'physics' | 'chemistry' | 'math', chapter: Chapter) => {
    const setters = { physics: setPhysicsChapters, chemistry: setChemistryChapters, math: setMathChapters };
    const getters = { physics: physicsChapters, chemistry: chemistryChapters, math: mathChapters };
    const current = getters[section];
    const setter = setters[section];
    const isSelected = current.some(ch => ch.code === chapter.code);
    setter(isSelected ? current.filter(c => c.code !== chapter.code) : [...current, chapter]);
  };

  const isChapterSelected = (section: 'physics' | 'chemistry' | 'math', chapterCode: string): boolean => {
    const getters = { physics: physicsChapters, chemistry: chemistryChapters, math: mathChapters };
    return getters[section].some(ch => ch.code === chapterCode);
  };

  const isChapterAvailable = (chapterCode: string): boolean => availableCodesInDb.has(chapterCode);

  const getFilteredChapters = (sectionChapters: Chapter[], searchTerm: string): Chapter[] => {
    if (!searchTerm.trim()) return sectionChapters;
    const lower = searchTerm.toLowerCase();
    return sectionChapters.filter(ch => ch.name.toLowerCase().includes(lower) || ch.code.toLowerCase().includes(lower));
  };

  const isFormValid = () => code.trim() !== '' && description.trim() !== '' && physicsChapters.length > 0 && chemistryChapters.length > 0 && mathChapters.length > 0;

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white dark:bg-[#1e1e2d] rounded-2xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm p-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Create New Test</h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-text-main dark:text-white mb-4 border-b pb-2 border-border-light dark:border-border-dark">Test Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label htmlFor="code" className="block text-sm font-medium text-text-secondary mb-1">Test Code *</label>
              <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., JEE-2024-01" required className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background-light dark:bg-background-dark" />
            </div>
            <div className="form-group">
              <label htmlFor="testType" className="block text-sm font-medium text-text-secondary mb-1">Test Type *</label>
              <select id="testType" value={testType} onChange={(e) => setTestType(e.target.value as TestType)} className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background-light dark:bg-background-dark">
                <option value="Full">Full Test</option>
                <option value="Part">Part Test</option>
              </select>
            </div>
            <div className="form-group md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">Description *</label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the test" rows={3} required className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background-light dark:bg-background-dark" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-text-main dark:text-white mb-4 border-b pb-2 border-border-light dark:border-border-dark">Select Chapters for Each Section</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Physics', chapters: chaptersData.Physics, selected: physicsChapters, search: physicsSearch, setSearch: setPhysicsSearch, section: 'physics' },
              { title: 'Chemistry', chapters: chaptersData.Chemistry, selected: chemistryChapters, search: chemistrySearch, setSearch: setChemistrySearch, section: 'chemistry' },
              { title: 'Mathematics', chapters: chaptersData.Mathematics, selected: mathChapters, search: mathSearch, setSearch: setMathSearch, section: 'math' },
            ].map(({ title, chapters, selected, search, setSearch, section }) => (
              <div key={section} className="bg-background-light dark:bg-background-dark p-4 rounded-lg border border-border-light dark:border-border-dark">
                <h4 className="font-semibold mb-2 text-text-main dark:text-white">{title} ({selected.length} selected)</h4>
                <input type="text" placeholder="Search chapters..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-2 py-1.5 mb-2 border border-border-light dark:border-border-dark rounded-md bg-surface-light dark:bg-surface-dark" />
                <div className="h-64 overflow-y-auto border border-border-light dark:border-border-dark rounded-md">
                  {chaptersLoading ? <div className="p-4 text-center text-text-secondary">Loading...</div> :
                    getFilteredChapters(chapters, search).map((chapter) => {
                      const available = isChapterAvailable(chapter.code);
                      return (
                        <label key={chapter.code} className={`flex items-center gap-3 p-2 border-b border-border-light dark:border-border-dark last:border-b-0 ${available ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700' : 'opacity-50 cursor-not-allowed'}`} title={available ? chapter.name : `${chapter.name} (No questions in database)`}>
                          <input type="checkbox" checked={isChapterSelected(section as any, chapter.code)} onChange={() => handleChapterToggle(section as any, chapter)} disabled={!available} className="h-4 w-4 rounded text-primary focus:ring-primary" />
                          <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">{chapter.code}</span>
                          <span className="text-sm text-text-main dark:text-white truncate">{chapter.name}</span>
                        </label>
                      );
                    })
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark flex justify-end">
          <button type="submit" disabled={!isFormValid()} className="bg-primary text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
            Continue to Section Configuration
          </button>
        </div>
      </form>
        </div>
      </div>
    </div>
  );
};

export default TestCreationForm;
