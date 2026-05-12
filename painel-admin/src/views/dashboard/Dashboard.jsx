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
// ── Componentes auxiliares ──────────────────────────────
const SkeletonBlock = ({ height = 24, width = '100%', className = '' }) => {
  const { isDark } = useTheme()
  return (
    <div
      className={`rounded-3 ${className}`}
      style={{
        height,
        width,
        background: isDark
          ? 'linear-gradient(90deg, var(--color-bg-elevated) 25%, var(--color-border) 50%, var(--color-bg-elevated) 75%)'
          : 'linear-gradient(90deg, var(--color-bg-tertiary) 25%, var(--color-border) 50%, var(--color-bg-tertiary) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
      }}
    />
  )
}

const COR_MAP = {
  info:    { bg: 'rgba(14,165,233,0.12)',  color: '#0ea5e9' },
  success: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  warning: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  danger:  { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
  primary: { bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
}

const StatCard = ({ titulo, valor, cor, icone, loading }) => {
  const { bg, color } = COR_MAP[cor] || COR_MAP.primary
  return (
    <div className="stat-box h-100 fade-in-up" style={{ animationDelay: '0.1s' }}>
      <div
        className="stat-icon-wrapper"
        style={{ background: bg, color, width: 48, height: 48, borderRadius: 14, fontSize: '1.3rem' }}
      >
        <CIcon icon={icone} style={{ color, width: 22, height: 22 }} />
      </div>
      <div className="stat-info">
        <div className="text-uppercase fw-semibold mb-1" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--color-text-tertiary)' }}>
          {titulo}
        </div>
        <div className="fw-bold" style={{ fontSize: 24, color, fontVariantNumeric: 'tabular-nums' }}>
          {loading ? <SkeletonBlock height={28} width="60%" /> : valor}
        </div>
      </div>
    </div>
  )
}

const SkeletonRow = ({ isDark }) => (
  <CTableRow>
    {[...Array(5)].map((_, i) => (
      <CTableDataCell key={i}>
        <SkeletonBlock height={16} width={i === 0 ? '40%' : '80%'} />
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
    <div className="p-3 p-md-4 fade-in">
      <div className="mb-4">
        <div className="text-uppercase text-body-secondary small fw-semibold" style={{ letterSpacing: '0.05em' }}>Indicadores de Performance</div>
        <h3 className="mb-1 fw-bold">Dashboard Administrativo</h3>
        <div className="text-body-secondary small">
          Acompanhamento em tempo real do engajamento e desempenho acadêmico.
        </div>
      </div>
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
          <div className="premium-card h-100 fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <CIcon icon={cilBarChart} className="text-success" />
              <strong className="text-body-primary">Progresso Geral da Turma</strong>
            </div>
            <div className="d-flex flex-column justify-content-center">
              {loadingVisao ? (
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <SkeletonBlock height={14} width="40%" />
                    <SkeletonBlock height={20} width="15%" />
                  </div>
                  <SkeletonBlock height={8} className="rounded-pill" />
                  <div className="d-flex justify-content-center mt-2">
                    <SkeletonBlock height={32} width="25%" />
                  </div>
                  <div className="mt-2 pt-3 border-top">
                    <SkeletonBlock height={14} width="50%" />
                  </div>
                </div>
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
          <div className="premium-card h-100 fade-in-up" style={{ animationDelay: '0.25s' }}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <CIcon icon={cilHistory} className="text-info" />
              <strong className="text-body-primary">Últimas Atividades</strong>
            </div>
            {loadingVisao ? (
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
                    {[...Array(4)].map((_, i) => <SkeletonRow key={i} isDark={isDark} />)}
                  </CTableBody>
                </CTable>
              </div>
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
          <hr className="my-4 border-0" style={{ height: 1, background: 'var(--color-divider)' }} />
          
          <CCard className="premium-card mb-4 border-0 overflow-hidden">
            <CCardHeader className="bg-transparent border-bottom d-flex align-items-center gap-2 p-4">
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