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

// ── Fase da Lua (cálculo astronómico) ────────────────────────────────────────

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

// ── Widget: Cosmos (Lua) ──────────────────────────────────────────────────────

function CosmosWidget({ dark }: { dark: boolean }) {
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  const moon = getMoonPhase()

  // Lunar cycle arc (SVG)
  const arcR = 36, arcCx = 50, arcCy = 50
  const pct  = moon.pct / 100
  const endAngle = pct * 2 * Math.PI - Math.PI / 2
  const arcX = arcCx + arcR * Math.cos(endAngle)
  const arcY = arcCy + arcR * Math.sin(endAngle)
  const largeArc = pct > 0.5 ? 1 : 0

  return (
    <div className="card" style={{
      background: cardBg, borderColor: border,
      position: 'relative', overflow: 'hidden',
    }}>
      <CosmosLayer width={260} height={120} seed="dash_cosmos" density="medium" dark={dark}
        style={{ opacity: 0.4 }} />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 20, alignItems: 'center' }}>
        {/* Lua */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
            color: ink2, textTransform: 'uppercase', marginBottom: 8 }}>
            ☽ Fase da Lua
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 34, lineHeight: 1 }}>{moon.emoji}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13,
                fontStyle: 'italic', color: ink }}>{moon.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10,
                color: ink2, marginTop: 2 }}>{moon.pct}% do ciclo</div>
            </div>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ width: 1, background: border, flexShrink: 0, alignSelf: 'stretch' }} />

        {/* Arco do ciclo lunar */}
        <div style={{ flex: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <svg width={100} height={100} viewBox="0 0 100 100">
            {/* Trilha */}
            <circle cx={arcCx} cy={arcCy} r={arcR} fill="none" stroke={border} strokeWidth={6} />
            {/* Progresso */}
            {pct > 0 && pct < 1 && (
              <path
                d={`M ${arcCx} ${arcCy - arcR} A ${arcR} ${arcR} 0 ${largeArc} 1 ${arcX.toFixed(1)} ${arcY.toFixed(1)}`}
                fill="none" stroke={accent} strokeWidth={6} strokeLinecap="round"
              />
            )}
            {pct === 1 && (
              <circle cx={arcCx} cy={arcCy} r={arcR} fill="none" stroke={accent} strokeWidth={6} />
            )}
            {/* Emoji central */}
            <text x={arcCx} y={arcCy} textAnchor="middle" dominantBaseline="middle" fontSize={22}>
              {moon.emoji}
            </text>
          </svg>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
            color: accent, letterSpacing: '0.08em' }}>
            {moon.pct}%
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Widget: Roda do Ano ───────────────────────────────────────────────────────

const SABBATS = [
  { name: 'Imbolc',     symbol: '❄', day: 33  },
  { name: 'Ostara',     symbol: '🌱', day: 79  },
  { name: 'Beltane',    symbol: '🔥', day: 121 },
  { name: 'Litha',      symbol: '☀', day: 172 },
  { name: 'Lughnasadh', symbol: '🌾', day: 213 },
  { name: 'Mabon',      symbol: '🍂', day: 265 },
  { name: 'Samhain',    symbol: '🕯', day: 304 },
  { name: 'Yule',       symbol: '✦', day: 355 },
]

function WheelOfYearWidget({ dark }: { dark: boolean }) {
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'
  const ink    = dark ? '#E8DFC8' : '#2C2416'

  const cx = 100, cy = 100, rim = 78, inner = 14

  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1

  const toRad = (day: number) => (day / 365 * 360 - 90) * Math.PI / 180
  const f = (n: number) => n.toFixed(1)
  const pt = (day: number, r: number) => ({
    x: cx + r * Math.cos(toRad(day)),
    y: cy + r * Math.sin(toRad(day)),
  })

  const nextSabbat = SABBATS.find(s => s.day >= dayOfYear) ?? SABBATS[0]
  const daysLeft = nextSabbat.day - dayOfYear
  const daysUntil = daysLeft >= 0 ? daysLeft : 365 - dayOfYear + nextSabbat.day
  const daysLabel = daysUntil === 0 ? 'hoje' : daysUntil === 1 ? 'amanhã' : `em ${daysUntil} dias`

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

  return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em',
        color: ink2, textTransform: 'uppercase', marginBottom: 8 }}>
        ✦ Roda do Ano
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Roda SVG */}
        <svg width={200} height={200} viewBox="0 0 200 200" style={{ flexShrink: 0 }}>
          {/* Setores sazonais */}
          {sector(33,  121, 'rgba(107,140,74,0.22)',  'spring')}
          {sector(121, 213, 'rgba(196,137,42,0.20)',  'summer')}
          {sector(213, 304, 'rgba(140,74,26,0.20)',   'autumn')}
          {sector(304, 398, 'rgba(100,120,150,0.18)', 'winter')}

          {/* Aro externo */}
          <circle cx={cx} cy={cy} r={rim}   fill="none" stroke={border} strokeWidth={1} />
          {/* Anel interno */}
          <circle cx={cx} cy={cy} r={inner} fill={cardBg} stroke={border} strokeWidth={1} />

          {/* Raios */}
          {SABBATS.map(s => {
            const o = pt(s.day, inner), i = pt(s.day, rim)
            return <line key={s.name + 'r'} x1={f(o.x)} y1={f(o.y)} x2={f(i.x)} y2={f(i.y)}
              stroke={border} strokeWidth={0.8} />
          })}

          {/* Símbolos dos sabás */}
          {SABBATS.map(s => {
            const p = pt(s.day, 54)
            const isNext = s === nextSabbat
            return (
              <text key={s.name + 't'} x={f(p.x)} y={f(p.y)}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={isNext ? 16 : 13} opacity={isNext ? 1 : 0.55}>
                {s.symbol}
              </text>
            )
          })}

          {/* Marcador do dia atual */}
          {(() => {
            const p = pt(dayOfYear, 71)
            return <circle cx={f(p.x)} cy={f(p.y)} r={5.5}
              fill={accent} stroke={cardBg} strokeWidth={1.5} />
          })()}

          {/* Centro */}
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
            fontSize={13} fill={accent}>✦</text>
        </svg>

        {/* Legenda lateral */}
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
              <div style={{
                height: '100%',
                width: `${Math.round(dayOfYear / 365 * 100)}%`,
                background: accent, borderRadius: 2,
              }} />
            </div>

            {/* Todos os sabás */}
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {SABBATS.filter(s => s.day >= dayOfYear).slice(0, 3).map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11 }}>{s.symbol}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: s === nextSabbat ? accent : ink2 }}>
                    {s.name}
                    {s === nextSabbat && ' ←'}
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

// ── Dashboard principal ───────────────────────────────────────────────────────

type WidgetId = 'stats' | 'projects' | 'recent' | 'prazos' | 'cosmos' | 'wheel'
const DEFAULT_ORDER: WidgetId[] = ['stats', 'projects', 'recent', 'prazos', 'cosmos', 'wheel']

function loadOrder(): WidgetId[] {
  try {
    const s = localStorage.getItem('ogma_dashboard_order')
    if (s) {
      const arr = JSON.parse(s) as string[]
      const valid = arr.filter(id => DEFAULT_ORDER.includes(id as WidgetId)) as WidgetId[]
      DEFAULT_ORDER.forEach(id => { if (!valid.includes(id)) valid.push(id) })
      return valid
    }
  } catch {}
  return [...DEFAULT_ORDER]
}

export const DashboardView: React.FC<Props> = ({ dark, onProjectOpen, onPageOpen }) => {
  const [order,    setOrder]    = useState<WidgetId[]>(loadOrder)
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
    setOrder(prev => {
      localStorage.setItem('ogma_dashboard_order', JSON.stringify(prev))
      return prev
    })
    setDragging(null)
  }

  const WIDGETS: Record<WidgetId, React.ReactNode> = {
    stats:    <StatsWidget    dark={dark} />,
    projects: <ProjectsWidget dark={dark} onProjectOpen={onProjectOpen} />,
    recent:   <RecentWidget   dark={dark} onPageOpen={onPageOpen} />,
    prazos:   <PrazosWidget   dark={dark} onPageOpen={onPageOpen} />,
    cosmos:   <CosmosWidget   dark={dark} />,
    wheel:    <WheelOfYearWidget dark={dark} />,
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
          <div
            key={id}
            draggable
            onDragStart={() => handleDragStart(id)}
            onDragEnter={() => handleDragEnter(id)}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onDragEnd={() => setDragging(null)}
            style={{ opacity: dragging === id ? 0.35 : 1, transition: 'opacity 120ms', cursor: 'grab' }}
          >
            {WIDGETS[id]}
          </div>
        ))}
      </div>
    </div>
  )
}
