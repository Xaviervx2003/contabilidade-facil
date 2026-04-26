import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CFormSelect,
  CButton,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChart, cilTask, cilStar, cilClock, cilPeople, cilDataTransferDown } from '@coreui/icons'
import { CChartLine } from '@coreui/react-chartjs'
import { API_URL } from '../../config'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const formatTempo = (segundos = 0) => {
  const s = Number(segundos || 0)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m`
}

const exportarCSV = (dados, mes, ano) => {
  if (!dados.length) return
  const cabecalho = 'Dia,Sessões,Questões,Média de Acerto (%),Tempo Total (segundos)\n'
  const linhas = dados
    .map(
      (d) =>
        `${d.dia},${d.sessoes},${d.questoes},${d.media_acerto.toFixed(1)},${d.tempo_total_segundos}`,
    )
    .join('\n')
  const blob = new Blob([cabecalho + linhas], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio_${ano}_${String(mes).padStart(2, '0')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ─── stat card ───────────────────────────────────────────────────────────── */

const STAT_META = [
  {
    key: 'total_sessoes',
    label: 'Sessões',
    icon: cilTask,
    accent: '#6366f1',
    bg: 'rgba(99,102,241,0.10)',
    format: (v) => v,
  },
  {
    key: 'total_questoes',
    label: 'Questões',
    icon: cilChart,
    accent: '#0ea5e9',
    bg: 'rgba(14,165,233,0.10)',
    format: (v) => v,
  },
  {
    key: 'media_acerto',
    label: 'Média de Acerto',
    icon: cilStar,
    accent: '#10b981',
    bg: 'rgba(16,185,129,0.10)',
    format: (v) => `${Number(v || 0).toFixed(1)}%`,
  },
  {
    key: 'tempo_total_segundos',
    label: 'Tempo Total',
    icon: cilClock,
    accent: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
    format: (v) => formatTempo(v),
  },
  {
    key: 'alunos_ativos',
    label: 'Alunos Ativos',
    icon: cilPeople,
    accent: '#ec4899',
    bg: 'rgba(236,72,153,0.10)',
    format: (v) => v,
  },
]

const StatCard = ({ meta, value, isDark }) => {
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#fff'
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        padding: '20px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: '100%',
        boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.35)' : '0 2px 12px rgba(0,0,0,0.06)',
        transition: 'box-shadow .2s',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: meta.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <CIcon icon={meta.icon} style={{ color: meta.accent, width: 22, height: 22 }} />
      </div>
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)',
            marginBottom: 2,
          }}
        >
          {meta.label}
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.1,
            color: meta.accent,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {meta.format(value)}
        </div>
      </div>
    </div>
  )
}

/* ─── section header ──────────────────────────────────────────────────────── */

const SectionHeader = ({ emoji, title, isDark, children }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <span
        style={{
          fontWeight: 700,
          fontSize: 15,
          color: isDark ? '#e2e8f0' : '#1e293b',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </span>
    </div>
    {children}
  </div>
)

/* ─── main component ──────────────────────────────────────────────────────── */

const Relatorios = () => {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState({
    resumo_mes: {
      total_sessoes: 0,
      total_questoes: 0,
      media_acerto: 0,
      tempo_total_segundos: 0,
      alunos_ativos: 0,
    },
    melhor_dia: null,
    serie_diaria: [],
    periodo: { mes: new Date().getMonth() + 1, ano: new Date().getFullYear() },
  })
  const [materias, setMaterias] = useState([])
  const [filtroMateria, setFiltroMateria] = useState('')
  const [isDark, setIsDark] = useState(false)

  const userId = sessionStorage.getItem('userId')

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-coreui-theme')
      setIsDark(theme === 'dark')
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-coreui-theme'],
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    fetch(`${API_URL}/api/materias`)
      .then((res) => res.json())
      .then((data) => setMaterias(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const buscarRelatorio = async (mes, ano) => {
    try {
      setLoading(true)
      setErro('')
      const params = new URLSearchParams()
      if (userId) params.append('usuario_id', userId)
      if (mes) params.append('mes', mes)
      if (ano) params.append('ano', ano)
      if (filtroMateria) params.append('materia_id', filtroMateria)

      const res = await fetch(`${API_URL}/api/relatorios/estudo?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setDados(json)
    } catch (e) {
      setErro(`Falha ao carregar relatório: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const hoje = new Date()
    buscarRelatorio(
      dados.periodo.mes || hoje.getMonth() + 1,
      dados.periodo.ano || hoje.getFullYear(),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, filtroMateria])

  const handlePeriodoChange = (e) => {
    const [ano, mes] = e.target.value.split('-').map(Number)
    if (ano && mes) {
      setDados((prev) => ({ ...prev, periodo: { mes, ano } }))
      buscarRelatorio(mes, ano)
    }
  }

  const periodoValue = `${dados.periodo.ano}-${String(dados.periodo.mes).padStart(2, '0')}`

  const diasComAtividade = useMemo(
    () => dados.serie_diaria.filter((d) => d.questoes > 0).length,
    [dados.serie_diaria],
  )

  const labelsGrafico = useMemo(
    () => dados.serie_diaria.map((d) => d.dia.split('-')[2]),
    [dados.serie_diaria],
  )
  const questoesData = useMemo(
    () => dados.serie_diaria.map((d) => d.questoes),
    [dados.serie_diaria],
  )
  const mediaData = useMemo(
    () => dados.serie_diaria.map((d) => d.media_acerto),
    [dados.serie_diaria],
  )

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
        },
        y1: {
          position: 'right',
          beginAtZero: true,
          max: 100,
          ticks: { callback: (v) => `${v}%` },
          grid: { drawOnChartArea: false },
        },
      },
    }),
    [isDark],
  )

  /* styles */
  const cardStyle = {
    background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
    borderRadius: 16,
    boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.35)' : '0 2px 12px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  }

  const inputStyle = isDark
    ? {
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: '#e2e8f0',
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 10,
        height: 38,
      }
    : { borderRadius: 10, height: 38 }

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.42)',
    marginBottom: 6,
    display: 'block',
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          minHeight: 240,
          color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
        }}
      >
        <CSpinner style={{ color: '#6366f1', width: 36, height: 36 }} />
        <span style={{ fontSize: 14, fontWeight: 500 }}>Carregando relatório...</span>
      </div>
    )
  }

  return (
    <>
      {erro && (
        <CAlert color="danger" style={{ borderRadius: 12, marginBottom: 20, fontSize: 14 }}>
          {erro}
        </CAlert>
      )}

      {/* ── Filtros ── */}
      <div
        style={{
          ...cardStyle,
          padding: '18px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 160 }}>
          <label style={labelStyle}>Período</label>
          <input
            type="month"
            className="form-control"
            value={periodoValue}
            onChange={handlePeriodoChange}
            style={{ ...inputStyle, fontSize: 14 }}
          />
        </div>

        <div style={{ minWidth: 200 }}>
          <label style={labelStyle}>Matéria</label>
          <CFormSelect
            value={filtroMateria}
            onChange={(e) => setFiltroMateria(e.target.value)}
            style={{ ...inputStyle, fontSize: 14 }}
          >
            <option value="">Todas as matérias</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </CFormSelect>
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <CButton
            disabled={dados.serie_diaria.length === 0}
            onClick={() => exportarCSV(dados.serie_diaria, dados.periodo.mes, dados.periodo.ano)}
            style={{
              background: 'transparent',
              border: `1px solid ${isDark ? 'rgba(99,102,241,0.5)' : '#6366f1'}`,
              color: '#6366f1',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              padding: '7px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <CIcon icon={cilDataTransferDown} style={{ width: 15, height: 15 }} />
            Exportar CSV
          </CButton>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <CRow className="mb-4 g-3">
        {STAT_META.map((meta) => (
          <CCol key={meta.key} xs={12} sm={6} md={4} lg={true}>
            <StatCard meta={meta} value={dados.resumo_mes[meta.key]} isDark={isDark} />
          </CCol>
        ))}
      </CRow>

      {/* ── Gráfico ── */}
      {dados.serie_diaria.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <SectionHeader
              emoji="📈"
              title="Evolução Diária — Questões e Média de Acerto"
              isDark={isDark}
            />
          </div>
          <div style={{ padding: '20px 20px 12px' }}>
            <CChartLine
              data={{
                labels: labelsGrafico,
                datasets: [
                  {
                    label: 'Questões',
                    data: questoesData,
                    backgroundColor: 'rgba(99,102,241,0.12)',
                    borderColor: '#6366f1',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#6366f1',
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: true,
                  },
                  {
                    label: 'Média Acerto (%)',
                    data: mediaData,
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    borderColor: '#10b981',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#10b981',
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y1',
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        </div>
      )}

      {/* ── Tabela Diária ── */}
      <div style={cardStyle}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <SectionHeader
            emoji="📅"
            title={`Visão Diária — ${dados.periodo.mes}/${dados.periodo.ano}`}
            isDark={isDark}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 13,
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
              }}
            >
              Dias com atividade:
            </span>
            <CBadge
              style={{
                background: 'rgba(99,102,241,0.15)',
                color: '#6366f1',
                fontWeight: 700,
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 13,
              }}
            >
              {diasComAtividade}
            </CBadge>
            {dados.melhor_dia && (
              <>
                <span
                  style={{
                    fontSize: 13,
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                  }}
                >
                  Melhor dia:
                </span>
                <CBadge
                  style={{
                    background: 'rgba(245,158,11,0.15)',
                    color: '#f59e0b',
                    fontWeight: 700,
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: 13,
                  }}
                >
                  {dados.melhor_dia.dia} · {dados.melhor_dia.questoes} questões
                </CBadge>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '8px 0' }}>
          {dados.serie_diaria.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '48px 20px',
                color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.28)',
              }}
            >
              <span style={{ fontSize: 36 }}>📭</span>
              <span style={{ fontSize: 14 }}>
                Nenhum dado encontrado para o período selecionado.
              </span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
                    }}
                  >
                    {['Dia', 'Sessões', 'Questões', 'Média de Acerto', 'Tempo'].map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: '10px 20px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.07em',
                          textTransform: 'uppercase',
                          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.38)',
                          whiteSpace: 'nowrap',
                          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.serie_diaria.map((d, i) => {
                    const isMelhor = dados.melhor_dia?.dia === d.dia
                    const isInativo = d.questoes === 0
                    return (
                      <tr
                        key={d.dia}
                        style={{
                          background: isMelhor
                            ? isDark
                              ? 'rgba(245,158,11,0.10)'
                              : 'rgba(245,158,11,0.07)'
                            : i % 2 === 0
                              ? 'transparent'
                              : isDark
                                ? 'rgba(255,255,255,0.02)'
                                : 'rgba(0,0,0,0.015)',
                          opacity: isInativo ? 0.45 : 1,
                          transition: 'background 0.15s',
                        }}
                      >
                        <td
                          style={{
                            padding: '11px 20px',
                            fontWeight: isMelhor ? 700 : 500,
                            color: isMelhor ? '#f59e0b' : isDark ? '#e2e8f0' : '#1e293b',
                            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isMelhor && <span style={{ marginRight: 6 }}>🏆</span>}
                          {d.dia}
                        </td>
                        <td style={tdStyle(isDark)}>{d.sessoes}</td>
                        <td style={tdStyle(isDark)}>
                          <span
                            style={{
                              fontWeight: d.questoes > 0 ? 700 : 400,
                              color: d.questoes > 0 ? '#6366f1' : undefined,
                            }}
                          >
                            {d.questoes}
                          </span>
                        </td>
                        <td style={tdStyle(isDark)}>
                          {d.questoes > 0 ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: 52,
                                  height: 6,
                                  borderRadius: 99,
                                  background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                  overflow: 'hidden',
                                }}
                              >
                                <span
                                  style={{
                                    display: 'block',
                                    height: '100%',
                                    width: `${d.media_acerto}%`,
                                    background:
                                      d.media_acerto >= 70
                                        ? '#10b981'
                                        : d.media_acerto >= 50
                                          ? '#f59e0b'
                                          : '#ef4444',
                                    borderRadius: 99,
                                  }}
                                />
                              </span>
                              {Number(d.media_acerto || 0).toFixed(1)}%
                            </span>
                          ) : (
                            <span
                              style={{
                                color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdStyle(isDark), fontVariantNumeric: 'tabular-nums' }}>
                          {d.tempo_total_segundos > 0 ? formatTempo(d.tempo_total_segundos) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const tdStyle = (isDark) => ({
  padding: '11px 20px',
  color: isDark ? 'rgba(255,255,255,0.75)' : '#374151',
  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
  whiteSpace: 'nowrap',
})

export default Relatorios
