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
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilChart, 
  cilTask, 
  cilStar, 
  cilClock, 
  cilPeople, 
  cilDataTransferDown, 
  cilWarning, 
  cilArrowTop, 
  cilArrowBottom,
  cilTrophy,
  cilHistory
} from '@coreui/icons'
import { CChartLine, CChartBar, CChartRadar } from '@coreui/react-chartjs'
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
  const cabecalho = 'Dia,Alunos Ativos,Sessões,Questões,Média Qtd/Aluno,Média de Acerto (%),Tempo Total (segundos)\n'
  const linhas = dados
    .map(
      (d) =>
        `${d.dia},${d.alunos_ativos || 0},${d.sessoes},${d.questoes},${(d.questoes / (d.alunos_ativos || 1)).toFixed(1)},${d.media_acerto.toFixed(1)},${d.tempo_total_segundos}`,
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
    label: 'Sessões Totais',
    icon: cilTask,
    accent: '#6366f1',
    bg: 'rgba(99,102,241,0.10)',
    format: (v) => v,
  },
  {
    key: 'total_questoes',
    label: 'Questões Resolvidas',
    icon: cilChart,
    accent: '#0ea5e9',
    bg: 'rgba(14,165,233,0.10)',
    format: (v) => v,
  },
  {
    key: 'media_acerto',
    label: 'Precisão Média',
    icon: cilStar,
    accent: '#10b981',
    bg: 'rgba(16,185,129,0.10)',
    format: (v) => `${Number(v || 0).toFixed(1)}%`,
  },
  {
    key: 'alunos_ativos',
    label: 'Alunos Engajados',
    icon: cilPeople,
    accent: '#ec4899',
    bg: 'rgba(236,72,153,0.10)',
    format: (v) => v,
  },
  {
    key: 'ponto_cego',
    label: 'Ponto Cego (Menor %)',
    icon: cilWarning,
    accent: '#ef4444',
    bg: 'rgba(239,68,68,0.10)',
    format: (v) => v || 'N/A',
  },
]

const StatCard = ({ meta, value, isDark, mediaTurma }) => {
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
        <div className="d-flex align-items-baseline gap-2">
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
          {meta.key === 'media_acerto' && (
            <div className="d-flex align-items-center gap-1 ms-1">
              <CIcon 
                icon={value >= (mediaTurma || 0) ? cilArrowTop : cilArrowBottom} 
                style={{ color: value >= (mediaTurma || 0) ? '#10b981' : '#ef4444', width: 14 }} 
              />
              <span 
                className="fw-bold" 
                style={{ fontSize: 10, color: value >= (mediaTurma || 0) ? '#10b981' : '#ef4444' }}
              >
                {value >= (mediaTurma || 0) ? 'ACIMA' : 'ABAIXO'}
              </span>
            </div>
          )}
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
  const [activeTab, setActiveTab] = useState('geral')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState({
    resumo_mes: {
      total_sessoes: 0,
      total_questoes: 0,
      media_acerto: 0,
      tempo_total_segundos: 0,
      alunos_ativos: 0,
      media_turma: 0,
      ponto_cego: 'N/A',
    },
    melhor_dia: null,
    serie_diaria: [],
    ranking: [],
    desempenho_materias: [],
    distribuicao_horaria: {},
    periodo: { mes: new Date().getMonth() + 1, ano: new Date().getFullYear() },
  })
  const [materias, setMaterias] = useState([])
  const [filtroMateria, setFiltroMateria] = useState('')
  const [alunos, setAlunos] = useState([])
  const [filtroAluno, setFiltroAluno] = useState('')
  const [filtroRisco, setFiltroRisco] = useState('all')
  const [isDark, setIsDark] = useState(false)

  // Memoized data for charts
  const radarLabels = useMemo(() => dados.desempenho_materias.map(m => m.materia), [dados])
  const radarData = useMemo(() => dados.desempenho_materias.map(m => m.precisao), [dados])

  const userId = sessionStorage.getItem('userId')
  const papelUsuario = sessionStorage.getItem('papel')

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
    fetch(`${API_URL}/api/admin/materias`)
      .then((res) => res.json())
      .then((data) => setMaterias(Array.isArray(data) ? data : []))
      .catch(() => { })

    if (papelUsuario === 'admin') {
      fetch(`${API_URL}/api/admin/usuarios`)
        .then((res) => res.json())
        .then((data) => {
          const lista = Array.isArray(data)
            ? data
              .filter((u) => u.papel === 'aluno')
              .map((u) => ({ nome: u.nome, matricula: u.matricula }))
            : []
          setAlunos(lista)
        })
        .catch(() => { })
    } else if (papelUsuario === 'professor') {
      fetch(`${API_URL}/api/metricas-estudantes/desempenho?por_pagina=100&pagina=1`)
        .then((res) => res.json())
        .then((data) => {
          const lista = data.estudantes || data.alunos || []
          setAlunos(Array.isArray(lista) ? lista : [])
        })
        .catch(() => { })
    }
  }, [papelUsuario])

  const buscarRelatorio = async (mes, ano) => {
    try {
      setLoading(true)
      setErro('')
      const params = new URLSearchParams()
      if (userId) params.append('usuario_id', userId)
      if (mes) params.append('mes', mes)
      if (ano) params.append('ano', ano)
      if (filtroMateria) params.append('materia_id', filtroMateria)
      if (filtroAluno) params.append('aluno_matricula', filtroAluno)

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
  }, [userId, filtroMateria, filtroAluno])

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
    <div className="fade-in">
      <div className="mb-4">
        <div className="text-uppercase text-body-secondary small fw-semibold" style={{ letterSpacing: '0.05em' }}>BI & Analytics</div>
        <h3 className="mb-1 fw-bold">Relatórios de Estudo</h3>
        <div className="text-body-secondary small d-flex align-items-center gap-2">
          Monitoramento estatístico de engajamento e performance da turma.
          {filtroAluno && (
            <CBadge color="info" variant="outline" className="ms-2">
              Matéria Predominante: Contabilidade Geral
            </CBadge>
          )}
        </div>
      </div>

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
          border: 'none',
          boxShadow: 'var(--cui-card-shadow, 0 10px 30px -10px rgba(0,0,0,0.06))'
        }}
      >
        <div style={{ minWidth: 160 }}>
          <label className="text-uppercase text-body-secondary small fw-bold mb-2" style={{ fontSize: 10, letterSpacing: '0.1em' }}>Período</label>
          <input
            type="month"
            className="form-control"
            value={periodoValue}
            onChange={handlePeriodoChange}
            style={{ ...inputStyle, fontSize: 14 }}
          />
        </div>

        <div style={{ minWidth: 200 }}>
          <label className="text-uppercase text-body-secondary small fw-bold mb-2" style={{ fontSize: 10, letterSpacing: '0.1em' }}>Matéria</label>
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

        {(papelUsuario === 'admin' || papelUsuario === 'professor') && (
          <div style={{ minWidth: 200, flex: 1, maxWidth: 280 }}>
            <label className="text-uppercase text-body-secondary small fw-bold mb-2" style={{ fontSize: 10, letterSpacing: '0.1em' }}>Aluno</label>
            <CFormSelect
              value={filtroAluno}
              onChange={(e) => setFiltroAluno(e.target.value)}
              style={{ ...inputStyle, fontSize: 14 }}
            >
              <option value="">Todos os alunos</option>
              {alunos.map((a) => (
                <option key={a.matricula} value={a.matricula}>
                  {a.nome} ({a.matricula})
                </option>
              ))}
            </CFormSelect>
          </div>
        )}

        <div style={{ minWidth: 150 }}>
          <label className="text-uppercase text-body-secondary small fw-bold mb-2" style={{ fontSize: 10, letterSpacing: '0.1em' }}>Filtrar por Risco</label>
          <CFormSelect
            value={filtroRisco}
            onChange={(e) => setFiltroRisco(e.target.value)}
            style={{ ...inputStyle, fontSize: 14 }}
          >
            <option value="all">Todos os riscos</option>
            <option value="alto">Alto Risco</option>
            <option value="medio">Médio Risco</option>
            <option value="baixo">Baixo Risco</option>
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

      {/* ── Mapa de Calor de Atividade ── */}
      <div style={{ ...cardStyle, padding: '20px', marginBottom: 24 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <SectionHeader emoji="🗓️" title="Intensidade de Estudo (Mapa de Calor)" isDark={isDark} />
          <div className="d-flex gap-2 align-items-center">
            <span className="small text-body-secondary" style={{ fontSize: 10 }}>Menos</span>
            {[0, 0.2, 0.4, 0.6, 0.8].map(o => (
              <div key={o} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(99,102,241,${o + 0.1})` }} />
            ))}
            <span className="small text-body-secondary" style={{ fontSize: 10 }}>Mais</span>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-1">
          {dados.serie_diaria.map((d, idx) => {
            const maxQuestoes = Math.max(...dados.serie_diaria.map(x => x.questoes)) || 1
            const intensity = d.questoes / maxQuestoes
            return (
              <div 
                key={idx}
                title={`${d.dia}: ${d.questoes} questões`}
                style={{ 
                  width: 'calc(100% / 32 - 4px)', 
                  minWidth: 20,
                  height: 20, 
                  borderRadius: 3, 
                  background: d.questoes > 0 ? `rgba(99,102,241, ${0.1 + intensity * 0.9})` : (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                  transition: 'transform 0.1s',
                  cursor: 'pointer'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              />
            )
          })}
        </div>
        <div className="mt-2 text-end small text-body-secondary" style={{ fontSize: 10 }}>
          * Intensidade baseada no volume de questões resolvidas por dia.
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <CRow className="mb-4 g-3">
        {STAT_META.map((meta) => (
          <CCol key={meta.key} xs={12} sm={6} md={4} lg={true}>
            <StatCard meta={meta} value={dados.resumo_mes[meta.key]} isDark={isDark} mediaTurma={dados.resumo_mes.media_turma} />
          </CCol>
        ))}
      </CRow>

      {/* ── Gráficos ── */}
      <CRow className="mb-4 g-4">
        <CCol lg={8}>
          <div style={{ ...cardStyle, height: '100%' }}>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <SectionHeader
                emoji="📈"
                title="Evolução Diária"
                isDark={isDark}
              />
            </div>
            <div style={{ padding: '20px' }}>
              <CChartLine
                data={{
                  labels: labelsGrafico,
                  datasets: [
                    {
                      label: 'Questões',
                      data: questoesData,
                      backgroundColor: 'rgba(99,102,241,0.12)',
                      borderColor: '#6366f1',
                      borderWidth: 2,
                      tension: 0.4,
                      fill: true,
                    },
                    {
                      label: 'Precisão (%)',
                      data: mediaData,
                      borderColor: '#10b981',
                      borderWidth: 2,
                      tension: 0.4,
                      yAxisID: 'y1',
                    },
                    {
                      label: 'Média da Turma',
                      data: Array(labelsGrafico.length).fill(dados.resumo_mes.media_turma),
                      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                      borderWidth: 1,
                      borderDash: [5, 5],
                      pointRadius: 0,
                      fill: false,
                      yAxisID: 'y1',
                    },
                  ],
                }}
                options={chartOptions}
              />
            </div>
          </div>
        </CCol>

        <CCol lg={4}>
          <div style={{ ...cardStyle, height: '100%' }}>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <SectionHeader
                emoji="📊"
                title="Performance por Matéria"
                isDark={isDark}
              />
            </div>
            <div style={{ padding: '20px' }}>
              <CChartBar
                data={{
                  labels: performanceMaterias.map(m => m.materia.split(' ')[0]),
                  datasets: [
                    {
                      label: 'Precisão %',
                      backgroundColor: '#6366f1',
                      data: performanceMaterias.map(m => m.acerto),
                      borderRadius: 5,
                    },
                  ],
                }}
                options={{
                  indexAxis: 'y',
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { max: 100, grid: { display: false } },
                    y: { grid: { display: false } }
                  }
                }}
              />
              <div className="mt-3">
                {performanceMaterias.slice(0, 3).map((m, idx) => (
                  <div key={idx} className="d-flex justify-content-between align-items-center mb-2">
                    <span className="small text-body-secondary">{m.materia}</span>
                    <span className={`small fw-bold ${m.acerto > 70 ? 'text-success' : 'text-warning'}`}>{m.acerto}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CCol>
      </CRow>

      {/* ── Tabs de Navegação ── */}
      <CNav variant="tabs" className="mb-4 border-0">
        <CNavItem>
          <CNavLink 
            href="javascript:void(0)" 
            active={activeTab === 'geral'} 
            onClick={() => setActiveTab('geral')}
            className={`rounded-top-4 fw-bold px-4 ${activeTab === 'geral' ? 'border-bottom-0 shadow-sm' : 'text-body-secondary opacity-50'}`}
          >
            <CIcon icon={cilChart} className="me-2" /> Painel Geral
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink 
            href="javascript:void(0)" 
            active={activeTab === 'performance'} 
            onClick={() => setActiveTab('performance')}
            className={`rounded-top-4 fw-bold px-4 ${activeTab === 'performance' ? 'border-bottom-0 shadow-sm' : 'text-body-secondary opacity-50'}`}
          >
            <CIcon icon={cilTrophy} className="me-2" /> Ranking & Performance
          </CNavLink>
        </CNavItem>
      </CNav>

      <CTabContent>
        <CTabPane visible={activeTab === 'geral'}>
          <CRow className="g-4">
            <CCol lg={6}>
              <div style={{ ...cardStyle, padding: '20px' }}>
                <SectionHeader emoji="🎯" title="Performance por Matéria" isDark={isDark} />
                <CChartBar
                  data={{
                    labels: radarLabels,
                    datasets: [
                      {
                        label: 'Sua Precisão (%)',
                        backgroundColor: '#6366f1',
                        data: radarData,
                        borderRadius: 8,
                      },
                    ],
                  }}
                  options={{
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, max: 100 } }
                  }}
                />
              </div>
            </CCol>
            <CCol lg={6}>
              <div style={{ ...cardStyle, padding: '20px' }}>
                <SectionHeader emoji="⏰" title="Intensidade por Horário" isDark={isDark} />
                <CChartBar
                  data={{
                    labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
                    datasets: [
                      {
                        label: 'Questões',
                        backgroundColor: 'rgba(99,102,241,0.5)',
                        data: Array.from({ length: 24 }, (_, i) => dados.distribuicao_horaria[i] || 0),
                        borderRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                  }}
                />
              </div>
            </CCol>
          </CRow>
        </CTabPane>

        <CTabPane visible={activeTab === 'performance'}>
          <CRow className="g-4">
            {/* Radar Chart & Insights */}
            <CCol lg={5}>
              <div style={{ ...cardStyle, padding: '24px', height: '100%' }}>
                <SectionHeader emoji="🕸️" title="Domínio de Competências" isDark={isDark} />
                <div className="py-4">
                  <CChartRadar
                    data={{
                      labels: radarLabels,
                      datasets: [
                        {
                          label: 'Seu Nível',
                          backgroundColor: 'rgba(99,102,241,0.2)',
                          borderColor: '#6366f1',
                          pointBackgroundColor: '#6366f1',
                          data: radarData,
                        },
                        {
                          label: 'Média Turma',
                          backgroundColor: 'rgba(16,185,129,0.1)',
                          borderColor: '#10b981',
                          pointBackgroundColor: '#10b981',
                          data: Array(radarLabels.length).fill(dados.resumo_mes.media_turma),
                        }
                      ],
                    }}
                    options={{
                      scales: { r: { beginAtZero: true, max: 100, ticks: { display: false } } }
                    }}
                  />
                </div>
                
                <div className="mt-4 p-3 rounded-4 bg-opacity-10 bg-warning border border-warning border-opacity-25">
                  <div className="d-flex align-items-center gap-2 mb-2 text-warning-emphasis fw-bold small">
                    <CIcon icon={cilWarning} /> ASSUNTOS CRÍTICOS
                  </div>
                  {dados.desempenho_materias.filter(m => m.precisao < 60).slice(0, 2).map(m => (
                    <div key={m.materia} className="small mb-1 d-flex justify-content-between">
                      <span>{m.materia}</span>
                      <span className="fw-bold text-danger">{m.precisao}%</span>
                    </div>
                  )) || <div className="small opacity-75">Nenhum alerta crítico detectado. Continue assim!</div>}
                </div>
              </div>
            </CCol>

            {/* Leaderboard */}
            <CCol lg={7}>
              <div style={{ ...cardStyle, padding: '24px', height: '100%' }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <SectionHeader emoji="🏆" title="Ranking da Turma (Top 10)" isDark={isDark} />
                  <CBadge color="primary" shape="rounded-pill" className="px-3 py-2">
                    Global / Mês
                  </CBadge>
                </div>
                <div className="table-responsive">
                  <CTable hover align="middle" className="mb-0 border-0">
                    <CTableHead>
                      <CTableRow className="border-0">
                        <CTableHeaderCell className="border-0 small text-body-secondary fw-bold">Pos</CTableHeaderCell>
                        <CTableHeaderCell className="border-0 small text-body-secondary fw-bold">Estudante</CTableHeaderCell>
                        <CTableHeaderCell className="border-0 small text-body-secondary fw-bold text-center">Questões</CTableHeaderCell>
                        <CTableHeaderCell className="border-0 small text-body-secondary fw-bold text-end pe-3">Precisão</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {dados.ranking.map((r, idx) => (
                        <CTableRow key={idx} className="border-bottom">
                          <CTableDataCell>
                            <div 
                              className={`rounded-circle d-flex align-items-center justify-content-center fw-bold small ${idx < 3 ? 'bg-warning text-dark shadow-sm' : 'text-body-secondary'}`}
                              style={{ width: 24, height: 24, fontSize: 10 }}
                            >
                              {idx + 1}
                            </div>
                          </CTableDataCell>
                          <CTableDataCell className="fw-medium small">
                            {r.aluno}
                            {r.aluno === filtroAluno && <CBadge color="info" className="ms-2">VOCÊ</CBadge>}
                          </CTableDataCell>
                          <CTableDataCell className="text-center tabular-nums small">{r.questoes}</CTableDataCell>
                          <CTableDataCell className="text-end pe-3">
                            <span className={`fw-bold tabular-nums ${r.media >= 80 ? 'text-success' : r.media >= 60 ? 'text-warning' : 'text-danger'}`}>
                              {r.media}%
                            </span>
                            <CIcon 
                              icon={r.media >= dados.resumo_mes.media_turma ? cilArrowTop : cilArrowBottom} 
                              className={`ms-1 ${r.media >= dados.resumo_mes.media_turma ? 'text-success' : 'text-danger'}`}
                              style={{ width: 12 }}
                            />
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              </div>
            </CCol>
          </CRow>
        </CTabPane>
      </CTabContent>

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
                  Maior Engajamento:
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
            {dados.serie_diaria.filter(d => d.questoes >= 10).length > 0 && (
              <>
                <span
                  style={{
                    fontSize: 13,
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                  }}
                >
                  Maior Precisão:
                </span>
                {(() => {
                  const melhorPrecisao = [...dados.serie_diaria]
                    .filter(d => d.questoes >= 5) // Mínimo de questões para ser relevante
                    .sort((a, b) => b.media_acerto - a.media_acerto)[0]
                  
                  return melhorPrecisao ? (
                    <CBadge
                      style={{
                        background: 'rgba(16,185,129,0.15)',
                        color: '#10b981',
                        fontWeight: 700,
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: 13,
                      }}
                    >
                      {melhorPrecisao.dia} · {melhorPrecisao.media_acerto.toFixed(1)}%
                    </CBadge>
                  ) : null
                })()}
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
                    {['Dia', 'Engajamento', 'Questões', 'Tendência', 'Precisão', 'Tempo'].map((col) => (
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
                        <td style={tdStyle(isDark)}>
                          <div className="d-flex align-items-center gap-2">
                            <div 
                              style={{ 
                                width: 8, 
                                height: 8, 
                                borderRadius: '50%', 
                                background: d.alunos_ativos > 0 ? '#10b981' : '#cbd5e1' 
                              }} 
                            />
                            <span className="small text-body-secondary">{d.alunos_ativos || 0} alunos</span>
                          </div>
                        </td>
                        <td style={tdStyle(isDark)}>{d.questoes}</td>
                        <td style={tdStyle(isDark)}>
                          {i > 0 && (
                            <CBadge 
                              color={d.questoes >= (dados.serie_diaria[i-1]?.questoes || 0) ? 'success' : 'danger'} 
                              variant="outline" 
                              className="rounded-pill border-0"
                              style={{ fontSize: 10 }}
                            >
                              {d.questoes >= (dados.serie_diaria[i-1]?.questoes || 0) ? '▲ Melhora' : '▼ Queda'}
                            </CBadge>
                          )}
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
    </div>
  )
}

const tdStyle = (isDark) => ({
  padding: '11px 20px',
  color: isDark ? 'rgba(255,255,255,0.75)' : '#374151',
  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
  whiteSpace: 'nowrap',
})

export default Relatorios
