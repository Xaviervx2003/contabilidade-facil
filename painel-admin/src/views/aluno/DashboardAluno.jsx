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
              <span style={{ fontSize: '1.2rem' }}>⚡</span> Guia Rápido
            </h6>
            <div className="d-grid gap-2">
              <CButton
                color="primary"
                className="fw-bold d-flex align-items-center justify-content-between p-3 rounded-3"
                onClick={() => navigate('/quiz')}
              >
                <span><CIcon icon={cilPuzzle} className="me-2" /> Iniciar Quiz</span>
                <CIcon icon={cilArrowRight} />
              </CButton>
              <CButton
                variant="outline"
                color="secondary"
                className="fw-bold d-flex align-items-center justify-content-between p-3 rounded-3"
                onClick={() => navigate('/aluno/historico')}
              >
                <span><CIcon icon={cilHistory} className="me-2" /> Meu Histórico</span>
                <CIcon icon={cilArrowRight} />
              </CButton>
              <CButton
                variant="outline"
                color="warning"
                className="fw-bold d-flex align-items-center justify-content-between p-3 rounded-3"
                onClick={() => navigate('/conquistas')}
              >
                <span><CIcon icon={cilStar} className="me-2" /> Minhas Conquistas</span>
                <CIcon icon={cilArrowRight} />
              </CButton>
            </div>
          </div>
        </CCol>

        <CCol xs={12} lg={7}>
          <div className="premium-card h-100 fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <span className="fw-bold">📊 Desempenho Semanal</span>
              <CBadge color="info" shape="rounded-pill" className="px-3 py-2">
                {semana.questoes} questões
              </CBadge>
            </div>
            {serie_semanal && serie_semanal.length > 0 ? (
              <MiniBarChart data={serie_semanal} isDark={isDark} />
            ) : (
              <p className="text-muted text-center small">Nenhum dado nesta semana</p>
            )}
          </div>
        </CCol>
      </CRow>

      {/* ── Progresso no Banco + Matérias Fracas + Fortes ── */}
      <CRow className="g-3 mb-4">
        <CCol xs={12} lg={4}>
          <div className="premium-card h-100 fade-in-up" style={{ animationDelay: '0.25s' }}>
            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <CIcon icon={cilChartLine} className="text-primary" />
              Progresso no Edital
            </h6>
            <div className="d-flex flex-column justify-content-center h-100 pb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-body-tertiary small">Progresso Geral</span>
                <span className="fw-bold text-primary">{progresso.percentual}%</span>
              </div>
              <CProgress value={progresso.percentual} color="primary" />
              <div className="mt-3">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <div className="stat-icon-wrapper primary" style={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                    <CIcon icon={cilCheckCircle} />
                  </div>
                  <span className="small text-body-secondary">
                    <strong>{progresso.respondidas}</strong> respondidas
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <div className="stat-icon-wrapper secondary" style={{ width: 24, height: 24, fontSize: '0.8rem' }}>
                    <CIcon icon={cilLibrary} />
                  </div>
                  <span className="small text-body-secondary">
                    <strong>{progresso.total_banco.toLocaleString('pt-BR')}</strong> no banco
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CCol>

        <CCol xs={12} sm={6} lg={4}>
          <div className="premium-card h-100 fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <CIcon icon={cilChartLine} className="text-danger" />
                Pontos Fracos
              </h6>
              <CBadge color="danger" shape="rounded-pill" style={{ fontSize: 10 }}>Focar aqui</CBadge>
            </div>
            {materias_fracas.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {materias_fracas.map((m, i) => (
                  <div key={i} className={i !== 0 ? 'pt-2 border-top' : ''}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small fw-medium text-truncate" style={{ maxWidth: '70%' }}>
                        {m.materia}
                      </span>
                      <span className="small fw-bold text-danger">
                        {m.media_acerto}%
                      </span>
                    </div>
                    <CProgress
                      value={m.media_acerto}
                      color="danger"
                      className="thin"
                    />
                    <div className="d-flex justify-content-between mt-1">
                      <small className="text-muted" style={{ fontSize: 9 }}>
                        {m.questoes} questões
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center small py-4">Continue estudando para ver suas métricas.</p>
            )}
          </div>
        </CCol>

        <CCol xs={12} sm={6} lg={4}>
          <div className="premium-card h-100 fade-in-up" style={{ animationDelay: '0.35s' }}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <CIcon icon={cilCheckCircle} className="text-success" />
                Pontos Fortes
              </h6>
              <CBadge color="success" shape="rounded-pill" style={{ fontSize: 10 }}>Mandando bem!</CBadge>
            </div>
            {materias_fortes.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {materias_fortes.map((m, i) => (
                  <div key={i} className={i !== 0 ? 'pt-2 border-top' : ''}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="small fw-medium text-truncate" style={{ maxWidth: '70%' }}>
                        {m.materia}
                      </span>
                      <span className="small fw-bold text-success">
                        {m.media_acerto}%
                      </span>
                    </div>
                    <CProgress
                      value={m.media_acerto}
                      color="success"
                      className="thin"
                    />
                    <div className="d-flex justify-content-between mt-1">
                      <small className="text-muted" style={{ fontSize: 9 }}>
                        {m.questoes} questões
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center small py-4">Ainda não há dados suficientes.</p>
            )}
          </div>
        </CCol>
      </CRow>

      {/* ── Últimas Sessões ── */}
      <CRow className="g-3 mb-4">
        <CCol xs={12}>
          <div className="premium-card fade-in-up" style={{ animationDelay: '0.4s', padding: 0, overflow: 'hidden' }}>
            <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <CIcon icon={cilHistory} className="text-info" />
                Últimas Sessões
              </h6>
              <CButton
                color="link"
                size="sm"
                className="p-0 fw-bold text-decoration-none small"
                onClick={() => navigate('/aluno/historico')}
              >
                Ver histórico completo →
              </CButton>
            </div>
            {ultimas_sessoes.length > 0 ? (
              <div className="table-responsive">
                <CTable hover align="middle" className="mb-0">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell className="bg-body-tertiary px-3 py-2 small border-0">Matéria</CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary text-center small border-0">Questões</CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary text-center small border-0">Acerto</CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary text-center small border-0">Tempo</CTableHeaderCell>
                      <CTableHeaderCell className="bg-body-tertiary text-end px-3 small border-0">Data</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {ultimas_sessoes.map((s, i) => (
                      <CTableRow key={i}>
                        <CTableDataCell className="px-3">
                          <div className="d-flex align-items-center gap-2">
                            <div className="stat-icon-wrapper secondary" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                              <CIcon icon={cilLibrary} />
                            </div>
                            <span className="fw-medium text-truncate" style={{ maxWidth: 200 }}>{s.materia}</span>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="text-center fw-bold">{s.questoes}</CTableDataCell>
                        <CTableDataCell className="text-center">
                          <CBadge color={s.acerto >= 70 ? 'success' : s.acerto >= 40 ? 'warning' : 'danger'} shape="rounded-pill">
                            {s.acerto}%
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="text-center text-body-tertiary">{formatTempo(s.tempo_seg)}</CTableDataCell>
                        <CTableDataCell className="text-end px-3 text-body-tertiary small">
                          {s.data ? new Date(s.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </div>
            ) : (
              <div className="text-center py-5">
                <p className="text-muted mb-3">Você ainda não realizou nenhuma sessão de estudos.</p>
                <CButton color="primary" onClick={() => navigate('/quiz')}>
                  Fazer meu primeiro Quiz
                </CButton>
              </div>
            )}
          </div>
        </CCol>
      </CRow>

      {/* ── Resumo All-Time ── */}
      <CRow className="g-3 mb-4">
        <CCol xs={12}>
          <CCard className="border-0" style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(236,72,153,0.1))'
              : 'linear-gradient(135deg, #f8fafc, #fdf2f8)',
          }}>
            <CCardBody>
              <div className="d-flex flex-wrap justify-content-around text-center gap-3 py-2">
                <div>
                  <div className="fw-bold" style={{ fontSize: 28, color: '#6366f1' }}>{geral.total_sessoes}</div>
                  <small className="text-muted">Sessões totais</small>
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 28, color: '#22c55e' }}>{geral.total_questoes}</div>
                  <small className="text-muted">Questões respondidas</small>
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 28, color: '#f59e0b' }}>{formatTempo(geral.tempo_total_seg)}</div>
                  <small className="text-muted">Tempo total de estudo</small>
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 28, color: '#ec4899' }}>{geral.media_geral}%</div>
                  <small className="text-muted">Média geral de acerto</small>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
      </div>
    </div>
  )
}

export default DashboardAluno
