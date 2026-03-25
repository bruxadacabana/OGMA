import React, { useCallback, useEffect, useRef, useState } from 'react'
import { fromIpc } from '../../types/errors'
import { useAppStore } from '../../store/useAppStore'
import { CosmosLayer } from '../../components/Cosmos/CosmosLayer'
import './GlobalPlannerView.css'

const db = () => (window as any).db

// ── Tipos e Constantes ────────────────────────────────────────────────────────
interface GlobalTask {
  id: number; project_id: number; page_id: number | null; title: string; task_type: string;
  due_date: string; estimated_hours: number; status: string; done_hours: number;
  project_name?: string; project_color?: string; project_icon?: string;
  page_title?: string; page_icon?: string;
}

interface AgendaBlock {
  id: number; task_id: number; date: string; planned_hours: number; logged_hours: number;
  status: string; task_title: string; task_type: string; due_date: string; estimated_hours: number;
  project_name: string; project_color: string; project_icon: string;
  page_title?: string; page_icon?: string;
}

const TASK_TYPES = ['atividade','aula','prova','trabalho','seminario','defesa','prazo','reuniao','leitura','outro']
const TYPE_LABELS: Record<string, string> = { atividade:'Atividade', aula:'Aula', prova:'Prova', trabalho:'Trabalho', seminario:'Seminário', defesa:'Defesa', prazo:'Prazo', reuniao:'Reunião', leitura:'Leitura', outro:'Outro' }
const TYPE_ICONS: Record<string, string> = { aula: '📚', atividade: '📋', prova: '📝', leitura: '📖', trabalho: '📋', seminario: '🎙', defesa: '🎓', prazo: '⏰', reuniao: '👥', outro: '◦' }
const STATUS_SYMBOL: Record<string, string> = { pending: '•', in_progress: '○', completed: '×', overdue: '!' }
const STATUS_LABEL: Record<string, string> = { pending: 'Pendente', in_progress: 'Em progresso', completed: 'Concluída', overdue: 'Atrasada' }

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(dateStr + 'T12:00:00'); d.setHours(0,0,0,0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}
function fmtDate(iso: string) { return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) }

// ── Mini calendário ───────────────────────────────────────────────────────────
function MiniCalendar({ tasksWithDates, filterDate, onFilterDate, dark }: { tasksWithDates: Set<string>; filterDate: string | null; onFilterDate: (d: string | null) => void; dark: boolean }) {
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() } })
  const today = new Date().toISOString().slice(0, 10)
  const ink = dark ? '#E8DFC8' : '#2C2416', ink2 = dark ? '#8A7A62' : '#9C8E7A', accent = dark ? '#D4A820' : '#b8860b'
  const firstDay = new Date(cursor.year, cursor.month, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const cells: (number | null)[] = [ ...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1) ]
  while (cells.length % 7 !== 0) cells.push(null)
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const isoOf = (d: number) => `${cursor.year}-${String(cursor.month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  return (
    <div className="bj-mini-cal">
      <div className="bj-mini-cal-header">
        <button className="bj-cal-nav" onClick={() => setCursor(c => { const d = new Date(c.year, c.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })}>‹</button>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.12em', color: ink, textTransform:'uppercase' }}>{monthLabel}</span>
        <button className="bj-cal-nav" onClick={() => setCursor(c => { const d = new Date(c.year, c.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })}>›</button>
      </div>
      <div className="bj-mini-cal-grid">
        {['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i} style={{ fontFamily:'var(--font-mono)', fontSize:9, color:ink2, textAlign:'center' }}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const iso = isoOf(day), isToday = iso === today, selected = iso === filterDate, hasTasks = tasksWithDates.has(iso)
          return (
            <button key={i} className={`bj-cal-day${isToday ? ' bj-cal-day--today' : ''}${selected ? ' bj-cal-day--selected' : ''}`}
              onClick={() => onFilterDate(selected ? null : iso)}
              style={{ color: isToday ? accent : selected ? accent : ink, background: selected ? accent + '22' : 'transparent', borderColor: isToday ? accent : 'transparent' }}>
              {day}
              {hasTasks && !isToday && <span style={{ display:'block', width:3, height:3, borderRadius:'50%', background: accent, margin:'1px auto 0', opacity:0.5 }} />}
            </button>
          )
        })}
      </div>
      {filterDate && <button className="bj-cal-clear" onClick={() => onFilterDate(null)} style={{ color: ink2 }}>limpar filtro ×</button>}
    </div>
  )
}

// ── Item de tarefa Urgente ────────────────────────────────────────────────────
function UrgentTaskItem({ task, dark, onToggleDone }: { task: GlobalTask; dark: boolean; onToggleDone: (t: GlobalTask) => void }) {
  const ink = dark ? '#E8DFC8' : '#2C2416', ink2 = dark ? '#8A7A62' : '#9C8E7A', accent = dark ? '#D4A820' : '#b8860b'
  const days = daysUntil(task.due_date), color = task.project_color ?? '#8B7355'
  const symbolColor = task.status === 'overdue' ? '#C0392B' : task.status === 'completed' ? ink2 : task.status === 'in_progress' ? accent : ink
  return (
    <div className="bj-urgent-item" style={{ opacity: task.status === 'completed' ? 0.45 : 1 }}>
      <button className="bj-bullet-btn" onClick={() => onToggleDone(task)} style={{ color: symbolColor }}>{STATUS_SYMBOL[task.status] ?? '•'}</button>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color: ink, textDecoration: task.status === 'completed' ? 'line-through' : 'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task.title}</div>
        <div style={{ display:'flex', gap:6, marginTop:2, alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: color }}>{task.project_icon ?? '◦'} {task.project_name}</span>
          {task.page_title && <><span style={{ color: ink2, fontSize: 8 }}>/</span><span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: ink }}>{task.page_icon ?? '◦'} {task.page_title}</span></>}
        </div>
      </div>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:9, flexShrink:0, color: days < 0 ? '#C0392B' : days === 0 ? accent : ink2 }}>{days < 0 ? `${Math.abs(days)}d atrás` : days === 0 ? 'hoje' : `${days}d`}</span>
    </div>
  )
}

// ── Bloco da Agenda (Direita) ─────────────────────────────────────────────────
function AgendaBlockItem({ block, dark, onStartFocus }: { block: AgendaBlock; dark: boolean; onStartFocus: (b: AgendaBlock) => void }) {
  const ink = dark ? '#E8DFC8' : '#2C2416', ink2 = dark ? '#8A7A62' : '#9C8E7A', accent = dark ? '#D4A820' : '#b8860b'
  const color = block.project_color ?? '#8B7355'
  const pct = block.planned_hours > 0 ? Math.min(1, (block.logged_hours || 0) / block.planned_hours) : 0

  return (
    <div className="bj-block-item">
      <div style={{ width:3, alignSelf:'stretch', borderRadius:2, background: color, flexShrink:0 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color: ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{block.task_title}</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: ink2, flexShrink:0, marginLeft:6 }}>{block.planned_hours}h</span>
        </div>
        <div style={{ marginTop:4, height:2, background: dark ? '#2A2418' : '#D8D0C0', borderRadius:1 }}>
          <div style={{ width:`${pct*100}%`, height:'100%', background: color, borderRadius:1, transition:'width 0.3s' }} />
        </div>
        <div style={{ display:'flex', gap:8, marginTop:4, alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: color }}>{block.project_icon} {block.project_name}</span>
          {block.page_title && <><span style={{ color: ink2, fontSize: 8 }}>/</span><span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: ink }}>{block.page_icon ?? '◦'} {block.page_title}</span></>}
          <span style={{ flex:1 }} />
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: ink2 }}>{block.logged_hours > 0 ? `${block.logged_hours}h reg.` : ''}</span>
          <button className="btn btn-sm" style={{ borderColor: accent, color: accent, fontSize:9, padding:'2px 8px' }} onClick={() => onStartFocus(block)}>▶ Focar</button>
        </div>
      </div>
    </div>
  )
}

// ── Widget Pomodoro / Foco (Esquerda) ─────────────────────────────────────────
function PomodoroWidget({ dark, block, onLogWork, onClear }: { dark: boolean; block: AgendaBlock | null; onLogWork: (h: number, s?: string, e?: string) => void; onClear: () => void }) {
  const ink = dark ? '#E8DFC8' : '#2C2416', ink2 = dark ? '#8A7A62' : '#9C8E7A', accent = dark ? '#D4A820' : '#b8860b', cardBg = dark ? '#1E1A12' : '#EAE4D8', border = dark ? '#3A3020' : '#C4B9A8'
  const [mode, setMode] = useState<'timer'|'manual'>('timer')
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  
  // Manual state
  const [mStart, setMStart] = useState('')
  const [mEnd, setMEnd] = useState('')
  const [mHours, setMHours] = useState('1.0')

  // Auto-calcular horas no modo manual
  useEffect(() => {
    if (mStart && mEnd) {
      const [sh, sm] = mStart.split(':').map(Number); const [eh, em] = mEnd.split(':').map(Number)
      let diff = (eh * 60 + em) - (sh * 60 + sm)
      if (diff < 0) diff += 24 * 60
      setMHours((diff / 60).toFixed(2))
    }
  }, [mStart, mEnd])

  // Lógica do Timer
  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) interval = setInterval(() => setTimeLeft(t => t - 1), 1000)
    else if (timeLeft === 0 && isRunning) {
      setIsRunning(false); onLogWork(25 / 60); setTimeLeft(25 * 60) // Registra 25 min e reseta
    }
    return () => clearInterval(interval)
  }, [isRunning, timeLeft, onLogWork])

  const toggleTimer = () => setIsRunning(!isRunning)
  const resetTimer = () => { setIsRunning(false); setTimeLeft(25 * 60) }
  
  const submitManual = () => {
    const h = parseFloat(mHours)
    if (!isNaN(h) && h > 0) {
      const sDate = mStart ? `${new Date().toISOString().slice(0,10)}T${mStart}:00` : undefined
      const eDate = mEnd ? `${new Date().toISOString().slice(0,10)}T${mEnd}:00` : undefined
      onLogWork(h, sDate, eDate)
      setMStart(''); setMEnd(''); setMHours('1.0')
    }
  }

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0')
  const secs = (timeLeft % 60).toString().padStart(2, '0')
  const progress = 1 - (timeLeft / (25 * 60))

  return (
    <div className="bj-section" style={{ background: cardBg, borderColor: border, padding: 16, borderRadius: 8, borderWidth: 1, borderStyle: 'solid' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 16 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color: accent, letterSpacing:'0.12em' }}>◈ FOCO ATUAL</div>
        {block && <button onClick={onClear} style={{ background:'transparent', border:'none', color:ink2, cursor:'pointer', fontSize:14 }}>×</button>}
      </div>

      {!block ? (
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color: ink2, fontStyle:'italic', textAlign:'center', padding:'20px 0' }}>Selecione "▶ Focar" na Agenda.</div>
      ) : (
        <>
          <div style={{ textAlign:'center', marginBottom: 16 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color: block.project_color ?? ink }}>{block.project_icon} {block.project_name}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:16, color: ink, marginTop:4, fontStyle:'italic' }}>{block.task_title}</div>
          </div>

          <div style={{ display:'flex', gap:0, marginBottom:16, borderBottom:`1px solid ${border}` }}>
            <button style={{ flex:1, padding:'6px 0', fontSize:9, fontFamily:'var(--font-mono)', background:'transparent', border:'none', borderBottom: mode==='timer'?`2px solid ${accent}`:'2px solid transparent', color: mode==='timer'?accent:ink2 }} onClick={() => setMode('timer')}>TIMER</button>
            <button style={{ flex:1, padding:'6px 0', fontSize:9, fontFamily:'var(--font-mono)', background:'transparent', border:'none', borderBottom: mode==='manual'?`2px solid ${accent}`:'2px solid transparent', color: mode==='manual'?accent:ink2 }} onClick={() => setMode('manual')}>MANUAL</button>
          </div>

          {mode === 'timer' ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ position:'relative', width:120, height:120, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                <svg width="120" height="120" style={{ position:'absolute', top:0, left:0, transform:'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="54" fill="none" stroke={border} strokeWidth="4" />
                  <circle cx="60" cy="60" r="54" fill="none" stroke={accent} strokeWidth="4" strokeDasharray={339.29} strokeDashoffset={339.29 * progress} style={{ transition: 'stroke-dashoffset 1s linear' }} />
                </svg>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:28, color: ink }}>{mins}:{secs}</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-sm" style={{ borderColor: accent, color: accent, width: 80 }} onClick={toggleTimer}>{isRunning ? 'Pausar' : 'Iniciar'}</button>
                <button className="btn btn-ghost btn-sm" style={{ color: ink2 }} onClick={resetTimer}>Reset</button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ flex:1 }}><label style={{ display:'block', fontSize:9, color:ink2, marginBottom:2 }}>INÍCIO</label><input type="time" className="settings-input" style={{ width:'100%', fontSize:11 }} value={mStart} onChange={e=>setMStart(e.target.value)} /></div>
                <div style={{ flex:1 }}><label style={{ display:'block', fontSize:9, color:ink2, marginBottom:2 }}>FIM</label><input type="time" className="settings-input" style={{ width:'100%', fontSize:11 }} value={mEnd} onChange={e=>setMEnd(e.target.value)} /></div>
              </div>
              <div><label style={{ display:'block', fontSize:9, color:ink2, marginBottom:2 }}>TOTAL (HORAS)</label><input type="number" step="0.25" className="settings-input" style={{ width:'100%', fontSize:11 }} value={mHours} onChange={e=>setMHours(e.target.value)} /></div>
              <button className="btn btn-sm" style={{ borderColor: accent, color: accent, width:'100%', marginTop:8 }} onClick={submitManual}>Registar Foco</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}


// ── Item de tarefa (Lista Completa) ───────────────────────────────────────────
function TaskRow({ task, dark, expanded, onExpand, projects }: { task: GlobalTask; dark: boolean; expanded: boolean; onExpand: () => void; projects: any[] }) {
  const ink = dark ? '#E8DFC8' : '#2C2416', ink2 = dark ? '#8A7A62' : '#9C8E7A', accent = dark ? '#D4A820' : '#b8860b', border = dark ? '#3A3020' : '#C4B9A8', color = task.project_color ?? '#8B7355'
  const days = daysUntil(task.due_date), symbolColor = task.status === 'overdue' ? '#C0392B' : task.status === 'completed' ? ink2 : task.status === 'in_progress' ? accent : ink
  return (
    <div className={`bj-task-row${expanded ? ' bj-task-row--expanded' : ''}`} style={{ borderColor: expanded ? color + '66' : border }}>
      <div className="bj-task-main" onClick={onExpand}>
        <span className="bj-bullet" style={{ color: symbolColor }}>{STATUS_SYMBOL[task.status] ?? '•'}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color: ink, textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>{task.title}</span>
          <div style={{ display:'flex', gap:6, marginTop:2, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color, letterSpacing:'0.04em' }}>{task.project_icon ?? '◦'} {task.project_name}</span>
            {task.page_title && <><span style={{ color: ink2, fontSize: 8 }}>/</span><span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: ink, letterSpacing:'0.04em' }}>{task.page_icon ?? '◦'} {task.page_title}</span></>}
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: ink2, marginLeft: 'auto' }}>{TYPE_LABELS[task.task_type] ?? task.task_type}</span>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, flexShrink:0 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: days < 0 ? '#C0392B' : days === 0 ? accent : days <= 3 ? '#C07020' : ink2 }}>{fmtDate(task.due_date)}</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: ink2 }}>{(task.done_hours ?? 0).toFixed(1)}/{task.estimated_hours}h</span>
        </div>
      </div>
    </div>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────
interface Props { dark: boolean; onProjectOpen: (id: number) => void }

export function GlobalPlannerView({ dark, onProjectOpen }: Props) {
  const { projects, pushToast } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)

  // Dados
  const [tasks, setTasks] = useState<GlobalTask[]>([])
  const [agendaBlocks, setAgendaBlocks] = useState<AgendaBlock[]>([])
  const [loading, setLoading] = useState(true)

  // Layout & Tabs
  const [rightTab, setRightTab] = useState<'tasks' | 'agenda'>('agenda')
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<'date' | 'project'>('date')
  const [showCompleted, setShowCompleted] = useState(false)
  const [daysToShow, setDaysToShow] = useState<1 | 2 | 3>(3)
  
  // Pomodoro
  const [activeFocus, setActiveFocus] = useState<AgendaBlock | null>(null)

  const ink2 = dark ? '#8A7A62' : '#9C8E7A', accent = dark ? '#D4A820' : '#b8860b', border = dark ? '#3A3020' : '#C4B9A8'

  useEffect(() => {
    const el = containerRef.current; if (!el) return
    const obs = new ResizeObserver(entries => { for (const e of entries) setNarrow(e.contentRect.width < 860) })
    obs.observe(el); return () => obs.disconnect()
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    
    // 1. Calcula os dias que vamos buscar no banco de dados
    const baseDate = filterDate || new Date().toISOString().slice(0, 10);
    const datesToFetch = Array.from({ length: daysToShow }).map((_, i) => {
      const d = new Date(baseDate + 'T12:00:00');
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });

    // 2. Prepara as requisições (1 para as tarefas gerais, várias para os dias da agenda)
    const tasksPromise = fromIpc<GlobalTask[]>(() => db().planner.listAllTasks({ include_completed: showCompleted }), 'listAllTasks');
    const blocksPromises = datesToFetch.map(d => fromIpc<AgendaBlock[]>(() => db().planner.todayBlocks(d), 'todayBlocks'));

    // 3. Dispara tudo ao mesmo tempo no banco de dados
    const [tasksRes, ...blocksResArray] = await Promise.all([tasksPromise, ...blocksPromises]);
    
    // 4. Salva as tarefas
    tasksRes.match(d => setTasks(d), () => {})
    
    // 5. Junta os blocos de todos os dias num único array
    const allBlocks: AgendaBlock[] = [];
    for (const res of blocksResArray) {
      res.match(d => allBlocks.push(...d), () => {});
    }
    
    setAgendaBlocks(allBlocks);
    if(activeFocus && !allBlocks.find(b=>b.id===activeFocus.id)) setActiveFocus(null);
    
    setLoading(false)
  }, [showCompleted, filterDate, daysToShow]) // daysToShow adicionado aqui nas dependências!

  useEffect(() => { loadData() }, [loadData])

  // Lógica do Log Manual do Pomodoro
  const handleLogWork = async (hours: number, startTime?: string, endTime?: string) => {
    if (!activeFocus) return
    const res = await fromIpc(() => db().planner.logWork({ block_id: activeFocus.id, task_id: activeFocus.task_id, hours, start_time: startTime, end_time: endTime }), 'logWork')
    if (res.isOk()) { pushToast({ kind:'success', title:`+${hours.toFixed(2)}h registadas!` }); loadData() }
    else pushToast({ kind:'error', title:'Erro ao registar tempo.' })
  }

  const taskDates = new Set(tasks.map(t => t.due_date))
  const today3 = new Date(); today3.setDate(today3.getDate() + 2)
  const urgentTasks = tasks.filter(t => t.status !== 'completed' && new Date(t.due_date + 'T12:00:00') <= today3)

  const filteredTasks = tasks
  const groupedTasks = (() => {
    if (groupBy === 'project') {
      const map = new Map<number, GlobalTask[]>()
      for (const t of filteredTasks) { if (!map.has(t.project_id)) map.set(t.project_id, []); map.get(t.project_id)!.push(t) }
      return Array.from(map.entries()).map(([pid, ts]) => ({ key: String(pid), label: ts[0]?.project_name ?? `Projeto`, color: ts[0]?.project_color, tasks: ts }))
    } else {
      const map = new Map<string, GlobalTask[]>()
      for (const t of filteredTasks) { if (!map.has(t.due_date)) map.set(t.due_date, []); map.get(t.due_date)!.push(t) }
      // ↓ A linha abaixo foi atualizada para incluir "color: undefined" ↓
      return Array.from(map.entries()).map(([date, ts]) => ({ key: date, label: fmtDate(date), color: undefined, tasks: ts }))
    }
  })()

  const handleToggleDone = async (task: GlobalTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    const r = await fromIpc(() => db().planner.updateTask({ id: task.id, status: newStatus }), 'updateTaskStatus')
    if (r.isOk()) setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const now = new Date()
  const weekDays = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const dateLabel = `${weekDays[now.getDay()]} · ${now.getDate()} de ${monthNames[now.getMonth()]} · ${now.getFullYear()}`

  return (
    <div ref={containerRef} className="bj-root" style={{ position:'relative' }}>
      <div className="bj-dot-bg" />
      <CosmosLayer width={1400} height={900} seed="planner_global" density="low" dark={dark} style={{ position:'absolute', top:0, left:0, opacity: dark ? 0.18 : 0.08, pointerEvents:'none', zIndex:0 }} />

      <div className={`bj-columns${narrow ? ' bj-columns--narrow' : ''}`} style={{ position:'relative', zIndex:1 }}>

        {/* ── COLUNA ESQUERDA ───────────────────────────────────────────── */}
        <div className="bj-col-left">
          <div className="bj-date-header">
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.20em', color: ink2, marginBottom:4 }}>{dateLabel.toUpperCase()}</div>
            <div style={{ width:32, height:1, background: accent, marginBottom:12, opacity:0.5 }} />
          </div>

          <MiniCalendar tasksWithDates={taskDates} filterDate={filterDate} onFilterDate={setFilterDate} dark={dark} />
          <div className="bj-section-sep" style={{ borderColor: border }} />

          <div className="bj-section">
            <div className="bj-section-label" style={{ color: ink2 }}>! URGENTE · PRÓXIMOS 3 DIAS</div>
            {urgentTasks.length === 0 ? <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color: ink2, fontStyle:'italic', opacity:0.5, padding:'8px 0' }}>nenhuma tarefa urgente</div>
              : urgentTasks.map(t => <UrgentTaskItem key={t.id} task={t} dark={dark} onToggleDone={handleToggleDone} />)}
          </div>

          <div className="bj-section-sep" style={{ borderColor: border }} />
          
          {/* POMODORO COCKPIT SUBSTITUI O ANTIGO "PLANO DE HOJE" */}
          <PomodoroWidget dark={dark} block={activeFocus} onLogWork={handleLogWork} onClear={() => setActiveFocus(null)} />
        </div>

        {!narrow && <div className="bj-page-divider" style={{ borderColor: border }} />}

        {/* ── COLUNA DIREITA ────────────────────────────────────────────── */}
        <div className="bj-col-right">
          
          {/* HEADER DA DIREITA (TABS) */}
          <div className="bj-right-header" style={{ borderBottom: `1px solid ${border}`, paddingBottom: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={() => setRightTab('agenda')} style={{ background:'transparent', border:'none', fontFamily:'var(--font-mono)', fontSize:12, letterSpacing:'0.1em', cursor:'pointer', borderBottom: rightTab==='agenda'?`2px solid ${accent}`:'2px solid transparent', color: rightTab==='agenda'?accent:ink2, paddingBottom:4 }}>
                AGENDA {filterDate ? `(${fmtDate(filterDate)})` : '(HOJE)'}
              </button>
              <button onClick={() => setRightTab('tasks')} style={{ background:'transparent', border:'none', fontFamily:'var(--font-mono)', fontSize:12, letterSpacing:'0.1em', cursor:'pointer', borderBottom: rightTab==='tasks'?`2px solid ${accent}`:'2px solid transparent', color: rightTab==='tasks'?accent:ink2, paddingBottom:4 }}>
                TAREFAS ABERTAS
              </button>
            </div>
          </div>

          <div className="bj-task-list">
            {loading ? <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:ink2, padding:'32px 0', textAlign:'center', opacity:0.5 }}>A carregar…</div> : 
             
             rightTab === 'agenda' ? (
              /* MODO AGENDA */
              <>
                {/* Botões para escolher 1, 2 ou 3 dias */}
                <div style={{ display:'flex', justifyContent:'flex-end', gap:6, marginBottom: 16 }}>
                  <div className="bj-group-toggle" style={{ borderColor: border }}>
                    <button className={daysToShow === 1 ? 'active' : ''} style={{ color: daysToShow === 1 ? accent : ink2 }} onClick={() => setDaysToShow(1)}>1 dia</button>
                    <button className={daysToShow === 2 ? 'active' : ''} style={{ color: daysToShow === 2 ? accent : ink2 }} onClick={() => setDaysToShow(2)}>2 dias</button>
                    <button className={daysToShow === 3 ? 'active' : ''} style={{ color: daysToShow === 3 ? accent : ink2 }} onClick={() => setDaysToShow(3)}>3 dias</button>
                  </div>
                </div>

                {/* Renderização Agrupada com Divisores */}
                {Array.from({ length: daysToShow }).map((_, i) => {
                  // Calcula a data exata deste grupo
                  const baseRenderDate = filterDate || new Date().toISOString().slice(0, 10);
                  const d = new Date(baseRenderDate + 'T12:00:00');
                  d.setDate(d.getDate() + i);
                  const dateStr = d.toISOString().slice(0, 10);
                  
                  // Filtra apenas os blocos desta data
                  const dayBlocks = agendaBlocks.filter(b => b.date === dateStr);
                  
                  return (
                    <div key={dateStr} className="bj-group">
                      <div className="bj-group-label" style={{ color: ink2, borderColor: border }}>
                        {fmtDate(dateStr)} <span style={{ opacity:0.5, marginLeft:6, fontWeight:'normal' }}>({dayBlocks.length})</span>
                      </div>
                      
                      {dayBlocks.length === 0 ? (
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:ink2, padding:'16px 0', textAlign:'center', fontStyle:'italic', opacity:0.5 }}>
                          Sem blocos para este dia.
                        </div>
                      ) : (
                        dayBlocks.map(b => <AgendaBlockItem key={b.id} block={b} dark={dark} onStartFocus={setActiveFocus} />)
                      )}
                    </div>
                  )
                })}
              </>
             ) : (
              
              /* MODO TAREFAS (LOG COMPLETO) */
              <>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:6, marginBottom: 16 }}>
                  <button className={`bj-toggle-btn${showCompleted ? ' bj-toggle-btn--active' : ''}`} style={{ color: showCompleted ? accent : ink2, borderColor: showCompleted ? accent : border }} onClick={() => setShowCompleted(o => !o)}>× concluídas</button>
                  <div className="bj-group-toggle" style={{ borderColor: border }}>
                    <button className={groupBy === 'date' ? 'active' : ''} style={{ color: groupBy === 'date' ? accent : ink2 }} onClick={() => setGroupBy('date')}>por data</button>
                    <button className={groupBy === 'project' ? 'active' : ''} style={{ color: groupBy === 'project' ? accent : ink2 }} onClick={() => setGroupBy('project')}>por projeto</button>
                  </div>
                </div>

                {groupedTasks.map(group => (
                  <div key={group.key} className="bj-group">
                    <div className="bj-group-label" style={{ color: group.color ?? ink2, borderColor: group.color ? group.color + '44' : border }}>
                      {groupBy === 'project' && (group.color ? <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background: group.color, marginRight:6 }} /> : null)}
                      {group.label} <span style={{ opacity:0.5, marginLeft:6, fontWeight:'normal' }}>({group.tasks.length})</span>
                    </div>
                    {group.tasks.map(task => <TaskRow key={task.id} task={task} dark={dark} expanded={false} onExpand={()=>{}} projects={projects} />)}
                  </div>
                ))}
              </>
             )
            }
          </div>

        </div>
      </div>
    </div>
  )
}