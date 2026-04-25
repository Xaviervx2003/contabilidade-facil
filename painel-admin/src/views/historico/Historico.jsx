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
import { API_URL } from '../../config'

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
  if (!seg) return '0m 0s'
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${m}m ${s}s`
}

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

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
        <p className="mt-3 text-muted">Carregando seu histórico...</p>
      </div>
    )
  }

  if (!matricula) {
    return <CAlert color="warning">Faça login para ver seu histórico.</CAlert>
  }

  const sessoesOrdemCronologica = [...sessoes].reverse()

  return (
    <>
      <h3 className="mb-4">📚 Meu Histórico de Estudos</h3>
      <p className="text-muted mb-4">
        Olá, <strong>{nome}</strong>! Aqui estão todas as suas sessões de quiz.
      </p>

      {sessoes.length === 0 ? (
        <CAlert color="secondary">
          Você ainda não completou nenhum quiz. Comece agora na aba <strong>Quiz</strong>!
        </CAlert>
      ) : (
        <CRow>
          <CCol xs={12}>
            {/* Resumo rápido */}
            <CRow className="mb-4">
              <CCol xs={6} md={3}>
                <div className="border-start border-start-4 border-start-primary py-1 px-3">
                  <div className="text-body-secondary small">Total de Sessões</div>
                  <div className="fs-5 fw-semibold">{sessoes.length}</div>
                </div>
              </CCol>
              <CCol xs={6} md={3}>
                <div className="border-start border-start-4 border-start-success py-1 px-3">
                  <div className="text-body-secondary small">Melhor Nota</div>
                  <div className="fs-5 fw-semibold">
                    {Math.max(...sessoes.map((s) => s.taxa_acerto)).toFixed(1)}%
                  </div>
                </div>
              </CCol>
              <CCol xs={6} md={3}>
                <div className="border-start border-start-4 border-start-info py-1 px-3">
                  <div className="text-body-secondary small">Total de Questões</div>
                  <div className="fs-5 fw-semibold">
                    {sessoes.reduce((acc, s) => acc + s.questoes, 0)}
                  </div>
                </div>
              </CCol>
              <CCol xs={6} md={3}>
                <div className="border-start border-start-4 border-start-warning py-1 px-3">
                  <div className="text-body-secondary small">Média Geral</div>
                  <div className="fs-5 fw-semibold">
                    {(sessoes.reduce((acc, s) => acc + s.taxa_acerto, 0) / sessoes.length).toFixed(1)}%
                  </div>
                </div>
              </CCol>
            </CRow>

            {/* Gráfico de evolução */}
            {sessoes.length >= 2 && (
              <CCard className="mb-4">
                <CCardHeader>
                  <strong>📈 Evolução do Desempenho</strong>
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
                          callbacks: {
                            title: (ctx) => {
                              const idx = ctx[0].dataIndex
                              const s = sessoesOrdemCronologica[idx]
                              return `${formatarData(s.data)} — ${s.assunto}`
                            },
                            label: (ctx) => `Nota: ${ctx.raw}%`,
                          },
                        },
                      },
                      scales: {
                        y: {
                          min: 0,
                          max: 100,
                          ticks: { callback: (v) => `${v}%` },
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

            <CCard>
              <CCardHeader>
                <strong>Detalhes das Sessões</strong>
              </CCardHeader>
              <CCardBody>
                <CTable align="middle" hover responsive bordered>
                  <CTableHead className="text-nowrap" color="light">
                    <CTableRow>
                      <CTableHeaderCell className="text-center">#</CTableHeaderCell>
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
                      const cor =
                        sessao.taxa_acerto >= 80
                          ? 'success'
                          : sessao.taxa_acerto >= 60
                            ? 'warning'
                            : 'danger'
                      return (
                        <CTableRow key={sessao.id}>
                          <CTableDataCell className="text-center">{index + 1}</CTableDataCell>
                          <CTableDataCell>{formatarData(sessao.data)}</CTableDataCell>
                          <CTableDataCell>{sessao.assunto}</CTableDataCell>
                          <CTableDataCell className="text-center fw-bold">
                            {sessao.questoes}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            <CBadge color={cor} shape="rounded-pill" className="px-3 py-2">
                              {sessao.taxa_acerto.toFixed(1)}%
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            {formatarTempo(sessao.tempo_segundos)}
                          </CTableDataCell>
                          <CTableDataCell className="text-center">
                            {sessao.taxa_acerto >= 60 ? '✅ Aprovado' : '❌ Reprovado'}
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}
    </>
  )
}

export default Historico