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
  CModalFooter
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilMediaPlay, cilDescription, cilPenAlt, cilChevronRight } from '@coreui/icons'
import { API_URL } from '../../config'
import { useNavigate } from 'react-router-dom'
import { getMatricula } from '../../utils/auth'

const MinhasTrilhas = () => {
  const [trilhas, setTrilhas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalAula, setModalAula] = useState(false)
  const [moduloAtivo, setModuloAtivo] = useState(null)
  const [salvando, setSalvando] = useState(null)
  const [toastErro, setToastErro] = useState('')
  const navigate = useNavigate()

  const matricula = getMatricula()

  const carregarTrilhas = useCallback(async () => {
    if (!matricula) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/trilhas/aluno/${matricula}`)
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setTrilhas(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Erro ao carregar suas trilhas.')
    } finally {
      setLoading(false)
    }
  }, [matricula])

  useEffect(() => {
    carregarTrilhas()
  }, [carregarTrilhas])

  const marcarConcluido = async (moduloId) => {
    setSalvando(moduloId)
    setToastErro('')
    try {
      const res = await fetch(`${API_URL}/api/trilhas/progresso/${moduloId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula })
      })
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      
      await carregarTrilhas() // Atualiza a barra de progresso apenas em caso de sucesso
    } catch (e) {
      console.error(e)
      setToastErro('Não foi possível salvar seu progresso. Tente novamente.')
      setTimeout(() => setToastErro(''), 4000)
    } finally {
      setSalvando(null)
    }
  }

  const getEmbedUrl = (url) => {
    if (!url) return null
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
      const match = url.match(regExp)
      return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url
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

  if (loading) return <div className="text-center py-5"><CSpinner /></div>

  return (
    <CRow>
      <CCol xs={12}>
        <div className="mb-4">
          <h2 className="fw-bold" style={{ color: 'var(--color-primary)' }}>Minhas Trilhas de Aprendizado</h2>
          <p className="text-body-secondary">Siga os cursos e módulos elaborados pelos professores para guiar seus estudos.</p>
        </div>

        {error && <CAlert color="danger">{error}</CAlert>}
        {toastErro && <CAlert color="warning" className="py-2 small">{toastErro}</CAlert>}

        {trilhas.length === 0 ? (
          <CAlert color="info">Nenhuma trilha disponível no momento.</CAlert>
        ) : (
          <CRow>
            {trilhas.map(t => (
              <CCol xs={12} lg={6} xl={4} key={t.id} className="mb-4">
                <CCard className="h-100 shadow-sm">
                  <CCardHeader className="bg-body-tertiary border-bottom-0 pt-4 pb-0">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="fw-bold mb-0">{t.nome}</h5>
                      <CBadge color={t.progresso_percentual === 100 ? "success" : "primary"}>
                        {t.progresso_percentual}%
                      </CBadge>
                    </div>
                    <div className="text-body-secondary small">{t.descricao}</div>
                  </CCardHeader>
                  <CCardBody>
                    <div className="mb-4 mt-2">
                      <div className="d-flex justify-content-between small text-body-secondary mb-1">
                        <span>Progresso Geral</span>
                        <span>{t.progresso_percentual}%</span>
                      </div>
                      <CProgress value={t.progresso_percentual} color={t.progresso_percentual === 100 ? "success" : "info"} height={8} />
                    </div>

                    <h6 className="fw-bold mb-3 border-bottom pb-2">Módulos ({t.modulos?.length || 0})</h6>
                    
                    {t.modulos?.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {t.modulos.map((m, idx) => (
                          <div key={m.id} className={`p-3 rounded border ${m.concluido ? 'bg-body-tertiary border-success' : 'bg-body-elevated'}`}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className={`fw-bold ${m.concluido ? 'text-success' : 'text-body'}`}>
                                {m.ordem}. {m.nome}
                              </span>
                                {m.concluido ? (
                                  <CIcon icon={cilCheckCircle} className="text-success" />
                                ) : (
                                  <CButton 
                                    size="sm" 
                                    color="light" 
                                    onClick={() => marcarConcluido(m.id)} 
                                    disabled={salvando === m.id}
                                    title="Marcar como concluído manualmente"
                                  >
                                    {salvando === m.id ? <CSpinner size="sm" /> : <CIcon icon={cilCheckCircle} className="text-muted" />}
                                  </CButton>
                                )}
                            </div>
                            
                            <p className="small text-body-secondary mb-3">{m.descricao}</p>
                            
                            {/* REMOVIDO: texto_teorico inline (já aparece no modal) */}

                            <CButton 
                              color={m.concluido ? "secondary" : "primary"} 
                              variant={m.concluido ? "outline" : ""}
                              size="sm" 
                              className="w-100 d-flex justify-content-between align-items-center"
                              onClick={() => handleAcessarModulo(m)}
                            >
                              <span>
                                {m.link_video && <><CIcon icon={cilMediaPlay} className="me-2" /> Assistir Aula</>}
                                {!m.link_video && m.materia_id && <><CIcon icon={cilPenAlt} className="me-2" /> Praticar ({m.materia_nome})</>}
                                {!m.link_video && !m.materia_id && <><CIcon icon={cilDescription} className="me-2" /> Ler Conteúdo</>}
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
      </CCol>

      {/* MODAL DE AULA INTEGRADA */}
      <CModal visible={modalAula} onClose={() => setModalAula(false)} size="xl" backdrop="static">
        <CModalHeader className="bg-body-tertiary border-bottom-0 pb-0">
          <div className="w-100">
            <div className="d-flex align-items-center gap-2 mb-1">
              <CBadge color="primary" variant="outline" className="text-uppercase" style={{ fontSize: '10px' }}>
                {moduloAtivo?.ordem}º Módulo
              </CBadge>
              <span className="text-body-secondary" style={{ fontSize: '12px' }}>
                Aula de Contabilidade Fácil
              </span>
            </div>
            <CModalTitle className="fw-bold fs-4">{moduloAtivo?.nome}</CModalTitle>
          </div>
        </CModalHeader>
        <CModalBody className="p-0">
          <CRow className="g-0">
            {/* Player de Vídeo */}
            <CCol xs={12} lg={moduloAtivo?.texto_teorico ? 8 : 12}>
              {moduloAtivo?.link_video ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', background: '#000' }}>
                  <iframe
                    src={getEmbedUrl(moduloAtivo.link_video)}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
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
            {moduloAtivo?.texto_teorico && (
              <CCol xs={12} lg={4} className="border-start bg-body-elevated">
                <div className="p-4" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  <h6 className="fw-bold text-uppercase small text-body-secondary mb-3">Material de Apoio</h6>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>
                    {moduloAtivo.texto_teorico}
                  </div>
                </div>
              </CCol>
            )}
          </CRow>
        </CModalBody>
        <CModalFooter className="bg-body-tertiary justify-content-between">
          <div className="small text-body-secondary">
            Módulo {moduloAtivo?.ordem} • {moduloAtivo?.descricao}
          </div>
          <div>
            <CButton color="secondary" variant="ghost" onClick={() => setModalAula(false)} className="me-2">Fechar</CButton>
            
            {/* Regra de Exercícios: Só mostra botão se houver questões ou matéria vinculada */}
            {(moduloAtivo?.materia_id || (moduloAtivo?.questoes_selecionadas && moduloAtivo?.questoes_selecionadas.length > 0)) ? (
              <CButton 
                color="info" 
                className="me-2 fw-bold text-white"
                onClick={() => {
                  if (moduloAtivo.questoes_selecionadas && moduloAtivo.questoes_selecionadas.length > 0) {
                    const ids = moduloAtivo.questoes_selecionadas.join(',')
                    navigate(`/quiz?ids=${ids}&modulo_id=${moduloAtivo.id}`)
                  } else {
                    navigate(`/quiz?materia_id=${moduloAtivo.materia_id}&modulo_id=${moduloAtivo.id}`)
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
                onClick={() => { marcarConcluido(moduloAtivo.id); setModalAula(false); }}
              >
                {salvando === moduloAtivo?.id ? <CSpinner size="sm" className="me-2"/> : <CIcon icon={cilCheckCircle} className="me-2" />}
                Marcar como Concluído
              </CButton>
            )}
          </div>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default MinhasTrilhas
