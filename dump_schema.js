
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'questions.db');
console.log('Opening database at:', dbPath);
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

console.log('Tables found:', tables.map(t => t.name));

for (const table of tables) {
    console.log(`\n--- Schema for ${table.name} ---`);
    const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(table.name);
    console.log(schema.sql);
}

db.close();
