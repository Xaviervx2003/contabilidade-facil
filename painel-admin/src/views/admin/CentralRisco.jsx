import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormSelect,
  CProgress,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilFilter, cilWarning } from '@coreui/icons'
import api from '../../services/api'

const classificarRisco = (churn) => {
  if (churn >= 70) return { nivel: 'Alto', color: 'danger' }
  if (churn >= 40) return { nivel: 'Médio', color: 'warning' }
  return { nivel: 'Baixo', color: 'success' }
}

const CentralRisco = () => {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [estudantes, setEstudantes] = useState([])
  const [filtroRisco, setFiltroRisco] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      setErro('')
      try {
        const userId = sessionStorage.getItem('userId')
        const params = new URLSearchParams({ pagina: String(pagina), por_pagina: '20' })
        if (userId) params.append('usuario_id', userId)

        const res = await api.get(`/api/metricas-estudantes/central-risco?${params.toString()}`)
        const json = res.data
        setEstudantes(Array.isArray(json.estudantes) ? json.estudantes : [])
        setTotalPaginas(Number(json.total_paginas || 1))
        setTotal(Number(json.total || 0))
      } catch (e) {
        setErro(`Falha ao carregar central de risco: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [pagina])

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

  const filtrados = useMemo(() => {
    if (filtroRisco === 'todos') return ordenados
    return ordenados.filter((e) => classificarRisco(Number(e.churn_risco_percentual || 0)).nivel.toLowerCase() === filtroRisco)
  }, [ordenados, filtroRisco])

  const exportarCsv = () => {
    if (!filtrados.length) return
    const header = 'Nome,Matrícula,Sessoes,Sem atividade,Churn,Retencao 30d,Conclusao simulado,Nivel risco\n'
    const rows = filtrados.map((e) => {
      const risco = classificarRisco(Number(e.churn_risco_percentual || 0)).nivel
      return `"${String(e.nome || '').replace(/"/g, '""')}",${e.matricula},${e.sessoes},${e.sem_atividade ? 'Sim' : 'Nao'},${Number(e.churn_risco_percentual || 0).toFixed(1)},${Number(e.retencao_30d_percentual || 0).toFixed(1)},${Number(e.conclusao_simulado_percentual || 0).toFixed(1)},${risco}`
    })
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `central_risco_p${pagina}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <CSpinner />
  if (erro) return <CAlert color="danger">{erro}</CAlert>

  return (
    <div className="p-3 p-md-4 fade-in">
      <div className="mb-4">
        <div className="text-uppercase text-body-secondary small fw-semibold" style={{ letterSpacing: '0.05em' }}>Análise de Retenção</div>
        <h3 className="mb-1 fw-bold">Central de Risco</h3>
        <div className="text-body-secondary small">
          Identificação proativa de alunos com risco de evasão (Churn).
        </div>
      </div>
      <CRow className="g-3 mb-4">
        <CCol xs={12} md={4}>
          <CCard className="border-0 shadow-sm rounded-4 h-100">
            <CCardBody className="d-flex flex-column justify-content-center p-3">
              <div className="text-uppercase text-danger fw-bold small mb-1" style={{ fontSize: 10, letterSpacing: '0.1em' }}>Risco Alto</div>
              <div className="fs-3 fw-bold tabular-nums">{resumo.alto}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={12} md={4}>
          <CCard className="border-0 shadow-sm rounded-4 h-100">
            <CCardBody className="d-flex flex-column justify-content-center p-3">
              <div className="text-uppercase text-warning fw-bold small mb-1" style={{ fontSize: 10, letterSpacing: '0.1em' }}>Risco Médio</div>
              <div className="fs-3 fw-bold tabular-nums">{resumo.medio}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={12} md={4}>
          <CCard className="border-0 shadow-sm rounded-4 h-100">
            <CCardBody className="d-flex flex-column justify-content-center p-3">
              <div className="text-uppercase text-success fw-bold small mb-1" style={{ fontSize: 10, letterSpacing: '0.1em' }}>Risco Baixo</div>
              <div className="fs-3 fw-bold tabular-nums">{resumo.baixo}</div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CCard className="border-0 shadow-sm">
        <CCardBody>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="fw-semibold d-flex align-items-center gap-2">
              <CIcon icon={cilWarning} />
              Prioridade de acompanhamento ({total} alunos)
            </div>
            <div className="d-flex align-items-center gap-2">
              <CIcon icon={cilFilter} className="text-body-secondary" />
              <CFormSelect
                value={filtroRisco}
                onChange={(e) => setFiltroRisco(e.target.value)}
                style={{ minWidth: 180 }}
              >
                <option value="todos">Todos os níveis</option>
                <option value="alto">Somente alto risco</option>
                <option value="médio">Somente risco médio</option>
                <option value="baixo">Somente baixo risco</option>
              </CFormSelect>
            </div>
          </div>

          <CTable hover responsive align="middle" className="mb-0">
            <CTableHead className="bg-body-tertiary">
              <CTableRow>
                <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold ps-4">Aluno</CTableHeaderCell>
                <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold">Churn</CTableHeaderCell>
                <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold">Retenção 30d</CTableHeaderCell>
                <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold">Conclusão</CTableHeaderCell>
                <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold text-center pe-4">Nível</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {filtrados.map((e) => {
                const churn = Number(e.churn_risco_percentual || 0)
                const risco = classificarRisco(churn)
                return (
                  <CTableRow key={e.matricula}>
                    <CTableDataCell>{e.nome} ({e.matricula})</CTableDataCell>
                    <CTableDataCell>{churn.toFixed(1)}%</CTableDataCell>
                    <CTableDataCell>{Number(e.retencao_30d_percentual || 0).toFixed(1)}%</CTableDataCell>
                    <CTableDataCell>{Number(e.conclusao_simulado_percentual || 0).toFixed(1)}%</CTableDataCell>
                    <CTableDataCell>
                      <CBadge color={risco.color}>{risco.nivel}</CBadge>
                      {e.sem_atividade && <CBadge color="dark" className="ms-2">Sem atividade</CBadge>}
                    </CTableDataCell>
                  </CTableRow>
                )
              })}
              {filtrados.length === 0 && (
                <CTableRow>
                  <CTableDataCell colSpan={5} className="text-center text-body-secondary py-4">
                    Nenhum aluno encontrado para este filtro.
                  </CTableDataCell>
                </CTableRow>
              )}
            </CTableBody>
          </CTable>

          <div className="mt-3">
            <div className="small text-body-secondary mb-1">Carga de risco geral da turma</div>
            <CProgress
              value={estudantes.length ? Math.round((resumo.alto / estudantes.length) * 100) : 0}
              color={resumo.alto > 0 ? 'danger' : 'success'}
            />
          </div>

          <div className="d-flex justify-content-end mt-3">
            <CButton color="primary" variant="outline" size="sm" onClick={exportarCsv}>
              Exportar lista priorizada
            </CButton>
          </div>

          {totalPaginas > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <CPagination>
                <CPaginationItem disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>
                  Anterior
                </CPaginationItem>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
                  <CPaginationItem key={p} active={p === pagina} onClick={() => setPagina(p)}>
                    {p}
                  </CPaginationItem>
                ))}
                <CPaginationItem disabled={pagina === totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                  Próxima
                </CPaginationItem>
              </CPagination>
            </div>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}

export default CentralRisco
