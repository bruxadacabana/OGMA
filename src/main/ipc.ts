import { ipcMain } from 'electron'
import { dbGet, dbAll, dbRun, getDb } from './database'
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

  // ── Kanban ───────────────────────────────────────────────────────────────

  api('kanban:getBoard', ({ page_id }) => {
    let cols = dbAll(
      'SELECT * FROM kanban_columns WHERE page_id=? ORDER BY sort_order, id',
      page_id
    )

    // Criar colunas padrão se a página ainda não tiver nenhuma
    if (cols.length === 0) {
      const defaults: [string, string | null, number][] = [
        ['A Fazer',      null,       0],
        ['Em Progresso', '#b8860b',  1],
        ['Concluído',    '#4A6741',  2],
      ]
      for (const [name, color, order] of defaults) {
        dbRun(
          'INSERT INTO kanban_columns (page_id, name, color, sort_order) VALUES (?,?,?,?)',
          page_id, name, color, order
        )
      }
      cols = dbAll(
        'SELECT * FROM kanban_columns WHERE page_id=? ORDER BY sort_order, id',
        page_id
      )
    }

    return cols.map((col: any) => ({
      ...col,
      cards: dbAll(
        'SELECT * FROM kanban_cards WHERE column_id=? ORDER BY sort_order, id',
        col.id
      ).map((card: any) => ({
        ...card,
        checklists: dbAll(
          'SELECT * FROM kanban_checklists WHERE card_id=? ORDER BY sort_order, id',
          card.id
        ),
        tags: dbAll(
          'SELECT t.* FROM tags t JOIN card_tags ct ON ct.tag_id=t.id WHERE ct.card_id=?',
          card.id
        ),
      })),
    }))
  })

  api('kanban:createColumn', ({ page_id, name, color }) => {
    const max = dbGet(
      'SELECT COALESCE(MAX(sort_order),-1) AS m FROM kanban_columns WHERE page_id=?',
      page_id
    )?.m ?? -1
    const r = dbRun(
      'INSERT INTO kanban_columns (page_id, name, color, sort_order) VALUES (?,?,?,?)',
      page_id, name, color ?? null, max + 1
    )
    return dbGet('SELECT * FROM kanban_columns WHERE id=?', r.lastInsertRowid)
  })

  api('kanban:updateColumn', ({ id, name, color }) => {
    dbRun('UPDATE kanban_columns SET name=?, color=? WHERE id=?', name, color ?? null, id)
    return dbGet('SELECT * FROM kanban_columns WHERE id=?', id)
  })

  api('kanban:deleteColumn', ({ id }) => {
    dbRun('DELETE FROM kanban_columns WHERE id=?', id)
    return { ok: true }
  })

  api('kanban:createCard', ({ column_id, title, description, priority, due_date }) => {
    const max = dbGet(
      'SELECT COALESCE(MAX(sort_order),-1) AS m FROM kanban_cards WHERE column_id=?',
      column_id
    )?.m ?? -1
    const r = dbRun(
      `INSERT INTO kanban_cards
         (column_id, title, description, priority, due_date, sort_order)
       VALUES (?,?,?,?,?,?)`,
      column_id, title,
      description ?? null, priority ?? 'media',
      due_date ?? null, max + 1
    )
    return dbGet('SELECT * FROM kanban_cards WHERE id=?', r.lastInsertRowid)
  })

  api('kanban:updateCard', ({ id, title, description, priority, due_date, is_done }) => {
    dbRun(
      `UPDATE kanban_cards
       SET title=?, description=?, priority=?, due_date=?, is_done=?,
           updated_at=datetime('now')
       WHERE id=?`,
      title, description ?? null, priority, due_date ?? null, is_done ?? 0, id
    )
    return dbGet('SELECT * FROM kanban_cards WHERE id=?', id)
  })

  api('kanban:moveCard', ({ card_id, column_id, before_card_id }) => {
    const db = getDb()

    // Cartas da coluna destino (exceto a carta sendo movida), em ordem
    const cards: any[] = db.prepare(
      'SELECT id FROM kanban_cards WHERE column_id=? AND id!=? ORDER BY sort_order, id'
    ).all(column_id, card_id)

    // Calcular ponto de inserção
    let insertIdx = cards.length
    if (before_card_id != null) {
      const idx = cards.findIndex((c: any) => c.id === before_card_id)
      if (idx >= 0) insertIdx = idx
    }
    cards.splice(insertIdx, 0, { id: card_id })

    const setCol   = db.prepare("UPDATE kanban_cards SET column_id=?, updated_at=datetime('now') WHERE id=?")
    const setOrder = db.prepare('UPDATE kanban_cards SET sort_order=? WHERE id=?')

    db.transaction(() => {
      setCol.run(column_id, card_id)
      cards.forEach((c: any, i: number) => setOrder.run(i, c.id))
    })()

    return { ok: true }
  })

  api('kanban:deleteCard', ({ id }) => {
    dbRun('DELETE FROM kanban_cards WHERE id=?', id)
    return { ok: true }
  })

  api('kanban:createChecklist', ({ card_id, text }) => {
    const max = dbGet(
      'SELECT COALESCE(MAX(sort_order),-1) AS m FROM kanban_checklists WHERE card_id=?',
      card_id
    )?.m ?? -1
    const r = dbRun(
      'INSERT INTO kanban_checklists (card_id, text, sort_order) VALUES (?,?,?)',
      card_id, text, max + 1
    )
    return dbGet('SELECT * FROM kanban_checklists WHERE id=?', r.lastInsertRowid)
  })

  api('kanban:updateChecklist', ({ id, text, is_checked }) => {
    dbRun(
      'UPDATE kanban_checklists SET text=?, is_checked=? WHERE id=?',
      text, is_checked, id
    )
    return dbGet('SELECT * FROM kanban_checklists WHERE id=?', id)
  })

  api('kanban:deleteChecklist', ({ id }) => {
    dbRun('DELETE FROM kanban_checklists WHERE id=?', id)
    return { ok: true }
  })

  api('kanban:setCardTags', ({ card_id, tag_names }) => {
    const db = getDb()
    const ws = db.prepare('SELECT id FROM workspaces LIMIT 1').get() as any
    if (!ws) return { ok: true }

    const upsertTag = db.prepare('INSERT OR IGNORE INTO tags (workspace_id, name) VALUES (?,?)')
    const getTag    = db.prepare('SELECT id FROM tags WHERE workspace_id=? AND name=?')
    const clearTags = db.prepare('DELETE FROM card_tags WHERE card_id=?')
    const addTag    = db.prepare('INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?,?)')

    db.transaction(() => {
      clearTags.run(card_id)
      for (const raw of (tag_names as string[])) {
        const name = raw.trim()
        if (!name) continue
        upsertTag.run(ws.id, name)
        const tag = getTag.get(ws.id, name) as any
        if (tag) addTag.run(card_id, tag.id)
      }
    })()

    return { ok: true }
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
