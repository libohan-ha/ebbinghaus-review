import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source TEXT,
    note TEXT,
    study_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    tag TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
  );

  -- target_type: 'batch' | 'item'
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL,
    target_id INTEGER NOT NULL,
    scheduled_date TEXT NOT NULL,
    offset_day INTEGER NOT NULL,
    stage INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    feedback TEXT,
    completed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(scheduled_date);
  CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
  CREATE INDEX IF NOT EXISTS idx_items_batch ON items(batch_id);
`);

// ---------- Migrations ----------
function hasColumn(table, col) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some(r => r.name === col);
}
if (!hasColumn('batches', 'image_path')) {
  db.exec(`ALTER TABLE batches ADD COLUMN image_path TEXT`);
}
if (!hasColumn('items', 'image_path')) {
  db.exec(`ALTER TABLE items ADD COLUMN image_path TEXT`);
}
