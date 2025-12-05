import { useState } from 'react';
import { TestMetadata, TestType, Chapter } from '../types';
import chaptersData from '../data/chapters.json';

interface TestCreationFormProps {
  onSubmit: (metadata: TestMetadata, sectionsChapters: Chapter[][]) => void;
}

/**
 * Form to collect initial test details
 */
export const TestCreationForm: React.FC<TestCreationFormProps> = ({
  onSubmit
}) => {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [testType, setTestType] = useState<TestType>('Full');

  // Chapters for each section
  const [physicsChapters, setPhysicsChapters] = useState<Chapter[]>([]);
  const [chemistryChapters, setChemistryChapters] = useState<Chapter[]>([]);
  const [mathChapters, setMathChapters] = useState<Chapter[]>([]);

  // Search terms for each section
  const [physicsSearch, setPhysicsSearch] = useState('');
  const [chemistrySearch, setChemistrySearch] = useState('');
  const [mathSearch, setMathSearch] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const metadata: TestMetadata = {
      code,
      description,
      testType,
      createdAt: new Date().toISOString()
    };

    const sectionsChapters = [physicsChapters, chemistryChapters, mathChapters];

    onSubmit(metadata, sectionsChapters);
  };

  const handleChapterToggle = (
    section: 'physics' | 'chemistry' | 'math',
    chapter: Chapter
  ) => {
    const setters = {
      physics: setPhysicsChapters,
      chemistry: setChemistryChapters,
      math: setMathChapters
    };

    const getters = {
      physics: physicsChapters,
      chemistry: chemistryChapters,
      math: mathChapters
    };

    const current = getters[section];
    const setter = setters[section];

    const isSelected = current.some(ch => ch.code === chapter.code);
    if (isSelected) {
      setter(current.filter(c => c.code !== chapter.code));
    } else {
      setter([...current, chapter]);
    }
  };

  const isChapterSelected = (
    section: 'physics' | 'chemistry' | 'math',
    chapterCode: string
  ): boolean => {
    const getters = {
      physics: physicsChapters,
      chemistry: chemistryChapters,
      math: mathChapters
    };
    return getters[section].some(ch => ch.code === chapterCode);
  };

  const getFilteredChapters = (
    sectionChapters: Chapter[],
    searchTerm: string
  ): Chapter[] => {
    if (!searchTerm.trim()) return sectionChapters;
    const lower = searchTerm.toLowerCase();
    return sectionChapters.filter(
      ch =>
        ch.name.toLowerCase().includes(lower) ||
        ch.code.toLowerCase().includes(lower)
    );
  };

  const isFormValid = () => {
    return (
      code.trim() !== '' &&
      description.trim() !== '' &&
      physicsChapters.length > 0 &&
      chemistryChapters.length > 0 &&
      mathChapters.length > 0
    );
  };

  return (
    <div className="test-creation-form">
      <h2>Create New Test</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Test Details</h3>

          <div className="form-group">
            <label htmlFor="code">Test Code *</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., JEE-2024-01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the test"
              rows={3}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="testType">Test Type *</label>
            <select
              id="testType"
              value={testType}
              onChange={(e) => setTestType(e.target.value as TestType)}
            >
              <option value="Full">Full Test</option>
              <option value="Part">Part Test</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>Select Chapters for Each Section</h3>

          <div className="section-chapters">
            {/* Section 1: Physics */}
            <div className="chapter-group">
              <h4>Section 1: Physics ({physicsChapters.length} selected)</h4>
              <input
                type="text"
                className="chapter-search"
                placeholder="Search chapters..."
                value={physicsSearch}
                onChange={(e) => setPhysicsSearch(e.target.value)}
              />
              <div className="chapter-list">
                {getFilteredChapters(chaptersData.Physics, physicsSearch).map(
                  (chapter) => (
                    <label
                      key={chapter.code}
                      className="checkbox-label"
                      title={chapter.code}
                    >
                      <input
                        type="checkbox"
                        checked={isChapterSelected('physics', chapter.code)}
                        onChange={() => handleChapterToggle('physics', chapter)}
                      />
                      <span className="chapter-code">{chapter.code}</span>
                      <span className="chapter-name">{chapter.name}</span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Section 2: Chemistry */}
            <div className="chapter-group">
              <h4>Section 2: Chemistry ({chemistryChapters.length} selected)</h4>
              <input
                type="text"
                className="chapter-search"
                placeholder="Search chapters..."
                value={chemistrySearch}
                onChange={(e) => setChemistrySearch(e.target.value)}
              />
              <div className="chapter-list">
                {getFilteredChapters(chaptersData.Chemistry, chemistrySearch).map(
                  (chapter) => (
                    <label
                      key={chapter.code}
                      className="checkbox-label"
                      title={chapter.code}
                    >
                      <input
                        type="checkbox"
                        checked={isChapterSelected('chemistry', chapter.code)}
                        onChange={() =>
                          handleChapterToggle('chemistry', chapter)
                        }
                      />
                      <span className="chapter-code">{chapter.code}</span>
                      <span className="chapter-name">{chapter.name}</span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Section 3: Mathematics */}
            <div className="chapter-group">
              <h4>Section 3: Mathematics ({mathChapters.length} selected)</h4>
              <input
                type="text"
                className="chapter-search"
                placeholder="Search chapters..."
                value={mathSearch}
                onChange={(e) => setMathSearch(e.target.value)}
              />
              <div className="chapter-list">
                {getFilteredChapters(chaptersData.Mathematics, mathSearch).map(
                  (chapter) => (
                    <label
                      key={chapter.code}
                      className="checkbox-label"
                      title={chapter.code}
                    >
                      <input
                        type="checkbox"
                        checked={isChapterSelected('math', chapter.code)}
                        onChange={() => handleChapterToggle('math', chapter)}
                      />
                      <span className="chapter-code">{chapter.code}</span>
                      <span className="chapter-name">{chapter.name}</span>
                    </label>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={!isFormValid()}
          >
            Continue to Section Configuration
          </button>
        </div>
      </form>
    </div>
  );
};

export default TestCreationForm;
