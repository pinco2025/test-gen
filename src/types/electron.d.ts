declare global {
  interface Window {
    electronAPI: {
      db: {
        connect: (dbPath?: string) => Promise<{ success: boolean; error?: string }>;
        selectFile: () => Promise<{ success: boolean; path?: string; error?: string }>;
        isConnected: () => Promise<boolean>;
        getTypes: () => Promise<string[]>;
        getYears: () => Promise<string[]>;
        getTags: () => Promise<string[]>;
      };
      questions: {
        getAll: (filter?: any) => Promise<any[]>;
        getByUUID: (uuid: string) => Promise<any | null>;
        search: (criteria: any) => Promise<any[]>;
        getCount: (filter?: any) => Promise<number>;
      };
      test: {
        export: (test: any) => Promise<{ success: boolean; path?: string; error?: string }>;
      };
    };
  }
}

export {};
