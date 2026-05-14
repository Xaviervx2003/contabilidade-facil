import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CProgress,
  CSpinner,
  CAlert,
  CButton,
  CBadge,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPuzzle,
  cilHistory,
  cilStar,
  cilChartLine,
  cilFire,
  cilCheckCircle,
  cilClock,
  cilSpeedometer,
  cilArrowRight,
  cilLibrary,
} from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { API_URL } from '../../config'
import { useTheme } from '../../context/themeContext'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'

/* ── Skeletons para Performance ─────────────────────────── */
const Skeleton = ({ className, height }) => (
  <div 
    className={`bg-body-tertiary rounded-4 animate-pulse ${className}`} 
    style={{ height: height || '100px', backgroundColor: 'var(--color-bg-tertiary)', opacity: 0.5 }} 
  />
)

const DashboardSkeleton = () => (
  <div className="min-h-screen pt-4 px-3" style={{ background: 'var(--color-bg-primary)' }}>
    <div className="max-w-5xl mx-auto">
      <div className="mb-3">
        <Skeleton height="32px" className="w-48 mb-2" />
        <Skeleton height="16px" className="w-64" />
      </div>
      <CRow className="g-3 mb-4">
        {[1, 2, 3, 4].map(i => (
          <CCol key={i} xs={6} md={3}><Skeleton height="110px" /></CCol>
        ))}
      </CRow>
      <CRow className="g-3">
        <CCol md={8}><Skeleton height="300px" /></CCol>
        <CCol md={4}><Skeleton height="300px" /></CCol>
      </CRow>
    </div>
  </div>
)

/* ── Helpers ──────────────────────────────────────────────── */
const formatTempo = (seg) => {
  if (!seg || seg === 0) return '0min'
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}min`
}

const saudacao = () => {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/* ── Mini Gráfico de Barras (últimos 7 dias) ──────────────── */
const MiniBarChart = React.memo(({ data, isDark }) => {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.questoes), 1)
  return (
    <div className="d-flex align-items-end gap-1" style={{ height: 80 }}>
      {data.map((d, i) => {
        const pct = (d.questoes / max) * 100
        const dt = new Date(d.dia + 'T00:00:00')
        const isHoje = i === data.length - 1
        return (
          <div key={i} className="d-flex flex-column align-items-center flex-fill">
            <small className="mb-1" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
              {d.questoes > 0 ? d.questoes : ''}
            </small>
            <div
              style={{
                width: '100%',
                maxWidth: 32,
                height: `${Math.max(pct, 4)}%`,
                borderRadius: '4px 4px 0 0',
                background: isHoje
                  ? 'linear-gradient(180deg, var(--color-primary), var(--color-secondary))'
                  : d.questoes > 0
                    ? 'var(--color-primary)'
                    : 'var(--color-bg-tertiary)',
                opacity: isHoje ? 1 : 0.4,
                transition: 'height 0.5s ease',
              }}
            />
            <small style={{
              fontSize: 9,
              marginTop: 4,
              fontWeight: isHoje ? 700 : 400,
              color: isHoje ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
            }}>
              {diasSemana[dt.getDay()]}
            </small>
          </div>
        )
      })}
    </div>
  )
})

/* ── Stat Card Premium ───────────────────────────────────── */
const StatCard = ({ icon, label, value, sub, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className="premium-card h-100 d-flex flex-column justify-content-between border-0 p-3 shadow-sm overflow-hidden position-relative"
  >
    {/* Efeito de brilho sutil no fundo */}
    <div 
      className="position-absolute" 
      style={{ 
        top: -20, 
        right: -20, 
        width: 80, 
        height: 80, 
        background: `var(--color-${color})`, 
        filter: 'blur(40px)', 
        opacity: 0.15 
      }} 
    />

    <div className="d-flex align-items-center gap-3 mb-2">
      <div 
        className="rounded-3 d-flex align-items-center justify-content-center" 
        style={{ 
          width: 42, 
          height: 42, 
          backgroundColor: `rgba(var(--color-${color}-rgb, 50, 31, 219), 0.12)`,
          color: `var(--color-${color})`
        }}
      >
        <Icon icon={icon} width="24" />
      </div>
      <div>
        <div className="text-body-secondary" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </div>
      </div>
    </div>

    <div className="mt-2">
      <div className="h3 fw-bold mb-1" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
        {value}
      </div>
      {sub && (
        <div className="text-body-secondary d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
          {sub}
        </div>
      )}
    </div>
  </motion.div>
)

/* ── Componente Principal ─────────────────────────────────── */
const DashboardAluno = () => {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const matricula = sessionStorage.getItem('matricula')
  const nomeUsuario = sessionStorage.getItem('nome') || ''

  // Cache inteligente com useQuery: Abre instantaneamente se os dados tiverem menos de 5 min
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-aluno', matricula],
    queryFn: async () => {
      if (!matricula) throw new Error('Faça login primeiro')
      const res = await fetch(`${API_URL}/api/aluno/dashboard/${matricula}`)
      if (!res.ok) throw new Error('Erro ao buscar dados')
      const json = await res.json()
      if (json.nome) sessionStorage.setItem('nome', json.nome)
      return json
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de dados "frescos"
    enabled: !!matricula
  })

  if (isLoading) return <DashboardSkeleton />
  if (error) return <div className="p-4"><CAlert color="danger">{error.message}</CAlert></div>
  if (!data) return null

  const { hoje, semana, geral, streak, progresso, materias_fracas, materias_fortes, ultimas_sessoes, serie_semanal } = data
  const nomeExibicao = data.nome || nomeUsuario || 'Estudante'
  const primeiroNome = nomeExibicao.split(' ')[0]

  return (
    <div className="min-h-screen pt-4 px-3" style={{ background: 'var(--color-bg-primary)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Título e Subtítulo padronizados (Modelo Simples) */}
        <div className="mb-3">
          <h3 className="h3 fw-bold mb-1">{saudacao()}, {primeiroNome}! 👋</h3>
          <div className="text-body-secondary small">
            {hoje.questoes > 0
              ? `Você já respondeu ${hoje.questoes} questões hoje. Continue assim!`
              : 'Que tal começar sua sessão de estudos agora?'}
          </div>
        </div>

      {/* ── Cards de Métricas Rápidas ── */}
      <CRow className="g-3 mb-4">
        <CCol xs={6} lg={3}>
          <StatCard
            icon="solar:fire-bold-duotone"
            label="Streak"
            value={`${streak} dias`}
            sub={streak > 0 ? 'Sequência ativa 🔥' : 'Estude hoje para iniciar!'}
            color="warning"
            delay={0.1}
          />
        </CCol>
        <CCol xs={6} lg={3}>
          <StatCard
            icon="solar:check-read-bold-duotone"
            label="Hoje"
            value={hoje.questoes}
            sub={`${hoje.sessoes} sessões · ${formatTempo(hoje.tempo_seg)}`}
            color="success"
            delay={0.15}
          />
        </CCol>
        <CCol xs={6} lg={3}>
          <StatCard
            icon="solar:calendar-bold-duotone"
            label="Semana"
            value={semana.questoes}
            sub={`${semana.dias_estudados}/7 dias · ${formatTempo(semana.tempo_seg)}`}
            color="primary"
            delay={0.2}
          />
        </CCol>
        <CCol xs={6} lg={3}>
          <StatCard
            icon="solar:graph-up-bold-duotone"
            label="Média geral"
            value={`${geral.media_geral}%`}
            sub={`${geral.total_questoes} questões total`}
            color="secondary"
            delay={0.25}
          />
        </CCol>
      </CRow>

      {/* ── Guia Rápido + Gráfico Semanal ── */}
      <CRow className="g-3 mb-4">
        <CCol xs={12} lg={5}>
          <div className="premium-card h-100 fade-in-up" style={{ animationDelay: '0.15s' }}>
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <Icon icon="solar:bolt-circle-bold-duotone" className="text-warning" width="22" />
              Guia Rápido
            </h6>
            <div className="d-grid gap-2">
              <CButton
                color="primary"
                className="fw-bold d-flex align-items-center justify-content-between p-3 rounded-4 border-0 shadow-sm"
                onClick={() => navigate('/quiz')}
                style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' }}
              >
                <span className="d-flex align-items-center"><Icon icon="solar:play-circle-bold-duotone" className="me-2" width="20" /> Iniciar Novo Quiz</span>
                <Icon icon="solar:arrow-right-linear" />
              </CButton>
              <CButton
                variant="outline"
                color="secondary"
                className="fw-bold d-flex align-items-center justify-content-between p-3 rounded-4 border-border"
                onClick={() => navigate('/aluno/historico')}
              >
                <span className="d-flex align-items-center"><Icon icon="solar:history-bold-duotone" className="me-2" width="20" /> Meu Histórico</span>
                <Icon icon="solar:arrow-right-linear" />
              </CButton>
              <CButton
                variant="outline"
                color="warning"
                className="fw-bold d-flex align-items-center justify-content-between p-3 rounded-4 border-border"
                onClick={() => navigate('/conquistas')}
              >
                <span className="d-flex align-items-center"><Icon icon="solar:cup-star-bold-duotone" className="me-2" width="20" /> Minhas Conquistas</span>
                <Icon icon="solar:arrow-right-linear" />
              </CButton>
            </div>
          </div>
        </CCol>

        <CCol xs={12} lg={7}>
          <div className="premium-card h-100 fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <span className="fw-bold d-flex align-items-center gap-2">
                <Icon icon="solar:chart-square-bold-duotone" className="text-primary" width="20" />
                Desempenho Semanal
              </span>
              <CBadge color="info" className="rounded-pill px-3 py-2 bg-opacity-10 text-info border border-info/20">
                {semana.questoes} questões
              </CBadge>
            </div>
            {serie_semanal && serie_semanal.length > 0 ? (
              <div className="mt-4">
                <MiniBarChart data={serie_semanal} isDark={isDark} />
              </div>
            ) : (
              <div className="text-center py-4 text-body-secondary small">Nenhum dado nesta semana</div>
            )}
          </div>
        </CCol>
      </CRow>

      {/* ── Progresso + Matérias ── */}
      <CRow className="g-3 mb-4">
        <CCol xs={12} lg={4}>
          <div className="premium-card h-100 fade-in-up" style={{ animationDelay: '0.25s' }}>
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <Icon icon="solar:target-bold-duotone" className="text-primary" width="20" />
              Progresso no Edital
            </h6>
            <div className="d-flex flex-column justify-content-center h-100 pb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-body-secondary small">Evolução Geral</span>
                <span className="fw-bold text-primary" style={{ fontSize: '1.2rem' }}>{progresso.percentual}%</span>
              </div>
              <div className="progress-container rounded-pill mb-4" style={{ height: '8px', background: 'var(--color-bg-tertiary)' }}>
                <div 
                  className="h-100 rounded-pill bg-primary shadow-sm" 
                  style={{ width: `${progresso.percentual}%`, transition: 'width 1s ease' }} 
                />
              </div>
              <div className="d-grid gap-2">
                <div className="p-2 rounded-3 bg-body-tertiary d-flex align-items-center gap-2">
                  <Icon icon="solar:check-circle-bold-duotone" className="text-success" />
                  <span className="small text-body-secondary"><strong>{progresso.respondidas}</strong> respondidas</span>
                </div>
                <div className="p-2 rounded-3 bg-body-tertiary d-flex align-items-center gap-2">
                  <Icon icon="solar:library-bold-duotone" className="text-secondary" />
                  <span className="small text-body-secondary"><strong>{progresso.total_banco.toLocaleString('pt-BR')}</strong> no banco</span>
                </div>
              </div>
            </div>
          </div>
        </CCol>

        <CCol xs={12} sm={6} lg={4}>
          <div className="premium-card h-100 fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <Icon icon="solar:danger-bold-duotone" className="text-danger" width="20" />
                Pontos Fracos
              </h6>
              <CBadge color="danger" className="rounded-pill bg-opacity-10 text-danger" style={{ fontSize: 10 }}>Focar aqui</CBadge>
            </div>
            <div className="d-flex flex-column gap-3">
              {materias_fracas.length > 0 ? materias_fracas.map((m, i) => (
                <div key={i} className="p-2 rounded-3 hover-bg-tertiary transition-all">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small fw-medium text-truncate" style={{ maxWidth: '70%', color: 'var(--color-text-primary)' }}>{m.materia}</span>
                    <span className="small fw-bold text-danger">{m.media_acerto}%</span>
                  </div>
                  <div className="progress-container rounded-pill" style={{ height: '4px', background: 'var(--color-bg-tertiary)' }}>
                    <div className="h-100 rounded-pill bg-danger" style={{ width: `${m.media_acerto}%` }} />
                  </div>
                </div>
              )) : <div className="text-center py-4 text-body-secondary small">Estude mais para gerar dados.</div>}
            </div>
          </div>
        </CCol>

        <CCol xs={12} sm={6} lg={4}>
          <div className="premium-card h-100 fade-in-up" style={{ animationDelay: '0.35s' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <Icon icon="solar:verified-check-bold-duotone" className="text-success" width="20" />
                Pontos Fortes
              </h6>
              <CBadge color="success" className="rounded-pill bg-opacity-10 text-success" style={{ fontSize: 10 }}>Excelente!</CBadge>
            </div>
            <div className="d-flex flex-column gap-3">
              {materias_fortes.length > 0 ? materias_fortes.map((m, i) => (
                <div key={i} className="p-2 rounded-3 hover-bg-tertiary transition-all">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small fw-medium text-truncate" style={{ maxWidth: '70%', color: 'var(--color-text-primary)' }}>{m.materia}</span>
                    <span className="small fw-bold text-success">{m.media_acerto}%</span>
                  </div>
                  <div className="progress-container rounded-pill" style={{ height: '4px', background: 'var(--color-bg-tertiary)' }}>
                    <div className="h-100 rounded-pill bg-success" style={{ width: `${m.media_acerto}%` }} />
                  </div>
                </div>
              )) : <div className="text-center py-4 text-body-secondary small">Continue assim para ver mais dados.</div>}
            </div>
          </div>
        </CCol>
      </CRow>

      {/* ── Últimas Atividades (Feed Moderno) ── */}
      <div className="premium-card mb-4 fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <Icon icon="solar:history-bold-duotone" className="text-info" width="22" />
            Atividades Recentes
          </h6>
          <CButton color="link" size="sm" className="p-0 fw-bold text-decoration-none small text-info" onClick={() => navigate('/aluno/historico')}>
            Ver tudo <Icon icon="solar:double-alt-arrow-right-linear" />
          </CButton>
        </div>
        
        {ultimas_sessoes.length > 0 ? (
          <div className="d-flex flex-column gap-2">
            {ultimas_sessoes.map((s, i) => (
              <div key={i} className="p-3 rounded-4 bg-body-tertiary border border-border/10 d-flex align-items-center gap-3 transition-all hover-translate-y">
                <div className={`p-2 rounded-circle bg-opacity-10 text-${s.acerto >= 70 ? 'success' : s.acerto >= 40 ? 'warning' : 'danger'} bg-${s.acerto >= 70 ? 'success' : s.acerto >= 40 ? 'warning' : 'danger'}`}>
                  <Icon icon={s.acerto >= 70 ? "solar:star-bold-duotone" : "solar:notification-lines-bold-duotone"} width="20" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="fw-bold text-truncate" style={{ color: 'var(--color-text-primary)' }}>{s.materia}</div>
                  <div className="text-body-secondary small d-flex align-items-center gap-2">
                    <Icon icon="solar:document-text-linear" width="14" /> {s.questoes} questões
                    <span className="opacity-50">•</span>
                    <Icon icon="solar:clock-circle-linear" width="14" /> {formatTempo(s.tempo_seg)}
                  </div>
                </div>
                <div className="text-end">
                  <div className={`fw-bold text-${s.acerto >= 70 ? 'success' : s.acerto >= 40 ? 'warning' : 'danger'}`} style={{ fontSize: '1.1rem' }}>{s.acerto}%</div>
                  <div className="text-body-secondary" style={{ fontSize: '10px' }}>
                    {s.data ? new Date(s.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5">
            <Icon icon="solar:ghost-bold-duotone" width="48" className="text-body-secondary opacity-20 mb-3" />
            <p className="text-body-secondary mb-3">Nenhuma atividade registrada ainda.</p>
            <CButton color="primary" onClick={() => navigate('/quiz')} className="rounded-pill px-4 fw-bold">Começar Agora</CButton>
          </div>
        )}
      </div>

      {/* ── Resumo Global (Premium Glass) ── */}
      <div className="premium-card border-0 mb-4 fade-in-up" style={{ 
        animationDelay: '0.45s',
        background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.05) 0%, rgba(var(--color-secondary-rgb), 0.05) 100%)',
        backdropFilter: 'blur(10px)'
      }}>
        <div className="d-flex flex-wrap justify-content-around text-center gap-4 py-2">
          {[
            { label: 'Sessões Totais', value: geral.total_sessoes, color: 'var(--color-primary)', icon: 'solar:folder-check-bold-duotone' },
            { label: 'Questões', value: geral.total_questoes, color: 'var(--color-success)', icon: 'solar:notes-bold-duotone' },
            { label: 'Tempo Total', value: formatTempo(geral.tempo_total_seg), color: 'var(--color-warning)', icon: 'solar:clock-circle-bold-duotone' },
            { label: 'Média Geral', value: `${geral.media_geral}%`, color: 'var(--color-accent)', icon: 'solar:star-bold-duotone' }
          ].map((stat, i) => (
            <div key={i}>
              <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
                <Icon icon={stat.icon} style={{ color: stat.color }} width="24" />
                <div className="fw-bold" style={{ fontSize: '1.75rem', color: 'var(--color-text-primary)', letterSpacing: '-1px' }}>{stat.value}</div>
              </div>
              <small className="text-body-secondary font-medium text-uppercase" style={{ fontSize: '10px', letterSpacing: '1px' }}>{stat.label}</small>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}

export default DashboardAluno
