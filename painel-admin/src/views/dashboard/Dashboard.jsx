import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CProgress,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPeople, cilCloudDownload } from '@coreui/icons'

import { API_URL } from '../../config'
import WidgetsDropdown from '../widgets/WidgetsDropdown'

// Hook simples para pegar stats básicos do backend, passando o ID do usuário
const useDashboardStats = (userId) => {
  const [stats, setStats] = useState({ usuarios_ativos: 0, total_questoes_resolvidas: 0, tempo_medio_minutos: 0 })
  useEffect(() => {
    const url = userId ? `${API_URL}/api/dashboard?usuario_id=${userId}` : `${API_URL}/api/dashboard`
    fetch(url)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Erro stats:", err))
  }, [userId])
  return stats
}

// Hook para resgatar os alunos rankeados filtrados pelo professor
const useTopAlunos = (userId) => {
  const [alunos, setAlunos] = useState([])
  useEffect(() => {
    const url = userId ? `${API_URL}/api/alunos/desempenho?usuario_id=${userId}` : `${API_URL}/api/alunos/desempenho`
    fetch(url)
      .then(res => res.json())
      .then(data => {
        // Ordena pelos que tem maior nota média
        const top = data.sort((a, b) => b.media_numero - a.media_numero).slice(0, 10)
        setAlunos(top)
      })
      .catch(err => console.error("Erro alunos:", err))
  }, [userId])
  return alunos
}

const Dashboard = () => {
  // Pega o ID de quem está logado
  const userId = sessionStorage.getItem('userId')

  const stats = useDashboardStats(userId)
  const topAlunos = useTopAlunos(userId)

  const exportarCSV = () => {
    if (topAlunos.length === 0) return
    const header = 'Nome,Matrícula,Média (%),Questões,Sessões\n'
    const rows = topAlunos.map(a =>
      `"${a.nome.replace(/"/g, '""')}",${a.matricula},${a.media_numero.toFixed(1)},${a.questoes},${a.sessoes}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio_desempenho_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <WidgetsDropdown className="mb-4" customStats={stats} />

      <CRow>
        <CCol xs>
          <CCard className="mb-4">
            <CCardHeader>Resumo Real do Projeto {' & '} Desempenho Global</CCardHeader>
            <CCardBody>
              <CRow>
                <CCol xs={12} md={6} xl={6}>
                  <CRow>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-info py-1 px-3">
                        <div className="text-body-secondary text-truncate small">Perguntas Respondidas</div>
                        <div className="fs-5 fw-semibold">{stats.total_questoes_resolvidas}</div>
                      </div>
                    </CCol>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-danger py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">
                          Sessões Únicas Concluídas
                        </div>
                        <div className="fs-5 fw-semibold">{stats.usuarios_ativos}</div>
                      </div>
                    </CCol>
                  </CRow>
                </CCol>

                <CCol xs={12} md={6} xl={6}>
                  <CRow>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-warning py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">Tempo Médio Gasto</div>
                        <div className="fs-5 fw-semibold">{stats.tempo_medio_minutos} Min</div>
                      </div>
                    </CCol>
                    <CCol xs={6}>
                      <div className="border-start border-start-4 border-start-success py-1 px-3 mb-3">
                        <div className="text-body-secondary text-truncate small">Engajamento Atual</div>
                        <div className="fs-5 fw-semibold text-success">Ativo</div>
                      </div>
                    </CCol>
                  </CRow>
                </CCol>
              </CRow>

              <br />

              <div className="d-flex justify-content-between align-items-center mt-4 mb-3">
                <h5 className="mb-0">Top Alunos (Métricas de Tabela)</h5>
                <CButton
                  color="info"
                  variant="outline"
                  size="sm"
                  onClick={exportarCSV}
                  disabled={topAlunos.length === 0}
                >
                  <CIcon icon={cilCloudDownload} className="me-1" /> Exportar CSV
                </CButton>
              </div>
              <CTable align="middle" className="mb-0 border" hover responsive>
                <CTableHead className="text-nowrap">
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      <CIcon icon={cilPeople} />
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Matrícula / Nome</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      Média Geral / Aproveitamento
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">Questões Treinadas</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      Sessões
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {topAlunos.length === 0 ? (
                    <CTableRow><CTableDataCell colSpan={5} className="text-center py-4">Aguardando novos dados e testes dos alunos...</CTableDataCell></CTableRow>
                  ) : topAlunos.map((item, index) => {
                    const gradeColor = item.media_numero >= 80 ? 'success' : item.media_numero >= 60 ? 'warning' : 'danger'

                    return (
                      <CTableRow key={item.matricula}>
                        <CTableDataCell className="text-center d-flex align-items-center justify-content-center h-100 p-3">
                          <strong>#{index + 1}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="fw-bold">{item.nome}</div>
                          <div className="small text-body-secondary text-nowrap">
                            {item.matricula}
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="d-flex justify-content-between text-nowrap">
                            <div className={`fw-semibold text-${gradeColor}`}>{item.media_numero.toFixed(1)}%</div>
                          </div>
                          <CProgress thin color={gradeColor} value={item.media_numero} />
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="small text-body-secondary text-nowrap">Volume Praticado</div>
                          <div className="fw-semibold text-nowrap">{item.questoes} perguntas</div>
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <span className="badge bg-primary px-3 py-2">{item.sessoes}</span>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Dashboard