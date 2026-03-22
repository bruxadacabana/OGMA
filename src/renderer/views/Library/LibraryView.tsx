import React, { useEffect, useState, useMemo } from 'react'
import { SubSection } from '../../components/Sidebar/Sidebar'
import './LibraryView.css'

const db = () => (window as any).db

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Reading {
  id:           number
  title:        string
  reading_type: string
  author:       string | null
  publisher:    string | null
  year:         number | null
  isbn:         string | null
  status:       string
  rating:       number | null
  current_page: number
  total_pages:  number | null
  date_start:   string | null
  date_end:     string | null
  review:       string | null
  created_at:   string
  updated_at:   string
}

interface Resource {
  id:            number
  title:         string
  resource_type: string | null
  url:           string | null
  description:   string | null
  tags_json:     string | null
  created_at:    string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const READING_STATUS: Record<string, { label: string; color: string }> = {
  want:    { label: 'Quero ler',  color: '#8A7A62' },
  reading: { label: 'Lendo',     color: '#4A7A8A' },
  done:    { label: 'Lido',      color: '#4A6741' },
  paused:  { label: 'Pausado',   color: '#8B7355' },
}

const RESOURCE_TYPE_ICONS: Record<string, string> = {
  link:     '🔗',
  livro:    '📖',
  artigo:   '📄',
  tool:     '⚙',
  template: '◧',
  dataset:  '◈',
  doc:      '📃',
  video:    '▶',
  podcast:  '🎙',
  other:    '◦',
}

function stars(n: number | null): string {
  if (!n) return ''
  return '★'.repeat(Math.min(n, 5)) + '☆'.repeat(Math.max(0, 5 - n))
}

// ── Modal de leitura ──────────────────────────────────────────────────────────

function ReadingModal({ initial, dark, onSave, onClose }: {
  initial?: Reading | null; dark: boolean;
  onSave: (data: any) => void; onClose: () => void
}) {
  const [title,     setTitle]     = useState(initial?.title        ?? '')
  const [status,    setStatus]    = useState(initial?.status       ?? 'reading')
  const [curPage,   setCurPage]   = useState(String(initial?.current_page ?? ''))
  const [totPages,  setTotPages]  = useState(String(initial?.total_pages  ?? ''))
  const [dateStart, setDateStart] = useState(initial?.date_start   ?? '')
  const [dateEnd,   setDateEnd]   = useState(initial?.date_end     ?? '')
  const [rating,    setRating]    = useState(String(initial?.rating ?? ''))
  const [review,    setReview]    = useState(initial?.review        ?? '')

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      ...(initial ? { id: initial.id } : {}),
      title: title.trim(), status,
      current_page: curPage ? parseInt(curPage) : 0,
      total_pages:  totPages ? parseInt(totPages) : null,
      date_start:   dateStart || null,
      date_end:     dateEnd   || null,
      rating:       rating ? parseInt(rating) : null,
      review:       review.trim() || null,
    })
  }

  return (
    <div className="library-modal-overlay" onClick={onClose}>
      <div className="library-modal" onClick={e => e.stopPropagation()}
        style={{ background: dark ? '#211D16' : undefined, borderColor: border }}>
        <h2 className="library-modal-title" style={{ color: ink }}>
          {initial ? 'Editar leitura' : 'Registar leitura'}
        </h2>

        <div className="library-modal-field">
          <label className="library-modal-label" style={{ color: ink2 }}>O que estás a ler *</label>
          <input className="library-modal-input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Título da obra ou recurso" autoFocus
            style={{ background: dark ? '#2A2520' : undefined, color: ink, borderColor: border }} />
        </div>

        <div className="library-modal-field">
          <label className="library-modal-label" style={{ color: ink2 }}>Status</label>
          <select className="library-modal-input library-modal-input--select" value={status}
            onChange={e => setStatus(e.target.value)}
            style={{ background: dark ? '#2A2520' : undefined, color: ink, borderColor: border }}>
            {Object.entries(READING_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="library-modal-row">
          <div className="library-modal-field">
            <label className="library-modal-label" style={{ color: ink2 }}>Página atual</label>
            <input type="number" className="library-modal-input" value={curPage}
              onChange={e => setCurPage(e.target.value)} placeholder="0"
              style={{ background: dark ? '#2A2520' : undefined, color: ink, borderColor: border }} />
          </div>
          <div className="library-modal-field">
            <label className="library-modal-label" style={{ color: ink2 }}>Total de páginas</label>
            <input type="number" className="library-modal-input" value={totPages}
              onChange={e => setTotPages(e.target.value)} placeholder="–"
              style={{ background: dark ? '#2A2520' : undefined, color: ink, borderColor: border }} />
          </div>
        </div>

        <div className="library-modal-row">
          <div className="library-modal-field">
            <label className="library-modal-label" style={{ color: ink2 }}>Início</label>
            <input type="date" className="library-modal-input" value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              style={{ background: dark ? '#2A2520' : undefined, color: ink, borderColor: border }} />
          </div>
          <div className="library-modal-field">
            <label className="library-modal-label" style={{ color: ink2 }}>Fim</label>
            <input type="date" className="library-modal-input" value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              style={{ background: dark ? '#2A2520' : undefined, color: ink, borderColor: border }} />
          </div>
        </div>

        <div className="library-modal-field">
          <label className="library-modal-label" style={{ color: ink2 }}>Avaliação (1–5)</label>
          <input type="number" min={1} max={5} className="library-modal-input" value={rating}
            onChange={e => setRating(e.target.value)} placeholder="–"
            style={{ background: dark ? '#2A2520' : undefined, color: ink, borderColor: border }} />
        </div>

        <div className="library-modal-field">
          <label className="library-modal-label" style={{ color: ink2 }}>Notas</label>
          <textarea className="library-modal-input" value={review}
            onChange={e => setReview(e.target.value)} rows={3}
            placeholder="Impressões, aprendizados, citações…"
            style={{ background: dark ? '#2A2520' : undefined, color: ink,
              borderColor: border, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        <div className="library-modal-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ color: ink2 }}>
            Cancelar
          </button>
          <button className="btn btn-sm" onClick={handleSave}
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            disabled={!title.trim()}>
            {initial ? 'Guardar' : 'Registar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de recurso ──────────────────────────────────────────────────────────

function ResourceModal({ initial, dark, onSave, onClose }: {
  initial?: Resource | null; dark: boolean;
  onSave: (data: any) => void; onClose: () => void
}) {
  const [title, setTitle] = useState(initial?.title         ?? '')
  const [type,  setType]  = useState(initial?.resource_type ?? 'link')
  const [url,   setUrl]   = useState(initial?.url           ?? '')
  const [desc,  setDesc]  = useState(initial?.description   ?? '')

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      ...(initial ? { id: initial.id } : {}),
      title: title.trim(), resource_type: type,
      url:   url.trim() || null, description: desc.trim() || null,
    })
  }

  return (
    <div className="library-modal-overlay" onClick={onClose}>
      <div className="library-modal" onClick={e => e.stopPropagation()}
        style={{ background: dark ? '#211D16' : undefined, borderColor: border }}>
        <h2 className="library-modal-title" style={{ color: ink }}>
          {initial ? 'Editar recurso' : 'Novo recurso'}
        </h2>

        <div className="library-modal-field">
          <label className="library-modal-label" style={{ color: ink2 }}>Título *</label>
          <input className="library-modal-input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Nome do recurso" autoFocus
            style={{ background: dark ? '#2A2520' : undefined, color: ink, borderColor: border }} />
        </div>

        <div className="library-modal-row">
          <div className="library-modal-field">
            <label className="library-modal-label" style={{ color: ink2 }}>Tipo</label>
            <select className="library-modal-input library-modal-input--select" value={type}
              onChange={e => setType(e.target.value)}
              style={{ background: dark ? '#2A2520' : undefined, color: ink, borderColor: border }}>
              {Object.keys(RESOURCE_TYPE_ICONS).map(t => (
                <option key={t} value={t}>{RESOURCE_TYPE_ICONS[t]} {t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="library-modal-field">
          <label className="library-modal-label" style={{ color: ink2 }}>URL</label>
          <input className="library-modal-input" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://…"
            style={{ background: dark ? '#2A2520' : undefined, color: ink, borderColor: border }} />
        </div>

        <div className="library-modal-field">
          <label className="library-modal-label" style={{ color: ink2 }}>Descrição</label>
          <textarea className="library-modal-input" value={desc}
            onChange={e => setDesc(e.target.value)} rows={2}
            placeholder="Para que serve, onde foi usado…"
            style={{ background: dark ? '#2A2520' : undefined, color: ink,
              borderColor: border, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        <div className="library-modal-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ color: ink2 }}>
            Cancelar
          </button>
          <button className="btn btn-sm" onClick={handleSave}
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
            disabled={!title.trim()}>
            {initial ? 'Guardar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ReadingsView ──────────────────────────────────────────────────────────────

function ReadingsView({ dark }: { dark: boolean }) {
  const [readings,    setReadings]    = useState<Reading[]>([])
  const [filter,      setFilter]      = useState<string>('reading')
  const [query,       setQuery]       = useState('')
  const [showModal,   setShowModal]   = useState(false)
  const [editReading, setEditReading] = useState<Reading | null>(null)

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  const load = () => {
    db().readings.list().then((res: any) => {
      if (res?.ok) setReadings(res.data ?? [])
    })
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let r = filter === 'all' ? readings : readings.filter(x => x.status === filter)
    if (query.trim()) {
      const q = query.toLowerCase()
      r = r.filter(x => x.title.toLowerCase().includes(q))
    }
    return r
  }, [readings, filter, query])

  const handleSave = async (data: any) => {
    if (data.id) await db().readings.update(data)
    else          await db().readings.create(data)
    load()
    setShowModal(false)
    setEditReading(null)
  }

  const handleDelete = async (id: number) => {
    await db().readings.delete(id)
    load()
  }

  const daysReading = (r: Reading): number | null => {
    if (!r.date_start) return null
    const start = new Date(r.date_start)
    const end   = r.date_end ? new Date(r.date_end) : new Date()
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000))
  }

  const STATUS_FILTERS = [
    { key: 'reading', label: 'A ler'     },
    { key: 'want',    label: 'Quero ler' },
    { key: 'done',    label: 'Lidas'     },
    { key: 'paused',  label: 'Pausadas'  },
    { key: 'all',     label: 'Todas'     },
  ]

  return (
    <div className="library-root">
      <div className="library-toolbar" style={{ borderColor: dark ? '#3A3020' : undefined }}>
        {STATUS_FILTERS.map(f => (
          <button key={f.key}
            className={`library-filter-btn${filter === f.key ? ' library-filter-btn--active' : ''}`}
            onClick={() => setFilter(f.key)}
            style={filter === f.key ? { borderColor: accent, color: accent } : {}}>
            {f.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <input className="library-search" placeholder="⌕ Pesquisar…"
          value={query} onChange={e => setQuery(e.target.value)}
          style={{ background: dark ? '#211D16' : undefined,
            borderColor: dark ? '#3A3020' : undefined, color: ink }} />
        <button className="btn btn-sm" onClick={() => { setEditReading(null); setShowModal(true) }}
          style={{ borderColor: accent, color: accent }}>
          + Registar leitura
        </button>
      </div>

      <div className="library-scroll">
        {filtered.length === 0 ? (
          <div className="library-empty">
            <span style={{ fontSize: 36, opacity: 0.4 }}>📖</span>
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 16, color: ink }}>
              {query || filter !== 'all' ? 'Nenhuma leitura encontrada' : 'Nenhuma leitura ainda'}
            </span>
            {!query && filter === 'reading' && (
              <button className="btn btn-sm" onClick={() => setShowModal(true)}
                style={{ borderColor: accent, color: accent, marginTop: 8 }}>
                + Registar primeira leitura
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '20px 28px' }}>
            {filtered.map(r => {
              const st       = READING_STATUS[r.status] ?? READING_STATUS.want
              const progress = r.total_pages && r.total_pages > 0
                ? Math.round((r.current_page / r.total_pages) * 100) : null
              const days = daysReading(r)

              return (
                <div key={r.id} style={{
                  background: cardBg, borderRadius: 6, border: `1px solid ${border}`,
                  borderLeft: `4px solid ${st.color}`,
                  padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15,
                        fontStyle: 'italic', color: ink, marginBottom: 2 }}>
                        {r.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>
                          {st.label}
                        </span>
                        {days !== null && (
                          <span style={{ fontSize: 10, color: ink2 }}>
                            {days} dia{days !== 1 ? 's' : ''}
                          </span>
                        )}
                        {r.rating ? (
                          <span style={{ fontSize: 10, color: accent }}>{stars(r.rating)}</span>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className="btn btn-ghost btn-sm" style={{
                        fontSize: 10, padding: '2px 6px', color: ink2,
                      }} onClick={() => { setEditReading(r); setShowModal(true) }}>
                        ✎
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{
                        fontSize: 10, padding: '2px 6px', color: '#8B3A2A',
                      }} onClick={() => handleDelete(r.id)}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {progress !== null && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between',
                        marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: ink2 }}>
                          {r.current_page} / {r.total_pages} págs
                        </span>
                        <span style={{ fontSize: 10, color: ink2 }}>{progress}%</span>
                      </div>
                      <div style={{ height: 3, background: border, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${progress}%`,
                          background: st.color, transition: 'width 300ms', borderRadius: 2,
                        }} />
                      </div>
                    </div>
                  )}

                  {r.review && (
                    <p style={{ fontSize: 11, color: ink2, fontStyle: 'italic',
                      lineHeight: 1.5, margin: 0,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {r.review}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <ReadingModal
          initial={editReading}
          dark={dark}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditReading(null) }}
        />
      )}
    </div>
  )
}

// ── ResourcesView ─────────────────────────────────────────────────────────────

function ResourcesView({ dark }: { dark: boolean }) {
  const [resources,    setResources]    = useState<Resource[]>([])
  const [query,        setQuery]        = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [editResource, setEditResource] = useState<Resource | null>(null)

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'

  const load = () => {
    db().resources.list().then((res: any) => {
      if (res?.ok) setResources(res.data ?? [])
    })
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return resources
    const q = query.toLowerCase()
    return resources.filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.url ?? '').toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q)
    )
  }, [resources, query])

  const handleSave = async (data: any) => {
    if (data.id) await db().resources.update(data)
    else          await db().resources.create(data)
    load()
    setShowModal(false)
    setEditResource(null)
  }

  const handleDelete = async (id: number) => {
    await db().resources.delete(id)
    load()
  }

  return (
    <div className="library-root">
      <div className="library-toolbar" style={{ borderColor: border }}>
        <input className="library-search" placeholder="⌕ Pesquisar…"
          value={query} onChange={e => setQuery(e.target.value)}
          style={{ background: dark ? '#211D16' : undefined,
            borderColor: border, color: ink }} />
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={() => { setEditResource(null); setShowModal(true) }}
          style={{ borderColor: accent, color: accent }}>
          + Recurso
        </button>
      </div>

      <div className="library-scroll">
        {filtered.length === 0 ? (
          <div className="library-empty">
            <span style={{ fontSize: 36, opacity: 0.4 }}>◇</span>
            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 16, color: ink }}>
              {query ? 'Nenhum recurso encontrado' : 'Nenhum recurso ainda'}
            </span>
            {!query && (
              <button className="btn btn-sm" onClick={() => setShowModal(true)}
                style={{ borderColor: accent, color: accent }}>
                + Adicionar primeiro recurso
              </button>
            )}
          </div>
        ) : (
          <div className="resources-list">
            {filtered.map(r => (
              <button key={r.id} className="resource-item"
                style={{ borderColor: border,
                  boxShadow: `2px 2px 0 ${border}`,
                  background: dark ? '#211D16' : undefined }}>
                <span className="resource-item-icon">
                  {RESOURCE_TYPE_ICONS[r.resource_type ?? ''] ?? '◦'}
                </span>
                <div className="resource-item-body">
                  <div className="resource-item-title" style={{ color: ink }}>{r.title}</div>
                  {r.url && (
                    <div className="resource-item-url" style={{ color: accent }}>{r.url}</div>
                  )}
                  {r.description && (
                    <div className="resource-item-desc" style={{ color: ink2 }}>{r.description}</div>
                  )}
                </div>
                {r.resource_type && (
                  <span className="resource-item-type" style={{ borderColor: border, color: ink2 }}>
                    {r.resource_type}
                  </span>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginLeft: 4 }}>
                  <button className="btn btn-ghost btn-sm" style={{
                    fontSize: 10, padding: '2px 6px', color: ink2,
                  }} onClick={e => { e.stopPropagation(); setEditResource(r); setShowModal(true) }}>
                    ✎
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{
                    fontSize: 10, padding: '2px 6px', color: '#8B3A2A',
                  }} onClick={e => { e.stopPropagation(); handleDelete(r.id) }}>
                    ✕
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <ResourceModal
          initial={editResource}
          dark={dark}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditResource(null) }}
        />
      )}
    </div>
  )
}

// ── Export principal ──────────────────────────────────────────────────────────

// ── Library Dashboard ─────────────────────────────────────────────────────────

function LibraryDashboard({ dark, onNavigate }: {
  dark: boolean
  onNavigate: (sub: SubSection) => void
}) {
  const [readings,  setReadings]  = useState<Reading[]>([])
  const [resources, setResources] = useState<Resource[]>([])

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  useEffect(() => {
    db().readings.list().then((res: any)  => { if (res?.ok) setReadings(res.data  ?? []) })
    db().resources.list().then((res: any) => { if (res?.ok) setResources(res.data ?? []) })
  }, [])

  // Estatísticas de leituras
  const readingStats = {
    total:   readings.length,
    reading: readings.filter(r => r.status === 'reading').length,
    done:    readings.filter(r => r.status === 'done').length,
    want:    readings.filter(r => r.status === 'want').length,
  }

  // Lendo agora
  const currentlyReading = readings.filter(r => r.status === 'reading').slice(0, 4)

  // Adicionadas recentemente (excluindo as que estão a ler)
  const recentReadings = readings
    .filter(r => r.status !== 'reading')
    .slice(0, 4)

  // Recursos recentes
  const recentResources = resources.slice(0, 5)

  const StatCard = ({ value, label, sub, col }: { value: number | string; label: string; sub?: string; col?: string }) => (
    <div style={{
      background: cardBg, border: `1px solid ${border}`,
      borderRadius: 2, boxShadow: `2px 2px 0 ${border}`,
      padding: '14px 16px', flex: 1, minWidth: 100,
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32,
        fontStyle: 'italic', color: col ?? ink, lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
        letterSpacing: '0.1em', color: ink }}>{label}</div>
      {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: ink2, marginTop: 1 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 48px' }}>

      {/* Título */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontStyle: 'italic',
          fontWeight: 'normal', color: ink, margin: '0 0 4px' }}>
          Biblioteca
        </h1>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
          letterSpacing: '0.14em', color: ink2 }}>
          LEITURAS · RECURSOS
        </div>
      </div>

      {/* Estatísticas */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard value={readingStats.total}   label="Leituras"       sub="no total" />
        <StatCard value={readingStats.reading} label="A ler"          sub="agora"         col={accent} />
        <StatCard value={readingStats.done}    label="Lidas"          sub="concluídas"    col={dark ? '#6A9060' : '#4A6741'} />
        <StatCard value={readingStats.want}    label="Quero ler"      sub="na lista" />
        <StatCard value={resources.length}     label="Recursos"       sub="guardados" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1000 }}>

        {/* Lendo agora */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
              letterSpacing: '0.16em', color: ink2 }}>
              📖 A LER AGORA
            </div>
            <button onClick={() => onNavigate('readings')} style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: accent,
              background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em',
            }}>
              ver todas →
            </button>
          </div>

          {currentlyReading.length === 0 ? (
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 2,
              padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, opacity: 0.3, marginBottom: 8 }}>📖</div>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic',
                fontSize: 13, color: ink2 }}>Nenhuma leitura em curso</div>
              <button onClick={() => onNavigate('readings')} style={{
                marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10,
                color: accent, background: 'none', border: `1px solid ${accent}`,
                borderRadius: 1, padding: '4px 10px', cursor: 'pointer',
              }}>
                + Registar leitura
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {currentlyReading.map(r => {
                const progress = r.total_pages && r.total_pages > 0
                  ? Math.round((r.current_page / r.total_pages) * 100) : null
                return (
                  <button key={r.id} onClick={() => onNavigate('readings')} style={{
                    display: 'flex', gap: 10, alignItems: 'center',
                    background: cardBg, border: `1px solid ${border}`,
                    borderLeft: `3px solid ${accent}`,
                    borderRadius: 2, boxShadow: `2px 2px 0 ${border}`,
                    padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                    transition: 'transform 80ms',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                  >
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 13,
                        fontStyle: 'italic', color: ink, marginBottom: 2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.title}
                      </div>
                      {progress !== null && (
                        <div style={{ marginTop: 5 }}>
                          <div style={{ height: 2, background: border, borderRadius: 1 }}>
                            <div style={{ height: '100%', width: `${progress}%`,
                              background: accent, borderRadius: 1 }} />
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
                            color: ink2, marginTop: 2 }}>
                            {r.current_page}/{r.total_pages} págs · {progress}%
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Recursos recentes */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
              letterSpacing: '0.16em', color: ink2 }}>
              ◇ RECURSOS RECENTES
            </div>
            <button onClick={() => onNavigate('resources')} style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: accent,
              background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em',
            }}>
              ver todos →
            </button>
          </div>

          {recentResources.length === 0 ? (
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 2,
              padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, opacity: 0.3, marginBottom: 8 }}>◇</div>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic',
                fontSize: 13, color: ink2 }}>Nenhum recurso guardado</div>
              <button onClick={() => onNavigate('resources')} style={{
                marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10,
                color: accent, background: 'none', border: `1px solid ${accent}`,
                borderRadius: 1, padding: '4px 10px', cursor: 'pointer',
              }}>
                + Adicionar recurso
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {recentResources.map(r => (
                <button key={r.id} onClick={() => onNavigate('resources')} style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  background: cardBg, border: `1px solid ${border}`,
                  borderRadius: 2, boxShadow: `2px 2px 0 ${border}`,
                  padding: '8px 12px', cursor: 'pointer', textAlign: 'left',
                  transition: 'transform 80ms',
                }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {RESOURCE_TYPE_ICONS[r.resource_type ?? ''] ?? '◦'}
                  </span>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13,
                      fontStyle: 'italic', color: ink,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.title}
                    </div>
                    {r.url && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: accent, letterSpacing: '0.04em',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.url}
                      </div>
                    )}
                  </div>
                  {r.resource_type && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
                      color: ink2, border: `1px solid ${border}`, borderRadius: 1,
                      padding: '1px 5px', flexShrink: 0, letterSpacing: '0.06em' }}>
                      {r.resource_type}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leituras recentes (não em curso) */}
        {recentReadings.length > 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
              letterSpacing: '0.16em', color: ink2, marginBottom: 10 }}>
              ✶ ADICIONADAS RECENTEMENTE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {recentReadings.map(r => {
                const st = READING_STATUS[r.status] ?? READING_STATUS.want
                return (
                  <button key={r.id} onClick={() => onNavigate('readings')} style={{
                    background: cardBg, border: `1px solid ${border}`,
                    borderRadius: 2, boxShadow: `2px 2px 0 ${border}`,
                    cursor: 'pointer', textAlign: 'left', overflow: 'hidden',
                    transition: 'transform 80ms',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
                  >
                    <div style={{ height: 6, background: st.color }} />
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 12,
                        fontStyle: 'italic', color: ink, marginBottom: 3,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {r.title}
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
                        color: st.color, border: `1px solid ${st.color}`,
                        borderRadius: 1, padding: '1px 5px', letterSpacing: '0.06em' }}>
                        {st.label}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Export principal ──────────────────────────────────────────────────────────

export function LibraryView({ dark, activeSub, onNavigateSub }: {
  dark: boolean
  activeSub?: SubSection
  onNavigateSub?: (sub: SubSection) => void
}) {
  if (activeSub === 'readings')  return <ReadingsView  dark={dark} />
  if (activeSub === 'resources') return <ResourcesView dark={dark} />
  return <LibraryDashboard dark={dark} onNavigate={onNavigateSub ?? (() => {})} />
}
