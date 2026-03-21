import { ipcMain } from 'electron'
import { dbGet, dbAll, dbRun } from './database'
import { createLogger, RENDERER_LOG_CHANNEL } from './logger'

const log   = createLogger('ipc')
const dbLog = createLogger('db')

const api = (channel: string, handler: (data: any) => any) => {
  ipcMain.handle(channel, (_event, data) => {
    try {
      return { ok: true, data: handler(data) }
    } catch (err: any) {
      log.error(`handler:${channel}`, { error: err.message, data })
      return { ok: false, error: err.message }
    }
  })
}

export function registerIpcHandlers(): void {

  // ── Log do renderer ──────────────────────────────────────────────────────
  ipcMain.handle(RENDERER_LOG_CHANNEL, (_event, entry: any) => {
    const rLog = createLogger(`renderer:${entry.module ?? 'unknown'}`)
    if (entry.level === 'WARN')  rLog.warn(entry.message, entry.meta)
    if (entry.level === 'ERROR') rLog.error(entry.message, entry.meta)
  })

  // ── Workspace ────────────────────────────────────────────────────────────
  api('workspace:get', () =>
    dbGet('SELECT * FROM workspaces LIMIT 1')
  )

  api('workspace:update', (data) => {
    dbRun(
      "UPDATE workspaces SET name=?, icon=?, accent_color=?, updated_at=datetime('now') WHERE id=?",
      data.name, data.icon, data.accent_color, data.id
    )
    return dbGet('SELECT * FROM workspaces WHERE id = ?', data.id)
  })

  // ── Projetos ─────────────────────────────────────────────────────────────
  api('projects:list', () =>
    dbAll("SELECT * FROM projects WHERE status != 'archived' ORDER BY sort_order, name")
  )

  api('projects:create', (data) => {
    const r = dbRun(`
      INSERT INTO projects
        (workspace_id, name, description, icon, color, project_type,
         subcategory, status, date_start, date_end, extra_fields, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      data.workspace_id, data.name, data.description ?? null,
      data.icon ?? null, data.color ?? null, data.project_type ?? 'custom',
      data.subcategory ?? null, data.status ?? 'active',
      data.date_start ?? null, data.date_end ?? null,
      data.extra_fields ? JSON.stringify(data.extra_fields) : null,
      data.sort_order ?? 0
    )
    const project = dbGet('SELECT * FROM projects WHERE id = ?', r.lastInsertRowid)
    dbLog.info('projects:create', { id: project?.id, name: data.name })
    return project
  })

  api('projects:update', (data) => {
    dbRun(`
      UPDATE projects SET name=?, description=?, icon=?, color=?,
        project_type=?, subcategory=?, status=?, date_start=?, date_end=?,
        extra_fields=?, sort_order=?, updated_at=datetime('now')
      WHERE id=?`,
      data.name, data.description ?? null, data.icon ?? null,
      data.color ?? null, data.project_type, data.subcategory ?? null,
      data.status, data.date_start ?? null, data.date_end ?? null,
      data.extra_fields ? JSON.stringify(data.extra_fields) : null,
      data.sort_order ?? 0, data.id
    )
    dbLog.info('projects:update', { id: data.id })
    return dbGet('SELECT * FROM projects WHERE id = ?', data.id)
  })

  api('projects:delete', ({ id }) => {
    dbLog.info('projects:delete', { id })
    return dbRun('DELETE FROM projects WHERE id = ?', id)
  })

  // ── Páginas ──────────────────────────────────────────────────────────────
  api('pages:list', ({ project_id }) =>
    dbAll(
      'SELECT * FROM pages WHERE project_id = ? AND is_deleted = 0 ORDER BY sort_order, title',
      project_id
    )
  )

  api('pages:create', (data) => {
    const r = dbRun(`
      INSERT INTO pages (project_id, parent_id, title, icon, cover, page_type, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      data.project_id, data.parent_id ?? null, data.title ?? 'Sem título',
      data.icon ?? null, data.cover ?? null, data.page_type ?? 'document',
      data.sort_order ?? 0
    )
    return dbGet('SELECT * FROM pages WHERE id = ?', r.lastInsertRowid)
  })

  api('pages:update', (data) => {
    dbRun(`
      UPDATE pages SET title=?, icon=?, cover=?, content_json=?,
        sort_order=?, updated_at=datetime('now')
      WHERE id=?`,
      data.title, data.icon ?? null, data.cover ?? null,
      data.content_json ?? null, data.sort_order ?? 0, data.id
    )
    return dbGet('SELECT * FROM pages WHERE id = ?', data.id)
  })

  api('pages:delete', ({ id }) =>
    dbRun("UPDATE pages SET is_deleted=1, updated_at=datetime('now') WHERE id=?", id)
  )


  // ── Upload de imagens ───────────────────────────────────────────────────
  api('uploads:saveImage', ({ data, name }: { data: string; name: string }) => {
    const crypto = require('crypto')
    const fs     = require('fs')
    const path   = require('path')
    const { UPLOADS_DIR } = require('./paths')

    // Extrair extensão e base64
    const match = data.match(/^data:image\/([a-zA-Z]+);base64,/)
    const ext   = match ? match[1].replace("jpeg", "jpg") : "png"
    const base64 = data.replace(/^data:image\/[a-zA-Z]+;base64,/, "")
    const hash   = crypto.createHash("sha256").update(base64).digest("hex").slice(0, 16)
    const fname  = `${hash}.${ext}`
    const fpath  = path.join(UPLOADS_DIR, fname)

    if (!fs.existsSync(fpath)) {
      fs.writeFileSync(fpath, Buffer.from(base64, "base64"))
    }

    return { url: `file://${fpath}` }
  })

  // ── Configurações ────────────────────────────────────────────────────────
  api('config:get', ({ key }) => {
    const row = dbGet('SELECT value FROM settings WHERE key = ?', key)
    return row?.value ?? null
  })

  api('config:set', ({ key, value }) =>
    dbRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value)
  )

  api('config:getAll', () => {
    const rows = dbAll('SELECT key, value FROM settings')
    return Object.fromEntries(rows.map((r: any) => [r.key, r.value]))
  })
}
