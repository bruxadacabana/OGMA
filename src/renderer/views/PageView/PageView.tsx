import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Page, Project, ProjectProperty, PagePropValue, PropOption } from '../../types'
import { CosmosLayer } from '../../components/Cosmos/CosmosLayer'
import { EditorFrame } from '../../components/Editor/EditorFrame'
import { useAppStore } from '../../store/useAppStore'
import { createLogger } from '../../utils/logger'
import './PageView.css'

const log = createLogger('PageView')
const db  = () => (window as any).db

interface Props {
  page:    Page
  project: Project
  dark:    boolean
  onBack:  () => void
}

// ── Painel de propriedades ────────────────────────────────────────────────────

interface PropPanelProps {
  page:       Page
  properties: ProjectProperty[]
  dark:       boolean
  projectId:  number
  onChanged:  () => void
}

function PropPanel({ page, properties, dark, projectId, onChanged }: PropPanelProps) {
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'
  const bg     = dark ? '#1A1610' : '#F5F0E8'

  // Valores locais por property_id
  const [localValues, setLocalValues] = useState<Record<number, PagePropValue>>({})

  // Opções para select/multi_select
  const [propOptions, setPropOptions] = useState<Record<number, PropOption[]>>({})

  // Inicializa ao abrir página
  useEffect(() => {
    const init: Record<number, PagePropValue> = {}
    page.prop_values?.forEach(pv => { init[pv.property_id] = pv })
    setLocalValues(init)
  }, [page.id])

  // Busca opções
  useEffect(() => {
    const selects = properties.filter(p =>
      p.prop_type === 'select' || p.prop_type === 'multi_select'
    )
    if (selects.length === 0) return
    Promise.all(
      selects.map(p =>
        db().properties.getOptions(p.id).then((res: any) => ({
          propId:  p.id,
          options: res?.ok ? (res.data ?? []) : [],
        }))
      )
    ).then(results => {
      const map: Record<number, PropOption[]> = {}
      results.forEach(r => { map[r.propId] = r.options })
      setPropOptions(map)
    })
  }, [properties])

  const setPropValue = useCallback(async (propId: number, field: string, value: any) => {
    // Atualiza local
    setLocalValues(prev => ({
      ...prev,
      [propId]: { ...(prev[propId] ?? {} as any), property_id: propId, [field]: value },
    }))
    // Persiste
    await db().pages.setPropValue({
      page_id:     page.id,
      property_id: propId,
      [field]:     value,
    })
    onChanged()
  }, [page.id, onChanged])

  if (properties.length === 0) return null

  return (
    <div className="page-props-panel" style={{ borderColor: border, background: bg }}>
      {properties.map(prop => {
        const pv      = localValues[prop.id]
        const options = propOptions[prop.id] ?? []
        return (
          <div key={prop.id} className="page-prop-row">
            <span className="page-prop-label" style={{ color: ink2 }}>{prop.name}</span>
            <div className="page-prop-value">
              <PropValueEditor
                prop={prop} pv={pv} options={options}
                onSet={setPropValue}
                dark={dark} ink={ink} ink2={ink2} border={border} cardBg={cardBg}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Editor de valor por tipo ──────────────────────────────────────────────────

interface EditorProps {
  prop:    ProjectProperty
  pv:      PagePropValue | undefined
  options: PropOption[]
  onSet:   (propId: number, field: string, value: any) => void
  dark:    boolean
  ink:     string
  ink2:    string
  border:  string
  cardBg:  string
}

function PropValueEditor({ prop, pv, options, onSet, dark, ink, ink2, border, cardBg }: EditorProps) {
  const [showDrop, setShowDrop] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [textVal,  setTextVal]  = useState(pv?.value_text ?? '')
  const [numVal,   setNumVal]   = useState(pv?.value_num != null ? String(pv.value_num) : '')
  const dropRef = useRef<HTMLDivElement>(null)

  // Sync local state ao trocar de página
  useEffect(() => {
    setTextVal(pv?.value_text ?? '')
    setNumVal(pv?.value_num != null ? String(pv.value_num) : '')
    setEditing(false)
    setShowDrop(false)
  }, [pv?.value_text, pv?.value_num])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    if (!showDrop) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDrop])

  // ── select ────────────────────────────────────────────────────────────────
  if (prop.prop_type === 'select') {
    const current = options.find(o => o.label === pv?.value_text)
    return (
      <div style={{ position: 'relative' }} ref={dropRef}>
        <button
          className="prop-select-btn"
          onClick={() => setShowDrop(v => !v)}
          style={{
            borderColor: current?.color ?? border,
            background:  current?.color ? current.color + '22' : 'transparent',
            color:       current?.color ?? ink2,
          }}
        >
          {current ? (
            <>
              <span className="prop-dot" style={{ background: current.color ?? border }} />
              {current.label}
            </>
          ) : (
            <span style={{ color: border, fontStyle: 'italic' }}>—</span>
          )}
        </button>
        {showDrop && (
          <div className="prop-dropdown" style={{ background: cardBg, borderColor: border }}>
            {options.map(opt => (
              <button
                key={opt.id}
                className="prop-dropdown-item"
                onClick={() => { onSet(prop.id, 'value_text', opt.label); setShowDrop(false) }}
                style={{ color: ink }}
                onMouseEnter={e => (e.currentTarget.style.background = dark ? 'rgba(232,223,200,0.06)' : 'rgba(44,36,22,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="prop-dot" style={{ background: opt.color ?? border }} />
                {opt.label}
              </button>
            ))}
            {pv?.value_text && (
              <button
                className="prop-dropdown-clear"
                onClick={() => { onSet(prop.id, 'value_text', null); setShowDrop(false) }}
                style={{ color: border, borderColor: border }}
              >
                ✕ Limpar
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── multi_select ──────────────────────────────────────────────────────────
  if (prop.prop_type === 'multi_select') {
    const selected: string[] = (() => {
      try { return JSON.parse(pv?.value_json ?? '[]') } catch { return [] }
    })()
    const toggleTag = (label: string) => {
      const next = selected.includes(label)
        ? selected.filter(l => l !== label)
        : [...selected, label]
      onSet(prop.id, 'value_json', JSON.stringify(next))
    }
    return (
      <div style={{ position: 'relative' }} ref={dropRef}>
        <div
          className="prop-tags"
          onClick={() => setShowDrop(v => !v)}
          style={{ cursor: 'pointer', minHeight: 24 }}
        >
          {selected.length > 0 ? selected.map(label => {
            const opt = options.find(o => o.label === label)
            return (
              <span key={label} className="prop-tag"
                style={{ background: opt?.color ? opt.color + '33' : border + '55', color: ink2 }}>
                {label}
              </span>
            )
          }) : <span style={{ color: border, fontStyle: 'italic', fontSize: 11 }}>—</span>}
        </div>
        {showDrop && (
          <div className="prop-dropdown" style={{ background: cardBg, borderColor: border }}>
            {options.map(opt => {
              const active = selected.includes(opt.label)
              return (
                <button
                  key={opt.id}
                  className="prop-dropdown-item"
                  onClick={() => toggleTag(opt.label)}
                  style={{ color: ink, fontWeight: active ? 'bold' : 'normal' }}
                  onMouseEnter={e => (e.currentTarget.style.background = dark ? 'rgba(232,223,200,0.06)' : 'rgba(44,36,22,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{
                    width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                    border: `2px solid ${active ? (opt.color ?? border) : border}`,
                    background: active ? (opt.color ?? border) : 'transparent',
                  }} />
                  {opt.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── text / url ────────────────────────────────────────────────────────────
  if (prop.prop_type === 'text' || prop.prop_type === 'url') {
    const save = () => {
      setEditing(false)
      onSet(prop.id, 'value_text', textVal.trim() || null)
    }
    if (editing) {
      return (
        <input
          autoFocus
          className="prop-text-input"
          value={textVal}
          onChange={e => setTextVal(e.target.value)}
          onBlur={save}
          onKeyDown={e => {
            if (e.key === 'Enter')  save()
            if (e.key === 'Escape') { setEditing(false); setTextVal(pv?.value_text ?? '') }
          }}
          style={{ borderColor: border, color: ink }}
        />
      )
    }
    return (
      <button className="prop-text-btn"
        onClick={() => { setEditing(true); setTextVal(pv?.value_text ?? '') }}
        style={{ color: pv?.value_text ? ink : border }}>
        {pv?.value_text || <span style={{ fontStyle: 'italic' }}>—</span>}
      </button>
    )
  }

  // ── number ────────────────────────────────────────────────────────────────
  if (prop.prop_type === 'number') {
    const save = () => {
      setEditing(false)
      const v = parseFloat(numVal)
      onSet(prop.id, 'value_num', isNaN(v) ? null : v)
    }
    if (editing) {
      return (
        <input
          autoFocus type="number"
          className="prop-text-input"
          value={numVal}
          onChange={e => setNumVal(e.target.value)}
          onBlur={save}
          onKeyDown={e => {
            if (e.key === 'Enter')  save()
            if (e.key === 'Escape') { setEditing(false); setNumVal(pv?.value_num != null ? String(pv.value_num) : '') }
          }}
          style={{ borderColor: border, color: ink, width: 80 }}
        />
      )
    }
    return (
      <button className="prop-text-btn"
        onClick={() => setEditing(true)}
        style={{ color: pv?.value_num != null ? ink : border }}>
        {pv?.value_num != null ? pv.value_num : <span style={{ fontStyle: 'italic' }}>—</span>}
      </button>
    )
  }

  // ── date ──────────────────────────────────────────────────────────────────
  if (prop.prop_type === 'date') {
    return (
      <input
        type="date"
        className="prop-date-input"
        value={pv?.value_date ?? ''}
        onChange={e => onSet(prop.id, 'value_date', e.target.value || null)}
        style={{ borderColor: border, color: pv?.value_date ? ink : border, colorScheme: dark ? 'dark' : 'light' }}
      />
    )
  }

  // ── checkbox ──────────────────────────────────────────────────────────────
  if (prop.prop_type === 'checkbox') {
    const checked = !!pv?.value_bool
    return (
      <button
        className="prop-checkbox"
        onClick={() => onSet(prop.id, 'value_bool', checked ? 0 : 1)}
        style={{ color: checked ? (dark ? '#6A9060' : '#4A6741') : ink2, borderColor: checked ? (dark ? '#6A9060' : '#4A6741') : border }}
      >
        {checked ? '☑' : '☐'}
      </button>
    )
  }

  // ── color ─────────────────────────────────────────────────────────────────
  if (prop.prop_type === 'color') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 16, height: 16, borderRadius: 2, background: pv?.value_text ?? border, border: `1px solid ${border}` }} />
        <input
          type="color"
          value={pv?.value_text ?? '#888888'}
          onChange={e => onSet(prop.id, 'value_text', e.target.value)}
          style={{ width: 24, height: 20, border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
        />
      </div>
    )
  }

  return null
}

// ── PageView principal ────────────────────────────────────────────────────────

export const PageView: React.FC<Props> = ({ page, project, dark, onBack }) => {
  const { projectProperties, loadPages } = useAppStore()
  const [saving,       setSaving]       = useState(false)
  const [lastSaved,    setLastSaved]    = useState<Date | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal,     setTitleVal]     = useState(page.title)
  const [editingIcon,  setEditingIcon]  = useState(false)
  const [iconVal,      setIconVal]      = useState(page.icon ?? '📄')

  // Sync title/icon if page prop changes (e.g., store reload)
  useEffect(() => {
    if (!editingTitle) setTitleVal(page.title)
    if (!editingIcon)  setIconVal(page.icon ?? '📄')
  }, [page.title, page.icon])

  const color  = project.color ?? '#8B7355'
  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const cardBg = dark ? '#211D16' : '#EDE7D9'

  const handleSave = useCallback(async (bodyJson: string) => {
    setSaving(true)
    try {
      await db().pages.update({ id: page.id, body_json: bodyJson })
      setLastSaved(new Date())
      log.debug('page saved', { id: page.id })
    } catch (e: any) {
      log.error('page save failed', { error: e.message })
    } finally {
      setSaving(false)
    }
  }, [page.id])

  const saveTitle = useCallback(async () => {
    setEditingTitle(false)
    const t = titleVal.trim() || 'Sem título'
    setTitleVal(t)
    await db().pages.update({ id: page.id, title: t })
    loadPages(project.id)
  }, [titleVal, page.id, project.id, loadPages])

  const saveIcon = useCallback(async () => {
    setEditingIcon(false)
    const i = iconVal.trim() || '📄'
    setIconVal(i)
    await db().pages.update({ id: page.id, icon: i })
    loadPages(project.id)
  }, [iconVal, page.id, project.id, loadPages])

  const handleDelete = useCallback(async () => {
    if (!window.confirm(`Excluir "${page.title}"? Esta ação pode ser desfeita restaurando do lixo.`)) return
    await db().pages.delete(page.id)
    loadPages(project.id)
    onBack()
  }, [page.id, page.title, project.id, loadPages, onBack])

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
          {/* Ícone editável */}
          {editingIcon ? (
            <input
              autoFocus
              value={iconVal}
              onChange={e => setIconVal(e.target.value)}
              onBlur={saveIcon}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') saveIcon() }}
              style={{
                fontSize: 22, width: 40, textAlign: 'center', padding: '2px',
                border: `1px solid ${border}`, borderRadius: 2,
                background: 'transparent', color: ink, flexShrink: 0,
              }}
              maxLength={4}
            />
          ) : (
            <span
              style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, cursor: 'pointer' }}
              onClick={() => setEditingIcon(true)}
              title="Clique para alterar o ícone"
            >
              {iconVal}
            </span>
          )}

          <div style={{ flex: 1, overflow: 'hidden' }}>
            {/* Título editável */}
            {editingTitle ? (
              <input
                autoFocus
                className="page-title-input"
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter')  saveTitle()
                  if (e.key === 'Escape') { setEditingTitle(false); setTitleVal(page.title) }
                }}
                style={{ color: ink, borderColor: border }}
              />
            ) : (
              <h1
                className="page-title page-title--editable"
                style={{ color: ink }}
                onClick={() => setEditingTitle(true)}
                title="Clique para renomear"
              >
                {titleVal}
              </h1>
            )}

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

          {/* Ações */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDelete}
            title="Excluir página"
            style={{ color: dark ? '#8A4A3A' : '#8B3A2A', flexShrink: 0, fontSize: 14 }}
          >
            🗑
          </button>
        </div>
      </div>

      {/* Painel de propriedades */}
      {projectProperties.length > 0 && (
        <PropPanel
          page={page}
          properties={projectProperties}
          dark={dark}
          projectId={project.id}
          onChanged={() => loadPages(project.id)}
        />
      )}

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
