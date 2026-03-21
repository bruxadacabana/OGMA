import React, { useEffect, useState, useCallback } from 'react'
import { CosmosLayer } from '../../components/Cosmos/CosmosLayer'
import { useAppStore } from '../../store/useAppStore'
import { Project, PROJECT_TYPE_LABELS, PROJECT_TYPE_ICONS } from '../../types'

interface Props {
  dark:          boolean
  onProjectOpen: (id: number) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function formatDateLong(): string {
  const now   = new Date()
  const dias  = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira',
                  'Quinta-feira','Sexta-feira','Sábado']
  const meses = ['janeiro','fevereiro','março','abril','maio','junho',
                  'julho','agosto','setembro','outubro','novembro','dezembro']
  return `${dias[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`
}

function timeAgo(iso: string): string {
  try {
    const ms   = Date.now() - new Date(iso).getTime()
    const min  = Math.floor(ms / 60000)
    const h    = Math.floor(min / 60)
    const d    = Math.floor(h / 24)
    if (d > 0)  return `há ${d} dia${d > 1 ? 's' : ''}`
    if (h > 0)  return `há ${h}h`
    if (min > 0) return `há ${min}min`
    return 'agora'
  } catch { return '' }
}

// ── Widget de Boas-vindas ─────────────────────────────────────────────────────

function WelcomeWidget({ dark }: { dark: boolean }) {
  const [time, setTime] = useState(formatTime())
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  const greetings = [
    'A lua e os astros aguardam sua jornada.',
    'O conhecimento é a mais antiga das magias.',
    'Cada projeto é um cosmos por explorar.',
    'Que as páginas em branco se encham de descobertas.',
  ]
  const ctx = greetings[new Date().getDate() % greetings.length]

  const hour    = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  useEffect(() => {
    const t = setInterval(() => setTime(formatTime()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="card" style={{
      background: cardBg, borderColor: border,
      position: 'relative', overflow: 'hidden', minHeight: 110,
      gridColumn: '1 / -1',
    }}>
      <CosmosLayer width={600} height={110} seed="dash_welcome"
        density="low" dark={dark}
        style={{ opacity: 0.45, left: 'auto', right: 0, width: 300 }} />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 26,
          fontStyle: 'italic', color: ink, fontWeight: 'normal', marginBottom: 4,
        }}>
          {greeting}, Viajante
        </h1>
        <p style={{ fontSize: 12, color: ink2, fontStyle: 'italic', marginBottom: 10 }}>{ctx}</p>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: accent, letterSpacing: '0.08em',
        }}>
          {formatDateLong()}  ·  {time}
        </p>
      </div>
    </div>
  )
}

// ── Widget de Projetos ────────────────────────────────────────────────────────

function ProjectsWidget({ dark, onProjectOpen }: {
  dark: boolean; onProjectOpen: (id: number) => void
}) {
  const projects = useAppStore(s => s.projects)
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  const active = projects.filter(p => p.status === 'active').slice(0, 4)

  return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        letterSpacing: '0.2em', color: ink2,
        textTransform: 'uppercase', marginBottom: 10,
      }}>
        ✦ Projetos Ativos
      </div>

      {active.length === 0 ? (
        <p style={{ fontSize: 11, color: ink2, fontStyle: 'italic' }}>
          Nenhum projeto ativo.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {active.map(p => {
            const color = p.color ?? '#8B7355'
            return (
              <button key={p.id} onClick={() => onProjectOpen(p.id)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', border: `1px solid ${border}`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 2, background: 'transparent',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 120ms',
              }}>
                <span style={{ fontSize: 16 }}>{p.icon ?? PROJECT_TYPE_ICONS[p.project_type]}</span>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 13,
                    fontStyle: 'italic', color: ink,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 10, color: ink2 }}>
                    {PROJECT_TYPE_LABELS[p.project_type]}
                  </div>
                </div>
                <div style={{ width: 40, height: 4, background: border, borderRadius: 2 }}>
                  <div style={{ background: color, width: '0%', height: '100%', borderRadius: 2 }} />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Widget de Atividade Recente ───────────────────────────────────────────────

function RecentWidget({ dark }: { dark: boolean }) {
  const pages    = useAppStore(s => s.pages)
  const projects = useAppStore(s => s.projects)
  const ink2     = dark ? '#8A7A62' : '#9C8E7A'
  const border   = dark ? '#3A3020' : '#C4B9A8'
  const cardBg   = dark ? '#211D16' : '#EDE7D9'
  const ink      = dark ? '#E8DFC8' : '#2C2416'

  // Pegar todas as páginas de todos os projetos carregados, ordenadas por updated_at
  const allPages = pages
    .slice()
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  return (
    <div className="card" style={{ background: cardBg, borderColor: border }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        letterSpacing: '0.2em', color: ink2,
        textTransform: 'uppercase', marginBottom: 10,
      }}>
        ⊛ Atividade Recente
      </div>

      {allPages.length === 0 ? (
        <p style={{ fontSize: 11, color: ink2, fontStyle: 'italic' }}>
          Nenhuma atividade ainda.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {allPages.map(p => {
            const proj = projects.find(pr => pr.id === p.project_id)
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 0',
                borderBottom: `1px solid ${border}`,
              }}>
                <span style={{ fontSize: 14 }}>{p.icon ?? '📄'}</span>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontSize: 12, color: ink,
                    fontFamily: 'var(--font-display)', fontStyle: 'italic',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{p.title}</div>
                  {proj && (
                    <div style={{ fontSize: 10, color: ink2 }}>{proj.name}</div>
                  )}
                </div>
                <span style={{ fontSize: 10, color: ink2, flexShrink: 0 }}>
                  {timeAgo(p.updated_at)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Widget placeholder ────────────────────────────────────────────────────────

function PlaceholderWidget({ icon, title, phase, dark }: {
  icon: string; title: string; phase: number; dark: boolean
}) {
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  return (
    <div className="card" style={{ background: cardBg, borderColor: border, position: 'relative', overflow: 'hidden' }}>
      <CosmosLayer width={200} height={100} seed={`dash_${title}`}
        density="low" dark={dark} style={{ opacity: 0.35 }} />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          letterSpacing: '0.2em', color: ink2,
          textTransform: 'uppercase', marginBottom: 6,
        }}>
          {icon} {title}
        </div>
        <p style={{ fontSize: 11, color: ink2, fontStyle: 'italic' }}>
          Implementado na Fase {phase}
        </p>
      </div>
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export const DashboardView: React.FC<Props> = ({ dark, onProjectOpen }) => {
  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: '28px 32px 40px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        maxWidth: 1100,
      }}>
        {/* Boas-vindas — ocupa linha inteira */}
        <WelcomeWidget dark={dark} />

        {/* Projetos ativos */}
        <ProjectsWidget dark={dark} onProjectOpen={onProjectOpen} />

        {/* Atividade recente */}
        <RecentWidget dark={dark} />

        {/* Placeholders para fases futuras */}
        <PlaceholderWidget icon="☽" title="Fase da Lua"     phase={9} dark={dark} />
        <PlaceholderWidget icon="✦" title="Próximo Sabá"    phase={9} dark={dark} />
        <PlaceholderWidget icon="◉" title="Hábitos do Dia"  phase={9} dark={dark} />
        <PlaceholderWidget icon="📖" title="Leituras"        phase={7} dark={dark} />
        <PlaceholderWidget icon="⚑" title="Prazos e Tarefas" phase={8} dark={dark} />
        <PlaceholderWidget icon="📅" title="Próximos Eventos" phase={6} dark={dark} />
      </div>
    </div>
  )
}
