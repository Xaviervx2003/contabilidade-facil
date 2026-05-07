import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CProgress,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowRight, cilCheckCircle, cilFire, cilTarget } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config'

const StatBox = ({ icon, label, value, tone }) => (
  <div className="stat-box h-100 fade-in-up">
    <div className={`stat-icon-wrapper ${tone}`}>
      <CIcon icon={icon} />
    </div>
    <div className="stat-info">
      <div className="stat-value">{value}</div>
      <div className="stat-desc">{label}</div>
    </div>
  </div>
)

const MeuRiscoPlano = () => {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState(null)
  const [resumoAluno, setResumoAluno] = useState(null)
  const [missoesConcluidas, setMissoesConcluidas] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const carregar = async () => {
      const matricula = sessionStorage.getItem('matricula')
      if (!matricula) {
        setErro('Matrícula não encontrada na sessão.')
        setLoading(false)
        return
      }

      setLoading(true)
      setErro('')
      try {
        const [resKpi, resResumo] = await Promise.all([
          fetch(`${API_URL}/api/metricas-estudantes/desempenho/${encodeURIComponent(matricula)}`),
          fetch(`${API_URL}/api/aluno/dashboard/${encodeURIComponent(matricula)}`),
        ])
        if (!resKpi.ok) throw new Error(`HTTP ${resKpi.status}`)
        if (!resResumo.ok) throw new Error(`HTTP ${resResumo.status}`)
        const [jsonKpi, jsonResumo] = await Promise.all([resKpi.json(), resResumo.json()])
        setDados(jsonKpi)
        setResumoAluno(jsonResumo)
        const storageKey = `missoes_semanais:${matricula}`
        const cache = sessionStorage.getItem(storageKey)
        setMissoesConcluidas(cache ? JSON.parse(cache) : [])
      } catch (e) {
        setErro(`Falha ao carregar seus KPIs: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [])

  const plano = useMemo(() => {
    if (!dados) return []
    const churn = Number(dados.churn_risco_percentual || 0)
    const conclusao = Number(dados.conclusao_simulado_percentual || 0)
    const sessoesSemana = Number(resumoAluno?.semana?.sessoes || 0)
    const mediaSemana = Number(resumoAluno?.semana?.media_acerto || 0)

    const missoes = [
      {
        id: 'sessoes',
        titulo: '3 sessões em 5 dias',
        dica: `Semana atual: ${sessoesSemana}/3 sessões.`,
        progresso: Math.min(100, (sessoesSemana / 3) * 100),
      },
      {
        id: 'simulados',
        titulo: 'Concluir 2 simulados com >80%',
        dica: `Média semanal atual: ${mediaSemana.toFixed(1)}%.`,
        progresso: mediaSemana >= 80 ? Math.min(100, (sessoesSemana / 2) * 100) : Math.min(80, (mediaSemana / 80) * 80),
      },
    ]

    if (churn >= 70) {
      missoes.unshift({
        id: 'anti-churn',
        titulo: 'Missão anti-churn: estudar hoje',
        dica: 'Uma sessão hoje já reduz risco de evasão.',
        progresso: 20,
      })
    }
    if (conclusao < 70) {
      missoes.push({
        id: 'fluxo',
        titulo: 'Fechar simulados sem pular etapas',
        dica: 'Finalize toda a lista antes de sair.',
        progresso: Math.min(100, conclusao),
      })
    }
    return missoes
  }, [dados, resumoAluno])

  const progressoGeral = useMemo(() => {
    if (!plano.length) return 0
    const soma = plano.reduce((acc, p) => acc + Number(p.progresso || 0), 0)
    return Math.round(soma / plano.length)
  }, [plano])

  if (loading) return <CSpinner />
  if (erro) return <CAlert color="danger">{erro}</CAlert>
  if (!dados) return <CAlert color="warning">Sem dados para exibir.</CAlert>

  const churn = Number(dados.churn_risco_percentual || 0)
  const risco = churn >= 70 ? 'Alto' : churn >= 40 ? 'Médio' : 'Baixo'
  const riscoColor = churn >= 70 ? 'danger' : churn >= 40 ? 'warning' : 'success'
  const explicacaoRisco =
    churn >= 70
      ? 'Seu risco está alto por baixa recorrência recente de estudo. Faça uma sessão hoje para reduzir rapidamente.'
      : churn >= 40
        ? 'Seu risco está moderado. Mantenha frequência de estudo nos próximos dias para estabilizar.'
        : 'Seu risco está controlado. Continue no ritmo atual para manter consistência.'

  const toggleMissao = (id) => {
    const matricula = sessionStorage.getItem('matricula')
    if (!matricula) return
    const storageKey = `missoes_semanais:${matricula}`
    const atual = missoesConcluidas.includes(id)
      ? missoesConcluidas.filter((m) => m !== id)
      : [...missoesConcluidas, id]
    setMissoesConcluidas(atual)
    sessionStorage.setItem(storageKey, JSON.stringify(atual))
  }

  return (
    <div className="p-3 p-md-4">
      <h4 className="mb-3">Meu Risco + Plano</h4>
      <CRow className="g-3 mb-4">
        <CCol xs={12} md={4}>
          <StatBox icon={cilFire} label="Risco de Churn" value={`${churn.toFixed(1)}%`} tone="danger" />
        </CCol>
        <CCol xs={12} md={4}>
          <StatBox icon={cilTarget} label="Retenção 30d" value={`${Number(dados.retencao_30d_percentual || 0).toFixed(1)}%`} tone="success" />
        </CCol>
        <CCol xs={12} md={4}>
          <StatBox icon={cilCheckCircle} label="Conclusão Simulados" value={`${Number(dados.conclusao_simulado_percentual || 0).toFixed(1)}%`} tone="primary" />
        </CCol>
      </CRow>

      <CCard className="mb-4 border-0 shadow-sm">
        <CCardBody>
          Status atual: <CBadge color={riscoColor}>{risco}</CBadge>
          <p className="mb-0 mt-2 text-body-secondary">{explicacaoRisco}</p>
        </CCardBody>
      </CCard>

      <CCard className="border-0 shadow-sm">
        <CCardBody>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong>Missões Semanais</strong>
            <CBadge color="info">{progressoGeral}%</CBadge>
          </div>
          <CProgress value={progressoGeral} className="mb-3" />

          {plano.map((m) => {
            const done = missoesConcluidas.includes(m.id)
            return (
              <div key={m.id} className="mb-3 p-3 rounded" style={{ background: 'var(--color-bg-elevated)' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="fw-semibold">{m.titulo}</div>
                  <CBadge color={done ? 'success' : 'secondary'}>{done ? 'Concluída' : 'Em andamento'}</CBadge>
                </div>
                <small className="text-body-secondary d-block mb-2">{m.dica}</small>
                <CProgress value={Number(m.progresso || 0)} className="mb-2" />
                <CButton size="sm" color={done ? 'secondary' : 'success'} variant="outline" onClick={() => toggleMissao(m.id)}>
                  {done ? 'Desmarcar' : 'Marcar como concluída'}
                </CButton>
              </div>
            )
          })}

          <div className="d-flex justify-content-end">
            <CButton color="primary" onClick={() => navigate('/quiz')}>
              Começar agora <CIcon icon={cilArrowRight} className="ms-1" />
            </CButton>
          </div>
        </CCardBody>
      </CCard>

      <style>{`
        .stat-box {
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border-light);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          gap: 12px;
          align-items: center;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .stat-box:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        }
        .stat-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon-wrapper.primary { background: rgba(59,130,246,0.15); color: #3b82f6; }
        .stat-icon-wrapper.success { background: rgba(16,185,129,0.15); color: #10b981; }
        .stat-icon-wrapper.danger { background: rgba(239,68,68,0.15); color: #ef4444; }
        .stat-info .stat-value { font-size: 1.25rem; font-weight: 700; line-height: 1.1; }
        .stat-info .stat-desc { font-size: 0.82rem; color: var(--color-text-tertiary); }
        .fade-in-up { animation: fadeInUp .35s ease both; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default MeuRiscoPlano
