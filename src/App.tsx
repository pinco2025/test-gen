import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Test,
  TestMetadata,
  SectionConfig,
  SectionName,
  AlphaConstraint,
  BetaConstraint,
  SelectedQuestion,
  Chapter,
  ConstraintConfig,
  ProjectState,
  ProjectInfo,
  WorkflowStep,
  Question,
  Solution
} from './types';
import { sortQuestionsForSection } from './utils/sorting';
import TestCreationForm from './components/TestCreationForm';
import SectionConfiguration from './components/SectionConfiguration';
import QuestionSelection from './components/QuestionSelection';
import ProjectTabs from './components/ProjectTabs';
import TestReview from './components/TestReview';
import QuestionEditor from './components/QuestionEditor';
import TestNavigation from './components/TestNavigation';
import AddQuestionModal from './components/AddQuestionModal';
import Notification, { useNotification } from './components/Notification';
import TitleBar from './components/TitleBar';
import Dashboard from './components/Dashboard';

// In-memory project data
interface ProjectData {
  testMetadata: TestMetadata | null;
  sections: SectionConfig[];
  currentSectionIndex: number;
  constraintConfig: ConstraintConfig;
  currentStep: WorkflowStep;
  createdAt: string; // Track creation time
}

function App() {
  const { notifications, addNotification, removeNotification } = useNotification();

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // All saved projects (from disk)
  const [projects, setProjects] = useState<ProjectInfo[]>([]);

  // Currently OPEN project IDs (like browser tabs)
  const [openProjectIds, setOpenProjectIds] = useState<string[]>([]);

  // Currently active/focused project
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // All loaded projects data in memory
  const [projectsData, setProjectsData] = useState<Record<string, ProjectData>>({});

  // Database state
  const [dbConnected, setDbConnected] = useState(false);
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [showDbDropdown, setShowDbDropdown] = useState(false);

  // Track when creating a new project
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Add Question Modal state
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);

  // State for the question editor
  const [editingQuestion, setEditingQuestion] = useState<{ question: Question, solution?: Solution } | null>(null);
  const [previousStep, setPreviousStep] = useState<WorkflowStep | null>(null);

  // Save status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Auto-save state
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Get current project data
  const currentProject = currentProjectId ? projectsData[currentProjectId] : null;

  // Current project display state (derived from projectsData)
  const step = currentProject?.currentStep ||
    (isCreatingNew ? 'test-creation' : (dbConnected ? 'dashboard' : 'database-connect'));
  const testMetadata = currentProject?.testMetadata || null;
  const sections = currentProject?.sections || [];
  const currentSectionIndex = currentProject?.currentSectionIndex || 0;
  const constraintConfig = currentProject?.constraintConfig || { minIdx: 1, Sm: 0.1, Sh: 0.1 };

  // Helper to update current project data
  const updateCurrentProject = useCallback((updates: Partial<ProjectData>) => {
    if (!currentProjectId) return;

    setSaveStatus('unsaved');
    setProjectsData(prev => ({
      ...prev,
      [currentProjectId]: {
        ...prev[currentProjectId],
        ...updates
      }
    }));
  }, [currentProjectId]);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    if (!window.electronAPI) return;

    // Get saved config
    const config = await window.electronAPI.config.get();

    // Auto-connect to saved database if it exists
    if (config.databasePath) {
      const result = await window.electronAPI.db.connect(config.databasePath);
      if (result.success) {
        setDbConnected(true);
        setDbPath(config.databasePath);

        // Load project list and show dashboard
        const loadedProjects = await window.electronAPI.project.list();
        setProjects(loadedProjects);

        // Don't auto-load any project, show dashboard
        setCurrentProjectId(null);
      } else {
        // Database path invalid, check if any database is connected
        const connected = await window.electronAPI.db.isConnected();
        setDbConnected(connected);

        if (connected) {
          const loadedProjects = await window.electronAPI.project.list();
          setProjects(loadedProjects);
        }
      }
    } else {
      // No saved database, check if one is already connected
      const connected = await window.electronAPI.db.isConnected();
      setDbConnected(connected);

      if (connected) {
        const loadedProjects = await window.electronAPI.project.list();
        setProjects(loadedProjects);
      }
    }
  };

  // Auto-save with debouncing
  const autoSave = useCallback(() => {
    if (!currentProjectId || !window.electronAPI || isLoadingRef.current) return;

    const currentData = projectsData[currentProjectId];
    if (!currentData) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');

      const projectState: ProjectState = {
        id: currentProjectId,
        testMetadata: currentData.testMetadata,
        sections: currentData.sections,
        currentSectionIndex: currentData.currentSectionIndex,
        constraintConfig: currentData.constraintConfig,
        currentStep: currentData.currentStep,
        createdAt: currentData.createdAt, // Preserve original creation time
        lastModified: new Date().toISOString()
      };

      await window.electronAPI.project.save(projectState);

      // Refresh project list
      const updatedProjects = await window.electronAPI.project.list();
      setProjects(updatedProjects);

      setSaveStatus('saved');
    }, 800); // 800ms debounce for snappier feel
  }, [currentProjectId, projectsData]);

  // Trigger auto-save when project data changes
  useEffect(() => {
    if (currentProjectId && projectsData[currentProjectId]) {
      autoSave();
    }
  }, [currentProjectId, projectsData, autoSave]);

  // Validate state after loading: if we're in edit mode but have no question, reset to safe state
  useEffect(() => {
    if (!currentProject || isLoadingRef.current) return;

    // If we're in edit-question state but have no editingQuestion (e.g., after app restart)
    if (currentProject.currentStep === 'edit-question' && !editingQuestion) {
      console.warn('Invalid state detected: edit-question step without editingQuestion. Resetting to first section (Physics).');

      // Reset to first section (Physics) for smooth UX
      updateCurrentProject({ currentStep: 'question-select-physics', currentSectionIndex: 0 });
    }
  }, [currentProject, editingQuestion, sections, updateCurrentProject]);

  const handleAddQuestion = async (question: Question, solution?: Partial<Solution>) => {
    if (!window.electronAPI) return;

    try {
      const success = await window.electronAPI.questions.createQuestion(question);
      if (success) {
        if (solution && (solution.solution_text || solution.solution_image_url)) {
            const solutionSuccess = await window.electronAPI.questions.saveSolution(
                question.uuid,
                solution.solution_text || '',
                solution.solution_image_url || ''
            );

            if (!solutionSuccess) {
                 addNotification('warning', 'Question added, but failed to save solution.');
                 setIsAddQuestionModalOpen(false);
                 return;
            }
        }

        addNotification('success', 'Question added successfully!');
        setIsAddQuestionModalOpen(false);
      } else {
        addNotification('error', 'Failed to add question.');
      }
    } catch (error) {
      console.error(error);
      addNotification('error', 'An error occurred while adding the question.');
    }
  };

  // Load a project (from disk if not in memory, or just switch to it)
  const loadProject = async (projectId: string) => {
    if (!window.electronAPI) return;

    isLoadingRef.current = true;

    // Check if project is already loaded in memory
    if (!projectsData[projectId]) {
      // Load from disk
      const projectState = await window.electronAPI.project.load(projectId);

      if (projectState) {
        // Add to memory
        setProjectsData(prev => ({
          ...prev,
          [projectId]: {
            testMetadata: projectState.testMetadata,
            sections: projectState.sections,
            currentSectionIndex: projectState.currentSectionIndex,
            constraintConfig: projectState.constraintConfig,
            currentStep: projectState.currentStep as WorkflowStep,
            createdAt: projectState.createdAt
          }
        }));
      }
    }

    // Add to open tabs if not already open
    setOpenProjectIds(prev => {
      if (!prev.includes(projectId)) {
        return [...prev, projectId];
      }
      return prev;
    });

    // Switch to this project
    setCurrentProjectId(projectId);
    setIsCreatingNew(false);

    // Update config
    await window.electronAPI.config.update({ lastProjectId: projectId });

    isLoadingRef.current = false;
  };

  // Create new project
  const createNewProject = () => {
    setCurrentProjectId(null);
    setIsCreatingNew(true);
  };

  // Close project tab (remove from open tabs, keep data in memory and on disk)
  const handleCloseProject = async (projectId: string) => {
    // Remove from open tabs
    setOpenProjectIds(prev => prev.filter(id => id !== projectId));

    // Remove from memory
    setProjectsData(prev => {
      const newData = { ...prev };
      delete newData[projectId];
      return newData;
    });

    // If current project was closed, switch to another open tab or go to dashboard
    if (currentProjectId === projectId) {
      const remainingTabs = openProjectIds.filter(id => id !== projectId);
      if (remainingTabs.length > 0) {
        // Switch to the last remaining tab
        setCurrentProjectId(remainingTabs[remainingTabs.length - 1]);
      } else {
        setCurrentProjectId(null);
      }
    }
  };

  // Go to dashboard (view all projects)
  const goToDashboard = () => {
    setCurrentProjectId(null);
    setIsCreatingNew(false);
  };

  // Delete project permanently
  const handleDeleteProject = async (projectId: string) => {
    if (!window.electronAPI) return;

    // Remove from open tabs
    setOpenProjectIds(prev => prev.filter(id => id !== projectId));

    // Remove from memory
    setProjectsData(prev => {
      const newData = { ...prev };
      delete newData[projectId];
      return newData;
    });

    // Delete from disk
    await window.electronAPI.project.delete(projectId);

    // Refresh project list
    const updatedProjects = await window.electronAPI.project.list();
    setProjects(updatedProjects);

    // If current project was deleted, switch to another or go to dashboard
    if (currentProjectId === projectId) {
      const remainingTabs = openProjectIds.filter(id => id !== projectId);
      if (remainingTabs.length > 0) {
        setCurrentProjectId(remainingTabs[remainingTabs.length - 1]);
      } else {
        setCurrentProjectId(null);
      }
    }
  };

  const handleDatabaseSelect = async () => {
    if (!window.electronAPI) return;

    if (projects.length > 0) {
      await window.electronAPI.config.deleteAllProjects();
      setProjects([]);
      setOpenProjectIds([]);
      setProjectsData({});
    }

    const result = await window.electronAPI.db.selectFile();
    if (result.success) {
      setDbConnected(true);
      setDbPath(result.path || null);
      setShowDbDropdown(false);
      await window.electronAPI.config.update({ databasePath: result.path || null });
      createNewProject();
    } else {
        addNotification('error', 'Failed to connect to database: ' + result.error);
    }
  };

  const toggleDbDropdown = () => {
    setShowDbDropdown(!showDbDropdown);
  };

  const getDbFileName = (path: string | null): string => {
    if (!path) return 'Unknown';
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  };

  const handleTestCreation = async (metadata: TestMetadata, chapters: Chapter[][]) => {
    let projectId = metadata.code.replace(/[^a-zA-Z0-9]/g, '-');

    if (window.electronAPI) {
      const exists = await window.electronAPI.project.exists(projectId);
      if (exists) {
          await loadProject(projectId);
          addNotification('info', `Loaded existing project "${metadata.code}"`);
          return;
      }
    }

    const sectionNames: SectionName[] = ['Physics', 'Chemistry', 'Mathematics'];
    const initialSections: SectionConfig[] = sectionNames.map((name, idx) => ({
      name,
      chapters: chapters[idx],
      alphaConstraint: { chapters: [] },
      betaConstraint: {},
      selectedQuestions: []
    }));

    const now = new Date().toISOString();

    setProjectsData(prev => ({
      ...prev,
      [projectId]: {
        testMetadata: metadata,
        sections: initialSections,
        currentSectionIndex: 0,
        constraintConfig: { minIdx: 1, Sm: 0.1, Sh: 0.1 },
        currentStep: 'section-config-physics',
        createdAt: now
      }
    }));

    setOpenProjectIds(prev => [...prev, projectId]);
    setCurrentProjectId(projectId);
    setIsCreatingNew(false);
  };

  const handleSectionConfiguration = (
    alpha: AlphaConstraint,
    beta: BetaConstraint
  ) => {
    if (!currentProjectId) return;

    const updatedSections = [...sections];
    updatedSections[currentSectionIndex] = {
      ...updatedSections[currentSectionIndex],
      alphaConstraint: alpha,
      betaConstraint: beta
    };

    const stepMap: { [key: number]: WorkflowStep } = {
      0: 'question-select-physics',
      1: 'question-select-chemistry',
      2: 'question-select-math'
    };

    updateCurrentProject({
      sections: updatedSections,
      currentStep: stepMap[currentSectionIndex]
    });
  };

  const handleSelectionChange = useCallback((selectedQuestions: SelectedQuestion[]) => {
    if (!currentProjectId) return;

    setProjectsData(prev => {
      const projectData = prev[currentProjectId];
      if (!projectData) return prev;

      const updatedSections = [...projectData.sections];
      updatedSections[projectData.currentSectionIndex] = {
        ...updatedSections[projectData.currentSectionIndex],
        selectedQuestions
      };

      return {
        ...prev,
        [currentProjectId]: {
          ...projectData,
          sections: updatedSections
        }
      };
    });
    setSaveStatus('unsaved');
  }, [currentProjectId]);

  const handleQuestionSelection = (selectedQuestions: SelectedQuestion[]) => {
    if (!currentProjectId) return;

    const updatedSections = [...sections];
    updatedSections[currentSectionIndex] = {
      ...updatedSections[currentSectionIndex],
      selectedQuestions
    };

    if (currentSectionIndex < 2) {
      const newIndex = currentSectionIndex + 1;
      const stepMap: { [key: number]: WorkflowStep } = {
        1: 'section-config-chemistry',
        2: 'section-config-math'
      };

      updateCurrentProject({
        sections: updatedSections,
        currentSectionIndex: newIndex,
        currentStep: stepMap[newIndex]
      });
    } else {
      updateCurrentProject({
        sections: updatedSections,
        currentStep: 'test-review'
      });
    }
  };

  const handleBackFromSelection = () => {
    const stepMap: { [key: number]: WorkflowStep } = {
      0: 'section-config-physics',
      1: 'section-config-chemistry',
      2: 'section-config-math'
    };

    updateCurrentProject({
      currentStep: stepMap[currentSectionIndex]
    });
  };

  const handleNavigation = (targetStep: WorkflowStep, sectionIndex?: number) => {
    if (!currentProjectId) return;

    const updates: Partial<ProjectData> = {
      currentStep: targetStep
    };

    if (sectionIndex !== undefined) {
      updates.currentSectionIndex = sectionIndex;
    }

    updateCurrentProject(updates);
  };

  const handleExportTest = async () => {
    if (!testMetadata) return;

    const sortedSections = sections.map(section => ({
      ...section,
      selectedQuestions: sortQuestionsForSection(section.selectedQuestions)
    }));

    const test: Test = {
      metadata: testMetadata,
      sections: sortedSections
    };

    if (window.electronAPI) {
      const result = await window.electronAPI.test.export(test);
      if (result.success) {
        updateCurrentProject({ currentStep: 'complete' });
        addNotification('success', 'Test exported successfully!');
      } else {
        addNotification('error', 'Failed to export test: ' + result.error);
      }
    }
  };

  const handleConstraintConfigChange = (config: ConstraintConfig) => {
    updateCurrentProject({ constraintConfig: config });
  };

  const handleQuestionUpdate = useCallback(async (updatedQuestion: any) => {
    if (!currentProjectId || !window.electronAPI) return;

    try {
      // Update question in database
      const success = await window.electronAPI.questions.updateQuestion(
        updatedQuestion.uuid,
        {
          question: updatedQuestion.question,
          question_image_url: updatedQuestion.question_image_url,
          option_a: updatedQuestion.option_a,
          option_a_image_url: updatedQuestion.option_a_image_url,
          option_b: updatedQuestion.option_b,
          option_b_image_url: updatedQuestion.option_b_image_url,
          option_c: updatedQuestion.option_c,
          option_c_image_url: updatedQuestion.option_c_image_url,
          option_d: updatedQuestion.option_d,
          option_d_image_url: updatedQuestion.option_d_image_url,
          answer: updatedQuestion.answer,
          type: updatedQuestion.type,
          year: updatedQuestion.year,
          tag_1: updatedQuestion.tag_1,
          tag_2: updatedQuestion.tag_2,
          tag_3: updatedQuestion.tag_3,
          tag_4: updatedQuestion.tag_4,
          updated_at: new Date().toISOString()
        }
      );

      if (success) {
        // Refetch the question from database to ensure sync
        const freshQuestion = await window.electronAPI.questions.getByUUID(updatedQuestion.uuid);

        if (freshQuestion) {
          // Update in-memory project state with fresh data from database
          const updatedSections = sections.map(section => ({
            ...section,
            selectedQuestions: section.selectedQuestions.map(sq => {
              if (sq.question.uuid === updatedQuestion.uuid) {
                return { ...sq, question: freshQuestion };
              }
              return sq;
            })
          }));

          updateCurrentProject({ sections: updatedSections });
          addNotification('success', 'Question updated successfully!');
        } else {
          // Fallback to using updatedQuestion if refetch fails
          const updatedSections = sections.map(section => ({
            ...section,
            selectedQuestions: section.selectedQuestions.map(sq => {
              if (sq.question.uuid === updatedQuestion.uuid) {
                return { ...sq, question: updatedQuestion };
              }
              return sq;
            })
          }));

          updateCurrentProject({ sections: updatedSections });
          addNotification('success', 'Question updated successfully!');
        }
      } else {
        addNotification('error', 'Failed to update question in database.');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      addNotification('error', 'An error occurred while updating the question.');
    }
  }, [currentProjectId, sections, updateCurrentProject, addNotification]);

  const handleRemoveQuestion = useCallback((questionUuid: string) => {
    if (!currentProjectId) return;

    const updatedSections = sections.map(section => ({
      ...section,
      selectedQuestions: section.selectedQuestions.filter(sq => sq.question.uuid !== questionUuid)
    }));

    updateCurrentProject({ sections: updatedSections });
  }, [currentProjectId, sections, updateCurrentProject]);

  const handleQuestionStatusUpdate = useCallback((questionUuid: string, status: 'accepted' | 'review' | 'pending') => {
    if (!currentProjectId) return;

    const updatedSections = sections.map(section => ({
      ...section,
      selectedQuestions: section.selectedQuestions.map(sq => {
        if (sq.question.uuid === questionUuid) {
          return { ...sq, status: status };
        }
        return sq;
      })
    }));

    updateCurrentProject({ sections: updatedSections });
  }, [currentProjectId, sections, updateCurrentProject]);

  const handleStartEditing = (question: Question) => {
    if (!currentProject) return;
    setEditingQuestion({ question });
    setPreviousStep(currentProject.currentStep);
    updateCurrentProject({ currentStep: 'edit-question' });
  };

  const handleCloneQuestion = (question: Question) => {
    const clonedQuestion = {
      ...question,
      uuid: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      frequency: 0,
    };
    handleStartEditing(clonedQuestion);
  };

  const handleFinishEditing = async (updatedQuestion: Question | null, updatedSolution?: Solution) => {
    if (!updatedQuestion) {
      if (previousStep) {
        updateCurrentProject({ currentStep: previousStep });
      }
      setEditingQuestion(null);
      return;
    }

    // Update question in database and in-memory state
    await handleQuestionUpdate(updatedQuestion);

    // Save solution if provided
    if (updatedSolution && window.electronAPI) {
      try {
        await window.electronAPI.questions.saveSolution(
          updatedSolution.uuid,
          updatedSolution.solution_text || '',
          updatedSolution.solution_image_url || ''
        );
      } catch (error) {
        console.error('Error saving solution:', error);
        addNotification('warning', 'Question saved, but failed to save solution.');
      }
    }

    // Return to previous step
    if (previousStep) {
      updateCurrentProject({ currentStep: previousStep });
    }
    setEditingQuestion(null);
  };

  const renderStep = () => {
    const showNavigation = [
      'question-select-physics',
      'question-select-chemistry',
      'question-select-math',
      'test-review'
    ].includes(step);

    const stepContent = (() => {
      switch (step) {
      case 'database-connect':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-primary/10 dark:bg-primary/20 rounded-full p-8 mb-6 animate-fade-in">
              <span className="material-symbols-outlined text-7xl text-primary">database</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Test Generation System</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg max-w-md">
              Please connect to a question database to begin.
            </p>
            <button
              onClick={handleDatabaseSelect}
              className="bg-primary text-white px-8 py-4 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl"
            >
              <span className="material-symbols-outlined text-xl">folder_open</span>
              Select Database File
            </button>
          </div>
        );

      case 'dashboard':
        return (
          <Dashboard
            projects={projects}
            onLoadProject={loadProject}
            onCreateNew={createNewProject}
            onDeleteProject={handleDeleteProject}
          />
        );

      case 'test-creation':
        return <TestCreationForm onSubmit={handleTestCreation} />;

      case 'section-config-physics':
      case 'section-config-chemistry':
      case 'section-config-math':
        return (
          <SectionConfiguration
            sectionName={sections[currentSectionIndex]?.name || 'Physics'}
            chapters={sections[currentSectionIndex]?.chapters || []}
            constraintConfig={constraintConfig}
            onConfigChange={handleConstraintConfigChange}
            onConfigure={handleSectionConfiguration}
          />
        );

      case 'question-select-physics':
      case 'question-select-chemistry':
      case 'question-select-math':
        const currentSection = sections[currentSectionIndex];
        if (!currentSection) return <div>Loading...</div>;
        return (
          <QuestionSelection
            key={`${currentProjectId}-${currentSectionIndex}`}
            sectionName={currentSection.name}
            chapters={currentSection.chapters}
            alphaConstraint={currentSection.alphaConstraint}
            betaConstraint={currentSection.betaConstraint}
            onComplete={handleQuestionSelection}
            onBack={handleBackFromSelection}
            onStartEditing={handleStartEditing}
            onClone={handleCloneQuestion}
            initialSelectedQuestions={currentSection.selectedQuestions}
            onChange={handleSelectionChange}
          />
        );

      case 'test-review':
        return (
          <TestReview
            sections={sections}
            onStartEditing={handleStartEditing}
            onBack={handleBackFromSelection}
            onExport={handleExportTest}
            onRemoveQuestion={handleRemoveQuestion}
            onUpdateQuestionStatus={handleQuestionStatusUpdate}
          />
        );

      case 'edit-question':
        if (!editingQuestion) return <div>Error: No question selected for editing.</div>;
        return (
            <QuestionEditor
                question={editingQuestion.question}
                solution={editingQuestion.solution}
                onSave={handleFinishEditing}
                onCancel={() => handleFinishEditing(null)}
            />
        );

      case 'complete':
        const totalQuestions = sections.reduce((sum, section) => sum + section.selectedQuestions.length, 0);
        const totalMarks = totalQuestions * 4;
        return (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto py-12 px-4">
            {/* Success Icon */}
            <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-8 mb-6">
              <span className="material-symbols-outlined text-7xl text-green-600 dark:text-green-400">check_circle</span>
            </div>

            {/* Heading */}
            <h2 className="text-4xl font-bold mb-3 text-gray-900 dark:text-white">
              Test Generated Successfully!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-10 text-lg">
              Your new practice test is ready. You can download it, copy it, or create another one.
            </p>

            {/* Test Summary Card */}
            <div className="w-full bg-white dark:bg-[#1e1e2d] rounded-2xl border border-gray-200 dark:border-[#2d2d3b] shadow-sm p-8 mb-8 text-left">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-200 dark:border-[#2d2d3b]">
                Test Summary
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Test ID</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{testMetadata?.code || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Title</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{testMetadata?.description || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Questions</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{totalQuestions}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Marks</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{totalMarks}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 w-full mb-8">
              <button
                onClick={() => addNotification('info', 'Test has already been exported to a JSON file')}
                className="flex-1 bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <span className="material-symbols-outlined text-xl">download</span>
                Download JSON
              </button>
              <button
                onClick={() => addNotification('info', 'Copy functionality coming soon')}
                className="flex-1 bg-white dark:bg-[#1e1e2d] border-2 border-gray-200 dark:border-[#2d2d3b] text-gray-900 dark:text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-[#252535] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-xl">content_copy</span>
                Copy to Clipboard
              </button>
            </div>

            {/* Secondary Actions */}
            <div className="flex items-center gap-6 text-sm">
              <button
                onClick={() => updateCurrentProject({ currentStep: 'test-review' })}
                className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-1 font-medium"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Back to Review
              </button>
              <button
                onClick={createNewProject}
                className="text-primary hover:text-primary/90 transition-colors flex items-center gap-1 font-semibold"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Create Another Test
              </button>
            </div>
          </div>
        );

      default:
        return <div>Unknown step</div>;
      }
    })();

    return (
      <>
        {showNavigation && (
          <TestNavigation
            currentStep={step}
            sections={sections}
            onNavigate={handleNavigation}
          />
        )}
        {stepContent}
      </>
    );
  };

  const openProjects = openProjectIds
    .map(id => projects.find(p => p.id === id) || {
      id,
      testCode: projectsData[id]?.testMetadata?.code || 'New Project',
      description: projectsData[id]?.testMetadata?.description || '',
      createdAt: projectsData[id]?.createdAt || new Date().toISOString(),
      lastModified: new Date().toISOString(),
      progress: 0
    })
    .filter(Boolean) as ProjectInfo[];

  const saveStatusClasses = {
    saved: 'bg-green-100 text-green-700',
    saving: 'bg-yellow-100 text-yellow-700 animate-pulse',
    unsaved: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#121121] text-gray-900 dark:text-white overflow-hidden">
      <TitleBar />
      <Notification notifications={notifications} removeNotification={removeNotification} />

      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-[#2d2d3b] bg-white dark:bg-[#1e1e2d] transition-colors duration-200">
        <div className="flex items-center gap-4">
          <img
            src="https://drive.google.com/thumbnail?id=1yLtX3YxubbDBsKYDj82qiaGbSkSX7aLv&sz=w1000"
            alt="Logo"
            className="h-6 w-6 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={goToDashboard}
          />
          <h1 className="text-lg font-bold cursor-pointer hover:text-primary transition-colors" onClick={goToDashboard}>
            Test Generation System
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddQuestionModalOpen(true)}
            title="Add New Question"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252535] transition-colors"
          >
            <span className="material-symbols-outlined">add_circle</span>
          </button>

          <button
            onClick={toggleDarkMode}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252535] transition-colors"
          >
            <span className="material-symbols-outlined">{darkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>

          {currentProjectId && (
            <div className={`text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 transition-all ${saveStatusClasses[saveStatus]}`}>
              <span className="material-symbols-outlined text-sm">
                {saveStatus === 'saving' ? 'sync' : saveStatus === 'saved' ? 'check_circle' : 'pending'}
              </span>
              {saveStatus.charAt(0).toUpperCase() + saveStatus.slice(1)}
            </div>
          )}

          <div className="relative">
            <div
              onClick={toggleDbDropdown}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium cursor-pointer transition-all ${
                dbConnected
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              <span className="material-symbols-outlined text-sm">database</span>
              {dbConnected ? 'Connected' : 'Disconnected'}
              <span className="material-symbols-outlined text-sm">
                {showDbDropdown ? 'expand_less' : 'expand_more'}
              </span>
            </div>

            {showDbDropdown && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-[#1e1e2d] border border-gray-200 dark:border-[#2d2d3b] rounded-xl shadow-xl z-50 animate-fade-in">
                <div className="p-4 font-semibold border-b border-gray-200 dark:border-[#2d2d3b] text-gray-900 dark:text-white">
                  Database Connection
                </div>
                {dbConnected && dbPath && (
                  <div className="p-4 border-b border-gray-200 dark:border-[#2d2d3b]">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{getDbFileName(dbPath)}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">{dbPath}</div>
                  </div>
                )}
                <button
                  className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-[#252535] flex items-center gap-2 transition-colors text-gray-900 dark:text-white rounded-b-xl"
                  onClick={handleDatabaseSelect}
                >
                  <span className="material-symbols-outlined text-sm">folder_open</span>
                  {dbConnected ? 'Change Database' : 'Select Database'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Project Tabs */}
      {dbConnected && (
        <ProjectTabs
          projects={openProjects}
          currentProjectId={currentProjectId}
          onSelectProject={loadProject}
          onCloseProject={handleCloseProject}
          onNewProject={createNewProject}
          onDashboard={goToDashboard}
        />
      )}

      {/* Main Content - Each page handles its own scrolling */}
      <main className="flex-1 overflow-hidden flex flex-col" key={currentProjectId || 'new'}>
        {renderStep()}
      </main>

      {/* Add Question Modal */}
      {isAddQuestionModalOpen && (
        <AddQuestionModal
          onClose={() => setIsAddQuestionModalOpen(false)}
          onSave={handleAddQuestion}
        />
      )}
    </div>
  );
}

export default App;
