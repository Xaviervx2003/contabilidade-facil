import React, { useEffect, useState, useCallback } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CProgress,
  CAlert,
  CPagination,
  CPaginationItem
} from '@coreui/react'
import { API_URL } from '../../config'
import { calculateGrade } from '../../utils/quizUtils'

// Função auxiliar para tempo
const formatarTempo = (segundos) => {
  if (!segundos || segundos <= 0) return "0m 0s"
  const m = Math.floor(segundos / 60)
  const s = Math.floor(segundos % 60)
  return `${m}m ${s}s`
}

const Alunos = () => {
  const [listaAlunos, setListaAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  const carregarMetricas = useCallback(async (pagina) => {
    setLoading(true)
    setErro(null)

    try {
      // 🔑 Recupera userId para filtrar professores
      const userId = sessionStorage.getItem('userId')

      const params = new URLSearchParams({
        pagina: pagina.toString(),
        por_pagina: '100' // ⚠️ Limite máximo do backend (evita 422)
      })
      if (userId) params.append('usuario_id', userId)

      const res = await fetch(`${API_URL}/api/metricas-estudantes/desempenho?${params}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `Erro ${res.status} ao carregar métricas`)
      }

      const data = await res.json()
      // 🔄 Suporta resposta nova (estudantes) e legado (alunos)
      const dados = data.estudantes || data.alunos || []
      setListaAlunos(Array.isArray(dados) ? dados : [])
      setTotalPaginas(data.total_paginas || 1)
    } catch (err) {
      console.error("❌ Erro ao carregar métricas:", err)
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarMetricas(paginaAtual)
  }, [paginaAtual, carregarMetricas])

  if (loading) {
    return <CAlert color="info">Carregando dados acadêmicos...</CAlert>
  }

  if (erro) {
    return (
      <CAlert color="danger" dismissible onClose={() => setErro(null)}>
        {erro}
      </CAlert>
    )
  }

  if (listaAlunos.length === 0) {
    return <CAlert color="secondary">Nenhum estudante registrou sessões de teste no momento.</CAlert>
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
                  <strong>👤 Estudante: {aluno.nome}</strong> | Matrícula: <code>{aluno.matricula}</code>
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

                    {/* COLUNA DIREITA: ERROS POR MATÉRIA */}
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
                                <span className="fw-semibold">• {materia}</span>
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

      {/* 📄 Paginação */}
      {totalPaginas > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <CPagination aria-label="Paginação de estudantes">
            <CPaginationItem
              disabled={paginaAtual === 1}
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
            >
              Anterior
            </CPaginationItem>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(page => (
              <CPaginationItem
                key={page}
                active={page === paginaAtual}
                onClick={() => setPaginaAtual(page)}
              >
                {page}
              </CPaginationItem>
            ))}
            <CPaginationItem
              disabled={paginaAtual === totalPaginas}
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
            >
              Próximo
            </CPaginationItem>
          </CPagination>
        </div>
      )}
    </div>
  )
}

export default Alunos