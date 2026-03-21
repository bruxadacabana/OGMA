import { ipcMain } from 'electron'
import { dbGet, dbAll, dbRun, getDb } from './database'
import { createLogger, RENDERER_LOG_CHANNEL } from './logger'

const log   = createLogger('ipc')
const dbLog = createLogger('db')

// ── Classificação de erros ─────────────────────────────────────────────────────

type ErrorCode = 'DB_CONSTRAINT' | 'DB_WRITE' | 'DB_READ' | 'NOT_FOUND' | 'VALIDATION' | 'UNKNOWN'

function classifyError(err: Error): ErrorCode {
  const msg = (err.message ?? '').toLowerCase()
  if (msg.includes('unique') || msg.includes('constraint') || msg.includes('foreign key')) {
    return 'DB_CONSTRAINT'
  }
  if (msg.includes('no such') || msg.includes('not found')) return 'NOT_FOUND'
  if (msg.includes('readonly') || msg.includes('locked') || msg.includes('disk full')) {
    return 'DB_WRITE'
  }
  if (msg.includes('failed to fetch') || msg.includes('no rows')) return 'DB_READ'
  return 'UNKNOWN'
}

// ── Wrapper IPC ────────────────────────────────────────────────────────────────

const api = (channel: string, handler: (data: any) => any) => {
  ipcMain.handle(channel, (_event, data) => {
    try {
      return { ok: true, data: handler(data) }
    } catch (err: any) {
      const errorCode = classifyError(err)
      log.error(`handler:${channel}`, { error: err.message, errorCode, data })
      return { ok: false, error: err.message, errorCode }
    }
  })
}

// ── Seed interno: propriedades e views padrão por tipo de projeto ──────────────

function seedProjectProperties(projectId: number, projectType: string): Map<string, number> {
  const db = getDb()

  const insertProp = db.prepare(`
    INSERT INTO project_properties (project_id, name, prop_key, prop_type, is_built_in, sort_order)
    VALUES (?, ?, ?, ?, 1, ?)
  `)
  const insertOption = db.prepare(`
    INSERT INTO prop_options (property_id, label, color, sort_order)
    VALUES (?, ?, ?, ?)
  `)

  const propIds = new Map<string, number>()
  let order = 0

  const addProp = (name: string, key: string, type: string, options?: [string, string | null][]) => {
    const r     = insertProp.run(projectId, name, key, type, order++)
    const propId = Number(r.lastInsertRowid)
    propIds.set(key, propId)
    if (options) {
      options.forEach(([label, color], i) => insertOption.run(propId, label, color ?? null, i))
    }
  }

  const schemas: Record<string, () => void> = {
    academic: () => {
      addProp('Status', 'status', 'select', [
        ['Pendente', '#8B7355'], ['Cursando', '#b8860b'],
        ['Concluída', '#4A6741'], ['Trancada', '#8B3A2A'],
      ])
      addProp('Semestre',      'semestre',     'select')
      addProp('Área',          'area',         'multi_select')
      addProp('Carga Horária', 'carga_horaria','number')
      addProp('Créditos',      'creditos',     'number')
      addProp('Professor',     'professor',    'text')
      addProp('Data Início',   'data_inicio',  'date')
      addProp('Data Fim',      'data_fim',     'date')
      addProp('Código',        'codigo',       'text')
      addProp('Cor',           'cor',          'color')
    },
    software: () => {
      addProp('Status', 'status', 'select', [
        ['Backlog', '#8B7355'], ['A Fazer', '#7A5C2E'],
        ['Em Andamento', '#b8860b'], ['Em Revisão', '#2C5F8A'],
        ['Concluído', '#4A6741'],
      ])
      addProp('Prioridade', 'prioridade', 'select', [
        ['Baixa', '#4A6741'], ['Média', '#7A5C2E'],
        ['Alta', '#b8860b'], ['Urgente', '#8B3A2A'],
      ])
      addProp('Tags',        'tags',        'multi_select')
      addProp('Sprint',      'sprint',      'select')
      addProp('Data Limite', 'data_limite', 'date')
      addProp('Estimativa',  'estimativa',  'number')
    },
    health: () => {
      addProp('Status', 'status', 'select', [
        ['Não Iniciado', '#8B7355'], ['Em Andamento', '#b8860b'],
        ['Concluído', '#4A6741'], ['Abandonado', '#8B3A2A'],
      ])
      addProp('Frequência', 'frequencia', 'select', [
        ['Diário', null], ['Semanal', null], ['Mensal', null], ['Pontual', null],
      ])
      addProp('Data Início', 'data_inicio', 'date')
      addProp('Meta',        'meta',        'text')
      addProp('Progresso',   'progresso',   'number')
      addProp('Tags',        'tags',        'multi_select')
    },
    creative: () => {
      addProp('Status', 'status', 'select', [
        ['Ideia', '#8B7355'], ['Em Progresso', '#b8860b'],
        ['Pausado', '#7A5C2E'], ['Concluído', '#4A6741'], ['Publicado', '#2C5F8A'],
      ])
      addProp('Tags',        'tags',        'multi_select')
      addProp('Data Limite', 'data_limite', 'date')
      addProp('Prioridade', 'prioridade', 'select', [
        ['Baixa', '#4A6741'], ['Média', '#7A5C2E'], ['Alta', '#b8860b'],
      ])
    },
    research: () => {
      addProp('Status', 'status', 'select', [
        ['A Pesquisar', '#8B7355'], ['Em Andamento', '#b8860b'],
        ['Rascunho', '#7A5C2E'], ['Revisão', '#2C5F8A'], ['Concluído', '#4A6741'],
      ])
      addProp('Fonte', 'fonte', 'text')
      addProp('Data',  'data',  'date')
      addProp('Tags',  'tags',  'multi_select')
      addProp('Área',  'area',  'multi_select')
    },
    custom: () => {
      addProp('Status', 'status', 'select', [
        ['A Fazer', '#8B7355'], ['Em Andamento', '#b8860b'], ['Concluído', '#4A6741'],
      ])
      addProp('Tags', 'tags', 'multi_select')
      addProp('Data', 'data', 'date')
    },
  }

  ;(schemas[projectType] ?? schemas.custom)()
  return propIds
}

function seedProjectViews(
  projectId: number,
  projectType: string,
  propIds: Map<string, number>
): void {
  const db = getDb()

  const insertView = db.prepare(`
    INSERT INTO project_views
      (project_id, name, view_type, group_by_property_id, date_property_id, is_default, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  type ViewDef = [string, string, string | null, string | null]

  const viewConfigs: Record<string, ViewDef[]> = {
    academic: [
      ['Tabela',     'table',    null,     null       ],
      ['Kanban',     'kanban',   'status', null       ],
      ['Calendário', 'calendar', null,     'data_fim' ],
    ],
    software: [
      ['Kanban',     'kanban',   'status', null          ],
      ['Tabela',     'table',    null,     null          ],
      ['Calendário', 'calendar', null,     'data_limite' ],
    ],
    health: [
      ['Lista',      'list',     null,     null          ],
      ['Calendário', 'calendar', null,     'data_inicio' ],
      ['Tabela',     'table',    null,     null          ],
    ],
    creative: [
      ['Kanban', 'kanban', 'status', null],
      ['Tabela', 'table',  null,     null],
    ],
    research: [
      ['Tabela', 'table', null, null],
      ['Lista',  'list',  null, null],
    ],
    custom: [
      ['Tabela', 'table',  null,     null],
      ['Kanban', 'kanban', 'status', null],
    ],
  }

  const configs: ViewDef[] = viewConfigs[projectType] ?? viewConfigs.custom

  configs.forEach(([name, type, groupByKey, dateKey], i) => {
    const groupByPropId = groupByKey ? (propIds.get(groupByKey) ?? null) : null
    const datePropId    = dateKey    ? (propIds.get(dateKey)    ?? null) : null
    const isDefault     = i === 0 ? 1 : 0
    insertView.run(projectId, name, type, groupByPropId, datePropId, isDefault, i)
  })
}

// ── Handlers ──────────────────────────────────────────────────────────────────

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
    const db = getDb()

    const project = db.transaction(() => {
      const r = db.prepare(`
        INSERT INTO projects
          (workspace_id, name, description, icon, color, project_type,
           subcategory, status, date_start, date_end, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.workspace_id, data.name, data.description ?? null,
        data.icon ?? null, data.color ?? null, data.project_type ?? 'custom',
        data.subcategory ?? null, data.status ?? 'active',
        data.date_start ?? null, data.date_end ?? null,
        data.sort_order ?? 0
      )

      const projectId = Number(r.lastInsertRowid)
      const propIds   = seedProjectProperties(projectId, data.project_type ?? 'custom')
      seedProjectViews(projectId, data.project_type ?? 'custom', propIds)

      return db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId)
    })()

    dbLog.info('projects:create', { id: (project as any)?.id, name: data.name })
    return project
  })

  api('projects:update', (data) => {
    dbRun(`
      UPDATE projects SET name=?, description=?, icon=?, color=?,
        project_type=?, subcategory=?, status=?, date_start=?, date_end=?,
        sort_order=?, updated_at=datetime('now')
      WHERE id=?`,
      data.name, data.description ?? null, data.icon ?? null,
      data.color ?? null, data.project_type, data.subcategory ?? null,
      data.status, data.date_start ?? null, data.date_end ?? null,
      data.sort_order ?? 0, data.id
    )
    dbLog.info('projects:update', { id: data.id })
    return dbGet('SELECT * FROM projects WHERE id = ?', data.id)
  })

  api('projects:delete', ({ id }) => {
    dbLog.info('projects:delete', { id })
    return dbRun('DELETE FROM projects WHERE id = ?', id)
  })

  api('projects:getProperties', ({ id }) =>
    dbAll(
      'SELECT * FROM project_properties WHERE project_id = ? ORDER BY sort_order, id',
      id
    )
  )

  api('projects:getViews', ({ id }) =>
    dbAll(
      'SELECT * FROM project_views WHERE project_id = ? ORDER BY sort_order, id',
      id
    )
  )

  // ── Páginas ──────────────────────────────────────────────────────────────
  api('pages:list', ({ project_id }) => {
    const pages = dbAll(
      'SELECT * FROM pages WHERE project_id = ? AND is_deleted = 0 ORDER BY sort_order, title',
      project_id
    )
    if (pages.length === 0) return []

    const pageIds     = pages.map((p: any) => p.id)
    const placeholders = pageIds.map(() => '?').join(',')
    const propValues  = dbAll(
      `SELECT ppv.*, pp.prop_key, pp.prop_type, pp.name AS prop_name
       FROM page_prop_values ppv
       JOIN project_properties pp ON pp.id = ppv.property_id
       WHERE ppv.page_id IN (${placeholders})`,
      ...pageIds
    )

    const valuesByPage = new Map<number, any[]>()
    for (const pv of propValues) {
      if (!valuesByPage.has(pv.page_id)) valuesByPage.set(pv.page_id, [])
      valuesByPage.get(pv.page_id)!.push(pv)
    }

    return pages.map((page: any) => ({
      ...page,
      prop_values: valuesByPage.get(page.id) ?? [],
    }))
  })

  api('pages:get', ({ id }) => {
    const page = dbGet('SELECT * FROM pages WHERE id = ? AND is_deleted = 0', id)
    if (!page) return null

    const propValues = dbAll(
      `SELECT ppv.*, pp.prop_key, pp.prop_type, pp.name AS prop_name
       FROM page_prop_values ppv
       JOIN project_properties pp ON pp.id = ppv.property_id
       WHERE ppv.page_id = ?`,
      id
    )
    return { ...page, prop_values: propValues }
  })

  api('pages:create', (data) => {
    const r = dbRun(`
      INSERT INTO pages (project_id, parent_id, title, icon, cover, cover_color, body_json, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      data.project_id, data.parent_id ?? null, data.title ?? 'Sem título',
      data.icon ?? null, data.cover ?? null, data.cover_color ?? null,
      data.body_json ?? null, data.sort_order ?? 0
    )
    return dbGet('SELECT * FROM pages WHERE id = ?', r.lastInsertRowid)
  })

  api('pages:update', (data) => {
    const cols: string[] = ["updated_at = datetime('now')"]
    const params: any[]  = []
    if (data.title       !== undefined) { cols.push('title = ?');       params.push(data.title) }
    if (data.icon        !== undefined) { cols.push('icon = ?');        params.push(data.icon ?? null) }
    if (data.cover       !== undefined) { cols.push('cover = ?');       params.push(data.cover ?? null) }
    if (data.cover_color !== undefined) { cols.push('cover_color = ?'); params.push(data.cover_color ?? null) }
    if (data.body_json   !== undefined) { cols.push('body_json = ?');   params.push(data.body_json ?? null) }
    if (data.sort_order  !== undefined) { cols.push('sort_order = ?');  params.push(data.sort_order) }
    params.push(data.id)
    dbRun(`UPDATE pages SET ${cols.join(', ')} WHERE id = ?`, ...params)
    return dbGet('SELECT * FROM pages WHERE id = ?', data.id)
  })

  api('pages:delete', ({ id }) =>
    dbRun("UPDATE pages SET is_deleted=1, updated_at=datetime('now') WHERE id=?", id)
  )

  api('pages:reorder', (items: { id: number; sort_order: number }[]) => {
    const db   = getDb()
    const stmt = db.prepare('UPDATE pages SET sort_order=? WHERE id=?')
    db.transaction(() => {
      for (const { id, sort_order } of items) stmt.run(sort_order, id)
    })()
    return { ok: true }
  })

  api('pages:listRecent', ({ limit }) => {
    const n = limit ?? 8
    return dbAll(`
      SELECT p.id, p.title, p.icon, p.project_id, p.updated_at, p.created_at,
             pr.name AS project_name, pr.color AS project_color, pr.icon AS project_icon
      FROM pages p
      JOIN projects pr ON pr.id = p.project_id
      WHERE p.is_deleted = 0
      ORDER BY p.updated_at DESC
      LIMIT ?
    `, n)
  })

  api('pages:listUpcoming', ({ days }) => {
    const d       = days ?? 14
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + d)
    const endStr  = endDate.toISOString().slice(0, 10)
    return dbAll(`
      SELECT p.id, p.title, p.icon, p.project_id,
             ppv.value_date, pp.name AS prop_name,
             pr.name AS project_name, pr.color AS project_color
      FROM pages p
      JOIN page_prop_values ppv ON ppv.page_id = p.id
      JOIN project_properties pp ON pp.id = ppv.property_id
      JOIN projects pr ON pr.id = p.project_id
      WHERE p.is_deleted = 0
        AND pp.prop_type = 'date'
        AND ppv.value_date IS NOT NULL
        AND ppv.value_date >= date('now')
        AND ppv.value_date <= ?
      ORDER BY ppv.value_date ASC
      LIMIT 8
    `, endStr)
  })

  api('pages:setPropValue', (data) => {
    dbRun(`
      INSERT INTO page_prop_values
        (page_id, property_id, value_text, value_num, value_bool, value_date, value_date2, value_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(page_id, property_id) DO UPDATE SET
        value_text  = excluded.value_text,
        value_num   = excluded.value_num,
        value_bool  = excluded.value_bool,
        value_date  = excluded.value_date,
        value_date2 = excluded.value_date2,
        value_json  = excluded.value_json
    `,
      data.page_id, data.property_id,
      data.value_text  ?? null, data.value_num   ?? null,
      data.value_bool  ?? null, data.value_date  ?? null,
      data.value_date2 ?? null, data.value_json  ?? null
    )
    return { ok: true }
  })

  // ── Propriedades ─────────────────────────────────────────────────────────
  api('properties:create', (data) => {
    const max = dbGet(
      'SELECT COALESCE(MAX(sort_order), -1) AS m FROM project_properties WHERE project_id = ?',
      data.project_id
    )?.m ?? -1
    const r = dbRun(`
      INSERT INTO project_properties (project_id, name, prop_key, prop_type, is_required, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)`,
      data.project_id, data.name, data.prop_key, data.prop_type,
      data.is_required ?? 0, data.sort_order ?? (max + 1)
    )
    return dbGet('SELECT * FROM project_properties WHERE id = ?', r.lastInsertRowid)
  })

  api('properties:update', (data) => {
    dbRun(
      'UPDATE project_properties SET name=?, prop_type=?, is_required=? WHERE id=?',
      data.name, data.prop_type, data.is_required ?? 0, data.id
    )
    return dbGet('SELECT * FROM project_properties WHERE id = ?', data.id)
  })

  api('properties:delete', ({ id }) => {
    dbRun('DELETE FROM project_properties WHERE id = ?', id)
    return { ok: true }
  })

  api('properties:reorder', (items: { id: number; sort_order: number }[]) => {
    const db   = getDb()
    const stmt = db.prepare('UPDATE project_properties SET sort_order=? WHERE id=?')
    db.transaction(() => {
      for (const { id, sort_order } of items) stmt.run(sort_order, id)
    })()
    return { ok: true }
  })

  api('properties:getOptions', ({ id }) =>
    dbAll('SELECT * FROM prop_options WHERE property_id = ? ORDER BY sort_order, id', id)
  )

  api('properties:createOption', (data) => {
    const max = dbGet(
      'SELECT COALESCE(MAX(sort_order), -1) AS m FROM prop_options WHERE property_id = ?',
      data.property_id
    )?.m ?? -1
    const r = dbRun(
      'INSERT INTO prop_options (property_id, label, color, sort_order) VALUES (?, ?, ?, ?)',
      data.property_id, data.label, data.color ?? null,
      data.sort_order ?? (max + 1)
    )
    return dbGet('SELECT * FROM prop_options WHERE id = ?', r.lastInsertRowid)
  })

  api('properties:updateOption', (data) => {
    dbRun(
      'UPDATE prop_options SET label=?, color=? WHERE id=?',
      data.label, data.color ?? null, data.id
    )
    return dbGet('SELECT * FROM prop_options WHERE id = ?', data.id)
  })

  api('properties:deleteOption', ({ id }) => {
    dbRun('DELETE FROM prop_options WHERE id = ?', id)
    return { ok: true }
  })

  api('properties:reorderOptions', (items: { id: number; sort_order: number }[]) => {
    const db   = getDb()
    const stmt = db.prepare('UPDATE prop_options SET sort_order=? WHERE id=?')
    db.transaction(() => {
      for (const { id, sort_order } of items) stmt.run(sort_order, id)
    })()
    return { ok: true }
  })

  // ── Views ─────────────────────────────────────────────────────────────────
  api('views:create', (data) => {
    const max = dbGet(
      'SELECT COALESCE(MAX(sort_order), -1) AS m FROM project_views WHERE project_id = ?',
      data.project_id
    )?.m ?? -1
    const r = dbRun(`
      INSERT INTO project_views
        (project_id, name, view_type, group_by_property_id, date_property_id,
         visible_props_json, is_default, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      data.project_id, data.name, data.view_type,
      data.group_by_property_id ?? null, data.date_property_id ?? null,
      data.visible_props_json ?? null, data.is_default ?? 0,
      data.sort_order ?? (max + 1)
    )
    return dbGet('SELECT * FROM project_views WHERE id = ?', r.lastInsertRowid)
  })

  api('views:update', (data) => {
    dbRun(`
      UPDATE project_views SET name=?, view_type=?, group_by_property_id=?,
        date_property_id=?, visible_props_json=?, filter_json=?, sort_json=?,
        include_subpages=?
      WHERE id=?`,
      data.name, data.view_type, data.group_by_property_id ?? null,
      data.date_property_id ?? null, data.visible_props_json ?? null,
      data.filter_json ?? null, data.sort_json ?? null,
      data.include_subpages ?? 0, data.id
    )
    return dbGet('SELECT * FROM project_views WHERE id = ?', data.id)
  })

  api('views:delete', ({ id }) => {
    dbRun('DELETE FROM project_views WHERE id = ?', id)
    return { ok: true }
  })

  api('views:setDefault', ({ id }) => {
    const view = dbGet('SELECT project_id FROM project_views WHERE id = ?', id)
    if (!view) throw new Error('View não encontrada')
    const db = getDb()
    db.transaction(() => {
      db.prepare('UPDATE project_views SET is_default=0 WHERE project_id=?').run(view.project_id)
      db.prepare('UPDATE project_views SET is_default=1 WHERE id=?').run(id)
    })()
    return { ok: true }
  })

  // ── Upload de imagens ─────────────────────────────────────────────────────
  api('uploads:saveImage', ({ data }: { data: string; name: string }) => {
    const crypto = require('crypto')
    const fs     = require('fs')
    const path   = require('path')
    const { UPLOADS_DIR } = require('./paths')

    const match  = data.match(/^data:image\/([a-zA-Z]+);base64,/)
    const ext    = match ? match[1].replace('jpeg', 'jpg') : 'png'
    const base64 = data.replace(/^data:image\/[a-zA-Z]+;base64,/, '')
    const hash   = crypto.createHash('sha256').update(base64).digest('hex').slice(0, 16)
    const fname  = `${hash}.${ext}`
    const fpath  = path.join(UPLOADS_DIR, fname)

    if (!fs.existsSync(fpath)) {
      fs.writeFileSync(fpath, Buffer.from(base64, 'base64'))
    }

    return { url: `file://${fpath}` }
  })

  // ── Configurações ─────────────────────────────────────────────────────────
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
