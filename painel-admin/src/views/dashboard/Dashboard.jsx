/**
 * Dashboard Administrativo — Modo Airbnb
 * Unifica métricas, gráfico e top-alunos com visual premium.
 */
import React, { useCallback, useState } from 'react'
import { CCol, CRow, CAlert, CPagination, CPaginationItem, CProgress } from '@coreui/react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useQueries } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'

import { API_URL } from '../../config'
import { useTheme } from '../../context/themeContext'
import useAuthSession from '../../hooks/useAuthSession'
import { tokens, alpha, acertoColor } from '../../components/abnb/Tokens'
import { SCard, StatCard, SkeletonBlock } from '../../components/abnb/Cards'

const MainChart = React.lazy(() => import('./MainChart'))

/* ── helpers ─────────────────────────────────────────── */
const safeFetch = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
const buildUrl = (base, userId, extra = {}) => {
  const p = new URLSearchParams()
  if (userId) p.set('usuario_id', userId)
  Object.entries(extra).forEach(([k, v]) => p.set(k, v))
  return `${API_URL}${base}?${p}`
}

/* ── hook de dados ───────────────────────────────────── */
const useDashboardData = (userId, pagina, porPagina) => {
  const results = useQueries({
    queries: [
      { queryKey: ['ds', userId], queryFn: () => safeFetch(buildUrl('/api/dashboard', userId)), enabled: !!userId, staleTime: 60000 },
      { queryKey: ['dc', userId], queryFn: () => safeFetch(buildUrl('/api/dashboard/sessoes-por-mes', userId)), enabled: !!userId, staleTime: 60000 },
      { queryKey: ['da', userId, pagina, porPagina], queryFn: () => safeFetch(buildUrl('/api/metricas-estudantes/desempenho', userId, { pagina, por_pagina: porPagina })), enabled: !!userId },
      { queryKey: ['dv', userId], queryFn: () => safeFetch(buildUrl('/api/dashboard/visao-geral', userId)), enabled: !!userId, staleTime: 60000 },
    ]
  })
  const [sR, cR, aR, vR] = results
  const loading = results.some(r => r.isLoading)
  const d = aR.data || {}
  return {
    stats: sR.data,
    chartData: cR.data,
    alunos: { estudantes: d.estudantes || d.alunos || [], total: d.total || 0, total_paginas: d.total_paginas || 1 },
    visao: vR.data,
    loading,
    errors: { stats: sR.error?.message, chart: cR.error?.message, alunos: aR.error?.message, visao: vR.error?.message },
  }
}

/* ── Linha de aluno no ranking ───────────────────────── */
const AlunoRow = ({ item, rank, porPagina, pagina }) => {
  const media = item.media_numero || 0
  const color = acertoColor(media)
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div style={{ width: 28, textAlign: 'center', fontWeight: 700, fontSize: 13, color: rank <= 3 ? tokens.arches : tokens.foggy, flexShrink: 0 }}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</div>
        <div style={{ fontSize: 11, color: tokens.foggy }}>{item.matricula}</div>
      </div>
      <div style={{ minWidth: 90, textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color, lineHeight: 1 }}>{media.toFixed(1)}%</div>
        <div style={{ fontSize: 11, color: tokens.foggy, marginTop: 2 }}>{item.questoes} q · {item.sessoes} s</div>
      </div>
    </motion.div>
  )
}

/* ── Componente principal ────────────────────────────── */
const Dashboard = () => {
  const { userId } = useAuthSession()
  const { isDark } = useTheme()
  const [pagina, setPagina] = useState(1)
  const porPagina = 10
  const { ref: chartRef, inView: chartInView } = useInView({ triggerOnce: true, rootMargin: '200px 0px' })
  const { stats, chartData, alunos, visao, loading, errors } = useDashboardData(userId, pagina, porPagina)
  const { estudantes, total_paginas } = alunos

  const exportarCSV = useCallback(() => {
    if (!estudantes.length) return
    const header = 'Nome,Matrícula,Média (%),Questões,Sessões\n'
    const rows = estudantes.map(a => `"${a.nome}",${a.matricula},${(a.media_numero||0).toFixed(1)},${a.questoes},${a.sessoes}`).join('\n')
    const url = URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' }))
    Object.assign(document.createElement('a'), { href: url, download: `desempenho_${new Date().toISOString().slice(0,10)}.csv` }).click()
    URL.revokeObjectURL(url)
  }, [estudantes])

  const percentualTurma = stats?.total_questoes_banco && visao?.media_questoes_por_aluno
    ? Math.min((visao.media_questoes_por_aluno / stats.total_questoes_banco) * 100, 100).toFixed(1)
    : 0

  const statItems = [
    { icon: 'solar:users-group-rounded-bold-duotone', label: 'Alunos Engajados', value: stats?.alunos_ativos ?? '—', accent: tokens.babu },
    { icon: 'solar:check-read-bold-duotone', label: 'Questões Resolvidas', value: stats?.total_questoes_resolvidas ?? '—', accent: '#10b981' },
    { icon: 'solar:clock-circle-bold-duotone', label: 'Tempo Médio/Sessão', value: stats?.tempo_medio_minutos ? `${stats.tempo_medio_minutos}min` : '—', accent: tokens.arches },
    { icon: 'solar:library-bold-duotone', label: 'Banco de Questões', value: stats?.total_questoes_banco ?? '—', accent: tokens.rausch },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', padding: '32px 16px 48px' }}>
      <style>{`@keyframes skshimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            Indicadores de Performance
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
            Dashboard Administrativo
          </div>
          <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
            Acompanhamento em tempo real do engajamento e desempenho acadêmico.
          </div>
        </motion.div>

        {!userId && <CAlert color="warning" className="mb-4" style={{ borderRadius: 12, fontSize: 14 }}>Sessão não identificada — exibindo dados globais.</CAlert>}
        {errors.stats && <CAlert color="danger" className="mb-4" style={{ borderRadius: 12, fontSize: 14 }}>Erro ao carregar métricas: {errors.stats}</CAlert>}

        {/* Stat Cards */}
        <CRow className="g-3 mb-4">
          {statItems.map((s, i) => (
            <CCol key={i} xs={6} lg={3}>
              <StatCard {...s} delay={i * 0.05} value={loading ? <SkeletonBlock h={28} w="60%" /> : s.value} />
            </CCol>
          ))}
        </CRow>

        {/* Progresso turma + Últimas atividades */}
        <CRow className="g-3 mb-4">
          <CCol md={5}>
            <SCard delay={0.22}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Icon icon="solar:chart-square-bold-duotone" style={{ color: tokens.babu }} width="22" />
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Progresso da Turma</span>
              </div>
              {loading ? <SkeletonBlock h={80} /> : errors.visao ? <CAlert color="danger" className="mb-0">{errors.visao}</CAlert> : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: tokens.foggy }}>Média questões por aluno</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: tokens.babu, lineHeight: 1 }}>{visao?.media_questoes_por_aluno?.toFixed(0) || 0}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--color-bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${percentualTurma}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ height: '100%', background: tokens.babu, borderRadius: 99 }} />
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 12, fontSize: 30, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {percentualTurma}%
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)', fontSize: 12, color: tokens.foggy }}>
                    Banco total: <strong style={{ color: 'var(--color-text-primary)' }}>{stats?.total_questoes_banco || 0}</strong> questões
                  </div>
                </>
              )}
            </SCard>
          </CCol>
          <CCol md={7}>
            <SCard delay={0.26}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Icon icon="solar:history-bold-duotone" style={{ color: tokens.rausch }} width="22" />
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Últimas Atividades</span>
              </div>
              {loading ? <SkeletonBlock h={120} /> : errors.visao ? <CAlert color="danger" className="mb-0">{errors.visao}</CAlert> :
                visao?.ultimas_sessoes?.length > 0 ? visao.ultimas_sessoes.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < visao.ultimas_sessoes.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.aluno}</div>
                    <div style={{ fontSize: 12, color: tokens.foggy, flexShrink: 0 }}>{s.assunto}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: acertoColor(s.acerto), flexShrink: 0, minWidth: 44, textAlign: 'right' }}>{s.acerto}%</div>
                  </div>
                )) : <div style={{ textAlign: 'center', color: tokens.foggy, fontSize: 13, padding: '24px 0' }}>Nenhuma atividade recente.</div>
              }
            </SCard>
          </CCol>
        </CRow>

        {/* Gráfico */}
        <SCard delay={0.3} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Icon icon="solar:chart-2-bold-duotone" style={{ color: tokens.rausch }} width="22" />
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Resumo & Desempenho Global</span>
          </div>
          {errors.chart ? <CAlert color="warning">Gráfico indisponível: {errors.chart}</CAlert> : (
            <div ref={chartRef} style={{ minHeight: 300 }}>
              {chartInView
                ? <React.Suspense fallback={<SkeletonBlock h={300} />}><MainChart data={chartData} loading={loading} /></React.Suspense>
                : <SkeletonBlock h={300} />
              }
            </div>
          )}
        </SCard>

        {/* Ranking alunos */}
        <SCard delay={0.35}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon icon="solar:cup-star-bold-duotone" style={{ color: tokens.arches }} width="22" />
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>
                Top Alunos {!loading && <span style={{ fontSize: 13, color: tokens.foggy, fontWeight: 400 }}>({alunos.total} total)</span>}
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={exportarCSV}
              disabled={!estudantes.length || loading}
              style={{
                background: 'transparent', border: `1px solid ${tokens.babu}`, borderRadius: 10,
                color: tokens.babu, padding: '6px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Icon icon="solar:cloud-download-bold-duotone" width="16" /> Exportar CSV
            </motion.button>
          </div>

          {errors.alunos && <CAlert color="danger">Erro ao carregar alunos: {errors.alunos}</CAlert>}

          {loading ? [0,1,2,3,4].map(i => <SkeletonBlock key={i} h={44} r={10} style={{ marginBottom: 8 }} />)
            : estudantes.length === 0
              ? <div style={{ textAlign: 'center', color: tokens.foggy, fontSize: 13, padding: '32px 0' }}>Nenhum dado encontrado.</div>
              : estudantes.map((item, i) => (
                <AlunoRow key={item.matricula} item={item} rank={(pagina - 1) * porPagina + i + 1} />
              ))
          }

          {!loading && total_paginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20, gap: 6 }}>
              <CPagination>
                <CPaginationItem disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</CPaginationItem>
                {[...Array(total_paginas)].map((_, i) => (
                  <CPaginationItem key={i + 1} active={pagina === i + 1} onClick={() => setPagina(i + 1)}>{i + 1}</CPaginationItem>
                ))}
                <CPaginationItem disabled={pagina === total_paginas} onClick={() => setPagina(p => p + 1)}>Próxima</CPaginationItem>
              </CPagination>
            </div>
          )}
        </SCard>

        {/* Banner global */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{
            marginTop: 24, borderRadius: 20,
            border: `1px solid ${alpha(tokens.rausch, 0.15)}`,
            background: `linear-gradient(135deg, ${alpha(tokens.rausch, 0.06)} 0%, ${alpha(tokens.babu, 0.06)} 100%)`,
            padding: '24px 32px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: 24, textAlign: 'center' }}>
            {[
              { label: 'Alunos Ativos', value: stats?.alunos_ativos ?? '—', icon: 'solar:users-group-rounded-bold-duotone', color: tokens.rausch },
              { label: 'Questões Banco', value: stats?.total_questoes_banco ?? '—', icon: 'solar:library-bold-duotone', color: tokens.babu },
              { label: 'Tempo Médio', value: stats?.tempo_medio_minutos ? `${stats.tempo_medio_minutos}min` : '—', icon: 'solar:clock-circle-bold-duotone', color: tokens.arches },
              { label: 'Média Turma', value: visao?.media_acerto_geral ? `${visao.media_acerto_geral.toFixed(1)}%` : '—', icon: 'solar:star-bold-duotone', color: '#8B5CF6' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                  <Icon icon={s.icon} style={{ color: s.color }} width="22" />
                  <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-1px' }}>{s.value}</span>
                </div>
                <div style={{ fontSize: 11, color: tokens.foggy, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}

export default Dashboard