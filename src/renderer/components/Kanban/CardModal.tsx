import React, { useState } from 'react'
import {
  KanbanCard, KanbanChecklist,
  PRIORITY_COLORS_LIGHT, PRIORITY_COLORS_DARK,
} from '../../types'
import { Modal } from '../UI/Modal'

const db = () => (window as any).db

interface Props {
  card:    KanbanCard
  dark:    boolean
  onClose: () => void
  onSaved: () => void
}

export const CardModal: React.FC<Props> = ({ card, dark, onClose, onSaved }) => {
  const [title,       setTitle]       = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [priority,    setPriority]    = useState(card.priority)
  const [dueDate,     setDueDate]     = useState(card.due_date ?? '')
  const [isDone,      setIsDone]      = useState(!!card.is_done)
  const [checklists,  setChecklists]  = useState<KanbanChecklist[]>(card.checklists)
  const [newCheck,    setNewCheck]    = useState('')
  const [tagInput,    setTagInput]    = useState(card.tags.map(t => t.name).join(', '))
  const [saving,      setSaving]      = useState(false)

  const priCol = dark ? PRIORITY_COLORS_DARK : PRIORITY_COLORS_LIGHT
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  // ── Salvar ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await db().kanban.updateCard({
        id:          card.id,
        title:       title.trim(),
        description: description.trim() || null,
        priority,
        due_date:    dueDate || null,
        is_done:     isDone ? 1 : 0,
      })

      const tags = tagInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
      await db().kanban.setCardTags(card.id, tags)

      onSaved()
    } finally {
      setSaving(false)
    }
  }

  // ── Excluir card ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Excluir este card permanentemente?')) return
    await db().kanban.deleteCard(card.id)
    onSaved()
  }

  // ── Checklist ─────────────────────────────────────────────────────────────
  const handleToggleCheck = async (item: KanbanChecklist) => {
    const is_checked = item.is_checked ? 0 : 1
    await db().kanban.updateChecklist({ id: item.id, text: item.text, is_checked })
    setChecklists(prev =>
      prev.map(c => c.id === item.id ? { ...c, is_checked } : c)
    )
  }

  const handleAddCheck = async () => {
    const text = newCheck.trim()
    if (!text) return
    const res = await db().kanban.createChecklist({ card_id: card.id, text })
    if (res.ok) {
      setChecklists(prev => [...prev, res.data])
      setNewCheck('')
    }
  }

  const handleDeleteCheck = async (id: number) => {
    await db().kanban.deleteChecklist(id)
    setChecklists(prev => prev.filter(c => c.id !== id))
  }

  const checkDone  = checklists.filter(c => c.is_checked).length
  const checkTotal = checklists.length

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = (
    <>
      <button
        className="btn btn-sm"
        onClick={handleDelete}
        style={{ borderColor: dark ? '#C45A40' : '#8B3A2A', color: dark ? '#C45A40' : '#8B3A2A' }}
      >
        Excluir
      </button>
      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
        <button className="btn btn-sm btn-ghost" onClick={onClose} style={{ color: ink2 }}>
          Cancelar
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={handleSave}
          disabled={saving || !title.trim()}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </>
  )

  return (
    <Modal title="Editar Card" onClose={onClose} footer={footer} dark={dark} width={500}>

      {/* Título + toggle concluído */}
      <div className="form-group">
        <label className="form-label" style={{ color: ink2 }}>Título</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setIsDone(!isDone)}
            title={isDone ? 'Marcar como ativo' : 'Marcar como concluído'}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              border: `1px solid ${isDone ? (dark ? '#6A9060' : '#4A6741') : border}`,
              background: isDone ? (dark ? 'rgba(106,144,96,0.15)' : 'rgba(74,103,65,0.12)') : 'none',
              color: isDone ? (dark ? '#6A9060' : '#4A6741') : ink2,
              cursor: 'pointer', fontSize: 12, display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'all 120ms',
            }}
          >
            {isDone ? '✓' : '○'}
          </button>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            style={{ flex: 1, textDecoration: isDone ? 'line-through' : 'none' }}
          />
        </div>
      </div>

      {/* Descrição */}
      <div className="form-group">
        <label className="form-label" style={{ color: ink2 }}>Descrição</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Detalhes do card..."
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* Prioridade + Vencimento */}
      <div className="form-row" style={{ marginBottom: 14 }}>
        <div>
          <label className="form-label" style={{ color: ink2 }}>Prioridade</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value as any)}
            style={{ color: priCol[priority] ?? ink }}
          >
            <option value="baixa">⬇ Baixa</option>
            <option value="media">→ Média</option>
            <option value="alta">⬆ Alta</option>
            <option value="urgente">⚡ Urgente</option>
          </select>
        </div>
        <div>
          <label className="form-label" style={{ color: ink2 }}>Vencimento</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{ colorScheme: dark ? 'dark' : 'light' }}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="form-group">
        <label className="form-label" style={{ color: ink2 }}>
          Tags
          <span style={{ fontWeight: 'normal', opacity: 0.6, marginLeft: 4 }}>
            (separadas por vírgula)
          </span>
        </label>
        <input
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          placeholder="ex: bug, frontend, urgente"
        />
      </div>

      {/* Checklist */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ color: ink2 }}>
          Checklist
          {checkTotal > 0 && (
            <span style={{ fontWeight: 'normal', marginLeft: 6, opacity: 0.7 }}>
              {checkDone}/{checkTotal}
            </span>
          )}
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
          {checklists.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => handleToggleCheck(item)}
                style={{
                  color: item.is_checked ? (dark ? '#6A9060' : '#4A6741') : ink2,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 15, lineHeight: 1, flexShrink: 0, padding: 0,
                }}
              >
                {item.is_checked ? '☑' : '☐'}
              </button>
              <span style={{
                flex: 1, fontSize: 13, color: item.is_checked ? ink2 : ink,
                fontFamily: 'var(--font-mono)',
                textDecoration: item.is_checked ? 'line-through' : 'none',
              }}>
                {item.text}
              </span>
              <button
                onClick={() => handleDeleteCheck(item.id)}
                style={{
                  color: ink2, background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 16, opacity: 0.4,
                  lineHeight: 1, padding: '0 2px',
                  transition: 'opacity 120ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Adicionar item */}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={newCheck}
            onChange={e => setNewCheck(e.target.value)}
            placeholder="Adicionar item..."
            onKeyDown={e => { if (e.key === 'Enter') handleAddCheck() }}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-sm"
            onClick={handleAddCheck}
            style={{ borderColor: border, color: ink2, flexShrink: 0 }}
          >
            +
          </button>
        </div>
      </div>

    </Modal>
  )
}
