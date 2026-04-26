import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CAlert, CBadge, CSpinner } from '@coreui/react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { API_URL } from '../../config'

const formatarTempo = (seg) => {
  if (!seg) return '0m'
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

const corNota = (v) => {
  if (v >= 80) return '#2eb85c'
  if (v >= 60) return '#f9b115'
  return '#e55353'
}

const medalha = (v) => {
  if (v >= 90) return '\ud83e\udd47'
  if (v >= 70) return '\ud83e\udd48'
  if (v >= 50) return '\ud83e\udd49'
  return '\ud83d\udcda'
}

const TooltipCustom = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null
  const bg = isDark ? '#1e2a38' : '#ffffff'
  const border = isDark ? '#2d3f52' : '#d1dbe8'
  const textColor = isDark ? '#e0e8f0' : '#1f2937'
  const labelColor = isDark ? '#7eb8f7' : '#1a6fb5'
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: '10px 14px',
        color: textColor,
        fontSize: 13,
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      }}
    >
      <p style={{ margin: 0, fontWeight: 700, color: labelColor }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '4px 0 0', color: p.color }}>
          {p.name}:{' '}
          <strong>
            {p.value}
            {p.name === 'Acerto (%)' ? '%' : ''}
          </strong>
        </p>
      ))}
    </div>
  )
}

const StatCard = ({ titulo, valor, sub, cor = '#7eb8f7', icon, isDark }) => {
  const bg = isDark
    ? 'linear-gradient(135deg, #1a2535 0%, #1e2d42 100%)'
    : 'linear-gradient(135deg, #f8fafc 0%, #e9f0f7 100%)'
  const borderColor = cor + '33'
  const textColor = isDark ? '#8a9bb0' : '#475569'
  const valorColor = cor
  const subColor = isDark ? '#5d7290' : '#64748b'

  return (
    <CCard
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderLeft: `4px solid ${cor}`,
        borderRadius: 10,
        marginBottom: 16,
      }}
    >
      <CCardBody style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
        <div style={{ color: textColor, fontSize: 12, marginBottom: 2 }}>{titulo}</div>
        <div style={{ color: valorColor, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
          {valor}
        </div>
        {sub && <div style={{ color: subColor, fontSize: 11, marginTop: 4 }}>{sub}</div>}
      </CCardBody>
    </CCard>
  )
}

const HistoricoAluno = () => {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [isDark, setIsDark] = useState(false)
  const matricula = sessionStorage.getItem('matricula')

  // Detecção de tema
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
    if (!matricula) {
      setErro('Matrícula não encontrada. Faça login novamente.')
      setLoading(false)
      return
    }
    fetch(`${API_URL}/api/aluno/historico-grafico/${matricula}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setDados(data)
        setLoading(false)
      })
      .catch((err) => {
        setErro(`Erro ao carregar histórico: ${err.message}`)
        setLoading(false)
      })
  }, [matricula])

  if (loading)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <CSpinner color="info" />
      </div>
    )
  if (erro) return <CAlert color="danger">{erro}</CAlert>
  if (!dados || dados.resumo.total_sessoes === 0)
    return (
      <CAlert color="secondary">
        Você ainda não completou nenhuma sessão de estudo. Faça seu primeiro quiz!
      </CAlert>
    )

  const { resumo, por_mes, por_assunto } = dados
  const dadosRadar = por_assunto.slice(0, 8).map((a) => ({
    assunto: a.assunto.length > 14 ? a.assunto.slice(0, 14) + '...' : a.assunto,
    acerto: a.media_acerto,
    fullMark: 100,
  }))
  const ultima = resumo.ultima_sessao
    ? new Date(resumo.ultima_sessao).toLocaleDateString('pt-BR')
    : '-'

  const containerBg = isDark ? '#111b27' : '#f4f7fa'
  const textPrimary = isDark ? '#e0e8f0' : '#1f2937'
  const titleColor = isDark ? '#7eb8f7' : '#1a6fb5'
  const subtitleColor = isDark ? '#5d7290' : '#64748b'
  const cardBg = isDark ? '#1a2535' : '#ffffff'
  const cardBorder = isDark ? '#2d3f52' : '#d1dbe8'
  const tableHeaderBg = isDark ? '#151e2c' : '#f1f5f9'
  const tableBorder = isDark ? '#1e2d42' : '#e2e8f0'
  const tableRowEven = isDark ? '#172030' : '#f8fafc'
  const tableText = isDark ? '#c8d8e8' : '#334155'

  return (
    <div
      style={{
        background: containerBg,
        minHeight: '100vh',
        padding: '24px',
        color: textPrimary,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: titleColor, fontWeight: 800, fontSize: 24, margin: 0 }}>
          Meu Histórico de Aprendizado
        </h2>
        <p style={{ color: subtitleColor, margin: '4px 0 0', fontSize: 13 }}>
          Última sessão: {ultima}
        </p>
      </div>

      <CRow className="mb-2">
        <CCol xs={6} md={3}>
          <StatCard
            icon="Target"
            titulo="Média Geral"
            valor={`${resumo.media_geral}%`}
            sub={medalha(resumo.media_geral)}
            cor={corNota(resumo.media_geral)}
            isDark={isDark}
          />
        </CCol>
        <CCol xs={6} md={3}>
          <StatCard
            icon="Nota"
            titulo="Questões Respondidas"
            valor={resumo.total_questoes}
            sub={`em ${resumo.total_sessoes} sessões`}
            cor="#7eb8f7"
            isDark={isDark}
          />
        </CCol>
        <CCol xs={6} md={3}>
          <StatCard
            icon="Tempo"
            titulo="Tempo Médio / Sessão"
            valor={formatarTempo(resumo.tempo_medio_seg)}
            cor="#f9b115"
            isDark={isDark}
          />
        </CCol>
        <CCol xs={6} md={3}>
          <StatCard
            icon="Cal"
            titulo="Assuntos Estudados"
            valor={por_assunto.length}
            sub="tópicos diferentes"
            cor="#9d7ef7"
            isDark={isDark}
          />
        </CCol>
      </CRow>

      {por_mes.length > 0 && (
        <CCard
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <CCardHeader
            style={{
              background: 'transparent',
              border: 'none',
              color: titleColor,
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Evolução da Taxa de Acerto (últimos 6 meses)
          </CCardHeader>
          <CCardBody>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={por_mes} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2d3f52' : '#cbd5e1'} />
                <XAxis
                  dataKey="mes"
                  stroke={isDark ? '#5d7290' : '#64748b'}
                  tick={{ fill: isDark ? '#8a9bb0' : '#475569', fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke={isDark ? '#5d7290' : '#64748b'}
                  tick={{ fill: isDark ? '#8a9bb0' : '#475569', fontSize: 12 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<TooltipCustom isDark={isDark} />} />
                <Legend wrapperStyle={{ color: isDark ? '#8a9bb0' : '#475569', fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="media_acerto"
                  name="Acerto (%)"
                  stroke="#2eb85c"
                  strokeWidth={2.5}
                  dot={{ fill: '#2eb85c', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CCardBody>
        </CCard>
      )}

      {por_mes.length > 0 && (
        <CCard
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <CCardHeader
            style={{
              background: 'transparent',
              border: 'none',
              color: titleColor,
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Questões Respondidas por Mês
          </CCardHeader>
          <CCardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={por_mes} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2d3f52' : '#cbd5e1'} />
                <XAxis
                  dataKey="mes"
                  stroke={isDark ? '#5d7290' : '#64748b'}
                  tick={{ fill: isDark ? '#8a9bb0' : '#475569', fontSize: 12 }}
                />
                <YAxis
                  stroke={isDark ? '#5d7290' : '#64748b'}
                  tick={{ fill: isDark ? '#8a9bb0' : '#475569', fontSize: 12 }}
                />
                <Tooltip content={<TooltipCustom isDark={isDark} />} />
                <Legend wrapperStyle={{ color: isDark ? '#8a9bb0' : '#475569', fontSize: 12 }} />
                <Bar dataKey="questoes" name="Questões" fill="#7eb8f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sessoes" name="Sessões" fill="#9d7ef7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CCardBody>
        </CCard>
      )}

      {dadosRadar.length >= 3 && (
        <CCard
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 10,
            marginBottom: 20,
          }}
        >
          <CCardHeader
            style={{
              background: 'transparent',
              border: 'none',
              color: titleColor,
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Radar de Domínio por Assunto
          </CCardHeader>
          <CCardBody>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={dadosRadar}>
                <PolarGrid stroke={isDark ? '#2d3f52' : '#cbd5e1'} />
                <PolarAngleAxis
                  dataKey="assunto"
                  tick={{ fill: isDark ? '#8a9bb0' : '#475569', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: isDark ? '#5d7290' : '#64748b', fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Radar
                  name="Acerto"
                  dataKey="acerto"
                  stroke="#7eb8f7"
                  fill="#7eb8f7"
                  fillOpacity={0.25}
                />
                <Tooltip content={<TooltipCustom isDark={isDark} />} />
                <Legend wrapperStyle={{ color: isDark ? '#8a9bb0' : '#475569', fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CCardBody>
        </CCard>
      )}

      <CCard style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10 }}>
        <CCardHeader
          style={{
            background: 'transparent',
            border: 'none',
            color: titleColor,
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          Desempenho por Assunto
        </CCardHeader>
        <CCardBody style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: tableHeaderBg, color: isDark ? '#5d7290' : '#475569' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Assunto</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center' }}>Questões</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center' }}>Média</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {por_assunto.map((a, i) => {
                  const cor = corNota(a.media_acerto)
                  return (
                    <tr
                      key={i}
                      style={{
                        borderTop: `1px solid ${tableBorder}`,
                        background: i % 2 === 0 ? 'transparent' : tableRowEven,
                      }}
                    >
                      <td style={{ padding: '10px 16px', color: tableText }}>{a.assunto}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', color: '#7eb8f7' }}>
                        {a.questoes}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            color: cor,
                            fontWeight: 700,
                            background: cor + '22',
                            padding: '2px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                          }}
                        >
                          {a.media_acerto}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <CBadge
                          color={
                            a.media_acerto >= 80
                              ? 'success'
                              : a.media_acerto >= 60
                                ? 'warning'
                                : 'danger'
                          }
                          style={{ fontSize: 11 }}
                        >
                          {a.media_acerto >= 80
                            ? 'Dominado'
                            : a.media_acerto >= 60
                              ? 'Em progresso'
                              : 'Reforçar'}
                        </CBadge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default HistoricoAluno
