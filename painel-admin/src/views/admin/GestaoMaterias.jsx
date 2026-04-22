import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CBadge,
  CCol,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash, cilPlus, cilCheckAlt, cilX } from '@coreui/icons'
import { API_URL } from '../../config'

const GestaoMaterias = () => {
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [novaMateria, setNovaMateria] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [editandoNome, setEditandoNome] = useState('')

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/materias`)
      setMaterias(await res.json())
    } catch {
      setError('Erro ao carregar matérias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const criar = async () => {
    if (!novaMateria.trim()) return
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/admin/materias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaMateria.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setSuccess('Matéria criada!')
      setNovaMateria('')
      carregar()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e.message)
    }
  }

  const salvarEdicao = async () => {
    if (!editandoNome.trim()) return
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/${editandoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: editandoNome.trim() }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setEditandoId(null)
      setSuccess('Matéria atualizada!')
      carregar()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e.message)
    }
  }

  const deletar = async (id, nome) => {
    if (!window.confirm(`Deletar "${nome}"? Isso removerá os vínculos com questões e professores.`)) return
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao deletar')
      setSuccess('Matéria removida!')
      carregar()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}
      {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <strong>Gestão de Matérias</strong>
            <CBadge color="secondary">{materias.length} matérias</CBadge>
          </div>
          <CInputGroup style={{ maxWidth: 360 }}>
            <CFormInput
              placeholder="Nome da nova matéria..."
              value={novaMateria}
              onChange={(e) => setNovaMateria(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && criar()}
            />
            <CButton color="primary" onClick={criar} disabled={!novaMateria.trim()}>
              <CIcon icon={cilPlus} className="me-1" /> Criar
            </CButton>
          </CInputGroup>
        </CCardHeader>

        <CCardBody>
          {loading ? (
            <div className="text-center py-5"><CSpinner /></div>
          ) : (
            <CTable align="middle" hover responsive bordered className="mb-0">
              <CTableHead className="table-light">
                <CTableRow>
                  <CTableHeaderCell style={{ width: '5%' }}>#</CTableHeaderCell>
                  <CTableHeaderCell>Nome da Matéria</CTableHeaderCell>
                  <CTableHeaderCell className="text-center" style={{ width: '15%' }}>Questões</CTableHeaderCell>
                  <CTableHeaderCell className="text-center" style={{ width: '15%' }}>Ações</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {materias.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={4} className="text-center py-4 text-muted">
                      Nenhuma matéria cadastrada.
                    </CTableDataCell>
                  </CTableRow>
                ) : materias.map((m, idx) => (
                  <CTableRow key={m.id}>
                    <CTableDataCell className="text-muted">{idx + 1}</CTableDataCell>
                    <CTableDataCell>
                      {editandoId === m.id ? (
                        <CInputGroup size="sm">
                          <CFormInput
                            value={editandoNome}
                            onChange={(e) => setEditandoNome(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && salvarEdicao()}
                            autoFocus
                          />
                          <CButton color="success" variant="outline" onClick={salvarEdicao}>
                            <CIcon icon={cilCheckAlt} />
                          </CButton>
                          <CButton color="secondary" variant="outline" onClick={() => setEditandoId(null)}>
                            <CIcon icon={cilX} />
                          </CButton>
                        </CInputGroup>
                      ) : (
                        <strong>{m.nome}</strong>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      <CBadge color="info" shape="rounded-pill" className="px-3">
                        {m.total_questoes || 0}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      <CButton
                        color="warning"
                        variant="outline"
                        size="sm"
                        className="me-2"
                        onClick={() => { setEditandoId(m.id); setEditandoNome(m.nome) }}
                        disabled={editandoId === m.id}
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton
                        color="danger"
                        variant="outline"
                        size="sm"
                        onClick={() => deletar(m.id, m.nome)}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default GestaoMaterias
