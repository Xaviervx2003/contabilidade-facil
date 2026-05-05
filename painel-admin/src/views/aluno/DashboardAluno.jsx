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
              color: isHoje ? '#6366f1' : (isDark ? '#94a3b8' : '#94a3b8'),
            }}>
              {diasSemana[dt.getDay()]}
            </small>
          </div>
        )
      })}
    </div>
  )
}

/* ── Stat Card ────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, sub, color, isDark }) => (
  <CCard className="border-0 h-100" style={{
    background: isDark
      ? 'rgba(255,255,255,0.03)'
      : 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(10px)',
  }}>
    <CCardBody className="d-flex align-items-center gap-3 py-3">
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `linear-gradient(135deg, ${color}22, ${color}44)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <CIcon icon={icon} style={{ color, width: 22, height: 22 }} />
      </div>
      <div className="flex-fill min-w-0">
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? '#94a3b8' : '#64748b' }}>
          {label}
        </div>
        <div className="fw-bold" style={{ fontSize: 24, lineHeight: 1.2, color: isDark ? '#f1f5f9' : '#1e293b' }}>
          {value}
        </div>
        {sub && <small style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 11 }}>{sub}</small>}
      </div>
    </CCardBody>
  </CCard>
)

/* ── Componente Principal ─────────────────────────────────── */
const DashboardAluno = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDark, setIsDark] = useState(false)
  const navigate = useNavigate()

  const matricula = sessionStorage.getItem('matricula')
  const nomeUsuario = sessionStorage.getItem('nome') || ''

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-coreui-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-coreui-theme'] })
    return () => obs.disconnect()
  }, [])

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
  const primeiroNome = (nomeUsuario || data.nome || '').split(' ')[0]

  return (
    <div className="p-2 p-md-4" style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Cabeçalho ── */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
          {saudacao()}, {primeiroNome}! 👋
        </h2>
        <p style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 14 }}>
          {hoje.questoes > 0
            ? `Você já respondeu ${hoje.questoes} questões hoje. Continue assim!`
            : 'Que tal começar sua sessão de estudos agora?'
          }
        </p>
      </div>

      {/* ── Cards de Métricas Rápidas ── */}
      <CRow className="g-3 mb-4">
        <CCol xs={6} lg={3}>
          <StatCard
            icon={cilFire}
            label="Streak"
            value={`${streak} dias`}
            sub={streak > 0 ? 'Sequência ativa 🔥' : 'Estude hoje para iniciar!'}
            color="#f59e0b"
            isDark={isDark}
          />
        </CCol>
        <CCol xs={6} lg={3}>
          <StatCard
            icon={cilCheckCircle}
            label="Hoje"
            value={hoje.questoes}
            sub={`${hoje.sessoes} sessão(ões) · ${formatTempo(hoje.tempo_seg)}`}
            color="#22c55e"
            isDark={isDark}
          />
        </CCol>
        <CCol xs={6} lg={3}>
          <StatCard
            icon={cilClock}
            label="Esta semana"
            value={semana.questoes}
            sub={`${semana.dias_estudados}/7 dias · ${formatTempo(semana.tempo_seg)}`}
            color="#6366f1"
            isDark={isDark}
          />
        </CCol>
        <CCol xs={6} lg={3}>
          <StatCard
            icon={cilSpeedometer}
            label="Média geral"
            value={`${geral.media_geral}%`}
            sub={`${geral.total_questoes} questões total`}
            color="#ec4899"
            isDark={isDark}
          />
        </CCol>
      </CRow>

      {/* ── Ações Rápidas + Gráfico Semanal ── */}
      <CRow className="g-3 mb-4">
        <CCol xs={12} lg={5}>
          <CCard className="border-0 h-100" style={{
            background: isDark
              ? 'linear-gradient(135deg, #1e1b4b, #312e81)'
              : 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
          }}>
            <CCardBody className="d-flex flex-column justify-content-center">
              <h6 className="fw-bold mb-3" style={{ color: isDark ? '#c7d2fe' : '#4338ca' }}>
                ⚡ Ações Rápidas
              </h6>
              <div className="d-grid gap-2">
                <CButton
                  color="primary"
                  className="fw-bold d-flex align-items-center justify-content-between"
                  onClick={() => navigate('/quiz')}
                >
                  <span><CIcon icon={cilPuzzle} className="me-2" /> Iniciar Quiz</span>
                  <CIcon icon={cilArrowRight} />
                </CButton>
                <CButton
                  color="light"
                  className="fw-bold d-flex align-items-center justify-content-between"
                  style={{ color: isDark ? '#e2e8f0' : '#334155' }}
                  onClick={() => navigate('/aluno/historico')}
                >
                  <span><CIcon icon={cilHistory} className="me-2" /> Meu Histórico</span>
                  <CIcon icon={cilArrowRight} />
                </CButton>
                <CButton
                  color="light"
                  className="fw-bold d-flex align-items-center justify-content-between"
                  style={{ color: isDark ? '#e2e8f0' : '#334155' }}
                  onClick={() => navigate('/conquistas')}
                >
                  <span><CIcon icon={cilStar} className="me-2" /> Minhas Conquistas</span>
                  <CIcon icon={cilArrowRight} />
                </CButton>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} lg={7}>
          <CCard className="border-0 h-100" style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
          }}>
            <CCardHeader className="border-0 bg-transparent d-flex justify-content-between align-items-center">
              <span className="fw-bold" style={{ fontSize: 14 }}>📊 Questões por dia (últimos 7 dias)</span>
              <CBadge color="info" shape="rounded-pill" className="fw-normal">
                {semana.questoes} na semana
              </CBadge>
            </CCardHeader>
            <CCardBody>
              {serie_semanal && serie_semanal.length > 0 ? (
                <MiniBarChart data={serie_semanal} isDark={isDark} />
              ) : (
                <p className="text-muted text-center small">Nenhum dado nesta semana</p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* ── Progresso no Banco + Matérias Fracas + Fortes ── */}
      <CRow className="g-3 mb-4">
        <CCol xs={12} lg={4}>
          <CCard className="border-0 h-100" style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
          }}>
            <CCardHeader className="border-0 bg-transparent">
              <span className="fw-bold" style={{ fontSize: 14 }}>🎯 Progresso Geral</span>
            </CCardHeader>
            <CCardBody className="d-flex flex-column align-items-center justify-content-center">
              <div style={{ position: 'relative', width: 120, height: 120 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    strokeDasharray={`${progresso.percentual}, 100`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}>
                  <div className="fw-bold" style={{ fontSize: 20, color: isDark ? '#f1f5f9' : '#1e293b' }}>
                    {progresso.percentual}%
                  </div>
                </div>
              </div>
              <div className="text-center mt-3">
                <div style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
                  <strong>{progresso.respondidas}</strong> de <strong>{progresso.total_banco.toLocaleString('pt-BR')}</strong> questões
                </div>
                <small className="text-muted">do banco respondidas</small>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} sm={6} lg={4}>
          <CCard className="border-0 h-100" style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
          }}>
            <CCardHeader className="border-0 bg-transparent d-flex align-items-center gap-2">
              <span className="fw-bold" style={{ fontSize: 14 }}>📉 Pontos Fracos</span>
              <CBadge color="danger" shape="rounded-pill" style={{ fontSize: 10 }}>Focar aqui</CBadge>
            </CCardHeader>
            <CCardBody>
              {materias_fracas.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {materias_fracas.map((m, i) => (
                    <div key={i}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small fw-medium text-truncate" style={{ maxWidth: '70%' }}>
                          {m.materia}
                        </span>
                        <span className="small fw-bold" style={{ color: m.media_acerto < 40 ? '#ef4444' : '#f59e0b' }}>
                          {m.media_acerto}%
                        </span>
                      </div>
                      <CProgress
                        value={m.media_acerto}
                        height={6}
                        color={m.media_acerto < 30 ? 'danger' : m.media_acerto < 50 ? 'warning' : 'info'}
                        style={{ borderRadius: 4 }}
                      />
                      <small className="text-muted" style={{ fontSize: 10 }}>
                        {m.questoes} questões respondidas
                      </small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center small mb-0">Responda mais questões para ver suas matérias fracas</p>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} sm={6} lg={4}>
          <CCard className="border-0 h-100" style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
          }}>
            <CCardHeader className="border-0 bg-transparent d-flex align-items-center gap-2">
              <span className="fw-bold" style={{ fontSize: 14 }}>📈 Pontos Fortes</span>
              <CBadge color="success" shape="rounded-pill" style={{ fontSize: 10 }}>Mandando bem!</CBadge>
            </CCardHeader>
            <CCardBody>
              {materias_fortes.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {materias_fortes.map((m, i) => (
                    <div key={i}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small fw-medium text-truncate" style={{ maxWidth: '70%' }}>
                          {m.materia}
                        </span>
                        <span className="small fw-bold" style={{ color: '#22c55e' }}>
                          {m.media_acerto}%
                        </span>
                      </div>
                      <CProgress
                        value={m.media_acerto}
                        height={6}
                        color="success"
                        style={{ borderRadius: 4 }}
                      />
                      <small className="text-muted" style={{ fontSize: 10 }}>
                        {m.questoes} questões respondidas
                      </small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center small mb-0">Responda mais questões para ver suas matérias fortes</p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* ── Últimas Sessões ── */}
      <CRow className="g-3 mb-4">
        <CCol xs={12}>
          <CCard className="border-0" style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(10px)',
          }}>
            <CCardHeader className="border-0 bg-transparent d-flex justify-content-between align-items-center">
              <span className="fw-bold" style={{ fontSize: 14 }}>🕐 Últimas Sessões</span>
              <CButton
                color="link"
                size="sm"
                className="p-0 fw-bold text-decoration-none"
                onClick={() => navigate('/aluno/historico')}
              >
                Ver tudo →
              </CButton>
            </CCardHeader>
            <CCardBody className="p-0">
              {ultimas_sessoes.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover mb-0" style={{ fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th className="border-0 px-3 py-2 text-uppercase small fw-bold" style={{ color: isDark ? '#94a3b8' : '#64748b', letterSpacing: '0.05em', fontSize: 10 }}>Matéria</th>
                        <th className="border-0 px-3 py-2 text-center text-uppercase small fw-bold" style={{ color: isDark ? '#94a3b8' : '#64748b', letterSpacing: '0.05em', fontSize: 10 }}>Questões</th>
                        <th className="border-0 px-3 py-2 text-center text-uppercase small fw-bold" style={{ color: isDark ? '#94a3b8' : '#64748b', letterSpacing: '0.05em', fontSize: 10 }}>Acerto</th>
                        <th className="border-0 px-3 py-2 text-center text-uppercase small fw-bold" style={{ color: isDark ? '#94a3b8' : '#64748b', letterSpacing: '0.05em', fontSize: 10 }}>Tempo</th>
                        <th className="border-0 px-3 py-2 text-end text-uppercase small fw-bold" style={{ color: isDark ? '#94a3b8' : '#64748b', letterSpacing: '0.05em', fontSize: 10 }}>Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ultimas_sessoes.map((s, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 align-middle">
                            <div className="d-flex align-items-center gap-2">
                              <CIcon icon={cilLibrary} size="sm" className="text-muted" />
                              <span className="text-truncate" style={{ maxWidth: 200 }}>{s.materia}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center align-middle fw-bold">{s.questoes}</td>
                          <td className="px-3 py-2 text-center align-middle">
                            <CBadge color={s.acerto >= 70 ? 'success' : s.acerto >= 40 ? 'warning' : 'danger'} shape="rounded-pill">
                              {s.acerto}%
                            </CBadge>
                          </td>
                          <td className="px-3 py-2 text-center align-middle text-muted">{formatTempo(s.tempo_seg)}</td>
                          <td className="px-3 py-2 text-end align-middle text-muted">
                            {s.data ? new Date(s.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted mb-2">Nenhuma sessão registrada ainda</p>
                  <CButton color="primary" size="sm" onClick={() => navigate('/quiz')}>
                    Começar agora →
                  </CButton>
                </div>
              )}
            </CCardBody>
          </CCard>
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
  )
}

export default DashboardAluno
