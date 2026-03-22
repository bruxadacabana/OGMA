import React, { useEffect, useState } from 'react'
import { CosmosLayer } from '../../components/Cosmos/CosmosLayer'
import { useAppStore } from '../../store/useAppStore'
import { PROJECT_TYPE_ICONS } from '../../types'
import { fromIpc } from '../../types/errors'

const db = () => (window as any).db

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

// ── Fase da Lua ───────────────────────────────────────────────────────────────

function getMoonPhase(): { emoji: string; name: string; pct: number } {
  const knownNew = new Date('2000-01-06T18:14:00Z').getTime()
  const cycleMs  = 29.530588853 * 86400000
  const phase    = ((Date.now() - knownNew) % cycleMs) / cycleMs
  const idx      = Math.floor(phase * 8) % 8
  const emojis   = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘']
  const names    = ['Lua Nova','Crescente','Quarto Crescente','Gibosa Crescente',
                    'Lua Cheia','Gibosa Minguante','Quarto Minguante','Minguante']
  return { emoji: emojis[idx], name: names[idx], pct: Math.round(phase * 100) }
}

// ── Próximo Sabá ──────────────────────────────────────────────────────────────

function getNextSabbat(): { name: string; ptName: string; days: number; symbol: string } {
  const y = new Date().getFullYear()
  const sabbats = [
    { name: 'Imbolc',     ptName: 'Imbolc',     symbol: '❄', month: 1,  day: 2  },
    { name: 'Ostara',     ptName: 'Ostara',      symbol: '🌱', month: 2,  day: 20 },
    { name: 'Beltane',    ptName: 'Beltane',     symbol: '🔥', month: 4,  day: 1  },
    { name: 'Litha',      ptName: 'Litha',       symbol: '☀', month: 5,  day: 21 },
    { name: 'Lughnasadh', ptName: 'Lughnasadh',  symbol: '🌾', month: 7,  day: 1  },
    { name: 'Mabon',      ptName: 'Mabon',       symbol: '🍂', month: 8,  day: 22 },
    { name: 'Samhain',    ptName: 'Samhain',     symbol: '🕯', month: 9,  day: 31 },
    { name: 'Yule',       ptName: 'Yule',        symbol: '✦', month: 11, day: 21 },
  ]
  const now = new Date(); now.setHours(0, 0, 0, 0)
  for (const s of sabbats) {
    const d = new Date(y, s.month, s.day)
    if (d >= now) {
      const days = Math.round((d.getTime() - now.getTime()) / 86400000)
      return { ...s, days }
    }
  }
  const next = new Date(y + 1, 1, 2)
  return { name: 'Imbolc', ptName: 'Imbolc', symbol: '❄', days: Math.round((next.getTime() - now.getTime()) / 86400000) }
}

// ── Widget: Boas-vindas ───────────────────────────────────────────────────────

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

interface Stats {
  total_pages:     number
  pages_this_week: number
  active_projects: number
  total_projects:  number
}

function StatsWidget({ dark }: { dark: boolean }) {
  const [stats, setStats] = useState<Stats | null>(null)

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  useEffect(() => {
    fromIpc<Stats>(() => db().dashboard.stats(), 'dashboardStats')
      .then(r => r.match(data => setStats(data), _e => {}))
  }, [])

  const items = stats ? [
    { label: 'Páginas',         value: stats.total_pages,     sub: `+${stats.pages_this_week} esta semana` },
    { label: 'Projetos ativos', value: stats.active_projects, sub: `${stats.total_projects} no total` },
  ] : []

  return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
        color: ink2, textTransform: 'uppercase', marginBottom: 12 }}>
        ◈ Estatísticas
      </div>

      {!stats ? (
        <p style={{ fontSize: 11, color: ink2, fontStyle: 'italic' }}>A carregar…</p>
      ) : (
        <div style={{ display: 'flex', gap: 0 }}>
          {items.map((item, i) => (
            <div key={item.label} style={{
              flex: 1,
              paddingRight: i < items.length - 1 ? 16 : 0,
              marginRight: i < items.length - 1 ? 16 : 0,
              borderRight: i < items.length - 1 ? `1px solid ${border}` : 'none',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 36,
                fontStyle: 'italic', color: accent, lineHeight: 1, marginBottom: 4 }}>
                {item.value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                color: ink, letterSpacing: '0.08em' }}>
                {item.label}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                color: ink2, marginTop: 2 }}>
                {item.sub}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Widget: Projetos Ativos ───────────────────────────────────────────────────

function ProjectsWidget({ dark, onProjectOpen }: { dark: boolean; onProjectOpen: (id: number) => void }) {
  const projects = useAppStore(s => s.projects)
  const [pageCounts, setPageCounts] = useState<Record<number, number>>({})

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  useEffect(() => {
    fromIpc<Stats & { page_counts?: { project_id: number; count: number }[] }>(
      () => db().dashboard.stats(), 'dashboardStatsProjects'
    ).then(r => r.match(
      data => {
        const map: Record<number, number> = {}
        for (const { project_id, count } of (data.page_counts ?? [])) {
          map[project_id] = count
        }
        setPageCounts(map)
      },
      _e => {},
    ))
  }, [])

  const active = projects.filter(p => p.status === 'active').slice(0, 6)

  return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
        color: ink2, textTransform: 'uppercase', marginBottom: 10 }}>
        ✦ Projetos Ativos
      </div>

      {active.length === 0 ? (
        <p style={{ fontSize: 11, color: ink2, fontStyle: 'italic' }}>Nenhum projeto ativo.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {active.map(p => {
            const color = p.color ?? '#8B7355'
            const count = pageCounts[p.id] ?? 0
            return (
              <button key={p.id} onClick={() => onProjectOpen(p.id)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', border: `1px solid ${border}`,
                borderLeft: `3px solid ${color}`, borderRadius: 2,
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                transition: 'background 100ms',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = dark ? 'rgba(232,223,200,0.05)' : 'rgba(44,36,22,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>
                  {p.icon ?? PROJECT_TYPE_ICONS[p.project_type]}
                </span>
                <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: 13,
                  fontStyle: 'italic', color: ink,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: ink2, flexShrink: 0 }}>
                  {count} {count === 1 ? 'pág' : 'págs'}
                </span>
              </button>
            )
          })}
          {projects.filter(p => p.status === 'active').length > 6 && (
            <p style={{ fontSize: 10, color: ink2, fontStyle: 'italic', textAlign: 'right' }}>
              +{projects.filter(p => p.status === 'active').length - 6} mais
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Widget: Atividade Recente ─────────────────────────────────────────────────

function RecentWidget({ dark, onPageOpen }: { dark: boolean; onPageOpen: (projectId: number, pageId: number) => void }) {
  const [pages, setPages] = useState<any[]>([])

  useEffect(() => {
    fromIpc<any[]>(() => db().pages.listRecent(8), 'listRecent')
      .then(r => r.match(data => setPages(data), _e => {}))
  }, [])

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
        color: ink2, textTransform: 'uppercase', marginBottom: 10 }}>
        ⊛ Atividade Recente
      </div>

      {pages.length === 0 ? (
        <p style={{ fontSize: 11, color: ink2, fontStyle: 'italic' }}>Nenhuma atividade ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {pages.map((p, i) => (
            <button key={p.id} onClick={() => onPageOpen(p.project_id, p.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 4px', background: 'transparent', border: 'none',
              borderBottom: i < pages.length - 1 ? `1px solid ${border}` : 'none',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'background 100ms',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = dark ? 'rgba(232,223,200,0.05)' : 'rgba(44,36,22,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 13, flexShrink: 0 }}>{p.icon ?? '◦'}</span>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 12, color: ink, fontFamily: 'var(--font-display)',
                  fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden',
                  textOverflow: 'ellipsis' }}>
                  {p.title}
                </div>
                <div style={{ fontSize: 10, color: ink2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.project_name}
                </div>
              </div>
              <span style={{ fontSize: 10, color: ink2, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                {timeAgo(p.updated_at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Widget: Prazos Próximos ───────────────────────────────────────────────────

function PrazosWidget({ dark, onPageOpen }: { dark: boolean; onPageOpen: (projectId: number, pageId: number) => void }) {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    fromIpc<any[]>(() => db().pages.listUpcoming(14), 'listUpcoming')
      .then(r => r.match(data => setItems(data), _e => {}))
  }, [])

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'
  const ribbon = dark ? '#C45A40' : '#8B3A2A'

  return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
        color: ink2, textTransform: 'uppercase', marginBottom: 10 }}>
        ⚑ Prazos Próximos
      </div>

      {items.length === 0 ? (
        <p style={{ fontSize: 11, color: ink2, fontStyle: 'italic' }}>
          Nenhum prazo nos próximos 14 dias.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {items.map((item, i) => {
            const color      = item.project_color ?? '#8B7355'
            const dateLabel  = formatUpcomingDate(item.value_date)
            const isUrgent   = dateLabel === 'hoje' || dateLabel === 'amanhã'
            return (
              <button key={`${item.id}_${i}`} onClick={() => onPageOpen(item.project_id, item.id)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 8px', border: `1px solid ${border}`,
                borderLeft: `3px solid ${isUrgent ? ribbon : color}`,
                borderRadius: 2, background: 'transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'background 100ms',
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
                  <div style={{ fontSize: 10, color: ink2 }}>
                    {item.project_name} · {item.prop_name}
                  </div>
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, flexShrink: 0,
                  color: isUrgent ? ribbon : ink2,
                  fontWeight: isUrgent ? 'bold' : 'normal',
                }}>
                  {dateLabel}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Widget: Cosmos (Lua + Próximo Sabá) ───────────────────────────────────────

function CosmosWidget({ dark }: { dark: boolean }) {
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  const moon   = getMoonPhase()
  const sabbat = getNextSabbat()

  return (
    <div className="card" style={{
      background: cardBg, borderColor: border,
      position: 'relative', overflow: 'hidden',
    }}>
      <CosmosLayer width={260} height={120} seed="dash_cosmos" density="medium" dark={dark}
        style={{ opacity: 0.4 }} />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 20 }}>
        {/* Lua */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
            color: ink2, textTransform: 'uppercase', marginBottom: 8 }}>
            ☽ Fase da Lua
          </div>
          <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 4 }}>{moon.emoji}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13,
            fontStyle: 'italic', color: ink }}>{moon.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
            color: accent, marginTop: 2 }}>{moon.pct}% do ciclo</div>
        </div>

        {/* Divisor */}
        <div style={{ width: 1, background: border, flexShrink: 0 }} />

        {/* Próximo Sabá */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
            color: ink2, textTransform: 'uppercase', marginBottom: 8 }}>
            ✦ Próximo Sabá
          </div>
          <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 4 }}>{sabbat.symbol}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13,
            fontStyle: 'italic', color: ink }}>{sabbat.ptName}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
            color: accent, marginTop: 2 }}>
            {sabbat.days === 0 ? 'hoje' : sabbat.days === 1 ? 'amanhã' : `em ${sabbat.days} dias`}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export const DashboardView: React.FC<Props> = ({ dark, onProjectOpen, onPageOpen }) => {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 40px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        maxWidth: 1100,
      }}>
        <WelcomeWidget  dark={dark} />
        <StatsWidget    dark={dark} />
        <ProjectsWidget dark={dark} onProjectOpen={onProjectOpen} />
        <RecentWidget   dark={dark} onPageOpen={onPageOpen} />
        <PrazosWidget   dark={dark} onPageOpen={onPageOpen} />
        <CosmosWidget   dark={dark} />
      </div>
    </div>
  )
}
