import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { google } from 'googleapis';
import mime from 'mime-types';
import { dbService } from './database';
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

// Chapter operations
ipcMain.handle('chapters:addTopic', async (_, subject: string, chapterCode: string, topicName: string) => {
  try {
    const chaptersPath = path.join(__dirname, '../src/data/chapters.json');
    if (!fs.existsSync(chaptersPath)) {
      throw new Error(`Chapters file not found at ${chaptersPath}`);
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

// Question queries
ipcMain.handle('questions:getAll', async (_, filter?: QuestionFilter): Promise<Question[]> => {
  return dbService.getQuestions(filter);
});

ipcMain.handle('questions:getByUUID', async (_, uuid: string): Promise<Question | null> => {
  return dbService.getQuestionByUUID(uuid);
});

ipcMain.handle('questions:getByUUIDs', async (_, uuids: string[]): Promise<Question[]> => {
  return dbService.getQuestionsByUUIDs(uuids);
});

ipcMain.handle('questions:search', async (_, criteria: any): Promise<Question[]> => {
  return dbService.searchQuestions(criteria);
});

ipcMain.handle('questions:getCount', async (_, filter?: QuestionFilter): Promise<number> => {
  return dbService.getQuestionCount(filter);
});

ipcMain.handle('questions:getByChapterCodes', async (_, type: string, chapterCodes: string[]): Promise<Question[]> => {
  return dbService.getQuestionsByChapterCodes(type, chapterCodes);
});

ipcMain.handle('questions:getAllForSubject', async (_, chapterCodes: string[]): Promise<Question[]> => {
  return dbService.getAllQuestionsForSubject(chapterCodes);
});

// Frequency operations
ipcMain.handle('questions:incrementFrequency', async (_, uuid: string): Promise<boolean> => {
  return dbService.incrementFrequency(uuid);
});

ipcMain.handle('questions:decrementFrequency', async (_, uuid: string): Promise<boolean> => {
  return dbService.decrementFrequency(uuid);
});

ipcMain.handle('questions:updateQuestion', async (_, uuid: string, updates: Partial<Question>): Promise<boolean> => {
  return dbService.updateQuestion(uuid, updates);
});

ipcMain.handle('questions:createQuestion', async (_, question: Question): Promise<boolean> => {
  return dbService.createQuestion(question);
});

ipcMain.handle('questions:getSolution', async (_, uuid: string) => {
  return dbService.getSolution(uuid);
});

ipcMain.handle('questions:saveSolution', async (_, uuid: string, solutionText: string, solutionImageUrl: string) => {
  return dbService.saveSolution(uuid, solutionText, solutionImageUrl);
});

// Image Upload with OAuth 2.0
ipcMain.handle('upload-image', async (_, filePath: string) => {
  try {
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

ipcMain.handle('db:getChaptersByType', async (): Promise<{ [type: string]: string[] }> => {
  return dbService.getChaptersByType();
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
        tags: {
          tag1: q.tag_1 || '',
          tag2: q.tag_2 || '',
          tag3: q.tag_3 || '',
          tag4: q.tag_4 || '',
          type: q.type || '',
          year: q.year || ''
        },
        chapterCode: sq.chapterCode,
        chapterName: sq.chapterName,
        difficulty: sq.difficulty,
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
        tags: {
          tag1: q.tag_1 || '',
          tag2: q.tag_2 || '',
          tag3: q.tag_3 || '',
          tag4: q.tag_4 || '',
          type: q.type || '',
          year: q.year || ''
        },
        chapterCode: sq.chapterCode,
        chapterName: sq.chapterName,
        difficulty: sq.difficulty,
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
}) => {
  try {
    // Transform the test data
    const exportData = transformTestToExportFormat(test);

    // Override with export config values
    exportData.duration = exportConfig.duration;
    exportData.title = exportConfig.title;

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
    if (supabaseService.isConfigured() && githubTestUrl) {
      supabaseResult = await supabaseService.insertTest({
        testID: test.metadata.code,
        url: githubTestUrl,
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

    return {
      success: true,
      localPath: result.filePath,
      solutionsPath,
      githubTestUrl,
      githubSolutionsUrl,
      supabaseInserted: supabaseResult.success
    };
  } catch (error: any) {
    console.error('Export with config failed:', error);
    return { success: false, error: error.message };
  }
});
