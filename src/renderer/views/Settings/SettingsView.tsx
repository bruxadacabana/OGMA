import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { fromIpc } from '../../types/errors'
import './SettingsView.css'

const db = () => (window as any).db

interface Props {
  dark: boolean
  onToggleTheme: () => void
}

export function SettingsView({ dark, onToggleTheme }: Props) {
  const { workspace, loadWorkspace, pushToast } = useAppStore()

  const [name,        setName]        = useState('')
  const [icon,        setIcon]        = useState('')
  const [accentColor, setAccentColor] = useState('#b8860b')
  const [saved,       setSaved]       = useState(false)
  const [saving,      setSaving]      = useState(false)

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
              <input
                className="settings-input-icon"
                value={icon}
                onChange={e => setIcon(e.target.value)}
                maxLength={2}
                title="Emoji ou símbolo"
              />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink-faint)',
              }}>
                emoji ou símbolo
              </span>
            </div>
          </div>

          <div className="settings-row">
            <span className="settings-row-label">Cor de destaque</span>
            <div className="settings-row-control">
              <div className="settings-color-wrapper">
                <div
                  className="settings-color-swatch"
                  style={{ background: accentColor }}
                />
                <input
                  type="color"
                  className="settings-color-input"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  title="Escolher cor"
                />
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--ink-faint)',
                letterSpacing: '0.06em',
              }}>
                {accentColor}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--ink-faint)',
                fontStyle: 'italic',
                marginLeft: 4,
              }}>
                (aplicado na próxima sessão)
              </span>
            </div>
          </div>

        </div>

        <div className="settings-save-row" style={{ marginTop: 10 }}>
          {saved && (
            <span className="settings-saved-msg" style={{ marginRight: 12 }}>
              ✓ Guardado
            </span>
          )}
          <button
            className="btn btn-sm"
            style={{
              borderColor: dirty ? 'var(--accent)' : 'var(--rule)',
              color: dirty ? 'var(--accent)' : 'var(--ink-faint)',
            }}
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? 'A guardar…' : 'Guardar alterações'}
          </button>
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
                >
                  ☀ Claro
                </button>
                <button
                  className={`settings-theme-btn${dark ? ' settings-theme-btn--active' : ''}`}
                  onClick={() => !dark && onToggleTheme()}
                >
                  ☽ Escuro
                </button>
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
            ['Aplicativo', 'OGMA'],
            ['Versão',     '0.1.0'],
            ['Plataforma', 'Electron + React'],
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
