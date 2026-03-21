import React, { useState } from 'react'
import { Modal } from '../UI/Modal'
import { PageType, Project, PROJECT_TYPE_ICONS } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import './NewPageModal.css'

interface Props {
  project: Project
  onClose: () => void
  onCreated?: (pageId: number) => void
}

interface PageTypeOption {
  type:  PageType
  icon:  string
  label: string
  desc:  string
}

const BASE_TYPES: PageTypeOption[] = [
  { type: 'document', icon: '📄', label: 'Documento',  desc: 'Texto rico com blocos, imagens e formatação.' },
  { type: 'database', icon: '🗂️', label: 'Database',   desc: 'Tabela de dados com propriedades e filtros.' },
  { type: 'kanban',   icon: '📋', label: 'Kanban',     desc: 'Quadro com colunas e cards arrastáveis.' },
  { type: 'calendar', icon: '📅', label: 'Calendário', desc: 'Eventos e prazos em visualização de calendário.' },
]

export const NewPageModal: React.FC<Props> = ({ project, onClose, onCreated }) => {
  const { dark, loadPages } = useAppStore()
  const [selectedType, setType]   = useState<PageType>('document')
  const [title, setTitle]         = useState('')
  const [icon,  setIcon]          = useState('📄')
  const [submitting, setSubmit]   = useState(false)
  const [error, setError]         = useState('')

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'
  const color  = project.color ?? '#8B7355'

  // Incluir disciplina apenas para projetos acadêmicos
  const types: PageTypeOption[] = project.project_type === 'academic'
    ? [...BASE_TYPES, { type: 'discipline' as PageType, icon: '🎓', label: 'Disciplina', desc: 'Página especial com campos acadêmicos, tarefas e prazos.' }]
    : BASE_TYPES

  const handleTypeSelect = (t: PageType) => {
    setType(t)
    const found = types.find(x => x.type === t)
    setIcon(found?.icon ?? '📄')
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    setSubmit(true)
    setError('')

    try {
      const res = await (window as any).db.pages.create({
        project_id: project.id,
        title: title.trim(),
        icon,
        page_type: selectedType,
        sort_order: 0,
      })

      if (res?.ok && res.data) {
        await loadPages(project.id)
        onCreated?.(res.data.id)
        onClose()
      } else {
        setError(res?.error ?? 'Erro ao criar página.')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmit(false)
    }
  }

  return (
    <Modal title="Nova Página" onClose={onClose} dark={dark} width={500}>
      {/* Seletor de tipo */}
      <div className="page-type-grid" style={{ marginBottom: 16 }}>
        {types.map(t => (
          <button
            key={t.type}
            className={`page-type-btn${selectedType === t.type ? ' selected' : ''}`}
            style={{
              borderColor: selectedType === t.type ? color : border,
              background:  selectedType === t.type ? color + '1a' : cardBg,
              color: ink,
            }}
            onClick={() => handleTypeSelect(t.type)}
          >
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                {t.label}
              </div>
              <div style={{ fontSize: 10, color: ink2, lineHeight: 1.3 }}>{t.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Título e ícone */}
      <div className="form-row" style={{ marginBottom: 14 }}>
        <div className="form-group" style={{ flex: 0, minWidth: 56 }}>
          <label className="form-label" style={{ color: ink2 }}>Ícone</label>
          <input
            className="input"
            value={icon}
            onChange={e => setIcon(e.target.value)}
            style={{ textAlign: 'center', fontSize: 20, padding: '4px 6px' }}
            maxLength={4}
          />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label" style={{ color: ink2 }}>Título *</label>
          <input
            className="input"
            placeholder="Nome da página..."
            value={title}
            onChange={e => { setTitle(e.target.value); setError('') }}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>
      </div>

      {error && (
        <p style={{ color: '#8B3A2A', fontSize: 12, marginBottom: 8 }}>{error}</p>
      )}

      <div className="modal-footer" style={{ borderColor: border, padding: '12px 0 0' }}>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button
          className="btn btn-primary"
          disabled={!title.trim() || submitting}
          onClick={handleSubmit}
          style={{ background: color, borderColor: color }}
        >
          {submitting ? 'Criando...' : 'Criar página'}
        </button>
      </div>
    </Modal>
  )
}
