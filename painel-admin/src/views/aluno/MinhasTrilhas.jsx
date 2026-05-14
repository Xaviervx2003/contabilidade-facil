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
  return (
    <div className="min-h-screen pt-4 px-3" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="max-w-5xl mx-auto">
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
