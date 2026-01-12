import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Test,
  TestMetadata,
  SectionConfig,
  SectionName,
  SelectedQuestion,
  Chapter,
  ConstraintConfig,
  ProjectState,
  ProjectInfo,
  WorkflowStep,
  Question,
  Solution,
  TestType,
  ExamType
} from './types';
import { ExamTableStatus } from './global.d';
import { sortQuestionsForSection } from './utils/sorting';
import TestCreationUpload, { FullTestJson } from './components/TestCreationUpload';
import TestOverview from './components/TestOverview';
import QuestionSelection from './components/QuestionSelection';
import ProjectTabs from './components/ProjectTabs';
import TestReview from './components/TestReview';
import UITestSection from './components/UITestSection';
import QuestionEditor from './components/QuestionEditor';
import TestNavigation from './components/TestNavigation';
import AddQuestionModal from './components/AddQuestionModal';
import ExportTestModal, { ExportConfig } from './components/ExportTestModal';
import Notification, { useNotification } from './components/Notification';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import DatabaseCleaning from './components/DatabaseCleaning';

// In-memory project data
interface ProjectData {
  testMetadata: TestMetadata | null;
  sections: SectionConfig[];
  currentSectionIndex: number;
  constraintConfig: ConstraintConfig;
  currentStep: WorkflowStep;
  activeChapterCode?: string;
  fullTestSectionView?: number | null; // For Full Test Overview persistence
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
  const [examTablesStatus, setExamTablesStatus] = useState<ExamTableStatus[]>([]);


  // Chapters file state
  const [chaptersConnected, setChaptersConnected] = useState(false);
  const [chaptersPath, setChaptersPath] = useState<string | null>(null);

  // App mode state
  const [appMode, setAppMode] = useState<'landing' | 'test-generation' | 'database-cleaning'>('landing');

  // Track when creating a new project
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTestType, setNewTestType] = useState<TestType>('Part');

  // Add Question Modal state
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [switchTargetQuestionUuid, setSwitchTargetQuestionUuid] = useState<string | null>(null);
  const [switchTargetQuestionData, setSwitchTargetQuestionData] = useState<Question | null>(null); // To store data for IPQ modal
  const [questionsRefreshTrigger, setQuestionsRefreshTrigger] = useState(0);

  // Export Test Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // State for the question editor
  const [editingQuestion, setEditingQuestion] = useState<{ question: Question, solution?: Solution } | null>(null);
  const [previousStep, setPreviousStep] = useState<WorkflowStep | null>(null);
  const [lastEditedQuestionUuid, setLastEditedQuestionUuid] = useState<string | null>(null);

  // Save status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Auto-save state
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // Get current project data
  const currentProject = currentProjectId ? projectsData[currentProjectId] : null;

  // Current project display state (derived from projectsData)
  const step = currentProject?.currentStep ||
    (isCreatingNew ? 'test-creation' : ((dbConnected && chaptersConnected) ? 'dashboard' : 'database-connect'));
  const testMetadata = currentProject?.testMetadata || null;
  const sections = currentProject?.sections || [];
  const currentSectionIndex = currentProject?.currentSectionIndex || 0;
  // Helper to update current project data
  const updateCurrentProject = useCallback((updates: Partial<ProjectData> & { lastActiveQuestionUuid?: string | null }) => {
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

    // Check chapters file
    if (config.chaptersPath) {
      setChaptersConnected(true);
      setChaptersPath(config.chaptersPath);
    }

    // Auto-connect to saved database if it exists
    if (config.databasePath) {
      const result = await window.electronAPI.db.connect(config.databasePath);
      if (result.success) {
        setDbConnected(true);
        setDbPath(config.databasePath);

        // Fetch exam tables status (includes IPQ since it's in SUPPORTED_EXAMS)
        const examStatus = await window.electronAPI.db.getExamTablesStatus();
        setExamTablesStatus(examStatus);

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
          // Fetch exam tables status (includes IPQ since it's in SUPPORTED_EXAMS)
          const examStatus = await window.electronAPI.db.getExamTablesStatus();
          setExamTablesStatus(examStatus);

          const loadedProjects = await window.electronAPI.project.list();
          setProjects(loadedProjects);
        }
      }
    } else {
      // No saved database, check if one is already connected
      const connected = await window.electronAPI.db.isConnected();
      setDbConnected(connected);

      if (connected) {
        // Fetch exam tables status (includes IPQ since it's in SUPPORTED_EXAMS)
        const examStatus = await window.electronAPI.db.getExamTablesStatus();
        setExamTablesStatus(examStatus);

        const loadedProjects = await window.electronAPI.project.list();
        setProjects(loadedProjects);
      }
    }
  };

  const handleModeSelect = (mode: 'test-generation' | 'database-cleaning') => {
    setAppMode(mode);
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
        lastModified: new Date().toISOString(),
        lastActiveQuestionUuid: (currentData as any).lastActiveQuestionUuid, // Save active question state
        activeChapterCode: currentData.activeChapterCode, // Ensure active chapter is saved
        fullTestSectionView: currentData.fullTestSectionView // Ensure section view state is saved
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
            setQuestionsRefreshTrigger(prev => prev + 1);
            return;
          }
        }

        addNotification('success', 'Question added successfully!');
        setIsAddQuestionModalOpen(false);
        setQuestionsRefreshTrigger(prev => prev + 1);
      } else {
        addNotification('error', 'Failed to add question.');
      }
    } catch (error) {
      console.error(error);
      addNotification('error', 'An error occurred while adding the question.');
    }
  };

  const handleSwitchQuestion = async (newQuestion: Question, newSolution?: Partial<Solution>) => {
    console.log('[handleSwitchQuestion] Called with:');
    console.log('  newQuestion.uuid:', newQuestion?.uuid);
    console.log('  newSolution:', newSolution);
    console.log('  currentProjectId:', currentProjectId);
    console.log('  switchTargetQuestionUuid:', switchTargetQuestionUuid);
    console.log('  switchTargetQuestionData:', switchTargetQuestionData);

    if (!currentProjectId || !switchTargetQuestionUuid || !window.electronAPI || !switchTargetQuestionData) {
      console.log('[handleSwitchQuestion] Early return - missing required data');
      return;
    }

    try {
      // Get parent exam from the original question's exam source
      const parentExam = (switchTargetQuestionData as any).examSource || 'JEE';

      // 1. Save new question to IPQ table with parent exam tracking
      const success = await window.electronAPI.ipq.createQuestion(newQuestion, parentExam);
      if (!success) {
        addNotification('error', 'Failed to save new IPQ question to database.');
        return;
      }

      // 2. Save solution if exists (to IPQ solutions table)
      console.log('[handleSwitchQuestion] Checking solution:');
      console.log('  newSolution:', newSolution);
      console.log('  newSolution?.solution_text:', newSolution?.solution_text);
      console.log('  newSolution?.solution_image_url:', newSolution?.solution_image_url);
      console.log('  Condition result:', !!(newSolution && (newSolution.solution_text || newSolution.solution_image_url)));

      if (newSolution && (newSolution.solution_text || newSolution.solution_image_url)) {
        console.log('[handleSwitchQuestion] Saving solution with:');
        console.log('  uuid:', newQuestion.uuid);
        console.log('  solution_text:', newSolution.solution_text);
        console.log('  solution_image_url:', newSolution.solution_image_url);
        await window.electronAPI.ipq.saveSolution(
          newQuestion.uuid,
          newSolution.solution_text || '',
          newSolution.solution_image_url || ''
        );
      } else {
        console.log('[handleSwitchQuestion] NOT saving solution - condition failed');
      }

      // 3. Update links
      const originalQuestion = await window.electronAPI.questions.getByUUID(switchTargetQuestionUuid);
      if (originalQuestion) {
        // Update original question links
        const originalLinks = originalQuestion.links ? JSON.parse(originalQuestion.links) : [];
        if (!originalLinks.includes(newQuestion.uuid)) {
          originalLinks.push(newQuestion.uuid);
          await window.electronAPI.questions.updateQuestion(originalQuestion.uuid, {
            links: JSON.stringify(originalLinks)
          });
        }

        // Update new question links (note: this would need to be done via a separate update call for IPQ questions)
        // For now we'll include the link in the question object before creation
      }

      // 4. Replace in project state
      const updatedSections = sections.map(section => ({
        ...section,
        selectedQuestions: section.selectedQuestions.map(sq => {
          if (sq.question.uuid === switchTargetQuestionUuid) {
            return {
              ...sq,
              question: newQuestion,
              status: 'pending' as const // Reset status for the new question? Or keep same? Usually pending for review.
            };
          }
          return sq;
        })
      }));

      updateCurrentProject({ sections: updatedSections });
      addNotification('success', `IPQ question created successfully! (Parent Exam: ${parentExam})`);
      setSwitchTargetQuestionUuid(null);
      setSwitchTargetQuestionData(null);
      // Ensure we focus on the new question in the review list
      setLastEditedQuestionUuid(newQuestion.uuid);
      setQuestionsRefreshTrigger(prev => prev + 1);

    } catch (error) {
      console.error('Error switching question:', error);
      addNotification('error', 'An error occurred while switching the question.');
    }
  };


  // Helper to initiate switch with data fetching
  const initiateSwitchQuestion = async (uuid: string) => {
    setSwitchTargetQuestionUuid(uuid);
    if (window.electronAPI) {
      try {
        const q = await window.electronAPI.questions.getByUUID(uuid);
        if (q) setSwitchTargetQuestionData(q);
      } catch (e) {
        console.error("Failed to fetch target question for switch:", e);
      }
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
            createdAt: projectState.createdAt,
            lastActiveQuestionUuid: projectState.lastActiveQuestionUuid,
            activeChapterCode: projectState.activeChapterCode, // Properly restore activeChapterCode
            fullTestSectionView: projectState.fullTestSectionView // Properly restore fullTestSectionView
          } as any
        }));

        // Restore active question context if needed
        if (projectState.lastActiveQuestionUuid) {
          setLastEditedQuestionUuid(projectState.lastActiveQuestionUuid);

          // If we were editing, we need to load the question into editingQuestion
          if (projectState.currentStep === 'edit-question') {
            try {
              const q = await window.electronAPI.questions.getByUUID(projectState.lastActiveQuestionUuid);
              // Fetch solution from the correct table based on question source
              let s;
              if (q?.examSource === 'IPQ') {
                s = await window.electronAPI.ipq.getSolution(projectState.lastActiveQuestionUuid);
              } else {
                s = await window.electronAPI.questions.getSolution(projectState.lastActiveQuestionUuid);
              }
              if (q) {
                setEditingQuestion({
                  question: q,
                  solution: s ? s : undefined
                });
                // previousStep needs to be set properly if not saved. defaulting to selection
                if (!previousStep) {
                  // Attempt to infer from section index
                  const map: Record<number, WorkflowStep> = { 0: 'question-select-physics', 1: 'question-select-chemistry', 2: 'question-select-math' };
                  setPreviousStep(map[projectState.currentSectionIndex] || 'question-select-physics');
                }
              }
            } catch (e) {
              console.error("Failed to restore editing question", e);
            }
          }
        }
      }
    } else {
      // Restore from memory if switching tabs
      const existingData = projectsData[projectId] as any;
      if (existingData?.lastActiveQuestionUuid) {
        setLastEditedQuestionUuid(existingData.lastActiveQuestionUuid);
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
  const createNewProject = (testType: TestType = 'Part') => {
    setCurrentProjectId(null);
    setNewTestType(testType);
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
    if (appMode === 'database-cleaning') {
      // If we're in database cleaning mode, "Go to Dashboard" logic acts as "Go Home"
      setAppMode('landing');
    } else {
      setCurrentProjectId(null);
      setIsCreatingNew(false);
    }
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
      // Just clear from memory, don't delete the files!
      setProjects([]);
      setOpenProjectIds([]);
      setProjectsData({});
    }

    const result = await window.electronAPI.db.selectFile();
    if (result.success) {
      setDbConnected(true);
      setDbPath(result.path || null);
      await window.electronAPI.config.update({ databasePath: result.path || null });

      // Fetch exam tables status for the new database (includes IPQ since it's in SUPPORTED_EXAMS)
      const examStatus = await window.electronAPI.db.getExamTablesStatus();
      setExamTablesStatus(examStatus);
    } else {
      addNotification('error', 'Failed to connect to database: ' + result.error);
    }
  };

  const handleChaptersSelect = async () => {
    if (!window.electronAPI) return;

    const result = await window.electronAPI.chapters.selectFile();
    if (result.success && result.path) {
      setChaptersConnected(true);
      setChaptersPath(result.path);
      addNotification('success', 'Chapters file loaded successfully');
    } else if (result.error) {
      addNotification('error', 'Failed to load chapters file: ' + result.error);
    }
  };

  const getFileName = (path: string | null): string => {
    if (!path) return 'Unknown';
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  };

  const handleJsonTestCreation = async (data: FullTestJson) => {
    const now = new Date().toISOString();
    const createdProjectIds: string[] = [];

    let allChapters: Record<SectionName, Chapter[]> = { Physics: [], Chemistry: [], Mathematics: [] };
    if (window.electronAPI) {
      try {
        const rawChapters = await window.electronAPI.chapters.load();
        if (rawChapters) {
          allChapters = {
            Physics: rawChapters.Physics || [],
            Chemistry: rawChapters.Chemistry || [],
            Mathematics: rawChapters.Mathematics || []
          };
        }
      } catch (e) {
        console.error("Failed to load chapters for test creation", e);
      }
    }

    for (const testDef of data.tests) {
      const projectId = testDef.testCode.replace(/[^a-zA-Z0-9]/g, '-');

      const metadata: TestMetadata = {
        code: testDef.testCode,
        description: testDef.description,
        testType: newTestType, // Uses the state from dashboard selection
        createdAt: now
      };

      const sections: SectionConfig[] = testDef.sections.map(sectionDef => {
        return {
          name: sectionDef.name,
          chapters: allChapters[sectionDef.name] || [],
          alphaConstraint: { chapters: [] },
          betaConstraint: {
            weightage: sectionDef.weightage,
            maxQuestions: sectionDef.maxQuestions,
            type: sectionDef.type
          },
          selectedQuestions: []
        };
      });

      setProjectsData(prev => ({
        ...prev,
        [projectId]: {
          testMetadata: metadata,
          sections: sections,
          currentSectionIndex: 0,
          constraintConfig: { minIdx: 1, Sm: 0.1, Sh: 0.1 },
          currentStep: 'full-test-overview', // Start at overview for both Part and Full tests
          createdAt: now
        }
      }));

      if (window.electronAPI) {
        const projectState: ProjectState = {
          id: projectId,
          testMetadata: metadata,
          sections: sections,
          currentSectionIndex: 0,
          constraintConfig: { minIdx: 1, Sm: 0.1, Sh: 0.1 },
          currentStep: 'full-test-overview',
          createdAt: now,
          lastModified: now
        };
        await window.electronAPI.project.save(projectState);
      }

      createdProjectIds.push(projectId);
    }

    if (window.electronAPI) {
      const updatedProjects = await window.electronAPI.project.list();
      setProjects(updatedProjects);
    }

    addNotification('success', `${createdProjectIds.length} tests created successfully.`);
    setIsCreatingNew(false);

    if (createdProjectIds.length > 0) {
      await loadProject(createdProjectIds[0]);
    }
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

    // For both Part and Full tests, return to the overview
    updateCurrentProject({
      sections: updatedSections,
      currentStep: 'full-test-overview',
      activeChapterCode: undefined // Clear active chapter
    });
  };

  const handleBackFromSelection = () => {
    // Always go back to overview for the new flow
    updateCurrentProject({
      currentStep: 'full-test-overview',
      activeChapterCode: undefined
    });
  };

  // Logic to find and navigate to the next chapter in Full Test mode
  const handleNextChapter = (selectedQuestions: SelectedQuestion[]) => {
    if (!currentProjectId || !currentProject) return;
    // Applies to both Part and Full tests in the new flow
    // if (currentProject.testMetadata?.testType !== 'Full') return;

    // SAVE CURRENT PROGRESS FIRST
    // This is crucial: save the selection from the current chapter before switching
    // Note: We need to merge the new selection with existing selection for OTHER chapters
    // The `selectedQuestions` arg contains ALL selected questions for the section (as managed by QuestionSelection)
    // So we can just use handleQuestionSelection to update the section state
    handleQuestionSelection(selectedQuestions);

    const currentSection = sections[currentProject.currentSectionIndex];
    const activeChapterCode = currentProject.activeChapterCode;

    if (!currentSection || !activeChapterCode) return;

    const weightage = currentSection.betaConstraint?.weightage || {};

    // Ideally follow the order defined in section.chapters
    let orderedCodes = currentSection.chapters
      .filter(c => weightage[c.code] !== undefined)
      .map(c => c.code);

    // Fallback: If active chapter is missing from ordered list (e.g. mismatch in chapters file or incomplete data),
    // rely on the order of keys in the weightage object (which usually preserves JSON insertion order).
    if (!orderedCodes.includes(activeChapterCode)) {
      orderedCodes = Object.keys(weightage);
    }

    const currentIndex = orderedCodes.indexOf(activeChapterCode);

    // Find next chronological chapter
    let nextChapterCode: string | undefined = undefined;

    // Simply get the next chapter in the list (if exists)
    if (currentIndex !== -1 && currentIndex < orderedCodes.length - 1) {
      nextChapterCode = orderedCodes[currentIndex + 1];
    }

    if (nextChapterCode) {
      updateCurrentProject({
        activeChapterCode: nextChapterCode,
        currentStep: 'full-test-question-select' // Stay in selection mode
      });
    } else {
      // End of current chapter list for this section.
      // User requested "remove the JUMP to next section thing".
      // So we return to the Overview.
      updateCurrentProject({
        currentStep: 'full-test-overview',
        activeChapterCode: undefined
      });
    }
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

  // Open export modal instead of directly exporting
  const handleExportTest = () => {
    if (!testMetadata) return;
    setIsExportModalOpen(true);
  };

  // Handle the actual export with config from modal
  const handleExportWithConfig = async (exportConfig: ExportConfig) => {
    if (!testMetadata || !window.electronAPI) return;

    const sortedSections = sections.map(section => ({
      ...section,
      selectedQuestions: sortQuestionsForSection(section.selectedQuestions)
    }));

    const test: Test = {
      metadata: testMetadata,
      sections: sortedSections
    };

    const result = await window.electronAPI.test.exportWithConfig(test, exportConfig);

    if (result.success) {
      updateCurrentProject({ currentStep: 'complete' });

      // Show detailed success message
      let message = 'Test exported successfully!';
      if (result.githubTestUrl) {
        message += ' Uploaded to GitHub.';
      }
      if (result.supabaseInserted) {
        message += ' Saved to database.';
      }
      addNotification('success', message);
      setIsExportModalOpen(false);
    } else {
      throw new Error(result.error || 'Export failed');
    }
  };

  const handleQuestionUpdate = useCallback(async (updatedQuestion: any, silent: boolean = false) => {
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
          topic_tags: updatedQuestion.topic_tags,
          importance_level: updatedQuestion.importance_level,
          verification_level_1: updatedQuestion.verification_level_1,
          verification_level_2: updatedQuestion.verification_level_2,
          jee_mains_relevance: updatedQuestion.jee_mains_relevance,
          is_multi_concept: updatedQuestion.is_multi_concept,
          related_concepts: updatedQuestion.related_concepts,
          scary: updatedQuestion.scary,
          calc: updatedQuestion.calc,
          division_override: updatedQuestion.division_override,
          updated_at: new Date().toISOString()
        },
        updatedQuestion.examSource as any // Pass exam type (e.g., 'IPQ', 'JEE')
      );

      if (success) {
        // Refetch the question from database to ensure sync
        const freshQuestion = await window.electronAPI.questions.getByUUID(updatedQuestion.uuid, updatedQuestion.examSource as any);

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
          if (!silent) addNotification('success', 'Question updated successfully!');
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
          if (!silent) addNotification('success', 'Question updated successfully!');
        }
      } else {
        if (!silent) addNotification('error', 'Failed to update question in database.');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      if (!silent) addNotification('error', 'An error occurred while updating the question.');
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

  const handleVerifyQuestion = useCallback(async (questionUuid: string, status: 'approved' | 'rejected' | 'pending') => {
    if (!window.electronAPI) return;
    try {
      // Find the question to get its examSource for correct table targeting
      let examSource: ExamType | undefined;
      for (const section of sections) {
        const found = section.selectedQuestions.find(sq => sq.question.uuid === questionUuid);
        if (found && (found.question as any).examSource) {
          examSource = (found.question as any).examSource;
          break;
        }
      }

      const success = await window.electronAPI.questions.updateQuestion(questionUuid, { verification_level_1: status }, examSource);
      if (!success) {
        console.error("Failed to update verification status in DB");
      } else {
        // Also update status in memory if needed
        handleQuestionStatusUpdate(questionUuid, status === 'approved' ? 'accepted' : 'pending');
      }
    } catch (e) {
      console.error("Error verifying question:", e);
    }
  }, [handleQuestionStatusUpdate, sections]);

  const handleStartEditing = (question: Question) => {
    if (!currentProject) return;

    // Determine which section this question belongs to
    // This is important for "Full Test Review" where questions from all sections are visible
    let targetSectionIndex = currentProject.currentSectionIndex;

    // Search for the question in all sections
    sections.forEach((section, index) => {
      if (section.selectedQuestions.some(sq => sq.question.uuid === question.uuid)) {
        targetSectionIndex = index;
      }
    });

    setEditingQuestion({ question });

    // Only set previousStep if we are NOT already in editing mode
    if (currentProject.currentStep !== 'edit-question') {
      setPreviousStep(currentProject.currentStep);
    }

    setLastEditedQuestionUuid(question.uuid); // Sync local state

    updateCurrentProject({
      currentStep: 'edit-question',
      lastActiveQuestionUuid: question.uuid,
      currentSectionIndex: targetSectionIndex // Switch context to the correct section
    });
  };

  const handleReplaceQuestion = (oldUuid: string, newQuestion: Question) => {
    if (!currentProject) return;

    const newSections = currentProject.sections.map(section => ({
      ...section,
      selectedQuestions: section.selectedQuestions.map(sq => {
        if (sq.question.uuid === oldUuid) {
          return { ...sq, question: newQuestion };
        }
        return sq;
      })
    }));

    updateCurrentProject({ sections: newSections });
    addNotification('success', 'Question replaced successfully.');
  };

  // Next/Previous functionality for Editor
  const handleEditorNext = () => {
    if (!currentProjectId || !editingQuestion) return;

    // If we came from Test Review, we should be able to navigate across sections
    if (previousStep === 'test-review') {
      // Flatten all selected questions across all sections
      const allQuestions = sections.flatMap(s => sortQuestionsForSection(s.selectedQuestions));
      const currentIndex = allQuestions.findIndex(sq => sq.question.uuid === editingQuestion.question.uuid);

      if (currentIndex !== -1 && currentIndex < allQuestions.length - 1) {
        const nextQ = allQuestions[currentIndex + 1].question;
        handleStartEditing(nextQ);
      }
    } else {
      // Normal behavior: navigate within current section
      const currentSection = sections[currentSectionIndex];
      if (!currentSection) return;

      // Use sorted list to match display order
      const sortedQuestions = sortQuestionsForSection(currentSection.selectedQuestions);
      const currentIndex = sortedQuestions.findIndex(sq => sq.question.uuid === editingQuestion.question.uuid);

      if (currentIndex !== -1 && currentIndex < sortedQuestions.length - 1) {
        const nextQ = sortedQuestions[currentIndex + 1].question;
        handleStartEditing(nextQ);
      }
    }
  };

  const handleEditorPrevious = () => {
    if (!currentProjectId || !editingQuestion) return;

    if (previousStep === 'test-review') {
      // Flatten all selected questions across all sections
      const allQuestions = sections.flatMap(s => sortQuestionsForSection(s.selectedQuestions));
      const currentIndex = allQuestions.findIndex(sq => sq.question.uuid === editingQuestion.question.uuid);

      if (currentIndex > 0) {
        const prevQ = allQuestions[currentIndex - 1].question;
        handleStartEditing(prevQ);
      }
    } else {
      const currentSection = sections[currentSectionIndex];
      if (!currentSection) return;

      const sortedQuestions = sortQuestionsForSection(currentSection.selectedQuestions);
      const currentIndex = sortedQuestions.findIndex(sq => sq.question.uuid === editingQuestion.question.uuid);
      if (currentIndex > 0) {
        const prevQ = sortedQuestions[currentIndex - 1].question;
        handleStartEditing(prevQ);
      }
    }
  };

  const handleIntermediateSave = useCallback(async (updatedQuestion: Question, updatedSolution?: Solution) => {
    if (!updatedQuestion) return;

    // Update question in database and in-memory state
    // Use silent mode for auto/intermediate saves
    await handleQuestionUpdate(updatedQuestion, true);

    // Save solution if provided
    if (updatedSolution && window.electronAPI) {
      try {
        if (updatedQuestion.examSource === 'IPQ') {
          // For IPQ, we need parent_exam. It should be available on the question object if loaded from IPQ table
          await window.electronAPI.ipq.saveSolution(
            updatedSolution.uuid,
            updatedSolution.solution_text || '',
            updatedSolution.solution_image_url || ''
          );
        } else {
          await window.electronAPI.questions.saveSolution(
            updatedSolution.uuid,
            updatedSolution.solution_text || '',
            updatedSolution.solution_image_url || '',
            updatedQuestion.examSource as any
          );
        }
      } catch (error) {
        console.error('Error saving solution:', error);
        addNotification('warning', 'Question saved, but failed to save solution.');
      }
    }
  }, [handleQuestionUpdate, addNotification]);

  const handleFinishEditing = async (updatedQuestion: Question | null, updatedSolution?: Solution) => {
    if (!updatedQuestion) {
      // If cancelling/going back, we still want to preserve the context of which question we were on
      // so the list view can scroll/jump to it.
      if (editingQuestion) {
        setLastEditedQuestionUuid(editingQuestion.question.uuid);
      }

      if (previousStep) {
        updateCurrentProject({ currentStep: previousStep });
      }
      setEditingQuestion(null);
      return;
    }

    // Use shared save logic
    await handleIntermediateSave(updatedQuestion, updatedSolution);

    // Set the last edited question UUID so we can scroll to it
    setLastEditedQuestionUuid(updatedQuestion.uuid);

    // Return to previous step
    if (previousStep) {
      updateCurrentProject({ currentStep: previousStep, lastActiveQuestionUuid: updatedQuestion.uuid });
    }
    setEditingQuestion(null);
  };

  const renderStep = () => {
    // If in Landing Mode
    if (appMode === 'landing') {
      return <LandingPage onSelectMode={handleModeSelect} />;
    }

    // If in Database Cleaning Mode
    if (appMode === 'database-cleaning') {
      if (!dbConnected) {
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-primary/10 dark:bg-primary/20 rounded-full p-8 mb-6 animate-fade-in">
              <span className="material-symbols-outlined text-7xl text-primary">database</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Database Cleaning</h1>
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
      }

      // Handle editing within database cleaning
      if (editingQuestion) {
        return (
          <QuestionEditor
            question={editingQuestion.question}
            solution={editingQuestion.solution}
            onSave={handleFinishEditing}
            onCancel={() => handleFinishEditing(null)}
          />
        );
      }

      return (
        <DatabaseCleaning
          onStartEditing={(question) => {
            setEditingQuestion({ question });
            // We are piggybacking on existing state logic but we are in a different mode
            // Actually, editingQuestion state is global, so it should work if we render conditionally
          }}
          scrollToQuestionUuid={lastEditedQuestionUuid}
          onScrollComplete={() => setLastEditedQuestionUuid(null)}
          refreshTrigger={questionsRefreshTrigger}
          chaptersPath={chaptersPath}
        />
      );
    }

    const showNavigation = [
      'question-select-physics',
      'question-select-chemistry',
      'question-select-math',
      'test-review',
      // We explicitly exclude UI test steps from the main wizard navigation as they are preview steps
      // 'ui-test-interface',
      // 'ui-review-interface'
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
                Please connect to a question database and select a chapters file to begin.
              </p>

              <div className="flex flex-col gap-4 w-full max-w-md">
                {/* Database Selection */}
                <div className={`p-4 rounded-xl border transition-all ${dbConnected ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-white dark:bg-[#1e1e2d] border-gray-200 dark:border-[#2d2d3b]'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${dbConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>database</span>
                      <div className="text-left">
                        <h3 className={`font-semibold ${dbConnected ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-white'}`}>Database</h3>
                        {dbConnected && <p className="text-xs text-green-700 dark:text-green-300 truncate max-w-[200px]">{getFileName(dbPath)}</p>}
                      </div>
                    </div>
                    {dbConnected && <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>}
                  </div>
                  <button
                    onClick={handleDatabaseSelect}
                    className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${dbConnected
                      ? 'bg-white border border-green-200 text-green-700 hover:bg-green-50 dark:bg-transparent dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20'
                      : 'bg-primary text-white hover:bg-primary/90 shadow-md'
                      }`}
                  >
                    {dbConnected ? 'Change Database' : 'Select Database File'}
                  </button>
                </div>

                {/* Chapters Selection */}
                <div className={`p-4 rounded-xl border transition-all ${chaptersConnected ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-white dark:bg-[#1e1e2d] border-gray-200 dark:border-[#2d2d3b]'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined ${chaptersConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>menu_book</span>
                      <div className="text-left">
                        <h3 className={`font-semibold ${chaptersConnected ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-white'}`}>Chapters File</h3>
                        {chaptersConnected && <p className="text-xs text-green-700 dark:text-green-300 truncate max-w-[200px]">{getFileName(chaptersPath)}</p>}
                      </div>
                    </div>
                    {chaptersConnected && <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>}
                  </div>
                  <button
                    onClick={handleChaptersSelect}
                    className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${chaptersConnected
                      ? 'bg-white border border-green-200 text-green-700 hover:bg-green-50 dark:bg-transparent dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20'
                      : 'bg-primary text-white hover:bg-primary/90 shadow-md'
                      }`}
                  >
                    {chaptersConnected ? 'Change Chapters File' : 'Select Chapters File'}
                  </button>
                </div>

              </div>
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
          return (
            <TestCreationUpload
              onCancel={() => setIsCreatingNew(false)}
              onProceed={handleJsonTestCreation}
              testType={newTestType}
            />
          );

        case 'full-test-overview':
          if (!testMetadata) return <div>Loading...</div>;
          return (
            <TestOverview
              testMetadata={testMetadata}
              sections={sections}
              onSelectChapter={(sectionIndex, chapterCode) => {
                updateCurrentProject({
                  currentSectionIndex: sectionIndex,
                  activeChapterCode: chapterCode,
                  fullTestSectionView: sectionIndex, // Persist view preference
                  currentStep: 'full-test-question-select'
                });
              }}
              activeSectionIndex={currentProject?.fullTestSectionView}
              onSectionIndexChange={(idx) => updateCurrentProject({ fullTestSectionView: idx })}
              onReview={() => updateCurrentProject({ currentStep: 'test-review' })}
              onBack={() => setIsCreatingNew(false)} // Or dashboard
            />
          );

        // Legacy steps are now just redirects or removed, but logic remains if needed for robustness
        case 'section-config-physics':
        case 'section-config-chemistry':
        case 'section-config-math':
          // These should ideally not be reached in new flow
          return <div>Legacy Configuration Steps</div>;

        case 'question-select-physics':
        case 'question-select-chemistry':
        case 'question-select-math':
        case 'full-test-question-select':
          const currentSection = sections[currentSectionIndex];
          if (!currentSection) return <div>Loading...</div>;

          // Apply Logic for both Part and Full tests in the new flow
          const activeChapterCode = currentProject?.activeChapterCode;

          let limitCount = undefined;
          let lockedDivision: 1 | 2 | undefined = undefined;

          if (activeChapterCode) {
            limitCount = currentSection.betaConstraint?.weightage?.[activeChapterCode];
            // Infer division from section type (Div 1 or Div 2)
            if (currentSection.betaConstraint?.type === "Div 1") lockedDivision = 1;
            if (currentSection.betaConstraint?.type === "Div 2") lockedDivision = 2;
          }

          return (
            <QuestionSelection
              key={`${currentProjectId}-${currentSectionIndex}-${activeChapterCode || ''}`}
              sectionName={currentSection.name}
              chapters={currentSection.chapters}
              alphaConstraint={currentSection.alphaConstraint}
              betaConstraint={currentSection.betaConstraint}
              onComplete={handleQuestionSelection}
              onBack={handleBackFromSelection}
              onStartEditing={handleStartEditing}
              initialSelectedQuestions={currentSection.selectedQuestions}
              onChange={handleSelectionChange}
              scrollToQuestionUuid={lastEditedQuestionUuid}
              onScrollComplete={() => setLastEditedQuestionUuid(null)}
              refreshTrigger={questionsRefreshTrigger}
              // Props for constraints
              lockedChapterCode={activeChapterCode}
              limitCount={limitCount}
              lockedDivision={lockedDivision}
              onNextChapter={handleNextChapter}
            />
          );

        case 'test-review':
          return (
            <TestReview
              sections={sections}
              onStartEditing={handleStartEditing}
              onBack={handleBackFromSelection}
              onExport={() => updateCurrentProject({ currentStep: 'ui-test-interface' })}
              onRemoveQuestion={handleRemoveQuestion}
              onUpdateQuestionStatus={handleQuestionStatusUpdate}
              initialQuestionUuid={lastEditedQuestionUuid}
              onNavigationComplete={() => setLastEditedQuestionUuid(null)}
              onSwitchQuestion={initiateSwitchQuestion} // Use the new initiator
              onVerifyQuestion={handleVerifyQuestion} // Pass handler
              onReplaceQuestion={handleReplaceQuestion}
            />
          );

        case 'ui-test-interface':
          return (
            <UITestSection
              sections={sections}
              onStartEditing={handleStartEditing}
              onNext={() => updateCurrentProject({ currentStep: 'ui-review-interface' })}
              onBack={() => updateCurrentProject({ currentStep: 'test-review' })}
              mode="test"
            />
          );

        case 'ui-review-interface':
          return (
            <UITestSection
              sections={sections}
              onStartEditing={handleStartEditing}
              onNext={handleExportTest} // This opens the export modal
              onBack={() => updateCurrentProject({ currentStep: 'ui-test-interface' })}
              mode="review"
            />
          );

        case 'edit-question':
          if (!editingQuestion) {
            // Auto-recovery: redirect to first section instead of showing error
            // This handles edge cases where the useEffect hasn't run yet
            if (currentProject) {
              updateCurrentProject({ currentStep: 'question-select-physics', currentSectionIndex: 0 });
            }
            return <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Redirecting...</div>
            </div>;
          }
          // Calculate Question Number
          let absoluteIndex = 0;
          if (sections[currentSectionIndex]) {
            const currentIndex = sections[currentSectionIndex].selectedQuestions.findIndex(sq => sq.question.uuid === editingQuestion.question.uuid);
            if (currentIndex !== -1) absoluteIndex = currentIndex + 1;
          }

          return (
            <QuestionEditor
              question={editingQuestion.question}
              solution={editingQuestion.solution}
              onSave={handleFinishEditing}
              onIntermediateSave={handleIntermediateSave}
              onCancel={() => handleFinishEditing(null)}
              subject={sections[currentSectionIndex]?.name}
              onNext={handleEditorNext}
              onPrevious={handleEditorPrevious}
              questionNumber={absoluteIndex > 0 ? absoluteIndex : undefined}
            />
          );

        case 'complete':
          const totalQuestions = sections.reduce((sum, section) => sum + section.selectedQuestions.length, 0);
          const totalMarks = totalQuestions * 4;
          return (
            <div className="flex-1 overflow-y-auto w-full">
              <div className="flex flex-col items-center justify-center min-h-full text-center max-w-2xl mx-auto py-12 px-4">
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
                    onClick={() => createNewProject()}
                    className="text-primary hover:text-primary/90 transition-colors flex items-center gap-1 font-semibold"
                  >
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    Create Another Test
                  </button>
                </div>
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
            testType={testMetadata?.testType} // Pass testType
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

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#121121] text-gray-900 dark:text-white overflow-hidden">
      <Notification notifications={notifications} removeNotification={removeNotification} />

      {/* Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onAddQuestion={() => setIsAddQuestionModalOpen(true)}
        onHomeClick={() => setAppMode('landing')}
        appMode={appMode}
        dbConnected={dbConnected}
        dbPath={dbPath}
        examTablesStatus={examTablesStatus}
        chaptersConnected={chaptersConnected}
        chaptersPath={chaptersPath}
        onDatabaseSelect={handleDatabaseSelect}
        onChaptersSelect={handleChaptersSelect}
        currentProjectId={currentProjectId}
        saveStatus={saveStatus}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Project Tabs with Window Controls - Only in Test Generation Mode */}
        {dbConnected && appMode === 'test-generation' ? (
          <ProjectTabs
            projects={openProjects}
            currentProjectId={currentProjectId}
            onSelectProject={loadProject}
            onCloseProject={handleCloseProject}
            onNewProject={createNewProject}
            onDashboard={goToDashboard}
            showWindowControls={true}
          />
        ) : (
          /* Floating Window Controls when tabs aren't visible */
          <div
            className="absolute top-2 right-2 z-10 flex items-center gap-1"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={async () => window.electronAPI?.window.minimize()}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title="Minimize"
            >
              <span className="material-symbols-outlined text-lg">remove</span>
            </button>
            <button
              onClick={async () => window.electronAPI?.window.maximize()}
              className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title="Maximize"
            >
              <span className="material-symbols-outlined text-lg">crop_square</span>
            </button>
            <button
              onClick={async () => window.electronAPI?.window.close()}
              className="p-1.5 rounded hover:bg-red-500 hover:text-white text-gray-500 dark:text-gray-400 transition-colors"
              title="Close"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Main Content - Each page handles its own scrolling */}
        <main className="flex-1 overflow-hidden flex flex-col" key={currentProjectId || 'new'}>
          {renderStep()}
        </main>
      </div>

      {/* Add Question Modal */}
      {isAddQuestionModalOpen && (
        <AddQuestionModal
          onClose={() => setIsAddQuestionModalOpen(false)}
          onSave={handleAddQuestion}
        />
      )}

      {/* Switch Question Modal */}
      {switchTargetQuestionUuid && switchTargetQuestionData && (
        <AddQuestionModal
          onClose={() => {
            setSwitchTargetQuestionUuid(null);
            setSwitchTargetQuestionData(null);
          }}
          onSave={handleSwitchQuestion}
          initialData={switchTargetQuestionData}
          isIPQMode={true}
          parentExam={(switchTargetQuestionData as any).examSource || 'JEE'}
        />
      )}


      {/* Export Test Modal */}
      {isExportModalOpen && testMetadata && (
        <ExportTestModal
          test={{ metadata: testMetadata, sections }}
          sections={sections}
          onClose={() => setIsExportModalOpen(false)}
          onExport={handleExportWithConfig}
        />
      )}
    </div>
  );
}

export default App;
