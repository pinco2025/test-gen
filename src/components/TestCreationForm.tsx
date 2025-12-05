import React, { useState } from 'react';
import { TestMetadata, TestType } from '../types';

interface TestCreationFormProps {
  onSubmit: (metadata: TestMetadata, sectionsChapters: string[][]) => void;
  availableTags: string[];
}

/**
 * Form to collect initial test details
 */
export const TestCreationForm: React.FC<TestCreationFormProps> = ({
  onSubmit,
  availableTags
}) => {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [testType, setTestType] = useState<TestType>('Full');

  // Chapters for each section (Physics, Chemistry, Mathematics)
  const [physicsChapters, setPhysicsChapters] = useState<string[]>([]);
  const [chemistryChapters, setChemistryChapters] = useState<string[]>([]);
  const [mathChapters, setMathChapters] = useState<string[]>([]);

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
    chapter: string
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

    if (current.includes(chapter)) {
      setter(current.filter(c => c !== chapter));
    } else {
      setter([...current, chapter]);
    }
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
            <div className="chapter-group">
              <h4>Physics ({physicsChapters.length} selected)</h4>
              <div className="chapter-list">
                {availableTags.map((chapter) => (
                  <label key={`physics-${chapter}`} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={physicsChapters.includes(chapter)}
                      onChange={() => handleChapterToggle('physics', chapter)}
                    />
                    {chapter}
                  </label>
                ))}
              </div>
            </div>

            <div className="chapter-group">
              <h4>Chemistry ({chemistryChapters.length} selected)</h4>
              <div className="chapter-list">
                {availableTags.map((chapter) => (
                  <label key={`chemistry-${chapter}`} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={chemistryChapters.includes(chapter)}
                      onChange={() => handleChapterToggle('chemistry', chapter)}
                    />
                    {chapter}
                  </label>
                ))}
              </div>
            </div>

            <div className="chapter-group">
              <h4>Mathematics ({mathChapters.length} selected)</h4>
              <div className="chapter-list">
                {availableTags.map((chapter) => (
                  <label key={`math-${chapter}`} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={mathChapters.includes(chapter)}
                      onChange={() => handleChapterToggle('math', chapter)}
                    />
                    {chapter}
                  </label>
                ))}
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
