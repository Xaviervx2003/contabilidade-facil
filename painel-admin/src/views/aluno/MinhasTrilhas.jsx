import React, { useState } from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CBadge,
  CButton,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CSpinner,
  CFormTextarea,
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
import { tokens } from '../../tokens'

/* ─── Helpers ─── */
const getEmbedUrl = (url) => {
  if (!url) return ''
  if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/')
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/')
  return url
}

const formatIsoToDateString = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR')
}

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
const AirbnbProgress = ({ value, color = tokens.rausch }) => (
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
  const [abaAtiva, setAbaAtiva] = useState('aula')
  const [novaDuvida, setNovaDuvida] = useState('')
  const [enviandoDuvida, setEnviandoDuvida] = useState(false)
  const [filtro, setFiltro] = useState('todas') // todas, progresso, concluida
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isDark = useTheme().isDark

  const matricula = getAlunoMatricula()

  const { data: trilhas = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['minhasTrilhas', matricula],
    queryFn: async () => {
      const { data } = await api.get(`/api/trilhas/aluno/${matricula}`)
      return data
    },
    enabled: !!matricula,
  })

  const { data: duvidas = [], refetch: refetchDuvidas } = useQuery({
    queryKey: ['duvidasModulo', moduloAtivo?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/trilhas/modulos/${moduloAtivo.id}/duvidas`)
      return data
    },
    enabled: !!moduloAtivo && abaAtiva === 'duvidas',
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

  const mutationDuvida = useMutation({
    mutationFn: async ({ moduloId, texto }) => {
      const { data } = await api.post(`/api/trilhas/modulos/${moduloId}/duvidas`, { matricula, texto })
      return data
    },
    onMutate: () => setEnviandoDuvida(true),
    onSuccess: () => {
      toast.success('Comentário enviado!')
      setNovaDuvida('')
      refetchDuvidas()
    },
    onSettled: () => setEnviandoDuvida(false),
  })

  const enviarDuvida = () => {
    if (!novaDuvida.trim()) return
    mutationDuvida.mutate({ moduloId: moduloAtivo.id, texto: novaDuvida })
  }

  const marcarConcluido = (id) => mutationConcluir.mutate(id)

  const handleAcessarModulo = (m) => {
    if (m.link_video || m.texto_teorico) {
      setModuloAtivo(m); setAbaAtiva('aula'); setModalAula(true);
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
            <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Suas Jornadas</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              Minhas Trilhas de Estudo 🚀
            </div>
            <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
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
                  borderColor: filtro === f.id ? tokens.rausch : 'var(--color-border)',
                  background: filtro === f.id ? `${tokens.rausch}08` : 'var(--color-bg-elevated)',
                  color: filtro === f.id ? tokens.rausch : tokens.foggy,
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
              <Icon icon="solar:ghost-bold-duotone" width="64" style={{ color: tokens.swiss, opacity: 0.3 }} />
              <h5 className="mt-3" style={{ color: tokens.foggy }}>Nenhuma trilha nesta categoria</h5>
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
                      <div style={{ position: 'relative', width: '100%', height: 160, background: t.capa_url ? `url(${t.capa_url}) center/cover no-repeat` : `linear-gradient(135deg, ${tokens.rausch}15, ${tokens.babu}15)` }}>
                        {!t.capa_url && (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                                <Icon icon="solar:route-bold-duotone" width="64" style={{ color: tokens.swiss, opacity: 0.3 }} />
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
                        <p style={{ fontSize: 13, color: tokens.foggy, height: 40, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5, marginBottom: 20 }}>
                          {t.descricao || 'Domine este módulo com videoaulas e questões práticas.'}
                        </p>

                        <div className="mt-auto mb-4">
                          <div className="d-flex justify-content-between small mb-2 fw-bold" style={{ fontSize: 11, color: tokens.foggy, textTransform: 'uppercase' }}>
                            <span>Progresso</span>
                            <span style={{ color: concluida ? tokens.babu : tokens.rausch }}>{t.progresso_percentual}%</span>
                          </div>
                          <AirbnbProgress value={t.progresso_percentual} color={concluida ? tokens.babu : tokens.rausch} />
                        </div>

                        {!concluida && (
                          <div className="p-3 rounded-4 bg-body-tertiary border mb-4 d-flex align-items-center gap-3">
                            <div className="p-2 rounded-circle bg-white shadow-sm border">
                              <Icon icon="solar:play-bold" width="18" style={{ color: tokens.rausch }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: tokens.foggy, textTransform: 'uppercase', marginBottom: 2 }}>Próxima Aula</div>
                              <div className="fw-bold text-truncate" style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                                {proximo?.nome || 'Aguardando aulas'}
                              </div>
                            </div>
                          </div>
                        )}

                        {concluida && (
                          <div className="p-3 rounded-4 mb-4 d-flex align-items-center gap-3" style={{ background: `${tokens.babu}15`, border: `1px solid ${tokens.babu}30` }}>
                            <div className="p-2 rounded-circle shadow-sm" style={{ background: tokens.babu, color: '#fff' }}>
                              <Icon icon="solar:medal-star-bold" width="18" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, fontWeight: 800, color: tokens.babu, textTransform: 'uppercase', marginBottom: 2 }}>Parabéns!</div>
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
                            background: concluida ? tokens.babu : tokens.rausch,
                            color: '#fff',
                            borderRadius: 14,
                            fontSize: 15,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: `0 8px 16px ${concluida ? tokens.babu : tokens.rausch}30`
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
        <CModal
          visible={modalAula}
          onClose={() => setModalAula(false)}
          size="xl"
          backdrop="static"
          scrollable
          className="modal-premium"
        >
          <div style={{ display: 'contents', fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
          <CModalHeader className="border-0 pb-0 pt-4 px-4 bg-body-elevated" style={{ backdropFilter: 'blur(12px)', background: 'rgba(var(--color-bg-elevated-rgb), 0.85)' }}>
            <div className="w-100">
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="px-2 py-1 rounded-pill fw-bold" style={{ background: 'rgba(255, 56, 92, 0.12)', color: '#FF385C', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  {moduloAtivo?.ordem}º Módulo
                </span>
                <span style={{ fontSize: 11, color: '#767676', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Aula de Contabilidade Fácil
                </span>
              </div>
              <h4 className="fw-bold mb-3" style={{ fontSize: 26, letterSpacing: '-0.8px', color: 'var(--color-text-primary)', lineHeight: 1.1 }}>
                {moduloAtivo?.nome}
              </h4>

              <div className="d-flex gap-4 border-bottom mt-2">
                <div
                  onClick={() => setAbaAtiva('aula')}
                  style={{
                    cursor: 'pointer', paddingBottom: 10, position: 'relative',
                    color: abaAtiva === 'aula' ? '#FF385C' : '#767676',
                    fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px',
                    transition: '0.2s'
                  }}
                >
                  <Icon icon="solar:play-circle-bold-duotone" className="me-1" width="18" /> Vídeo Aula
                  {abaAtiva === 'aula' && (
                    <motion.div
                      layoutId="tab-underline"
                      className="position-absolute bottom-0 start-0 end-0"
                      style={{ height: 3, background: '#FF385C', borderRadius: '3px 3px 0 0' }}
                    />
                  )}
                </div>
                <div
                  onClick={() => setAbaAtiva('duvidas')}
                  style={{
                    cursor: 'pointer', paddingBottom: 10, position: 'relative',
                    color: abaAtiva === 'duvidas' ? '#FF385C' : '#767676',
                    fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px',
                    transition: '0.2s'
                  }}
                >
                  <Icon icon="solar:chat-round-dots-bold-duotone" className="me-1" width="18" /> Dúvidas
                  {duvidas.length > 0 && <span className="ms-2 px-2 py-0.5 rounded-pill bg-danger text-white" style={{ fontSize: 10 }}>{duvidas.length}</span>}
                  {abaAtiva === 'duvidas' && (
                    <motion.div
                      layoutId="tab-underline"
                      className="position-absolute bottom-0 start-0 end-0"
                      style={{ height: 3, background: '#FF385C', borderRadius: '3px 3px 0 0' }}
                    />
                  )}
                </div>
              </div>
            </div>
          </CModalHeader>

          <CModalBody className="p-0 bg-body-elevated">
            {abaAtiva === 'aula' ? (
              <div className="row g-0">
                <div className={moduloAtivo?.texto_teorico ? "col-12 col-lg-8" : "col-12"}>
                  {moduloAtivo?.link_video ? (
                    <div className="ratio ratio-16x9 bg-black shadow-lg overflow-hidden border-bottom">
                      <iframe
                        src={getEmbedUrl(moduloAtivo.link_video)}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="p-5 text-center d-flex flex-column align-items-center justify-content-center bg-body-tertiary" style={{ minHeight: 400 }}>
                      <Icon icon="solar:document-text-bold-duotone" width="64" style={{ color: '#B0B0B0' }} className="mb-3" />
                      <h5 className="fw-bold" style={{ letterSpacing: '-0.5px' }}>Conteúdo Teórico</h5>
                      <p className="text-body-secondary small">Acompanhe a leitura e o material de apoio abaixo.</p>
                    </div>
                  )}
                </div>

                {moduloAtivo?.texto_teorico && (
                  <div className="col-12 col-lg-4 border-start bg-body-elevated">
                    <div className="p-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                      {moduloAtivo?.material_apoio_url && (
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="mb-4 p-3 rounded-4"
                          style={{ background: 'rgba(0, 166, 153, 0.08)', border: '1.5px solid rgba(0, 166, 153, 0.15)' }}
                        >
                          <h6 className="fw-bold mb-2" style={{ color: '#00A699', fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Material de Estudo</h6>
                          <CButton
                            href={moduloAtivo.material_apoio_url}
                            target="_blank"
                            className="w-100 fw-bold border-0 shadow-sm"
                            style={{ background: '#00A699', color: '#fff', borderRadius: 12, fontSize: 14, padding: '10px' }}
                          >
                            <Icon icon="solar:cloud-download-bold-duotone" className="me-2" width="18" /> Baixar PDF / Slides
                          </CButton>
                        </motion.div>
                      )}

                      <h6 style={{ fontSize: 11, fontWeight: 700, color: '#767676', textTransform: 'uppercase', letterSpacing: '1px' }} className="mb-3">
                        Resumo da Aula
                      </h6>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.75', fontSize: '15px', color: 'var(--color-text-primary)', letterSpacing: '-0.1px' }}>
                        {moduloAtivo.texto_teorico}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4" style={{ minHeight: '400px' }}>
                <div className="mb-4">
                  <h6 className="fw-bold mb-3" style={{ fontSize: 16, letterSpacing: '-0.4px' }}>Sua dúvida ou comentário:</h6>
                  <div className="d-flex flex-column gap-3">
                    <CFormTextarea
                      placeholder="O que você achou desta aula?"
                      rows={3}
                      value={novaDuvida}
                      onChange={(e) => setNovaDuvida(e.target.value)}
                      className="border-0 bg-body-tertiary rounded-4 p-3 shadow-none"
                      style={{ fontSize: 15, border: '1.5px solid var(--color-border)' }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="align-self-end fw-bold px-4 py-2 border-0 shadow-sm"
                      style={{ background: '#FF385C', color: '#fff', borderRadius: 12, fontSize: 15 }}
                      onClick={enviarDuvida}
                      disabled={enviandoDuvida}
                    >
                      {enviandoDuvida ? <CSpinner size="sm" /> : 'Publicar Comentário'}
                    </motion.button>
                  </div>
                </div>

                <div className="mt-5">
                  <h6 className="fw-bold border-bottom pb-2 mb-4 d-flex align-items-center gap-2" style={{ fontSize: 16, letterSpacing: '-0.4px' }}>
                    <Icon icon="solar:chat-square-dots-bold-duotone" style={{ color: '#FF385C' }} width="20" />
                    Comentários da Turma ({duvidas.length})
                  </h6>
                  <div className="d-flex flex-column gap-3">
                    {duvidas.length === 0 ? (
                      <div className="text-center py-4 text-body-secondary italic small">Ainda não há comentários nesta aula.</div>
                    ) : duvidas.map((d, i) => (
                      <motion.div
                        key={d.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -2 }}
                        className="p-3 rounded-4 bg-body-tertiary border shadow-sm"
                        style={{ border: '1px solid var(--color-border)' }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold small d-flex align-items-center gap-1" style={{ color: 'var(--color-text-primary)' }}>
                            <Icon icon="solar:user-circle-bold-duotone" style={{ color: '#767676' }} width="16" /> {d.aluno_nome}
                          </span>
                          <span style={{ fontSize: 10, color: '#767676', fontWeight: 600 }}>
                            {formatIsoToDateString(d.data_criacao)}
                          </span>
                        </div>
                        <div className="small" style={{ lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{d.texto}</div>
                        {d.resposta_professor && (
                          <div className="ms-4 p-3 mt-3 rounded-4 border-start border-4 shadow-sm" style={{ background: 'rgba(0, 166, 153, 0.06)', borderStartColor: '#00A699' }}>
                            <div className="fw-bold small mb-1 d-flex align-items-center gap-1" style={{ color: '#00A699', fontSize: 12 }}>
                              <Icon icon="solar:verified-check-bold" width="14" /> Resposta do Professor
                            </div>
                            <div className="small" style={{ opacity: 0.9, lineHeight: 1.5 }}>{d.resposta_professor}</div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CModalBody>

          <CModalFooter className="border-0 pt-0 pb-4 px-4 bg-body-elevated justify-content-between align-items-center">
            <div style={{ fontSize: 12, color: '#767676', fontWeight: 600, letterSpacing: '0.3px' }}>
              Módulo {moduloAtivo?.ordem} • {moduloAtivo?.descricao}
            </div>
            <div className="d-flex gap-2">
              <CButton
                variant="ghost"
                onClick={() => setModalAula(false)}
                className="fw-bold"
                style={{ color: '#767676', fontSize: 14 }}
              >
                Fechar
              </CButton>

              {/* Ação de Exercícios */}
              {(moduloAtivo?.materia_id || (moduloAtivo?.questoes_selecionadas?.length > 0)) ? (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="fw-bold border-0 shadow-sm px-4 py-2"
                  style={{ background: '#FC642D', color: '#fff', borderRadius: 12, fontSize: 14 }}
                  onClick={() => {
                    if (moduloAtivo.questoes_selecionadas?.length > 0) {
                      const ids = moduloAtivo.questoes_selecionadas.join(',')
                      navigate(`/quiz?ids=${ids}&modulo_id=${moduloAtivo.id}`)
                    } else {
                      navigate(`/quiz?materia_id=${moduloAtivo.materia_id}&modulo_id=${moduloAtivo.id}`)
                    }
                    setModalAula(false)
                  }}
                >
                  <Icon icon="solar:pen-bold-duotone" className="me-2" width="18" /> Praticar Exercícios
                </motion.button>
              ) : (
                <div className="px-3 py-2 bg-body-tertiary rounded-3 small fst-italic text-body-secondary border">
                  <Icon icon="solar:pen-new-square-linear" className="me-1" /> Exercícios em breve...
                </div>
              )}

              {!moduloAtivo?.concluido && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={salvando === moduloAtivo?.id}
                  onClick={() => {
                    marcarConcluido(moduloAtivo.id)
                    setModalAula(false)
                  }}
                  className="fw-bold border-0 shadow-sm px-4 py-2"
                  style={{ background: '#00A699', color: '#fff', borderRadius: 12, fontSize: 14 }}
                >
                  {salvando === moduloAtivo?.id ? <CSpinner size="sm" /> : <><Icon icon="solar:check-circle-bold-duotone" className="me-2" width="18" /> Concluir Aula</>}
                </motion.button>
              )}
            </div>
          </CModalFooter>
          </div>
        </CModal>
      </CContainer>
    </div>
  )
}

export default MinhasTrilhas
