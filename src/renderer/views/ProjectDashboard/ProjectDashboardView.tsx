import React from 'react'
import { Project, Page, PROJECT_TYPE_LABELS, PROJECT_TYPE_ICONS } from '../../types'
import { CosmosLayer } from '../../components/Cosmos/CosmosLayer'
import { useAppStore } from '../../store/useAppStore'
import { ViewRenderer } from './ViewRenderer'
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

// ── View principal ────────────────────────────────────────────────────────────

export const ProjectDashboardView: React.FC<Props> = ({
  project, dark, onPageOpen, onEdit, onNewPage,
}) => {
  const { pages, projectProperties, projectViews, activeViewId, setActiveView } = useAppStore()

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const color  = project.color ?? '#8B7355'

  const activeView = projectViews.find(v => v.id === activeViewId) ?? projectViews[0] ?? null
  const isKanban   = activeView?.view_type === 'kanban'

  return (
    <div className={`proj-dashboard-root${isKanban ? ' proj-dashboard-root--kanban' : ''}`}>

      {/* Header + tabs — sempre visíveis */}
      <div className="proj-dashboard-top">
        <ProjectHeader project={project} dark={dark} onEdit={onEdit} />

        {projectViews.length > 0 && (
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
              style={{ color: ink2, marginLeft: 'auto', fontSize: 10 }}
              onClick={onNewPage}
            >
              + Página
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className={`proj-dashboard-content${isKanban ? ' proj-dashboard-content--kanban' : ''}`}>
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
            <button className="btn btn-sm" onClick={onNewPage}
              style={{ borderColor: color, color }}>
              + Primeira página
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
