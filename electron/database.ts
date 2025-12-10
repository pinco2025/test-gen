import Database from 'better-sqlite3';
import path from 'path';
import { Question, QuestionFilter } from '../src/types';

export class DatabaseService {
  private db: Database.Database | null = null;

  constructor(private dbPath?: string) {}

  connect(dbPath?: string): void {
    const finalPath = dbPath || this.dbPath || path.join(process.cwd(), 'questions.db');
    this.db = new Database(finalPath);
    console.log(`Connected to database at: ${finalPath}`);
    this.createSolutionTable();
  }

  createSolutionTable(): void {
    if (!this.db) return;
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS solutions (
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

  /**
   * Get all questions with optional filtering
   */
  getQuestions(filter?: QuestionFilter): Question[] {
    if (!this.db) throw new Error('Database not connected');

    let query = 'SELECT * FROM questions WHERE 1=1';
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
      query += ` AND (${tagConditions})`;
      filter.tags.forEach(tag => {
        params.push(tag, tag, tag, tag);
      });
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Question[];
  }

  /**
   * Get question by UUID
   */
  getQuestionByUUID(uuid: string): Question | null {
    if (!this.db) throw new Error('Database not connected');

    const stmt = this.db.prepare('SELECT * FROM questions WHERE uuid = ?');
    return (stmt.get(uuid) as Question) || null;
  }

  /**
   * Get questions by UUIDs (batch)
   */
  getQuestionsByUUIDs(uuids: string[]): Question[] {
    if (!this.db) throw new Error('Database not connected');

    if (uuids.length === 0) {
      return [];
    }

    const placeholders = uuids.map(() => '?').join(',');
    const query = `SELECT * FROM questions WHERE uuid IN (${placeholders})`;

    const stmt = this.db.prepare(query);
    return stmt.all(...uuids) as Question[];
  }

  /**
   * Get questions by chapter codes (using tag_2)
   * Chapter codes are stored in tag_2 field (e.g., PHY01, CHE01, MAT01)
   * NOTE: Queries ONLY by tag_2, ignoring type field
   */
  getQuestionsByChapterCodes(type: string, chapterCodes: string[]): Question[] {
    if (!this.db) throw new Error('Database not connected');

    if (chapterCodes.length === 0) {
      console.log('[DB] No chapter codes provided');
      return [];
    }

    const placeholders = chapterCodes.map(() => '?').join(',');
    // Query only by tag_2, ignore type field
    const query = `SELECT * FROM questions WHERE tag_2 IN (${placeholders})`;
    const params = chapterCodes;

    console.log('[DB] Query:', query);
    console.log('[DB] Params:', params);
    console.log('[DB] Note: Ignoring type parameter:', type);

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as Question[];

    console.log('[DB] Results count:', results.length);

    // Debug: Show what's in the database if no results
    if (results.length === 0) {
      console.log('[DB] No results found. Checking database...');
      const allTag2 = this.db.prepare('SELECT DISTINCT tag_2 FROM questions WHERE tag_2 IS NOT NULL LIMIT 20').all();
      console.log('[DB] Sample tag_2 values in database:', allTag2);
    } else {
      console.log('[DB] Sample results:', results.slice(0, 2).map(q => ({ uuid: q.uuid, tag_2: q.tag_2, type: q.type })));
    }

    return results;
  }

  /**
   * Get all unique values for a column
   */
  getUniqueValues(column: string): string[] {
    if (!this.db) throw new Error('Database not connected');

    const stmt = this.db.prepare(`SELECT DISTINCT ${column} FROM questions WHERE ${column} IS NOT NULL ORDER BY ${column}`);
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
      const column = `tag_${i}`;
      const values = this.getUniqueValues(column);
      values.forEach(tag => tags.add(tag));
    }

    return Array.from(tags).sort();
  }

  /**
   * Get questions filtered by multiple criteria
   */
  searchQuestions(criteria: {
    type?: string;
    year?: string;
    chapter?: string;
    searchText?: string;
  }): Question[] {
    if (!this.db) throw new Error('Database not connected');

    let query = 'SELECT * FROM questions WHERE 1=1';
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
      const searchPattern = `%${criteria.searchText}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Question[];
  }

  /**
   * Get count of questions matching criteria
   */
  getQuestionCount(filter?: QuestionFilter): number {
    if (!this.db) throw new Error('Database not connected');

    let query = 'SELECT COUNT(*) as count FROM questions WHERE 1=1';
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
   * Get all available chapter codes from database (tag_2 field) grouped by type
   * Returns actual codes from your database with normalized lowercase type keys
   */
  getChaptersByType(): { [type: string]: string[] } {
    if (!this.db) throw new Error('Database not connected');

    console.log('[DB] Loading chapters from database...');

    const query = `
      SELECT DISTINCT type, tag_2
      FROM questions
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
   */
  incrementFrequency(uuid: string): boolean {
    if (!this.db) throw new Error('Database not connected');

    try {
      const stmt = this.db.prepare(`
        UPDATE questions
        SET frequency = COALESCE(frequency, 0) + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ?
      `);
      const result = stmt.run(uuid);
      console.log(`[DB] Incremented frequency for question ${uuid}, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error incrementing frequency for ${uuid}:`, error);
      return false;
    }
  }

  /**
   * Decrement the frequency of a question by 1
   * Ensures frequency doesn't go below 0
   */
  decrementFrequency(uuid: string): boolean {
    if (!this.db) throw new Error('Database not connected');

    try {
      const stmt = this.db.prepare(`
        UPDATE questions
        SET frequency = MAX(COALESCE(frequency, 0) - 1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE uuid = ?
      `);
      const result = stmt.run(uuid);
      console.log(`[DB] Decremented frequency for question ${uuid}, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error decrementing frequency for ${uuid}:`, error);
      return false;
    }
  }

  /**
   * Update question properties
   */
  updateQuestion(uuid: string, updates: Partial<Question>): boolean {
    if (!this.db) throw new Error('Database not connected');

    try {
      const allowedFields = [
        'question', 'question_image_url',
        'option_a', 'option_a_image_url',
        'option_b', 'option_b_image_url',
        'option_c', 'option_c_image_url',
        'option_d', 'option_d_image_url',
        'answer',
        'type', 'year',
        'tag_1', 'tag_2', 'tag_3', 'tag_4'
      ];

      const setClauses: string[] = [];
      const params: any[] = [];

      for (const field of allowedFields) {
        // @ts-ignore - Dynamic access to allowed fields
        if (updates[field] !== undefined) {
          setClauses.push(`${field} = ?`);
          // @ts-ignore
          params.push(updates[field]);
        }
      }

      if (setClauses.length === 0) {
        console.log('[DB] No updates to apply');
        return false;
      }

      // Always update timestamp
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      params.push(uuid);

      const query = `UPDATE questions SET ${setClauses.join(', ')} WHERE uuid = ?`;
      console.log('[DB] Update query:', query, 'params:', params);

      const stmt = this.db.prepare(query);
      const result = stmt.run(...params);
      console.log(`[DB] Updated question ${uuid}, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error updating question ${uuid}:`, error);
      return false;
    }
  }

  /**
   * Create a new question
   */
  createQuestion(question: Question): boolean {
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
        'created_at', 'updated_at', 'frequency'
      ];

      const placeholders = keys.map(() => '?').join(', ');
      const query = `INSERT INTO questions (${keys.join(', ')}) VALUES (${placeholders})`;

      const params = keys.map(key => {
        // @ts-ignore
        return question[key] !== undefined ? question[key] : null;
      });

      const stmt = this.db.prepare(query);
      const result = stmt.run(...params);
      console.log(`[DB] Created question ${question.uuid}, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (error) {
      console.error(`[DB] Error creating question ${question.uuid}:`, error);
      return false;
    }
  }

  /**
   * Get solution by question UUID
   */
  getSolution(uuid: string): { uuid: string, solution_text: string, solution_image_url: string } | null {
    if (!this.db) throw new Error('Database not connected');
    const stmt = this.db.prepare('SELECT * FROM solutions WHERE uuid = ?');
    return (stmt.get(uuid) as { uuid: string, solution_text: string, solution_image_url: string }) || null;
  }

  /**
   * Save solution (insert or update)
   */
  saveSolution(uuid: string, solutionText: string, solutionImageUrl: string): boolean {
    if (!this.db) throw new Error('Database not connected');
    try {
        const stmt = this.db.prepare(`
            INSERT INTO solutions (uuid, solution_text, solution_image_url)
            VALUES (?, ?, ?)
            ON CONFLICT(uuid) DO UPDATE SET
            solution_text = excluded.solution_text,
            solution_image_url = excluded.solution_image_url
        `);
        const result = stmt.run(uuid, solutionText, solutionImageUrl);
        return result.changes > 0;
    } catch (error) {
        console.error(`[DB] Error saving solution for ${uuid}:`, error);
        return false;
    }
  }
}

// Singleton instance
export const dbService = new DatabaseService();
