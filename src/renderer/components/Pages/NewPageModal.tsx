import React, { useState } from 'react'
import { Modal } from '../UI/Modal'
import { IconPicker } from '../UI/IconPicker'
import { Project } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { fromIpc } from '../../types/errors'
import './NewPageModal.css'

interface Props {
  project: Project
  onClose: () => void
  onCreated?: (pageId: number) => void
}

export const NewPageModal: React.FC<Props> = ({ project, onClose, onCreated }) => {
  const { dark, loadPages } = useAppStore()
  const [title, setTitle]       = useState('')
  const [icon,  setIcon]        = useState('📄')
  const [submitting, setSubmit] = useState(false)
  const [error, setError]       = useState('')

  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const color  = project.color ?? '#8B7355'

  const handleSubmit = async () => {
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    setSubmit(true)
    setError('')
    const result = await fromIpc<{ id: number }>(
      () => (window as any).db.pages.create({ project_id: project.id, title: title.trim(), icon, sort_order: 0 }),
      'createPage',
    )
    setSubmit(false)
    result.match(
      async data => { await loadPages(project.id); onCreated?.(data.id); onClose() },
      e           => setError(e.message),
    )
  }

  return (
    <Modal title="Nova Página" onClose={onClose} dark={dark} width={420}>
      <div className="form-row" style={{ marginBottom: 14 }}>
        <div className="form-group" style={{ flex: 0, minWidth: 56 }}>
          <label className="form-label" style={{ color: ink2 }}>Ícone</label>
          <div style={{ paddingTop: 4 }}>
            <IconPicker value={icon} onChange={setIcon} dark={dark} size={26} />
          </div>
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
