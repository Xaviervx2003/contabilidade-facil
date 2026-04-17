import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CProgress,
  CAlert
} from '@coreui/react'
import { API_URL } from '../../config'
import { calculateGrade } from '../../utils/quizUtils'

// Função auxiliar para tempo
const formatarTempo = (segundos) => {
  if (segundos === 0 || !segundos) return "0m 0s"
  const m = Math.floor(segundos / 60)
  const s = Math.floor(segundos % 60)
  return `${m}m ${s}s`
}

const Alunos = () => {
  const [listaAlunos, setListaAlunos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/alunos/desempenho`)
      .then(res => res.json())
      .then(data => {
        setListaAlunos(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Erro ao carregar alunos:", err)
        setLoading(false)
      })
  }, [])

  if (loading) {
     return <CAlert color="info">Carregando dados acadêmicos...</CAlert>
  }

  if (listaAlunos.length === 0) {
     return <CAlert color="secondary">Nenhum aluno registrou sessões de teste no momento.</CAlert>
  }

  return (
    <div className="alunos-dashboard">
      <h3 className="mb-4">Monitoramento Operacional dos Alunos</h3>
      
      <CRow>
        <CCol xs={12}>
          {listaAlunos.map((aluno) => {
            const gradeObj = calculateGrade(aluno.media_numero) 
            const nota = gradeObj ? gradeObj.grade : 'N/A'
            const percentual = Math.round(aluno.media_numero)
            const tempoString = formatarTempo(aluno.tempo_medio_segundos)

            return (
              <CCard className="mb-4" key={aluno.matricula}>
                <CCardHeader className="bg-body-secondary">
                  <strong>👤 Aluno: {aluno.nome}</strong> | Matrícula: <code>{aluno.matricula}</code>
                </CCardHeader>
                <CCardBody>
                  <CRow>
                    {/* COLUNA ESQUERDA: DESEMPENHO GERAL */}
                    <CCol xs={12} md={6} xl={6}>
                      <CRow>
                        <CCol xs={6}>
                          <div className="border-start border-start-4 border-start-info py-1 px-3 mb-3">
                            <div className="text-body-secondary text-truncate small">Nota Atual</div>
                            <div className="fs-5 fw-semibold">
                              {nota} ({percentual}%) {percentual < 60 ? '⚠️' : '🎯'}
                            </div>
                          </div>
                        </CCol>
                        <CCol xs={6}>
                          <div className="border-start border-start-4 border-start-warning py-1 px-3 mb-3">
                            <div className="text-body-secondary text-truncate small">Sessões Concluídas</div>
                            <div className="fs-5 fw-semibold">{aluno.sessoes} quizzes</div>
                          </div>
                        </CCol>
                      </CRow>

                      <hr className="mt-0" />
                      
                      <div className="progress-group mb-4 mt-4">
                        <div className="progress-group-header align-items-center justify-content-between d-flex">
                          <span className="text-body-secondary">Tempo Acadêmico Médio</span>
                          <span className="ms-auto fw-semibold fs-5">{tempoString}</span>
                        </div>
                        <div className="progress-group-bars">
                           <CProgress thin color="primary" value={100} />
                        </div>
                      </div>

                      <div className="progress-group mb-4 mt-4">
                        <div className="progress-group-header align-items-center justify-content-between d-flex">
                          <span className="text-body-secondary">Total de Questões Respondidas</span>
                          <span className="ms-auto fw-semibold fs-5">{aluno.questoes}</span>
                        </div>
                        <div className="progress-group-bars">
                           <CProgress thin color="info" value={100} />
                        </div>
                      </div>

                    </CCol>

                    {/* COLUNA DIREITA: ERROS POR MATÉRIA (TRAFFIC & SALES ADAPTED) */}
                    <CCol xs={12} md={6} xl={6}>
                      <div className="border-start border-start-4 border-start-danger py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">
                          Diagnóstico: Erros por Matéria
                        </div>
                        <div className="fs-5 fw-semibold">Gargalos de Aprendizado</div>
                      </div>
                      
                      <hr className="mt-0" />

                      {Object.keys(aluno.erros_por_materia || {}).length === 0 ? (
                         <div className="text-center text-muted mt-4">Nenhum histórico detalhado.</div>
                      ) : (
                         Object.entries(aluno.erros_por_materia).map(([materia, dados], idx) => {
                           const percentageError = dados.total > 0 ? (dados.erros / dados.total) * 100 : 0
                           const hasErrors = dados.erros > 0
                           
                           return (
                             <div className="progress-group mb-4" key={idx}>
                               <div className="progress-group-header">
                                 <span className="fw-semibold">
                                     • {materia}
                                 </span>
                                 <span className="ms-auto fw-bold text-dark">
                                   {dados.erros} erro{dados.erros !== 1 ? 's' : ''} {hasErrors ? '❌' : '✅'}
                                   <span className="text-body-secondary small ms-2">
                                      ({dados.total} totais)
                                   </span>
                                 </span>
                               </div>
                               <div className="progress-group-bars">
                                 <CProgress 
                                    thin 
                                    color={hasErrors ? "danger" : "success"} 
                                    value={hasErrors ? percentageError : 100} 
                                 />
                               </div>
                             </div>
                           )
                         })
                      )}

                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>
            )
          })}
        </CCol>
      </CRow>
    </div>
  )
}

export default Alunos