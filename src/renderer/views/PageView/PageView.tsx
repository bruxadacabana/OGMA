import React, { useState, useCallback } from 'react'
import { Page, Project } from '../../types'
import { CosmosLayer } from '../../components/Cosmos/CosmosLayer'
import { EditorFrame } from '../../components/Editor/EditorFrame'
import { KanbanView } from '../KanbanView/KanbanView'
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

const PAGE_TYPE_LABELS: Record<string, string> = {
  document:   'Documento',
  database:   'Database',
  kanban:     'Kanban',
  calendar:   'Calendário',
  discipline: 'Disciplina',
}

export const PageView: React.FC<Props> = ({ page, project, dark, onBack }) => {
  const { updatePage } = useAppStore()
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const color  = project.color ?? '#8B7355'
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  const handleSave = useCallback(async (contentJson: string) => {
    setSaving(true)
    try {
      await (window as any).db.pages.update({
        ...page,
        content_json: contentJson,
      })
      setLastSaved(new Date())
      log.debug('page saved', { id: page.id })
    } catch (e: any) {
      log.error('page save failed', { error: e.message })
    } finally {
      setSaving(false)
    }
  }, [page])

  const formattedDate = (() => {
    try { return new Date(page.created_at).toLocaleDateString('pt-BR') } catch { return '' }
  })()

  const hasEditor = page.page_type === 'document' || page.page_type === 'discipline'

  return (
    <div className={`page-view${hasEditor ? ' page-view--editor' : ''}`}>

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
              <span className="badge" style={{ borderColor: color, color }}>
                {PAGE_TYPE_LABELS[page.page_type] ?? page.page_type}
              </span>
              {formattedDate && (
                <span style={{ fontSize: 10, color: ink2, letterSpacing: '0.05em' }}>
                  Criado em {formattedDate}
                </span>
              )}
              {/* Status de salvamento */}
              {hasEditor && (
                <span style={{
                  fontSize: 10, color: ink2, letterSpacing: '0.05em',
                  marginLeft: 'auto', fontStyle: 'italic',
                }}>
                  {saving ? '💾 Salvando...'
                    : lastSaved ? `✓ Salvo às ${lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo por tipo */}
      {page.page_type === 'document' && (
        <div className="page-editor-area">
          <EditorFrame
            content={page.content_json}
            dark={dark}
            onSave={handleSave}
            onReady={() => log.debug('editor ready', { page: page.id })}
          />
        </div>
      )}

      {page.page_type === 'discipline' && (
        <DisciplineView page={page} dark={dark} color={color}
          border={border} cardBg={cardBg} ink={ink} ink2={ink2}
          onSave={handleSave} saving={saving} lastSaved={lastSaved} />
      )}

      {page.page_type === 'kanban' && (
        <KanbanView page={page} project={project} dark={dark} />
      )}

      {(page.page_type === 'database' || page.page_type === 'calendar') && (
        <PlaceholderContent
          icon={page.page_type === 'database' ? '🗂️' : '📅'}
          title={PAGE_TYPE_LABELS[page.page_type]}
          desc={page.page_type === 'database' ? 'Implementado na Fase 5.' : 'Implementado na Fase 8.'}
          dark={dark}
        />
      )}
    </div>
  )
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function PlaceholderContent({ icon, title, desc, dark }: {
  icon: string; title: string; desc: string; dark: boolean
}) {
  const ink  = dark ? '#E8DFC8' : '#2C2416'
  const ink2 = dark ? '#8A7A62' : '#9C8E7A'
  return (
    <div className="content-area empty-state" style={{ position: 'relative', paddingTop: 40 }}>
      <CosmosLayer width={280} height={160} seed={`ph_${title}`}
        density="medium" dark={dark}
        style={{ position: 'relative', top: 0, left: 0 }} />
      <div style={{ fontSize: 38, position: 'relative', zIndex: 2 }}>{icon}</div>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 20, fontStyle: 'italic',
        color: ink, fontWeight: 'normal', position: 'relative', zIndex: 2,
      }}>{title}</h2>
      <p style={{
        fontSize: 12, color: ink2, maxWidth: 300, textAlign: 'center',
        lineHeight: 1.6, fontStyle: 'italic', position: 'relative', zIndex: 2,
      }}>{desc}</p>
    </div>
  )
}

function DisciplineView({ page, dark, color, border, cardBg, ink, ink2, onSave, saving, lastSaved }: {
  page: Page; dark: boolean; color: string;
  border: string; cardBg: string; ink: string; ink2: string;
  onSave: (content: string) => void;
  saving: boolean; lastSaved: Date | null;
}) {
  const [activeTab, setActiveTab] = React.useState<string>('content')

  const tabs = [
    { id: 'content',    icon: '📝', label: 'Conteúdo'  },
    { id: 'tasks',      icon: '✓',  label: 'Tarefas'   },
    { id: 'deadlines',  icon: '📅', label: 'Prazos'    },
    { id: 'resources',  icon: '🔗', label: 'Recursos'  },
    { id: 'topics',     icon: '◦',  label: 'Tópicos'   },
    { id: 'readings',   icon: '📖', label: 'Leituras'  },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Abas */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: `1px solid ${border}`,
        padding: '0 20px',
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            letterSpacing: '0.1em', padding: '8px 14px',
            border: 'none', borderBottom: activeTab === t.id ? `2px solid ${color}` : '2px solid transparent',
            background: 'transparent', cursor: 'pointer',
            color: activeTab === t.id ? color : ink2,
            marginBottom: -1,
            transition: 'color 120ms, border-color 120ms',
            whiteSpace: 'nowrap',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
        {/* Status de salvamento na aba conteúdo */}
        {activeTab === 'content' && (
          <span style={{
            marginLeft: 'auto', fontSize: 10, color: ink2,
            fontStyle: 'italic', display: 'flex', alignItems: 'center', padding: '0 8px',
          }}>
            {saving ? '💾 Salvando...'
              : lastSaved ? `✓ Salvo às ${lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </span>
        )}
      </div>

      {/* Conteúdo da aba ativa */}
      {activeTab === 'content' && (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <EditorFrame
            content={page.content_json}
            dark={dark}
            onSave={onSave}
          />
        </div>
      )}

      {activeTab !== 'content' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px' }}>
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 10, paddingTop: 40,
            color: ink2, textAlign: 'center',
          }}>
            <span style={{ fontSize: 36, opacity: 0.4 }}>
              {tabs.find(t => t.id === activeTab)?.icon}
            </span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 18,
              fontStyle: 'italic', color: ink,
            }}>
              {tabs.find(t => t.id === activeTab)?.label}
            </span>
            <span style={{ fontSize: 12, fontStyle: 'italic' }}>
              {activeTab === 'tasks'     ? 'Tarefas e checklists — Fase 6'
               : activeTab === 'deadlines' ? 'Provas, entregas e prazos — Fase 6'
               : activeTab === 'resources' ? 'Links e materiais de estudo — Fase 6'
               : activeTab === 'topics'    ? 'Programa e tópicos da disciplina — Fase 6'
               : 'Livros vinculados — Fase 7'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
