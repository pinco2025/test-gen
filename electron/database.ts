import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { Question, QuestionFilter } from '../src/types';

// Supported exam types
export const SUPPORTED_EXAMS = ['JEE', 'NEET', 'BITS', 'IPQ'] as const;
export type ExamType = typeof SUPPORTED_EXAMS[number];

// Status of exam-specific tables in the database
export interface ExamTableStatus {
  exam: ExamType;
  hasQuestionsTable: boolean;
  hasSolutionsTable: boolean;
  isComplete: boolean; // true if both tables exist
}

// Cache for available tables to avoid repeated queries
let cachedTablesInfo: { firstExamWithQuestions?: ExamType } | null = null;
let cachedDbPath: string | null = null;

/**
 * Get the questions table name for an exam type
 * Requires exam type - no legacy fallback
 */
export function getQuestionsTable(exam?: ExamType): string {
  if (exam) return `${exam.toLowerCase()}_questions`;

  // If no exam specified, use first available exam table
  if (cachedTablesInfo?.firstExamWithQuestions) {
    return `${cachedTablesInfo.firstExamWithQuestions.toLowerCase()}_questions`;
  }

  // Default to JEE if no tables detected yet
  console.warn('[DB] getQuestionsTable called without exam, defaulting to jee_questions');
  return 'jee_questions';
}

/**
 * Get the solutions table name for an exam type
 * Requires exam type - no legacy fallback
 */
export function getSolutionsTable(exam?: ExamType): string {
  if (exam) return `${exam.toLowerCase()}_solutions`;

  // If no exam specified, use first available exam table
  if (cachedTablesInfo?.firstExamWithQuestions) {
    return `${cachedTablesInfo.firstExamWithQuestions.toLowerCase()}_solutions`;
  }

  // Default to JEE if no tables detected yet
  console.warn('[DB] getSolutionsTable called without exam, defaulting to jee_solutions');
  return 'jee_solutions';
}

/**
 * Attach examSource to a question object
 */
function attachExamSource<T>(row: T, exam?: ExamType, tableName?: string): T & { examSource?: ExamType } {
  let source = exam;

  if (!source && tableName) {
    if (tableName.startsWith('jee_')) source = 'JEE';
    else if (tableName.startsWith('neet_')) source = 'NEET';
    else if (tableName.startsWith('bits_')) source = 'BITS';
    else if (tableName.startsWith('ipq_')) source = 'IPQ';
    else if (tableName === 'questions') source = 'JEE';
  }

  if (!source) return row as T & { examSource?: ExamType };
  return { ...row, examSource: source };
}

/**
 * Attach examSource to an array of question objects
 */
function attachExamSourceToArray<T>(rows: T[], exam?: ExamType, tableName?: string): (T & { examSource?: ExamType })[] {
  let source = exam;

  if (!source && tableName) {
    if (tableName.startsWith('jee_')) source = 'JEE';
    else if (tableName.startsWith('neet_')) source = 'NEET';
    else if (tableName.startsWith('bits_')) source = 'BITS';
    else if (tableName.startsWith('ipq_')) source = 'IPQ';
    else if (tableName === 'questions') source = 'JEE'; // Default/Legacy
  }

  if (!source) return rows as (T & { examSource?: ExamType })[];
  return rows.map(row => ({ ...row, examSource: source }));
}

export class DatabaseService {
  private db: Database.Database | null = null;

  constructor(private dbPath?: string) { }

  connect(dbPath?: string): void {
    const finalPath = dbPath || this.dbPath || path.join(process.cwd(), 'questions.db');
    this.db = new Database(finalPath);
    console.log(`Connected to database at: ${finalPath}`);

    // IMPORTANT: Detect tables FIRST so ensureSchema knows which table to use
    this.detectAvailableTables();
    this.ensureSchema();
    this.createSolutionTable();
    this.createIPQTables();
  }


  /**
   * Detect available tables and cache the info for auto-fallback
   * This allows queries without exam parameter to use available exam tables
   */
  private detectAvailableTables(): void {
    if (!this.db) return;

    try {
      const tables = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all() as { name: string }[];

      const tableNames = new Set(tables.map(t => t.name.toLowerCase()));

      // Find first exam with a questions table
      let firstExamWithQuestions: ExamType | undefined;
      for (const exam of SUPPORTED_EXAMS) {
        if (tableNames.has(`${exam.toLowerCase()}_questions`)) {
          firstExamWithQuestions = exam;
          break;
        }
      }

      cachedTablesInfo = { firstExamWithQuestions };
      cachedDbPath = this.dbPath || null;

      console.log('[DB] Table detection:', cachedTablesInfo);
      if (firstExamWithQuestions) {
        console.log(`[DB] First available exam table: ${firstExamWithQuestions.toLowerCase()}_questions`);
      }
    } catch (error) {
      console.error('[DB] Error detecting tables:', error);
      cachedTablesInfo = { firstExamWithQuestions: 'JEE' }; // Default to JEE on error
    }
  }



  /**
   * Find which exam table a question UUID belongs to
   * Useful when we don't know the exam type explicitly
   */
  findQuestionTable(uuid: string): { table: string, exam: ExamType } | null {
    if (!this.db) return null;

    console.log(`[DB] findQuestionTable: Looking for UUID "${uuid}" (length: ${uuid.length})`);

    for (const exam of SUPPORTED_EXAMS) {
      try {
        const table = `${exam.toLowerCase()}_questions`;

        // Exact match
        const stmt = this.db.prepare(`SELECT 1 FROM ${table} WHERE uuid = ?`);
        const result = stmt.get(uuid);

        if (result) {
          console.log(`[DB] findQuestionTable: ${table} -> FOUND (exact match)`);
          return { table, exam };
        }

        // Check for partial match (if UUID is truncated)
        const likeStmt = this.db.prepare(`SELECT uuid FROM ${table} WHERE uuid LIKE ? LIMIT 1`);
        const likeResult = likeStmt.get(`%${uuid}%`) as { uuid: string } | undefined;

        if (likeResult) {
          console.log(`[DB] findQuestionTable: ${table} -> PARTIAL MATCH! DB has: "${likeResult.uuid}"`);
          // Use the full UUID from the database
          return { table, exam };
        }

        console.log(`[DB] findQuestionTable: ${table} -> not found`);
      } catch (e) {
        console.log(`[DB] findQuestionTable: ${exam.toLowerCase()}_questions table error`, e);
      }
    }

    return null;
  }

  ensureSchema(): void {
    if (!this.db) return;

    const newColumns: { [key: string]: string } = {
      'topic_tags': "TEXT",
      'importance_level': "TEXT",
      'verification_level_1': "TEXT DEFAULT 'pending'",
      'verification_level_2': "TEXT DEFAULT 'pending'",
      'jee_mains_relevance': "INTEGER",
      'is_multi_concept': "BOOLEAN DEFAULT 0",
      'related_concepts': "TEXT",
      'scary': "BOOLEAN DEFAULT 0",
      'calc': "BOOLEAN DEFAULT 0",
      'legacy_question': "TEXT",
      'legacy_a': "TEXT",
      'legacy_b': "TEXT",
      'legacy_c': "TEXT",
      'legacy_d': "TEXT",
      'legacy_solution': "TEXT",
      'links': "TEXT",
      'division_override': "INTEGER",  // null = auto-detect, 1 = force Div1, 2 = force Div2
      'class': "INTEGER"  // null, 1, or 2 - for auto-selection preset distribution
    };


    // List of all possible question tables to check (exam-specific only)
    const tablesToCheck = [
      'jee_questions',       // JEE exam table
      'neet_questions',      // NEET exam table
      'bits_questions'       // BITS exam table
      // Note: ipq_questions is handled separately in createIPQTables()
    ];

    for (const tableName of tablesToCheck) {
      try {
        // Check if table exists
        const columns = this.db.pragma(`table_info(${tableName})`) as { name: string }[];

        if (columns.length === 0) {
          // Table doesn't exist, skip
          continue;
        }

        console.log(`[DB] Ensuring schema for table: ${tableName}`);
        const columnNames = new Set(columns.map(c => c.name));

        for (const [colName, colDef] of Object.entries(newColumns)) {
          if (!columnNames.has(colName)) {
            console.log(`[DB] Adding missing column to ${tableName}: ${colName}`);
            this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDef}`);
          }
        }
      } catch (error) {
        console.error(`[DB] Error checking/updating schema for ${tableName}:`, error);
      }
    }
    console.log('[DB] Schema check complete for all tables');

    // Cleanup legacy triggers referencing missing backup table
    try {
      const badTriggers = this.db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND sql LIKE '%questions_backup%'").all() as { name: string }[];
      for (const trigger of badTriggers) {
        console.log(`[DB] Dropping invalid trigger: ${trigger.name}`);
        this.db.exec(`DROP TRIGGER IF EXISTS ${trigger.name}`);
      }
    } catch (error) {
      console.error('[DB] Error cleaning up triggers:', error);
    }
  }

  createSolutionTable(): void {
    if (!this.db) return;

    // Create legacy solutions table (for backwards compatibility)
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS solutions(
    uuid TEXT PRIMARY KEY,
    solution_text TEXT,
    solution_image_url TEXT,
    FOREIGN KEY(uuid) REFERENCES questions(uuid) ON DELETE CASCADE
  );
`);
      console.log('[DB] Legacy solutions table checked/created');
    } catch (error) {
      console.error('[DB] Error creating legacy solutions table:', error);
    }

    // Create exam-specific solutions tables
    const examTables = ['jee', 'neet', 'bits'];
    for (const exam of examTables) {
      try {
        const questionsTable = `${exam}_questions`;
        const solutionsTable = `${exam}_solutions`;

        // Check if the corresponding questions table exists first
        const tableInfo = this.db.pragma(`table_info(${questionsTable})`) as any[];
        if (tableInfo.length === 0) {
          // Questions table doesn't exist, skip creating solutions table
          continue;
        }

        // Check if solutions table already exists
        const solutionsTableInfo = this.db.pragma(`table_info(${solutionsTable})`) as any[];

        if (solutionsTableInfo.length > 0) {
          // Table exists - check if FK constraint is correct
          const fkInfo = this.db.pragma(`foreign_key_list(${solutionsTable})`) as any[];
          const hasCorrectFK = fkInfo.some((fk: any) => fk.table === questionsTable);

          if (!hasCorrectFK) {
            console.log(`[DB] ${solutionsTable} has incorrect FK, recreating with correct FK to ${questionsTable}...`);

            // Backup existing data
            const existingData = this.db.prepare(`SELECT * FROM ${solutionsTable}`).all();
            console.log(`[DB] Backing up ${existingData.length} solutions from ${solutionsTable}`);

            // Drop and recreate with correct FK
            this.db.exec(`DROP TABLE ${solutionsTable}`);
            this.db.exec(`
              CREATE TABLE ${solutionsTable}(
          uuid TEXT PRIMARY KEY,
          solution_text TEXT,
          solution_image_url TEXT,
          FOREIGN KEY(uuid) REFERENCES ${questionsTable}(uuid) ON DELETE CASCADE
        );
      `);

            // Restore data (only for UUIDs that exist in the correct questions table)
            if (existingData.length > 0) {
              const insertStmt = this.db.prepare(`
                INSERT OR IGNORE INTO ${solutionsTable} (uuid, solution_text, solution_image_url)
                SELECT ?, ?, ?
                WHERE EXISTS (SELECT 1 FROM ${questionsTable} WHERE uuid = ?)
              `);

              let restored = 0;
              for (const row of existingData as any[]) {
                const result = insertStmt.run(row.uuid, row.solution_text, row.solution_image_url, row.uuid);
                if (result.changes > 0) restored++;
              }
              console.log(`[DB] Restored ${restored}/${existingData.length} solutions to ${solutionsTable}`);
            }

            console.log(`[DB] ${solutionsTable} recreated with correct FK to ${questionsTable}`);
          } else {
            console.log(`[DB] ${solutionsTable} already has correct FK constraint`);
          }
        } else {
          // Create new table
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS ${solutionsTable}(
        uuid TEXT PRIMARY KEY,
        solution_text TEXT,
        solution_image_url TEXT,
        FOREIGN KEY(uuid) REFERENCES ${questionsTable}(uuid) ON DELETE CASCADE
      );
    `);
          console.log(`[DB] ${solutionsTable} table created`);
        }
      } catch (error) {
        console.error(`[DB] Error creating/migrating ${exam}_solutions table:`, error);
      }
    }
  }

  /**
   * Create IPQ (Independent Parent Questions) tables
   * These tables store questions derived from parent questions with their source exam tracked
   */
  createIPQTables(): void {
    if (!this.db) return;
    try {
      // Create ipq_questions table with same schema as exam tables + parent_exam column
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS ipq_questions(
  uuid TEXT PRIMARY KEY,
  question TEXT,
  question_image_url TEXT,
  option_a TEXT,
  option_a_image_url TEXT,
  option_b TEXT,
  option_b_image_url TEXT,
  option_c TEXT,
  option_c_image_url TEXT,
  option_d TEXT,
  option_d_image_url TEXT,
  answer TEXT NOT NULL,
  type TEXT,
  year TEXT,
  tag_1 TEXT,
  tag_2 TEXT,
  tag_3 TEXT,
  tag_4 TEXT,
  topic_tags TEXT,
  importance_level TEXT,
  verification_level_1 TEXT DEFAULT 'pending',
  verification_level_2 TEXT DEFAULT 'pending',
  jee_mains_relevance INTEGER,
  is_multi_concept BOOLEAN DEFAULT 0,
  related_concepts TEXT,
  scary BOOLEAN DEFAULT 0,
  calc BOOLEAN DEFAULT 0,
  legacy_question TEXT,
  legacy_a TEXT,
  legacy_b TEXT,
  legacy_c TEXT,
  legacy_d TEXT,
  legacy_solution TEXT,
  links TEXT,
  created_at TEXT,
  updated_at TEXT,
  frequency INTEGER DEFAULT 0,
  parent_exam TEXT NOT NULL,
  division_override INTEGER,
  class INTEGER
);
`);
      console.log('[DB] IPQ questions table checked/created');

      // Create ipq_solutions table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS ipq_solutions(
  uuid TEXT PRIMARY KEY,
  solution_text TEXT,
  solution_image_url TEXT,
  FOREIGN KEY(uuid) REFERENCES ipq_questions(uuid) ON DELETE CASCADE
);
`);
      console.log('[DB] IPQ solutions table checked/created');
    } catch (error) {
      console.error('[DB] Error creating IPQ tables:', error);
    }

    // Migration: Ensure parent_exam column exists in ipq_questions (if table existed from before)
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info(ipq_questions)").all() as any[];
      const hasParentExam = tableInfo.some(col => col.name === 'parent_exam');
      if (!hasParentExam) {
        console.log('[DB] Migrating ipq_questions: adding parent_exam column');
        this.db.prepare("ALTER TABLE ipq_questions ADD COLUMN parent_exam TEXT").run();
      }
    } catch (e) { /* ignore */ }

    // Migration: REMOVE parent_exam column from ipq_solutions if it exists (refactoring request)
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info(ipq_solutions)").all() as any[];
      const hasParentExam = tableInfo.some(col => col.name === 'parent_exam');
      if (hasParentExam) {
        console.log('[DB] Migrating ipq_solutions: dropping parent_exam column');
        this.db.prepare("ALTER TABLE ipq_solutions DROP COLUMN parent_exam").run();
      }
    } catch (e) {
      console.error('[DB] Error dropping parent_exam from ipq_solutions:', e);
    }

    // Migration: Add division_override column if it doesn't exist
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info(ipq_questions)").all() as any[];
      const hasDivisionOverride = tableInfo.some(col => col.name === 'division_override');
      if (!hasDivisionOverride) {
        console.log('[DB] Migrating ipq_questions: adding division_override column');
        this.db.prepare("ALTER TABLE ipq_questions ADD COLUMN division_override INTEGER").run();
      }
    } catch (e) {
      console.error('[DB] Error adding division_override to ipq_questions:', e);
    }

    // Migration: Add class column if it doesn't exist
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info(ipq_questions)").all() as any[];
      const hasClass = tableInfo.some(col => col.name === 'class');
      if (!hasClass) {
        console.log('[DB] Migrating ipq_questions: adding class column');
        this.db.prepare("ALTER TABLE ipq_questions ADD COLUMN class INTEGER").run();
      }
    } catch (e) {
      console.error('[DB] Error adding class to ipq_questions:', e);
    }
  }


  disconnect(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }

  isConnected(): boolean {
    return this.db !== null;
  }

  // ... (rest of simple connection methods)

  // ============ Question Methods ============

  // ... (keeping existing question methods)

  // This is a large file, jumping to saveIPQSolution ...


  /**
   * Get the status of exam-specific tables in the database
   * Checks for {exam}_questions and {exam}_solutions tables
   */
  getExamTablesStatus(): ExamTableStatus[] {
    if (!this.db) {
      // Return all as unavailable if not connected
      return SUPPORTED_EXAMS.map(exam => ({
        exam,
        hasQuestionsTable: false,
        hasSolutionsTable: false,
        isComplete: false
      }));
    }

    try {
      // Get all table names from the database
      const tables = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all() as { name: string }[];

      const tableNames = new Set(tables.map(t => t.name.toLowerCase()));

      console.log('[DB] Available tables:', Array.from(tableNames));

      return SUPPORTED_EXAMS.map(exam => {
        const questionsTable = `${exam.toLowerCase()}_questions`;
        const solutionsTable = `${exam.toLowerCase()}_solutions`;

        const hasQuestionsTable = tableNames.has(questionsTable);
        const hasSolutionsTable = tableNames.has(solutionsTable);

        console.log(`[DB] ${exam}: questions = ${hasQuestionsTable}, solutions = ${hasSolutionsTable} `);

        return {
          exam,
          hasQuestionsTable,
          hasSolutionsTable,
          isComplete: hasQuestionsTable && hasSolutionsTable
        };
      });
    } catch (error) {
      console.error('[DB] Error checking exam tables status:', error);
      return SUPPORTED_EXAMS.map(exam => ({
        exam,
        hasQuestionsTable: false,
        hasSolutionsTable: false,
        isComplete: false
      }));
    }
  }

  /**
   * Get all questions with optional filtering
   * @param filter - Optional filter criteria
   * @param exam - Optional exam type to query from specific exam table
   */
  getQuestions(filter?: QuestionFilter, exam?: ExamType): Question[] {
    if (!this.db) throw new Error('Database not connected');

    const table = getQuestionsTable(exam);
    let query = `SELECT * FROM ${table} WHERE 1 = 1`;
    const params: any[] = [];

    if (filter?.type) {
      query += ' AND type = ?';
      params.push(filter.type);
    }

    if (filter?.year) {
      query += ' AND year = ?';
      params.push(filter.year);
    }

    if (filter?.chapter) {
      // Assuming chapter is stored in tag_1 or tag_2
      query += ' AND (tag_1 = ? OR tag_2 = ?)';
      params.push(filter.chapter, filter.chapter);
    }

    if (filter?.tags && filter.tags.length > 0) {
      const tagConditions = filter.tags.map(() => '(tag_1 = ? OR tag_2 = ? OR tag_3 = ? OR tag_4 = ?)').join(' OR ');
      query += ` AND(${tagConditions})`;
      filter.tags.forEach(tag => {
        params.push(tag, tag, tag, tag);
      });
    }

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as Question[];
    return attachExamSourceToArray(results, exam, table);
  }

  /**
   * Get question by UUID
   * @param uuid - Question UUID
   * @param exam - Optional exam type to query from specific exam table
   */
  getQuestionByUUID(uuid: string, exam?: ExamType): Question | null {
    if (!this.db) throw new Error('Database not connected');

    const table = getQuestionsTable(exam);
    const stmt = this.db.prepare(`SELECT * FROM ${table} WHERE uuid = ? `);
    const result = stmt.get(uuid) as Question | undefined;
    return result ? attachExamSource(result, exam, table) : null;
  }

  /**
   * Get questions by UUIDs (batch)
   * @param uuids - Array of question UUIDs
   * @param exam - Optional exam type to query from specific exam table
   */
  getQuestionsByUUIDs(uuids: string[], exam?: ExamType): Question[] {
    if (!this.db) throw new Error('Database not connected');

    if (uuids.length === 0) {
      return [];
    }

    const table = getQuestionsTable(exam);
    const placeholders = uuids.map(() => '?').join(',');
    const query = `SELECT * FROM ${table} WHERE uuid IN(${placeholders})`;

    const stmt = this.db.prepare(query);
    const results = stmt.all(...uuids) as Question[];
    return attachExamSourceToArray(results, exam, table);
  }

  /**
   * Get questions by chapter codes (using tag_2)
   * Chapter codes are stored in tag_2 field (e.g., PHY01, CHE01, MAT01)
   * NOTE: Queries ONLY by tag_2, ignoring type field
   * @param type - The question type (currently ignored)
   * @param chapterCodes - Array of chapter codes to query
   * @param limit - Maximum number of questions to return (default 2000 to prevent memory exhaustion)
   * @param exam - Optional exam type to query from specific exam table
   */
  getQuestionsByChapterCodes(type: string, chapterCodes: string[], limit: number = 2000, exam?: ExamType): Question[] {
    if (!this.db) throw new Error('Database not connected');

    if (chapterCodes.length === 0) {
      console.log('[DB] No chapter codes provided');
      return [];
    }

    const table = getQuestionsTable(exam);
    const placeholders = chapterCodes.map(() => '?').join(',');
    // Query only by tag_2, ignore type field - with LIMIT to prevent memory exhaustion
    const query = `SELECT * FROM ${table} WHERE tag_2 IN(${placeholders}) LIMIT ? `;
    const params = [...chapterCodes, limit];

    console.log('[DB] Query:', query);
    console.log('[DB] Params:', params);
    console.log('[DB] Note: Ignoring type parameter:', type, '| Exam table:', table);

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as Question[];

    console.log('[DB] Results count:', results.length);

    // Debug: Show what's in the database if no results
    if (results.length === 0) {
      console.log('[DB] No results found. Checking database...');
      const allTag2 = this.db.prepare(`SELECT DISTINCT tag_2 FROM ${table} WHERE tag_2 IS NOT NULL LIMIT 20`).all();
      console.log('[DB] Sample tag_2 values in database:', allTag2);
    } else {
      console.log('[DB] Sample results:', results.slice(0, 2).map(q => ({ uuid: q.uuid, tag_2: q.tag_2, type: q.type })));
    }

    return attachExamSourceToArray(results, exam, table);
  }

  /**
   * Get ALL questions for a specific subject (by chapter codes) without limits or type filtering
   * Designed specifically for the Database Cleaning interface
   * @param chapterCodes - Array of chapter codes to query
   * @param exam - Optional exam type to query from specific exam table
   */
  getAllQuestionsForSubject(chapterCodes: string[], exam?: ExamType): Question[] {
    if (!this.db) throw new Error('Database not connected');

    if (chapterCodes.length === 0) {
      return [];
    }

    const table = getQuestionsTable(exam);
    const placeholders = chapterCodes.map(() => '?').join(',');
    // Query specifically for all questions matching the provided chapter codes
    // No LIMIT, No type check - absolute retrieval based on chapter association
    const query = `SELECT * FROM ${table} WHERE tag_2 IN(${placeholders})`;

    console.log('[DB] getAllQuestionsForSubject Query:', query, '| Table:', table);

    const stmt = this.db.prepare(query);
    const results = stmt.all(...chapterCodes) as Question[];

    console.log(`[DB] Retrieved ${results.length} questions for subject cleaning`);
    return attachExamSourceToArray(results, exam, table);
  }

  /**
   * Get all unique values for a column
   * @param column - Column name to get unique values from
   * @param exam - Optional exam type to query from specific exam table
   */
  getUniqueValues(column: string, exam?: ExamType): string[] {
    if (!this.db) throw new Error('Database not connected');

    const table = getQuestionsTable(exam);
    const stmt = this.db.prepare(`SELECT DISTINCT ${column} FROM ${table} WHERE ${column} IS NOT NULL ORDER BY ${column} `);
    const results = stmt.all() as any[];
    return results.map(row => row[column]);
  }

  /**
   * Get all unique types (Physics, Chemistry, Mathematics)
   */
  getTypes(): string[] {
    return this.getUniqueValues('type');
  }

  /**
   * Get all unique years
   */
  getYears(): string[] {
    return this.getUniqueValues('year');
  }

  /**
   * Get all unique tags (combined from all tag columns)
   */
  getTags(): string[] {
    if (!this.db) throw new Error('Database not connected');

    const tags = new Set<string>();

    for (let i = 1; i <= 4; i++) {
      const column = `tag_${i} `;
      const values = this.getUniqueValues(column);
      values.forEach(tag => tags.add(tag));
    }

    return Array.from(tags).sort();
  }

  /**
   * Get questions filtered by multiple criteria
   * @param criteria - Search criteria
   * @param exam - Optional exam type to query from specific exam table
   */
  searchQuestions(criteria: {
    type?: string;
    year?: string;
    chapter?: string;
    searchText?: string;
  }, exam?: ExamType): Question[] {
    if (!this.db) throw new Error('Database not connected');

    const table = getQuestionsTable(exam);
    let query = `SELECT * FROM ${table} WHERE 1 = 1`;
    const params: any[] = [];

    if (criteria.type) {
      query += ' AND type = ?';
      params.push(criteria.type);
    }

    if (criteria.year) {
      query += ' AND year = ?';
      params.push(criteria.year);
    }

    if (criteria.chapter) {
      query += ' AND (tag_1 = ? OR tag_2 = ?)';
      params.push(criteria.chapter, criteria.chapter);
    }

    if (criteria.searchText) {
      query += ' AND (question LIKE ? OR option_a LIKE ? OR option_b LIKE ? OR option_c LIKE ? OR option_d LIKE ?)';
      const searchPattern = `% ${criteria.searchText}% `;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as Question[];
    return attachExamSourceToArray(results, exam, table);
  }

  /**
   * Get count of questions matching criteria
   * @param filter - Optional filter criteria
   * @param exam - Optional exam type to query from specific exam table
   */
  getQuestionCount(filter?: QuestionFilter, exam?: ExamType): number {
    if (!this.db) throw new Error('Database not connected');

    const table = getQuestionsTable(exam);
    let query = `SELECT COUNT(*) as count FROM ${table} WHERE 1 = 1`;
    const params: any[] = [];

    if (filter?.type) {
      query += ' AND type = ?';
      params.push(filter.type);
    }

    if (filter?.year) {
      query += ' AND year = ?';
      params.push(filter.year);
    }

    if (filter?.chapter) {
      query += ' AND (tag_1 = ? OR tag_2 = ?)';
      params.push(filter.chapter, filter.chapter);
    }

    const stmt = this.db.prepare(query);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  /**
   * Get question counts for all exam tables
   * Returns total count and breakdown by exam type
   */
  getAllExamCounts(): { total: number; breakdown: { exam: string; count: number }[] } {
    if (!this.db) throw new Error('Database not connected');

    const breakdown: { exam: string; count: number }[] = [];
    let total = 0;

    // Get exam tables status to know which tables exist
    const tablesStatus = this.getExamTablesStatus();

    for (const status of tablesStatus) {
      if (status.hasQuestionsTable) {
        try {
          const table = `${status.exam.toLowerCase()}_questions`;
          const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table} `);
          const result = stmt.get() as { count: number };
          breakdown.push({ exam: status.exam, count: result.count });
          total += result.count;
        } catch (error) {
          console.error(`[DB] Error counting ${status.exam} questions: `, error);
          breakdown.push({ exam: status.exam, count: 0 });
        }
      }
    }



    console.log('[DB] All exam counts:', { total, breakdown });
    return { total, breakdown };
  }


  /**
   * Get all available chapter codes from database (tag_2 field) grouped by type
   * Returns actual codes from your database with normalized lowercase type keys
   * @param exam - Optional exam type to query from specific exam table
   */
  getChaptersByType(exam?: ExamType): { [type: string]: string[] } {
    if (!this.db) throw new Error('Database not connected');

    const table = getQuestionsTable(exam);
    console.log('[DB] Loading chapters from database...', '| Table:', table);

    const query = `
      SELECT DISTINCT type, tag_2
      FROM ${table}
      WHERE tag_2 IS NOT NULL AND tag_2 != ''
      ORDER BY type, tag_2
  `;

    const rows = this.db.prepare(query).all() as { type: string; tag_2: string }[];

    console.log('[DB] Found', rows.length, 'unique chapter codes in database');
    if (rows.length > 0) {
      console.log('[DB] Sample rows:', rows.slice(0, 5));
    }

    const chaptersByType: { [type: string]: string[] } = {};

    rows.forEach(row => {
      // Normalize type to lowercase for consistent matching
      const normalizedType = row.type.toLowerCase();
      if (!chaptersByType[normalizedType]) {
        chaptersByType[normalizedType] = [];
      }
      chaptersByType[normalizedType].push(row.tag_2);
    });

    console.log('[DB] Chapters by type (normalized):', JSON.stringify(chaptersByType, null, 2));

    return chaptersByType;
  }

  /**
   * Increment the frequency of a question by 1
   * If frequency is NULL, set it to 1
   * Auto-detects exam table if not provided
   * @param uuid - Question UUID
   * @param exam - Optional exam type to update in specific exam table
   */
  incrementFrequency(uuid: string, exam?: ExamType): boolean {
    if (!this.db) throw new Error('Database not connected');

    try {
      let table = getQuestionsTable(exam);

      // Auto-detect table if exam type is not provided
      if (!exam) {
        const found = this.findQuestionTable(uuid);
        if (found) {
          table = found.table;
          console.log(`[DB] Auto-detected table '${table}' for frequency update on ${uuid}`);
        }
      }

      const stmt = this.db.prepare(`
        UPDATE ${table}
        SET frequency = COALESCE(frequency, 0) + 1,
  updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ?
  `);
      const result = stmt.run(uuid);
      console.log(`[DB] Incremented frequency for question ${uuid} in ${table}, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error incrementing frequency for ${uuid}:`, error);
      return false;
    }
  }

  /**
   * Clone a question: duplicates it with a new UUID and links to the original
   * @param originalUuid - UUID of the question to clone
   * @param exam - Optional exam type to clone within specific exam table
   */
  cloneQuestion(originalUuid: string, exam?: ExamType): Question | null {
    if (!this.db) throw new Error('Database not connected');

    try {
      const original = this.getQuestionByUUID(originalUuid, exam);
      if (!original) return null;

      // Generate new UUID (simple random string for now, preferably use crypto or uuid lib in main)
      const newUuid = crypto.randomUUID();

      // Prepare new question object
      const newQuestion: Question = {
        ...original,
        uuid: newUuid,
        links: JSON.stringify([originalUuid]), // Link to original
        frequency: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        verification_level_1: 'pending',
        verification_level_2: 'pending'
      };

      // Insert into DB (same exam table as original)
      const success = this.createQuestion(newQuestion, exam);
      if (!success) return null;

      // Also clone the solution if it exists
      const solution = this.getSolution(originalUuid, exam);
      if (solution) {
        this.saveSolution(newUuid, solution.solution_text, solution.solution_image_url, exam);
      }

      return newQuestion;
    } catch (error) {
      console.error(`[DB] Error cloning question ${originalUuid}: `, error);
      return null;
    }
  }

  /**
   * Decrement the frequency of a question by 1
   * Ensures frequency doesn't go below 0
   * Auto-detects exam table if not provided
   * @param uuid - Question UUID
   * @param exam - Optional exam type to update in specific exam table
   */
  decrementFrequency(uuid: string, exam?: ExamType): boolean {
    if (!this.db) throw new Error('Database not connected');

    try {
      let table = getQuestionsTable(exam);

      // Auto-detect table if exam type is not provided
      if (!exam) {
        const found = this.findQuestionTable(uuid);
        if (found) {
          table = found.table;
          console.log(`[DB] Auto-detected table '${table}' for frequency decrement on ${uuid}`);
        }
      }

      const stmt = this.db.prepare(`
        UPDATE ${table}
        SET frequency = MAX(COALESCE(frequency, 0) - 1, 0),
  updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ?
  `);
      const result = stmt.run(uuid);
      console.log(`[DB] Decremented frequency for question ${uuid} in ${table}, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error decrementing frequency for ${uuid}:`, error);
      return false;
    }
  }

  /**
   * Batch update frequencies for multiple questions
   * Professional-grade method for efficient bulk updates
   * @param uuids - Array of question UUIDs to update
   * @param delta - Amount to change frequency (positive to increment, negative to decrement)
   * @param exam - Exam type for the questions (all must be from same exam)
   */
  batchUpdateFrequencies(uuids: string[], delta: number, exam: ExamType): { success: boolean; updatedCount: number } {
    if (!this.db) throw new Error('Database not connected');

    if (uuids.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    try {
      const table = getQuestionsTable(exam);
      let updatedCount = 0;

      // Use transaction for atomicity and performance
      const updateStmt = this.db.prepare(`
        UPDATE ${table}
        SET frequency = MAX(COALESCE(frequency, 0) + ?, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ?
      `);

      const transaction = this.db.transaction((uuidList: string[]) => {
        for (const uuid of uuidList) {
          const result = updateStmt.run(delta, uuid);
          if (result.changes > 0) updatedCount++;
        }
      });

      transaction(uuids);

      console.log(`[DB] Batch updated frequencies for ${updatedCount}/${uuids.length} questions in ${table}, delta: ${delta}`);
      return { success: true, updatedCount };
    } catch (error) {
      console.error(`[DB] Error batch updating frequencies:`, error);
      return { success: false, updatedCount: 0 };
    }
  }

  /**
   * Update question properties
   * @param uuid - Question UUID
   * @param updates - Partial question object with fields to update
   * @param exam - Optional exam type to update in specific exam table
   */
  updateQuestion(uuid: string, updates: Partial<Question>, exam?: ExamType): boolean {
    if (!this.db) throw new Error('Database not connected');

    try {
      let table = getQuestionsTable(exam);

      // Auto-detect table if exam type is not explicitly provided (or default/legacy)
      // This fixes the issue where editing an IPQ (or other) question without explicit exam type
      // attempts to update the default 'jee_questions' table, potentially returning 0 changes
      // or causing confusion.
      if (!exam) {
        const found = this.findQuestionTable(uuid);
        if (found) {
          table = found.table;
          console.log(`[DB] Auto - detected table '${table}' for question ${uuid}`);
        }
      }

      const allowedFields = [
        'question', 'question_image_url',
        'option_a', 'option_a_image_url',
        'option_b', 'option_b_image_url',
        'option_c', 'option_c_image_url',
        'option_d', 'option_d_image_url',
        'answer',
        'type', 'year',
        'tag_1', 'tag_2', 'tag_3', 'tag_4',
        'topic_tags', 'importance_level',
        'verification_level_1', 'verification_level_2',
        'jee_mains_relevance', 'is_multi_concept', 'related_concepts',
        'scary', 'calc',
        'legacy_question', 'legacy_a', 'legacy_b', 'legacy_c', 'legacy_d', 'legacy_solution',
        'links',
        'division_override'
      ];

      const setClauses: string[] = [];
      const params: any[] = [];

      for (const field of allowedFields) {
        // @ts-ignore - Dynamic access to allowed fields
        if (updates[field] !== undefined) {
          setClauses.push(`${field} = ?`);
          // @ts-ignore
          let value = updates[field];

          // Convert booleans to 0/1
          if (typeof value === 'boolean') {
            value = value ? 1 : 0;
          }
          // Stringify objects if needed
          else if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          }

          params.push(value);
        }
      }

      if (setClauses.length === 0) {
        console.log('[DB] No updates to apply');
        return false;
      }

      // Always update timestamp
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      params.push(uuid);

      const query = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE uuid = ? `;
      console.log('[DB] Update query:', query, 'params:', params);

      const stmt = this.db.prepare(query);
      const result = stmt.run(...params);
      console.log(`[DB] Updated question ${uuid} in ${table}, changes: ${result.changes} `);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error updating question ${uuid}: `, error);
      return false;
    }
  }

  /**
   * Bulk update question properties
   * @param uuids - Array of question UUIDs to update
   * @param updates - Partial question object with fields to update
   * @param exam - Optional exam type to update in specific exam table
   */
  bulkUpdateQuestions(uuids: string[], updates: Partial<Question>, exam?: ExamType): { success: boolean, updatedCount: number } {
    if (!this.db) throw new Error('Database not connected');
    if (uuids.length === 0) return { success: true, updatedCount: 0 };

    try {
      const table = getQuestionsTable(exam);
      const allowedFields = [
        'type', 'year',
        'tag_1', 'tag_2', 'tag_3', 'tag_4',
        'topic_tags', 'importance_level',
        'verification_level_1', 'verification_level_2',
        'jee_mains_relevance', 'is_multi_concept', 'related_concepts',
        'scary', 'calc'
      ];

      // Filter updates to only include allowed fields
      const filteredUpdates: Partial<Question> = {};
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          // @ts-ignore
          filteredUpdates[key] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        console.log('[DB] No valid updates for bulk operation');
        return { success: false, updatedCount: 0 };
      }

      const setClauses: string[] = [];
      const params: any[] = [];

      for (const [key, value] of Object.entries(filteredUpdates)) {
        setClauses.push(`${key} = ?`);

        let val = value;
        // Convert booleans to 0/1
        if (typeof val === 'boolean') {
          val = val ? 1 : 0;
        }
        // Stringify objects if needed
        else if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        }

        params.push(val);
      }
      setClauses.push('updated_at = CURRENT_TIMESTAMP');

      const placeholders = uuids.map(() => '?').join(',');
      params.push(...uuids);

      const query = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE uuid IN(${placeholders})`;
      console.log('[DB] Bulk Update query:', query, 'params count:', params.length);

      const stmt = this.db.prepare(query);
      const result = stmt.run(...params);

      console.log(`[DB] Bulk updated ${result.changes} questions in ${table} `);
      return { success: true, updatedCount: result.changes };

    } catch (error) {
      console.error('[DB] Error in bulk update:', error);
      return { success: false, updatedCount: 0 };
    }
  }

  /**
   * Create a new question
   * @param question - Question object to create
   * @param exam - Optional exam type to insert into specific exam table
   */
  createQuestion(question: Question, exam?: ExamType): boolean {
    if (!this.db) throw new Error('Database not connected');

    try {
      const table = getQuestionsTable(exam);
      const keys = [
        'uuid',
        'question', 'question_image_url',
        'option_a', 'option_a_image_url',
        'option_b', 'option_b_image_url',
        'option_c', 'option_c_image_url',
        'option_d', 'option_d_image_url',
        'answer',
        'type', 'year',
        'tag_1', 'tag_2', 'tag_3', 'tag_4',
        'topic_tags', 'importance_level',
        'verification_level_1', 'verification_level_2',
        'jee_mains_relevance', 'is_multi_concept', 'related_concepts',
        'scary', 'calc',
        'legacy_question', 'legacy_a', 'legacy_b', 'legacy_c', 'legacy_d', 'legacy_solution',
        'links',
        'created_at', 'updated_at', 'frequency'
      ];

      const placeholders = keys.map(() => '?').join(', ');
      const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES(${placeholders})`;

      const params = keys.map(key => {
        // @ts-ignore
        const value = question[key];

        // Convert booleans to 0/1 for SQLite
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }

        // Safety: Stringify objects/arrays (e.g. for JSON fields)
        if (typeof value === 'object' && value !== null) {
          // Assuming Buffer is handled correctly by better-sqlite3 or not present here
          return JSON.stringify(value);
        }

        return value !== undefined ? value : null;
      });

      const stmt = this.db.prepare(query);
      const result = stmt.run(...params);
      console.log(`[DB] Created question ${question.uuid} in ${table}, changes: ${result.changes} `);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error creating question ${question.uuid}: `, error);
      return false;
    }
  }

  /**
   * Get solution by question UUID
   * 
   * ARCHITECTURE: Always determines the correct solutions table by looking up
   * where the question actually exists in the database.
   * 
   * @param uuid - Question UUID
   * @param exam - Optional exam type hint (used as fallback, not primary lookup)
   */
  getSolution(uuid: string, exam?: ExamType): { uuid: string, solution_text: string, solution_image_url: string } | null {
    if (!this.db) throw new Error('Database not connected');

    // STEP 1: Find where the question actually exists
    const questionLocation = this.findQuestionTable(uuid);

    if (!questionLocation) {
      console.log(`[DB] getSolution: Question ${uuid} not found, cannot determine solutions table`);
      // Fallback: try the passed exam param or default
      const fallbackTable = getSolutionsTable(exam);
      try {
        const stmt = this.db.prepare(`SELECT * FROM ${fallbackTable} WHERE uuid = ?`);
        return (stmt.get(uuid) as { uuid: string, solution_text: string, solution_image_url: string }) || null;
      } catch (e) {
        return null;
      }
    }

    // STEP 2: Use the correct solutions table
    const solutionsTable = `${questionLocation.exam.toLowerCase()}_solutions`;

    try {
      const stmt = this.db.prepare(`SELECT * FROM ${solutionsTable} WHERE uuid = ?`);
      return (stmt.get(uuid) as { uuid: string, solution_text: string, solution_image_url: string }) || null;
    } catch (error) {
      console.error(`[DB] Error getting solution from ${solutionsTable}:`, error);
      return null;
    }
  }

  /**
   * Get solutions by multiple UUIDs (batch) - more efficient than calling getSolution multiple times
   * @param uuids - Array of question UUIDs
   * @param exam - Optional exam type to query from specific exam solutions table
   */
  getSolutionsByUUIDs(uuids: string[], exam?: ExamType): Map<string, { uuid: string, solution_text: string, solution_image_url: string }> {
    if (!this.db) throw new Error('Database not connected');

    // Batch fetch solutions
    const solutionsMap = new Map<string, { uuid: string, solution_text: string, solution_image_url: string }>();

    if (uuids.length === 0) {
      return solutionsMap;
    }

    // If exam is specified, only query that table
    if (exam) {
      const table = getSolutionsTable(exam);
      const placeholders = uuids.map(() => '?').join(',');
      const query = `SELECT * FROM ${table} WHERE uuid IN(${placeholders})`;
      try {
        const stmt = this.db.prepare(query);
        const results = stmt.all(...uuids) as { uuid: string, solution_text: string, solution_image_url: string }[];
        for (const solution of results) {
          solutionsMap.set(solution.uuid, solution);
        }
      } catch (error) {
        console.error(`[DB] Error fetching solutions from ${table}:`, error);
      }
      return solutionsMap;
    }

    // If no exam specified, query ALL solution tables to find solutions
    const tables = ['jee_solutions', 'neet_solutions', 'bits_solutions', 'ipq_solutions'];
    const placeholders = uuids.map(() => '?').join(',');

    for (const table of tables) {
      try {
        const query = `SELECT * FROM ${table} WHERE uuid IN(${placeholders})`;
        const stmt = this.db.prepare(query);
        const results = stmt.all(...uuids) as { uuid: string, solution_text: string, solution_image_url: string }[];
        for (const solution of results) {
          // Only add if not already found (first match wins)
          if (!solutionsMap.has(solution.uuid)) {
            solutionsMap.set(solution.uuid, solution);
          }
        }
      } catch (error) {
        // Table might not exist, skip silently
        console.log(`[DB] Skipping solutions table ${table} (may not exist)`);
      }
    }

    return solutionsMap;
  }

  /**
   * Save solution (insert or update)
   * 
   * ARCHITECTURE: Always determines the correct solutions table by looking up
   * where the question actually exists in the database. This ensures FK constraints
   * are satisfied regardless of what exam parameter is passed.
   * 
   * @param uuid - Question UUID
   * @param solutionText - Solution text content
   * @param solutionImageUrl - Solution image URL
   * @param exam - Optional exam type hint (used as fallback, not primary lookup)
   */
  saveSolution(uuid: string, solutionText: string, solutionImageUrl: string, exam?: ExamType): boolean {
    if (!this.db) throw new Error('Database not connected');

    console.log(`[DB] ========== saveSolution START ==========`);
    console.log(`[DB] UUID: ${uuid}, Exam hint: ${exam}`);

    try {
      // STEP 1: Try to find where the question actually exists
      let questionLocation = this.findQuestionTable(uuid);
      let solutionsTable: string;

      if (!questionLocation) {
        // Question not found in database - use exam hint as fallback
        // This handles the case where question exists in project state but not in database
        if (exam && exam !== 'IPQ') {
          console.log(`[DB] Question ${uuid} not found in DB, using exam hint: ${exam}`);
          solutionsTable = `${exam.toLowerCase()}_solutions`;
        } else {
          console.error(`[DB] FATAL: Question ${uuid} not found and no valid exam hint provided`);
          console.error(`[DB] Cannot save solution - no matching question exists`);
          return false;
        }
      } else {
        console.log(`[DB] Question found in: ${questionLocation.table} (exam: ${questionLocation.exam})`);
        // STEP 2: Determine the correct solutions table based on where question exists
        solutionsTable = `${questionLocation.exam.toLowerCase()}_solutions`;
      }

      console.log(`[DB] Target solutions table: ${solutionsTable}`);

      // STEP 3: Ensure the solutions table exists
      try {
        const tableExists = this.db.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).get(solutionsTable);

        if (!tableExists) {
          // Determine the questions table for FK reference
          const questionsTableForFK = questionLocation
            ? questionLocation.table
            : `${exam!.toLowerCase()}_questions`;

          console.log(`[DB] Creating missing solutions table: ${solutionsTable}`);
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS ${solutionsTable}(
              uuid TEXT PRIMARY KEY,
              solution_text TEXT,
              solution_image_url TEXT,
              FOREIGN KEY(uuid) REFERENCES ${questionsTableForFK}(uuid) ON DELETE CASCADE
            )
          `);
        }
      } catch (tableError) {
        console.error(`[DB] Error ensuring solutions table exists:`, tableError);
      }

      // STEP 4: Insert or update the solution
      const stmt = this.db.prepare(`
        INSERT INTO ${solutionsTable} (uuid, solution_text, solution_image_url)
        VALUES (?, ?, ?)
        ON CONFLICT(uuid) DO UPDATE SET
          solution_text = excluded.solution_text,
          solution_image_url = excluded.solution_image_url
      `);

      const result = stmt.run(uuid, solutionText, solutionImageUrl);
      console.log(`[DB] Solution saved to ${solutionsTable}, changes: ${result.changes}`);
      console.log(`[DB] ========== saveSolution SUCCESS ==========`);

      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] ========== saveSolution FAILED ==========`);
      console.error(`[DB] Error saving solution for ${uuid}:`, error);
      return false;
    }
  }

  // ============ IPQ (Independent Parent Questions) Methods ============

  /**
   * Create an IPQ question with parent exam tracking
   * @param question - Question object to create
   * @param parentExam - The exam type of the parent question (JEE, NEET, BITS)
   */
  createIPQQuestion(question: Question, parentExam: ExamType): boolean {
    if (!this.db) throw new Error('Database not connected');

    try {
      const keys = [
        'uuid',
        'question', 'question_image_url',
        'option_a', 'option_a_image_url',
        'option_b', 'option_b_image_url',
        'option_c', 'option_c_image_url',
        'option_d', 'option_d_image_url',
        'answer',
        'type', 'year',
        'tag_1', 'tag_2', 'tag_3', 'tag_4',
        'topic_tags', 'importance_level',
        'verification_level_1', 'verification_level_2',
        'jee_mains_relevance', 'is_multi_concept', 'related_concepts',
        'scary', 'calc',
        'legacy_question', 'legacy_a', 'legacy_b', 'legacy_c', 'legacy_d', 'legacy_solution',
        'links',
        'created_at', 'updated_at', 'frequency',
        'parent_exam',
        'division_override',
        'class'
      ];

      const placeholders = keys.map(() => '?').join(', ');
      const query = `INSERT INTO ipq_questions(${keys.join(', ')}) VALUES(${placeholders})`;

      const params = keys.map(key => {
        if (key === 'parent_exam') return parentExam;

        // @ts-ignore
        const value = question[key];

        // Convert booleans to 0/1 for SQLite
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }

        // Safety: Stringify objects/arrays (e.g. for JSON fields)
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }

        return value !== undefined ? value : null;
      });

      const stmt = this.db.prepare(query);
      const result = stmt.run(...params);
      console.log(`[DB] Created IPQ question ${question.uuid} with parent_exam = ${parentExam}, changes: ${result.changes} `);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error creating IPQ question ${question.uuid}: `, error);
      return false;
    }
  }

  /**
   * Save IPQ solution (insert or update)
   * @param uuid - Question UUID
   * @param solutionText - Solution text content
   * @param solutionImageUrl - Solution image URL
   */
  saveIPQSolution(uuid: string, solutionText: string, solutionImageUrl: string): boolean {
    if (!this.db) throw new Error('Database not connected');
    try {
      // Debug logging to trace values
      console.log('[DB] saveIPQSolution called with:');
      console.log('  uuid:', uuid);
      console.log('  solutionText:', solutionText ? `"${solutionText.substring(0, 100)}..."` : '(empty)');
      console.log('  solutionImageUrl:', solutionImageUrl || '(empty)');

      const stmt = this.db.prepare(`
        INSERT INTO ipq_solutions(uuid, solution_text, solution_image_url)
VALUES(?, ?, ?)
        ON CONFLICT(uuid) DO UPDATE SET
solution_text = excluded.solution_text,
  solution_image_url = excluded.solution_image_url
    `);
      const result = stmt.run(uuid, solutionText, solutionImageUrl);
      console.log(`[DB] Saved IPQ solution for ${uuid}, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error saving IPQ solution for ${uuid}: `, error);
      return false;
    }
  }

  /**
   * Get IPQ questions, optionally filtered by parent exam
   * @param parentExam - Optional filter by parent exam type
   */
  getIPQQuestions(parentExam?: ExamType): Question[] {
    if (!this.db) throw new Error('Database not connected');

    try {
      let query = 'SELECT * FROM ipq_questions';
      const params: any[] = [];

      if (parentExam) {
        query += ' WHERE parent_exam = ?';
        params.push(parentExam);
      }

      const stmt = this.db.prepare(query);
      const results = stmt.all(...params) as (Question & { parent_exam: ExamType })[];
      console.log(`[DB] Retrieved ${results.length} IPQ questions${parentExam ? ` for parent_exam=${parentExam}` : ''} `);

      return results.map(q => ({
        ...q,
        examSource: 'IPQ' as ExamType
      }));
    } catch (error) {
      console.error('[DB] Error getting IPQ questions:', error);
      return [];
    }
  }

  /**
   * Get IPQ solution by UUID
   * @param uuid - Question UUID
   */
  getIPQSolution(uuid: string): { uuid: string, solution_text: string, solution_image_url: string } | null {
    if (!this.db) throw new Error('Database not connected');
    try {
      const stmt = this.db.prepare('SELECT * FROM ipq_solutions WHERE uuid = ?');
      return (stmt.get(uuid) as { uuid: string, solution_text: string, solution_image_url: string }) || null;
    } catch (error) {
      console.error(`[DB] Error getting IPQ solution for ${uuid}: `, error);
      return null;
    }
  }

  /**
   * Get count of IPQ questions, optionally filtered by parent exam
   * @param parentExam - Optional filter by parent exam type
   */
  getIPQCount(parentExam?: ExamType): number {
    if (!this.db) throw new Error('Database not connected');

    try {
      let query = 'SELECT COUNT(*) as count FROM ipq_questions';
      const params: any[] = [];

      if (parentExam) {
        query += ' WHERE parent_exam = ?';
        params.push(parentExam);
      }

      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as { count: number };
      return result.count;
    } catch (error) {
      console.error('[DB] Error counting IPQ questions:', error);
      return 0;
    }
  }

  /**
   * Check if IPQ tables exist
   */
  getIPQTablesStatus(): { hasQuestionsTable: boolean; hasSolutionsTable: boolean; isComplete: boolean } {
    if (!this.db) {
      return { hasQuestionsTable: false, hasSolutionsTable: false, isComplete: false };
    }

    try {
      const tables = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all() as { name: string }[];

      const tableNames = new Set(tables.map(t => t.name.toLowerCase()));

      const hasQuestionsTable = tableNames.has('ipq_questions');
      const hasSolutionsTable = tableNames.has('ipq_solutions');

      return {
        hasQuestionsTable,
        hasSolutionsTable,
        isComplete: hasQuestionsTable && hasSolutionsTable
      };
    } catch (error) {
      console.error('[DB] Error checking IPQ tables status:', error);
      return { hasQuestionsTable: false, hasSolutionsTable: false, isComplete: false };
    }
  }

  /**
   * Auto-select questions based on preset rules
   * @param sections - Array of section inputs with name, type, maxQuestions, weightage
   * @param preset - Selection preset with distribution rules
   * @returns Object with selected UUIDs per section and selection details
   */
  autoSelectQuestions(
    sections: Array<{
      name: 'Physics' | 'Chemistry' | 'Mathematics';
      type: 'Div 1' | 'Div 2';
      maxQuestions: number;
      weightage: Record<string, number>;
    }>,
    preset: {
      Physics: { div1: any; div2: any };
      Chemistry: { div1: any; div2: any };
      Mathematics: { div1: any; div2: any };
      globalRules: { prioritizeLowFrequency: boolean; incrementFrequencyOnSelect: boolean };
    }
  ): {
    success: boolean;
    sections: Array<{
      sectionName: string;
      sectionType: string;
      selectedQuestionUuids: string[];
      selectionDetails: {
        byTable: { jee: number; neet: number; bits: number };
        byClass: { class1: number; class2: number; classNull: number };
        byChapter: Record<string, number>;
      };
    }>;
    totalSelected: number;
    frequencyUpdated: boolean;
    error?: string;
  } {
    if (!this.db) {
      return { success: false, sections: [], totalSelected: 0, frequencyUpdated: false, error: 'Database not connected' };
    }

    console.log('[AutoSelect] Starting auto-selection with', sections.length, 'sections');

    const allSelectedUuids: string[] = [];
    const resultSections: Array<{
      sectionName: string;
      sectionType: string;
      selectedQuestionUuids: string[];
      selectionDetails: {
        byTable: { jee: number; neet: number; bits: number };
        byClass: { class1: number; class2: number; classNull: number };
        byChapter: Record<string, number>;
      };
    }> = [];

    try {
      for (const section of sections) {
        const sectionPreset = preset[section.name];
        const divRule = section.type === 'Div 1' ? sectionPreset.div1 : sectionPreset.div2;
        const { tableDistribution, classDistribution } = divRule;

        console.log(`[AutoSelect] Processing ${section.name} ${section.type}: max=${section.maxQuestions}`);

        // Calculate how many questions to select from each table with proper rounding
        // Use floor and distribute the remainder to preserve total
        const total = section.maxQuestions;
        let jeeCount = Math.floor((tableDistribution.jee / 100) * total);
        let neetCount = Math.floor((tableDistribution.neet / 100) * total);
        let bitsCount = Math.floor((tableDistribution.bits / 100) * total);

        // Distribute the remainder to preserve total
        let remainder = total - jeeCount - neetCount - bitsCount;
        // Prioritize by highest percentage
        const tablePriority = [
          { name: 'jee', pct: tableDistribution.jee },
          { name: 'neet', pct: tableDistribution.neet },
          { name: 'bits', pct: tableDistribution.bits }
        ].sort((a, b) => b.pct - a.pct);

        let i = 0;
        while (remainder > 0) {
          if (tablePriority[i % 3].name === 'jee') jeeCount++;
          else if (tablePriority[i % 3].name === 'neet') neetCount++;
          else bitsCount++;
          remainder--;
          i++;
        }

        console.log(`[AutoSelect] Table distribution: JEE=${jeeCount}, NEET=${neetCount}, BITS=${bitsCount}, total=${jeeCount + neetCount + bitsCount}`);

        // Calculate class distribution targets (absolute counts from preset)
        const class1Target = classDistribution?.class1 ?? 0;
        const class2Target = classDistribution?.class2 ?? 0;
        const classNullTarget = classDistribution?.classNull ?? total; // Default: all classNull if not specified
        console.log(`[AutoSelect] Class distribution targets: class1=${class1Target}, class2=${class2Target}, classNull=${classNullTarget}`);

        // Get chapter codes from weightage
        const chapterCodes = Object.keys(section.weightage);
        if (chapterCodes.length === 0) {
          console.warn(`[AutoSelect] No chapters specified for ${section.name}`);
          continue;
        }

        const sectionSelectedUuids: string[] = [];
        const byTable = { jee: 0, neet: 0, bits: 0 };
        const byClass = { class1: 0, class2: 0, classNull: 0 };
        const byChapter: Record<string, number> = {};
        const warnings: string[] = [];
        const sectionMax = total; // The hard cap for this section

        // Division filter based on correct_answer column (as user specified):
        // Div 1 (MCQ): answer is A, B, C, or D
        // Div 2 (Integer): answer is NOT A, B, C, D (numeric answer)
        const divisionFilter = section.type === 'Div 1'
          ? "AND UPPER(answer) IN ('A', 'B', 'C', 'D')"
          : "AND UPPER(answer) NOT IN ('A', 'B', 'C', 'D')";

        const orderBy = preset.globalRules.prioritizeLowFrequency
          ? 'ORDER BY COALESCE(frequency, 0) ASC, RANDOM()'
          : 'ORDER BY RANDOM()';

        // Helper to build class filter SQL clause
        const getClassFilter = (classType: 'class1' | 'class2' | 'classNull'): string => {
          if (classType === 'class1') return 'AND class = 1';
          if (classType === 'class2') return 'AND class = 2';
          return 'AND (class IS NULL OR class NOT IN (1, 2))';
        };

        // Helper to select ONE question from a specific table with optional class filter
        const selectOne = (
          chapterCode: string,
          table: string,
          classFilter: string | null
        ): { uuid: string; class: number | null } | null => {
          if (sectionSelectedUuids.length >= sectionMax) return null;

          // Build exclude clause
          const excludeClause = sectionSelectedUuids.length > 0
            ? `AND uuid NOT IN (${sectionSelectedUuids.map(() => '?').join(',')})`
            : '';
          const excludeParams = sectionSelectedUuids.length > 0 ? [...sectionSelectedUuids] : [];

          const classClause = classFilter ?? '';
          const query = `SELECT uuid, class FROM ${table} WHERE tag_2 = ? ${divisionFilter} ${classClause} ${excludeClause} ${orderBy} LIMIT 1`;
          const params = [chapterCode, ...excludeParams];

          try {
            const result = this.db!.prepare(query).get(...params) as { uuid: string; class: number | null } | undefined;
            return result ?? null;
          } catch (e) {
            console.error(`[AutoSelect] Query failed for table ${table}, chapter ${chapterCode}:`, e);
            return null;
          }
        };

        // Track a selected question
        const trackSelection = (r: { uuid: string; class: number | null }, table: string, chapterCode: string) => {
          sectionSelectedUuids.push(r.uuid);

          // Track which table it came from
          if (table.startsWith('jee')) byTable.jee++;
          else if (table.startsWith('neet')) byTable.neet++;
          else if (table.startsWith('bits')) byTable.bits++;

          // Track class
          if (r.class === 2) byClass.class2++;
          else if (r.class === 1) byClass.class1++;
          else byClass.classNull++;

          byChapter[chapterCode] = (byChapter[chapterCode] || 0) + 1;
        };

        // Iterate through each chapter and select the required number
        for (const [chapterCode, requiredCount] of Object.entries(section.weightage)) {
          let needed = requiredCount as number;
          if (needed <= 0) continue;

          let chapterSelected = 0;

          // Try to fulfill the chapter requirement one by one to balance both table and class
          while (needed > 0 && sectionSelectedUuids.length < sectionMax) {

            // Calculate deficits for tables
            const tableDeficits = [
              { name: 'jee_questions', key: 'jee' as const, deficit: jeeCount - byTable.jee },
              { name: 'neet_questions', key: 'neet' as const, deficit: neetCount - byTable.neet },
              { name: 'bits_questions', key: 'bits' as const, deficit: bitsCount - byTable.bits }
            ].filter(t => t.deficit > 0).sort((a, b) => b.deficit - a.deficit);

            // Calculate deficits for classes
            const classDeficits = [
              { key: 'class1' as const, filter: getClassFilter('class1'), deficit: class1Target - byClass.class1 },
              { key: 'class2' as const, filter: getClassFilter('class2'), deficit: class2Target - byClass.class2 },
              { key: 'classNull' as const, filter: getClassFilter('classNull'), deficit: classNullTarget - byClass.classNull }
            ].filter(c => c.deficit > 0).sort((a, b) => b.deficit - a.deficit);

            let picked = false;

            // STRATEGY 1: Try to satisfy both table AND class constraints
            // Try combinations ordered by combined deficit
            for (const tableOpt of tableDeficits) {
              if (picked) break;
              for (const classOpt of classDeficits) {
                const result = selectOne(chapterCode, tableOpt.name, classOpt.filter);
                if (result) {
                  console.log(`[AutoSelect] Picked from ${tableOpt.name} with ${classOpt.key} for chapter ${chapterCode}`);
                  trackSelection(result, tableOpt.name, chapterCode);
                  picked = true;
                  needed--;
                  chapterSelected++;
                  break;
                }
              }
            }

            // STRATEGY 2: If no match with class constraint, try table-only (any class)
            if (!picked) {
              for (const tableOpt of tableDeficits) {
                const result = selectOne(chapterCode, tableOpt.name, null);
                if (result) {
                  console.log(`[AutoSelect] Picked from ${tableOpt.name} (any class) for chapter ${chapterCode}`);
                  trackSelection(result, tableOpt.name, chapterCode);
                  picked = true;
                  needed--;
                  chapterSelected++;
                  break;
                }
              }
            }

            // STRATEGY 3: If still no match, try ANY table with ANY class (fallback)
            if (!picked) {
              const allTables = ['jee_questions', 'neet_questions', 'bits_questions'];
              for (const table of allTables) {
                const result = selectOne(chapterCode, table, null);
                if (result) {
                  console.log(`[AutoSelect] Picked from ${table} (fallback) for chapter ${chapterCode}`);
                  trackSelection(result, table, chapterCode);
                  picked = true;
                  needed--;
                  chapterSelected++;
                  break;
                }
              }
            }

            if (!picked) {
              // Could not find question in ANY table for this chapter
              console.log(`[AutoSelect] Could not find any question for chapter ${chapterCode} in any table`);
              break;
            }
          }

          if (needed > 0) {
            warnings.push(`Chapter ${chapterCode}: wanted ${requiredCount}, got ${chapterSelected}`);
          }

          console.log(`[AutoSelect] Chapter ${chapterCode}: needed ${requiredCount}, selected ${chapterSelected}`);
        }

        // Log any warnings
        if (warnings.length > 0) {
          console.warn(`[AutoSelect] Warnings for ${section.name} ${section.type}:`, warnings);
        }

        console.log(`[AutoSelect] ${section.name} ${section.type}: selected ${sectionSelectedUuids.length} questions (target: ${total})`);
        console.log(`[AutoSelect] FINAL TABLE DISTRIBUTION: JEE=${byTable.jee} (target ${jeeCount}), NEET=${byTable.neet} (target ${neetCount}), BITS=${byTable.bits} (target ${bitsCount})`);
        console.log(`[AutoSelect] FINAL CLASS DISTRIBUTION: class1=${byClass.class1} (target ${class1Target}), class2=${byClass.class2} (target ${class2Target}), classNull=${byClass.classNull} (target ${classNullTarget})`);

        allSelectedUuids.push(...sectionSelectedUuids);
        resultSections.push({
          sectionName: section.name,
          sectionType: section.type,
          selectedQuestionUuids: sectionSelectedUuids,
          selectionDetails: { byTable, byClass, byChapter },
          warnings
        } as any);
      }

      // Increment frequency for all selected questions if enabled
      let frequencyUpdated = false;
      if (preset.globalRules.incrementFrequencyOnSelect && allSelectedUuids.length > 0) {
        console.log(`[AutoSelect] Incrementing frequency for ${allSelectedUuids.length} questions`);

        // Update in batches per exam table
        for (const exam of ['JEE', 'NEET', 'BITS'] as const) {
          const table = `${exam.toLowerCase()}_questions`;
          try {
            const updateStmt = this.db.prepare(`UPDATE ${table} SET frequency = COALESCE(frequency, 0) + 1 WHERE uuid = ?`);
            for (const uuid of allSelectedUuids) {
              updateStmt.run(uuid);
            }
          } catch (e) {
            // Table might not exist or UUID not in this table - ignore
          }
        }
        frequencyUpdated = true;
      }

      return {
        success: true,
        sections: resultSections,
        totalSelected: allSelectedUuids.length,
        frequencyUpdated
      };
    } catch (error: any) {
      console.error('[AutoSelect] Error during auto-selection:', error);
      return {
        success: false,
        sections: resultSections,
        totalSelected: allSelectedUuids.length,
        frequencyUpdated: false,
        error: error.message
      };
    }
  }
}



// Singleton instance
export const dbService = new DatabaseService();
