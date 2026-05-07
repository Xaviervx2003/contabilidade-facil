import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { API_URL } from '../../config'

const classificarRisco = (churn) => {
  if (churn >= 70) return { nivel: 'Alto', color: 'danger' }
  if (churn >= 40) return { nivel: 'Médio', color: 'warning' }
  return { nivel: 'Baixo', color: 'success' }
}

const CentralRisco = () => {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [estudantes, setEstudantes] = useState([])

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      setErro('')
      try {
        const userId = sessionStorage.getItem('userId')
        const params = new URLSearchParams({ pagina: '1', por_pagina: '100' })
        if (userId) params.append('usuario_id', userId)

        const res = await fetch(`${API_URL}/api/metricas-estudantes/desempenho?${params.toString()}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setEstudantes(Array.isArray(json.estudantes) ? json.estudantes : [])
      } catch (e) {
        setErro(`Falha ao carregar central de risco: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [])

  const resumo = useMemo(() => {
    const base = { alto: 0, medio: 0, baixo: 0 }
    estudantes.forEach((e) => {
      const churn = Number(e.churn_risco_percentual || 0)
      if (churn >= 70) base.alto += 1
      else if (churn >= 40) base.medio += 1
      else base.baixo += 1
    })
    return base
  }, [estudantes])

  const ordenados = useMemo(
    () => [...estudantes].sort((a, b) => Number(b.churn_risco_percentual || 0) - Number(a.churn_risco_percentual || 0)),
    [estudantes],
  )

  if (loading) return <CSpinner />
  if (erro) return <CAlert color="danger">{erro}</CAlert>

  return (
    <div className="p-3 p-md-4">
      <h4 className="mb-3">Central de Risco</h4>
      <CRow className="g-3 mb-4">
        <CCol md={4}><CCard><CCardBody><strong>Risco Alto:</strong> {resumo.alto}</CCardBody></CCard></CCol>
        <CCol md={4}><CCard><CCardBody><strong>Risco Médio:</strong> {resumo.medio}</CCardBody></CCard></CCol>
        <CCol md={4}><CCard><CCardBody><strong>Risco Baixo:</strong> {resumo.baixo}</CCardBody></CCard></CCol>
      </CRow>

      <CCard>
        <CCardHeader>Prioridade de acompanhamento</CCardHeader>
        <CCardBody>
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Aluno</CTableHeaderCell>
                <CTableHeaderCell>Churn</CTableHeaderCell>
                <CTableHeaderCell>Retenção 30d</CTableHeaderCell>
                <CTableHeaderCell>Conclusão Simulado</CTableHeaderCell>
                <CTableHeaderCell>Nível</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {ordenados.map((e) => {
                const churn = Number(e.churn_risco_percentual || 0)
                const risco = classificarRisco(churn)
                return (
                  <CTableRow key={e.matricula}>
                    <CTableDataCell>{e.nome} ({e.matricula})</CTableDataCell>
                    <CTableDataCell>{churn.toFixed(1)}%</CTableDataCell>
                    <CTableDataCell>{Number(e.retencao_30d_percentual || 0).toFixed(1)}%</CTableDataCell>
                    <CTableDataCell>{Number(e.conclusao_simulado_percentual || 0).toFixed(1)}%</CTableDataCell>
                    <CTableDataCell><CBadge color={risco.color}>{risco.nivel}</CBadge></CTableDataCell>
                  </CTableRow>
                )
              })}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </div>
  )
}

export default CentralRisco
