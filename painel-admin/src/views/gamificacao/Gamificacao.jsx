import React, { useState } from 'react'
import { CContainer } from '@coreui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'

import Missoes from './Missoes'
import Conquistas from './Conquistas'

/* ─── Tokens Airbnb-inspired ─────────────────────────────── */
const tokens = {
  rausch: '#FF385C',
  babu: '#00A699',
  arches: '#FC642D',
  foggy: '#767676',
}

const Gamificacao = () => {
  const [abaAtiva, setAbaAtiva] = useState('desafios') // desafios, conquistas, ranking

  const renderAba = () => {
    switch (abaAtiva) {
      case 'desafios':
        return <Missoes isTab={true} />
      case 'conquistas':
        return <Conquistas isTab={true} />
      case 'ranking':
        return (
          <div className="text-center py-5">
            <Icon icon="solar:cup-star-bold-duotone" width="64" style={{ color: tokens.foggy, opacity: 0.3 }} />
            <h4 className="mt-3" style={{ color: tokens.foggy }}>Ranking em Breve</h4>
            <p className="text-body-secondary mt-2">Competição saudável com a sua turma! Em desenvolvimento.</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', fontFamily: "'Nunito', sans-serif" }}>
      <CContainer fluid className="px-3 px-md-5" style={{ paddingTop: 32 }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* HEADER PREMIUM IDENTICO AO PAINEL */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 32 }}
          >
            <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Gamificação</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              Desafios & Conquistas 🏆
            </div>
            <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
              Cumpra missões, ganhe XP e desbloqueie emblemas exclusivos.
            </div>
          </motion.div>

          {/* ABAS (TABS) */}
          <div className="d-flex gap-2 mb-4 overflow-auto pb-2 border-bottom" style={{ borderColor: 'var(--color-border)' }}>
            {[
              { id: 'desafios', label: 'Missões & XP', icon: 'solar:target-bold-duotone', color: tokens.rausch },
              { id: 'conquistas', label: 'Meus Emblemas', icon: 'solar:medal-ribbon-star-bold-duotone', color: tokens.babu },
              { id: 'ranking', label: 'Ranking da Turma', icon: 'solar:cup-star-bold-duotone', color: tokens.arches },
            ].map(tab => {
              const isActive = abaAtiva === tab.id
              return (
                <div
                  key={tab.id}
                  onClick={() => setAbaAtiva(tab.id)}
                  style={{
                    cursor: 'pointer',
                    padding: '10px 16px',
                    position: 'relative',
                    color: isActive ? tab.color : tokens.foggy,
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: '-0.2px',
                    transition: '0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon icon={tab.icon} width="20" />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="gamificacao-tab-underline"
                      className="position-absolute bottom-0 start-0 end-0"
                      style={{ height: 3, background: tab.color, borderRadius: '3px 3px 0 0' }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* CONTEÚDO DA ABA */}
          <AnimatePresence mode="wait">
            <motion.div
              key={abaAtiva}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderAba()}
            </motion.div>
          </AnimatePresence>

        </div>
      </CContainer>
    </div>
  )
}

export default Gamificacao
