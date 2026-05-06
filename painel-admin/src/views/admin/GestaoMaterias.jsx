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
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CInputGroup,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash, cilPlus, cilCheckAlt, cilX, cilSearch } from '@coreui/icons'
import { API_URL } from '../../config'

const GestaoMaterias = () => {
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busca, setBusca] = useState('')

  const [novaMateria, setNovaMateria] = useState('')
  const [parentID, setParentID] = useState('')

  const [editandoId, setEditandoId] = useState(null)
  const [editandoNome, setEditandoNome] = useState('')
  const [editandoParentId, setEditandoParentId] = useState('')
  const [editandoIndice, setEditandoIndice] = useState('')

  const [limpando, setLimpando] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/materias`)
      const data = await res.json()
      setMaterias(Array.isArray(data) ? data : [])
    } catch {
      setError('Erro ao carregar matérias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  // ── Lógica de Construção da Árvore ───────────────────────────
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

  // ── Lista Achatada para Renderização (com filtro de busca) ──
  const flattenedList = useMemo(() => {
    const list = []
    const recurse = (node, depth = 0) => {
      list.push({ ...node, depth })
      if (node.children) {
        node.children.forEach(c => recurse(c, depth + 1))
      }
    }
    tree.forEach(root => recurse(root))

    if (!busca) return list
    
    // Se houver busca, filtramos mas mantemos o contexto se necessário
    const termo = busca.toLowerCase()
    return list.filter(m => 
      m.nome.toLowerCase().includes(termo) || 
      (m.indice && m.indice.includes(termo))
    )
  }, [tree, busca])

  const formatIndice = (indice) => {
    if (!indice) return ''
    return indice.replace(/^\d+\./, '')
  }

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
      if (!res.ok) throw new Error('Erro ao criar')
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
          parent_id: editandoParentId === '' ? null : parseInt(editandoParentId),
          indice: editandoIndice.trim()
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
    if (!window.confirm(`Deletar "${nome}"?`)) return
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
    if (!window.confirm("Remover todas as matérias sem questões e sem filhos?")) return
    setLimpando(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/limpar-vazias`, { method: 'DELETE' })
      const data = await res.json()
      setSuccess(data.mensagem)
      carregar()
    } catch (e) {
      setError(e.message)
    } finally {
      setLimpando(false)
    }
  }

  // Componente para desenhar as linhas da árvore
  const TreeLine = ({ depth }) => {
    if (depth === 0) return null
    return (
      <span className="text-body-tertiary me-2 d-inline-flex align-items-center" style={{ fontFamily: 'monospace' }}>
        {'|  '.repeat(depth - 1)}L_
      </span>
    )
  }

  return (
    <div className="fade-in">
      {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}
      {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}

      <CCard className="mb-4 shadow-sm border-0">
        <CCardHeader className="bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
          <div>
            <h5 className="mb-0 fw-bold text-primary">Gestão de Conteúdo (Árvore de Matérias)</h5>
            <small className="text-muted">Organização hierárquica baseada no Gran Cursos</small>
          </div>
          <div className="d-flex gap-2">
             <CButton color="danger" variant="outline" size="sm" onClick={limparVazias} disabled={limpando}>
               {limpando ? <CSpinner size="sm" /> : 'Faxina de Vazias'}
             </CButton>
          </div>
        </CCardHeader>
        <CCardBody className="p-4">
          
          {/* Barra de Criação e Busca */}
          <CRow className="mb-4 g-3">
            <CCol lg={8}>
              <div className="p-3 bg-light rounded-3 border">
                <h6 className="fw-bold mb-3 small text-uppercase text-secondary">Nova Categoria</h6>
                <CRow className="g-2">
                  <CCol md={7}>
                    <CFormInput 
                      placeholder="Nome da matéria..." 
                      value={novaMateria} 
                      onChange={e => setNovaMateria(e.target.value)}
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormSelect value={parentID} onChange={e => setParentID(e.target.value)}>
                      <option value="">Raiz</option>
                      {flattenedList.slice(0, 100).map(m => ( // Limitamos o select para performance
                        <option key={m.id} value={m.id}>{m.indice ? `${m.indice} ` : ''}{m.nome}</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={2}>
                    <CButton color="primary" className="w-100" onClick={criar} disabled={!novaMateria.trim()}>
                      <CIcon icon={cilPlus} />
                    </CButton>
                  </CCol>
                </CRow>
              </div>
            </CCol>
            <CCol lg={4}>
              <div className="p-3 bg-light rounded-3 border h-100">
                <h6 className="fw-bold mb-3 small text-uppercase text-secondary">Filtrar Assuntos</h6>
                <CInputGroup>
                  <CInputGroupText className="bg-white border-end-0">
                    <CIcon icon={cilSearch} className="text-muted" />
                  </CInputGroupText>
                  <CFormInput 
                    className="border-start-0"
                    placeholder="Buscar por nome ou número..." 
                    value={busca} 
                    onChange={e => setBusca(e.target.value)}
                  />
                </CInputGroup>
              </div>
            </CCol>
          </CRow>

          {loading ? (
            <div className="text-center py-5"><CSpinner color="primary" /></div>
          ) : (
            <div className="border rounded-3 overflow-hidden shadow-sm">
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <CTable hover align="middle" className="mb-0 border-0">
                  <CTableHead className="bg-white sticky-top shadow-sm">
                    <CTableRow>
                      <CTableHeaderCell className="ps-4" style={{ width: '70%' }}>Estrutura Hierárquica</CTableHeaderCell>
                      <CTableHeaderCell className="text-center">Questões</CTableHeaderCell>
                      <CTableHeaderCell className="text-center pe-4">Ações</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {flattenedList.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={3} className="text-center py-5 text-muted">
                          Nenhum assunto encontrado.
                        </CTableDataCell>
                      </CTableRow>
                    ) : flattenedList.map((m) => (
                      <CTableRow key={m.id} className={m.depth === 0 ? 'bg-light fw-bold' : ''}>
                        <CTableDataCell className="ps-4 py-3">
                          <div style={{ paddingLeft: m.depth * 20, display: 'flex', alignItems: 'center' }}>
                            <TreeLine depth={m.depth} />
                            
                            {editandoId === m.id ? (
                              <div className="d-flex flex-column gap-2 w-100 me-3">
                                <CFormInput size="sm" value={editandoIndice} onChange={e => setEditandoIndice(e.target.value)} placeholder="Índice (ex: 3.1)" />
                                <CInputGroup size="sm">
                                  <CFormInput value={editandoNome} onChange={e => setEditandoNome(e.target.value)} autoFocus />
                                  <CButton color="success" variant="outline" onClick={salvarEdicao}><CIcon icon={cilCheckAlt} /></CButton>
                                  <CButton color="secondary" variant="outline" onClick={() => setEditandoId(null)}><CIcon icon={cilX} /></CButton>
                                </CInputGroup>
                              </div>
                            ) : (
                              <div className="d-flex align-items-center overflow-hidden">
                                {m.indice && <span className="badge bg-secondary-subtle text-secondary me-2 border border-secondary-subtle">{formatIndice(m.indice)}</span>}
                                <span className="text-truncate" title={m.nome}>{m.nome}</span>
                              </div>
                            )}
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <CBadge color={m.total_questoes > 0 ? 'info' : 'secondary'} shape="rounded-pill" className="px-3 py-2">
                            {m.total_questoes || 0}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="text-center pe-4">
                          <CButton color="warning" size="sm" variant="ghost" className="me-1 rounded-circle" 
                            onClick={() => {
                              setEditandoId(m.id)
                              setEditandoNome(m.nome)
                              setEditandoParentId(m.parent_id || '')
                              setEditandoIndice(m.indice || '')
                            }}>
                            <CIcon icon={cilPencil} size="sm" />
                          </CButton>
                          <CButton color="danger" size="sm" variant="ghost" className="rounded-circle" 
                            onClick={() => deletar(m.id, m.nome)}>
                            <CIcon icon={cilTrash} size="sm" />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </div>
            </div>
          )}
          
          <div className="mt-3 text-end">
            <small className="text-muted">Mostrando {flattenedList.length} registros</small>
          </div>
        </CCardBody>
      </CCard>
      
      <style>{`
        .fade-in { animation: fadeIn 0.3s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #999; }
      `}</style>
    </div>
  )
}

const CInputGroupText = ({ children, className }) => (
  <span className={`input-group-text ${className}`}>{children}</span>
)

export default GestaoMaterias