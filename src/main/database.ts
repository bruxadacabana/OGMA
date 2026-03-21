/**
 * OGMA Database — v2
 * Schema: Projetos como Databases (modelo Notion)
 * Usa better-sqlite3-multiple-ciphers — API 100% síncrona, sem rebuild.
 */

import Database from 'better-sqlite3-multiple-ciphers'
import { DB_PATH } from './paths'
import { createLogger } from './logger'

const log = createLogger('database')

const SCHEMA_VERSION = 2

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
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
  const version = db.pragma('user_version', { simple: true }) as number

  if (version < SCHEMA_VERSION) {
    log.info(`Migrando schema: v${version} → v${SCHEMA_VERSION} (slate limpo)`)
    runMigration(db)
  }

  createTables(db)
}

function runMigration(db: Database.Database): void {
  // Abordagem nuclear: apaga tudo e recria do zero.
  // Seguro em desenvolvimento — schema v1 é incompatível com v2.
  db.pragma('foreign_keys = OFF')

  // Dropar tabela FTS5 primeiro (auto-remove shadow tables)
  db.exec(`DROP TABLE IF EXISTS search_index;`)

  // Dropar todas as demais tabelas
  const tables = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
  ).all() as { name: string }[]

  for (const { name } of tables) {
    db.prepare(`DROP TABLE IF EXISTS "${name}"`).run()
  }

  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION};`)
  db.pragma('foreign_keys = ON')
  log.info('Migração concluída — schema v2 pronto para criação')
}

function createTables(db: Database.Database): void {
  db.exec(`

    -- ── Core ──────────────────────────────────────────────────────────────────

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
      sort_order   INTEGER DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      parent_id   INTEGER REFERENCES pages(id) ON DELETE CASCADE,
      title       TEXT NOT NULL DEFAULT 'Sem título',
      icon        TEXT,
      cover       TEXT,
      cover_color TEXT,
      body_json   TEXT,
      sort_order  INTEGER DEFAULT 0,
      is_deleted  INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    -- ── Propriedades de Projeto ───────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS project_properties (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      prop_key    TEXT NOT NULL,
      prop_type   TEXT NOT NULL,
      is_required INTEGER DEFAULT 0,
      is_built_in INTEGER DEFAULT 0,
      sort_order  INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      UNIQUE (project_id, prop_key)
    );

    CREATE TABLE IF NOT EXISTS prop_options (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES project_properties(id) ON DELETE CASCADE,
      label       TEXT NOT NULL,
      color       TEXT,
      sort_order  INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS page_prop_values (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id     INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      property_id INTEGER NOT NULL REFERENCES project_properties(id) ON DELETE CASCADE,
      value_text  TEXT,
      value_num   REAL,
      value_bool  INTEGER,
      value_date  TEXT,
      value_date2 TEXT,
      value_json  TEXT,
      UNIQUE (page_id, property_id)
    );

    -- ── Views de Projeto ──────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS project_views (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id           INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name                 TEXT NOT NULL,
      view_type            TEXT NOT NULL,
      group_by_property_id INTEGER REFERENCES project_properties(id) ON DELETE SET NULL,
      date_property_id     INTEGER REFERENCES project_properties(id) ON DELETE SET NULL,
      visible_props_json   TEXT,
      filter_json          TEXT,
      sort_json            TEXT,
      include_subpages     INTEGER DEFAULT 0,
      is_default           INTEGER DEFAULT 0,
      sort_order           INTEGER DEFAULT 0
    );

    -- ── Tags globais ──────────────────────────────────────────────────────────

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

    -- ── Versionamento e backlinks ─────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS page_backlinks (
      source_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      target_page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      PRIMARY KEY (source_page_id, target_page_id)
    );

    CREATE TABLE IF NOT EXISTS page_versions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id    INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      body_json  TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- ── Calendário global ─────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS calendar_events (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id   INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title          TEXT NOT NULL,
      description    TEXT,
      start_dt       TEXT NOT NULL,
      end_dt         TEXT,
      all_day        INTEGER DEFAULT 0,
      color          TEXT,
      linked_page_id INTEGER REFERENCES pages(id) ON DELETE SET NULL,
      created_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      title           TEXT NOT NULL,
      trigger_at      TEXT NOT NULL,
      offset_minutes  INTEGER,
      linked_event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
      linked_page_id  INTEGER REFERENCES pages(id) ON DELETE SET NULL,
      is_dismissed    INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now'))
    );

    -- ── Recursos e leituras ───────────────────────────────────────────────────

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

    -- ── Sessões de tempo ──────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS time_sessions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
      page_id      INTEGER REFERENCES pages(id) ON DELETE SET NULL,
      project_id   INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      duration_min INTEGER NOT NULL,
      session_type TEXT DEFAULT 'manual',
      notes        TEXT,
      started_at   TEXT NOT NULL,
      ended_at     TEXT
    );

    -- ── Configurações ─────────────────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    -- ── Busca full-text ───────────────────────────────────────────────────────

    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      entity_type, entity_id, project_id, title, body
    );

  `)
}

// ── Seed padrão ───────────────────────────────────────────────────────────────

function seedDefaults(db: Database.Database): void {
  const ws = db.prepare('SELECT id FROM workspaces LIMIT 1').get()
  if (ws) return

  log.info('Criando workspace padrão')
  db.prepare(
    "INSERT INTO workspaces (name, icon, accent_color) VALUES ('Meu Workspace', '✦', '#b8860b')"
  ).run()
}
