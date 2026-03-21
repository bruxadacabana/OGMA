import React, { useState } from 'react'
import { Project, Page, PROJECT_TYPE_LABELS, PROJECT_TYPE_ICONS } from '../../types'
import { CosmosLayer } from '../../components/Cosmos/CosmosLayer'
import { useAppStore } from '../../store/useAppStore'
import './ProjectDashboardView.css'

interface Props {
  project:    Project
  dark:       boolean
  onPageOpen: (page: Page) => void
  onEdit:     () => void
  onNewPage:  () => void
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const PAGE_ICONS: Record<string, string> = {
  document: '📄', database: '🗂️', kanban: '📋',
  calendar: '📅', discipline: '🎓',
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

        {/* Botão editar */}
        <button className="btn btn-ghost btn-sm" onClick={onEdit}
          style={{ color: ink2, flexShrink: 0 }}>
          ✎ Editar
        </button>
      </div>
    </div>
  )
}

// ── Seção de páginas ──────────────────────────────────────────────────────────

function PagesSection({ project, pages, dark, onPageOpen, onNewPage }: {
  project: Project; pages: Page[]; dark: boolean;
  onPageOpen: (p: Page) => void; onNewPage: () => void;
}) {
  const color  = project.color ?? '#8B7355'
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  if (pages.length === 0) {
    return (
      <div className="card proj-card proj-card-wide" style={{ background: cardBg, borderColor: border }}>
        <div className="proj-card-title" style={{ color: ink2 }}>PÁGINAS</div>
        <div className="proj-empty" style={{ color: ink2 }}>
          <span style={{ fontSize: 28, opacity: 0.4 }}>✦</span>
          <span style={{ fontStyle: 'italic', fontSize: 12 }}>
            Nenhuma página ainda.
          </span>
          <button className="btn btn-sm" onClick={onNewPage}
            style={{ borderColor: color, color, marginTop: 4 }}>
            + Criar primeira página
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card proj-card proj-card-wide" style={{ background: cardBg, borderColor: border }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="proj-card-title" style={{ color: ink2 }}>PÁGINAS ({pages.length})</div>
        <button className="btn btn-sm" onClick={onNewPage}
          style={{ borderColor: color, color, fontSize: 10 }}>
          + Nova página
        </button>
      </div>
      <div className="pages-list">
        {pages.map((p, i) => (
          <button
            key={p.id}
            className="page-row"
            style={{
              borderColor: border,
              animationDelay: `${i * 0.04}s`,
            }}
            onClick={() => onPageOpen(p)}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>
              {p.icon ?? PAGE_ICONS[p.page_type] ?? '📄'}
            </span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 14,
                fontStyle: 'italic', color: ink,
              }}>
                {p.title}
              </div>
              <div style={{ fontSize: 10, color: ink2, letterSpacing: '0.05em' }}>
                {PAGE_ICONS[p.page_type]} {p.page_type === 'document' ? 'Documento'
                  : p.page_type === 'database' ? 'Database'
                  : p.page_type === 'kanban' ? 'Kanban'
                  : p.page_type === 'calendar' ? 'Calendário'
                  : 'Disciplina'}
              </div>
            </div>
            <span style={{ color: ink2, fontSize: 12 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Seções específicas por tipo ───────────────────────────────────────────────

function GenericSection({ project, pages, dark, onPageOpen, onNewPage }: {
  project: Project; pages: Page[]; dark: boolean;
  onPageOpen: (p: Page) => void; onNewPage: () => void;
}) {
  const color  = project.color ?? '#8B7355'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  return (
    <div className="proj-section-grid">
      {/* Progresso */}
      <div className="card proj-card" style={{ background: cardBg, borderColor: border }}>
        <div className="proj-card-title" style={{ color: ink2 }}>PROGRESSO GERAL</div>
        <div className="proj-progress-bar" style={{ background: border }}>
          <div className="proj-progress-fill" style={{ background: color, width: '0%' }} />
        </div>
        <div style={{ fontSize: 11, color: ink2, marginTop: 4 }}>
          {pages.length} página{pages.length !== 1 ? 's' : ''} criada{pages.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Datas */}
      <div className="card proj-card" style={{ background: cardBg, borderColor: border }}>
        <div className="proj-card-title" style={{ color: ink2 }}>PERÍODO</div>
        <div className="proj-dates">
          <div>
            <div style={{ fontSize: 10, color: ink2 }}>Início</div>
            <div style={{
              fontSize: 13, color: dark ? '#E8DFC8' : '#2C2416',
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
            }}>
              {formatDate(project.date_start)}
            </div>
          </div>
          <div style={{ color: border, fontSize: 16 }}>→</div>
          <div>
            <div style={{ fontSize: 10, color: ink2 }}>Término</div>
            <div style={{
              fontSize: 13, color: dark ? '#E8DFC8' : '#2C2416',
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
            }}>
              {formatDate(project.date_end)}
            </div>
          </div>
        </div>
      </div>

      {/* Páginas */}
      <PagesSection project={project} pages={pages} dark={dark}
        onPageOpen={onPageOpen} onNewPage={onNewPage} />

      {/* Tarefas */}
      <div className="card proj-card proj-card-wide" style={{ background: cardBg, borderColor: border }}>
        <div className="proj-card-title" style={{ color: ink2 }}>TAREFAS E PRAZOS</div>
        <div className="proj-empty" style={{ color: ink2 }}>
          <span style={{ fontSize: 22, opacity: 0.4 }}>☽</span>
          <span style={{ fontStyle: 'italic', fontSize: 12 }}>Nenhuma tarefa pendente.</span>
        </div>
      </div>
    </div>
  )
}

function AcademicSection({ project, pages, dark, onPageOpen, onNewPage }: {
  project: Project; pages: Page[]; dark: boolean;
  onPageOpen: (p: Page) => void; onNewPage: () => void;
}) {
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'
  const color  = project.color ?? '#8B7355'

  const disciplines = pages.filter(p => p.page_type === 'discipline')

  return (
    <div className="proj-section-grid">
      {disciplines.length === 0 ? (
        <div className="card proj-card proj-card-wide" style={{ background: cardBg, borderColor: border }}>
          <div className="proj-card-title" style={{ color: ink2 }}>DISCIPLINAS</div>
          <div className="proj-empty" style={{ color: ink2 }}>
            <span style={{ fontSize: 26, opacity: 0.4 }}>🎓</span>
            <span style={{ fontStyle: 'italic', fontSize: 12 }}>
              Nenhuma disciplina ainda.
            </span>
            <button className="btn btn-sm" onClick={onNewPage}
              style={{ borderColor: color, color, marginTop: 4 }}>
              + Criar disciplina
            </button>
          </div>
        </div>
      ) : (
        <div className="card proj-card proj-card-wide" style={{ background: cardBg, borderColor: border }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="proj-card-title" style={{ color: ink2 }}>
              DISCIPLINAS ({disciplines.length})
            </div>
            <button className="btn btn-sm" onClick={onNewPage}
              style={{ borderColor: color, color, fontSize: 10 }}>
              + Nova disciplina
            </button>
          </div>
          <div className="pages-list">
            {disciplines.map((d, i) => (
              <button key={d.id} className="page-row"
                style={{ borderColor: color + '44', borderLeft: `3px solid ${color}`, animationDelay: `${i * 0.04}s` }}
                onClick={() => onPageOpen(d)}>
                <span style={{ fontSize: 16 }}>{d.icon ?? '🎓'}</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontStyle: 'italic', color: dark ? '#E8DFC8' : '#2C2416' }}>
                    {d.title}
                  </div>
                </div>
                <span style={{ color: ink2, fontSize: 12 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {[
        { title: 'PRÓXIMAS PROVAS',          msg: 'Sem prazos próximos.' },
        { title: 'PRÉ-REQUISITOS PENDENTES', msg: 'Nenhum bloqueio.' },
      ].map(({ title, msg }) => (
        <div key={title} className="card proj-card" style={{ background: cardBg, borderColor: border }}>
          <div className="proj-card-title" style={{ color: ink2 }}>{title}</div>
          <div className="proj-empty" style={{ color: ink2 }}>
            <span style={{ fontStyle: 'italic', fontSize: 12 }}>{msg}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function HealthSection({ project, dark }: { project: Project; dark: boolean }) {
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'
  return (
    <div className="proj-section-grid">
      {[
        { title: 'HÁBITOS DE HOJE', icon: '◉', msg: 'Nenhum hábito cadastrado.' },
        { title: 'STREAK',          icon: '🔥', msg: 'Sem dados de streak.' },
        { title: 'METAS',           icon: '⚑',  msg: 'Nenhuma meta cadastrada.' },
        { title: 'ROTINA SEMANAL',  icon: '☽',  msg: 'Rotina não configurada.' },
      ].map(({ title, icon, msg }) => (
        <div key={title} className="card proj-card" style={{ background: cardBg, borderColor: border }}>
          <div className="proj-card-title" style={{ color: ink2 }}>{title}</div>
          <div className="proj-empty" style={{ color: ink2 }}>
            <span style={{ fontSize: 20, opacity: 0.4 }}>{icon}</span>
            <span style={{ fontStyle: 'italic', fontSize: 12 }}>{msg}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function SoftwareSection({ project, dark }: { project: Project; dark: boolean }) {
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'
  return (
    <div className="proj-section-grid">
      <div className="card proj-card proj-card-wide" style={{ background: cardBg, borderColor: border }}>
        <div className="proj-card-title" style={{ color: ink2 }}>KANBAN — VISÃO GERAL</div>
        <div className="kanban-summary">
          {['Backlog', 'Em Progresso', 'Em Revisão', 'Concluído'].map(col => (
            <div key={col} className="kanban-col-summary" style={{ borderColor: border }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', color: ink2 }}>{col}</div>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', color: ink2 }}>0</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card proj-card" style={{ background: cardBg, borderColor: border }}>
        <div className="proj-card-title" style={{ color: ink2 }}>BUGS ABERTOS</div>
        <div className="proj-empty" style={{ color: ink2 }}>
          <span style={{ fontStyle: 'italic', fontSize: 12 }}>Sem bugs.</span>
        </div>
      </div>
    </div>
  )
}

// ── View principal ────────────────────────────────────────────────────────────

export const ProjectDashboardView: React.FC<Props> = ({
  project, dark, onPageOpen, onEdit, onNewPage,
}) => {
  const pages = useAppStore(s => s.pages)
  const ink2  = dark ? '#8A7A62' : '#9C8E7A'

  return (
    <div className="content-area proj-dashboard">
      <ProjectHeader project={project} dark={dark} onEdit={onEdit} />

      <div className="proj-section-label" style={{ color: ink2 }}>VISÃO GERAL</div>
      <GenericSection project={project} pages={pages} dark={dark}
        onPageOpen={onPageOpen} onNewPage={onNewPage} />

      {project.project_type === 'academic' && (
        <>
          <div className="proj-section-label" style={{ color: ink2 }}>ACADÊMICO</div>
          <AcademicSection project={project} pages={pages} dark={dark}
            onPageOpen={onPageOpen} onNewPage={onNewPage} />
        </>
      )}
      {project.project_type === 'health' && (
        <>
          <div className="proj-section-label" style={{ color: ink2 }}>SAÚDE E HÁBITOS</div>
          <HealthSection project={project} dark={dark} />
        </>
      )}
      {project.project_type === 'software' && (
        <>
          <div className="proj-section-label" style={{ color: ink2 }}>DESENVOLVIMENTO</div>
          <SoftwareSection project={project} dark={dark} />
        </>
      )}
    </div>
  )
}
