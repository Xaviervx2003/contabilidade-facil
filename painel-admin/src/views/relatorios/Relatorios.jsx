/**
 * Relatórios Acadêmicos — Modo Airbnb Premium
 * BI & Analytics: Painel Geral + Ranking & Performance
 * (Gestão individual de alunos → /admin/desempenho)
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  CAlert, CCol, CFormSelect, CRow, CSpinner,
} from '@coreui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { CChartLine, CChartBar, CChartRadar } from '@coreui/react-chartjs'
import api from '../../services/api'
import { tokens, alpha, acertoColor } from '../../components/abnb/Tokens'
import { SCard, StatCard, AirbnbProgress, SkeletonBlock } from '../../components/abnb/Cards'
import useAuthSession from '../../hooks/useAuthSession'

/* ── helpers ──────────────────────────────────────────────────── */
const formatTempo = (s = 0) => {
  const n = Number(s || 0)
  return `${Math.floor(n / 3600)}h ${Math.floor((n % 3600) / 60)}m`
}

const exportarCSV = (dados, mes, ano) => {
  if (!dados.length) return
  const cab = 'Dia,Alunos Ativos,Sessões,Questões,Média Qtd/Aluno,Média Acerto (%),Tempo Total (s)\n'
  const rows = dados.map(d =>
    `${d.dia},${d.alunos_ativos || 0},${d.sessoes},${d.questoes},${(d.questoes / (d.alunos_ativos || 1)).toFixed(1)},${d.media_acerto.toFixed(1)},${d.tempo_total_segundos}`
  ).join('\n')
  const url = URL.createObjectURL(new Blob([cab + rows], { type: 'text/csv' }))
  Object.assign(document.createElement('a'), {
    href: url,
    download: `relatorio_${ano}_${String(mes).padStart(2, '0')}.csv`,
  }).click()
  URL.revokeObjectURL(url)
}

/* ── Mapa de Calor ────────────────────────────────────────────── */
const HeatMap = ({ serie }) => {
  const max = Math.max(...serie.map(d => d.questoes), 1)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {serie.map((d, i) => {
        const intensity = d.questoes / max
        return (
          <motion.div
            key={i}
            whileHover={{ scale: 1.35, zIndex: 1 }}
            title={`${d.dia}: ${d.questoes} questões`}
            style={{
              width: 'calc(100% / 32 - 4px)', minWidth: 18, height: 18, borderRadius: 3,
              background: d.questoes > 0
                ? `rgba(255,56,92,${0.1 + intensity * 0.9})`
                : 'var(--color-bg-tertiary)',
              cursor: 'pointer', position: 'relative',
            }}
          />
        )
      })}
    </div>
  )
}

/* ── Linha do Ranking ─────────────────────────────────────────── */
const RankRow = ({ r, idx, filtroAluno }) => {
  const color = acertoColor(r.media)
  const medals = ['🥇', '🥈', '🥉']
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Posição */}
      <div style={{
        width: 32, textAlign: 'center', fontWeight: 800, fontSize: 14,
        color: idx < 3 ? tokens.arches : tokens.foggy, flexShrink: 0,
      }}>
        {idx < 3 ? medals[idx] : idx + 1}
      </div>

      {/* Avatar */}
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: alpha(color, 0.1),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon icon="solar:user-bold-duotone" width="18" style={{ color }} />
      </div>

      {/* Nome */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {r.aluno}
          {r.aluno === filtroAluno && (
            <span style={{
              marginLeft: 8, fontSize: 10, fontWeight: 800,
              background: alpha(tokens.babu, 0.15), color: tokens.babu,
              padding: '2px 8px', borderRadius: 99,
            }}>
              VOCÊ
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: tokens.foggy, marginTop: 2 }}>
          {r.questoes} questões respondidas
        </div>
      </div>

      {/* Precisão */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color, lineHeight: 1 }}>{r.media}%</div>
        <div style={{ marginTop: 4, width: 60, height: 4, background: 'var(--color-bg-tertiary)', borderRadius: 99, overflow: 'hidden', marginLeft: 'auto' }}>
          <div style={{ height: '100%', width: `${r.media}%`, background: color, borderRadius: 99 }} />
        </div>
      </div>
    </motion.div>
  )
}

/* ── Componente Principal ─────────────────────────────────────── */
const Relatorios = () => {
  const [activeTab, setActiveTab] = useState('geral')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState({
    resumo_mes: {
      total_sessoes: 0, total_questoes: 0, media_acerto: 0,
      tempo_total_segundos: 0, alunos_ativos: 0, media_turma: 0, ponto_cego: 'N/A',
    },
    melhor_dia: null, serie_diaria: [], ranking: [], desempenho_materias: [],
    distribuicao_horaria: {},
    periodo: { mes: new Date().getMonth() + 1, ano: new Date().getFullYear() },
  })
  const [materias, setMaterias] = useState([])
  const [filtroMateria, setFiltroMateria] = useState('')
  const [alunos, setAlunos] = useState([])
  const [filtroAluno, setFiltroAluno] = useState('')

  const { userId, papel } = useAuthSession()

  /* Detecta tema */
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-coreui-theme') === 'dark')
    check()
    const ob = new MutationObserver(check)
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['data-coreui-theme'] })
    return () => ob.disconnect()
  }, [])

  /* Carrega matérias e alunos para os selects de filtro */
  useEffect(() => {
    api.get('/api/admin/materias')
      .then(res => setMaterias(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})

    if (papel === 'admin') {
      api.get('/api/admin/usuarios')
        .then(res => {
          const d = res.data
          setAlunos(Array.isArray(d)
            ? d.filter(u => u.papel === 'aluno').map(u => ({ nome: u.nome, matricula: u.matricula }))
            : [])
        })
        .catch(() => {})
    } else if (papel === 'professor') {
      api.get('/api/metricas-estudantes/desempenho?por_pagina=100&pagina=1')
        .then(res => { 
          const d = res.data
          setAlunos(Array.isArray(d.estudantes || d.alunos) ? (d.estudantes || d.alunos) : []) 
        })
        .catch(() => {})
    }
  }, [papel])

  /* Busca relatório de estudo */
  const buscarRelatorio = useCallback(async (mes, ano) => {
    try {
      setLoading(true); setErro('')
      const p = new URLSearchParams()
      if (userId) p.append('usuario_id', userId)
      if (mes) p.append('mes', mes)
      if (ano) p.append('ano', ano)
      if (filtroMateria) p.append('materia_id', filtroMateria)
      if (filtroAluno) p.append('aluno_matricula', filtroAluno)
      const res = await api.get(`/api/relatorios/estudo?${p}`)
      setDados(res.data)
    } catch (e) {
      setErro(`Falha ao carregar relatório: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [userId, filtroMateria, filtroAluno])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const hoje = new Date()
    buscarRelatorio(dados.periodo.mes || hoje.getMonth() + 1, dados.periodo.ano || hoje.getFullYear())
  }, [buscarRelatorio]) // buscarRelatorio já é memoizado via useCallback com [userId, filtroMateria, filtroAluno]

  const periodoValue = `${dados.periodo.ano}-${String(dados.periodo.mes).padStart(2, '0')}`
  const handlePeriodo = (e) => {
    const [ano, mes] = e.target.value.split('-').map(Number)
    if (ano && mes) {
      setDados(p => ({ ...p, periodo: { mes, ano } }))
      buscarRelatorio(mes, ano)
    }
  }

  const diasComAtividade = useMemo(() => dados.serie_diaria.filter(d => d.questoes > 0).length, [dados.serie_diaria])
  const radarLabels = useMemo(() => dados.desempenho_materias.map(m => m.materia), [dados])
  const radarData = useMemo(() => dados.desempenho_materias.map(m => m.precisao), [dados])

  const inputStyle = {
    borderRadius: 10, height: 38, fontSize: 14,
    ...(isDark ? { backgroundColor: 'rgba(255,255,255,0.05)', color: '#e2e8f0', borderColor: 'rgba(255,255,255,0.12)' } : {}),
  }

  const TABS = [
    { key: 'geral', icon: 'solar:chart-2-bold-duotone', label: 'Painel Geral' },
    { key: 'performance', icon: 'solar:cup-star-bold-duotone', label: 'Ranking & Performance' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', padding: '32px 16px 48px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            BI & Analytics
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
            Relatórios Acadêmicos
          </div>
          <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
            Monitoramento estatístico de engajamento, tendências e proficiência da turma.
          </div>
        </motion.div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {TABS.map(tab => (
            <motion.button
              key={tab.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                border: activeTab === tab.key ? `1.5px solid ${alpha(tokens.rausch, 0.35)}` : '1.5px solid var(--color-border)',
                background: activeTab === tab.key ? alpha(tokens.rausch, 0.07) : 'var(--color-bg-elevated)',
                color: activeTab === tab.key ? tokens.rausch : tokens.foggy,
                transition: 'all 0.15s',
                boxShadow: activeTab === tab.key ? `0 2px 12px ${alpha(tokens.rausch, 0.12)}` : 'none',
              }}
            >
              <Icon icon={tab.icon} width="18" />
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Filtros */}
        <SCard style={{ marginBottom: 24, padding: '18px 20px' }} delay={0.05}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 160 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: tokens.foggy, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                Período
              </label>
              <input type="month" className="form-control" value={periodoValue} onChange={handlePeriodo} style={inputStyle} />
            </div>
            <div style={{ minWidth: 200 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: tokens.foggy, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                Matéria
              </label>
              <CFormSelect value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)} style={inputStyle}>
                <option value="">Todas as matérias</option>
                {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </CFormSelect>
            </div>
            {(papel === 'admin' || papel === 'professor') && (
              <div style={{ minWidth: 200 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: tokens.foggy, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                  Aluno
                </label>
                <CFormSelect value={filtroAluno} onChange={e => setFiltroAluno(e.target.value)} style={inputStyle}>
                  <option value="">Todos os alunos</option>
                  {alunos.map(a => <option key={a.matricula} value={a.matricula}>{a.nome} ({a.matricula})</option>)}
                </CFormSelect>
              </div>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                disabled={!dados.serie_diaria.length}
                onClick={() => exportarCSV(dados.serie_diaria, dados.periodo.mes, dados.periodo.ano)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: `1px solid ${alpha(tokens.rausch, 0.4)}`,
                  color: tokens.rausch, borderRadius: 10, padding: '8px 16px',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <Icon icon="solar:cloud-download-bold-duotone" width="16" />
                Exportar CSV
              </motion.button>
            </div>
          </div>
        </SCard>

        {erro && (
          <CAlert color="danger" style={{ borderRadius: 12, marginBottom: 20, fontSize: 14 }}>
            {erro}
          </CAlert>
        )}

        {/* Conteúdo das abas */}
        <AnimatePresence mode="wait">

          {/* ── ABA: Painel Geral ──────────────────────────────── */}
          {activeTab === 'geral' && (
            <motion.div key="geral" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: 220 }}>
                  <CSpinner style={{ color: tokens.rausch, width: 38, height: 38 }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: tokens.foggy }}>Carregando relatório...</span>
                </div>
              ) : (
                <>
                  {/* Mapa de Calor */}
                  <SCard style={{ marginBottom: 24 }} delay={0.1}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon icon="solar:calendar-bold-duotone" style={{ color: tokens.rausch }} width="20" />
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
                          Intensidade de Estudo
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, color: tokens.foggy }}>Menos</span>
                        {[0.1, 0.3, 0.5, 0.7, 0.9].map(o => (
                          <div key={o} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(255,56,92,${o})` }} />
                        ))}
                        <span style={{ fontSize: 10, color: tokens.foggy }}>Mais</span>
                      </div>
                    </div>
                    <HeatMap serie={dados.serie_diaria} />
                    <div style={{ fontSize: 11, color: tokens.foggy, textAlign: 'right', marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: tokens.foggy }}>
                        {dados.melhor_dia && (
                          <>🏆 Melhor dia: <strong style={{ color: 'var(--color-text-primary)' }}>{dados.melhor_dia.dia}</strong> ({dados.melhor_dia.questoes} questões)</>
                        )}
                      </span>
                      <span>
                        Dias com atividade: <strong style={{ color: 'var(--color-text-primary)' }}>{diasComAtividade}</strong>
                      </span>
                    </div>
                  </SCard>

                  {/* Stat Cards */}
                  <CRow className="g-3 mb-4">
                    {[
                      { icon: 'solar:folder-check-bold-duotone', label: 'Sessões Totais', value: dados.resumo_mes.total_sessoes, accent: '#6366f1' },
                      { icon: 'solar:notes-bold-duotone', label: 'Questões Resolvidas', value: dados.resumo_mes.total_questoes, accent: tokens.babu },
                      { icon: 'solar:star-bold-duotone', label: 'Precisão Média', value: `${Number(dados.resumo_mes.media_acerto || 0).toFixed(1)}%`, accent: '#10b981' },
                      { icon: 'solar:users-group-rounded-bold-duotone', label: 'Alunos Engajados', value: dados.resumo_mes.alunos_ativos, accent: '#ec4899' },
                      { icon: 'solar:danger-bold-duotone', label: 'Ponto Cego', value: dados.resumo_mes.ponto_cego || 'N/A', accent: tokens.rausch },
                    ].map((s, i) => (
                      <CCol key={i} xs={12} sm={6} md={4} lg={true}>
                        <StatCard {...s} delay={i * 0.06} />
                      </CCol>
                    ))}
                  </CRow>

                  {/* Evolução Diária + Performance por Matéria */}
                  <CRow className="g-4 mb-4">
                    <CCol lg={8}>
                      <SCard delay={0.22} style={{ height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                          <Icon icon="solar:chart-square-bold-duotone" style={{ color: tokens.rausch }} width="20" />
                          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>Evolução Diária</span>
                        </div>
                        <CChartLine
                          data={{
                            labels: dados.serie_diaria.map(d => d.dia.split('-')[2]),
                            datasets: [
                              { label: 'Questões', data: dados.serie_diaria.map(d => d.questoes), backgroundColor: alpha(tokens.rausch, 0.1), borderColor: tokens.rausch, borderWidth: 2, tension: 0.4, fill: true },
                              { label: 'Precisão (%)', data: dados.serie_diaria.map(d => d.media_acerto), borderColor: tokens.babu, borderWidth: 2, tension: 0.4, yAxisID: 'y1' },
                              { label: 'Média Turma', data: Array(dados.serie_diaria.length).fill(dados.resumo_mes.media_turma), borderColor: 'rgba(0,0,0,0.15)', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false, yAxisID: 'y1' },
                            ],
                          }}
                          options={{
                            responsive: true,
                            plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } } },
                            scales: {
                              y: { beginAtZero: true },
                              y1: { position: 'right', max: 100, ticks: { callback: v => `${v}%` }, grid: { drawOnChartArea: false } },
                            },
                          }}
                        />
                      </SCard>
                    </CCol>
                    <CCol lg={4}>
                      <SCard delay={0.3} style={{ height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                          <Icon icon="solar:graph-up-bold-duotone" style={{ color: tokens.babu }} width="20" />
                          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>Performance por Matéria</span>
                        </div>
                        <CChartBar
                          data={{
                            labels: dados.desempenho_materias.map(m => m.materia.split(' ')[0]),
                            datasets: [{
                              label: 'Precisão %',
                              backgroundColor: dados.desempenho_materias.map(m => alpha(acertoColor(m.precisao), 0.85)),
                              data: dados.desempenho_materias.map(m => m.precisao),
                              borderRadius: 5,
                            }],
                          }}
                          options={{
                            indexAxis: 'y',
                            plugins: { legend: { display: false } },
                            scales: {
                              x: { max: 100, grid: { display: false } },
                              y: { grid: { display: false } },
                            },
                          }}
                        />
                        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {dados.desempenho_materias.slice(0, 4).map((m, i) => (
                            <div key={i}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: tokens.foggy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{m.materia}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: acertoColor(m.precisao) }}>{m.precisao}%</span>
                              </div>
                              <AirbnbProgress value={m.precisao} color={acertoColor(m.precisao)} />
                            </div>
                          ))}
                        </div>
                      </SCard>
                    </CCol>
                  </CRow>

                  {/* Horários + Visão Diária */}
                  <CRow className="g-4 mb-4">
                    <CCol lg={6}>
                      <SCard delay={0.35}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                          <Icon icon="solar:clock-circle-bold-duotone" style={{ color: tokens.babu }} width="20" />
                          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>Intensidade por Horário</span>
                        </div>
                        <CChartBar
                          data={{
                            labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
                            datasets: [{
                              label: 'Questões',
                              backgroundColor: Array.from({ length: 24 }, (_, i) => {
                                const val = dados.distribuicao_horaria[i] || 0
                                const max = Math.max(...Object.values(dados.distribuicao_horaria), 1)
                                return alpha(tokens.rausch, 0.2 + (val / max) * 0.7)
                              }),
                              data: Array.from({ length: 24 }, (_, i) => dados.distribuicao_horaria[i] || 0),
                              borderRadius: 4,
                            }],
                          }}
                          options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
                        />
                      </SCard>
                    </CCol>
                    <CCol lg={6}>
                      <SCard delay={0.4} style={{ overflowX: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                          <Icon icon="solar:calendar-bold-duotone" style={{ color: '#8B5CF6' }} width="20" />
                          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
                            Visão Diária — {dados.periodo.mes}/{dados.periodo.ano}
                          </span>
                        </div>
                        {dados.serie_diaria.length === 0 ? (
                          <div style={{ textAlign: 'center', color: tokens.foggy, fontSize: 13, padding: '32px 0' }}>
                            Nenhum dado para o período selecionado.
                          </div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr>
                                {['Dia', 'Alunos', 'Questões', 'Precisão', 'Tempo'].map(c => (
                                  <th key={c} style={{
                                    padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                                    color: tokens.foggy, textTransform: 'uppercase', letterSpacing: '0.07em',
                                    borderBottom: '1px solid var(--color-border)',
                                  }}>{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {dados.serie_diaria.filter(d => d.questoes > 0).slice(0, 12).map((d, i) => {
                                const isMelhor = dados.melhor_dia?.dia === d.dia
                                return (
                                  <tr key={i} style={{ background: isMelhor ? alpha(tokens.arches, 0.06) : 'transparent' }}>
                                    <td style={{ padding: '8px 10px', color: isMelhor ? tokens.arches : 'var(--color-text-primary)', fontWeight: isMelhor ? 700 : 400, borderBottom: '1px solid var(--color-border)' }}>
                                      {isMelhor && '🏆 '}{d.dia.split('-')[2]}
                                    </td>
                                    <td style={{ padding: '8px 10px', color: tokens.foggy, borderBottom: '1px solid var(--color-border)' }}>{d.alunos_ativos || 0}</td>
                                    <td style={{ padding: '8px 10px', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)' }}>{d.questoes}</td>
                                    <td style={{ padding: '8px 10px', fontWeight: 700, color: acertoColor(d.media_acerto), borderBottom: '1px solid var(--color-border)' }}>
                                      {d.media_acerto.toFixed(1)}%
                                    </td>
                                    <td style={{ padding: '8px 10px', color: tokens.foggy, borderBottom: '1px solid var(--color-border)' }}>
                                      {formatTempo(d.tempo_total_segundos)}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        )}
                      </SCard>
                    </CCol>
                  </CRow>
                </>
              )}
            </motion.div>
          )}

          {/* ── ABA: Ranking & Performance ─────────────────────── */}
          {activeTab === 'performance' && (
            <motion.div key="performance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[0, 1].map(i => <SkeletonBlock key={i} h={280} r={20} style={{ marginBottom: 16 }} />)}
                </div>
              ) : (
                <CRow className="g-4">
                  {/* Domínio de Competências — Radar */}
                  <CCol lg={5}>
                    <SCard delay={0.1} style={{ height: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                        <Icon icon="solar:target-bold-duotone" style={{ color: '#8B5CF6' }} width="20" />
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>Domínio de Competências</span>
                      </div>
                      <CChartRadar
                        data={{
                          labels: radarLabels,
                          datasets: [
                            {
                              label: 'Seu Nível',
                              backgroundColor: alpha(tokens.rausch, 0.18),
                              borderColor: tokens.rausch,
                              pointBackgroundColor: tokens.rausch,
                              data: radarData,
                            },
                            {
                              label: 'Média Turma',
                              backgroundColor: alpha(tokens.babu, 0.1),
                              borderColor: tokens.babu,
                              pointBackgroundColor: tokens.babu,
                              data: Array(radarLabels.length).fill(dados.resumo_mes.media_turma),
                            },
                          ],
                        }}
                        options={{ scales: { r: { beginAtZero: true, max: 100, ticks: { display: false } } } }}
                      />

                      {/* Alerta de assuntos críticos */}
                      {dados.desempenho_materias.filter(m => m.precisao < 60).length > 0 && (
                        <div style={{
                          marginTop: 20,
                          background: alpha(tokens.rausch, 0.06),
                          border: `1px solid ${alpha(tokens.rausch, 0.2)}`,
                          borderRadius: 14, padding: '14px 16px',
                        }}>
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: tokens.rausch,
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                            marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <Icon icon="solar:danger-bold-duotone" width="14" /> Assuntos Críticos
                          </div>
                          {dados.desempenho_materias.filter(m => m.precisao < 60).slice(0, 3).map((m, i) => (
                            <div key={i} style={{ marginBottom: i < 2 ? 10 : 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: 'var(--color-text-primary)', fontWeight: 500 }}>{m.materia}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: tokens.rausch }}>{m.precisao}%</span>
                              </div>
                              <AirbnbProgress value={m.precisao} color={tokens.rausch} />
                            </div>
                          ))}
                        </div>
                      )}
                    </SCard>
                  </CCol>

                  {/* Ranking da Turma */}
                  <CCol lg={7}>
                    <SCard delay={0.2} style={{ height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon icon="solar:cup-star-bold-duotone" style={{ color: tokens.arches }} width="20" />
                          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>Ranking da Turma</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            background: alpha(tokens.arches, 0.1), color: tokens.arches,
                            padding: '4px 12px', borderRadius: 99,
                          }}>
                            Global / Mês
                          </span>
                          {dados.resumo_mes.media_turma > 0 && (
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              background: alpha(tokens.babu, 0.1), color: tokens.babu,
                              padding: '4px 12px', borderRadius: 99,
                            }}>
                              Média: {Number(dados.resumo_mes.media_turma).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>

                      {dados.ranking.length === 0 ? (
                        <div style={{ textAlign: 'center', color: tokens.foggy, fontSize: 13, padding: '40px 0' }}>
                          <Icon icon="solar:cup-star-bold-duotone" width="40" style={{ color: tokens.swiss, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                          Nenhum dado de ranking disponível para o período.
                        </div>
                      ) : (
                        <div>
                          {dados.ranking.map((r, idx) => (
                            <RankRow key={idx} r={r} idx={idx} filtroAluno={filtroAluno} />
                          ))}
                        </div>
                      )}
                    </SCard>
                  </CCol>
                </CRow>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Relatorios
