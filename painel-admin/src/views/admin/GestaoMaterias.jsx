import React, { useEffect, useState, useMemo } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CBadge,
  CCol,
  CFormInput,
  CFormSelect,
  CInputGroup,
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
import { cilPencil, cilTrash, cilPlus, cilCheckAlt, cilX, cilChevronRight } from '@coreui/icons'
import { API_URL } from '../../config'

const GestaoMaterias = () => {
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [novaMateria, setNovaMateria] = useState('')
  const [parentID, setParentID] = useState('')

  const [editandoId, setEditandoId] = useState(null)
  const [editandoNome, setEditandoNome] = useState('')
  const [editandoParentId, setEditandoParentId] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [limpando, setLimpando] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/materias`)
      const data = await res.json()
      setMaterias(Array.isArray(data) ? data : [])
      setCurrentPage(1) // Reseta para a primeira página ao recarregar
    } catch {
      setError('Erro ao carregar matérias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const tree = useMemo(() => {
    const map = {}
    materias.forEach(m => map[m.id] = { ...m, children: [] })
    const roots = []
    materias.forEach(m => {
      if (m.parent_id && map[m.parent_id]) {
        map[m.parent_id].children.push(map[m.id])
      } else {
        roots.push(map[m.id])
      }
    })
    return roots
  }, [materias])

  const flattenedList = useMemo(() => {
    const list = []
    const recurse = (node, depth = 0) => {
      list.push({ ...node, depth })
      node.children.forEach(c => recurse(c, depth + 1))
    }
    tree.forEach(root => recurse(root))
    return list
  }, [tree])

  const criar = async () => {
    if (!novaMateria.trim()) return
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/admin/materias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novaMateria.trim(),
          parent_id: parentID === '' ? null : parseInt(parentID)
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setSuccess('Matéria criada!')
      setNovaMateria(''); setParentID('')
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
        body: JSON.stringify({
          nome: editandoNome.trim(),
          parent_id: editandoParentId === '' ? null : parseInt(editandoParentId)
        }),
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
    if (!window.confirm(`Deletar "${nome}"? Isso removerá todas as subcategorias também!`)) return
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

  const limparVazias = async () => {
    if (!window.confirm("Isso removerá todas as matérias que não possuem questões nem subcategorias. Continuar?")) return
    setLimpando(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/limpar-vazias`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail)
      setSuccess(data.mensagem)
      carregar()
      setTimeout(() => setSuccess(''), 4000)
    } catch (e) {
      setError(e.message)
    } finally {
      setLimpando(false)
    }
  }

  const totalPages = Math.ceil(flattenedList.length / itemsPerPage)
  const currentItems = flattenedList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // ── Paginação Inteligente (Evita overflow) ───────────────────
  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    const maxVisible = 5
    const start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages, start + maxVisible - 1)
    const adjustedStart = Math.max(1, end - maxVisible + 1)

    // Botão Anterior
    pages.push(
      <CPaginationItem key="prev" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
        Anterior
      </CPaginationItem>
    )

    // Primeiro número
    if (adjustedStart > 1) {
      pages.push(<CPaginationItem key={1} onClick={() => setCurrentPage(1)}>1</CPaginationItem>)
      if (adjustedStart > 2) pages.push(<CPaginationItem key="start-dot" disabled>...</CPaginationItem>)
    }

    // Números visíveis
    for (let i = adjustedStart; i <= end; i++) {
      pages.push(
        <CPaginationItem key={i} active={i === currentPage} onClick={() => setCurrentPage(i)}>
          {i}
        </CPaginationItem>
      )
    }

    // Último número
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(<CPaginationItem key="end-dot" disabled>...</CPaginationItem>)
      pages.push(<CPaginationItem key={totalPages} onClick={() => setCurrentPage(totalPages)}>{totalPages}</CPaginationItem>)
    }

    // Botão Próximo
    pages.push(
      <CPaginationItem key="next" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
        Próximo
      </CPaginationItem>
    )

    return <>{pages}</>
  }

  return (
    <>
      {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}
      {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Gestão Hierárquica de Matérias (Categorias)</strong>
          <CButton
            color="danger"
            variant="outline"
            size="sm"
            onClick={limparVazias}
            disabled={limpando || loading}
          >
            {limpando ? <CSpinner size="sm" /> : 'Limpar Matérias Vazias'}
          </CButton>
        </CCardHeader>
        <CCardBody>
          <div className="bg-light p-3 rounded mb-4 border">
            <h6 className="mb-3 fw-bold">Criar Nova Categoria / Subcategoria</h6>
            <CRow className="g-3 align-items-end">
              <CCol md={5}>
                <label className="form-label small text-muted text-uppercase">Nome da Categoria</label>
                <CFormInput
                  placeholder="Ex: Introdução à Administração"
                  value={novaMateria}
                  onChange={(e) => setNovaMateria(e.target.value)}
                />
              </CCol>
              <CCol md={5}>
                <label className="form-label small text-muted text-uppercase">Categoria Pai (Opcional)</label>
                <CFormSelect value={parentID} onChange={(e) => setParentID(e.target.value)}>
                  <option value="">Nenhuma (Raiz)</option>
                  {flattenedList.map(m => (
                    <option key={m.id} value={m.id}>
                      {'. . '.repeat(m.depth)} {m.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CButton color="primary" className="w-100" onClick={criar} disabled={!novaMateria.trim()}>
                  <CIcon icon={cilPlus} className="me-1" /> Criar
                </CButton>
              </CCol>
            </CRow>
          </div>

          {loading ? (
            <div className="text-center py-5"><CSpinner /></div>
          ) : (
            <div className="table-responsive">
              <CTable align="middle" hover bordered className="mb-0">
                <CTableHead className="table-light">
                  <CTableRow>
                    <CTableHeaderCell style={{ width: '60%' }}>Hierarquia</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Questões</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Ações</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {currentItems.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={3} className="text-center py-4 text-muted">
                        Nenhuma categoria encontrada nesta página.
                      </CTableDataCell>
                    </CTableRow>
                  ) : currentItems.map((m) => (
                    <CTableRow key={m.id} className={m.depth === 0 ? 'fw-bold' : ''}>
                      <CTableDataCell className="text-nowrap">
                        <div style={{ paddingLeft: m.depth * 30, display: 'flex', alignItems: 'center' }}>
                          {m.depth > 0 && <CIcon icon={cilChevronRight} className="text-muted me-2" style={{ width: 12 }} />}

                          {editandoId === m.id ? (
                            <div className="d-flex flex-column gap-2 w-100">
                              <CInputGroup size="sm">
                                <CFormInput
                                  value={editandoNome}
                                  onChange={(e) => setEditandoNome(e.target.value)}
                                  autoFocus
                                />
                                <CButton color="success" variant="outline" onClick={salvarEdicao}><CIcon icon={cilCheckAlt} /></CButton>
                                <CButton color="secondary" variant="outline" onClick={() => setEditandoId(null)}><CIcon icon={cilX} /></CButton>
                              </CInputGroup>
                              <CFormSelect size="sm" value={editandoParentId} onChange={e => setEditandoParentId(e.target.value)}>
                                <option value="">Mudar para Raiz</option>
                                {flattenedList.filter(f => f.id !== m.id).map(f => (
                                  <option key={f.id} value={f.id}>{'. . '.repeat(f.depth)} {f.nome}</option>
                                ))}
                              </CFormSelect>
                            </div>
                          ) : (
                            <span>{m.nome}</span>
                          )}
                        </div>
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
                          onClick={() => {
                            setEditandoId(m.id);
                            setEditandoNome(m.nome);
                            setEditandoParentId(m.parent_id || '')
                          }}
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
            </div>
          )}

          {/* Paginação Inteligente */}
          {!loading && totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4 overflow-x-auto pb-2">
              <CPagination align="center" aria-label="Navegação de páginas" className="flex-nowrap">
                {renderPagination()}
              </CPagination>
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default GestaoMaterias