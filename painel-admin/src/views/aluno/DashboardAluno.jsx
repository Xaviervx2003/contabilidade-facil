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
import { API_URL } from '../../config'
import { useTheme } from '../../context/themeContext'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'

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
const MiniBarChart = ({ data, isDark }) => {
  const max = Math.max(...data.map(d => d.questoes), 1)
  return (
    <div className="d-flex align-items-end gap-1" style={{ height: 80 }}>
      {data.map((d, i) => {
        const pct = (d.questoes / max) * 100
        const dt = new Date(d.dia + 'T00:00:00')
        const isHoje = i === data.length - 1
        return (
          <div key={i} className="d-flex flex-column align-items-center flex-fill">
            <small className="mb-1" style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b' }}>
              {d.questoes > 0 ? d.questoes : ''}
            </small>
            <div
              style={{
                width: '100%',
                maxWidth: 32,
                height: `${Math.max(pct, 4)}%`,
                borderRadius: '4px 4px 0 0',
                background: isHoje
                  ? 'linear-gradient(180deg, #6366f1, #818cf8)'
                  : d.questoes > 0
                    ? (isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.25)')
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                transition: 'height 0.5s ease',
              }}
            />
            <small style={{
              fontSize: 9,
              marginTop: 4,
              fontWeight: isHoje ? 700 : 400,
              color: isHoje ? '#6366f1' : 'var(--color-text-tertiary)',
            }}>
              {diasSemana[dt.getDay()]}
            </small>
          </div>
        )
      })}
    </div>
  )
}

/* ── Stat Card ──────────────────────────────────────────── */
const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="stat-box h-100 fade-in-up" style={{ animationDelay: '0.1s' }}>
    <div className={`stat-icon-wrapper ${color}`}>
      <CIcon icon={icon} />
    </div>
    <div className="stat-info">
      <div className="stat-value">{value}</div>
      <div className="stat-desc">{label}</div>
      {sub && <div className="text-body-tertiary small mt-1">{sub}</div>}
    </div>
  </div>
)

/* ── Componente Principal ─────────────────────────────────── */
const DashboardAluno = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { isDark } = useTheme()
  const navigate = useNavigate()

  const matricula = sessionStorage.getItem('matricula')
  const nomeUsuario = sessionStorage.getItem('nome') || ''


  useEffect(() => {
    if (!matricula) {
      setError('Faça login para ver seu dashboard.')
      setLoading(false)
      return
    }
    const carregar = async () => {
      try {
        const res = await fetch(`${API_URL}/api/aluno/dashboard/${matricula}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json)
        if (json.nome && json.nome !== nomeUsuario) {
          sessionStorage.setItem('nome', json.nome)
        }
      } catch (err) {
        setError(`Erro ao carregar dashboard: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [matricula])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <CSpinner color="primary" />
          <p className="mt-3 text-muted">Carregando seu dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <CAlert color="danger">{error}</CAlert>
      </div>
    )
  }

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
          <div className="text-muted small">
            {hoje.questoes > 0
              ? `Você já respondeu ${hoje.questoes} questões hoje. Continue assim!`
              : 'Que tal começar sua sessão de estudos agora?'}
          </div>
        </div>

      {/* ── Cards de Métricas Rápidas ── */}
      <CRow className="g-3 mb-4">
        <CCol xs={6} lg={3}>
          <StatCard
            icon={cilFire}
            label="Streak"
            value={`${streak} dias`}
            sub={streak > 0 ? 'Sequência ativa 🔥' : 'Estude hoje para iniciar!'}
            color="warning"
          />
        </CCol>
        <CCol xs={6} lg={3}>
          <StatCard
            icon={cilCheckCircle}
            label="Hoje"
            value={hoje.questoes}
            sub={`${hoje.sessoes} sessões · ${formatTempo(hoje.tempo_seg)}`}
            color="success"
          />
        </CCol>
        <CCol xs={6} lg={3}>
          <StatCard
            icon={cilClock}
            label="Semana"
            value={semana.questoes}
            sub={`${semana.dias_estudados}/7 dias · ${formatTempo(semana.tempo_seg)}`}
            color="primary"
          />
        </CCol>
        <CCol xs={6} lg={3}>
          <StatCard
            icon={cilSpeedometer}
            label="Média geral"
            value={`${geral.media_geral}%`}
            sub={`${geral.total_questoes} questões total`}
            color="secondary"
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
