import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ── Catálogo de ícones ────────────────────────────────────────────────────────

const CATEGORIES: { label: string; icons: string[] }[] = [
  {
    label: 'Académico',
    icons: [
      '📚','📖','📝','📋','📄','📃','🎓','🏫','✏️','📐','📏',
      '📊','📈','📉','📌','📍','🗂️','🗃️','📎','🖇️','📑','🗒️',
    ],
  },
  {
    label: 'Ciência',
    icons: [
      '🔬','🔭','⚗️','🧪','🧬','🧮','🌍','🌐','🗺️','⚙️','🔩',
      '💡','🔋','📡','🧲','🔭','🧿','⚛️',
    ],
  },
  {
    label: 'Tecnologia',
    icons: [
      '💻','🖥️','🖱️','⌨️','📱','🔧','🛠️','🔌','🤖','🖨️',
      '💾','💿','📀','🖲️','🕹️','📟','📠',
    ],
  },
  {
    label: 'Criativo',
    icons: [
      '✍️','🖊️','🖋️','📓','📒','📔','🎨','🖌️','🖼️','🎭',
      '🎬','🎵','🎶','🎤','📸','🎙️','🎞️','🎲',
    ],
  },
  {
    label: 'Saúde & Hábitos',
    icons: [
      '🌿','🍃','💊','🏋️','🧘','🍎','💪','🌱','🫀','🧠',
      '🏃','🚴','🧗','⚽','🏊','🎽','🥗','💧',
    ],
  },
  {
    label: 'Pesquisa',
    icons: [
      '🔍','🔎','📰','🗞️','📜','🗺️','🌐','📡','🧐','🕵️',
      '📂','🗄️','🔐','🔑','🗝️','📋','✔️',
    ],
  },
  {
    label: 'Produtividade',
    icons: [
      '✅','☑️','🏆','🥇','🎯','⏰','📅','📆','🗓️','⌛','⏱️',
      '🚀','💼','🗳️','📩','📨','📬','📭','🔔','🔕','📢',
    ],
  },
  {
    label: 'Natureza & Cosmos',
    icons: [
      '✦','☀️','🌙','⭐','🌟','💫','⚡','🌊','🔥','❄️','🌸',
      '🌺','🍀','🌳','🌲','🦋','🦉','🐉',
    ],
  },
  {
    label: 'Símbolos',
    icons: [
      '◉','✶','◈','◇','◎','∿','⊛','●','○','◆','▲','▼',
      '▸','▾','◐','◑','◒','◓','⬟','⬡','❖','✦','✧',
    ],
  },
]

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  value:    string
  onChange: (icon: string) => void
  dark:     boolean
  size?:    number   // fontSize do botão trigger (default 24)
}

export function IconPicker({ value, onChange, dark, size = 24 }: Props) {
  const [open,    setOpen]    = useState(false)
  const [search,  setSearch]  = useState('')
  const [catIdx,  setCatIdx]  = useState(0)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const bg     = dark ? '#211D16' : '#F5F0E8'
  const cardBg = dark ? '#1A1710' : '#EDE7D9'
  const accent = dark ? '#D4A820' : '#b8860b'

  const PANEL_W = 290
  const PANEL_H = 340

  const openPanel = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const vw   = window.innerWidth
    const vh   = window.innerHeight
    // Posiciona abaixo; se não couber, abre acima
    const top  = rect.bottom + 6 + PANEL_H > vh
      ? rect.top - PANEL_H - 4
      : rect.bottom + 6
    // Alinha à esquerda; se não couber, alinha à direita
    const left = rect.left + PANEL_W > vw
      ? rect.right - PANEL_W
      : rect.left
    setPanelPos({ top, left })
    setOpen(true)
  }, [])

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        panelRef.current && !panelRef.current.contains(t) &&
        triggerRef.current && !triggerRef.current.contains(t)
      ) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Fechar ao rolar ou redimensionar
  useEffect(() => {
    if (!open) return
    const close = () => { setOpen(false); setSearch('') }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [open])

  const filtered = search.trim()
    ? CATEGORIES.flatMap(c => c.icons).filter(ic => ic.startsWith(search) || ic === search)
    : null

  const handleSelect = (icon: string) => {
    onChange(icon)
    setOpen(false)
    setSearch('')
  }

  const panel = open && createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: panelPos.top,
        left: panelPos.left,
        zIndex: 9999,
        background: bg, border: `1px solid ${border}`, borderRadius: 4,
        boxShadow: `4px 4px 0 ${border}`,
        width: PANEL_W, maxHeight: PANEL_H,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Busca */}
      <div style={{ padding: '8px 10px 6px', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
        <input
          autoFocus
          type="text"
          placeholder="Colar emoji ou escrever..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && search.trim()) handleSelect(search.trim())
            if (e.key === 'Escape') { setOpen(false); setSearch('') }
          }}
          style={{
            width: '100%', background: cardBg, border: `1px solid ${border}`,
            borderRadius: 2, padding: '4px 8px', fontSize: 12,
            color: ink, outline: 'none', fontFamily: 'var(--font-mono)',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tabs de categoria */}
      {!search && (
        <div style={{
          display: 'flex', gap: 2, padding: '4px 8px 0',
          borderBottom: `1px solid ${border}`, flexShrink: 0,
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {CATEGORIES.map((cat, i) => (
            <button key={cat.label} onClick={() => setCatIdx(i)} style={{
              fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.06em',
              padding: '3px 6px', border: 'none', borderRadius: '2px 2px 0 0',
              cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
              background: catIdx === i ? cardBg : 'transparent',
              color: catIdx === i ? accent : ink2,
              borderBottom: catIdx === i ? `2px solid ${accent}` : '2px solid transparent',
            }}>
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Grade de ícones */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '8px',
        display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 2, alignContent: 'start',
      }}>
        {(filtered ?? CATEGORIES[catIdx].icons).map(icon => (
          <button
            key={icon}
            onClick={() => handleSelect(icon)}
            title={icon}
            style={{
              fontSize: 20, lineHeight: 1,
              padding: '5px 3px', border: 'none', borderRadius: 3,
              cursor: 'pointer', background: icon === value ? accent + '30' : 'transparent',
              transition: 'background 80ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = ink + '15')}
            onMouseLeave={e => (e.currentTarget.style.background = icon === value ? accent + '30' : 'transparent')}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>,
    document.body
  )

  return (
    <div style={{ display: 'inline-flex' }}>
      <button
        ref={triggerRef}
        style={{
          fontSize: size, lineHeight: 1, cursor: 'pointer',
          background: 'none', border: 'none', padding: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={() => open ? (setOpen(false), setSearch('')) : openPanel()}
        title="Escolher ícone"
        type="button"
      >
        {value || '◦'}
      </button>
      {panel}
    </div>
  )
}
