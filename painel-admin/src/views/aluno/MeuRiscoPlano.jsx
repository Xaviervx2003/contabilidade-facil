import React, { useEffect, useMemo, useState } from 'react'
import { CAlert, CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CRow, CSpinner } from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config'

const MeuRiscoPlano = () => {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState(null)
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
        const res = await fetch(`${API_URL}/api/metricas-estudantes/desempenho/${encodeURIComponent(matricula)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setDados(json)
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

    const missoes = [
      { titulo: '3 sessões em 5 dias', dica: 'Faça sessões curtas de 15-20 minutos.' },
      { titulo: 'Concluir 2 simulados com >80%', dica: 'Revise seus erros antes da segunda tentativa.' },
    ]

    if (churn >= 70) {
      missoes.unshift({ titulo: 'Missão anti-churn: estudar hoje', dica: 'Uma sessão hoje já reduz risco de evasão.' })
    }
    if (conclusao < 70) {
      missoes.push({ titulo: 'Fechar simulados sem pular etapas', dica: 'Finalize toda a lista antes de sair.' })
    }
    return missoes
  }, [dados])

  if (loading) return <CSpinner />
  if (erro) return <CAlert color="danger">{erro}</CAlert>
  if (!dados) return <CAlert color="warning">Sem dados para exibir.</CAlert>

  const churn = Number(dados.churn_risco_percentual || 0)
  const risco = churn >= 70 ? 'Alto' : churn >= 40 ? 'Médio' : 'Baixo'
  const riscoColor = churn >= 70 ? 'danger' : churn >= 40 ? 'warning' : 'success'

  return (
    <div className="p-3 p-md-4">
      <h4 className="mb-3">Meu Risco + Plano</h4>
      <CRow className="g-3 mb-4">
        <CCol md={4}><CCard><CCardBody><strong>Risco de churn:</strong> {churn.toFixed(1)}%</CCardBody></CCard></CCol>
        <CCol md={4}><CCard><CCardBody><strong>Retenção 30d:</strong> {Number(dados.retencao_30d_percentual || 0).toFixed(1)}%</CCardBody></CCard></CCol>
        <CCol md={4}><CCard><CCardBody><strong>Conclusão simulados:</strong> {Number(dados.conclusao_simulado_percentual || 0).toFixed(1)}%</CCardBody></CCard></CCol>
      </CRow>

      <CCard className="mb-3">
        <CCardHeader>
          Status atual: <CBadge color={riscoColor}>{risco}</CBadge>
        </CCardHeader>
        <CCardBody>
          {plano.map((m) => (
            <div key={m.titulo} className="mb-3">
              <div className="fw-semibold">{m.titulo}</div>
              <small className="text-body-secondary">{m.dica}</small>
            </div>
          ))}
          <CButton color="primary" onClick={() => navigate('/quiz')}>Começar agora</CButton>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default MeuRiscoPlano
