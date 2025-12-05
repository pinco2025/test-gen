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
   * Get questions by chapter codes (using tag_2)
   * Chapter codes are stored in tag_2 field (e.g., PHY01, CHE01, MAT01)
   */
  getQuestionsByChapterCodes(type: string, chapterCodes: string[]): Question[] {
    if (!this.db) throw new Error('Database not connected');

    if (chapterCodes.length === 0) return [];

    const placeholders = chapterCodes.map(() => '?').join(',');
    const query = `SELECT * FROM questions WHERE type = ? AND tag_2 IN (${placeholders})`;
    const params = [type, ...chapterCodes];

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Question[];
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
}

// Singleton instance
export const dbService = new DatabaseService();
