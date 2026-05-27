import React, { useEffect, useState } from 'react'
import {
  CCol,
  CRow,
  CSpinner,
  CAlert,
  CButton,
  CBadge,
  CProgress,
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { API_URL } from '../../config'
import api from '../../services/api'
import { useTheme } from '../../context/themeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'

/* ─── Tokens Airbnb-inspired (centralizado) ──────────────── */
import { tokens, alpha, acertoColor } from '../../components/abnb/Tokens'
import { buildTokens } from '../../tokens'
import { AirbnbProgress as _Progress, MateriaRow as _MateriaRow } from '../../components/abnb/Cards'
import useAuthSession from '../../hooks/useAuthSession'

/* ─── Helpers ──────────────────────────────────────────────── */
const formatTempo = (seg) => {
  if (!seg || seg === 0) return '0min'
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}min`
}

const saudacao = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/* ─── Skeleton ───────────────────────────────────────────── */
const SkeletonBlock = ({ h = 20, w = '100%', r = 12 }) => (
  <div
    className="skshimmer"
    style={{ height: h, width: w, borderRadius: r }}
  />
)

import { CChartBar } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'

/* ─── Mini Bar Chart ─────────────────────────────────────── */
const MiniBarChart = React.memo(({ data, isDark, tk }) => {
  if (!data?.length) return null
  
  const labels = data.map(d => {
    const dt = new Date(d.dia + 'T00:00:00')
    return diasSemana[dt.getDay()]
  })
  
  const questoes = data.map(d => d.questoes)
  const isHojeArray = data.map((d, i) => i === data.length - 1)
  
  const backgroundColors = data.map((d, i) => {
    if (i === data.length - 1) return tk.rausch
    return d.questoes > 0 ? alpha(tk.rausch, 0.2) : 'var(--color-bg-tertiary)'
  })

  return (
    <div style={{ position: 'relative', height: 180 }}>
      <CChartBar
        style={{ height: '100%' }}
        data={{
          labels,
          datasets: [
            {
              label: 'Questões Resolvidas',
              backgroundColor: backgroundColors,
              borderRadius: 6,
              borderSkipped: false,
              data: questoes,
              barPercentage: 0.6,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? '#1e2a38' : '#fff',
              titleColor: isDark ? '#7eb8f7' : tk.rausch,
              bodyColor: isDark ? '#e0e8f0' : tk.foggy,
              borderColor: isDark ? '#2d3f52' : 'var(--color-border)',
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: false,
            },
          },
          scales: {
            x: {
              grid: { display: false, drawBorder: false },
              ticks: { color: tk.foggy, font: { size: 10, weight: 600 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: 'var(--color-border)', borderDash: [4, 4], drawBorder: false },
              ticks: { color: tk.foggy, font: { size: 10 }, stepSize: Math.ceil(Math.max(...questoes, 1)/5) },
            },
          },
        }}
      />
    </div>
  )
})

/* ─── Stat Card (Airbnb style) ───────────────────────────── */
const StatCard = ({ icon, label, value, sub, accent = 'var(--accent-primary)', delay = 0, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    whileHover={{ y: -3, transition: { duration: 0.18 } }}
    style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      padding: '20px 20px',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'default',
    }}
  >
    {/* accent strip top */}
    <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 3, borderRadius: '0 0 4px 4px', background: accent, opacity: 0.7 }} />

    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `color-mix(in srgb, ${accent} 15%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent,
      }}>
        <Icon icon={icon} width="20" />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted, #767676)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </span>
    </div>

    <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1, letterSpacing: '-0.5px', fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: 12, color: 'var(--color-text-muted, #767676)', marginTop: 6 }}>
        {sub}
      </div>
    )}
    {children}
  </motion.div>
)

/* ─── Section Card ───────────────────────────────────────── */
const SCard = ({ children, style = {}, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
    style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 20,
      padding: '24px',
      height: '100%',
      ...style,
    }}
  >
    {children}
  </motion.div>
)

/* ─── Progress Bar ───────────────────────────────────────── */
const AirbnbProgress = ({ value, color = 'var(--accent-primary)' }) => (
  <div style={{ height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
      style={{ height: '100%', background: color, borderRadius: 99 }}
    />
  </div>
)

/* ─── Divider ─────────────────────────────────────────────── */
const Divider = () => <div style={{ height: 1, background: 'var(--color-border)', margin: '12px 0' }} />

/* ─── Skeleton Screen ─────────────────────────────────────── */
const DashboardSkeleton = () => (
  <div style={{ padding: '32px 24px', background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <SkeletonBlock h={34} w="260px" r={10} />
        <div style={{ marginTop: 10 }}><SkeletonBlock h={16} w="380px" r={8} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[0, 1, 2, 3].map(i => <SkeletonBlock key={i} h={120} r={16} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 16 }}>
        <SkeletonBlock h={280} r={20} />
        <SkeletonBlock h={280} r={20} />
      </div>
    </div>
  </div>
)

/* ─── Activity Row ───────────────────────────────────────── */
const ActivityRow = ({ s, i }) => {
  const isGood = s.acerto >= 70
  const isMid = s.acerto >= 40
  const color = isGood ? 'var(--accent-secondary)' : isMid ? 'var(--accent-tertiary)' : 'var(--accent-primary)'
  const icon = isGood ? 'solar:star-bold-duotone' : isMid ? 'solar:notification-lines-bold-duotone' : 'solar:close-circle-bold-duotone'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * i }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon icon={icon} width="20" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {s.materia}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted, #767676)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Icon icon="solar:document-text-linear" width="12" />
          {s.questoes} questões
          <span style={{ opacity: 0.4 }}>·</span>
          <Icon icon="solar:clock-circle-linear" width="12" />
          {formatTempo(s.tempo_seg)}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color, lineHeight: 1 }}>{s.acerto}%</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted, #767676)', marginTop: 3 }}>
          {s.data ? new Date(s.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Quick Action Button ────────────────────────────────── */
const QuickBtn = ({ icon, label, onClick, variant = 'ghost', accent }) => (
  <motion.button
    whileHover={{ scale: 1.01, x: 4 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    style={{
      width: '100%', border: `1.5px solid ${accent || 'var(--color-border)'}`,
      borderRadius: 14, padding: '14px 18px',
      background: variant === 'filled' ? 'var(--accent-primary)' : 'transparent',
      color: variant === 'filled' ? '#fff' : 'var(--color-text-primary)',
      cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', fontWeight: 600, fontSize: 14,
      fontFamily: "'Circular Std', 'Nunito', sans-serif",
      transition: 'background 0.15s',
    }}
  >
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon icon={icon} width="20" />
      {label}
    </span>
    <Icon icon="solar:alt-arrow-right-linear" width="16" style={{ opacity: 0.5 }} />
  </motion.button>
)

/* ─── Matéria Row ─────────────────────────────────────────── */
const MateriaRow = ({ m, i, color }) => (
  <div style={{ paddingBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
        {m.materia}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{m.media_acerto}%</span>
    </div>
    <AirbnbProgress value={m.media_acerto} color={color} />
    <div style={{ fontSize: 11, color: 'var(--color-text-muted, #767676)', marginTop: 4 }}>{m.questoes} questões respondidas</div>
  </div>
)

/* ─── Componente Principal ───────────────────────────────── */
const DashboardAluno = () => {
  const { isDark, currentPalette } = useTheme()
  const tk = buildTokens(currentPalette)
  const navigate = useNavigate()
  const { matricula, nome, token } = useAuthSession()
  const nomeUsuario = nome || ''

  const [metaStreak, setMetaStreak] = useState(() => {
    return parseInt(localStorage.getItem('meta_streak') || '7', 10)
  })

  const handleToggleMeta = (e) => {
    e.stopPropagation()
    const metas = [5, 7, 10, 15, 30, 60, 90]
    const nextIdx = (metas.indexOf(metaStreak) + 1) % metas.length
    const nextMeta = metas[nextIdx]
    setMetaStreak(nextMeta)
    localStorage.setItem('meta_streak', String(nextMeta))
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-aluno', matricula],
    queryFn: async () => {
      if (!matricula) throw new Error('Faça login primeiro')
      const res = await api.get(`/api/aluno/dashboard/${matricula}`)
      if (res.data && res.data.nome) sessionStorage.setItem('nome', res.data.nome)
      return res.data
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!matricula,
  })

  const { data: missoesGlobais, isLoading: loadingMissoes, isError: erroMissoes } = useQuery({
    queryKey: ['missoes-globais', matricula],
    queryFn: async () => {
      const url = matricula 
        ? `/api/missoes/globais/${matricula}`
        : `/api/missoes/globais`
      
      const res = await api.get(url)
      return res.data
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!token,
  })

  const { data: quizInsights } = useQuery({
    queryKey: ['quiz-insights', matricula],
    queryFn: async () => {
      const res = await api.get(`/api/aluno/quiz-analytics/${matricula}`)
      return res.data
    },
    staleTime: 1000 * 60 * 10,
    enabled: !!matricula,
  })

  const { hoje, semana, geral, streak, progresso, materias_fracas, materias_fortes, ultimas_sessoes, serie_semanal } = data || {
    hoje: {}, semana: {}, geral: {}, streak: 0, progresso: {}, 
    materias_fracas: [], materias_fortes: [], ultimas_sessoes: [], serie_semanal: []
  }

  if (isLoading && matricula) return <DashboardSkeleton />
  if (error && matricula) return <div style={{ padding: 32 }}><CAlert color="danger">{error.message}</CAlert></div>
  // Se não tem matrícula e não tem dados, ainda podemos mostrar as missões globais (fallback)
  const primeiroNome = (data?.nome || nomeUsuario || 'Estudante').split(' ')[0]

  const containerStyle = {
    minHeight: '100vh',
    background: 'var(--color-bg-primary)',
    padding: '32px 16px 48px',
  }

  return (
    <div style={containerStyle}>

      <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: "'Nunito', sans-serif" }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ color: tk.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Painel de Estudos</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {saudacao()}, {primeiroNome}! 👋
          </div>
          <div style={{ fontSize: 14, color: tk.foggy, marginTop: 6 }}>
            {hoje.questoes > 0
              ? `Você já dominou ${hoje.questoes} tópicos hoje. A constância é o caminho para a aprovação.`
              : 'O sucesso é a soma de pequenos esforços repetidos dia após dia.'}
          </div>
        </motion.div>

        {/* ── Stat Cards ── */}
        <CRow className="g-3 mb-4">
          {[
            {
              icon: 'solar:fire-bold-duotone',
              label: 'Streak',
              value: `${streak} dias`,
              sub: streak > 0 ? 'Sequência ativa 🔥' : 'Estude hoje!',
              accent: tokens.arches,
              delay: 0.05,
              children: (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <button
                      onClick={handleToggleMeta}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'var(--accent-primary)',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        outline: 'none',
                      }}
                      title="Clique para mudar a meta de streak"
                    >
                      Meta: {metaStreak} dias
                      <Icon icon="solar:pen-bold" width="10" />
                    </button>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: tk.foggy }}>
                      {Math.round(Math.min((streak / metaStreak) * 100, 100))}%
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--color-bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min((streak / metaStreak) * 100, 100)}%`,
                        background: 'var(--accent-tertiary)',
                        borderRadius: 99,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )
            },
            { icon: 'solar:check-read-bold-duotone', label: 'Hoje', value: hoje.questoes, sub: `${hoje.sessoes} sessão · ${formatTempo(hoje.tempo_seg)}`, accent: 'var(--accent-secondary)', delay: 0.1 },
            { icon: 'solar:calendar-bold-duotone', label: 'Esta semana', value: semana.questoes, sub: `${semana.dias_estudados}/7 dias · ${formatTempo(semana.tempo_seg)}`, accent: 'var(--accent-primary)', delay: 0.15 },
            { icon: 'solar:graph-up-bold-duotone', label: 'Média geral', value: `${geral.media_geral}%`, sub: `${geral.total_questoes} questões no total`, accent: '#8B5CF6', delay: 0.2 },
          ].map((c, i) => (
            <CCol key={i} xs={6} lg={3}>
              <StatCard {...c} />
            </CCol>
          ))}
        </CRow>

        {/* ── Guia Rápido + Semanal ── */}
        <CRow className="g-3 mb-4">
          <CCol xs={12} lg={5}>
            <SCard delay={0.22}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Icon icon="solar:bolt-circle-bold-duotone" style={{ color: tk.rausch }} width="22" />
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>O que fazer hoje</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <QuickBtn icon="solar:play-circle-bold-duotone" label="Iniciar Novo Quiz" onClick={() => navigate('/quiz')} variant="filled" />
                <QuickBtn icon="solar:history-bold-duotone" label="Ver Meu Histórico" onClick={() => navigate('/aluno/historico')} accent="var(--color-border)" />
                <QuickBtn icon="solar:cup-star-bold-duotone" label="Minhas Conquistas" onClick={() => navigate('/aluno/gamificacao')} accent="var(--accent-tertiary)" />
              </div>
            </SCard>
          </CCol>

          <CCol xs={12} lg={7}>
            <SCard delay={0.26}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon icon="solar:chart-square-bold-duotone" style={{ color: tk.rausch }} width="20" />
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Desempenho Semanal</span>
                </div>
                <span style={{
                  background: `color-mix(in srgb, var(--accent-primary) 15%, transparent)`, color: 'var(--accent-primary)',
                  fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
                }}>
                  {semana.questoes} questões
                </span>
              </div>
              {serie_semanal?.length > 0
                ? <MiniBarChart data={serie_semanal} isDark={isDark} tk={tk} />
                : <div style={{ textAlign: 'center', color: tk.foggy, fontSize: 13, padding: '24px 0' }}>Nenhum dado nesta semana</div>
              }
            </SCard>
          </CCol>
        </CRow>

        {/* ── Progresso + Matérias ── */}
        <CRow className="g-3 mb-4">
          <CCol xs={12} lg={4}>
            <SCard delay={0.3}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Icon icon="solar:target-bold-duotone" style={{ color: tk.rausch }} width="20" />
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Progresso no Edital</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: tk.foggy }}>Evolução geral</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: tk.rausch }}>{progresso.percentual}%</span>
              </div>
              <AirbnbProgress value={progresso.percentual} color="var(--accent-primary)" />
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: 'solar:check-circle-bold-duotone', color: 'var(--accent-secondary)', label: `${progresso.respondidas} respondidas` },
                  { icon: 'solar:library-bold-duotone', color: 'var(--color-text-muted, #767676)', label: `${progresso.total_banco?.toLocaleString('pt-BR')} no banco` },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--color-bg-tertiary)', borderRadius: 12 }}>
                    <Icon icon={item.icon} style={{ color: item.color }} width="18" />
                    <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </SCard>
          </CCol>

          <CCol xs={12} sm={6} lg={4}>
            <SCard delay={0.34}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon icon="solar:danger-bold-duotone" style={{ color: tk.rausch }} width="20" />
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Pontos Fracos</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, background: `color-mix(in srgb, var(--accent-primary) 15%, transparent)`, color: 'var(--accent-primary)', padding: '3px 10px', borderRadius: 99 }}>
                  Focar aqui
                </span>
              </div>
              {materias_fracas.length > 0
                ? materias_fracas.map((m, i) => (
                  <div key={i}>
                    <MateriaRow m={m} i={i} color="var(--accent-primary)" />
                    {i < materias_fracas.length - 1 && <Divider />}
                  </div>
                ))
                : <div style={{ textAlign: 'center', color: tk.foggy, fontSize: 13, padding: '24px 0' }}>Continue estudando para ver suas métricas.</div>
              }
            </SCard>
          </CCol>

          <CCol xs={12} sm={6} lg={4}>
            <SCard delay={0.38}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon icon="solar:verified-check-bold-duotone" style={{ color: tk.babu }} width="20" />
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Pontos Fortes</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, background: `color-mix(in srgb, var(--accent-secondary) 15%, transparent)`, color: 'var(--accent-secondary)', padding: '3px 10px', borderRadius: 99 }}>
                  Mandando bem!
                </span>
              </div>
              {materias_fortes.length > 0
                ? materias_fortes.map((m, i) => (
                  <div key={i}>
                    <MateriaRow m={m} i={i} color="var(--accent-secondary)" />
                    {i < materias_fortes.length - 1 && <Divider />}
                  </div>
                ))
                : <div style={{ textAlign: 'center', color: tk.foggy, fontSize: 13, padding: '24px 0' }}>Continue assim para ver seus pontos fortes.</div>
              }
            </SCard>
          </CCol>
        </CRow>

        {/* ── Insights de Estudo (Quiz Analytics) ── */}
        {quizInsights && (
          <CRow className="g-3 mb-4">
            <CCol xs={12}>
              <SCard delay={0.4}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Icon icon="solar:chart-2-bold-duotone" style={{ color: tk.rausch }} width="22" />
                  <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Insights de Estudo</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: `color-mix(in srgb, var(--accent-secondary) 15%, transparent)`, color: 'var(--accent-secondary)', padding: '3px 10px', borderRadius: 99, marginLeft: 'auto' }}>
                    Dados reais
                  </span>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {/* Melhor horário */}
                  {quizInsights.por_turno?.length > 0 && (() => {
                    const melhor = quizInsights.por_turno[0]
                    const turnoEmoji = { 'Manhã': '☀️', 'Tarde': '🌤️', 'Noite': '🌙', 'Madrugada': '🌃' }
                    return (
                      <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 14, padding: '16px' }}>
                        <div style={{ fontSize: 11, color: tk.foggy, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Melhor Horário</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>
                          {turnoEmoji[melhor.turno] || '⏰'} {melhor.turno}
                        </div>
                        <div style={{ fontSize: 11, color: tk.foggy, marginTop: 4 }}>{melhor.sessoes} sessões nesse turno</div>
                      </div>
                    )
                  })()}

                  {/* Média geral */}
                  <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 14, padding: '16px' }}>
                    <div style={{ fontSize: 11, color: tk.foggy, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Média de Acerto</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: quizInsights.resumo?.media_acerto >= 70 ? 'var(--accent-secondary)' : 'var(--accent-tertiary)', lineHeight: 1 }}>
                      {quizInsights.resumo?.media_acerto || 0}%
                    </div>
                    <div style={{ fontSize: 11, color: tk.foggy, marginTop: 4 }}>{quizInsights.resumo?.total_questoes || 0} questões no total</div>
                  </div>

                  {/* Tempo médio */}
                  <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 14, padding: '16px' }}>
                    <div style={{ fontSize: 11, color: tk.foggy, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Tempo Médio</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>
                      {formatTempo(quizInsights.resumo?.tempo_medio_seg || 0)}
                    </div>
                    <div style={{ fontSize: 11, color: tk.foggy, marginTop: 4 }}>por sessão de estudo</div>
                  </div>
                </div>

                {/* Top 3 matérias fracas */}
                {quizInsights.por_materia?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: tk.foggy, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon icon="solar:danger-bold-duotone" width="14" style={{ color: tk.rausch }} />
                      Matérias que precisam de atenção
                    </div>
                    {quizInsights.por_materia.slice(0, 3).map((m, i) => {
                      const color = m.taxa_acerto >= 70 ? 'var(--accent-secondary)' : m.taxa_acerto >= 40 ? 'var(--accent-tertiary)' : 'var(--accent-primary)'
                      return (
                        <div key={i} style={{ marginBottom: i < 2 ? 10 : 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{m.materia}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color }}>{m.taxa_acerto}% ({m.acertos}/{m.total})</span>
                          </div>
                          <AirbnbProgress value={m.taxa_acerto} color={color} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </SCard>
            </CCol>
          </CRow>
        )}

        {/* ── Missões de Elite (Elite SaaS Integration) ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 24, background: tk.rausch, borderRadius: 4 }}></div>
              <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>Missões de Elite</span>
            </div>
            <CButton 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/aluno/meu-risco-plano')}
              style={{ color: tk.rausch, fontWeight: 700, fontSize: 13 }}
            >
              Explorar Todas →
            </CButton>
          </div>
          <CRow className="g-4">
            {loadingMissoes ? (
              [0, 1, 2].map(i => (
                <CCol key={i} xs={12} md={4}>
                  <div
                    className="skshimmer"
                    style={{ height: 160, borderRadius: 20 }}
                  />
                </CCol>
              ))
            ) : erroMissoes ? (
              <CCol xs={12}>
                <CAlert color="warning" style={{ borderRadius: 16, fontSize: 13 }}>
                  Não foi possível carregar os desafios agora.
                </CAlert>
              </CCol>
            ) : (Array.isArray(missoesGlobais) ? missoesGlobais.slice(0, 3) : []).map((m, i) => (
              <CCol key={i} xs={12} md={4}>
                <SCard delay={0.4 + (i * 0.05)} style={{ padding: '24px', border: `1px solid var(--color-border)`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `color-mix(in srgb, var(--accent-secondary) 10%, transparent)`, color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon icon={m.icon || "solar:target-bold"} width="24" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>{m.titulo}</div>
                      <div style={{ fontSize: 12, color: tk.foggy, marginTop: 4, lineHeight: 1.4, height: 34, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {m.descricao || m.dica}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-secondary)', textTransform: 'uppercase' }}>Progresso</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: tk.foggy }}>{m.progresso || 0}%</span>
                  </div>
                  <AirbnbProgress value={m.progresso || 0} color="var(--accent-secondary)" />
                  
                  {/* Indicador de "Carregando progresso" se estiver em fallback */}
                  {!matricula && (
                    <div style={{ marginTop: 8, fontSize: 10, color: tk.rausch, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CSpinner size="sm" style={{ width: 10, height: 10, borderWidth: '1.5px' }} />
                      Sincronizando seu progresso...
                    </div>
                  )}
                </SCard>
              </CCol>
            ))}
            {(!loadingMissoes && !erroMissoes && (!missoesGlobais || missoesGlobais.length === 0)) && (
              <CCol xs={12}>
                <div style={{ padding: '40px', textAlign: 'center', background: 'var(--color-bg-tertiary)', border: '1px dashed var(--color-border)', borderRadius: 24, color: tk.foggy }}>
                  <Icon icon="solar:medal-star-bold-duotone" width="40" className="mb-3" style={{ opacity: 0.2 }} />
                  <div style={{ fontWeight: 600 }}>Nenhum desafio global ativo.</div>
                  <div className="small opacity-75">Sua jornada é única. Defina suas próprias missões no planejamento.</div>
                </div>
              </CCol>
            )}
          </CRow>
        </div>

        {/* ── Atividades Recentes ── */}
        <SCard delay={0.42} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon icon="solar:history-bold-duotone" style={{ color: tk.rausch }} width="22" />
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>Atividades Recentes</span>
            </div>
            <button
              onClick={() => navigate('/aluno/historico')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: tk.rausch, textDecoration: 'underline', textDecorationColor: 'transparent', fontFamily: 'inherit' }}
            >
              Ver tudo →
            </button>
          </div>

          {ultimas_sessoes.length > 0
            ? ultimas_sessoes.map((s, i) => <ActivityRow key={i} s={s} i={i} />)
            : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Icon icon="solar:ghost-bold-duotone" width="48" style={{ color: tk.swiss, marginBottom: 12 }} />
                <div style={{ color: tk.foggy, marginBottom: 16, fontSize: 14 }}>Nenhuma atividade ainda.</div>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/quiz')}
                  style={{
                    background: 'var(--accent-primary)', color: '#fff', border: 'none',
                    borderRadius: 99, padding: '12px 28px', fontWeight: 700,
                    fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Fazer meu primeiro quiz
                </motion.button>
              </div>
            )
          }
        </SCard>

        {/* ── Resumo Global ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.4 }}
          style={{
            borderRadius: 20,
            border: `1px solid color-mix(in srgb, var(--accent-primary) 25%, transparent)`,
            background: `linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 8%, transparent) 0%, color-mix(in srgb, var(--accent-secondary) 8%, transparent) 100%)`,
            padding: '24px 32px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: 24, textAlign: 'center' }}>
            {[
              { label: 'Sessões Totais', value: geral.total_sessoes, color: 'var(--accent-primary)', icon: 'solar:folder-check-bold-duotone' },
              { label: 'Questões', value: geral.total_questoes, color: 'var(--accent-secondary)', icon: 'solar:notes-bold-duotone' },
              { label: 'Tempo Total', value: formatTempo(geral.tempo_total_seg), color: 'var(--accent-tertiary)', icon: 'solar:clock-circle-bold-duotone' },
              { label: 'Média Geral', value: `${geral.media_geral}%`, color: '#8B5CF6', icon: 'solar:star-bold-duotone' },
            ].map((stat, i) => (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                  <Icon icon={stat.icon} style={{ color: stat.color }} width="22" />
                  <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-1px' }}>{stat.value}</span>
                </div>
                <div style={{ fontSize: 11, color: tk.foggy, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}

export default DashboardAluno
