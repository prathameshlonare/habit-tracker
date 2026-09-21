import { Capacitor } from '@capacitor/core';
import { SCHEMA_SQL } from '../schema';

export const DRIVER = 'capacitor-sqlite';

const DB_NAME = 'habitsdb';

let connection = null;

export function isNative() {
  return Capacitor.isNativePlatform();
}

function coerceSetting(value) {
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return value;
}

function encodeSetting(value) {
  if (value === true) return '1';
  if (value === false) return '0';
  return String(value ?? '');
}

export async function init() {
  const { CapacitorSQLite, SQLiteConnection } = await import(
    '@capacitor-community/sqlite'
  );
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const existing = await sqlite.isConnection(DB_NAME, false).catch(() => null);
  if (existing?.result) {
    await sqlite.closeConnection(DB_NAME, false).catch(() => {});
  }
  connection = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  await connection.open();
  const statements = SCHEMA_SQL.split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^\s*PRAGMA/i.test(s));
  for (const stmt of statements) {
    await connection.execute(stmt);
  }
}

export async function loadAll() {
  const habitsQuery = await connection.query(
    'SELECT id, name, color, icon, archived FROM habits ORDER BY created_at ASC;'
  );
  const habits = [];
  for (const row of habitsQuery.values || []) {
    const logsQuery = await connection.query(
      'SELECT date_key FROM habit_logs WHERE habit_id = ?;',
      [row.id]
    );
    const logs = {};
    for (const log of logsQuery.values || []) {
      logs[log.date_key] = true;
    }
    habits.push({
      id: row.id,
      name: row.name,
      color: row.color || '',
      icon: row.icon || '',
      archived: row.archived || 0,
      logs,
    });
  }

  const journalQuery = await connection.query('SELECT * FROM journal_entries;');
  const journal = {};
  for (const row of journalQuery.values || []) {
    const { date_key, updated_at, ...entry } = row;
    journal[date_key] = entry;
  }

  const settingsQuery = await connection.query('SELECT key, value FROM settings;');
  const settings = {};
  for (const row of settingsQuery.values || []) {
    settings[row.key] = coerceSetting(row.value);
  }
  return { habits, journal, settings };
}

export async function writeHabits(habits) {
  const ids = habits.map((h) => h.id);
  if (ids.length === 0) {
    await connection.execute('DELETE FROM habit_logs;');
    await connection.execute('DELETE FROM habits;');
    return;
  }
  const placeholders = ids.map(() => '?').join(',');
  await connection.execute(
    `DELETE FROM habit_logs WHERE habit_id NOT IN (${placeholders});`,
    ids
  );
  await connection.execute(
    `DELETE FROM habits WHERE id NOT IN (${placeholders});`,
    ids
  );
  const now = new Date().toISOString();
  for (const habit of habits) {
    await connection.run(
      `INSERT INTO habits(id, name, color, icon, archived, updated_at)
       VALUES(?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, color = excluded.color, icon = excluded.icon,
         archived = excluded.archived, updated_at = excluded.updated_at;`,
      [habit.id, habit.name, habit.color || '', habit.icon || '', habit.archived || 0, now]
    );
    await connection.execute('DELETE FROM habit_logs WHERE habit_id = ?;', [habit.id]);
    const dates = Object.keys(habit.logs || {});
    for (const dateKey of dates) {
      await connection.run(
        'INSERT OR IGNORE INTO habit_logs(habit_id, date_key, done) VALUES(?, ?, 1);',
        [habit.id, dateKey]
      );
    }
  }
}

export async function writeJournal(journal) {
  const keys = Object.keys(journal);
  if (keys.length === 0) {
    await connection.execute('DELETE FROM journal_entries;');
    return;
  }
  const placeholders = keys.map(() => '?').join(',');
  await connection.execute(
    `DELETE FROM journal_entries WHERE date_key NOT IN (${placeholders});`,
    keys
  );
  const now = new Date().toISOString();
  for (const [dateKey, entry] of Object.entries(journal)) {
    await connection.run(
      `INSERT INTO journal_entries(date_key, mood, gratitude, highlights, challenges,
         learning, goals, notes, updated_at)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date_key) DO UPDATE SET
         mood = excluded.mood, gratitude = excluded.gratitude,
         highlights = excluded.highlights, challenges = excluded.challenges,
         learning = excluded.learning, goals = excluded.goals, notes = excluded.notes,
         updated_at = excluded.updated_at;`,
      [
        dateKey,
        entry.mood || '',
        entry.gratitude || '',
        entry.highlights || '',
        entry.challenges || '',
        entry.learning || '',
        entry.goals || '',
        entry.notes || '',
        now,
      ]
    );
  }
}

export async function writeSettings(settings) {
  for (const [key, value] of Object.entries(settings)) {
    await connection.run('INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?);', [
      key,
      encodeSetting(value),
    ]);
  }
}

export async function clearAll() {
  await connection.execute('DELETE FROM habit_logs;');
  await connection.execute('DELETE FROM habits;');
  await connection.execute('DELETE FROM journal_entries;');
  await connection.execute("DELETE FROM settings WHERE key NOT IN ('schema_version');");
}
