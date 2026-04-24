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
import { cilPeople, cilCloudDownload, cilWarning } from '@coreui/icons'

import { API_URL } from '../../config'
import WidgetsDropdown from '../widgets/WidgetsDropdown'
import MainChart from './MainChart'

// ─────────────────────────────────────────────────────────────
// FIX #8: helper para pegar userId com aviso se ausente
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Hook: stats do dashboard
// ─────────────────────────────────────────────────────────────
const useDashboardStats = (userId) => {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(buildUrl('/api/dashboard', userId))
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => { setStats(data); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [userId])

  return { stats, loading, error }
}

// ─────────────────────────────────────────────────────────────
// FIX #4: hook para dados reais do gráfico (sessões por mês)
// ─────────────────────────────────────────────────────────────
export const useChartData = (userId) => {
  const [chartData, setChartData] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(buildUrl('/api/dashboard/sessoes-por-mes', userId))
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => { setChartData(data); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [userId])

  return { chartData, loading, error }
}

// ─────────────────────────────────────────────────────────────
// FIX #7: hook paginado de alunos (server-side)
// ─────────────────────────────────────────────────────────────
const useAlunos = (userId, pagina, porPagina = 10) => {
  const [data,    setData]    = useState({ alunos: [], total: 0, total_paginas: 1 })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(buildUrl('/api/alunos/desempenho', userId, { pagina, por_pagina: porPagina }))
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => { setData(data); setLoading(false) })
      .catch(err  => { setError(err.message); setLoading(false) })
  }, [userId, pagina, porPagina])

  return { data, loading, error }
}

// ─────────────────────────────────────────────────────────────
// FIX #9: Skeleton de linha para tabela
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
const Dashboard = () => {
  // FIX #8: pega userId com aviso se null
  const userId = getUserId()

  const [pagina,   setPagina]   = useState(1)
  const porPagina = 10

  const { stats,    loading: loadingStats,  error: errorStats  } = useDashboardStats(userId)
  const { data,     loading: loadingAlunos, error: errorAlunos } = useAlunos(userId, pagina, porPagina)
  const { chartData, loading: loadingChart, error: errorChart  } = useChartData(userId)

  const { alunos, total_paginas } = data

  // ── Export CSV (apenas a página atual; para exportar tudo mude por_pagina)
  const exportarCSV = useCallback(() => {
    if (alunos.length === 0) return
    const header = 'Nome,Matrícula,Média (%),Questões,Sessões\n'
    const rows = alunos.map(a =>
      `"${a.nome.replace(/"/g, '""')}",${a.matricula},${(a.media_numero || 0).toFixed(1)},${a.questoes},${a.sessoes}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = `relatorio_desempenho_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [alunos])

  return (
    <>
      {/* FIX #8: aviso quando userId não está na sessão */}
      {!userId && (
        <CAlert color="warning" className="mb-3 d-flex align-items-center gap-2">
          <CIcon icon={cilWarning} />
          <span>
            Sessão não identificada – exibindo dados globais (modo admin).
            Faça login para filtrar por perfil.
          </span>
        </CAlert>
      )}

      {/* FIX #10: erro nos stats */}
      {errorStats && (
        <CAlert color="danger" className="mb-3">
          Erro ao carregar métricas: {errorStats}
        </CAlert>
      )}

      <WidgetsDropdown
        className="mb-4"
        customStats={stats ?? { usuarios_ativos: 0, total_questoes_resolvidas: 0, tempo_medio_minutos: 0 }}
        loading={loadingStats}
      />

      <CRow>
        <CCol xs>
          <CCard className="mb-4">
            <CCardHeader>Resumo Real do Projeto {' & '} Desempenho Global</CCardHeader>
            <CCardBody>

              {/* ── Mini stats ── */}
              <CRow>
                <CCol xs={12} md={6} xl={6}>
                  <CRow>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-info py-1 px-3">
                        <div className="text-body-secondary text-truncate small">Perguntas Respondidas</div>
                        <div className="fs-5 fw-semibold">
                          {loadingStats ? <CSpinner size="sm" /> : (stats?.total_questoes_resolvidas ?? '—')}
                        </div>
                      </div>
                    </CCol>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-danger py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">Sessões Únicas</div>
                        <div className="fs-5 fw-semibold">
                          {loadingStats ? <CSpinner size="sm" /> : (stats?.usuarios_ativos ?? '—')}
                        </div>
                      </div>
                    </CCol>
                  </CRow>
                </CCol>
                <CCol xs={12} md={6} xl={6}>
                  <CRow>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-warning py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">Tempo Médio Gasto</div>
                        <div className="fs-5 fw-semibold">
                          {loadingStats ? <CSpinner size="sm" /> : `${stats?.tempo_medio_minutos ?? '—'} Min`}
                        </div>
                      </div>
                    </CCol>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-success py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">Engajamento Atual</div>
                        <div className="fs-5 fw-semibold text-success">Ativo</div>
                      </div>
                    </CCol>
                  </CRow>
                </CCol>
              </CRow>

              <br />

              {/* FIX #4: gráfico com dados reais */}
              {errorChart ? (
                <CAlert color="warning">Gráfico indisponível: {errorChart}</CAlert>
              ) : (
                <MainChart data={chartData} loading={loadingChart} />
              )}

              <br />

              {/* ── Tabela de alunos ── */}
              <div className="d-flex justify-content-between align-items-center mt-4 mb-3">
                <h5 className="mb-0">
                  Top Alunos
                  {!loadingAlunos && (
                    <span className="text-body-secondary fs-6 ms-2">
                      ({data.total} no total)
                    </span>
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

              {/* FIX #10: erro nos alunos */}
              {errorAlunos && (
                <CAlert color="danger">Erro ao carregar alunos: {errorAlunos}</CAlert>
              )}

              <CTable align="middle" className="mb-0 border" hover responsive>
                <CTableHead className="text-nowrap">
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      <CIcon icon={cilPeople} />
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Matrícula / Nome</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      Média Ponderada
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Questões Treinadas</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">Sessões</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {/* FIX #9: skeleton durante carregamento */}
                  {loadingAlunos ? (
                    [...Array(porPagina)].map((_, i) => <SkeletonRow key={i} />)
                  ) : alunos.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={5} className="text-center py-4 text-body-secondary">
                        Nenhum dado encontrado para este perfil.
                      </CTableDataCell>
                    </CTableRow>
                  ) : alunos.map((item, index) => {
                    const rank       = (pagina - 1) * porPagina + index + 1
                    const gradeColor = (item.media_numero || 0) >= 80 ? 'success' : (item.media_numero || 0) >= 60 ? 'warning' : 'danger'

                    return (
                      <CTableRow key={item.matricula}>
                        <CTableDataCell className="text-center">
                          <strong>#{rank}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="fw-bold">{item.nome}</div>
                          <div className="small text-body-secondary text-nowrap">{item.matricula}</div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className={`fw-semibold text-${gradeColor}`}>
                            {(item.media_numero || 0).toFixed(1)}%
                          </div>
                          <CProgress thin color={gradeColor} value={item.media_numero || 0} />
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="small text-body-secondary">Volume Praticado</div>
                          <div className="fw-semibold text-nowrap">{item.questoes} perguntas</div>
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <span className="badge bg-primary px-3 py-2">{item.sessoes}</span>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>

              {/* FIX #7: paginação */}
              {!loadingAlunos && total_paginas > 1 && (
                <div className="d-flex justify-content-center mt-3">
                  <CPagination>
                    <CPaginationItem
                      disabled={pagina === 1}
                      onClick={() => setPagina(p => p - 1)}
                    >
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

      {/* Animação shimmer para skeletons */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}

export default Dashboard