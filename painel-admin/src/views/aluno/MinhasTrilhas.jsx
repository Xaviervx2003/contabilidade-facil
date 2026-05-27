import React, { useState } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CBadge,
  CButton,
  CModal,
  CSpinner,
} from '@coreui/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { toast } from 'react-hot-toast'
import { API_URL } from '../../config'
import api from '../../services/api'
import { getAlunoMatricula } from '../../utils/auth'
import { useTheme } from '../../context/themeContext'
import { buildTokens } from '../../tokens'
import ModalAulaTrilha from './components/ModalAulaTrilha'


/* ─── SCard Component ─── */
const SCard = ({ children, delay = 0, style = {} }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    whileHover={{ y: -4, transition: { duration: 0.2 }, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
    style={{
      background: 'var(--color-bg-elevated)',
      borderRadius: 20,
      padding: '24px',
      border: '1.5px solid var(--color-border)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
      height: '100%',
      ...style
    }}
  >
    {children}
  </motion.div>
)

/* ─── AirbnbProgress ─── */
const AirbnbProgress = ({ value, color = 'var(--accent-primary)' }) => (
  <div style={{ height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 10, overflow: 'hidden' }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 1, ease: 'easeOut' }}
      style={{ height: '100%', background: color, borderRadius: 10 }}
    />
  </div>
)

const MinhasTrilhas = () => {
  const [error, setError] = useState('')
  const [modalAula, setModalAula] = useState(false)
  const [moduloAtivo, setModuloAtivo] = useState(null)
  const [salvando, setSalvando] = useState(null)
  const [filtro, setFiltro] = useState('todas') // todas, progresso, concluida
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { currentPalette } = useTheme()
  const tk = buildTokens(currentPalette)

  const matricula = getAlunoMatricula()

  const { data: trilhas = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['minhasTrilhas', matricula],
    queryFn: async () => {
      const { data } = await api.get(`/api/trilhas/aluno/${matricula}`)
      return data
    },
    enabled: !!matricula,
  })

  const mutationConcluir = useMutation({
    mutationFn: async (moduloId) => {
      await api.post(`/api/trilhas/progresso/${moduloId}`, { matricula })
    },
    onMutate: (id) => setSalvando(id),
    onSuccess: () => {
      toast.success('Progresso salvo!')
      queryClient.invalidateQueries({ queryKey: ['minhasTrilhas', matricula] })
    },
    onSettled: () => setSalvando(null),
  })

  const marcarConcluido = (id) => mutationConcluir.mutate(id)

  const handleAcessarModulo = (m) => {
    if (m.link_video || m.texto_teorico) {
      setModuloAtivo(m); setModalAula(true);
    } else if (m.materia_id || (m.questoes_selecionadas?.length > 0)) {
      const url = m.questoes_selecionadas?.length > 0
        ? `/quiz?ids=${m.questoes_selecionadas.join(',')}&modulo_id=${m.id}`
        : `/quiz?materia_id=${m.materia_id}&modulo_id=${m.id}`
      navigate(url)
    }
  }

  const trilhasFiltradas = trilhas.filter(t => {
    if (filtro === 'concluida') return t.progresso_percentual === 100
    if (filtro === 'progresso') return t.progresso_percentual > 0 && t.progresso_percentual < 100
    return true
  })

  if (loading) {
    return (
      <div style={{ padding: 32, background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ height: 40, width: 300, background: 'var(--color-bg-tertiary)', borderRadius: 10, marginBottom: 12 }} className="animate-pulse" />
          <div style={{ height: 20, width: 450, background: 'var(--color-bg-tertiary)', borderRadius: 10, marginBottom: 48 }} className="animate-pulse" />
          <CRow className="g-4">
            {[1, 2, 3].map(i => <CCol key={i} md={6} lg={4}><div style={{ height: 350, background: 'var(--color-bg-tertiary)', borderRadius: 20 }} className="animate-pulse" /></CCol>)}
          </CRow>
        </div>
      </div>
    )
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
            <div style={{ color: 'var(--accent-primary)', fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Suas Jornadas</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              Minhas Trilhas de Estudo 🚀
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-muted, #767676)', marginTop: 6 }}>
              Siga o caminho estruturado pelos nossos professores para garantir sua aprovação.
            </div>
          </motion.div>

          {/* FILTROS RAPIDOS */}
          <div className="d-flex gap-2 mb-5 overflow-auto pb-2">
            {[
              { id: 'todas', label: 'Todas', icon: 'solar:folder-bold-duotone' },
              { id: 'progresso', label: 'Em Andamento', icon: 'solar:play-bold-duotone' },
              { id: 'concluida', label: 'Concluídas', icon: 'solar:verified-check-bold-duotone' }
            ].map(f => (
              <motion.button
                key={f.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setFiltro(f.id)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 14,
                  border: '1.5px solid',
                  borderColor: filtro === f.id ? 'var(--accent-primary)' : 'var(--color-border)',
                  background: filtro === f.id ? `color-mix(in srgb, var(--accent-primary) 8%, transparent)` : 'var(--color-bg-elevated)',
                  color: filtro === f.id ? 'var(--accent-primary)' : 'var(--color-text-muted, #767676)',
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: '0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon icon={f.icon} width="18" /> {f.label}
              </motion.button>
            ))}
          </div>

          {trilhasFiltradas.length === 0 ? (
            <div className="text-center py-5">
              <Icon icon="solar:ghost-bold-duotone" width="64" style={{ color: 'var(--color-border)', opacity: 0.3 }} />
              <h5 className="mt-3" style={{ color: 'var(--color-text-muted, #767676)' }}>Nenhuma trilha nesta categoria</h5>
            </div>
          ) : (
            <CRow className="g-4">
              {trilhasFiltradas.map((t, i) => {
                const modulos = t.modulos || []
                const proximo = modulos.find(m => !m.concluido) || modulos[0]
                const concluida = t.progresso_percentual === 100

                return (
                  <CCol key={t.id} xs={12} md={6} lg={4}>
                    <SCard delay={i * 0.05} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      {/* Capa da Trilha */}
                      <div style={{ position: 'relative', width: '100%', height: 160, background: t.capa_url ? `url(${t.capa_url}) center/cover no-repeat` : `linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 15%, transparent), color-mix(in srgb, var(--accent-secondary) 15%, transparent))` }}>
                        {!t.capa_url && (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                                <Icon icon="solar:route-bold-duotone" width="64" style={{ color: 'var(--color-border)', opacity: 0.3 }} />
                            </div>
                        )}
                        <CBadge color={concluida ? 'success' : 'primary'} style={{ position: 'absolute', top: 16, right: 16, borderRadius: 8, fontSize: 11, padding: '6px 10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                          {concluida ? 'CONCLUÍDO' : `${t.progresso_percentual}%`}
                        </CBadge>
                      </div>

                      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <h5 className="fw-bold mb-2 text-truncate text-capitalize" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.3px', fontSize: 20 }}>
                          {t.nome}
                        </h5>
                        <p style={{ fontSize: 13, color: 'var(--color-text-muted, #767676)', height: 40, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5, marginBottom: 20 }}>
                          {t.descricao || 'Domine este módulo com videoaulas e questões práticas.'}
                        </p>

                        <div className="mt-auto mb-4">
                          <div className="d-flex justify-content-between small mb-2 fw-bold" style={{ fontSize: 11, color: 'var(--color-text-muted, #767676)', textTransform: 'uppercase' }}>
                            <span>Progresso</span>
                            <span style={{ color: concluida ? 'var(--accent-secondary)' : 'var(--accent-primary)' }}>{t.progresso_percentual}%</span>
                          </div>
                          <AirbnbProgress value={t.progresso_percentual} color={concluida ? 'var(--accent-secondary)' : 'var(--accent-primary)'} />
                        </div>

                        {!concluida && (
                          <div className="p-3 rounded-4 bg-body-tertiary border mb-4 d-flex align-items-center gap-3">
                            <div className="p-2 rounded-circle bg-white shadow-sm border">
                              <Icon icon="solar:play-bold" width="18" style={{ color: 'var(--accent-primary)' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted, #767676)', textTransform: 'uppercase', marginBottom: 2 }}>Próxima Aula</div>
                              <div className="fw-bold text-truncate" style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                                {proximo?.nome || 'Aguardando aulas'}
                              </div>
                            </div>
                          </div>
                        )}

                        {concluida && (
                          <div className="p-3 rounded-4 mb-4 d-flex align-items-center gap-3" style={{ background: `color-mix(in srgb, var(--accent-secondary) 15%, transparent)`, border: `1px solid color-mix(in srgb, var(--accent-secondary) 30%, transparent)` }}>
                            <div className="p-2 rounded-circle shadow-sm" style={{ background: 'var(--accent-secondary)', color: '#fff' }}>
                              <Icon icon="solar:medal-star-bold" width="18" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-secondary)', textTransform: 'uppercase', marginBottom: 2 }}>Parabéns!</div>
                              <div className="fw-bold" style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>Trilha concluída</div>
                            </div>
                          </div>
                        )}

                        <motion.button
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => concluida ? handleAcessarModulo(modulos[0]) : handleAcessarModulo(proximo)}
                          className="w-100 border-0 fw-bold py-3 shadow-sm mt-auto"
                          style={{
                            background: concluida ? 'var(--accent-secondary)' : 'var(--accent-primary)',
                            color: '#fff',
                            borderRadius: 14,
                            fontSize: 15,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: `0 8px 16px color-mix(in srgb, ${concluida ? 'var(--accent-secondary)' : 'var(--accent-primary)'} 30%, transparent)`
                          }}
                        >
                          <Icon icon={concluida ? "solar:restart-bold" : "solar:play-bold"} width="18" />
                          {concluida ? 'Revisar Trilha' : 'Continuar de onde parou'}
                        </motion.button>
                      </div>
                    </SCard>
                  </CCol>
                )
              })}
            </CRow>
          )}
        </div>


        {/* MODAL DE AULA INTEGRADA PREMIUM (AIRBNB CLONE) */}
        <ModalAulaTrilha 
          visible={modalAula} 
          onClose={() => setModalAula(false)} 
          moduloAtivo={moduloAtivo} 
          matricula={matricula} 
          marcarConcluido={marcarConcluido} 
          salvando={salvando} 
        />
      </CContainer>
    </div>
  )
}

export default MinhasTrilhas
