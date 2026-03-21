import React, { useEffect, useState } from 'react'
import { CosmosLayer } from '../Cosmos/CosmosLayer'
import './SplashScreen.css'

interface Props {
  onDone: () => void
  dark?: boolean
}

const MESSAGES = [
  'Abrindo o grimório...',
  'Alinhando os astros...',
  'Preparando a jornada...',
  'Bem-vinda ao OGMA...',
]

export const SplashScreen: React.FC<Props> = ({ onDone, dark = false }) => {
  const [phase, setPhase]   = useState<'in' | 'show' | 'out'>('in')
  const [msgIdx, setMsgIdx] = useState(0)
  const [dots, setDots]     = useState(1)

  useEffect(() => {
    // Fade in
    const t1 = setTimeout(() => setPhase('show'), 50)

    // Rotacionar mensagens
    const msgTimer = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length)
      setDots(d => d < 5 ? d + 1 : 1)
    }, 700)

    // Fade out após 3.2s
    const t2 = setTimeout(() => setPhase('out'), 3200)
    const t3 = setTimeout(() => onDone(), 3800)

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      clearInterval(msgTimer)
    }
  }, [onDone])

  const paperBg = dark ? '#1A1610' : '#F5F0E8'
  const border  = dark ? '#3A3020' : '#C4B9A8'
  const ink     = dark ? '#E8DFC8' : '#2C2416'
  const ink2    = dark ? '#8A7A62' : '#9C8E7A'
  const accent  = dark ? '#D4A820' : '#b8860b'

  return (
    <div className={`splash-overlay splash-${phase}`}>
      <div
        className="splash-card"
        style={{ background: paperBg, borderColor: border }}
      >
        {/* Cosmos de fundo */}
        <CosmosLayer width={520} height={340} seed="ogma_splash"
          density="high" dark={dark} />

        {/* Linha de margem */}
        <div className="splash-margin" style={{ background: 'rgba(160,50,30,0.22)' }} />

        {/* Logo */}
        <div className="splash-logo" style={{ color: ink }}>
          OGMA
        </div>

        {/* Subtítulo */}
        <div className="splash-sub" style={{ color: ink2 }}>
          GERENCIADOR DE PROJETOS E ESTUDOS
        </div>

        {/* Divisor */}
        <div className="splash-divider" style={{ background: border }} />

        {/* Mensagem de loading */}
        <div className="splash-status" style={{ color: ink2 }}>
          {MESSAGES[msgIdx]}
        </div>

        {/* Dots animados */}
        <div className="splash-dots" style={{ color: accent }}>
          {'· '.repeat(dots).trim()}
        </div>

        {/* Versão */}
        <div className="splash-version" style={{ color: ink2 }}>v0.1.0</div>
      </div>
    </div>
  )
}
