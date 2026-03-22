import React, { useState, useEffect, useCallback } from 'react'
import { fromIpc } from '../../types/errors'

const db = () => (window as any).db

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAY_NAMES   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function pad(n: number) { return String(n).padStart(2, '0') }

interface CalPage {
  id:            number
  title:         string
  icon:          string | null
  project_id:    number
  value_date:    string
  prop_name:     string
  project_name:  string
  project_color: string | null
  project_icon:  string | null
}

interface Props {
  dark:       boolean
  onPageOpen: (projectId: number, pageId: number) => void
}

export function GlobalCalendarView({ dark, onPageOpen }: Props) {
  const [year,    setYear]    = useState(new Date().getFullYear())
  const [month,   setMonth]   = useState(new Date().getMonth())
  const [entries, setEntries] = useState<CalPage[]>([])

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const bg     = dark ? '#1A1610' : '#F5F0E8'

  const load = useCallback(() => {
    fromIpc<CalPage[]>(() => db().calendar.pagesForMonth(year, month), 'calendarPagesForMonth')
      .then(r => r.match(data => setEntries(data), _e => {}))
  }, [year, month])

  useEffect(() => { load() }, [load])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // Agrupar por data
  const byDate: Record<string, CalPage[]> = {}
  entries.forEach(e => {
    const key = e.value_date.slice(0, 10)
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(e)
  })

  // Grid de 42 células
  const firstWeekday  = new Date(year, month, 1).getDay()
  const daysInMonth   = new Date(year, month + 1, 0).getDate()
  const daysInPrevMon = new Date(year, month, 0).getDate()
  const todayStr      = new Date().toISOString().slice(0, 10)

  const cells: { dateStr: string; day: number; current: boolean }[] = []
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = daysInPrevMon - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    cells.push({ dateStr: `${y}-${pad(m + 1)}-${pad(d)}`, day: d, current: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ dateStr: `${year}-${pad(month + 1)}-${pad(d)}`, day: d, current: true })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    cells.push({ dateStr: `${y}-${pad(m + 1)}-${pad(d)}`, day: d, current: false })
  }

  // Legenda de projetos (só os que têm eventos este mês)
  const projectsThisMonth = Array.from(
    new Map(entries.map(e => [e.project_id, { id: e.project_id, name: e.project_name, color: e.project_color, icon: e.project_icon }]))
    .values()
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Navegação */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderBottom: `1px solid ${border}`, flexShrink: 0,
        background: bg,
      }}>
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}
          style={{ color: ink2, fontSize: 16 }}>‹</button>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: 18, fontStyle: 'italic',
          color: ink, flex: 1, textAlign: 'center', fontWeight: 'normal', margin: 0,
        }}>
          {MONTH_NAMES[month]} {year}
        </h3>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}
          style={{ color: ink2, fontSize: 16 }}>›</button>
        <button className="btn btn-ghost btn-sm"
          onClick={() => { setMonth(new Date().getMonth()); setYear(new Date().getFullYear()) }}
          style={{ color: ink2, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
          hoje
        </button>

        {/* Legenda */}
        {projectsThisMonth.length > 0 && (
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
            borderLeft: `1px solid ${border}`, paddingLeft: 12, marginLeft: 4,
            flexWrap: 'wrap',
          }}>
            {projectsThisMonth.map(p => (
              <span key={p.id} style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em',
                color: p.color ?? ink2,
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <span style={{
                  display: 'inline-block', width: 6, height: 6,
                  borderRadius: '50%', background: p.color ?? ink2,
                }} />
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Cabeçalho dos dias */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        borderBottom: `1px solid ${border}`, flexShrink: 0, background: bg,
      }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{
            padding: '5px 8px', textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 9,
            letterSpacing: '0.1em', color: ink2,
          }}>{d}</div>
        ))}
      </div>

      {/* Grid do calendário */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridAutoRows: 'minmax(88px, 1fr)',
        flex: 1, overflow: 'auto',
      }}>
        {cells.map((cell, i) => {
          const cellEntries = byDate[cell.dateStr] ?? []
          const isToday     = cell.dateStr === todayStr
          const isSunday    = i % 7 === 0

          return (
            <div key={i} style={{
              borderRight:  `1px solid ${border}`,
              borderBottom: `1px solid ${border}`,
              padding: '4px 5px',
              background: isToday
                ? (dark ? 'rgba(212,168,32,0.07)' : 'rgba(184,134,11,0.05)')
                : 'transparent',
              opacity: cell.current ? 1 : 0.35,
              overflow: 'hidden',
            }}>
              {/* Número do dia */}
              <div style={{ marginBottom: 3 }}>
                {isToday ? (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 'bold',
                    background: accent, color: dark ? '#1A1610' : '#F5F0E8',
                    borderRadius: 2, padding: '0 4px',
                  }}>{cell.day}</span>
                ) : (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: isSunday ? (dark ? '#C45A40' : '#8B3A2A') : ink2,
                  }}>{cell.day}</span>
                )}
              </div>

              {/* Chips das páginas */}
              {cellEntries.slice(0, 3).map(entry => {
                const color = entry.project_color ?? '#8B7355'
                return (
                  <button key={`${entry.id}_${entry.prop_name}`}
                    onClick={() => onPageOpen(entry.project_id, entry.id)}
                    style={{
                      display: 'block', width: '100%',
                      background: color + '22', border: `1px solid ${color}44`,
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 2, padding: '1px 4px', marginBottom: 2,
                      cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 9,
                      color: ink, textAlign: 'left',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      transition: 'background 80ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = color + '44')}
                    onMouseLeave={e => (e.currentTarget.style.background = color + '22')}
                    title={`${entry.title} · ${entry.project_name} · ${entry.prop_name}`}
                  >
                    {entry.icon ?? '◦'} {entry.title}
                  </button>
                )
              })}
              {cellEntries.length > 3 && (
                <div style={{
                  fontSize: 9, color: ink2, fontFamily: 'var(--font-mono)',
                  padding: '0 3px',
                }}>
                  +{cellEntries.length - 3} mais
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
