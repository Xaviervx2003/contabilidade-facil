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
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Premium */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest mb-3">
              <Icon icon="solar:SquareAcademicCap-linear" width="14" />
              Educação Continuada
            </div>
            <h2 className="text-text-primary text-3xl md:text-5xl font-normal tracking-tight mb-2">
              Minhas Trilhas <span className="font-serif italic text-primary">de Aprendizado</span>
            </h2>
            <p className="text-text-secondary font-medium text-sm md:text-base opacity-70">
              Siga os cursos e módulos elaborados pelos professores para guiar seus estudos.
            </p>
          </motion.div>
        </div>

        {errorMsg && <CAlert color="danger" className="premium-card mb-4 border-red-500/20">{errorMsg}</CAlert>}
        {toastErro && (
          <CAlert color="warning" className="premium-card mb-4 border-orange-500/20 py-2 small">
            {toastErro}
          </CAlert>
        )}

        {trilhas.length === 0 ? (
          <CAlert color="info">Nenhuma trilha disponível no momento.</CAlert>
        ) : (
          <CRow>
            {trilhas.map((t, index) => (
              <CCol xs={12} lg={6} xl={4} key={t.id} className="mb-4">
                <CCard
                  className="h-100 border-0 overflow-hidden premium-card fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {t.capa_url ? (
                    <div style={{ height: '160px', overflow: 'hidden', position: 'relative' }}>
                      <img
                        src={t.capa_url}
                        alt={t.nome}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
                        {t.nivel && (
                          <CBadge
                            color="dark"
                            style={{
                              backdropFilter: 'blur(4px)',
                              backgroundColor: 'rgba(0,0,0,0.5)',
                            }}
                          >
                            {t.nivel}
                          </CBadge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <CCardHeader className="bg-primary text-white py-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="fw-bold mb-0">{t.nome}</h5>
                        {t.nivel && (
                          <CBadge color="light" text="dark">
                            {t.nivel}
                          </CBadge>
                        )}
                      </div>
                    </CCardHeader>
                  )}
                  <CCardHeader className="bg-body-tertiary border-bottom-0 pt-3 pb-0">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      {!t.capa_url && <h5 className="fw-bold mb-0 text-truncate">{t.nome}</h5>}
                      {t.capa_url && <h5 className="fw-bold mb-0 text-truncate">{t.nome}</h5>}
                      <div className="d-flex flex-column align-items-end gap-1">
                        <CBadge color={t.progresso_percentual === 100 ? 'success' : 'primary'}>
                          {t.progresso_percentual}%
                        </CBadge>
                        {t.media_acertos !== null && (
                          <CBadge color="info" variant="outline" style={{ fontSize: '10px' }}>
                            Média: {t.media_acertos}%
                          </CBadge>
                        )}
                      </div>
                    </div>
                    <div className="text-body-secondary small mb-2">{t.descricao}</div>
                  </CCardHeader>
                  <CCardBody>
                    <div className="mb-4 mt-2">
                      <div className="d-flex justify-content-between small text-body-secondary mb-1">
                        <span>Progresso Geral</span>
                        <span>{t.progresso_percentual}%</span>
                      </div>
                      <CProgress
                        value={t.progresso_percentual}
                        color={t.progresso_percentual === 100 ? 'success' : 'info'}
                        height={8}
                      />
                    </div>

                    <h6 className="fw-bold mb-3 border-bottom pb-2">
                      Módulos ({t.modulos?.length || 0})
                    </h6>

                    {t.modulos?.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {t.modulos.map((m, idx) => (
                          <div
                            key={m.id}
                            className={`p-3 rounded border ${m.concluido ? 'bg-body-tertiary border-success' : 'bg-body-elevated'}`}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="d-flex flex-column">
                                <span
                                  className={`fw-bold ${m.concluido ? 'text-success' : 'text-body'}`}
                                >
                                  {m.ordem}. {m.nome}
                                </span>
                                {m.duracao_minutos && (
                                  <span className="text-body-tertiary" style={{ fontSize: '11px' }}>
                                    <CIcon icon={cilClock} size="sm" className="me-1" />
                                    {m.duracao_minutos} min
                                  </span>
                                )}
                              </div>
                              {m.concluido ? (
                                <div style={{ width: '32px', height: '32px' }}>
                                  <DotLottieReact
                                    src="https://lottie.host/80a969b7-0c7f-4ca7-b249-1d373c23c721/tL4Kk5D64X.lottie"
                                    autoplay
                                    loop={false}
                                  />
                                </div>
                              ) : (
                                <CButton
                                  size="sm"
                                  color="light"
                                  onClick={() => marcarConcluido(m.id)}
                                  disabled={salvando === m.id}
                                  title="Marcar como concluído manualmente"
                                >
                                  {salvando === m.id ? (
                                    <CSpinner size="sm" />
                                  ) : (
                                    <CIcon icon={cilCheckCircle} className="text-muted" />
                                  )}
                                </CButton>
                              )}
                            </div>

                            <p className="small text-body-secondary mb-3">{m.descricao}</p>

                            {/* REMOVIDO: texto_teorico inline (já aparece no modal) */}

                            <CButton
                              color={m.concluido ? 'secondary' : 'primary'}
                              variant={m.concluido ? 'outline' : ''}
                              size="sm"
                              className="w-100 d-flex justify-content-between align-items-center"
                              onClick={() => handleAcessarModulo(m)}
                            >
                              <span>
                                {m.link_video && (
                                  <>
                                    <CIcon icon={cilMediaPlay} className="me-2" /> Assistir Aula
                                  </>
                                )}
                                {!m.link_video && m.materia_id && (
                                  <>
                                    <CIcon icon={cilPenAlt} className="me-2" /> Praticar (
                                    {m.materia_nome})
                                  </>
                                )}
                                {!m.link_video && !m.materia_id && (
                                  <>
                                    <CIcon icon={cilDescription} className="me-2" /> Ler Conteúdo
                                  </>
                                )}
                              </span>
                              <CIcon icon={cilChevronRight} />
                            </CButton>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-body-secondary small">Módulos em construção...</div>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>
            ))}
          </CRow>
        )}


      {/* MODAL DE AULA INTEGRADA */}
      <CModal visible={modalAula} onClose={() => setModalAula(false)} size="xl" backdrop="static">
        <CModalHeader className="bg-body-tertiary border-bottom-0 pb-0">
          <div className="w-100">
            <div className="d-flex align-items-center gap-2 mb-1">
              <CBadge
                color="primary"
                variant="outline"
                className="text-uppercase"
                style={{ fontSize: '10px' }}
              >
                {moduloAtivo?.ordem}º Módulo
              </CBadge>
              <span className="text-body-secondary" style={{ fontSize: '12px' }}>
                Aula de Contabilidade Fácil
              </span>
            </div>
            <CModalTitle className="fw-bold fs-4">{moduloAtivo?.nome}</CModalTitle>
          </div>
        </CModalHeader>
        <CNav variant="tabs" className="bg-body-tertiary px-4 border-bottom-0">
          <CNavItem>
            <CNavLink
              active={abaAtiva === 'aula'}
              onClick={() => setAbaAtiva('aula')}
              style={{ cursor: 'pointer', fontWeight: abaAtiva === 'aula' ? 'bold' : 'normal' }}
            >
              <CIcon icon={cilMediaPlay} className="me-2" /> Aula
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={abaAtiva === 'duvidas'}
              onClick={() => setAbaAtiva('duvidas')}
              style={{ cursor: 'pointer', fontWeight: abaAtiva === 'duvidas' ? 'bold' : 'normal' }}
            >
              <CIcon icon={cilChatBubble} className="me-2" /> Dúvidas / Comentários
              {duvidas.length > 0 && (
                <CBadge color="danger" shape="rounded-pill" className="ms-2">
                  {duvidas.length}
                </CBadge>
              )}
            </CNavLink>
          </CNavItem>
        </CNav>
        <CModalBody className="p-0 border-top">
          {abaAtiva === 'aula' ? (
            <CRow className="g-0">
              {/* Player de Vídeo */}
              <CCol xs={12} lg={moduloAtivo?.texto_teorico ? 8 : 12}>
                {moduloAtivo?.link_video ? (
                  <div
                    style={{
                      position: 'relative',
                      paddingBottom: '56.25%',
                      height: 0,
                      overflow: 'hidden',
                      background: '#000',
                    }}
                  >
                    <iframe
                      src={getEmbedUrl(moduloAtivo.link_video)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                      }}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      title="Vídeo Aula"
                    />
                  </div>
                ) : (
                  <div className="p-5 text-center bg-body-tertiary">
                    <CIcon icon={cilDescription} size="xxl" className="text-muted mb-3" />
                    <h5>Conteúdo Teórico</h5>
                  </div>
                )}
              </CCol>

              {/* Texto Teórico Lateral/Abaixo */}
              {(moduloAtivo?.texto_teorico || moduloAtivo?.material_apoio_url) && (
                <CCol xs={12} lg={4} className="border-start bg-body-elevated">
                  <div
                    className="p-4"
                    style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
                  >
                    {moduloAtivo?.material_apoio_url && (
                      <div className="mb-4 p-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded">
                        <h6 className="fw-bold text-primary mb-2">Material de Estudo</h6>
                        <CButton
                          color="primary"
                          size="sm"
                          className="w-100 text-white fw-bold"
                          href={moduloAtivo.material_apoio_url}
                          target="_blank"
                        >
                          <CIcon icon={cilCloudDownload} className="me-2" /> Baixar PDF / Slides
                        </CButton>
                      </div>
                    )}

                    {moduloAtivo?.texto_teorico && (
                      <>
                        <h6 className="fw-bold text-uppercase small text-body-secondary mb-3">
                          Resumo da Aula
                        </h6>
                        <div
                          style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}
                        >
                          {moduloAtivo.texto_teorico}
                        </div>
                      </>
                    )}
                  </div>
                </CCol>
              )}
            </CRow>
          ) : (
            <div className="p-4 bg-body-elevated" style={{ minHeight: '400px' }}>
              <div className="mb-4">
                <h6 className="fw-bold mb-3">Tem alguma dúvida sobre esta aula?</h6>
                <div className="d-flex gap-2">
                  <CFormTextarea
                    placeholder="Digite sua dúvida ou comentário aqui..."
                    rows={3}
                    value={novaDuvida}
                    onChange={(e) => setNovaDuvida(e.target.value)}
                  />
                  <CButton
                    color="primary"
                    className="text-white"
                    onClick={enviarDuvida}
                    disabled={enviandoDuvida}
                  >
                    {enviandoDuvida ? <CSpinner size="sm" /> : 'Enviar'}
                  </CButton>
                </div>
              </div>

              <div className="duvidas-list">
                <h6 className="fw-bold border-bottom pb-2 mb-3">
                  Comentários da Turma ({duvidas.length})
                </h6>
                {duvidas.length === 0 ? (
                  <div className="text-center py-4 text-body-secondary">
                    Nenhuma dúvida enviada ainda. Seja o primeiro!
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {duvidas.map((d) => (
                      <div key={d.id} className="p-3 rounded bg-body-tertiary border">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold small">
                            <CIcon icon={cilUser} className="me-1" /> {d.aluno_nome}
                          </span>
                          <span className="text-body-secondary" style={{ fontSize: '10px' }}>
                            {formatIsoToDateString(d.data_criacao)}
                          </span>
                        </div>
                        <div className="mb-2">{d.texto}</div>
                        {d.resposta_professor && (
                          <div className="ms-4 p-3 mt-2 rounded bg-info bg-opacity-10 border-start border-info border-4">
                            <div className="fw-bold small text-info mb-1">
                              Resposta do Professor <CIcon icon={cilCheck} />
                            </div>
                            <div className="small">{d.resposta_professor}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter className="bg-body-tertiary justify-content-between">
          <div className="small text-body-secondary">
            Módulo {moduloAtivo?.ordem} • {moduloAtivo?.descricao}
          </div>
          <div>
            <CButton
              color="secondary"
              variant="ghost"
              onClick={() => setModalAula(false)}
              className="me-2"
            >
              Fechar
            </CButton>

            {/* Regra de Exercícios: Só mostra botão se houver questões ou matéria vinculada */}
            {moduloAtivo?.materia_id ||
            (moduloAtivo?.questoes_selecionadas &&
              moduloAtivo?.questoes_selecionadas.length > 0) ? (
              <CButton
                color="info"
                className="me-2 fw-bold text-white"
                onClick={() => {
                  if (
                    moduloAtivo.questoes_selecionadas &&
                    moduloAtivo.questoes_selecionadas.length > 0
                  ) {
                    const ids = moduloAtivo.questoes_selecionadas.join(',')
                    navigate(`/quiz?ids=${ids}&modulo_id=${moduloAtivo.id}`)
                  } else {
                    navigate(
                      `/quiz?materia_id=${moduloAtivo.materia_id}&modulo_id=${moduloAtivo.id}`,
                    )
                  }
                  setModalAula(false)
                }}
              >
                <CIcon icon={cilPenAlt} className="me-2" /> Praticar Exercícios
              </CButton>
            ) : (
              <div className="me-3 d-inline-block text-body-secondary small fst-italic">
                <CIcon icon={cilPenAlt} className="me-1" /> Exercícios sendo preparados...
              </div>
            )}

            {!moduloAtivo?.concluido && (
              <CButton
                color="success"
                disabled={salvando === moduloAtivo?.id}
                onClick={() => {
                  marcarConcluido(moduloAtivo.id)
                  setModalAula(false)
                }}
              >
                {salvando === moduloAtivo?.id ? (
                  <CSpinner size="sm" className="me-2" />
                ) : (
                  <CIcon icon={cilCheckCircle} className="me-2" />
                )}
                Marcar como Concluído
              </CButton>
            )}
          </div>
        </CModalFooter>
      </CModal>
      </div>
    </div>
  )
}

export default MinhasTrilhas
