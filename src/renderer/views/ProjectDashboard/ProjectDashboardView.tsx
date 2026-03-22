import React, { useState, useEffect } from 'react'
import { Project, Page, PROJECT_TYPE_LABELS, PROJECT_TYPE_ICONS } from '../../types'
import { CosmosLayer } from '../../components/Cosmos/CosmosLayer'
import { useAppStore } from '../../store/useAppStore'
import { fromIpc } from '../../types/errors'
import { ViewRenderer } from './ViewRenderer'
import { NewViewModal } from '../../components/Views/NewViewModal'
import { ManagePropertiesModal } from '../../components/Properties/ManagePropertiesModal'
import './ProjectDashboardView.css'

interface Props {
  project:    Project
  dark:       boolean
  onPageOpen: (page: Page) => void
  onEdit:     () => void
  onNewPage:  () => void
}

const VIEW_TYPE_ICONS: Record<string, string> = {
  table:    '☰',
  kanban:   '☷',
  list:     '≡',
  calendar: '☽',
  gallery:  '⊞',
  timeline: '⟶',
  progress: '◎',
}

// ── Header ────────────────────────────────────────────────────────────────────

function ProjectHeader({ project, dark, onEdit }: {
  project: Project; dark: boolean; onEdit: () => void
}) {
  const color  = project.color ?? '#8B7355'
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  return (
    <div className="proj-header" style={{ background: cardBg, borderColor: border }}>
      <CosmosLayer width={800} height={120}
        seed={`proj_header_${project.id}`} density="medium" dark={dark}
        style={{ opacity: 0.55 }} />
      <div className="proj-header-bar" style={{ background: color }} />

      <div className="proj-header-content" style={{ position: 'relative', zIndex: 2 }}>
        <div className="proj-header-icon" style={{ background: color + '33', borderColor: color, color }}>
          {project.icon ?? PROJECT_TYPE_ICONS[project.project_type]}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="proj-header-name" style={{ color: ink }}>{project.name}</h1>
          <div className="proj-header-meta">
            <span className="badge" style={{ borderColor: color, color }}>
              {PROJECT_TYPE_LABELS[project.project_type]}
            </span>
            {project.subcategory && (
              <span className="badge" style={{ borderColor: border, color: ink2 }}>
                {project.subcategory}
              </span>
            )}
            <span className="badge" style={{
              borderColor: project.status === 'active' ? '#4A6741' : border,
              color: project.status === 'active' ? '#4A6741' : ink2,
            }}>
              {project.status === 'active' ? '● Ativo'
                : project.status === 'paused' ? '◌ Pausado'
                : project.status === 'completed' ? '✓ Concluído' : '◻ Arquivado'}
            </span>
          </div>
          {project.description && (
            <p className="proj-header-desc" style={{ color: ink2 }}>{project.description}</p>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onEdit}
          style={{ color: ink2, flexShrink: 0 }}>
          ✎ Editar
        </button>
      </div>
    </div>
  )
}

// ── Leituras vinculadas ───────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  want: 'Quer ler', reading: 'Lendo', done: 'Lido', abandoned: 'Abandonado',
}
const STATUS_COLORS: Record<string, string> = {
  want: '#8B7355', reading: '#b8860b', done: '#4A6741', abandoned: '#8B3A2A',
}

function LinkedReadingsPanel({ projectId, dark, onPageOpen, pages }: {
  projectId: number; dark: boolean; onPageOpen: (page: any) => void; pages: any[]
}) {
  const [readings, setReadings] = useState<any[]>([])
  const db = () => (window as any).db
  const border = dark ? '#3A3020' : '#C4B9A8'
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const bg     = dark ? '#211D16' : '#EDE7D9'

  useEffect(() => {
    fromIpc<any[]>(() => db().readingLinks.listForProject(projectId), 'listReadingsForProject')
      .then(r => r.match(data => setReadings(data), _e => {}))
  }, [projectId])

  if (readings.length === 0) return null

  return (
    <div style={{
      borderBottom: `1px solid ${border}`, padding: '8px 16px',
      display: 'flex', gap: 10, overflowX: 'auto', alignItems: 'stretch',
      background: dark ? '#1A1610' : '#F5F0E8',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
        color: ink2, textTransform: 'uppercase', flexShrink: 0,
        alignSelf: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)',
        paddingRight: 4,
      }}>Leituras</span>
      {readings.map((r: any) => {
        let meta: any = {}
        try { if (r.metadata_json) meta = JSON.parse(r.metadata_json) } catch {}
        const cover    = r.cover_path || meta.cover_url || meta.cover_url_m || meta.thumbnail_url
        const progress = r.progress_type === 'percent'
          ? (r.progress_percent ?? null)
          : (r.total_pages > 0 ? Math.round((r.current_page / r.total_pages) * 100) : null)
        const statusColor = STATUS_COLORS[r.status] ?? ink2
        const page = pages.find((p: any) => p.id === r.page_id)

        return (
          <button
            key={`${r.id}-${r.page_id}`}
            onClick={() => page && onPageOpen(page)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
              background: bg, border: `1px solid ${border}`, borderRadius: 3,
              padding: '6px 8px', cursor: page ? 'pointer' : 'default',
              minWidth: 120, maxWidth: 150, flexShrink: 0, textAlign: 'left',
              transition: 'border-color 120ms',
            }}
            onMouseEnter={e => { if (page) (e.currentTarget as HTMLElement).style.borderColor = statusColor }}
            onMouseLeave={e => { if (page) (e.currentTarget as HTMLElement).style.borderColor = border }}
            title={page ? `Abrir: ${r.page_title}` : r.title}
          >
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', width: '100%' }}>
              {cover ? (
                <img src={cover} alt="" style={{
                  width: 28, height: 40, objectFit: 'cover', borderRadius: 1, flexShrink: 0,
                  border: `1px solid ${border}`,
                }} />
              ) : (
                <div style={{
                  width: 28, height: 40, borderRadius: 1, flexShrink: 0, background: statusColor + '22',
                  border: `1px solid ${statusColor}44`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 14,
                }}>
                  {r.reading_type === 'article' ? '📄' : '📖'}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 11,
                  color: ink, lineHeight: 1.3,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {r.title}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, color: statusColor,
                  marginTop: 2, letterSpacing: '0.04em',
                }}>
                  {STATUS_LABELS[r.status] ?? r.status}
                </div>
              </div>
            </div>

            {progress !== null && (
              <div style={{ width: '100%', height: 2, background: border, borderRadius: 1, marginTop: 2 }}>
                <div style={{
                  width: `${progress}%`, height: '100%',
                  background: statusColor, borderRadius: 1,
                }} />
              </div>
            )}

            {r.page_title && (
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, color: ink2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                width: '100%', borderTop: `1px solid ${border}`, paddingTop: 3, marginTop: 2,
              }}>
                {r.page_icon ?? '📄'} {r.page_title}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── View principal ────────────────────────────────────────────────────────────

export const ProjectDashboardView: React.FC<Props> = ({
  project, dark, onPageOpen, onEdit, onNewPage,
}) => {
  const { pages, projectProperties, projectViews, activeViewId, setActiveView, loadViews, loadProperties, loadPages } = useAppStore()
  const [showNewView,  setShowNewView]  = useState(false)
  const [showManageProps, setShowManageProps] = useState(false)

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const color  = project.color ?? '#8B7355'

  const activeView  = projectViews.find(v => v.id === activeViewId) ?? projectViews[0] ?? null
  const noScroll    = activeView?.view_type === 'kanban'
                   || activeView?.view_type === 'calendar'
                   || activeView?.view_type === 'timeline'

  return (
    <div className={`proj-dashboard-root${noScroll ? ' proj-dashboard-root--kanban' : ''}`}>

      {/* Header + tabs — sempre visíveis */}
      <div className="proj-dashboard-top">
        <ProjectHeader project={project} dark={dark} onEdit={onEdit} />

        <LinkedReadingsPanel
          projectId={project.id}
          dark={dark}
          onPageOpen={onPageOpen}
          pages={pages}
        />

        <div className="view-tabs" style={{ borderColor: border }}>
          {projectViews.map(v => (
            <button
              key={v.id}
              className={`view-tab${activeViewId === v.id ? ' view-tab--active' : ''}`}
              onClick={() => setActiveView(v.id)}
              style={{
                color: activeViewId === v.id ? color : ink2,
                borderBottomColor: activeViewId === v.id ? color : 'transparent',
              }}
            >
              <span style={{ fontSize: 12 }}>{VIEW_TYPE_ICONS[v.view_type] ?? '◦'}</span>
              {v.name}
            </button>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: ink2, fontSize: 10, padding: '2px 6px' }}
            onClick={() => setShowNewView(true)}
            title="Nova vista"
          >
            + Vista
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: ink2, fontSize: 10, padding: '2px 6px' }}
            onClick={() => setShowManageProps(true)}
            title="Gerenciar propriedades"
          >
            ⚙ Props
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: ink2, fontSize: 10, padding: '2px 6px' }}
            onClick={onNewPage}
          >
            + Página
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className={`proj-dashboard-content${noScroll ? ' proj-dashboard-content--noscroll' : ''}`}>
        {activeView ? (
          <ViewRenderer
            view={activeView}
            project={project}
            pages={pages}
            properties={projectProperties}
            dark={dark}
            onPageOpen={onPageOpen}
            onNewPage={onNewPage}
          />
        ) : (
          <div className="proj-empty-state" style={{ color: ink2 }}>
            <span style={{ fontSize: 36, opacity: 0.4 }}>✦</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 18, color: ink,
            }}>
              Nenhuma vista configurada
            </span>
            <button className="btn btn-sm" onClick={() => setShowNewView(true)}
              style={{ borderColor: color, color }}>
              + Criar vista
            </button>
          </div>
        )}
      </div>

      {showNewView && (
        <NewViewModal
          project={project}
          properties={projectProperties}
          dark={dark}
          onClose={() => setShowNewView(false)}
          onCreated={(viewId) => { setActiveView(viewId) }}
        />
      )}

      {showManageProps && (
        <ManagePropertiesModal
          project={project}
          dark={dark}
          onClose={() => setShowManageProps(false)}
          onChanged={() => { loadProperties(project.id); loadViews(project.id); loadPages(project.id) }}
        />
      )}
    </div>
  )
}
