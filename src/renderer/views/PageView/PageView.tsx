import React, { useState, useCallback } from 'react'
import { Page, Project } from '../../types'
import { CosmosLayer } from '../../components/Cosmos/CosmosLayer'
import { EditorFrame } from '../../components/Editor/EditorFrame'
import { useAppStore } from '../../store/useAppStore'
import { createLogger } from '../../utils/logger'
import './PageView.css'

const log = createLogger('PageView')

interface Props {
  page:    Page
  project: Project
  dark:    boolean
  onBack:  () => void
}

export const PageView: React.FC<Props> = ({ page, project, dark }) => {
  const { updatePage } = useAppStore()
  const [saving,    setSaving]    = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const color  = project.color ?? '#8B7355'
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  const handleSave = useCallback(async (bodyJson: string) => {
    setSaving(true)
    try {
      await updatePage({ id: page.id, body_json: bodyJson })
      setLastSaved(new Date())
      log.debug('page saved', { id: page.id })
    } catch (e: any) {
      log.error('page save failed', { error: e.message })
    } finally {
      setSaving(false)
    }
  }, [page.id, updatePage])

  const formattedDate = (() => {
    try { return new Date(page.created_at).toLocaleDateString('pt-BR') } catch { return '' }
  })()

  return (
    <div className="page-view page-view--editor">

      {/* Cabeçalho */}
      <div className="page-header" style={{ borderColor: border, background: cardBg }}>
        <CosmosLayer width={900} height={90}
          seed={`page_${page.id}`} density="low" dark={dark}
          style={{ opacity: 0.4 }} />
        <div className="page-header-bar" style={{ background: color }} />

        <div className="page-header-content" style={{ position: 'relative', zIndex: 2 }}>
          <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>
            {page.icon ?? '📄'}
          </span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <h1 className="page-title" style={{ color: ink }}>{page.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
              {formattedDate && (
                <span style={{ fontSize: 10, color: ink2, letterSpacing: '0.05em' }}>
                  Criado em {formattedDate}
                </span>
              )}
              <span style={{
                fontSize: 10, color: ink2, letterSpacing: '0.05em',
                marginLeft: 'auto', fontStyle: 'italic',
              }}>
                {saving ? '💾 Salvando...'
                  : lastSaved
                    ? `✓ Salvo às ${lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="page-editor-area">
        <EditorFrame
          content={page.body_json}
          dark={dark}
          onSave={handleSave}
          onReady={() => log.debug('editor ready', { page: page.id })}
        />
      </div>
    </div>
  )
}
