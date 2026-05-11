import React, { useEffect, useState, useCallback } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CPagination,
  CPaginationItem,
  CProgress,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPeople,
  cilCloudDownload,
  cilWarning,
  cilChart,
  cilClock,
  cilCheckCircle,
  cilHistory,
  cilBarChart,
} from '@coreui/icons'

import { API_URL } from '../../config'
import MainChart from './MainChart'
import { useTheme } from '../../context/themeContext'

// ── Helpers ─────────────────────────────────────────────
const getUserId = () => {
  const id = sessionStorage.getItem('userId')
  return id ? parseInt(id, 10) : null
}

const buildUrl = (base, userId, extra = {}) => {
  const params = new URLSearchParams()
  if (userId) params.set('usuario_id', userId)
  Object.entries(extra).forEach(([k, v]) => params.set(k, v))
  return `${API_URL}${base}?${params.toString()}`
}

// ── Hooks ───────────────────────────────────────────────
const useDashboardStats = (userId) => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(buildUrl('/api/dashboard', userId))
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [userId])

  return { stats, loading, error }
}

export const useChartData = (userId) => {
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(buildUrl('/api/dashboard/sessoes-por-mes', userId))
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setChartData(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [userId])

  return { chartData, loading, error }
}

const useAlunos = (userId, pagina, porPagina = 10) => {
  const [data, setData] = useState({ estudantes: [], total: 0, total_paginas: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(buildUrl('/api/metricas-estudantes/desempenho', userId, { pagina, por_pagina: porPagina }))
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        // Suporta tanto o formato antigo 'alunos' quanto o novo 'estudantes'
        const normalizedData = {
          estudantes: data.estudantes || data.alunos || [],
          total: data.total || 0,
          total_paginas: data.total_paginas || 1
        }
        setData(normalizedData)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [userId, pagina, porPagina])

  return { data, loading, error }
}

const useVisaoGeral = (userId) => {
  const [visao, setVisao] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(buildUrl('/api/dashboard/visao-geral', userId))
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setVisao(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [userId])

  return { visao, loading, error }
}

// ── Componentes auxiliares ──────────────────────────────
const StatCard = ({ titulo, valor, cor, icone, loading }) => (
  <div className="bg-gradient-to-br from-[#f8fafc] to-white dark:from-[#1e293b] dark:to-[#0f172a] border border-white/80 dark:border-slate-700/50 rounded-[1.5rem] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06),inset_0_2px_15px_rgba(0,0,0,0.03)] dark:shadow-none h-100 fade-in-up d-flex flex-column justify-content-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)]" style={{ animationDelay: '0.1s' }}>
    <div className="text-sm text-secondary uppercase tracking-wide d-flex align-items-center gap-2">
      <CIcon icon={icone} className={`text-${cor}`} /> {titulo}
    </div>
    <div className="fs-3 fw-bold text-primary mt-3">
      {loading ? <CSpinner size="sm" /> : valor}
    </div>
  </div>
)

const SkeletonRow = ({ isDark }) => (
  <CTableRow>
    {[...Array(5)].map((_, i) => (
      <CTableDataCell key={i}>
        <div
          style={{
            height: 16,
            borderRadius: 4,
            background: isDark
              ? 'linear-gradient(90deg, #212121 25%, #2a2a2a 50%, #212121 75%)'
              : 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
            width: i === 0 ? '40%' : '80%',
          }}
        />
      </CTableDataCell>
    ))}
  </CTableRow>
)

// ── Componente principal ─────────────────────────────────
const Dashboard = () => {
  const userId = getUserId()

  const [pagina, setPagina] = useState(1)
  const porPagina = 10
  const { isDark } = useTheme()

  const { stats, loading: loadingStats, error: errorStats } = useDashboardStats(userId)
  const { data, loading: loadingAlunos, error: errorAlunos } = useAlunos(userId, pagina, porPagina)
  const { chartData, loading: loadingChart, error: errorChart } = useChartData(userId)
  const { visao, loading: loadingVisao, error: errorVisao } = useVisaoGeral(userId)

  const { estudantes, total_paginas } = data

  const exportarCSV = useCallback(() => {
    if (estudantes.length === 0) return
    const header = 'Nome,Matrícula,Média (%),Questões,Sessões\n'
    const rows = estudantes
      .map(a => `"${a.nome.replace(/"/g, '""')}",${a.matricula},${(a.media_numero || 0).toFixed(1)},${a.questoes},${a.sessoes}`)
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio_desempenho_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [estudantes])

  // Cálculo do progresso da turma
  const percentualTurma = stats?.total_questoes_banco && visao?.media_questoes_por_aluno
    ? Math.min((visao.media_questoes_por_aluno / stats.total_questoes_banco) * 100, 100).toFixed(1)
    : 0

  return (
    <div className="p-3 p-md-4">
      {/* Aviso de sessão não identificada */}
      {!userId && (
        <CAlert color="warning" className="mb-3 d-flex align-items-center gap-2">
          <CIcon icon={cilWarning} />
          <span>Sessão não identificada – exibindo dados globais (modo admin). Faça login para filtrar por perfil.</span>
        </CAlert>
      )}

      {/* Erro nos stats */}
      {errorStats && (
        <CAlert color="danger" className="mb-3">Erro ao carregar métricas: {errorStats}</CAlert>
      )}

      {/* Cards de métricas principais */}
      <CRow className="g-3 mb-4">
        <CCol xs={12} sm={6} xl={3}>
          <StatCard
            titulo="Alunos Engajados (Total)"
            valor={stats?.alunos_ativos ?? '—'}
            cor="info"
            icone={cilPeople}
            loading={loadingStats}
          />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard
            titulo="Questões Respondidas"
            valor={stats?.total_questoes_resolvidas ?? '—'}
            cor="success"
            icone={cilCheckCircle}
            loading={loadingStats}
          />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard
            titulo="Tempo Médio por Sessão"
            valor={stats?.tempo_medio_minutos ? `${stats.tempo_medio_minutos} min` : '—'}
            cor="warning"
            icone={cilClock}
            loading={loadingStats}
          />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard
            titulo="Questões no Banco"
            valor={stats?.total_questoes_banco ?? '—'}
            cor="danger"
            icone={cilChart}
            loading={loadingStats}
          />
        </CCol>
      </CRow>

      {/* Progresso Geral da Turma + Últimas Atividades */}
      <CRow className="g-3 mb-4">
        <CCol md={6}>
          <div className="bg-card border border-border/50 rounded-[1.5rem] p-6 shadow-sm glass-panel h-100 fade-in-up transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg" style={{ animationDelay: '0.2s' }}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <CIcon icon={cilBarChart} className="text-success" />
              <strong className="text-body-primary">Progresso Geral da Turma</strong>
            </div>
            <div className="d-flex flex-column justify-content-center">
              {loadingVisao ? (
                <CSpinner color="success" size="sm" />
              ) : errorVisao ? (
                <CAlert color="danger" className="mb-0">{errorVisao}</CAlert>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-body-secondary small">Média de questões por aluno</span>
                    <span className="fw-bold text-success fs-5">
                      {visao?.media_questoes_por_aluno?.toFixed(0) || 0}
                    </span>
                  </div>
                  <CProgress
                    color="success"
                    value={percentualTurma}
                  />
                  <div className="d-flex justify-content-center mt-3">
                    <span className="fw-bold text-success fs-3">{percentualTurma}%</span>
                  </div>
                  <div className="mt-3 pt-3 border-top">
                    <small className="text-body-tertiary">
                      Total de questões no banco: <strong>{stats?.total_questoes_banco || 0}</strong>
                    </small>
                  </div>
                </>
              )}
            </div>
          </div>
        </CCol>
        <CCol md={6}>
          <div className="bg-card border border-border/50 rounded-[1.5rem] p-6 shadow-sm glass-panel h-100 fade-in-up transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg" style={{ animationDelay: '0.25s' }}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <CIcon icon={cilHistory} className="text-info" />
              <strong className="text-body-primary">Últimas Atividades</strong>
            </div>
            {loadingVisao ? (
              <CSpinner color="info" size="sm" />
            ) : errorVisao ? (
              <CAlert color="danger" className="mb-0">{errorVisao}</CAlert>
            ) : (
              <div className="table-responsive">
                <CTable hover align="middle" className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell className="bg-body-tertiary small border-0">Aluno</CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary small border-0">Assunto</CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary text-center small border-0">Qtd</CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary text-center small border-0">Acerto</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {visao?.ultimas_sessoes?.length > 0 ? (
                      visao.ultimas_sessoes.map((sessao, idx) => (
                        <CTableRow key={idx}>
                          <CTableDataCell className="fw-medium small">{sessao.aluno}</CTableDataCell>
                          <CTableDataCell className="small">{sessao.assunto}</CTableDataCell>
                          <CTableDataCell className="text-center fw-bold small">{sessao.questoes}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CBadge color={sessao.acerto >= 80 ? 'success' : sessao.acerto >= 60 ? 'warning' : 'danger'} shape="rounded-pill">
                              {sessao.acerto}%
                            </CBadge>
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    ) : (
                      <CTableRow>
                        <CTableDataCell colSpan={4} className="text-center py-4 text-body-tertiary small">
                          Nenhuma atividade recente.
                        </CTableDataCell>
                      </CTableRow>
                    )}
                  </CTableBody>
                </CTable>
              </div>
            )}
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs>
          {/* Horizontal Section Divider */}
          <div className="w-full h-px bg-slate-200/60 dark:bg-slate-700/50 mb-8 mt-4"></div>
          
          <CCard className="bg-card border border-border/50 rounded-[1.5rem] shadow-sm glass-panel mb-4 overflow-hidden transition-all duration-300 hover:shadow-md">
            <CCardHeader className="bg-transparent border-bottom border-border/50 d-flex align-items-center gap-2 p-5">
              <CIcon icon={cilChart} className="text-primary" />
              <strong className="text-primary fs-5">Resumo Real do Projeto e Desempenho Global</strong>
            </CCardHeader>
            <CCardBody className="p-4">
              {/* Gráfico */}
              {errorChart ? (
                <CAlert color="warning">Gráfico indisponível: {errorChart}</CAlert>
              ) : (
                <MainChart data={chartData} loading={loadingChart} />
              )}

              <hr />

              {/* Tabela de alunos */}
              <div className="d-flex justify-content-between align-items-center mt-4 mb-3">
                <h5 className="mb-0 d-flex align-items-center gap-2">
                  <CIcon icon={cilPeople} className="text-primary" />
                  Top Alunos
                  {!loadingAlunos && (
                    <span className="text-body-secondary fs-6 ms-2">({data.total} no total)</span>
                  )}
                </h5>
                <CButton
                  color="info"
                  variant="outline"
                  size="sm"
                  onClick={exportarCSV}
                  disabled={estudantes.length === 0 || loadingAlunos}
                >
                  <CIcon icon={cilCloudDownload} className="me-1" /> Exportar CSV
                </CButton>
              </div>

              {errorAlunos && (
                <CAlert color="danger">Erro ao carregar alunos: {errorAlunos}</CAlert>
              )}

              <div className="table-responsive">
                <CTable align="middle" className="mb-0 border" hover>
                  <CTableHead className="text-nowrap">
                    <CTableRow>
                      <CTableHeaderCell className="bg-body-tertiary text-center" style={{ width: '60px' }}>#</CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary">Matrícula / Nome</CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary text-center">Média</CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary">Questões</CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary text-center">Sessões</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {loadingAlunos
                      ? [...Array(porPagina)].map((_, i) => <SkeletonRow key={i} isDark={isDark} />)
                      : estudantes.length === 0
                        ? (
                          <CTableRow>
                            <CTableDataCell colSpan={5} className="text-center py-4 text-body-secondary">
                              Nenhum dado encontrado para este perfil.
                            </CTableDataCell>
                          </CTableRow>
                        )
                        : estudantes.map((item, index) => {
                          const rank = (pagina - 1) * porPagina + index + 1
                          const media = item.media_numero || 0
                          const gradeColor = media >= 80 ? 'success' : media >= 60 ? 'warning' : 'danger'
                          return (
                            <CTableRow key={item.matricula} className="align-middle">
                              <CTableDataCell className="text-center fw-bold small">{rank}</CTableDataCell>
                              <CTableDataCell>
                                <div className="fw-medium">{item.nome}</div>
                                <div className="small text-body-secondary">{item.matricula}</div>
                              </CTableDataCell>
                              <CTableDataCell>
                                <div className={`fw-semibold text-${gradeColor} small`}>{media.toFixed(1)}%</div>
                                <CProgress thin color={gradeColor} value={media} className="mt-1" />
                              </CTableDataCell>
                              <CTableDataCell>
                                <span className="small">{item.questoes} perguntas</span>
                              </CTableDataCell>
                              <CTableDataCell className="text-center">
                                <span className="badge bg-primary px-2 py-1">{item.sessoes}</span>
                              </CTableDataCell>
                            </CTableRow>
                          )
                        })}
                  </CTableBody>
                </CTable>
              </div>

              {!loadingAlunos && total_paginas > 1 && (
                <div className="d-flex justify-content-center mt-3">
                  <CPagination>
                    <CPaginationItem disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>
                      Anterior
                    </CPaginationItem>
                    {[...Array(total_paginas)].map((_, i) => (
                      <CPaginationItem
                        key={i + 1}
                        active={pagina === i + 1}
                        onClick={() => setPagina(i + 1)}
                      >
                        {i + 1}
                      </CPaginationItem>
                    ))}
                    <CPaginationItem
                      disabled={pagina === total_paginas}
                      onClick={() => setPagina(p => p + 1)}
                    >
                      Próxima
                    </CPaginationItem>
                  </CPagination>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

export default Dashboard