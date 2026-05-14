import React, { useEffect, useState, useCallback } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CProgress,
  CBadge,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CNav,
  CNavItem,
  CNavLink,
  CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCheckCircle,
  cilMediaPlay,
  cilDescription,
  cilPenAlt,
  cilChevronRight,
  cilClock,
  cilCloudDownload,
  cilChatBubble,
  cilUser,
  cilCheck,
} from '@coreui/icons'
import { API_URL } from '../../config'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useTheme } from '../../context/themeContext'
import { formatIsoToDateString } from '../../utils/formatDate'
import { useNavigate } from 'react-router-dom'
import { getAlunoMatricula } from '../../utils/auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { toast } from 'react-hot-toast'

const MinhasTrilhas = () => {
  const [error, setError] = useState('')
  const [modalAula, setModalAula] = useState(false)
  const [moduloAtivo, setModuloAtivo] = useState(null)
  const [salvando, setSalvando] = useState(null)
  const [toastErro, setToastErro] = useState('')
  const [abaAtiva, setAbaAtiva] = useState('aula') // 'aula' ou 'duvidas'
  const [novaDuvida, setNovaDuvida] = useState('')
  const queryClient = useQueryClient()

  const matricula = getAlunoMatricula()

  const {
    data: trilhas = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['minhasTrilhas', matricula],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/trilhas/aluno/${matricula}`)
      if (!res.ok) throw new Error('Erro ao carregar as trilhas')
      return res.json()
    },
    enabled: !!matricula,
  })

  const { data: duvidas = [], refetch: refetchDuvidas } = useQuery({
    queryKey: ['duvidasModulo', moduloAtivo?.id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/trilhas/modulos/${moduloAtivo.id}/duvidas`)
      return res.json()
    },
    enabled: !!moduloAtivo && abaAtiva === 'duvidas',
  })

  const mutationConcluir = useMutation({
    mutationFn: async (moduloId) => {
      const res = await fetch(`${API_URL}/api/trilhas/progresso/${moduloId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula }),
      })
      if (!res.ok) throw new Error(`Erro ${res.status}`)
    },
    onMutate: (moduloId) => setSalvando(moduloId),
    onSuccess: () => {
      toast.success('Módulo concluído com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['minhasTrilhas', matricula] })
    },
    onError: () => {
      toast.error('Não foi possível salvar seu progresso.')
    },
    onSettled: () => setSalvando(null),
  })

  const mutationDuvida = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/trilhas/duvidas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulo_id: moduloAtivo.id, texto: novaDuvida, matricula }),
      })
      if (!res.ok) throw new Error('Erro')
    },
    onSuccess: () => {
      toast.success('Dúvida enviada!')
      setNovaDuvida('')
      refetchDuvidas()
    },
    onError: () => toast.error('Erro ao enviar dúvida.'),
  })

  const errorMsg = !matricula
    ? 'Esta área é exclusiva para alunos com matrícula ativa.'
    : queryError?.message || error

  const marcarConcluido = (moduloId) => {
    mutationConcluir.mutate(moduloId)
  }

  const enviarDuvida = () => {
    if (novaDuvida.trim()) mutationDuvida.mutate()
  }

  const getEmbedUrl = (url) => {
    if (!url) return null
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
      const match = url.match(regExp)
      return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : url
    }
    if (url.includes('vimeo.com')) {
      const match = url.match(/vimeo.com\/(\d+)/)
      return match ? `https://player.vimeo.com/video/${match[1]}` : url
    }
    return url
  }

  const handleAcessarModulo = (m) => {
    // REGRA: Se tiver vídeo ou texto, prioriza o Modal de Aula (Cinema)
    if (m.link_video || m.texto_teorico) {
      setModuloAtivo(m)
      setAbaAtiva('aula')
      setModalAula(true)
    }
    // Se for APENAS quiz, vai direto para o quiz
    else if (m.materia_id || (m.questoes_selecionadas && m.questoes_selecionadas.length > 0)) {
      if (m.questoes_selecionadas && m.questoes_selecionadas.length > 0) {
        const ids = m.questoes_selecionadas.join(',')
        navigate(`/quiz?ids=${ids}&modulo_id=${m.id}`)
      } else {
        navigate(`/quiz?materia_id=${m.materia_id}&modulo_id=${m.id}`)
      }
    }
  }

  const enviandoDuvida = mutationDuvida.isPending


  if (loading) {
    return (
      <CRow>
        {[...Array(6)].map((_, i) => (
          <CCol xs={12} lg={6} xl={4} key={i} className="mb-4">
            <div
              className="rounded-4 placeholder-glow"
              style={{ height: '300px', backgroundColor: 'var(--color-bg-secondary)' }}
            ></div>
          </CCol>
        ))}
      </CRow>
    )
  }

  return (
    <div className="min-h-screen pt-4 px-3" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Título e Subtítulo padronizados - Mantendo h3 para alinhamento total */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h3 className="h3 fw-bold mb-1">Minhas Trilhas de Aprendizado</h3>
          <div className="text-body-secondary small">Siga os cursos e módulos elaborados pelos professores para guiar seus estudos.</div>
        </motion.div>

        {errorMsg && <CAlert color="danger" className="mb-4 border-0 shadow-sm">{errorMsg}</CAlert>}
        
        {trilhas.length === 0 ? (
          <div className="text-center py-5">
            <Icon icon="solar:folder-error-linear" width="48" className="text-body-secondary mb-3" />
            <p className="text-body-secondary font-medium">Nenhuma trilha disponível no momento.</p>
          </div>
        ) : (
          <CRow>
            {trilhas.map((t, index) => {
              // Failsafe para evitar erros de renderização com dados incompletos
              const modulos = t.modulos || [];
              const proximoModulo = modulos.find(m => !m.concluido) || modulos[0] || null;
              const progresso = t.progresso_percentual || 0;
              const concluida = progresso === 100;

              return (
                <CCol xs={12} lg={6} xl={4} key={t.id || index} className="mb-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <CCard className="h-100 border-0 shadow-sm premium-card overflow-hidden transition-all hover-translate-y">
                      {/* Header da Trilha (Hero ou Capa) */}
                      {t.capa_url ? (
                        <div style={{ height: '140px', overflow: 'hidden', position: 'relative' }}>
                          <img src={t.capa_url} alt={t.nome} className="w-100 h-100 object-cover" />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}></div>
                          {t.nivel && (
                            <CBadge color="dark" className="position-absolute top-2 start-2 backdrop-blur-md bg-black/40 border border-white/10">
                              {t.nivel}
                            </CBadge>
                          )}
                        </div>
                      ) : (
                        <CCardHeader 
                          className="text-white px-3 d-flex align-items-center justify-content-between border-0" 
                          style={{ height: '56px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' }}
                        >
                          <span className="fw-bold text-truncate text-capitalize">{t.nome}</span>
                          <Icon icon="solar:bookmark-opened-bold-duotone" width="20" />
                        </CCardHeader>
                      )}

                      <CCardBody className="p-4 d-flex flex-column">
                        {/* Título e Progresso */}
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h5 className="fw-bold mb-0 text-truncate text-capitalize" style={{ color: 'var(--color-text-primary)' }}>
                              {t.nome}
                            </h5>
                            <div className="text-body-secondary small text-truncate mt-1" style={{ fontSize: '12px' }}>
                              {t.descricao || 'Trilha de estudos personalizada'}
                            </div>
                          </div>
                          <div className="ms-2">
                            <CBadge color={concluida ? 'success' : 'primary'} className="rounded-pill px-2 py-1 shadow-sm">
                              {progresso}%
                            </CBadge>
                          </div>
                        </div>

                        {/* Barra de Progresso Estilizada */}
                        <div className="mb-4 mt-auto">
                          <div className="d-flex justify-content-between small mb-2">
                            <span className="text-body-secondary fw-medium">Sua Evolução</span>
                            <span className={`fw-bold ${concluida ? 'text-success' : 'text-primary'}`}>
                              {concluida ? 'Concluída!' : 'Em andamento'}
                            </span>
                          </div>
                          <div className="progress-container rounded-pill" style={{ height: '6px', background: 'var(--color-bg-tertiary)' }}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progresso}%` }}
                              transition={{ duration: 1.2, ease: "easeOut" }}
                              className={`h-100 rounded-pill ${concluida ? 'bg-success' : 'bg-primary'}`}
                              style={{ 
                                boxShadow: concluida ? '0 0 10px rgba(46, 184, 92, 0.3)' : '0 0 10px rgba(var(--color-primary-rgb, 50, 31, 219), 0.3)'
                              }}
                            />
                          </div>
                        </div>

                        {/* Próximo Passo / Destaque - Usando bg-body-tertiary para respeitar o tema */}
                        <div className="p-3 rounded-4 mb-4 bg-body-tertiary border border-border/30 d-flex align-items-center gap-3">
                          <div className={`p-2 rounded-3 ${concluida ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                            <Icon icon={concluida ? "solar:verified-check-bold" : "solar:play-circle-bold"} width="24" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-body-secondary" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                              {concluida ? 'Status Final' : 'Próximo Módulo'}
                            </div>
                            <div className="fw-bold text-truncate" style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                              {concluida ? 'Parabéns pela conclusão!' : proximoModulo?.nome || 'Aguardando conteúdo'}
                            </div>
                          </div>
                        </div>

                        {/* Botão de Ação Premium */}
                        <CButton 
                          color={concluida ? "success" : "primary"}
                          variant={concluida ? "outline" : ""}
                          className={`w-100 py-2 fw-bold rounded-3 transition-all d-flex align-items-center justify-content-center gap-2 ${concluida ? '' : 'shadow-lg shadow-primary/20'}`}
                          onClick={() => concluida ? handleAcessarModulo(t) : proximoModulo && handleAcessarModulo(proximoModulo)}
                          disabled={!concluida && !proximoModulo}
                        >
                          <Icon icon={concluida ? "solar:folder-check-bold" : "solar:play-bold"} width="18" />
                          {concluida ? 'Rever Conteúdo' : 'Continuar Estudos'}
                        </CButton>
                      </CCardBody>
                    </CCard>
                  </motion.div>
                </CCol>
              );
            })}
          </CRow>
        )}


      {/* MODAL DE AULA INTEGRADA PREMIUM (AIRBNB CLONE) */}
      <CModal 
        visible={modalAula} 
        onClose={() => setModalAula(false)} 
        size="xl" 
        backdrop="static" 
        scrollable 
        className="modal-premium"
        style={{ 
          fontFamily: "'Circular Std', 'Nunito', sans-serif",
        }}
      >
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
      </CModal>
      </div>
    </div>
  )
}

export default MinhasTrilhas
