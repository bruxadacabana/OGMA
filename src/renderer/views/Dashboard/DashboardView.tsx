import React, { useEffect, useRef, useState } from 'react'
import { CosmosLayer } from '../../components/Cosmos/CosmosLayer'
import { useAppStore } from '../../store/useAppStore'
import { PROJECT_TYPE_ICONS } from '../../types'
import { fromIpc } from '../../types/errors'

const db = () => (window as any).db

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type WidgetSize = 'sm' | 'md' | 'lg'
type WidgetId = 'stats' | 'projects' | 'recent' | 'prazos' | 'cosmos' | 'wheel'

const DEFAULT_ORDER: WidgetId[]              = ['stats', 'projects', 'recent', 'prazos', 'cosmos', 'wheel']
const DEFAULT_SIZES: Record<WidgetId, WidgetSize> = {
  stats: 'md', projects: 'md', recent: 'md', prazos: 'md', cosmos: 'md', wheel: 'md',
}

interface Props {
  dark:          boolean
  onProjectOpen: (id: number) => void
  onPageOpen:    (projectId: number, pageId: number) => void
}

// ── Helpers de tempo ─────────────────────────────────────────────────────────

function formatTime(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDateLong(): string {
  const now   = new Date()
  const dias  = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${dias[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`
}

function timeAgo(iso: string): string {
  try {
    const ms  = Date.now() - new Date(iso).getTime()
    const min = Math.floor(ms / 60000)
    const h   = Math.floor(min / 60)
    const d   = Math.floor(h / 24)
    if (d > 0)   return `há ${d}d`
    if (h > 0)   return `há ${h}h`
    if (min > 0) return `há ${min}min`
    return 'agora'
  } catch { return '' }
}

function formatUpcomingDate(iso: string): string {
  try {
    const d    = new Date(iso + 'T00:00:00')
    const now  = new Date(); now.setHours(0, 0, 0, 0)
    const diff = Math.round((d.getTime() - now.getTime()) / 86400000)
    if (diff === 0) return 'hoje'
    if (diff === 1) return 'amanhã'
    if (diff <= 6)  return `em ${diff} dias`
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch { return iso }
}

// ── Astronomia ────────────────────────────────────────────────────────────────

const KNOWN_NEW  = new Date('2000-01-06T18:14:00Z').getTime()
const CYCLE_MS   = 29.530588853 * 86400000
const MESES_ABR  = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function getMoonPhase() {
  const phase = ((Date.now() - KNOWN_NEW) % CYCLE_MS) / CYCLE_MS
  const idx   = Math.floor(phase * 8) % 8
  const emojis = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘']
  const names  = ['Lua Nova','Crescente','Quarto Crescente','Gibosa Crescente',
                  'Lua Cheia','Gibosa Minguante','Quarto Minguante','Minguante']
  return { emoji: emojis[idx], name: names[idx], pct: Math.round(phase * 100), raw: phase }
}

function getNextFullMoon() {
  const phase  = ((Date.now() - KNOWN_NEW) % CYCLE_MS) / CYCLE_MS
  const daysTo = phase < 0.5
    ? (0.5 - phase) * 29.530588853
    : (1.5 - phase) * 29.530588853
  const d = new Date(Date.now() + daysTo * 86400000)
  return { days: Math.round(daysTo), dateStr: `${d.getDate()} ${MESES_ABR[d.getMonth()]}` }
}

function getNextQuarter() {
  const phase     = ((Date.now() - KNOWN_NEW) % CYCLE_MS) / CYCLE_MS
  const quarters  = [
    { pct: 0.25, name: 'Quarto Crescente' },
    { pct: 0.5,  name: 'Lua Cheia' },
    { pct: 0.75, name: 'Quarto Minguante' },
    { pct: 1.0,  name: 'Lua Nova' },
  ]
  const next   = quarters.find(q => q.pct > phase) ?? quarters[0]
  const daysTo = (next.pct - phase) * 29.530588853
  return { name: next.name, days: Math.ceil(daysTo) }
}

// ── Persistência ──────────────────────────────────────────────────────────────

function loadOrder(): WidgetId[] {
  try {
    const s = localStorage.getItem('ogma_dashboard_order')
    if (s) {
      const arr   = JSON.parse(s) as string[]
      const valid = arr.filter(id => DEFAULT_ORDER.includes(id as WidgetId)) as WidgetId[]
      DEFAULT_ORDER.forEach(id => { if (!valid.includes(id)) valid.push(id) })
      return valid
    }
  } catch {}
  return [...DEFAULT_ORDER]
}

function loadSizes(): Record<WidgetId, WidgetSize> {
  try {
    const s = localStorage.getItem('ogma_widget_sizes')
    if (s) {
      const obj = JSON.parse(s) as Record<string, string>
      const valid: Record<WidgetId, WidgetSize> = { ...DEFAULT_SIZES }
      for (const [k, v] of Object.entries(obj)) {
        if (DEFAULT_ORDER.includes(k as WidgetId) && ['sm','md','lg'].includes(v)) {
          valid[k as WidgetId] = v as WidgetSize
        }
      }
      return valid
    }
  } catch {}
  return { ...DEFAULT_SIZES }
}

// ── WidgetWrapper ─────────────────────────────────────────────────────────────

interface WrapperProps {
  id:           WidgetId
  size:         WidgetSize
  dark:         boolean
  isDragging:   boolean
  onDragStart:  () => void
  onDragEnter:  () => void
  onDrop:       () => void
  onDragEnd:    () => void
  onSizeChange: (s: WidgetSize) => void
  children:     React.ReactNode
}

function WidgetWrapper({ id, size, dark, isDragging, onDragStart, onDragEnter, onDrop, onDragEnd, onSizeChange, children }: WrapperProps) {
  const [hovered, setHovered] = useState(false)
  const counterRef = useRef(0)

  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  const SIZE_LABELS: Record<WidgetSize, string> = { sm: 'S', md: 'M', lg: 'L' }

  return (
    <div
      style={{
        gridColumn: size === 'lg' ? 'span 2' : 'span 1',
        position: 'relative',
        opacity: isDragging ? 0.35 : 1,
        transition: 'opacity 120ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragEnter={() => { counterRef.current++; if (counterRef.current === 1) onDragEnter() }}
      onDragLeave={() => { counterRef.current-- }}
      onDragOver={e => e.preventDefault()}
      onDrop={() => { counterRef.current = 0; onDrop() }}
    >
      {/* Barra de controles — aparece no hover */}
      <div style={{
        position: 'absolute', top: 8, right: 10,
        zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 4,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 150ms',
        pointerEvents: hovered ? 'auto' : 'none',
      }}>
        {(['sm', 'md', 'lg'] as WidgetSize[]).map(s => (
          <button
            key={s}
            onClick={() => onSizeChange(s)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.08em',
              padding: '2px 6px',
              border: `1px solid ${size === s ? accent : border}`,
              borderRadius: 2,
              background: size === s ? accent + '25' : cardBg,
              color: size === s ? accent : ink2,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {SIZE_LABELS[s]}
          </button>
        ))}

        {/* Alça de arrasto */}
        <div
          draggable
          onDragStart={e => { e.stopPropagation(); onDragStart() }}
          onDragEnd={onDragEnd}
          style={{
            cursor: 'grab',
            color: ink2,
            fontSize: 14,
            padding: '1px 4px',
            userSelect: 'none',
            lineHeight: 1,
            marginLeft: 2,
          }}
          title="Arrastar para reordenar"
        >
          ⠿
        </div>
      </div>

      {children}
    </div>
  )
}

// ── Widget: Boas-vindas (sempre lg, não arrastável) ───────────────────────────

function WelcomeWidget({ dark }: { dark: boolean }) {
  const [time, setTime] = useState(formatTime())
  const workspace = useAppStore(s => s.workspace)

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  const phrases = [
    'A lua e os astros aguardam sua jornada.',
    'O conhecimento é a mais antiga das magias.',
    'Cada projeto é um cosmos por explorar.',
    'Que as páginas em branco se encham de descobertas.',
    'O saber é o mapa; a curiosidade, a bússola.',
  ]
  const phrase   = phrases[new Date().getDate() % phrases.length]
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const wsName   = workspace?.name ?? 'Viajante'

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="card" style={{
      background: cardBg, borderColor: border,
      position: 'relative', overflow: 'hidden', minHeight: 100,
      gridColumn: '1 / -1',
    }}>
      <CosmosLayer width={600} height={100} seed="dash_welcome" density="low" dark={dark}
        style={{ opacity: 0.45, left: 'auto', right: 0, width: 300 }} />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24,
          fontStyle: 'italic', color: ink, fontWeight: 'normal', marginBottom: 4 }}>
          {greeting}, {wsName}
        </h1>
        <p style={{ fontSize: 12, color: ink2, fontStyle: 'italic', marginBottom: 8 }}>{phrase}</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
          color: accent, letterSpacing: '0.08em' }}>
          {formatDateLong()}  ·  {time}
        </p>
      </div>
    </div>
  )
}

// ── Widget: Estatísticas ──────────────────────────────────────────────────────

interface StatsData {
  total_pages:     number
  pages_this_week: number
  active_projects: number
  total_projects:  number
}

function StatsWidget({ dark, size }: { dark: boolean; size: WidgetSize }) {
  const [stats, setStats] = useState<StatsData | null>(null)

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  useEffect(() => {
    fromIpc<StatsData>(() => db().dashboard.stats(), 'dashboardStats')
      .then(r => r.match(data => setStats(data), _e => {}))
  }, [])

  const label = (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
      color: ink2, textTransform: 'uppercase', marginBottom: 12 }}>
      ◈ Estatísticas
    </div>
  )

  if (!stats) return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      {label}
      <p style={{ fontSize: 11, color: ink2, fontStyle: 'italic' }}>A carregar…</p>
    </div>
  )

  if (size === 'sm') {
    return (
      <div className="card" style={{ background: cardBg, borderColor: border }}>
        {label}
        <div style={{ display: 'flex', gap: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28,
              fontStyle: 'italic', color: accent, lineHeight: 1 }}>{stats.total_pages}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: ink2, marginTop: 2 }}>Páginas</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28,
              fontStyle: 'italic', color: accent, lineHeight: 1 }}>{stats.active_projects}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: ink2, marginTop: 2 }}>Projetos</div>
          </div>
        </div>
      </div>
    )
  }

  const allItems = size === 'lg'
    ? [
        { label: 'Páginas',          value: stats.total_pages,     sub: `+${stats.pages_this_week} esta semana` },
        { label: 'Esta semana',      value: stats.pages_this_week, sub: 'páginas criadas'                       },
        { label: 'Projetos ativos',  value: stats.active_projects, sub: `${stats.total_projects} no total`      },
        { label: 'Total de projetos',value: stats.total_projects,  sub: 'incluindo inativos'                    },
      ]
    : [
        { label: 'Páginas',         value: stats.total_pages,     sub: `+${stats.pages_this_week} esta semana` },
        { label: 'Projetos ativos', value: stats.active_projects, sub: `${stats.total_projects} no total`      },
      ]

  return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      {label}
      <div style={{ display: 'flex', gap: 0 }}>
        {allItems.map((item, i) => (
          <div key={item.label} style={{
            flex: 1,
            paddingRight: i < allItems.length - 1 ? 16 : 0,
            marginRight:  i < allItems.length - 1 ? 16 : 0,
            borderRight:  i < allItems.length - 1 ? `1px solid ${border}` : 'none',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: size === 'lg' ? 40 : 36,
              fontStyle: 'italic', color: accent, lineHeight: 1, marginBottom: 4 }}>
              {item.value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: ink, letterSpacing: '0.08em' }}>
              {item.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: ink2, marginTop: 2 }}>
              {item.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Widget: Projetos Ativos ───────────────────────────────────────────────────

function ProjectsWidget({ dark, size, onProjectOpen }: { dark: boolean; size: WidgetSize; onProjectOpen: (id: number) => void }) {
  const projects = useAppStore(s => s.projects)
  const [pageCounts, setPageCounts] = useState<Record<number, number>>({})

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  useEffect(() => {
    fromIpc<StatsData & { page_counts?: { project_id: number; count: number }[] }>(
      () => db().dashboard.stats(), 'dashboardStatsProjects'
    ).then(r => r.match(
      data => {
        const map: Record<number, number> = {}
        for (const { project_id, count } of (data.page_counts ?? [])) map[project_id] = count
        setPageCounts(map)
      },
      _e => {},
    ))
  }, [])

  const active = projects.filter(p => p.status === 'active')
  const limit  = size === 'sm' ? 3 : size === 'md' ? 6 : 10
  const shown  = active.slice(0, limit)

  const label = (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
      color: ink2, textTransform: 'uppercase', marginBottom: 10 }}>
      ✦ Projetos Ativos
    </div>
  )

  if (shown.length === 0) return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      {label}
      <p style={{ fontSize: 11, color: ink2, fontStyle: 'italic' }}>Nenhum projeto ativo.</p>
    </div>
  )

  const ProjectRow = ({ p, compact }: { p: typeof shown[0]; compact?: boolean }) => {
    const color = p.color ?? '#8B7355'
    const count = pageCounts[p.id] ?? 0
    return (
      <button onClick={() => onProjectOpen(p.id)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: compact ? '4px 6px' : '6px 8px',
        border: `1px solid ${border}`, borderLeft: `3px solid ${color}`,
        borderRadius: 2, background: 'transparent', cursor: 'pointer', textAlign: 'left',
        transition: 'background 100ms', width: '100%',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = dark ? 'rgba(232,223,200,0.05)' : 'rgba(44,36,22,0.04)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ fontSize: compact ? 13 : 16, flexShrink: 0 }}>
          {p.icon ?? PROJECT_TYPE_ICONS[p.project_type]}
        </span>
        <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: compact ? 12 : 13,
          fontStyle: 'italic', color: ink,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.name}
        </span>
        {!compact && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: ink2, flexShrink: 0 }}>
            {count} {count === 1 ? 'pág' : 'págs'}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      {label}
      <div style={{
        display: size === 'lg' ? 'grid' : 'flex',
        gridTemplateColumns: size === 'lg' ? '1fr 1fr' : undefined,
        flexDirection: size === 'lg' ? undefined : 'column',
        gap: 5,
      }}>
        {shown.map(p => <ProjectRow key={p.id} p={p} compact={size === 'sm'} />)}
      </div>
      {active.length > limit && (
        <p style={{ fontSize: 10, color: ink2, fontStyle: 'italic', textAlign: 'right', marginTop: 6 }}>
          +{active.length - limit} mais
        </p>
      )}
    </div>
  )
}

// ── Widget: Atividade Recente ─────────────────────────────────────────────────

function RecentWidget({ dark, size, onPageOpen }: { dark: boolean; size: WidgetSize; onPageOpen: (projectId: number, pageId: number) => void }) {
  const [pages, setPages] = useState<any[]>([])
  const limit = size === 'sm' ? 4 : size === 'md' ? 8 : 12

  useEffect(() => {
    fromIpc<any[]>(() => db().pages.listRecent(limit), 'listRecent')
      .then(r => r.match(data => setPages(data), _e => {}))
  }, [limit])

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  const label = (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
      color: ink2, textTransform: 'uppercase', marginBottom: 10 }}>
      ⊛ Atividade Recente
    </div>
  )

  const PageRow = ({ p, i, total, compact }: { p: any; i: number; total: number; compact?: boolean }) => (
    <button onClick={() => onPageOpen(p.project_id, p.id)} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 4px', background: 'transparent', border: 'none',
      borderBottom: i < total - 1 ? `1px solid ${border}` : 'none',
      cursor: 'pointer', textAlign: 'left', width: '100%',
      transition: 'background 100ms',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = dark ? 'rgba(232,223,200,0.05)' : 'rgba(44,36,22,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontSize: 13, flexShrink: 0 }}>{p.icon ?? '◦'}</span>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 12, color: ink, fontFamily: 'var(--font-display)',
          fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.title}
        </div>
        {!compact && (
          <div style={{ fontSize: 10, color: ink2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.project_name}
          </div>
        )}
      </div>
      {!compact && (
        <span style={{ fontSize: 10, color: ink2, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
          {timeAgo(p.updated_at)}
        </span>
      )}
    </button>
  )

  if (pages.length === 0) return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      {label}
      <p style={{ fontSize: 11, color: ink2, fontStyle: 'italic' }}>Nenhuma atividade ainda.</p>
    </div>
  )

  return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      {label}
      {size === 'lg' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          {pages.map((p, i) => (
            <PageRow key={p.id} p={p} i={i % Math.ceil(pages.length / 2)} total={Math.ceil(pages.length / 2)} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {pages.map((p, i) => <PageRow key={p.id} p={p} i={i} total={pages.length} compact={size === 'sm'} />)}
        </div>
      )}
    </div>
  )
}

// ── Widget: Prazos Próximos ───────────────────────────────────────────────────

function PrazosWidget({ dark, size, onPageOpen }: { dark: boolean; size: WidgetSize; onPageOpen: (projectId: number, pageId: number) => void }) {
  const [items, setItems] = useState<any[]>([])
  const days = size === 'lg' ? 30 : size === 'sm' ? 7 : 14

  useEffect(() => {
    fromIpc<any[]>(() => db().pages.listUpcoming(days), 'listUpcoming')
      .then(r => r.match(data => setItems(data), _e => {}))
  }, [days])

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'
  const ribbon = dark ? '#C45A40' : '#8B3A2A'

  const label = (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
      color: ink2, textTransform: 'uppercase', marginBottom: 10 }}>
      ⚑ Prazos Próximos {size !== 'md' && (
        <span style={{ opacity: 0.6 }}>({days} dias)</span>
      )}
    </div>
  )

  const PrazoRow = ({ item, i, compact }: { item: any; i: number; compact?: boolean }) => {
    const color     = item.project_color ?? '#8B7355'
    const dateLabel = formatUpcomingDate(item.value_date)
    const isUrgent  = dateLabel === 'hoje' || dateLabel === 'amanhã'
    return (
      <button onClick={() => onPageOpen(item.project_id, item.id)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: compact ? '4px 6px' : '5px 8px',
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${isUrgent ? ribbon : color}`,
        borderRadius: 2, background: 'transparent',
        cursor: 'pointer', textAlign: 'left', transition: 'background 100ms', width: '100%',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = dark ? 'rgba(232,223,200,0.05)' : 'rgba(44,36,22,0.04)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ fontSize: 13, flexShrink: 0 }}>{item.icon ?? '◦'}</span>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 12, color: ink, fontFamily: 'var(--font-display)',
            fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.title}
          </div>
          {!compact && (
            <div style={{ fontSize: 10, color: ink2 }}>{item.project_name} · {item.prop_name}</div>
          )}
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, flexShrink: 0,
          color: isUrgent ? ribbon : ink2, fontWeight: isUrgent ? 'bold' : 'normal',
        }}>
          {dateLabel}
        </span>
      </button>
    )
  }

  const empty = (
    <p style={{ fontSize: 11, color: ink2, fontStyle: 'italic' }}>
      Nenhum prazo nos próximos {days} dias.
    </p>
  )

  return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      {label}
      {items.length === 0 ? empty : (
        size === 'lg' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px' }}>
            {items.map((item, i) => <PrazoRow key={`${item.id}_${i}`} item={item} i={i} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {items.map((item, i) => <PrazoRow key={`${item.id}_${i}`} item={item} i={i} compact={size === 'sm'} />)}
          </div>
        )
      )}
    </div>
  )
}

// ── Widget: Cosmos (Lua) ──────────────────────────────────────────────────────

function CosmosWidget({ dark, size }: { dark: boolean; size: WidgetSize }) {
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  const moon       = getMoonPhase()
  const fullMoon   = size === 'lg' ? getNextFullMoon()  : null
  const nextQ      = size === 'lg' ? getNextQuarter()   : null

  const label = (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
      color: ink2, textTransform: 'uppercase', marginBottom: 8 }}>
      ☽ Fase da Lua
    </div>
  )

  // SM: só emoji + nome + %
  if (size === 'sm') {
    return (
      <div className="card" style={{ background: cardBg, borderColor: border }}>
        {label}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 36, lineHeight: 1 }}>{moon.emoji}</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13,
              fontStyle: 'italic', color: ink }}>{moon.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
              color: accent, marginTop: 2 }}>{moon.pct}% do ciclo</div>
          </div>
        </div>
      </div>
    )
  }

  // Arco SVG
  const arcR = size === 'lg' ? 48 : 36
  const arcCx = size === 'lg' ? 60 : 50
  const arcCy = size === 'lg' ? 60 : 50
  const svgSize = size === 'lg' ? 120 : 100
  const pct = moon.raw
  const endAngle = pct * 2 * Math.PI - Math.PI / 2
  const arcX = arcCx + arcR * Math.cos(endAngle)
  const arcY = arcCy + arcR * Math.sin(endAngle)
  const largeArc = pct > 0.5 ? 1 : 0

  const arcSvg = (
    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ flexShrink: 0 }}>
      <circle cx={arcCx} cy={arcCy} r={arcR} fill="none" stroke={border} strokeWidth={size === 'lg' ? 7 : 6} />
      {pct > 0 && pct < 1 && (
        <path
          d={`M ${arcCx} ${arcCy - arcR} A ${arcR} ${arcR} 0 ${largeArc} 1 ${arcX.toFixed(1)} ${arcY.toFixed(1)}`}
          fill="none" stroke={accent} strokeWidth={size === 'lg' ? 7 : 6} strokeLinecap="round"
        />
      )}
      {pct >= 1 && <circle cx={arcCx} cy={arcCy} r={arcR} fill="none" stroke={accent} strokeWidth={size === 'lg' ? 7 : 6} />}
      <text x={arcCx} y={arcCy} textAnchor="middle" dominantBaseline="middle"
        fontSize={size === 'lg' ? 28 : 22}>{moon.emoji}</text>
    </svg>
  )

  // MD: emoji + arco lado a lado
  if (size === 'md') {
    return (
      <div className="card" style={{ background: cardBg, borderColor: border, position: 'relative', overflow: 'hidden' }}>
        <CosmosLayer width={260} height={120} seed="dash_cosmos" density="medium" dark={dark}
          style={{ opacity: 0.4 }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            {label}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13,
              fontStyle: 'italic', color: ink, marginBottom: 2 }}>{moon.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: ink2 }}>{moon.pct}% do ciclo</div>
          </div>
          <div style={{ width: 1, background: border, alignSelf: 'stretch' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {arcSvg}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: accent, letterSpacing: '0.08em' }}>
              {moon.pct}%
            </div>
          </div>
        </div>
      </div>
    )
  }

  // LG: arco maior + informações detalhadas
  return (
    <div className="card" style={{ background: cardBg, borderColor: border, position: 'relative', overflow: 'hidden' }}>
      <CosmosLayer width={600} height={160} seed="dash_cosmos_lg" density="medium" dark={dark}
        style={{ opacity: 0.3 }} />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 28, alignItems: 'center' }}>
        {/* Arco */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {label}
          {arcSvg}
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: accent, letterSpacing: '0.08em' }}>
            {moon.pct}%
          </div>
        </div>

        <div style={{ width: 1, background: border, alignSelf: 'stretch' }} />

        {/* Fase atual */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em',
            color: ink2, textTransform: 'uppercase', marginBottom: 4 }}>Fase Atual</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18,
            fontStyle: 'italic', color: ink, marginBottom: 2 }}>{moon.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: ink2, marginBottom: 12 }}>
            {moon.pct}% do ciclo sinódico
          </div>

          <div style={{ display: 'flex', gap: 20 }}>
            {fullMoon && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em',
                  color: ink2, textTransform: 'uppercase', marginBottom: 3 }}>Próxima Lua Cheia</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14,
                  fontStyle: 'italic', color: ink }}>{fullMoon.dateStr}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: accent, marginTop: 1 }}>
                  {fullMoon.days === 0 ? 'hoje' : fullMoon.days === 1 ? 'amanhã' : `em ${fullMoon.days} dias`}
                </div>
              </div>
            )}
            {nextQ && (
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em',
                  color: ink2, textTransform: 'uppercase', marginBottom: 3 }}>Próxima Fase</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14,
                  fontStyle: 'italic', color: ink }}>{nextQ.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: accent, marginTop: 1 }}>
                  {nextQ.days === 0 ? 'hoje' : nextQ.days === 1 ? 'amanhã' : `em ${nextQ.days} dias`}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Widget: Roda do Ano ───────────────────────────────────────────────────────

const SABBATS = [
  { name: 'Imbolc',     symbol: '❄', day: 33,  dateStr: '2 fev'  },
  { name: 'Ostara',     symbol: '🌱', day: 79,  dateStr: '20 mar' },
  { name: 'Beltane',    symbol: '🔥', day: 121, dateStr: '1 mai'  },
  { name: 'Litha',      symbol: '☀', day: 172, dateStr: '21 jun' },
  { name: 'Lughnasadh', symbol: '🌾', day: 213, dateStr: '1 ago'  },
  { name: 'Mabon',      symbol: '🍂', day: 265, dateStr: '22 set' },
  { name: 'Samhain',    symbol: '🕯', day: 304, dateStr: '31 out' },
  { name: 'Yule',       symbol: '✦', day: 355, dateStr: '21 dez' },
]

function WheelOfYearWidget({ dark, size }: { dark: boolean; size: WidgetSize }) {
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'
  const ink    = dark ? '#E8DFC8' : '#2C2416'

  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1

  const nextSabbat = SABBATS.find(s => s.day >= dayOfYear) ?? SABBATS[0]
  const daysLeft   = nextSabbat.day - dayOfYear
  const daysUntil  = daysLeft >= 0 ? daysLeft : 365 - dayOfYear + nextSabbat.day
  const daysLabel  = daysUntil === 0 ? 'hoje' : daysUntil === 1 ? 'amanhã' : `em ${daysUntil} dias`

  const label = (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
      color: ink2, textTransform: 'uppercase', marginBottom: 8 }}>
      ✦ Roda do Ano
    </div>
  )

  // SM: só próximo sabbat + barra de progresso
  if (size === 'sm') {
    return (
      <div className="card" style={{ background: cardBg, borderColor: border }}>
        {label}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32, lineHeight: 1 }}>{nextSabbat.symbol}</span>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14,
              fontStyle: 'italic', color: ink }}>{nextSabbat.name}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
              color: accent, marginTop: 2 }}>{daysLabel}</div>
            <div style={{ height: 3, background: border, borderRadius: 2, marginTop: 6, width: 80, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(dayOfYear / 365 * 100)}%`,
                background: accent, borderRadius: 2 }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Roda SVG (MD ou LG)
  const svgSize = size === 'lg' ? 240 : 200
  const cx = svgSize / 2, cy = svgSize / 2
  const rim = size === 'lg' ? 100 : 78
  const inner = size === 'lg' ? 18 : 14
  const symbolR = size === 'lg' ? 68 : 54

  const f = (n: number) => n.toFixed(1)
  const toRad = (day: number) => (day / 365 * 360 - 90) * Math.PI / 180
  const pt = (day: number, r: number) => ({
    x: cx + r * Math.cos(toRad(day)),
    y: cy + r * Math.sin(toRad(day)),
  })

  const sector = (startDay: number, endDay: number, fill: string, key: string) => {
    const a1 = toRad(startDay), a2 = toRad(endDay)
    const ox1 = cx + rim * Math.cos(a1),   oy1 = cy + rim * Math.sin(a1)
    const ox2 = cx + rim * Math.cos(a2),   oy2 = cy + rim * Math.sin(a2)
    const ix1 = cx + inner * Math.cos(a1), iy1 = cy + inner * Math.sin(a1)
    const ix2 = cx + inner * Math.cos(a2), iy2 = cy + inner * Math.sin(a2)
    const span = ((endDay - startDay) + 730) % 365
    const large = span > 182 ? 1 : 0
    return (
      <path key={key} fill={fill} d={
        `M ${f(ix1)} ${f(iy1)} L ${f(ox1)} ${f(oy1)} ` +
        `A ${rim} ${rim} 0 ${large} 1 ${f(ox2)} ${f(oy2)} ` +
        `L ${f(ix2)} ${f(iy2)} ` +
        `A ${inner} ${inner} 0 ${large} 0 ${f(ix1)} ${f(iy1)} Z`
      } />
    )
  }

  const wheel = (
    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ flexShrink: 0 }}>
      {sector(33, 121, 'rgba(107,140,74,0.22)',  'spring')}
      {sector(121, 213, 'rgba(196,137,42,0.20)', 'summer')}
      {sector(213, 304, 'rgba(140,74,26,0.20)',  'autumn')}
      {sector(304, 398, 'rgba(100,120,150,0.18)','winter')}

      <circle cx={cx} cy={cy} r={rim}   fill="none" stroke={border} strokeWidth={1} />
      <circle cx={cx} cy={cy} r={inner} fill={cardBg} stroke={border} strokeWidth={1} />

      {SABBATS.map(s => {
        const o = pt(s.day, inner), i = pt(s.day, rim)
        return <line key={s.name + 'r'} x1={f(o.x)} y1={f(o.y)} x2={f(i.x)} y2={f(i.y)}
          stroke={border} strokeWidth={0.8} />
      })}

      {SABBATS.map(s => {
        const p = pt(s.day, symbolR)
        const isNext = s === nextSabbat
        return (
          <text key={s.name + 't'} x={f(p.x)} y={f(p.y)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={isNext ? (size === 'lg' ? 20 : 16) : (size === 'lg' ? 16 : 13)}
            opacity={isNext ? 1 : 0.55}>
            {s.symbol}
          </text>
        )
      })}

      {(() => {
        const p = pt(dayOfYear, rim - 7)
        return <circle cx={f(p.x)} cy={f(p.y)} r={size === 'lg' ? 7 : 5.5}
          fill={accent} stroke={cardBg} strokeWidth={1.5} />
      })()}

      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fontSize={size === 'lg' ? 16 : 13} fill={accent}>✦</text>
    </svg>
  )

  // MD: roda + legenda compacta
  if (size === 'md') {
    return (
      <div className="card" style={{ background: cardBg, borderColor: border }}>
        {label}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {wheel}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
                letterSpacing: '0.15em', color: ink2, textTransform: 'uppercase', marginBottom: 6 }}>
                Próximo Sabá
              </div>
              <div style={{ fontSize: 26, marginBottom: 4 }}>{nextSabbat.symbol}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15,
                fontStyle: 'italic', color: ink }}>{nextSabbat.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                color: accent, marginTop: 3 }}>{daysLabel}</div>
            </div>
            <div style={{ borderTop: `1px solid ${border}`, paddingTop: 10 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
                letterSpacing: '0.15em', color: ink2, textTransform: 'uppercase', marginBottom: 6 }}>
                Posição no Ano
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: ink, marginBottom: 6 }}>
                Dia {dayOfYear} · {Math.round(dayOfYear / 365 * 100)}%
              </div>
              <div style={{ height: 3, background: border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.round(dayOfYear / 365 * 100)}%`,
                  background: accent, borderRadius: 2 }} />
              </div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {SABBATS.filter(s => s.day >= dayOfYear).slice(0, 3).map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 11 }}>{s.symbol}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
                      color: s === nextSabbat ? accent : ink2 }}>
                      {s.name}{s === nextSabbat && ' ←'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // LG: roda maior + lista completa dos sabbats em 2 colunas
  return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      {label}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {wheel}

        <div style={{ flex: 1 }}>
          {/* Próximo destaque */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 36 }}>{nextSabbat.symbol}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
                letterSpacing: '0.15em', color: ink2, textTransform: 'uppercase', marginBottom: 2 }}>
                Próximo Sabá
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18,
                fontStyle: 'italic', color: ink }}>{nextSabbat.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                color: accent, marginTop: 2 }}>{daysLabel} · {nextSabbat.dateStr}</div>
            </div>
          </div>

          {/* Progresso do ano */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: ink2 }}>
                Dia {dayOfYear} de 365
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: accent }}>
                {Math.round(dayOfYear / 365 * 100)}%
              </span>
            </div>
            <div style={{ height: 3, background: border, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(dayOfYear / 365 * 100)}%`,
                background: accent, borderRadius: 2 }} />
            </div>
          </div>

          {/* Todos os sabbats em 2 colunas */}
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
              letterSpacing: '0.15em', color: ink2, textTransform: 'uppercase', marginBottom: 8 }}>
              Roda Completa
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
              {SABBATS.map(s => {
                const isPast   = s.day < dayOfYear
                const isNext   = s === nextSabbat
                return (
                  <div key={s.name} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '3px 6px',
                    background: isNext ? accent + '18' : 'transparent',
                    border: isNext ? `1px solid ${accent}40` : '1px solid transparent',
                    borderRadius: 2,
                  }}>
                    <span style={{ fontSize: 13, opacity: isPast ? 0.45 : 1 }}>{s.symbol}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11,
                        fontStyle: 'italic', color: isPast ? ink2 : ink,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: ink2 }}>
                        {s.dateStr}
                      </div>
                    </div>
                    {isNext && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8,
                        color: accent, flexShrink: 0 }}>←</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export const DashboardView: React.FC<Props> = ({ dark, onProjectOpen, onPageOpen }) => {
  const [order,    setOrder]    = useState<WidgetId[]>(loadOrder)
  const [sizes,    setSizes]    = useState<Record<WidgetId, WidgetSize>>(loadSizes)
  const [dragging, setDragging] = useState<WidgetId | null>(null)

  const handleDragStart = (id: WidgetId) => setDragging(id)

  const handleDragEnter = (id: WidgetId) => {
    if (!dragging || dragging === id) return
    setOrder(prev => {
      const arr  = [...prev]
      const from = arr.indexOf(dragging)
      const to   = arr.indexOf(id)
      arr.splice(from, 1)
      arr.splice(to, 0, dragging)
      return arr
    })
  }

  const handleDrop = () => {
    setOrder(prev => { localStorage.setItem('ogma_dashboard_order', JSON.stringify(prev)); return prev })
    setDragging(null)
  }

  const handleSizeChange = (id: WidgetId, s: WidgetSize) => {
    setSizes(prev => {
      const next = { ...prev, [id]: s }
      localStorage.setItem('ogma_widget_sizes', JSON.stringify(next))
      return next
    })
  }

  const renderWidget = (id: WidgetId, size: WidgetSize): React.ReactNode => {
    switch (id) {
      case 'stats':    return <StatsWidget    dark={dark} size={size} />
      case 'projects': return <ProjectsWidget dark={dark} size={size} onProjectOpen={onProjectOpen} />
      case 'recent':   return <RecentWidget   dark={dark} size={size} onPageOpen={onPageOpen} />
      case 'prazos':   return <PrazosWidget   dark={dark} size={size} onPageOpen={onPageOpen} />
      case 'cosmos':   return <CosmosWidget   dark={dark} size={size} />
      case 'wheel':    return <WheelOfYearWidget dark={dark} size={size} />
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 40px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        maxWidth: 1100,
      }}>
        <WelcomeWidget dark={dark} />

        {order.map(id => (
          <WidgetWrapper
            key={id}
            id={id}
            size={sizes[id]}
            dark={dark}
            isDragging={dragging === id}
            onDragStart={() => handleDragStart(id)}
            onDragEnter={() => handleDragEnter(id)}
            onDrop={handleDrop}
            onDragEnd={() => setDragging(null)}
            onSizeChange={s => handleSizeChange(id, s)}
          >
            {renderWidget(id, sizes[id])}
          </WidgetWrapper>
        ))}
      </div>
    </div>
  )
}
