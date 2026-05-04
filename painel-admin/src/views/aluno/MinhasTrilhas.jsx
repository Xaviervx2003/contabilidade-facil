import React, { useEffect, useState } from 'react'
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
  CAccordionBody
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilMediaPlay, cilDescription, cilPenAlt, cilChevronRight } from '@coreui/icons'
import { API_URL } from '../../config'
import { useNavigate } from 'react-router-dom'

const MinhasTrilhas = () => {
  const [trilhas, setTrilhas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const matricula = sessionStorage.getItem('matricula')

  const carregarTrilhas = async () => {
    setLoading(true)
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
  }

  useEffect(() => {
    carregarTrilhas()
  }, [])

  const marcarConcluido = async (moduloId) => {
    try {
      await fetch(`${API_URL}/api/trilhas/progresso/${moduloId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula })
      })
      carregarTrilhas() // Atualiza a barra de progresso
    } catch (e) {
      console.error(e)
    }
  }

  const handleAcessarModulo = (m) => {
    // Se for quiz, redireciona para a tela de quiz filtrada pela matéria
    if (m.materia_id) {
      navigate(`/quiz?materia_id=${m.materia_id}`)
    } else if (m.link_video) {
      // Abre o vídeo em nova aba por enquanto (ou podemos tocar no modal futuro)
      window.open(m.link_video, '_blank')
    }
    // Depois de acessar, marca como concluído automaticamente para facilitar
    marcarConcluido(m.id)
  }

  if (loading) return <div className="text-center py-5"><CSpinner /></div>

  return (
    <CRow>
      <CCol xs={12}>
        <div className="mb-4">
          <h2 className="fw-bold" style={{ color: 'var(--cui-primary)' }}>Minhas Trilhas de Aprendizado</h2>
          <p className="text-muted">Siga os cursos e módulos elaborados pelos professores para guiar seus estudos.</p>
        </div>

        {error && <CAlert color="danger">{error}</CAlert>}

        {trilhas.length === 0 ? (
          <CAlert color="info">Nenhuma trilha disponível no momento.</CAlert>
        ) : (
          <CRow>
            {trilhas.map(t => (
              <CCol xs={12} lg={6} xl={4} key={t.id} className="mb-4">
                <CCard className="h-100 shadow-sm border-0">
                  <CCardHeader className="bg-white border-bottom-0 pt-4 pb-0">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="fw-bold mb-0">{t.nome}</h5>
                      <CBadge color={t.progresso_percentual === 100 ? "success" : "primary"}>
                        {t.progresso_percentual}%
                      </CBadge>
                    </div>
                    <div className="text-muted small">{t.descricao}</div>
                  </CCardHeader>
                  <CCardBody>
                    <div className="mb-4 mt-2">
                      <div className="d-flex justify-content-between small text-muted mb-1">
                        <span>Progresso Geral</span>
                        <span>{t.progresso_percentual}%</span>
                      </div>
                      <CProgress value={t.progresso_percentual} color={t.progresso_percentual === 100 ? "success" : "info"} height={8} />
                    </div>

                    <h6 className="fw-bold mb-3 border-bottom pb-2">Módulos ({t.modulos?.length || 0})</h6>
                    
                    {t.modulos?.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {t.modulos.map((m, idx) => (
                          <div key={m.id} className={`p-3 rounded border ${m.concluido ? 'bg-light border-success' : 'bg-white'}`}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className={`fw-bold ${m.concluido ? 'text-success' : 'text-dark'}`}>
                                {m.ordem}. {m.nome}
                              </span>
                              {m.concluido ? (
                                <CIcon icon={cilCheckCircle} className="text-success" />
                              ) : (
                                <CButton size="sm" color="light" onClick={() => marcarConcluido(m.id)} title="Marcar como concluído manualmente">
                                  <CIcon icon={cilCheckCircle} className="text-muted" />
                                </CButton>
                              )}
                            </div>
                            
                            <p className="small text-muted mb-3">{m.descricao}</p>
                            
                            {m.texto_teorico && (
                              <div className="small text-dark bg-body-tertiary p-2 rounded mb-3" style={{ whiteSpace: 'pre-wrap' }}>
                                {m.texto_teorico}
                              </div>
                            )}

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
                      <div className="text-muted small">Módulos em construção...</div>
                    )}
                  </CCardBody>
                </CCard>
              </CCol>
            ))}
          </CRow>
        )}
      </CCol>
    </CRow>
  )
}

export default MinhasTrilhas
