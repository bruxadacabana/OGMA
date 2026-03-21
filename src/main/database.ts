/**
 * OGMA Database
 * Usa better-sqlite3-multiple-ciphers — binários pré-compilados para
 * Electron 33 Linux/Windows, API 100% síncrona, sem rebuild.
 */

import Database from 'better-sqlite3-multiple-ciphers'
import { DB_PATH } from './paths'
import { createLogger } from './logger'

const log = createLogger('database')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('foreign_keys = ON')
    _db.pragma('journal_mode = WAL')
    log.info('Banco aberto', { path: DB_PATH })
    initSchema(_db)
    seedDefaults(_db)
    log.info('Banco pronto')
  }
  return _db
}

export function closeDb(): void {
  if (_db) {
    _db.close()
    _db = null
    log.info('Banco fechado')
  }
}

// ── Helpers síncronos ─────────────────────────────────────────────────────────

export function dbGet(sql: string, ...params: any[]): any {
  return getDb().prepare(sql).get(...params) ?? null
}

export function dbAll(sql: string, ...params: any[]): any[] {
  return getDb().prepare(sql).all(...params) as any[]
}

export function dbRun(sql: string, ...params: any[]): Database.RunResult {
  return getDb().prepare(sql).run(...params)
}

// ── Schema ────────────────────────────────────────────────────────────────────

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL DEFAULT 'Meu Workspace',
      icon         TEXT DEFAULT '✦',
      accent_color TEXT DEFAULT '#b8860b',
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS projects (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      description  TEXT,
      icon         TEXT,
      color        TEXT,
      project_type TEXT NOT NULL DEFAULT 'custom',
      subcategory  TEXT,
      status       TEXT DEFAULT 'active',
      date_start   TEXT,
      date_end     TEXT,
      extra_fields TEXT,
      sort_order   INTEGER DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pages (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id   INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      parent_id    INTEGER REFERENCES pages(id) ON DELETE CASCADE,
      title        TEXT NOT NULL DEFAULT 'Sem título',
      icon         TEXT,
      cover        TEXT,
      page_type    TEXT NOT NULL DEFAULT 'document',
      content_json TEXT,
      sort_order   INTEGER DEFAULT 0,
      is_deleted   INTEGER DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS page_properties (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id   INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      key       TEXT NOT NULL,
      value     TEXT,
      prop_type TEXT
    );
    CREATE TABLE IF NOT EXISTS page_backlinks (
      source_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      target_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      PRIMARY KEY (source_page_id, target_page_id)
    );
    CREATE TABLE IF NOT EXISTS page_versions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id      INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      content_json TEXT NOT NULL,
      created_at   TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tags (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      color        TEXT
    );
    CREATE TABLE IF NOT EXISTS page_tags (
      page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
      tag_id  INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (page_id, tag_id)
    );
    CREATE TABLE IF NOT EXISTS kanban_columns (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      color      TEXT,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS kanban_cards (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      column_id   INTEGER NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT,
      priority    TEXT DEFAULT 'media',
      due_date    TEXT,
      sort_order  INTEGER DEFAULT 0,
      is_done     INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS kanban_checklists (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id    INTEGER NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
      text       TEXT NOT NULL,
      is_checked INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS card_tags (
      card_id INTEGER REFERENCES kanban_cards(id) ON DELETE CASCADE,
      tag_id  INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (card_id, tag_id)
    );
    CREATE TABLE IF NOT EXISTS db_properties (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id     INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      prop_type   TEXT NOT NULL,
      config_json TEXT,
      sort_order  INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS db_entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS db_values (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id     INTEGER NOT NULL REFERENCES db_entries(id) ON DELETE CASCADE,
      property_id  INTEGER NOT NULL REFERENCES db_properties(id) ON DELETE CASCADE,
      value_text   TEXT,
      value_number REAL,
      value_bool   INTEGER,
      value_date   TEXT,
      value_json   TEXT
    );
    CREATE TABLE IF NOT EXISTS db_views (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id     INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      view_type   TEXT NOT NULL,
      filter_json TEXT,
      sort_json   TEXT,
      group_by    INTEGER REFERENCES db_properties(id),
      is_default  INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS calendar_events (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id    INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title           TEXT NOT NULL,
      description     TEXT,
      start_dt        TEXT NOT NULL,
      end_dt          TEXT,
      all_day         INTEGER DEFAULT 0,
      color           TEXT,
      linked_card_id  INTEGER REFERENCES kanban_cards(id) ON DELETE SET NULL,
      linked_entry_id INTEGER REFERENCES db_entries(id) ON DELETE SET NULL,
      created_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      title           TEXT NOT NULL,
      trigger_at      TEXT NOT NULL,
      offset_minutes  INTEGER,
      linked_event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
      linked_card_id  INTEGER REFERENCES kanban_cards(id) ON DELETE CASCADE,
      is_dismissed    INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS resources (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id  INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      project_id    INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      title         TEXT NOT NULL,
      resource_type TEXT,
      url           TEXT,
      description   TEXT,
      tags_json     TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS readings (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      reading_type TEXT DEFAULT 'book',
      author       TEXT,
      publisher    TEXT,
      year         INTEGER,
      isbn         TEXT,
      cover_path   TEXT,
      status       TEXT DEFAULT 'want',
      rating       INTEGER,
      current_page INTEGER DEFAULT 0,
      total_pages  INTEGER,
      date_start   TEXT,
      date_end     TEXT,
      review       TEXT,
      api_source   TEXT,
      api_id       TEXT,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reading_tags (
      reading_id INTEGER REFERENCES readings(id) ON DELETE CASCADE,
      tag_id     INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (reading_id, tag_id)
    );
    CREATE TABLE IF NOT EXISTS reading_notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      reading_id INTEGER NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
      chapter    TEXT,
      content    TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reading_quotes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      reading_id INTEGER NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
      text       TEXT NOT NULL,
      location   TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reading_links (
      reading_id INTEGER NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
      page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      PRIMARY KEY (reading_id, page_id)
    );
    CREATE TABLE IF NOT EXISTS reading_goals (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      year         INTEGER NOT NULL,
      target       INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS time_sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
      page_id      INTEGER REFERENCES pages(id) ON DELETE SET NULL,
      project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      area_id      INTEGER,
      duration_min INTEGER NOT NULL,
      session_type TEXT DEFAULT 'manual',
      notes        TEXT,
      started_at   TEXT NOT NULL,
      ended_at     TEXT
    );
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id      INTEGER REFERENCES pages(id) ON DELETE SET NULL,
      duration_min INTEGER,
      session_type TEXT,
      completed    INTEGER DEFAULT 0,
      started_at   TEXT DEFAULT (datetime('now')),
      ended_at     TEXT
    );
    CREATE TABLE IF NOT EXISTS academic_sources (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      icon         TEXT,
      is_builtin   INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS academic_areas (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      color        TEXT,
      is_builtin   INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS academic_semesters (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      number     INTEGER NOT NULL,
      name       TEXT,
      date_start TEXT,
      date_end   TEXT
    );
    CREATE TABLE IF NOT EXISTS academic_disciplines (
      page_id         INTEGER PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
      source_id       INTEGER REFERENCES academic_sources(id) ON DELETE SET NULL,
      semester_id     INTEGER REFERENCES academic_semesters(id) ON DELETE SET NULL,
      code            TEXT,
      status          TEXT DEFAULT 'pendente',
      priority        INTEGER DEFAULT 3,
      professor       TEXT,
      workload        INTEGER,
      banner_url      TEXT,
      banner_query    TEXT,
      progress        INTEGER DEFAULT 0,
      kanban_position TEXT
    );
    CREATE TABLE IF NOT EXISTS academic_discipline_areas (
      page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
      area_id INTEGER REFERENCES academic_areas(id) ON DELETE CASCADE,
      PRIMARY KEY (page_id, area_id)
    );
    CREATE TABLE IF NOT EXISTS academic_prerequisites (
      discipline_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
      requires_id   INTEGER REFERENCES pages(id) ON DELETE CASCADE,
      PRIMARY KEY (discipline_id, requires_id)
    );
    CREATE TABLE IF NOT EXISTS academic_tasks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id     INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT,
      is_done     INTEGER DEFAULT 0,
      priority    INTEGER DEFAULT 3,
      due_date    TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS academic_deadlines (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id       INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      title         TEXT NOT NULL,
      deadline_type TEXT DEFAULT 'generic',
      date          TEXT NOT NULL,
      description   TEXT,
      is_done       INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS academic_topics (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      is_done    INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS academic_resources (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id       INTEGER REFERENCES pages(id) ON DELETE CASCADE,
      area_id       INTEGER REFERENCES academic_areas(id) ON DELETE SET NULL,
      source_id     INTEGER REFERENCES academic_sources(id) ON DELETE SET NULL,
      title         TEXT NOT NULL,
      resource_type TEXT,
      url           TEXT,
      description   TEXT,
      tags_json     TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      entity_type, entity_id, project_id, title, body
    );
  `)
}

function seedDefaults(db: Database.Database): void {
  const ws = db.prepare('SELECT id FROM workspaces LIMIT 1').get()
  if (ws) return

  log.info('Criando workspace e dados padrão')

  const wsId = db.prepare(
    "INSERT INTO workspaces (name, icon, accent_color) VALUES ('Meu Workspace', '✦', '#b8860b')"
  ).run().lastInsertRowid

  const insertSource = db.prepare(
    'INSERT INTO academic_sources (workspace_id, name, icon, is_builtin) VALUES (?, ?, ?, 1)'
  )
  for (const [name, icon] of [
    ['Universidade', '🎓'], ['Escola', '🏫'],
    ['Plataforma Online', '💻'], ['Autodidata', '📚'], ['Outro', '📌'],
  ]) insertSource.run(wsId, name, icon)

  const insertArea = db.prepare(
    'INSERT INTO academic_areas (workspace_id, name, color, is_builtin) VALUES (?, ?, ?, 1)'
  )
  for (const [name, color] of [
    ['Exatas', '#2C5F8A'], ['Humanas', '#8B3A2A'], ['Biológicas', '#4A6741'],
    ['Linguagens', '#6B4F72'], ['Tecnologia', '#7A5C2E'], ['Artes', '#8B7355'],
  ]) insertArea.run(wsId, name, color)
}
