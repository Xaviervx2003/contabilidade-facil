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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPeople,
  cilCloudDownload,
  cilWarning,
  cilChart,
  cilClock,
  cilCheckCircle,
} from '@coreui/icons'

import { API_URL } from '../../config'
import MainChart from './MainChart'

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
  const [data, setData] = useState({ alunos: [], total: 0, total_paginas: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(buildUrl('/api/alunos/desempenho', userId, { pagina, por_pagina: porPagina }))
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [userId, pagina, porPagina])

  return { data, loading, error }
}

// ── Componentes auxiliares ──────────────────────────────
const StatCard = ({ titulo, valor, cor, icone, loading }) => (
  <div
    className={`p-3 rounded-3 shadow-sm border-start border-4 border-${cor}`}
    style={{ backgroundColor: `var(--cui-${cor}-bg-subtle)` }}
  >
    <div className="d-flex align-items-center gap-2 mb-2">
      <CIcon icon={icone} size="lg" style={{ color: `var(--cui-${cor})` }} />
      <div className="small text-body-secondary">{titulo}</div>
    </div>
    <div className="fs-3 fw-bold" style={{ color: `var(--cui-${cor})` }}>
      {loading ? <CSpinner size="sm" /> : valor}
    </div>
  </div>
)

const SkeletonRow = () => (
  <CTableRow>
    {[...Array(5)].map((_, i) => (
      <CTableDataCell key={i}>
        <div
          style={{
            height: 16,
            borderRadius: 4,
            background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
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

  const { stats, loading: loadingStats, error: errorStats } = useDashboardStats(userId)
  const { data, loading: loadingAlunos, error: errorAlunos } = useAlunos(userId, pagina, porPagina)
  const { chartData, loading: loadingChart, error: errorChart } = useChartData(userId)

  const { alunos, total_paginas } = data

  const exportarCSV = useCallback(() => {
    if (alunos.length === 0) return
    const header = 'Nome,Matrícula,Média (%),Questões,Sessões\n'
    const rows = alunos
      .map(a => `"${a.nome.replace(/"/g, '""')}",${a.matricula},${(a.media_numero || 0).toFixed(1)},${a.questoes},${a.sessoes}`)
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio_desempenho_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [alunos])

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

      {/* Cards de métricas principais (substitui WidgetsDropdown) */}
      <CRow className="g-3 mb-4">
        <CCol xs={12} sm={6} xl={3}>
          <StatCard
            titulo="Usuários Ativos"
            valor={stats?.usuarios_ativos ?? '—'}
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
            titulo="Tempo Médio"
            valor={stats?.tempo_medio_minutos ? `${stats.tempo_medio_minutos} min` : '—'}
            cor="warning"
            icone={cilClock}
            loading={loadingStats}
          />
        </CCol>
        <CCol xs={12} sm={6} xl={3}>
          <StatCard
            titulo="Engajamento"
            valor="Ativo"
            cor="danger"
            icone={cilChart}
            loading={false}
          />
        </CCol>
      </CRow>

      <CRow>
        <CCol xs>
          <CCard className="mb-4 shadow-sm border-0">
            <CCardHeader className="bg-transparent border-0 d-flex align-items-center gap-2">
              <CIcon icon={cilChart} className="text-primary" />
              <strong>Resumo Real do Projeto e Desempenho Global</strong>
            </CCardHeader>
            <CCardBody>
              {/* Mini stats antigos foram substituídos pelos cards acima, mas mantive o bloco opcional caso queira algo adicional */}
              {/* O gráfico permanece */}
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
                  disabled={alunos.length === 0 || loadingAlunos}
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
                      ? [...Array(porPagina)].map((_, i) => <SkeletonRow key={i} />)
                      : alunos.length === 0
                        ? (
                          <CTableRow>
                            <CTableDataCell colSpan={5} className="text-center py-4 text-body-secondary">
                              Nenhum dado encontrado para este perfil.
                            </CTableDataCell>
                          </CTableRow>
                        )
                        : alunos.map((item, index) => {
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