import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { Readable } from 'stream';
// Removed top-level googleapis import
import mime from 'mime-types';
import { dbService, ExamType } from './database';
import { projectService } from './projectService';
import { oauthService } from './oauthService';
import { githubService } from './githubService';
import { supabaseService } from './supabaseService';
import { Question, QuestionFilter, Test, ProjectState, ProjectInfo, AppConfig } from '../src/types';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

// Detect if running in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const DEV_SERVER_URL = 'http://localhost:5173';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false, // Frameless window
    titleBarStyle: 'hidden', // Hide default title bar on Mac too
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      icon: path.join(__dirname, "assets/icons/logo.png"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // Allow loading external images from Google Drive/CDN
    }
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();

    // Wait for dev server and reload if needed
    mainWindow.webContents.on('did-fail-load', () => {
      setTimeout(() => {
        mainWindow?.reload();
      }, 1000);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    dbService.disconnect();
    app.quit();
  }
});

// IPC Handlers

// Window Controls
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

// Helper to locate chapters.json
// Priority:
// 1. Configured path from projectService (selected by user)
function getChaptersPath(): string | null {
  // Check configured path first
  const config = projectService.getConfig();
  if (config.chaptersPath && fs.existsSync(config.chaptersPath)) {
    return config.chaptersPath;
  }
  return null;
}

ipcMain.handle('chapters:selectFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const chaptersPath = result.filePaths[0];
    try {
      // Validate it's a valid JSON and looks like chapters file
      const content = fs.readFileSync(chaptersPath, 'utf-8');
      const json = JSON.parse(content);
      if (!json.Physics || !json.Chemistry || !json.Mathematics) {
        return { success: false, error: "Invalid chapters file format. Must contain Physics, Chemistry, and Mathematics keys." };
      }

      projectService.updateConfig({ chaptersPath });
      return { success: true, path: chaptersPath };
    } catch (error: any) {
      return { success: false, error: "Failed to read or parse file: " + error.message };
    }
  }
  return { success: false, error: 'No file selected' };
});

ipcMain.handle('chapters:load', async () => {
  try {
    let chaptersPath = getChaptersPath();

    if (chaptersPath && fs.existsSync(chaptersPath)) {
      const content = fs.readFileSync(chaptersPath, 'utf-8');
      return JSON.parse(content);
    } else {
      return null;
    }
  } catch (error: any) {
    console.error("Failed to load chapters:", error);
    return null;
  }
});

// Chapter operations
ipcMain.handle('chapters:addTopic', async (_, subject: string, chapterCode: string, topicName: string) => {
  try {
    let chaptersPath = getChaptersPath();

    if (!chaptersPath || !fs.existsSync(chaptersPath)) {
      throw new Error(`Chapters file not found`);
    }

    const fileContent = fs.readFileSync(chaptersPath, 'utf-8');
    const chaptersData = JSON.parse(fileContent);

    if (!chaptersData[subject]) {
      throw new Error(`Subject "${subject}" not found`);
    }

    const chapterIndex = chaptersData[subject].findIndex((c: any) => c.code === chapterCode);
    if (chapterIndex === -1) {
      throw new Error(`Chapter "${chapterCode}" not found in ${subject}`);
    }

    const chapter = chaptersData[subject][chapterIndex];
    if (!chapter.topics) {
      chapter.topics = {};
    }

    const existingIds = Object.keys(chapter.topics).map(Number);
    const nextId = existingIds.length > 0 ? (Math.max(...existingIds) + 1).toString() : '1';

    chapter.topics[nextId] = topicName;
    chaptersData[subject][chapterIndex] = chapter;

    fs.writeFileSync(chaptersPath, JSON.stringify(chaptersData, null, 2), 'utf-8');

    return { success: true, topicId: nextId, topicName };
  } catch (error: any) {
    console.error('Failed to add topic:', error);
    return { success: false, error: error.message };
  }
});

// Database connection
ipcMain.handle('db:connect', async (_, dbPath?: string) => {
  try {
    dbService.connect(dbPath);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:selectFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Database Files', extensions: ['db', 'sqlite', 'sqlite3'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const dbPath = result.filePaths[0];
    try {
      dbService.connect(dbPath);
      return { success: true, path: dbPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'No file selected' };
});

ipcMain.handle('db:isConnected', () => {
  return dbService.isConnected();
});

ipcMain.handle('db:getExamTablesStatus', () => {
  return dbService.getExamTablesStatus();
});

// Question queries
ipcMain.handle('questions:getAll', async (_, filter?: QuestionFilter, exam?: ExamType): Promise<Question[]> => {
  return dbService.getQuestions(filter, exam);
});

ipcMain.handle('questions:getByUUID', async (_, uuid: string, exam?: ExamType): Promise<Question | null> => {
  return dbService.getQuestionByUUID(uuid, exam);
});

ipcMain.handle('questions:getByUUIDs', async (_, uuids: string[], exam?: ExamType): Promise<Question[]> => {
  return dbService.getQuestionsByUUIDs(uuids, exam);
});

ipcMain.handle('questions:search', async (_, criteria: any, exam?: ExamType): Promise<Question[]> => {
  return dbService.searchQuestions(criteria, exam);
});

ipcMain.handle('questions:getCount', async (_, filter?: QuestionFilter, exam?: ExamType): Promise<number> => {
  return dbService.getQuestionCount(filter, exam);
});

ipcMain.handle('questions:getAllExamCounts', async (): Promise<{ total: number; breakdown: { exam: string; count: number }[] }> => {
  return dbService.getAllExamCounts();
});

ipcMain.handle('questions:getByChapterCodes', async (_, type: string, chapterCodes: string[], exam?: ExamType): Promise<Question[]> => {
  return dbService.getQuestionsByChapterCodes(type, chapterCodes, 2000, exam);
});

ipcMain.handle('questions:getAllForSubject', async (_, chapterCodes: string[], exam?: ExamType): Promise<Question[]> => {
  return dbService.getAllQuestionsForSubject(chapterCodes, exam);
});

// Frequency operations
ipcMain.handle('questions:incrementFrequency', async (_, uuid: string, exam?: ExamType): Promise<boolean> => {
  return dbService.incrementFrequency(uuid, exam);
});

ipcMain.handle('questions:decrementFrequency', async (_, uuid: string, exam?: ExamType): Promise<boolean> => {
  return dbService.decrementFrequency(uuid, exam);
});

ipcMain.handle('questions:updateQuestion', async (_, uuid: string, updates: Partial<Question>, exam?: ExamType): Promise<boolean> => {
  return dbService.updateQuestion(uuid, updates, exam);
});

ipcMain.handle('questions:bulkUpdate', async (_, uuids: string[], updates: Partial<Question>, exam?: ExamType): Promise<{ success: boolean, updatedCount: number }> => {
  return dbService.bulkUpdateQuestions(uuids, updates, exam);
});

ipcMain.handle('questions:createQuestion', async (_, question: Question, exam?: ExamType): Promise<boolean> => {
  return dbService.createQuestion(question, exam);
});

ipcMain.handle('questions:clone', async (_, uuid: string, exam?: ExamType) => {
  return dbService.cloneQuestion(uuid, exam);
});

ipcMain.handle('questions:getSolution', async (_, uuid: string, exam?: ExamType) => {
  return dbService.getSolution(uuid, exam);
});

ipcMain.handle('questions:saveSolution', async (_, uuid: string, solutionText: string, solutionImageUrl: string, exam?: ExamType) => {
  return dbService.saveSolution(uuid, solutionText, solutionImageUrl, exam);
});

ipcMain.handle('questions:getSolutionsByUUIDs', async (_, uuids: string[], exam?: ExamType) => {
  const map = dbService.getSolutionsByUUIDs(uuids, exam);
  // Convert Map to plain object for IPC serialization
  return Object.fromEntries(map);
});

// ============ IPQ (Independent Parent Questions) IPC Handlers ============

ipcMain.handle('ipq:createQuestion', async (_, question: Question, parentExam: ExamType): Promise<boolean> => {
  return dbService.createIPQQuestion(question, parentExam);
});

ipcMain.handle('ipq:saveSolution', async (_, uuid: string, solutionText: string, solutionImageUrl: string): Promise<boolean> => {
  return dbService.saveIPQSolution(uuid, solutionText, solutionImageUrl);
});

ipcMain.handle('ipq:getQuestions', async (_, parentExam?: ExamType): Promise<Question[]> => {
  return dbService.getIPQQuestions(parentExam);
});

ipcMain.handle('ipq:getSolution', async (_, uuid: string) => {
  return dbService.getIPQSolution(uuid);
});

ipcMain.handle('ipq:getCount', async (_, parentExam?: ExamType): Promise<number> => {
  return dbService.getIPQCount(parentExam);
});

ipcMain.handle('ipq:getTablesStatus', async () => {
  return dbService.getIPQTablesStatus();
});

// Image Upload with OAuth 2.0
ipcMain.handle('upload-image', async (_, filePath: string) => {
  try {
    // Dynamically import googleapis
    const { google } = await import('googleapis');

    // Get authenticated OAuth client
    const auth = await oauthService.getAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    const fileName = path.basename(filePath);

    // Upload file to user's Google Drive root (or you can specify a folder)
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: ['1GEuFuE6fpPPeK9Q-1Nhc1X34farFpvq6']
        // Optionally specify a folder: parents: [FOLDER_ID]
      },
      media: {
        mimeType: mime.lookup(filePath) || 'application/octet-stream',
        body: fs.createReadStream(filePath),
      },
      fields: 'id, webViewLink, webContentLink',
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error('File ID not returned from Google Drive API.');
    }

    // Make the file publicly readable
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Use Google Drive's thumbnail URL
    const thumbnailUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    return { success: true, url: thumbnailUrl };
  } catch (error: any) {
    console.error('Failed to upload file to Google Drive:', error);

    // More helpful error message for OAuth issues
    let errorMessage = error.message;
    if (error.message.includes('OAuth') || error.message.includes('credentials')) {
      errorMessage = 'Google Drive authentication required. Please ensure oauth-credentials.json is configured correctly.';
    }

    dialog.showErrorBox(
      'Image Upload Failed',
      `Could not upload the image to Google Drive. ${errorMessage}`
    );
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle('upload-image-buffer', async (_, buffer: ArrayBuffer, fileName: string, mimeType: string) => {
  try {
    // Dynamically import googleapis
    const { google } = await import('googleapis');

    // Get authenticated OAuth client
    const auth = await oauthService.getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Create stream from buffer
    const stream = new Readable();
    stream.push(Buffer.from(buffer));
    stream.push(null);

    // Upload file to user's Google Drive root (or you can specify a folder)
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: ['1GEuFuE6fpPPeK9Q-1Nhc1X34farFpvq6']
      },
      media: {
        mimeType: mimeType || 'application/octet-stream',
        body: stream,
      },
      fields: 'id, webViewLink, webContentLink',
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error('File ID not returned from Google Drive API.');
    }

    // Make the file publicly readable
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Use Google Drive's thumbnail URL
    const thumbnailUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    return { success: true, url: thumbnailUrl };
  } catch (error: any) {
    console.error('Failed to upload buffer to Google Drive:', error);

    let errorMessage = error.message;
    if (error.message.includes('OAuth') || error.message.includes('credentials')) {
      errorMessage = 'Google Drive authentication required. Please ensure oauth-credentials.json is configured correctly.';
    }

    dialog.showErrorBox(
      'Image Upload Failed',
      `Could not upload the image to Google Drive. ${errorMessage}`
    );
    return { success: false, error: errorMessage };
  }
});

// OAuth management handlers
ipcMain.handle('oauth:authenticate', async () => {
  try {
    await oauthService.authenticate();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('oauth:isAuthenticated', () => {
  return oauthService.isAuthenticated();
});

ipcMain.handle('oauth:clearTokens', () => {
  oauthService.clearTokens();
  return { success: true };
});


// Metadata queries
ipcMain.handle('db:getTypes', async (): Promise<string[]> => {
  return dbService.getTypes();
});

ipcMain.handle('db:getYears', async (): Promise<string[]> => {
  return dbService.getYears();
});

ipcMain.handle('db:getTags', async (): Promise<string[]> => {
  return dbService.getTags();
});

ipcMain.handle('db:getChaptersByType', async (_, exam?: ExamType): Promise<{ [type: string]: string[] }> => {
  return dbService.getChaptersByType(exam);
});

// Test export - Transform to match sample-test-001.json format
ipcMain.handle('test:export', async (_, test: Test) => {
  const result = await dialog.showSaveDialog({
    defaultPath: `test-${test.metadata.code}.json`,
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    try {
      // Transform the test data to match sample-test-001.json format
      const exportData = transformTestToExportFormat(test);
      const exportContent = JSON.stringify(exportData, null, 2);
      fs.writeFileSync(result.filePath, exportContent, 'utf-8');

      // Batch load all solutions at once to avoid blocking the main thread
      const questionUUIDs = exportData.questions.map((q: any) => q.uuid);
      const solutionsMap = dbService.getSolutionsByUUIDs(questionUUIDs);

      // Create solutions JSON using pre-loaded solutions
      const solutionsData = {
        test_id: exportData.testId,
        questions: exportData.questions.map((q: any, index: number) => {
          const solution = solutionsMap.get(q.uuid);
          return {
            id: q.id,
            number: index + 1,
            solution_text: solution ? solution.solution_text : '',
            solution_image_url: solution ? solution.solution_image_url : '',
            tags: q.tags
          };
        })
      };

      const pathObj = path.parse(result.filePath);
      const solutionsPath = path.join(pathObj.dir, `${pathObj.name}_solutions${pathObj.ext}`);
      const solutionsContent = JSON.stringify(solutionsData, null, 2);
      fs.writeFileSync(solutionsPath, solutionsContent, 'utf-8');

      return { success: true, path: result.filePath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Export cancelled' };
});

// Helper to safely parse JSON strings from DB
function tryParseJson(jsonStr: string | null): any[] | null {
  if (!jsonStr) return null;
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
}

// Helper function to transform Test object to sample-test-001.json format
function transformTestToExportFormat(test: Test) {
  const marksPerQuestion = 4;
  const negativeMarksPerQuestion = -1;

  // Build section definitions
  // For each subject (Physics, Chemistry, Mathematics) we have Section A (Division 1) and Section B (Division 2)
  const sectionDefinitions = [
    { name: 'Physics A', marksPerQuestion, negativeMarksPerQuestion },
    { name: 'Physics B', marksPerQuestion, negativeMarksPerQuestion },
    { name: 'Chemistry A', marksPerQuestion, negativeMarksPerQuestion },
    { name: 'Chemistry B', marksPerQuestion, negativeMarksPerQuestion },
    { name: 'Mathematics A', marksPerQuestion, negativeMarksPerQuestion },
    { name: 'Mathematics B', marksPerQuestion, negativeMarksPerQuestion }
  ];

  // Build questions array
  const questions: any[] = [];
  let questionIndex = 1;

  for (const section of test.sections) {
    const sectionNameA = `${section.name} A`; // Division 1
    const sectionNameB = `${section.name} B`; // Division 2

    // Sort questions by division: Division 1 first, then Division 2
    const division1Questions = section.selectedQuestions.filter(sq => sq.division === 1);
    const division2Questions = section.selectedQuestions.filter(sq => sq.division === 2);

    // Process Division 1 questions (MCQ type)
    for (const sq of division1Questions) {
      const q = sq.question;
      questions.push({
        id: `q${questionIndex}`,
        uuid: q.uuid,
        text: q.question,
        image: q.question_image_url || null,
        options: [
          { id: 'a', text: q.option_a || '', image: q.option_a_image_url || null },
          { id: 'b', text: q.option_b || '', image: q.option_b_image_url || null },
          { id: 'c', text: q.option_c || '', image: q.option_c_image_url || null },
          { id: 'd', text: q.option_d || '', image: q.option_d_image_url || null }
        ],
        correctAnswer: q.answer.toLowerCase(),
        marks: marksPerQuestion,
        section: sectionNameA,
        chapterCode: q.tag_2 || null, // Using actual question metadata
        topicCode: q.tag_1 || null,
        difficulty: q.tag_3 || null,
        year: q.year || null,
        tag4: q.tag_4 || null,
        jeeMainsRelevance: q.jee_mains_relevance || null,
        scary: !!q.scary,
        lengthy: !!q.calc,
        isMultiConcept: !!q.is_multi_concept,
        relatedConcepts: tryParseJson(q.related_concepts),
        topicTags: tryParseJson(q.topic_tags),
        verificationLevel1: q.verification_level_1 || null,
        verificationLevel2: q.verification_level_2 || null,
        importanceLevel: q.importance_level || null,
        division: sq.division
      });
      questionIndex++;
    }

    // Process Division 2 questions (numerical/integer type)
    for (const sq of division2Questions) {
      const q = sq.question;
      questions.push({
        id: `q${questionIndex}`,
        uuid: q.uuid,
        text: q.question,
        image: q.question_image_url || null,
        options: [], // Division 2 questions are numerical, no options
        correctAnswer: q.answer,
        marks: marksPerQuestion,
        section: sectionNameB,
        chapterCode: q.tag_2 || null, // Using actual question metadata
        topicCode: q.tag_1 || null,
        difficulty: q.tag_3 || null,
        year: q.year || null,
        tag4: q.tag_4 || null,
        jeeMainsRelevance: q.jee_mains_relevance || null,
        scary: !!q.scary,
        lengthy: !!q.calc,
        isMultiConcept: !!q.is_multi_concept,
        relatedConcepts: tryParseJson(q.related_concepts),
        topicTags: tryParseJson(q.topic_tags),
        verificationLevel1: q.verification_level_1 || null,
        verificationLevel2: q.verification_level_2 || null,
        importanceLevel: q.importance_level || null,
        division: sq.division
      });
      questionIndex++;
    }
  }

  // Calculate total marks
  const totalMarks = questions.length * marksPerQuestion;

  // Calculate duration based on test type (Full = 3 hours, Part = 1.5 hours)
  const duration = test.metadata.testType === 'Full' ? 10800 : 5400;

  return {
    testId: test.metadata.code,
    title: test.metadata.description,
    testType: test.metadata.testType,
    createdAt: test.metadata.createdAt,
    duration,
    totalMarks,
    totalQuestions: questions.length,
    sections: sectionDefinitions,
    questions
  };
}

// Project management
ipcMain.handle('project:save', async (_, projectState: ProjectState) => {
  try {
    projectService.saveProject(projectState);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:load', async (_, projectId: string): Promise<ProjectState | null> => {
  return projectService.loadProject(projectId);
});

ipcMain.handle('project:delete', async (_, projectId: string) => {
  const success = projectService.deleteProject(projectId);
  return { success };
});

ipcMain.handle('project:list', async (): Promise<ProjectInfo[]> => {
  return projectService.listProjects();
});

ipcMain.handle('project:exists', async (_, projectId: string): Promise<boolean> => {
  return projectService.projectExists(projectId);
});

// App configuration
ipcMain.handle('config:get', async (): Promise<AppConfig> => {
  return projectService.getConfig();
});

ipcMain.handle('config:update', async (_, updates: Partial<AppConfig>) => {
  try {
    projectService.updateConfig(updates);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('config:deleteAllProjects', async () => {
  const count = projectService.deleteAllProjects();
  return { success: true, count };
});

// GitHub handlers
ipcMain.handle('github:configure', async (_, config: { token: string; owner: string; repo: string; branch: string }) => {
  try {
    githubService.saveConfig(config);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('github:getConfig', async () => {
  return githubService.getConfig();
});

ipcMain.handle('github:isConfigured', async () => {
  return githubService.isConfigured();
});

ipcMain.handle('github:testConnection', async () => {
  return await githubService.testConnection();
});

ipcMain.handle('github:uploadTestFiles', async (_, testId: string, testContent: string, solutionsContent: string) => {
  return await githubService.uploadTestFiles(testId, testContent, solutionsContent);
});

// Supabase handlers
ipcMain.handle('supabase:configure', async (_, config: { url: string; anonKey: string; accessToken?: string }) => {
  try {
    supabaseService.saveConfig({
      ...config,
      enabled: true // Assume enabled if configuring
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('supabase:getConfig', async () => {
  return supabaseService.getConfig();
});

ipcMain.handle('supabase:isConfigured', async () => {
  return supabaseService.isConfigured();
});

ipcMain.handle('supabase:testConnection', async () => {
  return await supabaseService.testConnection();
});

ipcMain.handle('supabase:insertTest', async (_, record: {
  testID: string;
  url: string;
  exam: string;
  type: string;
  tier: string;
  duration: number;
  title: string;
  description: string;
  totalQuestions: number;
  markingScheme: string;
  instructions: object[];
}) => {
  return await supabaseService.insertTest(record);
});

// Enhanced test export with config
ipcMain.handle('test:exportWithConfig', async (_, test: Test, exportConfig: {
  duration: number;
  exam: string;
  type: string;
  tier: string;
  totalQuestions: number;
  markingScheme: string;
  instructions: string[];
  title: string;
  description: string;
  testId: string;
}) => {
  try {
    // Transform the test data
    const exportData = transformTestToExportFormat(test);

    // Override with export config values
    exportData.duration = exportConfig.duration;
    exportData.title = exportConfig.title;
    exportData.testId = exportConfig.testId;
    // @ts-ignore - dynamic assignment for instructions
    exportData.instructions = exportConfig.instructions;

    const exportContent = JSON.stringify(exportData, null, 2);

    // Create solutions JSON
    const questionUUIDs = exportData.questions.map((q: any) => q.uuid);
    const solutionsMap = dbService.getSolutionsByUUIDs(questionUUIDs);

    const solutionsData = {
      test_id: exportData.testId,
      questions: exportData.questions.map((q: any, index: number) => {
        const solution = solutionsMap.get(q.uuid);
        return {
          id: q.id,
          number: index + 1,
          solution_text: solution ? solution.solution_text : '',
          solution_image_url: solution ? solution.solution_image_url : '',
          tags: q.tags
        };
      })
    };

    const solutionsContent = JSON.stringify(solutionsData, null, 2);

    // Step 1: Download files locally
    const result = await dialog.showSaveDialog({
      defaultPath: `test-${test.metadata.code}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled' };
    }

    fs.writeFileSync(result.filePath, exportContent, 'utf-8');

    const pathObj = path.parse(result.filePath);
    const solutionsPath = path.join(pathObj.dir, `${pathObj.name}_solutions${pathObj.ext}`);
    fs.writeFileSync(solutionsPath, solutionsContent, 'utf-8');

    let githubTestUrl = '';
    let githubSolutionsUrl = '';

    // Step 2: Upload to GitHub if configured
    if (githubService.isConfigured()) {
      const uploadResult = await githubService.uploadTestFiles(
        test.metadata.code,
        exportContent,
        solutionsContent
      );

      if (uploadResult.test.success && uploadResult.test.rawUrl) {
        githubTestUrl = uploadResult.test.rawUrl;
      }
      if (uploadResult.solutions.success && uploadResult.solutions.rawUrl) {
        githubSolutionsUrl = uploadResult.solutions.rawUrl;
      }
    }

    // Step 3: Insert into Supabase if configured
    let supabaseResult = { success: false, error: 'Supabase not configured' };
    let supabaseSkipped = false;

    if (supabaseService.isConfigured() && githubTestUrl) {
      // Check if test already exists in Supabase
      const existingTest = await supabaseService.getTest(test.metadata.code);

      if (existingTest.success && existingTest.data) {
        console.log(`Test ${test.metadata.code} already exists in Supabase. Skipping insert.`);
        supabaseResult = { success: true };
        supabaseSkipped = true;
      } else {
        supabaseResult = await supabaseService.insertTest({
          testID: test.metadata.code,
          url: githubTestUrl,
          solution_url: githubSolutionsUrl,
          exam: exportConfig.exam,
          type: exportConfig.type,
          tier: exportConfig.tier,
          duration: exportConfig.duration,
          title: exportConfig.title,
          description: exportConfig.description,
          totalQuestions: exportConfig.totalQuestions,
          markingScheme: exportConfig.markingScheme,
          instructions: exportConfig.instructions.map(text => ({ text }))
        });
      }
    }

    return {
      success: true,
      localPath: result.filePath,
      solutionsPath,
      githubTestUrl,
      githubSolutionsUrl,
      supabaseInserted: supabaseResult.success,
      supabaseSkipped
    };
  } catch (error: any) {
    console.error('Export with config failed:', error);
    return { success: false, error: error.message };
  }
});

// ============ Auto-Selection IPC Handlers ============

// Get the built-in presets directory path (Read Only in Prod)
function getBuiltInPresetsDir(): string {
  if (isDev) {
    return path.join(__dirname, '..', 'src', 'data', 'presets');
  } else {
    return path.join(__dirname, '..', 'resources', 'presets');
  }
}

// Get the user presets directory path (Read/Write)
function getUserPresetsDir(): string {
  return path.join(app.getPath('userData'), 'presets');
}

// Helper to load all presets from both sources
async function loadAllPresets(): Promise<Map<string, any>> {
  const presets = new Map<string, any>();

  // 1. Load built-in presets
  const builtInDir = getBuiltInPresetsDir();
  if (fs.existsSync(builtInDir)) {
    try {
      const files = fs.readdirSync(builtInDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(builtInDir, file), 'utf-8');
          const preset = JSON.parse(content);
          if (preset.id) presets.set(preset.id, preset);
        } catch (e) {
          console.warn(`[Presets] Failed to load built-in ${file}:`, e);
        }
      }
    } catch (e) {
      console.warn('[Presets] Failed to access built-in directory:', e);
    }
  }

  // 2. Load user presets (override built-in)
  const userDir = getUserPresetsDir();
  if (fs.existsSync(userDir)) {
    try {
      const files = fs.readdirSync(userDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(userDir, file), 'utf-8');
          const preset = JSON.parse(content);
          if (preset.id) presets.set(preset.id, preset);
        } catch (e) {
          console.warn(`[Presets] Failed to load user ${file}:`, e);
        }
      }
    } catch (e) {
      console.warn('[Presets] Failed to access user directory:', e);
    }
  }

  return presets;
}

// List all available presets
ipcMain.handle('presets:list', async () => {
  try {
    const presetsMap = await loadAllPresets();
    return Array.from(presetsMap.values()).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description
    }));
  } catch (error: any) {
    console.error('[Presets] Error listing presets:', error);
    return [];
  }
});

// Get a specific preset by ID
ipcMain.handle('presets:get', async (_, presetId: string) => {
  try {
    const presetsMap = await loadAllPresets();
    return presetsMap.get(presetId) || null;
  } catch (error: any) {
    console.error('[Presets] Error getting preset:', error);
    return null;
  }
});

// Import a preset from JSON file
ipcMain.handle('presets:import', async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Preset',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, message: 'Cancelled' };
    }

    const content = fs.readFileSync(filePaths[0], 'utf-8');
    let preset;
    try {
      preset = JSON.parse(content);
    } catch (e) {
      return { success: false, message: 'Invalid JSON file' };
    }

    if (!preset.id || !preset.name) {
      return { success: false, message: 'Preset must have "id" and "name" fields' };
    }

    // Sanitize ID to be safe for filename
    const safeId = preset.id.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    preset.id = safeId;

    const userDir = getUserPresetsDir();
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const targetPath = path.join(userDir, `${safeId}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(preset, null, 4));

    return { success: true, id: safeId };
  } catch (error: any) {
    console.error('[Presets] Error importing preset:', error);
    return { success: false, message: error.message };
  }
});

// Save a preset
ipcMain.handle('presets:save', async (_, preset: any) => {
  try {
    if (!preset.id || !preset.name) {
      return { success: false, message: 'Preset must have "id" and "name" fields' };
    }

    // Sanitize ID
    const safeId = preset.id.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    preset.id = safeId;

    const userDir = getUserPresetsDir();
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const targetPath = path.join(userDir, `${safeId}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(preset, null, 4));

    return { success: true, id: safeId };
  } catch (error: any) {
    console.error('[Presets] Error saving preset:', error);
    return { success: false, message: error.message };
  }
});

// Run auto-selection
ipcMain.handle('autoSelect:run', async (_, sections: Array<{
  name: 'Physics' | 'Chemistry' | 'Mathematics';
  type: 'Div 1' | 'Div 2';
  maxQuestions: number;
  weightage: Record<string, number>;
}>, presetId: string) => {
  try {
    // Load the preset
    const presetsMap = await loadAllPresets();
    const preset = presetsMap.get(presetId);

    if (!preset) {
      return { success: false, error: `Preset "${presetId}" not found` };
    }

    // Run auto-selection
    return dbService.autoSelectQuestions(sections, preset);
  } catch (error: any) {
    console.error('[AutoSelect] Error running auto-selection:', error);
    return { success: false, error: error.message };
  }
});
