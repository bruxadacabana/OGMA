import React, { useState, useRef, useEffect } from 'react'

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
  const ref = useRef<HTMLDivElement>(null)

  const ink    = dark ? '#E8DFC8' : '#2C2416'
  const ink2   = dark ? '#8A7A62' : '#9C8E7A'
  const border = dark ? '#3A3020' : '#C4B9A8'
  const bg     = dark ? '#211D16' : '#F5F0E8'
  const cardBg = dark ? '#1A1710' : '#EDE7D9'
  const accent = dark ? '#D4A820' : '#b8860b'

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Filtrar por busca
  const filtered = search.trim()
    ? CATEGORIES.flatMap(c => c.icons).filter(ic =>
        // Simples: mantém todos (busca de emoji por texto é inviável sem lib)
        // Aqui filtramos pelo valor digitado se for emoji directo
        ic.startsWith(search) || ic === search
      )
    : null

  const handleSelect = (icon: string) => {
    onChange(icon)
    setOpen(false)
    setSearch('')
  }

  const btnStyle: React.CSSProperties = {
    fontSize: size, lineHeight: 1, cursor: 'pointer',
    background: 'none', border: 'none', padding: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Trigger */}
      <button
        style={btnStyle}
        onClick={() => setOpen(o => !o)}
        title="Escolher ícone"
        type="button"
      >
        {value || '◦'}
      </button>

      {/* Painel */}
      {open && (
        <div style={{
          position: 'absolute', top: size + 6, left: 0, zIndex: 200,
          background: bg, border: `1px solid ${border}`, borderRadius: 4,
          boxShadow: `4px 4px 0 ${border}`,
          width: 290, maxHeight: 340, display: 'flex', flexDirection: 'column',
        }}>
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
        </div>
      )}
    </div>
  )
}
