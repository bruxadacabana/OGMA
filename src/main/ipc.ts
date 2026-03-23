import { ipcMain } from 'electron'
import https from 'https'
import http from 'http'
import { dbGet, dbAll, dbRun, getDb } from './database'
import { createLogger, RENDERER_LOG_CHANNEL } from './logger'
import { getSetting, setSetting, getAllSettings, AppSettings } from './settings'

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
      const year = new Date().getFullYear()
      addProp('Trimestre', 'trimestre', 'select', [
        [`${year - 1}.1`, null], [`${year - 1}.2`, null], [`${year - 1}.3`, null], [`${year - 1}.4`, null],
        [`${year}.1`,     null], [`${year}.2`,     null], [`${year}.3`,     null], [`${year}.4`,     null],
        [`${year + 1}.1`, null], [`${year + 1}.2`, null], [`${year + 1}.3`, null], [`${year + 1}.4`, null],
      ])
      addProp('Área', 'area', 'multi_select', [
        ['Humanas', '#7A5C2E'], ['Exatas', '#2C5F8A'], ['Biológicas', '#4A6741'],
        ['Computação', '#4A3A7A'], ['Linguagens', '#6A4A2E'], ['Artes', '#8A2A5A'],
      ])
      addProp('Nota',          'nota',         'number')
      addProp('Créditos',      'creditos',     'number')
      addProp('Carga Horária', 'carga_horaria','number')
      addProp('Professor',     'professor',    'text')
      addProp('Código',        'codigo',       'text')
      addProp('Data Início',   'data_inicio',  'date')
      addProp('Data Fim',      'data_fim',     'date')
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
      ['Progresso',  'progress', 'trimestre', null     ],
      ['Tabela',     'table',    null,        null     ],
      ['Kanban',     'kanban',   'status',    null     ],
      ['Calendário', 'calendar', null,        'data_fim'],
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

// ── FTS5: extração de texto do body_json do Editor.js ────────────────────────

function extractBodyText(bodyJson: string | null | undefined): string {
  if (!bodyJson) return ''
  try {
    const data = JSON.parse(bodyJson)
    return (data.blocks ?? []).map((b: any) => {
      const d = b.data ?? {}
      if (typeof d.text === 'string')   return d.text.replace(/<[^>]*>/g, ' ')
      if (Array.isArray(d.items))       return d.items.map((it: any) =>
        typeof it === 'string' ? it : (it.content ?? '')
      ).join(' ')
      if (typeof d.caption === 'string') return d.caption
      return ''
    }).filter(Boolean).join(' ')
  } catch { return '' }
}

function ftsUpsert(pageId: number, projectId: number, title: string, body: string) {
  dbRun(`DELETE FROM search_index WHERE entity_type = 'page' AND entity_id = ?`, pageId)
  dbRun(
    `INSERT INTO search_index (entity_type, entity_id, project_id, title, body) VALUES ('page', ?, ?, ?, ?)`,
    pageId, projectId, title, body
  )
}

// ── Helpers de fetch para metadados ───────────────────────────────────────────

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, { headers: { 'User-Agent': 'OGMA/1.0 (metadata-fetcher)' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJson(res.headers.location).then(resolve).catch(reject)
        return
      }
      let data = ''
      res.on('data', (c: any) => { data += c })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { reject(new Error('JSON inválido')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function fetchHtml(url: string, depth = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    if (depth > 3) { reject(new Error('Too many redirects')); return }
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OGMA/1.0)' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchHtml(res.headers.location, depth + 1).then(resolve).catch(reject)
        return
      }
      let data = ''
      res.on('data', (c: any) => { data += c })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function parseOgTags(html: string): Record<string, string> {
  const m: Record<string, string> = {}
  const og = /<meta[^>]+property=["']og:([^"']+)["'][^>]+content=["']([^"']*)["'][^>]*>/gi
  let r
  while ((r = og.exec(html)) !== null) m[r[1]] = r[2]
  const tw = /<meta[^>]+name=["']twitter:([^"']+)["'][^>]+content=["']([^"']*)["'][^>]*>/gi
  while ((r = tw.exec(html)) !== null) if (!m[r[1]]) m[r[1]] = r[2]
  const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleM) m['page_title'] = titleM[1].trim()
  const descM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
  if (descM && !m['description']) m['description'] = descM[1]
  return m
}

async function fetchMetadata(type: string, query: string, url?: string): Promise<Record<string, any>> {
  try {
    if (type === 'livro') {
      const isISBN = /^[\d -]{9,17}$/.test(query)
      const encoded = encodeURIComponent(query.replace(/[-\s]/g, ''))
      if (isISBN) {
        const data = await fetchJson(`https://openlibrary.org/isbn/${encoded}.json`)
        if (data?.title) {
          return {
            title: data.title,
            publisher: data.publishers?.join(', '),
            year: data.publish_date ? parseInt(data.publish_date) || undefined : undefined,
            pages: data.number_of_pages,
            isbn: encoded,
          }
        }
      }
      const olFields = 'key,title,author_name,first_publish_year,number_of_pages_median,isbn,publisher,language,cover_i'
      const data = await fetchJson(`https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=1&fields=${olFields}`)
      const doc = data?.docs?.[0]
      if (!doc) return {}
      return {
        title:       doc.title,
        author:      doc.author_name?.join(', ') ?? null,
        year:        doc.first_publish_year ?? null,
        pages:       doc.number_of_pages_median ?? null,
        isbn:        doc.isbn?.[0] ?? null,
        publisher:   doc.publisher?.[0] ?? null,
        language:    doc.language?.[0] ?? null,
        cover_url:   doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        cover_url_m: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      }
    }

    if (type === 'artigo') {
      const isDOI = /^10\.\d{4,}\//.test(query)
      if (isDOI) {
        const data = await fetchJson(`https://api.crossref.org/works/${encodeURIComponent(query)}`)
        const w = data?.message
        if (w) return {
          title:   w.title?.[0],
          authors: w.author?.map((a: any) => `${a.given ?? ''} ${a.family ?? ''}`.trim()).join(', '),
          journal: w['container-title']?.[0],
          year:    w.published?.['date-parts']?.[0]?.[0],
          doi:     w.DOI,
          volume:  w.volume,
          issue:   w.issue,
        }
      }
      const data = await fetchJson(`https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=1`)
      const w = data?.message?.items?.[0]
      if (!w) return {}
      return {
        title:   w.title?.[0],
        authors: w.author?.map((a: any) => `${a.given ?? ''} ${a.family ?? ''}`.trim()).join(', '),
        journal: w['container-title']?.[0],
        year:    w.published?.['date-parts']?.[0]?.[0],
        doi:     w.DOI,
        volume:  w.volume,
        issue:   w.issue,
      }
    }

    if (type === 'video' && url) {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const data = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
        return { title: data.title, channel: data.author_name, thumbnail_url: data.thumbnail_url, platform: 'YouTube' }
      }
    }

    if (url) {
      const html = await fetchHtml(url)
      const tags = parseOgTags(html)
      let domain = ''
      try { domain = new URL(url).hostname } catch {}
      return {
        title:       tags.title || tags.page_title,
        description: tags.description || tags['description'],
        thumbnail:   tags.image,
        domain,
      }
    }
  } catch (e: any) {
    log.warn('fetchMetadata error', e?.message)
  }
  return {}
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
        project_type=?, subcategory=?, semester=?, status=?, date_start=?, date_end=?,
        sort_order=?, updated_at=datetime('now')
      WHERE id=?`,
      data.name, data.description ?? null, data.icon ?? null,
      data.color ?? null, data.project_type, data.subcategory ?? null,
      data.semester ?? null,
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
    const pageId = Number(r.lastInsertRowid)
    ftsUpsert(pageId, data.project_id, data.title ?? 'Sem título', extractBodyText(data.body_json))

    // Auto-gerar código PREFIX### para projetos académicos
    if (data.project_id) {
      try {
        const project = dbGet(`SELECT project_type FROM projects WHERE id = ?`, data.project_id)
        if (project?.project_type === 'academic') {
          const codigoProp = dbGet(
            `SELECT id FROM project_properties WHERE project_id = ? AND prop_key = 'codigo'`,
            data.project_id
          )
          if (codigoProp) {
            const existingCodes = dbAll(
              `SELECT ppv.value_text FROM page_prop_values ppv WHERE ppv.property_id = ? AND ppv.value_text IS NOT NULL`,
              codigoProp.id
            ).map((row: any) => row.value_text as string)

            const title  = data.title ?? 'Sem título'
            const prefix = title
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              .toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X')
            const pattern = new RegExp(`^${prefix}(\\d+)$`)
            const nums = existingCodes
              .map(c => c?.match(pattern)?.[1])
              .filter(Boolean).map(Number)
            const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
            const codigo = `${prefix}${String(next).padStart(3, '0')}`

            dbRun(
              `INSERT INTO page_prop_values (page_id, property_id, value_text)
               VALUES (?, ?, ?)
               ON CONFLICT(page_id, property_id) DO UPDATE SET value_text = excluded.value_text`,
              pageId, codigoProp.id, codigo
            )
          }
        }
      } catch { /* não bloqueia a criação da página */ }
    }

    return dbGet('SELECT * FROM pages WHERE id = ?', pageId)
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
    // Atualizar índice FTS5
    if (data.title !== undefined || data.body_json !== undefined) {
      const page = dbGet('SELECT project_id, title, body_json FROM pages WHERE id = ?', data.id)
      if (page) ftsUpsert(data.id, page.project_id, page.title, extractBodyText(page.body_json))
    }
    return dbGet('SELECT * FROM pages WHERE id = ?', data.id)
  })

  api('pages:delete', ({ id }) => {
    dbRun(`DELETE FROM search_index WHERE entity_type = 'page' AND entity_id = ?`, id)
    return dbRun("UPDATE pages SET is_deleted=1, updated_at=datetime('now') WHERE id=?", id)
  })

  api('pages:reorder', (items: { id: number; sort_order: number }[]) => {
    const db   = getDb()
    const stmt = db.prepare('UPDATE pages SET sort_order=? WHERE id=?')
    db.transaction(() => {
      for (const { id, sort_order } of items) stmt.run(sort_order, id)
    })()
    return { ok: true }
  })

  api('calendar:pagesForMonth', ({ year, month }) => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const d     = new Date(year, month + 1, 0)
    const end   = `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return dbAll(`
      SELECT p.id, p.title, p.icon, p.project_id,
             ppv.value_date, pp.name AS prop_name,
             pr.name AS project_name, pr.color AS project_color, pr.icon AS project_icon
      FROM pages p
      JOIN page_prop_values ppv ON ppv.page_id = p.id
      JOIN project_properties pp ON pp.id = ppv.property_id
      JOIN projects pr ON pr.id = p.project_id
      WHERE p.is_deleted = 0
        AND pp.prop_type = 'date'
        AND ppv.value_date IS NOT NULL
        AND ppv.value_date >= ?
        AND ppv.value_date <= ?
      ORDER BY ppv.value_date ASC
    `, start, end)
  })

  api('dashboard:stats', () => {
    const totals = dbGet(`
      SELECT
        (SELECT COUNT(*) FROM pages    WHERE is_deleted = 0)                                    AS total_pages,
        (SELECT COUNT(*) FROM pages    WHERE is_deleted = 0
           AND date(created_at) >= date('now', '-7 days'))                                      AS pages_this_week,
        (SELECT COUNT(*) FROM projects WHERE status = 'active')                                 AS active_projects,
        (SELECT COUNT(*) FROM projects)                                                         AS total_projects
    `)
    const pageCounts = dbAll(`
      SELECT project_id, COUNT(*) AS count
      FROM pages WHERE is_deleted = 0
      GROUP BY project_id
    `)
    return { ...(totals ?? {}), page_counts: pageCounts }
  })

  api('pages:search', ({ query, limit }) => {
    const n = limit ?? 20
    const q = (query ?? '').trim()
    if (!q) return []
    // Tentar FTS5 primeiro; fallback para LIKE se falhar (ex: caracteres especiais)
    try {
      return dbAll(`
        SELECT p.id, p.title, p.icon, p.project_id, p.updated_at,
               pr.name AS project_name, pr.color AS project_color, pr.icon AS project_icon
        FROM pages p
        JOIN projects pr ON pr.id = p.project_id
        WHERE p.is_deleted = 0
          AND p.id IN (
            SELECT CAST(entity_id AS INTEGER)
            FROM search_index
            WHERE search_index MATCH ? AND entity_type = 'page'
          )
        ORDER BY p.updated_at DESC
        LIMIT ?
      `, `"${q.replace(/"/g, '""')}"*`, n)
    } catch {
      return dbAll(`
        SELECT p.id, p.title, p.icon, p.project_id, p.updated_at,
               pr.name AS project_name, pr.color AS project_color, pr.icon AS project_icon
        FROM pages p
        JOIN projects pr ON pr.id = p.project_id
        WHERE p.is_deleted = 0
          AND p.title LIKE ?
        ORDER BY p.updated_at DESC
        LIMIT ?
      `, `%${q}%`, n)
    }
  })

  api('pages:reindexAll', () => {
    const pages = dbAll(`SELECT id, project_id, title, body_json FROM pages WHERE is_deleted = 0`)
    dbRun(`DELETE FROM search_index WHERE entity_type = 'page'`)
    for (const p of pages) {
      ftsUpsert(p.id, p.project_id, p.title, extractBodyText(p.body_json))
    }
    return { indexed: pages.length }
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

  // ── Tags globais ──────────────────────────────────────────────────────────
  api('tags:list', () => {
    const ws = dbGet('SELECT id FROM workspaces LIMIT 1')
    return dbAll('SELECT * FROM tags WHERE workspace_id = ? ORDER BY name', ws.id)
  })

  api('tags:create', ({ name, color }) => {
    const ws = dbGet('SELECT id FROM workspaces LIMIT 1')
    const r  = dbRun('INSERT OR IGNORE INTO tags (workspace_id, name, color) VALUES (?, ?, ?)',
      ws.id, name, color ?? null)
    return dbGet('SELECT * FROM tags WHERE id = ?', r.lastInsertRowid)
  })

  api('tags:delete', ({ id }) =>
    dbRun('DELETE FROM tags WHERE id = ?', id)
  )

  api('tags:listForPage', ({ page_id }) =>
    dbAll(`
      SELECT t.* FROM tags t
      JOIN page_tags pt ON pt.tag_id = t.id
      WHERE pt.page_id = ?
      ORDER BY t.name
    `, page_id)
  )

  api('tags:assign', ({ page_id, tag_id }) =>
    dbRun('INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)', page_id, tag_id)
  )

  api('tags:remove', ({ page_id, tag_id }) =>
    dbRun('DELETE FROM page_tags WHERE page_id = ? AND tag_id = ?', page_id, tag_id)
  )

  // ── Pré-requisitos entre páginas ──────────────────────────────────────────
  api('prerequisites:list', ({ page_id }) =>
    dbAll(`
      SELECT pp.prerequisite_id AS id, p.title, p.icon, p.project_id,
             pv.value_text AS status_value
      FROM page_prerequisites pp
      JOIN pages p ON p.id = pp.prerequisite_id
      LEFT JOIN page_prop_values pv ON pv.page_id = p.id
        AND pv.property_id = (
          SELECT id FROM project_properties
          WHERE project_id = p.project_id AND prop_key = 'status' LIMIT 1
        )
      WHERE pp.page_id = ?
      ORDER BY p.sort_order, p.title
    `, page_id)
  )

  api('prerequisites:listDependents', ({ page_id }) =>
    dbAll(`
      SELECT pp.page_id AS id, p.title, p.icon
      FROM page_prerequisites pp
      JOIN pages p ON p.id = pp.page_id
      WHERE pp.prerequisite_id = ?
      ORDER BY p.sort_order, p.title
    `, page_id)
  )

  api('prerequisites:add', ({ page_id, prerequisite_id }) => {
    if (page_id === prerequisite_id) return { ok: false, error: 'Uma página não pode ser pré-requisito de si mesma.' }
    // Verificação simples de ciclo: se prerequisite_id já requer page_id, não permitir
    const cycle = dbGet(`SELECT 1 FROM page_prerequisites WHERE page_id = ? AND prerequisite_id = ?`, prerequisite_id, page_id)
    if (cycle) return { ok: false, error: 'Isso criaria uma dependência circular.' }
    try { dbRun(`INSERT OR IGNORE INTO page_prerequisites (page_id, prerequisite_id) VALUES (?, ?)`, page_id, prerequisite_id) } catch {}
    return { ok: true }
  })

  api('prerequisites:remove', ({ page_id, prerequisite_id }) =>
    dbRun(`DELETE FROM page_prerequisites WHERE page_id = ? AND prerequisite_id = ?`, page_id, prerequisite_id)
  )

  // ── Backlinks ─────────────────────────────────────────────────────────────
  api('backlinks:list', ({ page_id }) =>
    dbAll(`
      SELECT pb.source_page_id AS id, p.title, p.icon, p.project_id, pr.name AS project_name
      FROM page_backlinks pb
      JOIN pages p    ON p.id    = pb.source_page_id
      JOIN projects pr ON pr.id = p.project_id
      WHERE pb.target_page_id = ?
      ORDER BY p.title
    `, page_id)
  )

  api('backlinks:listOutgoing', ({ page_id }) =>
    dbAll(`
      SELECT pb.target_page_id AS id, p.title, p.icon, p.project_id, pr.name AS project_name
      FROM page_backlinks pb
      JOIN pages p     ON p.id   = pb.target_page_id
      JOIN projects pr ON pr.id  = p.project_id
      WHERE pb.source_page_id = ?
      ORDER BY p.title
    `, page_id)
  )

  api('backlinks:add', ({ source_page_id, target_page_id }) => {
    if (source_page_id === target_page_id) return { ok: true }
    try { dbRun(`INSERT OR IGNORE INTO page_backlinks (source_page_id, target_page_id) VALUES (?, ?)`, source_page_id, target_page_id) } catch {}
    return { ok: true }
  })

  api('backlinks:remove', ({ source_page_id, target_page_id }) =>
    dbRun(`DELETE FROM page_backlinks WHERE source_page_id = ? AND target_page_id = ?`, source_page_id, target_page_id)
  )

  // ── Leituras ───────────────────────────────────────────────────────────────
  api('readings:list', () => {
    const ws = dbGet('SELECT id FROM workspaces LIMIT 1')
    return dbAll(`SELECT * FROM readings WHERE workspace_id = ? ORDER BY updated_at DESC`, ws.id)
  })

  api('readings:create', (d) => {
    const ws = dbGet('SELECT id FROM workspaces LIMIT 1')
    const r = dbRun(`
      INSERT INTO readings
        (workspace_id, resource_id, title, reading_type, author, publisher, year, isbn, status, rating,
         current_page, total_pages, date_start, date_end, review, progress_type, progress_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      ws.id, d.resource_id ?? null, d.title, d.reading_type ?? 'book', d.author ?? null,
      d.publisher ?? null, d.year ?? null, d.isbn ?? null, d.status ?? 'want', d.rating ?? null,
      d.current_page ?? 0, d.total_pages ?? null, d.date_start ?? null,
      d.date_end ?? null, d.review ?? null,
      d.progress_type ?? 'pages', d.progress_percent ?? 0
    )
    return dbGet('SELECT * FROM readings WHERE id = ?', r.lastInsertRowid)
  })

  api('readings:update', (d) => {
    dbRun(`
      UPDATE readings SET
        resource_id = ?, title = ?, reading_type = ?, author = ?, publisher = ?, year = ?,
        isbn = ?, status = ?, rating = ?, current_page = ?, total_pages = ?,
        date_start = ?, date_end = ?, review = ?, progress_type = ?, progress_percent = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `,
      d.resource_id ?? null, d.title, d.reading_type ?? 'book', d.author ?? null,
      d.publisher ?? null, d.year ?? null, d.isbn ?? null, d.status, d.rating ?? null,
      d.current_page ?? 0, d.total_pages ?? null, d.date_start ?? null, d.date_end ?? null,
      d.review ?? null, d.progress_type ?? 'pages', d.progress_percent ?? 0, d.id
    )
    return dbGet('SELECT * FROM readings WHERE id = ?', d.id)
  })

  api('readings:delete', ({ id }) =>
    dbRun('DELETE FROM readings WHERE id = ?', id)
  )

  // ── Sessões de leitura ─────────────────────────────────────────────────────
  api('reading_sessions:list', ({ reading_id }) =>
    dbAll(`SELECT * FROM reading_sessions WHERE reading_id = ? ORDER BY date DESC, id DESC`, reading_id)
  )

  api('reading_sessions:create', (d) => {
    const r = dbRun(`
      INSERT INTO reading_sessions (reading_id, date, page_start, page_end, duration_min, notes, percent_end)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, d.reading_id, d.date, d.page_start ?? 0, d.page_end ?? 0,
       d.duration_min ?? null, d.notes?.trim() || null, d.percent_end ?? null)
    const sess    = dbGet('SELECT * FROM reading_sessions WHERE id = ?', r.lastInsertRowid)
    const reading = dbGet('SELECT * FROM readings WHERE id = ?', d.reading_id)
    if (!reading) return sess

    if (reading.progress_type === 'percent' && d.percent_end != null) {
      // Tracking por porcentagem
      const pct       = Math.min(100, Math.max(0, d.percent_end))
      const newStatus = pct >= 100
        ? 'done' : reading.status === 'want' ? 'reading' : reading.status
      const dateEnd   = newStatus === 'done' ? d.date : reading.date_end
      dbRun(`UPDATE readings SET progress_percent = ?, status = ?, date_end = ?, updated_at = datetime('now') WHERE id = ?`,
        pct, newStatus, dateEnd, d.reading_id)
    } else if (sess.page_end > reading.current_page) {
      // Tracking por páginas (comportamento original)
      const newStatus = (reading.total_pages && sess.page_end >= reading.total_pages)
        ? 'done' : reading.status === 'want' ? 'reading' : reading.status
      const dateEnd   = newStatus === 'done' ? d.date : reading.date_end
      dbRun(`UPDATE readings SET current_page = ?, status = ?, date_end = ?, updated_at = datetime('now') WHERE id = ?`,
        sess.page_end, newStatus, dateEnd, d.reading_id)
    }
    return sess
  })

  api('reading_sessions:delete', ({ id }) =>
    dbRun('DELETE FROM reading_sessions WHERE id = ?', id)
  )

  // ── Notas de leitura ──────────────────────────────────────────────────────
  api('reading_notes:list', ({ reading_id }) =>
    dbAll(`SELECT * FROM reading_notes WHERE reading_id = ? ORDER BY created_at ASC`, reading_id)
  )
  api('reading_notes:create', (d) => {
    const r = dbRun(`INSERT INTO reading_notes (reading_id, chapter, content) VALUES (?, ?, ?)`,
      d.reading_id, d.chapter?.trim() || null, d.content)
    return dbGet('SELECT * FROM reading_notes WHERE id = ?', r.lastInsertRowid)
  })
  api('reading_notes:delete', ({ id }) =>
    dbRun('DELETE FROM reading_notes WHERE id = ?', id)
  )

  // ── Citações de leitura ───────────────────────────────────────────────────
  api('reading_quotes:list', ({ reading_id }) =>
    dbAll(`SELECT * FROM reading_quotes WHERE reading_id = ? ORDER BY created_at ASC`, reading_id)
  )
  api('reading_quotes:create', (d) => {
    const r = dbRun(`INSERT INTO reading_quotes (reading_id, text, location) VALUES (?, ?, ?)`,
      d.reading_id, d.text, d.location?.trim() || null)
    return dbGet('SELECT * FROM reading_quotes WHERE id = ?', r.lastInsertRowid)
  })
  api('reading_quotes:delete', ({ id }) =>
    dbRun('DELETE FROM reading_quotes WHERE id = ?', id)
  )

  // ── Vínculos de leitura ───────────────────────────────────────────────────
  api('reading_links:list', ({ reading_id }) =>
    dbAll(`
      SELECT rl.reading_id, rl.page_id, p.title, p.project_id, pr.name AS project_name
      FROM reading_links rl
      JOIN pages p ON p.id = rl.page_id
      JOIN projects pr ON pr.id = p.project_id
      WHERE rl.reading_id = ?
    `, reading_id)
  )
  api('reading_links:add', ({ reading_id, page_id }) => {
    try { dbRun(`INSERT INTO reading_links (reading_id, page_id) VALUES (?, ?)`, reading_id, page_id) } catch {}
    return { ok: true }
  })
  api('reading_links:remove', ({ reading_id, page_id }) =>
    dbRun(`DELETE FROM reading_links WHERE reading_id = ? AND page_id = ?`, reading_id, page_id)
  )
  api('reading_links:listForProject', ({ project_id }) =>
    dbAll(`
      SELECT rd.id, rd.title, rd.cover_path, rd.status, rd.current_page, rd.total_pages,
             rd.author, rd.reading_type, rd.progress_type, rd.progress_percent,
             p.id AS page_id, p.title AS page_title, p.icon AS page_icon,
             res.metadata_json
      FROM reading_links rl
      JOIN pages p        ON p.id        = rl.page_id
      JOIN readings rd    ON rd.id       = rl.reading_id
      LEFT JOIN resources res ON res.id  = rd.resource_id
      WHERE p.project_id = ?
      ORDER BY rd.title
    `, project_id)
  )

  // ── Recursos ───────────────────────────────────────────────────────────────
  api('resources:list', () => {
    const ws = dbGet('SELECT id FROM workspaces LIMIT 1')
    return dbAll(`
      SELECT r.*,
             rd.status        AS reading_status,
             rd.current_page  AS reading_current_page,
             rd.total_pages   AS reading_total_pages,
             rd.rating        AS reading_rating
      FROM resources r
      LEFT JOIN (
        SELECT resource_id, status, current_page, total_pages, rating,
               ROW_NUMBER() OVER (
                 PARTITION BY resource_id
                 ORDER BY CASE status
                   WHEN 'reading' THEN 1 WHEN 'paused' THEN 2
                   WHEN 'want'    THEN 3 WHEN 'done'   THEN 4
                 END, updated_at DESC
               ) AS rn
        FROM readings WHERE resource_id IS NOT NULL
      ) rd ON rd.resource_id = r.id AND rd.rn = 1
      WHERE r.workspace_id = ?
      ORDER BY r.created_at DESC
    `, ws.id)
  })

  api('resources:create', (d) => {
    const ws = dbGet('SELECT id FROM workspaces LIMIT 1')
    const r = dbRun(`
      INSERT INTO resources (workspace_id, title, resource_type, url, description, tags_json, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      ws.id, d.title, d.resource_type ?? null, d.url ?? null,
      d.description ?? null, d.tags_json ?? null, d.metadata_json ?? null
    )
    return dbGet('SELECT * FROM resources WHERE id = ?', r.lastInsertRowid)
  })

  api('resources:update', (d) => {
    dbRun(`
      UPDATE resources SET title = ?, resource_type = ?, url = ?, description = ?, tags_json = ?, metadata_json = ?
      WHERE id = ?
    `,
      d.title, d.resource_type ?? null, d.url ?? null,
      d.description ?? null, d.tags_json ?? null, d.metadata_json ?? null, d.id
    )
    return dbGet('SELECT * FROM resources WHERE id = ?', d.id)
  })

  ipcMain.handle('resources:fetchMeta', async (_e, { type, query, url }: { type: string; query: string; url?: string }) => {
    const meta = await fetchMetadata(type, query, url)
    return { ok: true, data: meta }
  })

  ipcMain.handle('resources:searchMeta', async (_e, { type, query }: { type: string; query: string }) => {
    try {
      if (type === 'livro') {
        const fields = 'key,title,author_name,first_publish_year,number_of_pages_median,isbn,publisher,language,cover_i'
        const data = await fetchJson(`https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=6&fields=${fields}`)
        const results = (data?.docs ?? []).map((doc: any) => ({
          title:     doc.title,
          author:    doc.author_name?.join(', ') ?? '',
          year:      doc.first_publish_year ?? null,
          pages:     doc.number_of_pages_median ?? null,
          isbn:      doc.isbn?.[0] ?? null,
          publisher: doc.publisher?.[0] ?? null,
          language:  doc.language?.[0] ?? null,
          cover_url:   doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg` : null,
          cover_url_m: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        }))
        return { ok: true, data: results }
      }
      if (type === 'artigo') {
        const data = await fetchJson(`https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=6`)
        const results = (data?.message?.items ?? []).map((w: any) => ({
          title:   w.title?.[0] ?? '',
          authors: w.author?.map((a: any) => `${a.given ?? ''} ${a.family ?? ''}`.trim()).join(', ') ?? '',
          journal: w['container-title']?.[0] ?? null,
          year:    w.published?.['date-parts']?.[0]?.[0] ?? null,
          doi:     w.DOI ?? null,
          volume:  w.volume ?? null,
          issue:   w.issue ?? null,
        }))
        return { ok: true, data: results }
      }
    } catch (e: any) {
      log.warn('searchMeta error', e?.message)
    }
    return { ok: true, data: [] }
  })

  api('resources:delete', ({ id }) =>
    dbRun('DELETE FROM resources WHERE id = ?', id)
  )

  // ── Vínculos recurso ↔ página ──────────────────────────────────────────────
  api('resource_pages:listForResource', ({ resource_id }) =>
    dbAll(`
      SELECT rp.resource_id, rp.page_id,
             p.title AS page_title, p.project_id,
             pr.name AS project_name
      FROM resource_pages rp
      JOIN pages    p  ON p.id  = rp.page_id
      JOIN projects pr ON pr.id = p.project_id
      WHERE rp.resource_id = ?
      ORDER BY pr.name, p.title
    `, resource_id)
  )

  api('resource_pages:listForPage', ({ page_id }) =>
    dbAll(`
      SELECT rp.resource_id, rp.page_id,
             r.title, r.resource_type, r.url, r.description, r.metadata_json
      FROM resource_pages rp
      JOIN resources r ON r.id = rp.resource_id
      WHERE rp.page_id = ?
      ORDER BY r.title
    `, page_id)
  )

  api('resource_pages:add', ({ resource_id, page_id }) => {
    try { dbRun(`INSERT INTO resource_pages (resource_id, page_id) VALUES (?, ?)`, resource_id, page_id) } catch {}
    return { ok: true }
  })

  api('resource_pages:remove', ({ resource_id, page_id }) =>
    dbRun(`DELETE FROM resource_pages WHERE resource_id = ? AND page_id = ?`, resource_id, page_id)
  )

  // ── Eventos de Calendário ─────────────────────────────────────────────────

  api('events:listForMonth', ({ year, month }) => {
    const y    = String(year)
    const m    = String(month + 1).padStart(2, '0')
    const start = `${y}-${m}-01`
    const next  = month === 11
      ? `${year + 1}-01-01`
      : `${y}-${String(month + 2).padStart(2, '0')}-01`
    return dbAll(`
      SELECT 'calendar' AS source, ce.id, ce.title, ce.description,
        ce.start_dt, ce.end_dt, ce.all_day, ce.color, ce.event_type,
        ce.linked_page_id, ce.linked_project_id,
        p.title AS page_title, pr.name AS project_name, pr.color AS project_color
      FROM calendar_events ce
      LEFT JOIN pages    p  ON p.id  = ce.linked_page_id
      LEFT JOIN projects pr ON pr.id = ce.linked_project_id
      WHERE ce.workspace_id = (SELECT id FROM workspaces LIMIT 1)
        AND ce.start_dt >= ? AND ce.start_dt < ?

      UNION ALL

      SELECT 'planner' AS source, pt.id, pt.title, pt.task_type AS description,
        pt.due_date AS start_dt, pt.due_date AS end_dt, 1 AS all_day,
        pr.color AS color,
        CASE WHEN pt.task_type IN ('prova','trabalho','seminario','defesa','prazo','reuniao')
          THEN pt.task_type ELSE 'outro' END AS event_type,
        pt.page_id AS linked_page_id, pt.project_id AS linked_project_id,
        p.title AS page_title, pr.name AS project_name, pr.color AS project_color
      FROM planned_tasks pt
      LEFT JOIN projects pr ON pr.id = pt.project_id
      LEFT JOIN pages    p  ON p.id  = pt.page_id
      WHERE pt.status NOT IN ('done')
        AND pt.due_date >= ? AND pt.due_date < ?

      ORDER BY start_dt
    `, start, next, start, next)
  })

  api('events:listForPage', ({ page_id }) =>
    dbAll(`SELECT * FROM calendar_events WHERE linked_page_id = ? ORDER BY start_dt`, page_id)
  )

  api('events:listForProject', ({ project_id }) =>
    dbAll(`
      SELECT ce.*, p.title AS page_title
      FROM calendar_events ce
      LEFT JOIN pages p ON p.id = ce.linked_page_id
      WHERE ce.linked_project_id = ?
      ORDER BY ce.start_dt
    `, project_id)
  )

  api('events:listUpcoming', ({ days }) => {
    const now    = new Date().toISOString().slice(0, 10)
    const future = new Date(Date.now() + (days ?? 14) * 86_400_000).toISOString().slice(0, 10)
    return dbAll(`
      SELECT 'calendar' AS source, ce.id, ce.title, ce.description,
        ce.start_dt, ce.end_dt, ce.all_day, ce.color, ce.event_type,
        ce.linked_page_id, ce.linked_project_id,
        p.title AS page_title, pr.name AS project_name, pr.color AS project_color
      FROM calendar_events ce
      LEFT JOIN pages    p  ON p.id  = ce.linked_page_id
      LEFT JOIN projects pr ON pr.id = ce.linked_project_id
      WHERE ce.workspace_id = (SELECT id FROM workspaces LIMIT 1)
        AND date(ce.start_dt) >= ? AND date(ce.start_dt) <= ?

      UNION ALL

      SELECT 'planner' AS source, pt.id, pt.title, pt.task_type AS description,
        pt.due_date AS start_dt, pt.due_date AS end_dt, 1 AS all_day,
        pr.color AS color,
        CASE WHEN pt.task_type IN ('prova','trabalho','seminario','defesa','prazo','reuniao')
          THEN pt.task_type ELSE 'outro' END AS event_type,
        pt.page_id AS linked_page_id, pt.project_id AS linked_project_id,
        p.title AS page_title, pr.name AS project_name, pr.color AS project_color
      FROM planned_tasks pt
      LEFT JOIN projects pr ON pr.id = pt.project_id
      LEFT JOIN pages    p  ON p.id  = pt.page_id
      WHERE pt.status NOT IN ('done')
        AND pt.due_date >= ? AND pt.due_date <= ?

      ORDER BY start_dt
    `, now, future, now, future)
  })

  api('events:create', (data) => {
    const wsId = (dbGet(`SELECT id FROM workspaces LIMIT 1`) as any)?.id ?? 1
    const r = dbRun(`
      INSERT INTO calendar_events
        (workspace_id, title, description, start_dt, end_dt, all_day, color, event_type, linked_page_id, linked_project_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      wsId, data.title, data.description ?? null,
      data.start_dt, data.end_dt ?? null, data.all_day ? 1 : 0,
      data.color ?? null, data.event_type ?? 'outro',
      data.linked_page_id ?? null, data.linked_project_id ?? null
    )
    const eventId = Number(r.lastInsertRowid)

    // Auto-criar lembrete se pedido
    if (data.reminder_minutes != null) {
      const base = data.start_dt.includes('T') ? data.start_dt : `${data.start_dt}T09:00:00`
      const t = new Date(base)
      t.setMinutes(t.getMinutes() - data.reminder_minutes)
      dbRun(`
        INSERT INTO reminders (title, trigger_at, offset_minutes, linked_event_id, linked_page_id)
        VALUES (?, ?, ?, ?, ?)`,
        data.title, t.toISOString().slice(0, 16),
        data.reminder_minutes, eventId, data.linked_page_id ?? null
      )
    }

    return dbGet(`SELECT * FROM calendar_events WHERE id = ?`, eventId)
  })

  api('events:update', (data) => {
    const allowed = ['title','description','start_dt','end_dt','all_day','color','event_type','linked_page_id','linked_project_id']
    const cols: string[] = [], vals: any[] = []
    for (const key of allowed) {
      if (data[key] !== undefined) { cols.push(`${key} = ?`); vals.push(data[key]) }
    }
    if (cols.length) dbRun(`UPDATE calendar_events SET ${cols.join(', ')} WHERE id = ?`, ...vals, data.id)
    return dbGet(`SELECT * FROM calendar_events WHERE id = ?`, data.id)
  })

  api('events:delete', ({ id }) =>
    dbRun(`DELETE FROM calendar_events WHERE id = ?`, id)
  )

  // ── Lembretes ─────────────────────────────────────────────────────────────

  api('reminders:list', ({ include_dismissed } = {}) =>
    dbAll(`
      SELECT r.*, ce.event_type, ce.start_dt AS event_start
      FROM reminders r
      LEFT JOIN calendar_events ce ON ce.id = r.linked_event_id
      ${include_dismissed ? '' : 'WHERE r.is_dismissed = 0'}
      ORDER BY r.trigger_at
    `)
  )

  api('reminders:create', (data) => {
    const r = dbRun(`
      INSERT INTO reminders (title, trigger_at, offset_minutes, linked_event_id, linked_page_id)
      VALUES (?, ?, ?, ?, ?)`,
      data.title, data.trigger_at, data.offset_minutes ?? null,
      data.linked_event_id ?? null, data.linked_page_id ?? null
    )
    return dbGet(`SELECT * FROM reminders WHERE id = ?`, Number(r.lastInsertRowid))
  })

  api('reminders:dismiss', ({ id }) =>
    dbRun(`UPDATE reminders SET is_dismissed = 1 WHERE id = ?`, id)
  )

  api('reminders:delete', ({ id }) =>
    dbRun(`DELETE FROM reminders WHERE id = ?`, id)
  )

  // ── Planejador académico ───────────────────────────────────────────────────

  function getDailyCapacity(): number {
    const row = dbGet(`SELECT value FROM settings WHERE key = 'planner_daily_hours'`)
    return row ? parseFloat(row.value) || 4 : 4
  }

  function scheduleTasks(projectId: number): void {
    const db        = getDb()
    const dailyCap  = getDailyCapacity()
    const today     = new Date().toISOString().slice(0, 10)

    const tasks = dbAll(`
      SELECT pt.*,
        COALESCE((
          SELECT SUM(wb.logged_hours) FROM work_blocks wb
          WHERE wb.task_id = pt.id AND wb.status = 'done'
        ), 0) AS done_hours
      FROM planned_tasks pt
      WHERE pt.project_id = ? AND pt.status IN ('pending','in_progress')
      ORDER BY pt.due_date ASC
    `, projectId)

    if (tasks.length === 0) return

    const taskIds = tasks.map((t: any) => t.id)
    db.prepare(
      `DELETE FROM work_blocks WHERE task_id IN (${taskIds.map(() => '?').join(',')})
       AND date >= ? AND status = 'scheduled'`
    ).run(...taskIds, today)

    // Carga já comprometida de outros projetos
    const otherBlocks = dbAll(`
      SELECT wb.date, SUM(wb.planned_hours) as total
      FROM work_blocks wb
      JOIN planned_tasks pt ON pt.id = wb.task_id
      WHERE pt.project_id != ? AND wb.date >= ? AND wb.status = 'scheduled'
      GROUP BY wb.date
    `, projectId, today)
    const loadMap = new Map<string, number>()
    for (const b of otherBlocks) loadMap.set(b.date, b.total)

    const insertBlock = db.prepare(
      `INSERT INTO work_blocks (task_id, date, planned_hours, logged_hours, status)
       VALUES (?, ?, ?, 0, 'scheduled')`
    )

    for (const task of tasks) {
      const remaining = Math.max(0, task.estimated_hours - task.done_hours)
      if (remaining <= 0) continue

      const due     = task.due_date.slice(0, 10)
      const dates: string[] = []
      let cur = new Date(today + 'T12:00:00')
      const dueDate = new Date(due + 'T12:00:00')
      while (cur <= dueDate) {
        dates.push(cur.toISOString().slice(0, 10))
        cur = new Date(cur.getTime() + 86400000)
      }
      if (dates.length === 0) {
        // Prazo já passou — agenda tudo hoje
        insertBlock.run(task.id, today, Math.round(remaining * 100) / 100)
        loadMap.set(today, (loadMap.get(today) ?? 0) + remaining)
        continue
      }

      let hoursLeft = remaining
      for (const date of dates) {
        if (hoursLeft <= 0) break
        const load      = loadMap.get(date) ?? 0
        const available = Math.max(0, dailyCap - load)
        if (available <= 0) continue
        const h = Math.min(hoursLeft, available)
        insertBlock.run(task.id, date, Math.round(h * 100) / 100)
        loadMap.set(date, load + h)
        hoursLeft -= h
      }
      // Se ainda sobrar horas (todos os dias estavam cheios), adiciona ao dia do prazo
      if (hoursLeft > 0.01) {
        const lastDate = dates[dates.length - 1]
        insertBlock.run(task.id, lastDate, Math.round(hoursLeft * 100) / 100)
        loadMap.set(lastDate, (loadMap.get(lastDate) ?? 0) + hoursLeft)
      }
    }
  }

  function updateTaskStatus(taskId: number): void {
    const task = dbGet(`SELECT * FROM planned_tasks WHERE id = ?`, taskId)
    if (!task) return
    const doneHours = dbGet(
      `SELECT COALESCE(SUM(logged_hours),0) AS h FROM work_blocks WHERE task_id = ? AND status = 'done'`,
      taskId
    )?.h ?? 0
    let newStatus = task.status
    if (doneHours >= task.estimated_hours) {
      newStatus = 'completed'
    } else if (doneHours > 0) {
      newStatus = 'in_progress'
    }
    dbRun(`UPDATE planned_tasks SET status = ?, updated_at = datetime('now') WHERE id = ?`, newStatus, taskId)
  }

  api('planner:listTasks', ({ project_id }) =>
    dbAll(`
      SELECT pt.*,
        COALESCE((SELECT SUM(wb.logged_hours) FROM work_blocks wb WHERE wb.task_id = pt.id AND wb.status = 'done'), 0) AS done_hours,
        p.title AS page_title, p.icon AS page_icon
      FROM planned_tasks pt
      LEFT JOIN pages p ON p.id = pt.page_id
      WHERE pt.project_id = ?
      ORDER BY pt.due_date ASC, pt.created_at ASC
    `, project_id)
  )

  api('planner:createTask', (data) => {
    const r = dbRun(`
      INSERT INTO planned_tasks (project_id, page_id, title, task_type, due_date, estimated_hours, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, data.project_id, data.page_id ?? null, data.title, data.task_type ?? 'atividade',
       data.due_date, data.estimated_hours ?? 1)
    const taskId = Number(r.lastInsertRowid)
    scheduleTasks(data.project_id)
    return dbGet(`
      SELECT pt.*,
        COALESCE((SELECT SUM(wb.logged_hours) FROM work_blocks wb WHERE wb.task_id = pt.id AND wb.status = 'done'), 0) AS done_hours,
        p.title AS page_title, p.icon AS page_icon
      FROM planned_tasks pt LEFT JOIN pages p ON p.id = pt.page_id WHERE pt.id = ?
    `, taskId)
  })

  api('planner:updateTask', (data) => {
    const allowed = ['title','task_type','due_date','estimated_hours','page_id','status']
    const cols: string[] = [], vals: any[] = []
    for (const key of allowed) {
      if (data[key] !== undefined) { cols.push(`${key} = ?`); vals.push(data[key]) }
    }
    if (cols.length) {
      cols.push(`updated_at = datetime('now')`)
      dbRun(`UPDATE planned_tasks SET ${cols.join(', ')} WHERE id = ?`, ...vals, data.id)
    }
    const task = dbGet(`SELECT * FROM planned_tasks WHERE id = ?`, data.id)
    if (task) scheduleTasks(task.project_id)
    return dbGet(`
      SELECT pt.*,
        COALESCE((SELECT SUM(wb.logged_hours) FROM work_blocks wb WHERE wb.task_id = pt.id AND wb.status = 'done'), 0) AS done_hours,
        p.title AS page_title, p.icon AS page_icon
      FROM planned_tasks pt LEFT JOIN pages p ON p.id = pt.page_id WHERE pt.id = ?
    `, data.id)
  })

  api('planner:deleteTask', ({ id }) =>
    dbRun(`DELETE FROM planned_tasks WHERE id = ?`, id)
  )

  api('planner:listBlocks', ({ task_id }) =>
    dbAll(`SELECT * FROM work_blocks WHERE task_id = ? ORDER BY date ASC`, task_id)
  )

  api('planner:logBlock', ({ id, logged_hours }) => {
    const block = dbGet(`SELECT * FROM work_blocks WHERE id = ?`, id)
    if (!block) throw new Error('Bloco não encontrado')
    const capped = Math.min(logged_hours, block.planned_hours)
    const status = capped >= block.planned_hours ? 'done' : 'scheduled'
    dbRun(`UPDATE work_blocks SET logged_hours = ?, status = ? WHERE id = ?`, capped, status, id)
    updateTaskStatus(block.task_id)
    return dbGet(`SELECT * FROM work_blocks WHERE id = ?`, id)
  })

  api('planner:schedule', ({ project_id }) => {
    scheduleTasks(project_id)
    return { ok: true }
  })

  api('planner:rescheduleAll', () => {
    const today = new Date().toISOString().slice(0, 10)
    // Blocos passados não concluídos → missed
    dbRun(
      `UPDATE work_blocks SET status = 'missed' WHERE date < ? AND status = 'scheduled'`,
      today
    )
    // Atualiza status de tarefas cujo prazo passou e não estão completas
    dbRun(`
      UPDATE planned_tasks SET status = 'overdue', updated_at = datetime('now')
      WHERE due_date < ? AND status IN ('pending','in_progress')
    `, today)
    // Reagenda todos os projetos com tarefas ativas
    const projects = dbAll(
      `SELECT DISTINCT project_id FROM planned_tasks WHERE status IN ('pending','in_progress')`
    )
    for (const { project_id } of projects) scheduleTasks(project_id)
    return { ok: true }
  })

  api('planner:todayBlocks', () => {
    const today = new Date().toISOString().slice(0, 10)
    return dbAll(`
      SELECT wb.*,
        pt.title AS task_title, pt.task_type, pt.due_date, pt.estimated_hours,
        p.name AS project_name, p.color AS project_color, p.icon AS project_icon
      FROM work_blocks wb
      JOIN planned_tasks pt ON pt.id = wb.task_id
      JOIN projects p ON p.id = pt.project_id
      WHERE wb.date = ? AND wb.status != 'missed'
      ORDER BY pt.due_date ASC
    `, today)
  })

  // ── Widgets extras ────────────────────────────────────────────────────────

  api('dashboard:projectsProgress', () =>
    dbAll(`
      SELECT
        p.id, p.name, p.color, p.icon, p.project_type,
        COUNT(DISTINCT pg.id)  AS total_pages,
        COUNT(DISTINCT CASE
          WHEN LOWER(ppv.value_text) LIKE '%conclu%'
            OR LOWER(ppv.value_text) IN ('done','completed','lido','read')
          THEN pg.id END)      AS done_pages,
        COUNT(DISTINCT pt.id)  AS total_tasks,
        COUNT(DISTINCT CASE WHEN pt.status = 'completed' THEN pt.id END) AS done_tasks
      FROM projects p
      LEFT JOIN pages           pg  ON pg.project_id  = p.id AND pg.is_deleted = 0 AND pg.parent_id IS NULL
      LEFT JOIN project_properties pp ON pp.project_id = p.id AND pp.prop_key = 'status'
      LEFT JOIN page_prop_values ppv  ON ppv.page_id   = pg.id AND ppv.property_id = pp.id
      LEFT JOIN planned_tasks   pt  ON pt.project_id  = p.id
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY p.sort_order, p.name
    `)
  )

  api('dashboard:randomQuote', () =>
    dbGet(`
      SELECT rq.id, rq.text, rq.location,
             r.title AS reading_title, r.author
      FROM reading_quotes rq
      JOIN readings r ON r.id = rq.reading_id
      ORDER BY RANDOM()
      LIMIT 1
    `)
  )

  // ── App Settings (data/settings.json) ────────────────────────────────────────

  ipcMain.handle('appSettings:getAll', () => getAllSettings())

  ipcMain.handle('appSettings:get', (_e, { key }: { key: keyof AppSettings }) =>
    getSetting(key) ?? null
  )

  ipcMain.handle('appSettings:set', (_e, { key, value }: { key: keyof AppSettings; value: AppSettings[keyof AppSettings] }) => {
    setSetting(key, value as any)
  })

}
