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
let cachedTablesInfo: { hasLegacy: boolean; firstExamWithQuestions?: ExamType } | null = null;
let cachedDbPath: string | null = null;

/**
 * Get the questions table name for an exam type
 * Falls back to 'questions' if no exam specified (legacy support)
 * If legacy 'questions' table doesn't exist, uses first available exam table
 */
export function getQuestionsTable(exam?: ExamType): string {
  if (exam) return `${exam.toLowerCase()}_questions`;

  // If no exam specified, check cached table info for auto-fallback
  if (cachedTablesInfo) {
    if (cachedTablesInfo.hasLegacy) return 'questions';
    if (cachedTablesInfo.firstExamWithQuestions) {
      return `${cachedTablesInfo.firstExamWithQuestions.toLowerCase()}_questions`;
    }
  }

  // Default to legacy table (will be checked at connect time)
  return 'questions';
}

/**
 * Get the solutions table name for an exam type
 * Falls back to 'solutions' if no exam specified (legacy support)
 * If legacy 'solutions' table doesn't exist, uses first available exam table
 */
export function getSolutionsTable(exam?: ExamType): string {
  if (exam) return `${exam.toLowerCase()}_solutions`;

  // If no exam specified, check cached table info for auto-fallback
  if (cachedTablesInfo) {
    if (cachedTablesInfo.hasLegacy) return 'solutions';
    if (cachedTablesInfo.firstExamWithQuestions) {
      return `${cachedTablesInfo.firstExamWithQuestions.toLowerCase()}_solutions`;
    }
  }

  // Default to legacy table
  return 'solutions';
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

      // Check for legacy 'questions' table
      const hasLegacy = tableNames.has('questions');

      // Find first exam with a questions table
      let firstExamWithQuestions: ExamType | undefined;
      for (const exam of SUPPORTED_EXAMS) {
        if (tableNames.has(`${exam.toLowerCase()}_questions`)) {
          firstExamWithQuestions = exam;
          break;
        }
      }

      cachedTablesInfo = { hasLegacy, firstExamWithQuestions };
      cachedDbPath = this.dbPath || null;

      console.log('[DB] Table detection:', cachedTablesInfo);
      if (!hasLegacy && firstExamWithQuestions) {
        console.log(`[DB] No legacy 'questions' table found. Will use '${firstExamWithQuestions.toLowerCase()}_questions' as default.`);
      }
    } catch (error) {
      console.error('[DB] Error detecting tables:', error);
      cachedTablesInfo = { hasLegacy: true }; // Default to legacy on error
    }
  }



  /**
   * Find which exam table a question UUID belongs to
   * Useful when we don't know the exam type explicitly
   */
  findQuestionTable(uuid: string): { table: string, exam: ExamType } | null {
    if (!this.db) return null;

    for (const exam of SUPPORTED_EXAMS) {
      try {
        const table = `${exam.toLowerCase()}_questions`;
        // fast check
        const stmt = this.db.prepare(`SELECT 1 FROM ${table} WHERE uuid = ? `);
        if (stmt.get(uuid)) {
          return { table, exam };
        }
      } catch (e) {
        // Table might not exist, ignore
      }
    }

    // Check legacy 'questions' table last
    try {
      const stmt = this.db.prepare(`SELECT 1 FROM questions WHERE uuid = ? `);
      if (stmt.get(uuid)) {
        return { table: 'questions', exam: 'JEE' }; // Legacy usually maps to JEE default
      }
    } catch (e) { }

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
      'division_override': "INTEGER"  // null = auto-detect, 1 = force Div1, 2 = force Div2
    };

    // List of all possible question tables to check
    const tablesToCheck = [
      'questions',           // Legacy table
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
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS solutions(
    uuid TEXT PRIMARY KEY,
    solution_text TEXT,
    solution_image_url TEXT,
    FOREIGN KEY(uuid) REFERENCES questions(uuid) ON DELETE CASCADE
  );
`);
      console.log('Solutions table checked/created');
    } catch (error) {
      console.error('Error creating solutions table:', error);
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
  division_override INTEGER
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
   */
  getUniqueValues(column: string): string[] {
    if (!this.db) throw new Error('Database not connected');

    const stmt = this.db.prepare(`SELECT DISTINCT ${column} FROM questions WHERE ${column} IS NOT NULL ORDER BY ${column} `);
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



    // Fallback: If no exam-specific tables had data, check for legacy 'questions' table
    if (total === 0) {
      try {
        // Check if legacy 'questions' table exists
        const tableCheck = this.db.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='questions'"
        ).get();

        if (tableCheck) {
          const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM questions`);
          const result = stmt.get() as { count: number };
          if (result.count > 0) {
            breakdown.push({ exam: 'Legacy', count: result.count });
            total = result.count;
            console.log('[DB] Using legacy questions table, count:', result.count);
          }
        }
      } catch (error) {
        console.error('[DB] Error counting legacy questions:', error);
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
   * @param uuid - Question UUID
   * @param exam - Optional exam type to update in specific exam table
   */
  incrementFrequency(uuid: string, exam?: ExamType): boolean {
    if (!this.db) throw new Error('Database not connected');

    try {
      const table = getQuestionsTable(exam);
      const stmt = this.db.prepare(`
        UPDATE ${table}
        SET frequency = COALESCE(frequency, 0) + 1,
  updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ?
  `);
      const result = stmt.run(uuid);
      console.log(`[DB] Incremented frequency for question ${uuid} in ${table}, changes: ${result.changes} `);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error incrementing frequency for ${uuid}: `, error);
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
   * @param uuid - Question UUID
   * @param exam - Optional exam type to update in specific exam table
   */
  decrementFrequency(uuid: string, exam?: ExamType): boolean {
    if (!this.db) throw new Error('Database not connected');

    try {
      const table = getQuestionsTable(exam);
      const stmt = this.db.prepare(`
        UPDATE ${table}
        SET frequency = MAX(COALESCE(frequency, 0) - 1, 0),
  updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ?
  `);
      const result = stmt.run(uuid);
      console.log(`[DB] Decremented frequency for question ${uuid} in ${table}, changes: ${result.changes} `);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error decrementing frequency for ${uuid}: `, error);
      return false;
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
   * @param uuid - Question UUID
   * @param exam - Optional exam type to query from specific exam solutions table
   */
  getSolution(uuid: string, exam?: ExamType): { uuid: string, solution_text: string, solution_image_url: string } | null {
    if (!this.db) throw new Error('Database not connected');
    const table = getSolutionsTable(exam);
    const stmt = this.db.prepare(`SELECT * FROM ${table} WHERE uuid = ? `);
    return (stmt.get(uuid) as { uuid: string, solution_text: string, solution_image_url: string }) || null;
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
   * @param uuid - Question UUID
   * @param solutionText - Solution text content
   * @param solutionImageUrl - Solution image URL
   * @param exam - Optional exam type to save into specific exam solutions table
   */
  saveSolution(uuid: string, solutionText: string, solutionImageUrl: string, exam?: ExamType): boolean {
    if (!this.db) throw new Error('Database not connected');
    try {
      const table = getSolutionsTable(exam);
      const stmt = this.db.prepare(`
            INSERT INTO ${table} (uuid, solution_text, solution_image_url)
VALUES(?, ?, ?)
            ON CONFLICT(uuid) DO UPDATE SET
solution_text = excluded.solution_text,
  solution_image_url = excluded.solution_image_url
    `);
      const result = stmt.run(uuid, solutionText, solutionImageUrl);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error saving solution for ${uuid}: `, error);
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
        'parent_exam'
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
}


// Singleton instance
export const dbService = new DatabaseService();
