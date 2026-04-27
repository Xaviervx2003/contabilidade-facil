import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CSpinner,
} from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import {
  cilList,
  cilStar,
  cilCheckCircle,
  cilClock,
  cilChart,
} from '@coreui/icons'
import { API_URL } from '../../config'

// ── Utilitários ────────────────────────────────────────────
const formatarData = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const formatarDataCurta = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const formatarTempo = (seg) => {
  if (!seg) return '0m'
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

// ── Componente de Card de Resumo ────────────────────────────
const ResumoCard = ({ titulo, valor, cor, icone }) => (
  <div className={`d-flex align-items-center p-3 rounded-3 shadow-sm border-${cor}`}
    style={{ backgroundColor: `var(--cui-${cor}-bg-subtle)`, borderLeft: `4px solid var(--cui-${cor})` }}>
    <div className="me-3 fs-3" style={{ color: `var(--cui-${cor})` }}>
      <CIcon icon={icone} size="lg" />
    </div>
    <div>
      <div className="text-body-secondary small">{titulo}</div>
      <div className="fs-4 fw-bold" style={{ color: `var(--cui-${cor})` }}>{valor}</div>
    </div>
  </div>
)

// ── Componente Principal ────────────────────────────────────
const Historico = () => {
  const [sessoes, setSessoes] = useState([])
  const [loading, setLoading] = useState(true)
  const matricula = sessionStorage.getItem('matricula')
  const nome = sessionStorage.getItem('nome') || 'Aluno'

  useEffect(() => {
    if (!matricula) {
      setLoading(false)
      return
    }
    fetch(`${API_URL}/api/sessoes/${matricula}`)
      .then((res) => res.json())
      .then((data) => {
        setSessoes(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch((err) => {
        console.error('Erro ao carregar histórico:', err)
        setLoading(false)
      })
  }, [matricula])

  // ── Estados de loading / vazio ─────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" size="sm" />
        <p className="mt-3 text-muted small">Carregando seu histórico...</p>
      </div>
    )
  }

  if (!matricula) {
    return <CAlert color="warning">Faça login para ver seu histórico.</CAlert>
  }

  // ── Cálculos para os cards ─────────────────────────────────
  const totalSessoes = sessoes.length
  const melhorNota = totalSessoes > 0 ? Math.max(...sessoes.map((s) => s.taxa_acerto)).toFixed(1) : '0'
  const totalQuestoes = sessoes.reduce((acc, s) => acc + s.questoes, 0)
  const mediaGeral = totalSessoes > 0
    ? (sessoes.reduce((acc, s) => acc + s.taxa_acerto, 0) / totalSessoes).toFixed(1)
    : '0'

  const sessoesOrdemCronologica = [...sessoes].reverse()

  return (
    <div className="p-3 p-md-4">
      {/* ── Cabeçalho ────────────────────────────────────── */}
      <div className="mb-4">
        <h3 className="mb-1 d-flex align-items-center gap-2">
          <CIcon icon={cilList} size="lg" className="text-primary" />
          Meu Histórico de Estudos
        </h3>
        <p className="text-muted small mb-0">
          Olá, <strong>{nome}</strong>! Acompanhe todas as suas sessões de quiz.
        </p>
      </div>

      {/* ── Conteúdo ─────────────────────────────────────── */}
      {totalSessoes === 0 ? (
        <CCard className="text-center p-5 border-0 shadow-sm">
          <CCardBody>
            <div className="fs-1 mb-3">📚</div>
            <h5 className="text-muted">Nenhum quiz realizado</h5>
            <p className="text-muted small">Comece agora na aba <strong>Quiz</strong> para construir seu histórico.</p>
          </CCardBody>
        </CCard>
      ) : (
        <>
          {/* ── Cards de resumo ────────────────────────── */}
          <CRow className="g-3 mb-4">
            <CCol xs={6} md={3}>
              <ResumoCard
                titulo="Total de Sessões"
                valor={totalSessoes}
                cor="primary"
                icone={cilList}
              />
            </CCol>
            <CCol xs={6} md={3}>
              <ResumoCard
                titulo="Melhor Nota"
                valor={`${melhorNota}%`}
                cor="success"
                icone={cilStar}
              />
            </CCol>
            <CCol xs={6} md={3}>
              <ResumoCard
                titulo="Questões Realizadas"
                valor={totalQuestoes}
                cor="info"
                icone={cilCheckCircle}
              />
            </CCol>
            <CCol xs={6} md={3}>
              <ResumoCard
                titulo="Média Geral"
                valor={`${mediaGeral}%`}
                cor="warning"
                icone={cilChart}
              />
            </CCol>
          </CRow>

          {/* ── Gráfico de evolução ────────────────────── */}
          {sessoes.length >= 2 && (
            <CCard className="mb-4 shadow-sm border-0">
              <CCardHeader className="bg-transparent border-0 d-flex align-items-center gap-2">
                <CIcon icon={cilChart} className="text-primary" />
                <strong>Evolução do Desempenho</strong>
              </CCardHeader>
              <CCardBody>
                <CChartLine
                  data={{
                    labels: sessoesOrdemCronologica.map((s) => formatarDataCurta(s.data)),
                    datasets: [
                      {
                        label: 'Nota (%)',
                        backgroundColor: 'rgba(75, 192, 192, 0.15)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        pointBackgroundColor: sessoesOrdemCronologica.map((s) =>
                          s.taxa_acerto >= 80 ? '#2eb85c' : s.taxa_acerto >= 60 ? '#f9b115' : '#e55353'
                        ),
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        fill: true,
                        tension: 0.3,
                        data: sessoesOrdemCronologica.map((s) => s.taxa_acerto.toFixed(1)),
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: '#1e2a38',
                        titleColor: '#7eb8f7',
                        bodyColor: '#e0e8f0',
                        borderColor: '#2d3f52',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                      },
                    },
                    scales: {
                      y: {
                        min: 0,
                        max: 100,
                        ticks: {
                          callback: (v) => `${v}%`,
                          color: '#8a9bb0',
                        },
                        grid: { color: '#2d3f52' },
                      },
                      x: {
                        ticks: { color: '#8a9bb0' },
                        grid: { display: false },
                      },
                    },
                  }}
                />
                <div className="d-flex justify-content-center gap-4 mt-3 small text-muted">
                  <span><span className="badge bg-success">&nbsp;</span> ≥ 80%</span>
                  <span><span className="badge bg-warning">&nbsp;</span> 60-79%</span>
                  <span><span className="badge bg-danger">&nbsp;</span> &lt; 60%</span>
                </div>
              </CCardBody>
            </CCard>
          )}

          {/* ── Tabela de detalhes ──────────────────────── */}
          <CCard className="shadow-sm border-0">
            <CCardHeader className="bg-transparent border-0 d-flex align-items-center gap-2">
              <CIcon icon={cilClock} className="text-primary" />
              <strong>Detalhes das Sessões</strong>
            </CCardHeader>
            <CCardBody className="p-0 p-md-3">
              <div className="table-responsive">
                <CTable align="middle" hover className="mb-0">
                  <CTableHead className="text-nowrap" color="light">
                    <CTableRow>
                      <CTableHeaderCell className="text-center" style={{ width: '40px' }}>#</CTableHeaderCell>
                      <CTableHeaderCell>Data</CTableHeaderCell>
                      <CTableHeaderCell>Assunto</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Questões</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Nota</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Tempo</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Status</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {sessoes.map((sessao, index) => {
                      const aprova = sessao.taxa_acerto >= 60
                      const cor = sessao.taxa_acerto >= 80 ? 'success' : sessao.taxa_acerto >= 60 ? 'warning' : 'danger'
                      return (
                        <CTableRow key={sessao.id} className="align-middle">
                          <CTableDataCell className="text-center small text-muted">{index + 1}</CTableDataCell>
                          <CTableDataCell className="small">{formatarData(sessao.data)}</CTableDataCell>
                          <CTableDataCell>
                            <span className="fw-medium">{sessao.assunto}</span>
                          </CTableDataCell>
                          <CTableDataCell className="text-center fw-bold small">{sessao.questoes}</CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CBadge color={cor} shape="rounded-pill" className="px-3 py-1 fs-6">
                              {sessao.taxa_acerto.toFixed(1)}%
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="text-center small">
                            <CIcon icon={cilClock} size="sm" className="me-1 text-muted" />
                            {formatarTempo(sessao.tempo_segundos)}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            {aprova ? (
                              <span className="text-success small fw-medium">
                                <CIcon icon={cilCheckCircle} size="sm" className="me-1" />
                                Aprovado
                              </span>
                            ) : (
                              <span className="text-danger small fw-medium">
                                ❌ Reprovado
                              </span>
                            )}
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              </div>
            </CCardBody>
          </CCard>
        </>
      )}
    </div>
  )
}

export default Historico