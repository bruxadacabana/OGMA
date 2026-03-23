import React, { useState } from 'react'
import { CosmosLayer } from '../Cosmos/CosmosLayer'
import './Sidebar.css'

export type Section =
  | 'dashboard' | 'projects' | 'calendar'
  | 'library' | 'analytics' | 'settings'

export type SubSection = 'resources' | 'readings'

interface Project {
  id: number
  name: string
  icon?: string
  color?: string
  project_type?: string
}

interface Props {
  active: Section
  activeSub?: SubSection
  projects: Project[]
  dark: boolean
  syncStatus?: 'idle' | 'syncing' | 'ok' | 'error'
  onNavigate: (s: Section) => void
  onNavigateSub: (s: SubSection) => void
  onProjectSelect: (id: number) => void
  onNewProject: () => void
}

const NAV: { key: Section; icon: string; label: string }[] = [
  { key: 'dashboard',  icon: '◉', label: 'Dashboard'     },
  { key: 'projects',   icon: '✦', label: 'Projetos'       },
  { key: 'calendar',   icon: '☽', label: 'Calendário'     },
  { key: 'library',    icon: '✶', label: 'Biblioteca'     },
  { key: 'analytics',  icon: '∿', label: 'Analytics'      },
  { key: 'settings',   icon: '⊛', label: 'Configurações'  },
]

export const Sidebar: React.FC<Props> = ({
  active, activeSub, projects, dark, syncStatus = 'idle',
  onNavigate, onNavigateSub, onProjectSelect, onNewProject,
}) => {
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [libraryOpen,  setLibraryOpen]  = useState(false)

  const ink   = dark ? '#E8DFC8' : '#2C2416'
  const ink2  = dark ? '#8A7A62' : '#9C8E7A'

  return (
    <aside className="sidebar">
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="sidebar-logo" style={{ position: 'relative', overflow: 'hidden', height: 76 }}>
        <CosmosLayer
          width={224} height={76}
          seed="sidebar_logo" density="low" dark={dark}
          style={{ opacity: 0.6, top: 0, left: 0 }}
        />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="sidebar-logo-name" style={{ color: ink }}>OGMA</div>
          <div className="sidebar-logo-sub" style={{ color: ink2 }}>
            PROJETOS · ESTUDOS · LEITURAS
          </div>
        </div>
      </div>

      {/* ── Navegação ────────────────────────────────────── */}
      <nav className="sidebar-nav">
        {NAV.map(({ key, icon, label }) => (
          <React.Fragment key={key}>
            <button
              className={`nav-item${active === key ? ' active' : ''}`}
              onClick={() => {
                onNavigate(key)
                if (key === 'projects') setProjectsOpen(o => !o)
                if (key === 'library')  setLibraryOpen(o => !o)
              }}
            >
              <span className="nav-item-icon">{icon}</span>
              <span>{label}</span>
              {(key === 'projects' || key === 'library') && (
                <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.5 }}>
                  {(key === 'projects' ? projectsOpen : libraryOpen) ? '▾' : '▸'}
                </span>
              )}
            </button>

            {/* Sub-itens de Projetos */}
            {key === 'projects' && projectsOpen && (
              <div className="sidebar-sub-list">
                {projects.length === 0 ? (
                  <span className="nav-sub-item" style={{ fontStyle: 'italic', opacity: 0.5 }}>
                    Nenhum projeto ainda
                  </span>
                ) : (
                  projects.map(p => (
                    <button
                      key={p.id}
                      className="nav-item nav-sub-item"
                      onClick={() => onProjectSelect(p.id)}
                    >
                      <span className="nav-item-icon">{p.icon ?? '◦'}</span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))
                )}
                <button
                  className="nav-item nav-sub-item"
                  style={{ opacity: 0.6 }}
                  onClick={onNewProject}
                >
                  <span className="nav-item-icon">+</span>
                  <span>Novo projeto</span>
                </button>
              </div>
            )}

            {/* Sub-itens de Biblioteca */}
            {key === 'library' && libraryOpen && (
              <div className="sidebar-sub-list">
                {(['resources', 'readings'] as SubSection[]).map(sub => (
                  <button
                    key={sub}
                    className={`nav-item nav-sub-item${activeSub === sub ? ' active' : ''}`}
                    onClick={() => onNavigateSub(sub)}
                  >
                    <span className="nav-item-icon">
                      {sub === 'resources' ? '◇' : '📖'}
                    </span>
                    <span>{sub === 'resources' ? 'Recursos' : 'Leituras'}</span>
                  </button>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* ── Rodapé ───────────────────────────────────────── */}
      <div className="sidebar-footer" style={{ position: 'relative', overflow: 'hidden', height: 48 }}>
        <CosmosLayer
          width={224} height={48}
          seed="sidebar_footer" density="low" dark={dark}
          style={{ opacity: 0.45, top: 0, left: 0 }}
        />
        <div style={{
          position: 'relative', zIndex: 2,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9, letterSpacing: '0.14em',
            color: ink2,
          }}>
            OGMA v0.1.0
          </span>
          {syncStatus !== 'idle' && (
            <span title={{
              syncing: 'A sincronizar…',
              ok:      'Sincronizado',
              error:   'Erro de sincronização',
            }[syncStatus]} style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: {
                syncing: '#D4A820',
                ok:      '#4CAF50',
                error:   '#E53935',
              }[syncStatus],
              boxShadow: syncStatus === 'syncing'
                ? '0 0 4px #D4A82088'
                : syncStatus === 'ok'
                  ? '0 0 4px #4CAF5088'
                  : '0 0 4px #E5393588',
            }} />
          )}
        </div>
      </div>
    </aside>
  )
}
