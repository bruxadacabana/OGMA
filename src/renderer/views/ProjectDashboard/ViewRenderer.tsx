import React from 'react'
import { Page, Project, ProjectView, ProjectProperty } from '../../types'
import { KanbanView } from '../KanbanView/KanbanView'
import { CosmosLayer } from '../../components/Cosmos/CosmosLayer'

export interface ViewRendererProps {
  view:       ProjectView
  project:    Project
  pages:      Page[]
  properties: ProjectProperty[]
  dark:       boolean
  onPageOpen: (page: Page) => void
  onNewPage:  () => void
}

export const ViewRenderer: React.FC<ViewRendererProps> = (props) => {
  switch (props.view.view_type) {
    case 'kanban':   return <KanbanView {...props} />
    case 'table':    return <TableView  {...props} />
    case 'list':     return <ListView   {...props} />
    case 'calendar': return <PlaceholderView label="Calendário" icon="☽" dark={props.dark} />
    case 'gallery':  return <PlaceholderView label="Galeria"    icon="⊞" dark={props.dark} />
    default:         return <ListView   {...props} />
  }
}

// ── TableView ─────────────────────────────────────────────────────────────────

const TableView: React.FC<ViewRendererProps> = ({
  project, pages, properties, dark, onPageOpen, onNewPage,
}) => {
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const color  = project.color ?? '#8B7355'

  const visibleProps = properties.slice(0, 4)

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${border}` }}>
            <th style={{
              padding: '8px 20px', textAlign: 'left',
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em',
              color: ink2, fontWeight: 'normal', textTransform: 'uppercase',
            }}>
              Título
            </th>
            {visibleProps.map(p => (
              <th key={p.id} style={{
                padding: '8px 16px', textAlign: 'left',
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em',
                color: ink2, fontWeight: 'normal', textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pages.map((page, i) => (
            <tr
              key={page.id}
              onClick={() => onPageOpen(page)}
              style={{
                borderBottom: `1px solid ${border}`,
                cursor: 'pointer',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = dark ? 'rgba(232,223,200,0.04)' : 'rgba(44,36,22,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={{ padding: '9px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{page.icon ?? '📄'}</span>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontStyle: 'italic',
                    fontSize: 13, color: ink,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: 280,
                  }}>
                    {page.title}
                  </span>
                </div>
              </td>
              {visibleProps.map(p => {
                const pv = page.prop_values?.find(v => v.property_id === p.id)
                return (
                  <td key={p.id} style={{ padding: '9px 16px' }}>
                    <PropCell pv={pv} propType={p.prop_type} dark={dark} ink2={ink2} border={border} />
                  </td>
                )
              })}
            </tr>
          ))}
          <tr>
            <td colSpan={visibleProps.length + 1} style={{ padding: '6px 20px' }}>
              <button className="btn btn-ghost btn-sm" onClick={onNewPage}
                style={{ color: ink2, fontSize: 11 }}>
                + Nova página
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      {pages.length === 0 && (
        <div style={{
          padding: '40px', textAlign: 'center', color: ink2,
          fontStyle: 'italic', fontSize: 12,
        }}>
          Nenhuma página neste projeto.
        </div>
      )}
    </div>
  )
}

// ── ListView ──────────────────────────────────────────────────────────────────

const ListView: React.FC<ViewRendererProps> = ({
  project, pages, dark, onPageOpen, onNewPage,
}) => {
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'
  const color  = project.color ?? '#8B7355'

  if (pages.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 12, padding: '48px 20px', color: ink2,
      }}>
        <span style={{ fontSize: 32, opacity: 0.4 }}>✦</span>
        <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, color: ink }}>
          Nenhuma página ainda
        </span>
        <button className="btn btn-sm" onClick={onNewPage}
          style={{ borderColor: color, color }}>
          + Criar primeira página
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        marginBottom: 10, padding: '0 0 6px', borderBottom: `1px solid ${border}`,
      }}>
        <button className="btn btn-ghost btn-sm" onClick={onNewPage}
          style={{ color: ink2, fontSize: 10 }}>
          + Nova página
        </button>
      </div>
      <div className="pages-list">
        {pages.map((p, i) => (
          <button
            key={p.id}
            className="page-row"
            style={{ borderColor: border, animationDelay: `${i * 0.04}s` }}
            onClick={() => onPageOpen(p)}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{p.icon ?? '📄'}</span>
            <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 14,
                fontStyle: 'italic', color: ink,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {p.title}
              </div>
              {p.prop_values && p.prop_values.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                  {p.prop_values.filter(pv =>
                    (pv.prop_type === 'select' && pv.value_text) ||
                    (pv.prop_type === 'date'   && pv.value_date)
                  ).slice(0, 3).map(pv => (
                    <span key={pv.id} style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9,
                      letterSpacing: '0.04em', color: ink2,
                    }}>
                      {pv.prop_type === 'date'   ? formatDate(pv.value_date) : pv.value_text}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span style={{ color: ink2, fontSize: 12, flexShrink: 0 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── PlaceholderView ───────────────────────────────────────────────────────────

function PlaceholderView({ label, icon, dark }: { label: string; icon: string; dark: boolean }) {
  const ink  = dark ? '#E8DFC8' : '#2C2416'
  const ink2 = dark ? '#8A7A62' : '#9C8E7A'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, padding: '60px 20px', textAlign: 'center',
      position: 'relative',
    }}>
      <CosmosLayer width={280} height={140} seed={`ph_${label}`}
        density="low" dark={dark}
        style={{ position: 'relative', top: 0, left: 0 }} />
      <span style={{ fontSize: 36, position: 'relative', zIndex: 2 }}>{icon}</span>
      <span style={{
        fontFamily: 'var(--font-display)', fontStyle: 'italic',
        fontSize: 18, color: ink, position: 'relative', zIndex: 2,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: ink2, fontStyle: 'italic', position: 'relative', zIndex: 2 }}>
        Vista em desenvolvimento.
      </span>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short',
    })
  } catch { return iso }
}

function PropCell({ pv, propType, dark, ink2, border }: {
  pv: any; propType: string; dark: boolean; ink2: string; border: string;
}) {
  if (!pv) return <span style={{ color: border, fontSize: 11 }}>—</span>

  if (propType === 'date' && pv.value_date) {
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: ink2, letterSpacing: '0.03em' }}>
        {formatDate(pv.value_date)}
      </span>
    )
  }
  if (propType === 'select' && pv.value_text) {
    return (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em',
        padding: '1px 6px', border: `1px solid ${border}`, borderRadius: 2,
        color: ink2,
      }}>
        {pv.value_text}
      </span>
    )
  }
  if (propType === 'number' && pv.value_num !== null) {
    return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: ink2 }}>{pv.value_num}</span>
  }
  if (propType === 'checkbox') {
    return <span style={{ fontSize: 14, color: ink2 }}>{pv.value_bool ? '☑' : '☐'}</span>
  }
  if (pv.value_text) {
    return (
      <span style={{
        fontSize: 11, color: ink2,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        display: 'block', maxWidth: 160,
      }}>
        {pv.value_text}
      </span>
    )
  }
  return <span style={{ color: border, fontSize: 11 }}>—</span>
}
