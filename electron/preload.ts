import { contextBridge, ipcRenderer } from 'electron';
import { Question, QuestionFilter, Test, ProjectState, ProjectInfo, AppConfig } from '../src/types';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Image Upload
  uploadImage: (filePath: string) => ipcRenderer.invoke('upload-image', filePath),
  uploadImageFromBuffer: (buffer: ArrayBuffer, fileName: string, mimeType: string) => ipcRenderer.invoke('upload-image-buffer', buffer, fileName, mimeType),

  // OAuth operations
  oauth: {
    authenticate: () => ipcRenderer.invoke('oauth:authenticate'),
    isAuthenticated: () => ipcRenderer.invoke('oauth:isAuthenticated'),
    clearTokens: () => ipcRenderer.invoke('oauth:clearTokens')
  },

  // Database operations
  db: {
    connect: (dbPath?: string) => ipcRenderer.invoke('db:connect', dbPath),
    selectFile: () => ipcRenderer.invoke('db:selectFile'),
    isConnected: () => ipcRenderer.invoke('db:isConnected'),
    getTypes: () => ipcRenderer.invoke('db:getTypes'),
    getYears: () => ipcRenderer.invoke('db:getYears'),
    getTags: () => ipcRenderer.invoke('db:getTags'),
    getChaptersByType: () => ipcRenderer.invoke('db:getChaptersByType')
  },

  // Chapter operations
  chapters: {
    load: () => ipcRenderer.invoke('chapters:load'),
    selectFile: () => ipcRenderer.invoke('chapters:selectFile'),
    addTopic: (subject: string, chapterCode: string, topicName: string) => ipcRenderer.invoke('chapters:addTopic', subject, chapterCode, topicName)
  },

  // Question operations
  questions: {
    getAll: (filter?: QuestionFilter) => ipcRenderer.invoke('questions:getAll', filter),
    getByUUID: (uuid: string) => ipcRenderer.invoke('questions:getByUUID', uuid),
    getByUUIDs: (uuids: string[]) => ipcRenderer.invoke('questions:getByUUIDs', uuids),
    search: (criteria: any) => ipcRenderer.invoke('questions:search', criteria),
    getCount: (filter?: QuestionFilter) => ipcRenderer.invoke('questions:getCount', filter),
    getByChapterCodes: (type: string, chapterCodes: string[]) => ipcRenderer.invoke('questions:getByChapterCodes', type, chapterCodes),
    getAllForSubject: (chapterCodes: string[]) => ipcRenderer.invoke('questions:getAllForSubject', chapterCodes),
    incrementFrequency: (uuid: string) => ipcRenderer.invoke('questions:incrementFrequency', uuid),
    decrementFrequency: (uuid: string) => ipcRenderer.invoke('questions:decrementFrequency', uuid),
    updateQuestion: (uuid: string, updates: Partial<Question>) => ipcRenderer.invoke('questions:updateQuestion', uuid, updates),
    bulkUpdateQuestions: (uuids: string[], updates: Partial<Question>) => ipcRenderer.invoke('questions:bulkUpdate', uuids, updates),
    createQuestion: (question: Question) => ipcRenderer.invoke('questions:createQuestion', question),
    clone: (uuid: string) => ipcRenderer.invoke('questions:clone', uuid),
    getSolution: (uuid: string) => ipcRenderer.invoke('questions:getSolution', uuid),
    getSolutionsByUUIDs: (uuids: string[]) => ipcRenderer.invoke('questions:getSolutionsByUUIDs', uuids),
    saveSolution: (uuid: string, solutionText: string, solutionImageUrl: string) => ipcRenderer.invoke('questions:saveSolution', uuid, solutionText, solutionImageUrl)
  },

  // Test operations
  test: {
    export: (test: Test) => ipcRenderer.invoke('test:export', test),
    exportWithConfig: (test: Test, exportConfig: {
      duration: number;
      exam: string;
      type: string;
      tier: string;
      totalQuestions: number;
      markingScheme: string;
      instructions: string[];
      title: string;
      description: string;
    }) => ipcRenderer.invoke('test:exportWithConfig', test, exportConfig)
  },

  // GitHub operations
  github: {
    configure: (config: { token: string; owner: string; repo: string; branch: string }) =>
      ipcRenderer.invoke('github:configure', config),
    getConfig: () => ipcRenderer.invoke('github:getConfig'),
    isConfigured: () => ipcRenderer.invoke('github:isConfigured'),
    testConnection: () => ipcRenderer.invoke('github:testConnection'),
    uploadTestFiles: (testId: string, testContent: string, solutionsContent: string) =>
      ipcRenderer.invoke('github:uploadTestFiles', testId, testContent, solutionsContent)
  },

  // Supabase operations
  supabase: {
    configure: (config: { url: string; anonKey: string }) =>
      ipcRenderer.invoke('supabase:configure', config),
    getConfig: () => ipcRenderer.invoke('supabase:getConfig'),
    isConfigured: () => ipcRenderer.invoke('supabase:isConfigured'),
    testConnection: () => ipcRenderer.invoke('supabase:testConnection'),
    insertTest: (record: {
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
    }) => ipcRenderer.invoke('supabase:insertTest', record)
  },

  // Project operations
  project: {
    save: (projectState: ProjectState) => ipcRenderer.invoke('project:save', projectState),
    load: (projectId: string) => ipcRenderer.invoke('project:load', projectId),
    delete: (projectId: string) => ipcRenderer.invoke('project:delete', projectId),
    list: () => ipcRenderer.invoke('project:list'),
    exists: (projectId: string) => ipcRenderer.invoke('project:exists', projectId)
  },

  // Config operations
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (updates: Partial<AppConfig>) => ipcRenderer.invoke('config:update', updates),
    deleteAllProjects: () => ipcRenderer.invoke('config:deleteAllProjects')
  },

  // Window operations
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  }
});
