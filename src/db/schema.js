// Single-user SQLite schema v1 - shared by Android (native) and Desktop (Node server).
// This file is the source of truth. Both drivers must execute these statements in order.
// Phase 1: used as documentation + future execution. Storage is still localStorage-backed via repo.js.

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
INSERT OR IGNORE INTO meta(key,value) VALUES('schema_version','1');

CREATE TABLE IF NOT EXISTS habits(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS habit_logs(
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date_key TEXT NOT NULL,
  done INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY(habit_id,date_key)
);
CREATE INDEX IF NOT EXISTS idx_logs_date ON habit_logs(date_key);

CREATE TABLE IF NOT EXISTS journal_entries(
  date_key TEXT PRIMARY KEY,
  mood TEXT DEFAULT '',
  gratitude TEXT DEFAULT '',
  highlights TEXT DEFAULT '',
  challenges TEXT DEFAULT '',
  learning TEXT DEFAULT '',
  goals TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
INSERT OR IGNORE INTO settings(key,value) VALUES('dailyReminders','1'),('achievementNotifications','1'),('theme','light');
`;
