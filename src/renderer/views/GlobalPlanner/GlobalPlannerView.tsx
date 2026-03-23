import React, { useCallback, useEffect, useRef, useState } from 'react'
import { fromIpc } from '../../types/errors'
import { useAppStore } from '../../store/useAppStore'
import { CosmosLayer } from '../../components/Cosmos/CosmosLayer'
import './GlobalPlannerView.css'

const db = () => (window as any).db

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface GlobalTask {
  id:             number
  project_id:     number
  page_id:        number | null
  title:          string
  task_type:      string
  due_date:       string
  estimated_hours: number
  status:         string
  done_hours:     number
  page_title?:    string
  page_icon?:     string
  project_name?:  string
  project_color?: string
  project_icon?:  string
}

interface TodayBlock {
  id:             number
  task_id:        number
  date:           string
  planned_hours:  number
  logged_hours:   number
  status:         string
  task_title:     string
  task_type:      string
  due_date:       string
  estimated_hours: number
  project_name:   string
  project_color:  string
  project_icon:   string
}

// ── Constantes ────────────────────────────────────────────────────────────────

const TASK_TYPES = ['atividade','aula','prova','trabalho','seminario','defesa','prazo','reuniao','leitura','outro']
const TYPE_LABELS: Record<string, string> = {
  atividade:'Atividade', aula:'Aula', prova:'Prova', trabalho:'Trabalho',
  seminario:'Seminário', defesa:'Defesa', prazo:'Prazo', reuniao:'Reunião',
  leitura:'Leitura', outro:'Outro',
}

const STATUS_SYMBOL: Record<string, string> = {
  pending: '•', in_progress: '○', completed: '×', overdue: '!',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em progresso', completed: 'Concluída', overdue: 'Atrasada',
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const d     = new Date(dateStr + 'T12:00:00'); d.setHours(0,0,0,0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })
}

// ── Mini calendário ───────────────────────────────────────────────────────────

function MiniCalendar({
  tasksWithDates, filterDate, onFilterDate, dark,
}: {
  tasksWithDates: Set<string>
  filterDate: string | null
  onFilterDate: (d: string | null) => void
  dark: boolean
}) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }
  })
  const today = new Date().toISOString().slice(0, 10)
  const ink   = dark ? '#E8DFC8' : '#2C2416'
  const ink2  = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'

  const firstDay = new Date(cursor.year, cursor.month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null)

  const monthLabel = new Date(cursor.year, cursor.month, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const isoOf = (d: number) =>
    `${cursor.year}-${String(cursor.month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  return (
    <div className="bj-mini-cal">
      <div className="bj-mini-cal-header">
        <button className="bj-cal-nav" onClick={() =>
          setCursor(c => { const d = new Date(c.year, c.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })
        }>‹</button>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.12em', color: ink, textTransform:'uppercase' }}>
          {monthLabel}
        </span>
        <button className="bj-cal-nav" onClick={() =>
          setCursor(c => { const d = new Date(c.year, c.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })
        }>›</button>
      </div>
      <div className="bj-mini-cal-grid">
        {['D','S','T','Q','Q','S','S'].map((d,i) => (
          <div key={i} style={{ fontFamily:'var(--font-mono)', fontSize:9, color:ink2, textAlign:'center', letterSpacing:'0.08em' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const iso   = isoOf(day)
          const isToday   = iso === today
          const selected  = iso === filterDate
          const hasTasks  = tasksWithDates.has(iso)
          return (
            <button key={i}
              className={`bj-cal-day${isToday ? ' bj-cal-day--today' : ''}${selected ? ' bj-cal-day--selected' : ''}`}
              onClick={() => onFilterDate(selected ? null : iso)}
              style={{
                color: isToday ? accent : selected ? accent : ink,
                background: selected ? accent + '22' : 'transparent',
                borderColor: isToday ? accent : 'transparent',
              }}
            >
              {day}
              {hasTasks && !isToday && (
                <span style={{ display:'block', width:3, height:3, borderRadius:'50%',
                  background: accent, margin:'1px auto 0', opacity:0.5 }} />
              )}
            </button>
          )
        })}
      </div>
      {filterDate && (
        <button className="bj-cal-clear" onClick={() => onFilterDate(null)}
          style={{ color: ink2 }}>
          limpar filtro ×
        </button>
      )}
    </div>
  )
}

// ── Item de tarefa (esquerda — urgente/hoje) ──────────────────────────────────

function UrgentTaskItem({ task, dark, onToggleDone }: {
  task: GlobalTask; dark: boolean; onToggleDone: (t: GlobalTask) => void
}) {
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const days   = daysUntil(task.due_date)
  const color  = task.project_color ?? '#8B7355'

  const symbolColor = task.status === 'overdue' ? '#C0392B'
    : task.status === 'completed' ? ink2
    : task.status === 'in_progress' ? accent
    : ink

  return (
    <div className="bj-urgent-item" style={{ opacity: task.status === 'completed' ? 0.45 : 1 }}>
      <button
        className="bj-bullet-btn"
        onClick={() => onToggleDone(task)}
        title={STATUS_LABEL[task.status]}
        style={{ color: symbolColor }}
      >
        {STATUS_SYMBOL[task.status] ?? '•'}
      </button>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontFamily:'var(--font-mono)', fontSize:11, color: ink,
          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }}>
          {task.title}
        </div>
        <div style={{ display:'flex', gap:6, marginTop:2, alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9,
            color: color, letterSpacing:'0.06em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {task.project_icon ?? '◦'} {task.project_name}
          </span>
        </div>
      </div>
      <span style={{
        fontFamily:'var(--font-mono)', fontSize:9, flexShrink:0,
        color: days < 0 ? '#C0392B' : days === 0 ? accent : ink2,
      }}>
        {days < 0 ? `${Math.abs(days)}d atrás` : days === 0 ? 'hoje' : `${days}d`}
      </span>
    </div>
  )
}

// ── Bloco de trabalho (hoje) ──────────────────────────────────────────────────

function TodayBlockItem({ block, dark, onLog }: {
  block: TodayBlock; dark: boolean
  onLog: (id: number, hours: number) => void
}) {
  const [logging, setLogging] = useState(false)
  const [logVal,  setLogVal]  = useState(String(block.logged_hours || ''))
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const color  = block.project_color ?? '#8B7355'
  const pct    = block.planned_hours > 0 ? Math.min(1, (block.logged_hours || 0) / block.planned_hours) : 0

  const submit = () => {
    const v = parseFloat(logVal)
    if (!isNaN(v) && v >= 0) onLog(block.id, v)
    setLogging(false)
  }

  return (
    <div className="bj-block-item">
      <div style={{ width:3, alignSelf:'stretch', borderRadius:2, background: color, flexShrink:0 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color: ink,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
            {block.task_title}
          </span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: ink2, flexShrink:0, marginLeft:6 }}>
            {block.planned_hours}h
          </span>
        </div>
        <div style={{ marginTop:4, height:2, background: dark ? '#2A2418' : '#D8D0C0', borderRadius:1 }}>
          <div style={{ width:`${pct*100}%`, height:'100%', background: color, borderRadius:1, transition:'width 0.3s' }} />
        </div>
        <div style={{ display:'flex', gap:8, marginTop:4, alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: ink2 }}>
            {block.project_icon} {block.project_name}
          </span>
          <span style={{ flex:1 }} />
          {logging ? (
            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
              <input
                type="number" min="0" step="0.25"
                style={{ width:52, fontFamily:'var(--font-mono)', fontSize:11, padding:'1px 4px',
                  background:'transparent', border:`1px solid ${accent}`, borderRadius:2, color:ink }}
                value={logVal}
                onChange={e => setLogVal(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter') submit(); if(e.key==='Escape') setLogging(false) }}
                autoFocus
              />
              <button className="btn btn-sm" style={{ borderColor:accent, color:accent, padding:'1px 6px' }}
                onClick={submit}>✓</button>
            </div>
          ) : (
            <button className="bj-log-btn"
              style={{ color: block.logged_hours > 0 ? accent : ink2 }}
              onClick={() => { setLogVal(String(block.logged_hours||'')); setLogging(true) }}>
              {block.logged_hours > 0 ? `${block.logged_hours}h registado` : '+ registar horas'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Item de tarefa (direita — log completo) ───────────────────────────────────

function TaskRow({ task, dark, expanded, onExpand, onUpdate, onDelete, onProjectOpen, projects }: {
  task:          GlobalTask
  dark:          boolean
  expanded:      boolean
  onExpand:      () => void
  onUpdate:      (id: number, fields: Partial<GlobalTask>) => void
  onDelete:      (id: number) => void
  onProjectOpen: (id: number) => void
  projects:      { id: number; name: string; icon?: string; color?: string }[]
}) {
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#1E1A12' : '#EAE4D8'
  const color  = task.project_color ?? '#8B7355'
  const days   = daysUntil(task.due_date)

  const [blocks,    setBlocks]    = useState<any[]>([])
  const [editTitle, setEditTitle] = useState(task.title)
  const [editType,  setEditType]  = useState(task.task_type)
  const [editDate,  setEditDate]  = useState(task.due_date)
  const [editHours, setEditHours] = useState(String(task.estimated_hours))
  const [logInput,  setLogInput]  = useState<Record<number,string>>({})
  const [dirty,     setDirty]     = useState(false)

  useEffect(() => {
    if (!expanded) return
    setEditTitle(task.title); setEditType(task.task_type)
    setEditDate(task.due_date); setEditHours(String(task.estimated_hours))
    setDirty(false)
    fromIpc<any[]>(() => db().planner.listBlocks(task.id), 'listBlocks')
      .then(r => r.match(d => setBlocks(d), () => {}))
  }, [expanded, task.id])

  const symbolColor = task.status === 'overdue' ? '#C0392B'
    : task.status === 'completed' ? ink2
    : task.status === 'in_progress' ? accent
    : ink

  const save = () => {
    onUpdate(task.id, {
      title:           editTitle.trim() || task.title,
      task_type:       editType,
      due_date:        editDate,
      estimated_hours: parseFloat(editHours) || task.estimated_hours,
    })
    setDirty(false)
  }

  const logBlock = async (blockId: number) => {
    const v = parseFloat(logInput[blockId] ?? '')
    if (isNaN(v) || v < 0) return
    await fromIpc(() => db().planner.logBlock(blockId, v), 'logBlock')
    fromIpc<any[]>(() => db().planner.listBlocks(task.id), 'listBlocks')
      .then(r => r.match(d => setBlocks(d), () => {}))
  }

  return (
    <div className={`bj-task-row${expanded ? ' bj-task-row--expanded' : ''}`}
      style={{ borderColor: expanded ? color + '66' : border }}>

      {/* main row */}
      <div className="bj-task-main" onClick={onExpand}>
        <span className="bj-bullet" style={{ color: symbolColor }}>
          {STATUS_SYMBOL[task.status] ?? '•'}
        </span>
        <div style={{ flex:1, minWidth:0 }}>
          <span style={{
            fontFamily:'var(--font-mono)', fontSize:11, color: ink,
            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
          }}>
            {task.title}
          </span>
          <div style={{ display:'flex', gap:6, marginTop:2, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color, letterSpacing:'0.04em' }}>
              {task.project_icon ?? '◦'} {task.project_name}
            </span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: ink2 }}>
              {TYPE_LABELS[task.task_type] ?? task.task_type}
            </span>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, flexShrink:0 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9,
            color: days < 0 ? '#C0392B' : days === 0 ? accent : days <= 3 ? '#C07020' : ink2 }}>
            {fmtDate(task.due_date)}
          </span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: ink2 }}>
            {(task.done_hours ?? 0).toFixed(1)}/{task.estimated_hours}h
          </span>
        </div>
        <span style={{ color: ink2, fontSize:10, marginLeft:4, transition:'transform 0.15s',
          transform: expanded ? 'rotate(90deg)' : 'none' }}>›</span>
      </div>

      {/* expanded detail */}
      {expanded && (
        <div className="bj-task-detail" style={{ background: cardBg, borderColor: border }}>
          {/* edit fields */}
          <div className="bj-detail-fields">
            <div className="bj-detail-row">
              <label style={{ color: ink2 }}>Título</label>
              <input className="settings-input" style={{ flex:1, fontSize:11 }}
                value={editTitle}
                onChange={e => { setEditTitle(e.target.value); setDirty(true) }} />
            </div>
            <div className="bj-detail-row">
              <label style={{ color: ink2 }}>Tipo</label>
              <select className="settings-input" style={{ flex:1, fontSize:11 }}
                value={editType} onChange={e => { setEditType(e.target.value); setDirty(true) }}>
                {TASK_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="bj-detail-row">
              <label style={{ color: ink2 }}>Prazo</label>
              <input type="date" className="settings-input" style={{ flex:1, fontSize:11 }}
                value={editDate} onChange={e => { setEditDate(e.target.value); setDirty(true) }} />
            </div>
            <div className="bj-detail-row">
              <label style={{ color: ink2 }}>Horas est.</label>
              <input type="number" min="0.25" step="0.25" className="settings-input"
                style={{ width:70, fontSize:11 }}
                value={editHours} onChange={e => { setEditHours(e.target.value); setDirty(true) }} />
            </div>
          </div>

          {/* status buttons */}
          <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
            {(['pending','in_progress','completed'] as const).map(s => (
              <button key={s}
                className="btn btn-sm"
                style={{
                  fontSize:9, padding:'2px 8px',
                  borderColor: task.status === s ? accent : border,
                  color: task.status === s ? accent : ink2,
                }}
                onClick={() => onUpdate(task.id, { status: s })}
              >
                {STATUS_SYMBOL[s]} {STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {/* work blocks */}
          {blocks.length > 0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:ink2,
                letterSpacing:'0.12em', marginBottom:4 }}>BLOCOS</div>
              {blocks.map(b => (
                <div key={b.id} style={{ display:'flex', alignItems:'center', gap:8,
                  padding:'4px 0', borderBottom:`1px solid ${border}` }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:ink2, width:80 }}>{b.date}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:ink }}>{b.planned_hours}h plan.</span>
                  <input type="number" min="0" step="0.25"
                    style={{ width:52, fontFamily:'var(--font-mono)', fontSize:10, padding:'1px 4px',
                      background:'transparent', border:`1px solid ${border}`, borderRadius:2, color:ink }}
                    placeholder={String(b.logged_hours||0)}
                    value={logInput[b.id] ?? ''}
                    onChange={e => setLogInput(p => ({ ...p, [b.id]: e.target.value }))}
                    onKeyDown={e => e.key==='Enter' && logBlock(b.id)}
                  />
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:ink2 }}>h</span>
                  <button className="btn btn-sm"
                    style={{ fontSize:9, padding:'1px 6px', borderColor:accent, color:accent }}
                    onClick={() => logBlock(b.id)}>✓</button>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:
                    b.status==='done' ? '#4A8A60' : b.status==='missed' ? '#C0392B' : ink2 }}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* actions */}
          <div style={{ display:'flex', gap:8, marginTop:10, justifyContent:'space-between' }}>
            <div style={{ display:'flex', gap:6 }}>
              {dirty && (
                <button className="btn btn-sm" style={{ borderColor:accent, color:accent }} onClick={save}>
                  Guardar
                </button>
              )}
              <button className="btn btn-ghost btn-sm" style={{ color:ink2 }}
                onClick={() => onProjectOpen(task.project_id)}>
                ↗ Abrir projeto
              </button>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color:'#C0392B', opacity:0.7 }}
              onClick={() => onDelete(task.id)}>
              × Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Formulário inline de criação ──────────────────────────────────────────────

function InlineCreateForm({ dark, projects, onCreated, onCancel }: {
  dark:      boolean
  projects:  { id: number; name: string; icon?: string; color?: string }[]
  onCreated: (task: GlobalTask) => void
  onCancel:  () => void
}) {
  const { pushToast } = useAppStore()
  const [projectId, setProjectId] = useState<number | ''>(projects[0]?.id ?? '')
  const [title,     setTitle]     = useState('')
  const [taskType,  setTaskType]  = useState('atividade')
  const [dueDate,   setDueDate]   = useState(new Date().toISOString().slice(0, 10))
  const [hours,     setHours]     = useState('1')
  const [saving,    setSaving]    = useState(false)

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#1E1A12' : '#EAE4D8'

  const submit = async () => {
    if (!title.trim())  { pushToast({ kind:'error', title:'Título obrigatório' }); return }
    if (!projectId)     { pushToast({ kind:'error', title:'Selecione um projeto' }); return }
    setSaving(true)
    const result = await fromIpc<GlobalTask>(
      () => db().planner.createTask({
        project_id:      Number(projectId),
        title:           title.trim(),
        task_type:       taskType,
        due_date:        dueDate,
        estimated_hours: parseFloat(hours) || 1,
      }),
      'createTaskGlobal',
    )
    setSaving(false)
    if (result.isErr()) { pushToast({ kind:'error', title:'Erro ao criar tarefa', detail: result.error.message }); return }
    onCreated(result.value)
    setTitle(''); setTaskType('atividade'); setHours('1')
  }

  return (
    <div className="bj-create-form" style={{ background: cardBg, borderColor: border }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:ink2,
        letterSpacing:'0.14em', marginBottom:8 }}>NOVA TAREFA</div>
      <div className="bj-detail-row">
        <label style={{ color:ink2 }}>Projeto</label>
        <select className="settings-input" style={{ flex:1, fontSize:11 }}
          value={projectId} onChange={e => setProjectId(Number(e.target.value))}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.icon ?? '◦'} {p.name}</option>)}
        </select>
      </div>
      <div className="bj-detail-row">
        <label style={{ color:ink2 }}>Título</label>
        <input className="settings-input" style={{ flex:1, fontSize:11 }}
          placeholder="Nome da tarefa…"
          value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key==='Enter' && submit()}
          autoFocus />
      </div>
      <div className="bj-detail-row">
        <label style={{ color:ink2 }}>Tipo</label>
        <select className="settings-input" style={{ flex:1, fontSize:11 }}
          value={taskType} onChange={e => setTaskType(e.target.value)}>
          {TASK_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </div>
      <div className="bj-detail-row">
        <label style={{ color:ink2 }}>Prazo</label>
        <input type="date" className="settings-input" style={{ flex:1, fontSize:11 }}
          value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </div>
      <div className="bj-detail-row">
        <label style={{ color:ink2 }}>Horas est.</label>
        <input type="number" min="0.25" step="0.25" className="settings-input"
          style={{ width:70, fontSize:11 }}
          value={hours} onChange={e => setHours(e.target.value)} />
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
        <button className="btn btn-ghost btn-sm" style={{ color:ink2 }} onClick={onCancel}>Cancelar</button>
        <button className="btn btn-sm" style={{ borderColor:accent, color:accent }}
          onClick={submit} disabled={saving}>
          {saving ? 'A criar…' : '+ Criar'}
        </button>
      </div>
    </div>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────

interface Props {
  dark:          boolean
  onProjectOpen: (id: number) => void
}

export function GlobalPlannerView({ dark, onProjectOpen }: Props) {
  const { projects, pushToast } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)

  const [tasks,       setTasks]       = useState<GlobalTask[]>([])
  const [todayBlocks, setTodayBlocks] = useState<TodayBlock[]>([])
  const [loading,     setLoading]     = useState(true)

  const [filterDate,      setFilterDate]      = useState<string | null>(null)
  const [groupBy,         setGroupBy]         = useState<'date' | 'project'>('date')
  const [showCompleted,   setShowCompleted]   = useState(false)
  const [showCreate,      setShowCreate]      = useState(false)
  const [expandedId,      setExpandedId]      = useState<number | null>(null)

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const accent = dark ? '#D4A820' : '#b8860b'
  const border = dark ? '#3A3020' : '#C4B9A8'

  // Responsive: observe container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      for (const e of entries) setNarrow(e.contentRect.width < 860)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [tasksRes, blocksRes] = await Promise.all([
      fromIpc<GlobalTask[]>(() => db().planner.listAllTasks({ include_completed: showCompleted }), 'listAllTasks'),
      fromIpc<TodayBlock[]>(() => db().planner.todayBlocks(), 'todayBlocks'),
    ])
    tasksRes.match(d => setTasks(d), () => {})
    blocksRes.match(d => setTodayBlocks(d), () => {})
    setLoading(false)
  }, [showCompleted])

  useEffect(() => { loadAll() }, [loadAll])

  // Datas com tarefas para o mini calendário
  const taskDates = new Set(tasks.map(t => t.due_date))

  // Seção URGENTE: próximos 3 dias (pending + overdue)
  const today3 = new Date(); today3.setDate(today3.getDate() + 2)
  const urgentTasks = tasks.filter(t =>
    t.status !== 'completed' &&
    new Date(t.due_date + 'T12:00:00') <= today3
  )

  // Log completo: filtrado + agrupado
  const filteredTasks = filterDate
    ? tasks.filter(t => t.due_date === filterDate)
    : tasks

  const groupedTasks: { key: string; label: string; color?: string; tasks: GlobalTask[] }[] = (() => {
    if (groupBy === 'project') {
      const map = new Map<number, GlobalTask[]>()
      for (const t of filteredTasks) {
        if (!map.has(t.project_id)) map.set(t.project_id, [])
        map.get(t.project_id)!.push(t)
      }
      return Array.from(map.entries()).map(([pid, ts]) => ({
        key:   String(pid),
        label: ts[0]?.project_name ?? `Projeto ${pid}`,
        color: ts[0]?.project_color,
        tasks: ts,
      }))
    } else {
      const map = new Map<string, GlobalTask[]>()
      for (const t of filteredTasks) {
        if (!map.has(t.due_date)) map.set(t.due_date, [])
        map.get(t.due_date)!.push(t)
      }
      return Array.from(map.entries()).map(([date, ts]) => ({
        key:   date,
        label: fmtDate(date),
        tasks: ts,
      }))
    }
  })()

  const handleToggleDone = async (task: GlobalTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    const result = await fromIpc<GlobalTask>(
      () => db().planner.updateTask({ id: task.id, status: newStatus }),
      'updateTaskStatus',
    )
    if (result.isOk()) setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const handleUpdate = async (id: number, fields: Partial<GlobalTask>) => {
    const result = await fromIpc<GlobalTask>(
      () => db().planner.updateTask({ id, ...fields }),
      'updateTask',
    )
    if (result.isErr()) { pushToast({ kind:'error', title:'Erro ao atualizar', detail: result.error.message }); return }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t))
  }

  const handleDelete = async (id: number) => {
    const result = await fromIpc<unknown>(
      () => db().planner.deleteTask(id),
      'deleteTask',
    )
    if (result.isErr()) { pushToast({ kind:'error', title:'Erro ao eliminar', detail: result.error.message }); return }
    setTasks(prev => prev.filter(t => t.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const handleCreated = (task: GlobalTask) => {
    setTasks(prev => {
      const next = [...prev, task]
      next.sort((a, b) => a.due_date.localeCompare(b.due_date))
      return next
    })
    setShowCreate(false)
    pushToast({ kind:'success', title:'Tarefa criada!' })
  }

  const handleLogBlock = async (blockId: number, hours: number) => {
    const result = await fromIpc<TodayBlock>(
      () => db().planner.logBlock(blockId, hours),
      'logBlock',
    )
    if (result.isErr()) { pushToast({ kind:'error', title:'Erro ao registar', detail: result.error.message }); return }
    setTodayBlocks(prev => prev.map(b => b.id === blockId ? { ...b, logged_hours: hours } : b))
    setTasks(prev => prev.map(t =>
      t.id === result.value.task_id ? { ...t, done_hours: (t.done_hours ?? 0) + hours } : t
    ))
  }

  // ── Data header ───────────────────────────────────────────────────────────
  const now         = new Date()
  const weekDays    = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
  const monthNames  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const dateLabel   = `${weekDays[now.getDay()]} · ${now.getDate()} de ${monthNames[now.getMonth()]} · ${now.getFullYear()}`

  return (
    <div ref={containerRef} className="bj-root" style={{ position:'relative' }}>
      {/* fundo pontilhado + cosmos */}
      <div className="bj-dot-bg" />
      <CosmosLayer width={1400} height={900} seed="planner_global"
        density="low" dark={dark}
        style={{ position:'absolute', top:0, left:0, opacity: dark ? 0.18 : 0.08, pointerEvents:'none', zIndex:0 }} />

      <div className={`bj-columns${narrow ? ' bj-columns--narrow' : ''}`} style={{ position:'relative', zIndex:1 }}>

        {/* ── Coluna esquerda ───────────────────────────────────────────── */}
        <div className="bj-col-left">

          {/* data */}
          <div className="bj-date-header">
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.20em',
              color: ink2, marginBottom:4 }}>
              {dateLabel.toUpperCase()}
            </div>
            <div style={{ width:32, height:1, background: accent, marginBottom:12, opacity:0.5 }} />
          </div>

          {/* mini calendário */}
          <MiniCalendar
            tasksWithDates={taskDates}
            filterDate={filterDate}
            onFilterDate={setFilterDate}
            dark={dark}
          />

          {/* separador */}
          <div className="bj-section-sep" style={{ borderColor: border }} />

          {/* URGENTE */}
          <div className="bj-section">
            <div className="bj-section-label" style={{ color: ink2 }}>
              ! URGENTE · PRÓXIMOS 3 DIAS
            </div>
            {urgentTasks.length === 0 ? (
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color: ink2,
                fontStyle:'italic', opacity:0.5, padding:'8px 0' }}>
                nenhuma tarefa urgente
              </div>
            ) : urgentTasks.map(t => (
              <UrgentTaskItem key={t.id} task={t} dark={dark} onToggleDone={handleToggleDone} />
            ))}
          </div>

          {/* separador */}
          <div className="bj-section-sep" style={{ borderColor: border }} />

          {/* HOJE */}
          <div className="bj-section">
            <div className="bj-section-label" style={{ color: ink2 }}>
              ○ PLANO DE HOJE
            </div>
            {todayBlocks.length === 0 ? (
              <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color: ink2,
                fontStyle:'italic', opacity:0.5, padding:'8px 0' }}>
                sem blocos agendados
              </div>
            ) : todayBlocks.map(b => (
              <TodayBlockItem key={b.id} block={b} dark={dark} onLog={handleLogBlock} />
            ))}
          </div>
        </div>

        {/* divisória estilo livro */}
        {!narrow && <div className="bj-page-divider" style={{ borderColor: border }} />}

        {/* ── Coluna direita ────────────────────────────────────────────── */}
        <div className="bj-col-right">

          {/* cabeçalho */}
          <div className="bj-right-header">
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9,
              letterSpacing:'0.20em', color: ink2 }}>
              • LOG COMPLETO
              {filterDate && ` · ${fmtDate(filterDate)}`}
            </span>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <button
                className={`bj-toggle-btn${showCompleted ? ' bj-toggle-btn--active' : ''}`}
                style={{ color: showCompleted ? accent : ink2, borderColor: showCompleted ? accent : border }}
                onClick={() => setShowCompleted(o => !o)}
              >
                × concluídas
              </button>
              <div className="bj-group-toggle" style={{ borderColor: border }}>
                <button
                  className={groupBy === 'date' ? 'active' : ''}
                  style={{ color: groupBy === 'date' ? accent : ink2 }}
                  onClick={() => setGroupBy('date')}
                >por data</button>
                <button
                  className={groupBy === 'project' ? 'active' : ''}
                  style={{ color: groupBy === 'project' ? accent : ink2 }}
                  onClick={() => setGroupBy('project')}
                >por projeto</button>
              </div>
              <button
                className="btn btn-sm"
                style={{ borderColor: accent, color: accent, fontSize:10 }}
                onClick={() => setShowCreate(o => !o)}
              >
                {showCreate ? '×' : '+ Nova tarefa'}
              </button>
            </div>
          </div>

          {/* formulário de criação */}
          {showCreate && (
            <InlineCreateForm
              dark={dark}
              projects={projects.map(p => ({ id: p.id, name: p.name, icon: p.icon ?? undefined, color: p.color ?? undefined }))}
              onCreated={handleCreated}
              onCancel={() => setShowCreate(false)}
            />
          )}

          {/* lista de tarefas */}
          <div className="bj-task-list">
            {loading ? (
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:ink2,
                padding:'32px 0', textAlign:'center', opacity:0.5 }}>
                A carregar…
              </div>
            ) : filteredTasks.length === 0 ? (
              <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:ink2,
                padding:'32px 0', textAlign:'center', fontStyle:'italic', opacity:0.5 }}>
                {filterDate ? 'Nenhuma tarefa neste dia.' : 'Nenhuma tarefa pendente.'}
              </div>
            ) : groupedTasks.map(group => (
              <div key={group.key} className="bj-group">
                <div className="bj-group-label" style={{
                  color: group.color ?? ink2,
                  borderColor: group.color ? group.color + '44' : border,
                }}>
                  {groupBy === 'project' && (group.color
                    ? <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%',
                        background: group.color, marginRight:6 }} />
                    : null
                  )}
                  {group.label}
                  <span style={{ opacity:0.5, marginLeft:6, fontWeight:'normal' }}>
                    ({group.tasks.length})
                  </span>
                </div>
                {group.tasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    dark={dark}
                    expanded={expandedId === task.id}
                    onExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onProjectOpen={onProjectOpen}
                    projects={projects.map(p => ({ id: p.id, name: p.name, icon: p.icon ?? undefined, color: p.color ?? undefined }))}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
