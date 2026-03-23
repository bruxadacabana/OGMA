import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { fromIpc } from '../../types/errors'
import { IconPicker } from '../../components/UI/IconPicker'
import { appSettings, StoredLocation } from '../../types'
import './SettingsView.css'

const db = () => (window as any).db

interface Props {
  dark: boolean
  onToggleTheme: () => void
}

interface GeoResult {
  name:         string
  admin1:       string
  country:      string
  country_code: string
  latitude:     number
  longitude:    number
  timezone:     string
}

export function SettingsView({ dark, onToggleTheme }: Props) {
  const { workspace, loadWorkspace, pushToast } = useAppStore()

  const [name,        setName]        = useState('')
  const [icon,        setIcon]        = useState('')
  const [accentColor, setAccentColor] = useState('#b8860b')
  const [saved,       setSaved]       = useState(false)
  const [saving,      setSaving]      = useState(false)

  // Planner
  const [dailyHours,      setDailyHours]      = useState('4')
  const [dailyHoursSaved, setDailyHoursSaved] = useState(false)

  useEffect(() => {
    fromIpc<any>(() => db().config.get('planner_daily_hours'), 'getDailyHours')
      .then(r => { if (r.isOk() && r.value?.value) setDailyHours(r.value.value) })
  }, [])

  const saveDailyHours = async () => {
    const val = Math.min(24, Math.max(0.5, parseFloat(dailyHours) || 4))
    await fromIpc(() => db().config.set('planner_daily_hours', String(val)), 'setDailyHours')
    setDailyHours(String(val))
    setDailyHoursSaved(true)
    setTimeout(() => setDailyHoursSaved(false), 2000)
  }

  // Localização
  const [locQuery,     setLocQuery]     = useState('')
  const [locResults,   setLocResults]   = useState<GeoResult[]>([])
  const [locSearching, setLocSearching] = useState(false)
  const [savedLoc,     setSavedLoc]     = useState<StoredLocation | null>(null)

  useEffect(() => {
    appSettings().get('location').then(loc => setSavedLoc(loc ?? null))
  }, [])

  const searchLocation = async () => {
    if (!locQuery.trim()) return
    setLocSearching(true)
    setLocResults([])
    try {
      const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locQuery.trim())}&count=6&language=pt&format=json`)
      const data = await res.json()
      setLocResults(data.results ?? [])
    } catch {
      pushToast({ kind: 'error', title: 'Erro na busca', detail: 'Verifique sua conexão.' })
    }
    setLocSearching(false)
  }

  const saveLocation = (r: GeoResult) => {
    const loc: StoredLocation = {
      city:         r.name,
      admin1:       r.admin1 ?? '',
      country:      r.country,
      country_code: r.country_code,
      latitude:     r.latitude,
      longitude:    r.longitude,
      hemisphere:   r.latitude >= 0 ? 'north' : 'south',
      timezone:     r.timezone ?? 'UTC',
    }
    appSettings().set('location', loc)
    setSavedLoc(loc)
    setLocResults([])
    setLocQuery('')
  }

  const clearLocation = () => {
    appSettings().set('location', null)
    setSavedLoc(null)
  }

  // Sincronizar com store
  useEffect(() => {
    if (!workspace) return
    setName(workspace.name)
    setIcon(workspace.icon ?? '✦')
    setAccentColor(workspace.accent_color ?? '#b8860b')
  }, [workspace])

  const handleSave = async () => {
    if (!workspace) return
    setSaving(true)
    const result = await fromIpc<unknown>(
      () => db().workspace.update({
        id:           workspace.id,
        name:         name.trim() || 'Meu Workspace',
        icon:         icon.trim() || '✦',
        accent_color: accentColor,
      }),
      'updateWorkspace',
    )
    setSaving(false)
    if (result.isErr()) {
      pushToast({ kind: 'error', title: 'Erro ao guardar workspace', detail: result.error.message })
      return
    }
    await loadWorkspace()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const dirty = workspace
    && (name !== workspace.name
     || icon !== (workspace.icon ?? '✦')
     || accentColor !== (workspace.accent_color ?? '#b8860b'))

  return (
    <div className="settings-root">
      <div className="settings-header">
        <h1 className="settings-title">Configurações</h1>
        <div className="settings-subtitle">OGMA · WORKSPACE</div>
      </div>

      {/* ── Workspace ── */}
      <div className="settings-section">
        <div className="settings-section-label">Workspace</div>
        <div className="settings-card">

          <div className="settings-row">
            <span className="settings-row-label">Nome</span>
            <div className="settings-row-control">
              <input
                className="settings-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Meu Workspace"
                maxLength={64}
              />
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-row-label">Ícone</span>
            <div className="settings-row-control">
              <IconPicker value={icon} onChange={setIcon} dark={dark} size={22} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>
                clique para escolher
              </span>
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-row-label">Cor de destaque</span>
            <div className="settings-row-control">
              <div className="settings-color-wrapper">
                <div className="settings-color-swatch" style={{ background: accentColor }} />
                <input
                  type="color" className="settings-color-input"
                  value={accentColor} onChange={e => setAccentColor(e.target.value)}
                  title="Escolher cor"
                />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.06em' }}>
                {accentColor}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', fontStyle: 'italic', marginLeft: 4 }}>
                (aplicado na próxima sessão)
              </span>
            </div>
          </div>

        </div>

        <div className="settings-save-row" style={{ marginTop: 10 }}>
          {saved && <span className="settings-saved-msg" style={{ marginRight: 12 }}>✓ Guardado</span>}
          <button
            className="btn btn-sm"
            style={{ borderColor: dirty ? 'var(--accent)' : 'var(--rule)', color: dirty ? 'var(--accent)' : 'var(--ink-faint)' }}
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? 'A guardar…' : 'Guardar alterações'}
          </button>
        </div>
      </div>

      {/* ── Planner ── */}
      <div className="settings-section">
        <div className="settings-section-label">Planner</div>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-row-label">Capacidade diária</span>
            <div className="settings-row-control" style={{ gap: 8 }}>
              <input
                type="number" min="0.5" max="24" step="0.5"
                className="settings-input" value={dailyHours}
                onChange={e => setDailyHours(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveDailyHours()}
                style={{ width: 70 }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
                horas/dia
              </span>
              <button className="btn btn-sm" onClick={saveDailyHours} style={{ marginLeft: 4 }}>
                {dailyHoursSaved ? '✓ Guardado' : 'Guardar'}
              </button>
            </div>
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', marginTop: 8, fontStyle: 'italic' }}>
            Máximo de horas de trabalho por dia usado pelo algoritmo de agendamento.
          </p>
        </div>
      </div>

      {/* ── Localização ── */}
      <div className="settings-section">
        <div className="settings-section-label">Localização</div>
        <div className="settings-card">

          {savedLoc && (
            <>
              <div className="settings-about-row">
                <span className="settings-about-key">Cidade</span>
                <span className="settings-about-val">
                  {savedLoc.city}{savedLoc.admin1 ? `, ${savedLoc.admin1}` : ''}, {savedLoc.country}
                </span>
              </div>
              <div className="settings-about-row" style={{ marginBottom: 14 }}>
                <span className="settings-about-key">Hemisfério</span>
                <span className="settings-about-val">
                  {savedLoc.hemisphere === 'north' ? '☽ Norte' : '☾ Sul'}
                  {' '}·{' '}{savedLoc.latitude.toFixed(2)}°, {savedLoc.longitude.toFixed(2)}°
                </span>
              </div>
            </>
          )}

          <div className="settings-row">
            <span className="settings-row-label">Buscar cidade</span>
            <div className="settings-row-control" style={{ gap: 8 }}>
              <input
                className="settings-input" value={locQuery}
                onChange={e => setLocQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchLocation()}
                placeholder="Ex: São Paulo, Belo Horizonte…"
                style={{ flex: 1 }}
              />
              <button
                className="btn btn-sm" onClick={searchLocation}
                disabled={locSearching || !locQuery.trim()} style={{ flexShrink: 0 }}
              >
                {locSearching ? '…' : 'Buscar'}
              </button>
            </div>
          </div>

          {locResults.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {locResults.map((r, i) => (
                <button
                  key={i} className="btn btn-sm"
                  style={{ textAlign: 'left', justifyContent: 'flex-start', gap: 8 }}
                  onClick={() => saveLocation(r)}
                >
                  <span>{r.name}{r.admin1 ? `, ${r.admin1}` : ''}, {r.country}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)', marginLeft: 'auto' }}>
                    {r.latitude.toFixed(2)}°, {r.longitude.toFixed(2)}°
                    {' · '}{r.latitude >= 0 ? 'Norte' : 'Sul'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {savedLoc && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--ink-faint)', marginTop: 10 }}
              onClick={clearLocation}
            >
              Remover localização
            </button>
          )}

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', marginTop: 12, fontStyle: 'italic' }}>
            Usado na Roda do Ano (hemisfério) e na previsão do tempo.
          </p>
        </div>
      </div>


      {/* ── Aparência ── */}
      <div className="settings-section">
        <div className="settings-section-label">Aparência</div>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-row-label">Tema</span>
            <div className="settings-row-control">
              <div className="settings-theme-toggle">
                <button
                  className={`settings-theme-btn${!dark ? ' settings-theme-btn--active' : ''}`}
                  onClick={() => dark && onToggleTheme()}
                >☀ Claro</button>
                <button
                  className={`settings-theme-btn${dark ? ' settings-theme-btn--active' : ''}`}
                  onClick={() => !dark && onToggleTheme()}
                >☽ Escuro</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Atalhos ── */}
      <div className="settings-section">
        <div className="settings-section-label">Atalhos de teclado</div>
        <div className="settings-card">
          {[
            ['Busca global',        'Ctrl + K'],
            ['Alternar tema',       '☽ / ☀ na barra superior'],
            ['Fechar modal / sair', 'Esc'],
            ['Navegar resultados',  '↑ ↓'],
            ['Abrir selecionado',   '↵ Enter'],
          ].map(([action, key]) => (
            <div className="settings-about-row" key={action}>
              <span className="settings-about-key">{action}</span>
              <span className="settings-about-val">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sobre ── */}
      <div className="settings-section">
        <div className="settings-section-label">Sobre</div>
        <div className="settings-card">
          {[
            ['Aplicativo',    'OGMA'],
            ['Versão',        '0.1.0'],
            ['Plataforma',    'Electron + React'],
            ['Base de dados', 'SQLite (better-sqlite3)'],
          ].map(([k, v]) => (
            <div className="settings-about-row" key={k}>
              <span className="settings-about-key">{k}</span>
              <span className="settings-about-val">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
