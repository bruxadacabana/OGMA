import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  Page, Project,
  KanbanColumn, KanbanCard,
  PRIORITY_COLORS_LIGHT, PRIORITY_COLORS_DARK,
} from '../../types'
import { CardModal } from '../../components/Kanban/CardModal'
import './KanbanView.css'

const db = () => (window as any).db

interface Props {
  page:    Page
  project: Project
  dark:    boolean
}

export const KanbanView: React.FC<Props> = ({ page, project, dark }) => {
  const [board,   setBoard]   = useState<KanbanColumn[] | null>(null)
  const [loading, setLoading] = useState(true)

  // Drag state
  const dragCardRef = useRef<{ cardId: number; sourceColumnId: number } | null>(null)
  const [dragOverInfo, setDragOverInfo] = useState<{
    columnId: number; beforeCardId: number | null
  } | null>(null)

  // Edição / criação
  const [editingCard,       setEditingCard]       = useState<KanbanCard | null>(null)
  const [creatingInColumn,  setCreatingInColumn]  = useState<number | null>(null)
  const [quickTitle,        setQuickTitle]        = useState('')

  // Nova coluna
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColName,   setNewColName]   = useState('')

  // Renomear coluna
  const [renamingColId,   setRenamingColId]   = useState<number | null>(null)
  const [renamingColName, setRenamingColName] = useState('')

  // Filtros
  const [filterSearch,   setFilterSearch]   = useState('')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus,   setFilterStatus]   = useState<'all' | 'active' | 'done'>('active')

  // ── Paleta ────────────────────────────────────────────────────────────────
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const ink3   = dark ? '#4A3E2E' : '#C4B9A8'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const bg     = dark ? '#1A1610' : '#F5F0E8'
  const colBg  = dark ? '#211D16' : '#EDE7D9'
  const cardBg = dark ? '#1A1610' : '#F5F0E8'
  const priCol = dark ? PRIORITY_COLORS_DARK : PRIORITY_COLORS_LIGHT

  // ── Carregar board ────────────────────────────────────────────────────────
  const loadBoard = useCallback(async () => {
    const res = await db().kanban.getBoard(page.id)
    if (res.ok) setBoard(res.data)
    setLoading(false)
  }, [page.id])

  useEffect(() => { loadBoard() }, [loadBoard])

  // ── Filtros ────────────────────────────────────────────────────────────────
  const filterCards = useCallback((cards: KanbanCard[]) =>
    cards.filter(c => {
      if (filterStatus === 'active' && c.is_done)  return false
      if (filterStatus === 'done'   && !c.is_done) return false
      if (filterPriority !== 'all' && c.priority !== filterPriority) return false
      if (filterSearch) {
        const q = filterSearch.toLowerCase()
        if (!c.title.toLowerCase().includes(q) &&
            !(c.description ?? '').toLowerCase().includes(q)) return false
      }
      return true
    }),
    [filterStatus, filterPriority, filterSearch]
  )

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, card: KanbanCard, columnId: number) => {
    dragCardRef.current = { cardId: card.id, sourceColumnId: columnId }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(card.id))
    ;(e.currentTarget as HTMLElement).classList.add('kanban-card--dragging')
  }

  const handleDragEnd = (e: React.DragEvent) => {
    ;(e.currentTarget as HTMLElement).classList.remove('kanban-card--dragging')
    setDragOverInfo(null)
    dragCardRef.current = null
  }

  const handleDragOverCol = (e: React.DragEvent, columnId: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverInfo(prev =>
      prev?.columnId === columnId && prev?.beforeCardId === null
        ? prev
        : { columnId, beforeCardId: null }
    )
  }

  const handleDragOverCard = (e: React.DragEvent, columnId: number, beforeCardId: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverInfo(prev =>
      prev?.columnId === columnId && prev?.beforeCardId === beforeCardId
        ? prev
        : { columnId, beforeCardId }
    )
  }

  const handleDrop = async (e: React.DragEvent, columnId: number, beforeCardId: number | null) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverInfo(null)
    const drag = dragCardRef.current
    if (!drag) return
    dragCardRef.current = null

    await db().kanban.moveCard({
      card_id:        drag.cardId,
      column_id:      columnId,
      before_card_id: beforeCardId,
    })
    loadBoard()
  }

  // ── Adicionar card (quick) ─────────────────────────────────────────────────
  const handleQuickAdd = async (columnId: number) => {
    const title = quickTitle.trim()
    if (!title) { setCreatingInColumn(null); return }
    await db().kanban.createCard({ column_id: columnId, title })
    setQuickTitle('')
    setCreatingInColumn(null)
    loadBoard()
  }

  // ── Adicionar coluna ───────────────────────────────────────────────────────
  const handleAddColumn = async () => {
    const name = newColName.trim()
    setAddingColumn(false)
    setNewColName('')
    if (!name) return
    await db().kanban.createColumn({ page_id: page.id, name })
    loadBoard()
  }

  // ── Renomear coluna ────────────────────────────────────────────────────────
  const handleRenameColumn = async (colId: number) => {
    const name = renamingColName.trim()
    setRenamingColId(null)
    if (!name) return
    await db().kanban.updateColumn({ id: colId, name })
    loadBoard()
  }

  // ── Excluir coluna ─────────────────────────────────────────────────────────
  const handleDeleteColumn = async (col: KanbanColumn) => {
    const hasCards = col.cards.length > 0
    if (hasCards) {
      const ok = window.confirm(
        `Excluir a coluna "${col.name}" e todos os ${col.cards.length} cards?`
      )
      if (!ok) return
    }
    await db().kanban.deleteColumn(col.id)
    loadBoard()
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="kanban-loading" style={{ color: ink2 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontStyle: 'italic' }}>
          Carregando...
        </span>
      </div>
    )
  }

  const totalCards = board?.reduce((s, col) => s + col.cards.length, 0) ?? 0
  const color = project.color ?? '#b8860b'

  return (
    <div className="kanban-root" style={{ background: bg }}>

      {/* Barra de filtros */}
      <div className="kanban-filterbar" style={{ borderColor: border, background: colBg }}>
        <input
          className="kanban-search"
          placeholder="Buscar cards..."
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          style={{ borderColor: border, color: ink }}
        />

        <select
          className="kanban-select"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          style={{ borderColor: border, color: ink }}
        >
          <option value="all">Todas prioridades</option>
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
          <option value="urgente">Urgente</option>
        </select>

        <select
          className="kanban-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          style={{ borderColor: border, color: ink }}
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="done">Concluídos</option>
        </select>

        <span style={{
          marginLeft: 'auto', fontSize: 10, color: ink2,
          fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
        }}>
          {totalCards} {totalCards === 1 ? 'card' : 'cards'}
        </span>
      </div>

      {/* Board */}
      <div className="kanban-board">

        {board?.map(col => {
          const filtered = filterCards(col.cards)
          const colColor = col.color ?? border
          const isDropTarget = dragOverInfo?.columnId === col.id

          return (
            <div
              key={col.id}
              className="kanban-col"
              style={{ borderColor: colColor, borderTopColor: colColor, background: colBg }}
              onDragOver={e => handleDragOverCol(e, col.id)}
              onDrop={e => handleDrop(e, col.id, null)}
            >
              {/* Cabeçalho */}
              <div className="kanban-col-header" style={{ borderColor: border }}>
                {renamingColId === col.id ? (
                  <input
                    autoFocus
                    className="kanban-col-rename-input"
                    value={renamingColName}
                    onChange={e => setRenamingColName(e.target.value)}
                    onBlur={() => handleRenameColumn(col.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  handleRenameColumn(col.id)
                      if (e.key === 'Escape') setRenamingColId(null)
                    }}
                    style={{ color: ink, borderColor: colColor }}
                  />
                ) : (
                  <button
                    className="kanban-col-name"
                    title="Duplo-clique para renomear"
                    onDoubleClick={() => { setRenamingColId(col.id); setRenamingColName(col.name) }}
                    style={{ color: colColor === border ? ink : colColor }}
                  >
                    {col.name}
                    <span style={{ marginLeft: 6, color: ink2, fontWeight: 'normal' }}>
                      {filtered.length}
                    </span>
                  </button>
                )}

                <button
                  className="kanban-col-delete btn btn-ghost btn-icon"
                  onClick={() => handleDeleteColumn(col)}
                  title="Excluir coluna"
                  style={{ color: ink3 }}
                >
                  ×
                </button>
              </div>

              {/* Cards */}
              <div className="kanban-cards">

                {/* Linha de drop no topo (coluna vazia ou sem card específico) */}
                {isDropTarget && dragOverInfo?.beforeCardId === null && filtered.length === 0 && (
                  <div className="kanban-drop-line" style={{ background: colColor }} />
                )}

                {filtered.map(card => {
                  const isDragTarget = isDropTarget && dragOverInfo?.beforeCardId === card.id
                  const checkTotal  = card.checklists.length
                  const checkDone   = card.checklists.filter(c => c.is_checked).length
                  const overdue     = card.due_date && !card.is_done &&
                    new Date(card.due_date + 'T00:00:00') < new Date()

                  return (
                    <React.Fragment key={card.id}>
                      {isDragTarget && (
                        <div className="kanban-drop-line" style={{ background: colColor }} />
                      )}

                      <div
                        className={`kanban-card${card.is_done ? ' kanban-card--done' : ''}`}
                        draggable
                        onDragStart={e => handleDragStart(e, card, col.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => handleDragOverCard(e, col.id, card.id)}
                        onDrop={e => handleDrop(e, col.id, card.id)}
                        onClick={() => setEditingCard(card)}
                        style={{ borderColor: border, background: cardBg }}
                      >
                        {/* Barra de prioridade */}
                        <div
                          className="kanban-card-priority-bar"
                          style={{ background: priCol[card.priority] ?? priCol.media }}
                        />

                        <div className="kanban-card-body">
                          <span
                            className={`kanban-card-title${card.is_done ? ' kanban-card-title--done' : ''}`}
                            style={{ color: card.is_done ? ink2 : ink }}
                          >
                            {card.title}
                          </span>

                          {/* Rodapé do card */}
                          <div className="kanban-card-footer">
                            {card.due_date && (
                              <span
                                className="kanban-card-date"
                                style={{ color: overdue ? (dark ? '#C45A40' : '#8B3A2A') : ink2 }}
                              >
                                {overdue ? '⚠ ' : ''}
                                {new Date(card.due_date + 'T00:00:00')
                                  .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </span>
                            )}

                            {checkTotal > 0 && (
                              <span
                                className="kanban-card-check"
                                style={{ color: checkDone === checkTotal ? (dark ? '#6A9060' : '#4A6741') : ink2 }}
                              >
                                ☐ {checkDone}/{checkTotal}
                              </span>
                            )}

                            {card.tags.length > 0 && (
                              <div className="kanban-card-tags">
                                {card.tags.map(t => (
                                  <span
                                    key={t.id}
                                    className="kanban-tag"
                                    style={{
                                      background: t.color ?? border,
                                      color: ink,
                                    }}
                                  >
                                    {t.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  )
                })}

                {/* Linha de drop no final da coluna (quando tem cards) */}
                {isDropTarget && dragOverInfo?.beforeCardId === null && filtered.length > 0 && (
                  <div className="kanban-drop-line" style={{ background: colColor }} />
                )}
              </div>

              {/* Rodapé: quick add */}
              <div className="kanban-col-footer">
                {creatingInColumn === col.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <textarea
                      autoFocus
                      className="kanban-quick-input"
                      placeholder="Título do card..."
                      value={quickTitle}
                      onChange={e => setQuickTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleQuickAdd(col.id)
                        }
                        if (e.key === 'Escape') {
                          setCreatingInColumn(null)
                          setQuickTitle('')
                        }
                      }}
                      style={{ borderColor: border, color: ink, background: cardBg }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleQuickAdd(col.id)}
                      >
                        Adicionar
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => { setCreatingInColumn(null); setQuickTitle('') }}
                        style={{ color: ink2 }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="kanban-add-card-btn"
                    onClick={() => { setCreatingInColumn(col.id); setQuickTitle('') }}
                    style={{ color: ink2, borderColor: border }}
                  >
                    + Card
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Botão / form de nova coluna */}
        <div className="kanban-add-col">
          {addingColumn ? (
            <div style={{
              border: `1px solid ${border}`, borderRadius: 2,
              padding: 10, background: colBg, display: 'flex',
              flexDirection: 'column', gap: 8,
            }}>
              <input
                autoFocus
                className="kanban-col-rename-input"
                placeholder="Nome da coluna..."
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  handleAddColumn()
                  if (e.key === 'Escape') { setAddingColumn(false); setNewColName('') }
                }}
                style={{ color: ink, borderColor: border }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-sm btn-primary" onClick={handleAddColumn}>
                  Adicionar
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => { setAddingColumn(false); setNewColName('') }}
                  style={{ color: ink2 }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              className="kanban-add-col-btn"
              onClick={() => setAddingColumn(true)}
              style={{ color: ink2, borderColor: border }}
            >
              + Coluna
            </button>
          )}
        </div>

      </div>

      {/* Modal de edição de card */}
      {editingCard && (
        <CardModal
          card={editingCard}
          dark={dark}
          onClose={() => setEditingCard(null)}
          onSaved={() => { setEditingCard(null); loadBoard() }}
        />
      )}
    </div>
  )
}
