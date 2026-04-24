import React, { useEffect, useMemo, useState } from 'react'
import {
  CAlert,
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
  CWidgetStatsF,
} from '@coreui/react'
import { API_URL } from '../../config'

const formatTempo = (segundos = 0) => {
  const s = Number(segundos || 0)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${m}m`
}

const Relatorios = () => {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState({
    resumo_mes: {
      total_sessoes: 0,
      total_questoes: 0,
      media_acerto: 0,
      tempo_total_segundos: 0,
    },
    melhor_dia: null,
    serie_diaria: [],
  })

  const userId = sessionStorage.getItem('userId')

  useEffect(() => {
    const buscar = async () => {
      try {
        setLoading(true)
        setErro('')
        const qs = userId ? `?usuario_id=${encodeURIComponent(userId)}` : ''
        const res = await fetch(`${API_URL}/api/relatorios/estudo${qs}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setDados(json)
      } catch (e) {
        setErro(`Falha ao carregar relatório: ${e.message}`)
      } finally {
        setLoading(false)
      }
    }
    buscar()
  }, [userId])

  const diasComAtividade = useMemo(
    () => dados.serie_diaria.filter((d) => d.questoes > 0).length,
    [dados.serie_diaria],
  )

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2">
        <CSpinner size="sm" />
        <span>Carregando relatório mensal...</span>
      </div>
    )
  }

  return (
    <>
      {erro && <CAlert color="danger">{erro}</CAlert>}

      <CRow className="mb-4">
        <CCol md={3}>
          <CWidgetStatsF title="Sessões no mês" value={dados.resumo_mes.total_sessoes} />
        </CCol>
        <CCol md={3}>
          <CWidgetStatsF title="Questões no mês" value={dados.resumo_mes.total_questoes} />
        </CCol>
        <CCol md={3}>
          <CWidgetStatsF title="Média de acerto" value={`${dados.resumo_mes.media_acerto}%`} />
        </CCol>
        <CCol md={3}>
          <CWidgetStatsF title="Tempo total" value={formatTempo(dados.resumo_mes.tempo_total_segundos)} />
        </CCol>
      </CRow>

      <CCard className="mb-4">
        <CCardHeader>Visão diária do mês atual</CCardHeader>
        <CCardBody>
          <p className="mb-2">
            <strong>Dias com atividade:</strong> {diasComAtividade}
          </p>
          {dados.melhor_dia ? (
            <p className="mb-4">
              <strong>Dia de maior atividade:</strong> {dados.melhor_dia.dia} ({dados.melhor_dia.questoes} questões)
            </p>
          ) : (
            <p className="text-body-secondary mb-4">Ainda não há sessões registradas no mês.</p>
          )}

          <CTable striped responsive hover>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Dia</CTableHeaderCell>
                <CTableHeaderCell>Sessões</CTableHeaderCell>
                <CTableHeaderCell>Questões</CTableHeaderCell>
                <CTableHeaderCell>Média de Acerto</CTableHeaderCell>
                <CTableHeaderCell>Tempo</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {dados.serie_diaria.map((d) => (
                <CTableRow key={d.dia}>
                  <CTableDataCell>{d.dia}</CTableDataCell>
                  <CTableDataCell>{d.sessoes}</CTableDataCell>
                  <CTableDataCell>{d.questoes}</CTableDataCell>
                  <CTableDataCell>{d.media_acerto}%</CTableDataCell>
                  <CTableDataCell>{formatTempo(d.tempo_total_segundos)}</CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>
    </>
  )
}

export default Relatorios
