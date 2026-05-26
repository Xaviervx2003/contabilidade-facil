import React, { useEffect, useState } from 'react'
import { CButton, CContainer, CSpinner } from '@coreui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { API_URL } from '../../config'
import api from '../../services/api'
import { tokens } from '../../tokens'
import useAuthSession from '../../hooks/useAuthSession'

import Missoes from './Missoes'
import Conquistas from './Conquistas'

const RankingTurma = () => {
  const [tipo, setTipo] = useState('streak')
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { matricula } = useAuthSession()

  useEffect(() => {
    let active = true

    const carregarRanking = async () => {
      setLoading(true)
      setError('')

      try {
        const res = await api.get(`/api/aluno/leaderboard?tipo=${tipo}&limite=10`)
        const data = res.data
        if (active) setRanking(Array.isArray(data) ? data : [])
      } catch {
        if (active) {
          setRanking([])
          setError('Não foi possível carregar o ranking agora.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    carregarRanking()
    return () => { active = false }
  }, [tipo])

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
            Ranking da Turma
          </div>
          <div style={{ fontSize: 13, color: tokens.foggy }}>
            Compare sua constância e volume de estudos com a turma.
          </div>
        </div>
        <div className="d-flex bg-body-tertiary p-1 rounded-4 border">
          {[
            { id: 'streak', label: 'Sequência' },
            { id: 'questoes', label: 'Questões' },
          ].map((option) => (
            <CButton
              key={option.id}
              size="sm"
              onClick={() => setTipo(option.id)}
              className="fw-bold border-0"
              style={{
                background: tipo === option.id ? 'var(--color-bg-elevated)' : 'transparent',
                color: tipo === option.id ? tokens.arches : tokens.foggy,
                borderRadius: 12,
                padding: '8px 14px',
              }}
            >
              {option.label}
            </CButton>
          ))}
        </div>
      </div>

      <div style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        overflow: 'hidden',
      }}>
        {loading ? (
          <div className="text-center py-5">
            <CSpinner size="sm" />
          </div>
        ) : error ? (
          <div className="text-center py-5" style={{ color: tokens.foggy }}>
            {error}
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-5" style={{ color: tokens.foggy }}>
            Ainda não há dados suficientes para montar o ranking.
          </div>
        ) : (
          ranking.map((aluno) => {
            const isAtual = matricula && String(aluno.matricula) === String(matricula)
            return (
              <div
                key={`${tipo}-${aluno.matricula}`}
                className="d-flex align-items-center gap-3 p-3 border-bottom"
                style={{
                  background: isAtual ? `${tokens.arches}12` : 'transparent',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-center fw-bold"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: aluno.posicao <= 3 ? `${tokens.arches}18` : 'var(--color-bg-tertiary)',
                    color: aluno.posicao <= 3 ? tokens.arches : tokens.foggy,
                    flexShrink: 0,
                  }}
                >
                  {aluno.posicao}
                </div>
                <div className="flex-grow-1 min-width-0">
                  <div className="fw-bold text-truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {aluno.nome}
                    {isAtual && <span style={{ color: tokens.arches, fontSize: 12 }}> você</span>}
                  </div>
                  <div style={{ color: tokens.foggy, fontSize: 12 }}>
                    {tipo === 'streak' ? 'Dias consecutivos de estudo' : 'Questões respondidas'}
                  </div>
                </div>
                <div className="fw-bold" style={{ color: tokens.arches, fontSize: 20 }}>
                  {aluno.valor}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

const Gamificacao = () => {
  const [abaAtiva, setAbaAtiva] = useState('desafios')

  const renderAba = () => {
    switch (abaAtiva) {
      case 'desafios':
        return <Missoes isTab={true} />
      case 'conquistas':
        return <Conquistas isTab={true} />
      case 'ranking':
        return <RankingTurma />
      default:
        return null
    }
  }

  return (
    <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', fontFamily: "'Nunito', sans-serif" }}>
      <CContainer fluid className="px-3 px-md-5" style={{ paddingTop: 32 }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 32 }}
          >
            <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Gamificação</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              Desafios & Conquistas
            </div>
            <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
              Cumpra missões, ganhe XP e desbloqueie emblemas exclusivos.
            </div>
          </motion.div>

          <div className="d-flex gap-2 mb-4 overflow-auto pb-2 border-bottom" style={{ borderColor: 'var(--color-border)' }}>
            {[
              { id: 'desafios', label: 'Missões & XP', icon: 'solar:target-bold-duotone', color: tokens.rausch },
              { id: 'conquistas', label: 'Meus Emblemas', icon: 'solar:medal-ribbon-star-bold-duotone', color: tokens.babu },
              { id: 'ranking', label: 'Ranking da Turma', icon: 'solar:cup-star-bold-duotone', color: tokens.arches },
            ].map(tab => {
              const isActive = abaAtiva === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAbaAtiva(tab.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
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
                </button>
              )
            })}
          </div>

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
