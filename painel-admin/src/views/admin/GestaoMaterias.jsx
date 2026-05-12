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
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [solicitacoes, setSolicitacoes] = useState([])
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(false)

  const userId = parseInt(sessionStorage.getItem('userId'), 10)
  const userPapel = sessionStorage.getItem('userPapel') || 'aluno'
  const isAdmin = userPapel === 'admin'

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/materias`)
      const data = await res.json()
      setMaterias(Array.isArray(data) ? data : [])
      
      if (isAdmin) {
        carregarSolicitacoes()
      }
    } catch {
      setError('Erro ao carregar matérias.')
    } finally {
      setLoading(false)
    }
  }

  const carregarSolicitacoes = async () => {
    setLoadingSolicitacoes(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/solicitacoes-pendentes`)
      if (res.ok) setSolicitacoes(await res.json())
    } catch (e) {
      console.error("Erro ao carregar solicitações", e)
    } finally {
      setLoadingSolicitacoes(false)
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

  const moverMateria = async (id, novoParentId) => {
    const materia = materias.find(m => m.id === id)
    if (!materia) return

    if (!isAdmin) {
      // Professor: Envia solicitação
      try {
        const res = await fetch(`${API_URL}/api/admin/materias/solicitar-mover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materia_id: id,
            novo_parent_id: novoParentId,
            usuario_id: userId
          }),
        })
        if (!res.ok) throw new Error('Erro ao enviar solicitação')
        setSuccess('Solicitação enviada ao Admin!')
        setTimeout(() => setSuccess(''), 3000)
      } catch (e) {
        setError(e.message)
      }
      return
    }

    // Admin: Move diretamente
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: materia.nome,
          parent_id: novoParentId,
          indice: materia.indice || ''
        }),
      })
      if (!res.ok) throw new Error('Erro ao mover matéria')
      setSuccess('Hierarquia atualizada!')
      carregar()
      setTimeout(() => setSuccess(''), 2000)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  const processarSolicitacao = async (sid, status) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/processar-solicitacao/${sid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, usuario_id: userId })
      })
      if (!res.ok) throw new Error('Erro ao processar')
      setSuccess(`Solicitação ${status}!`)
      carregar()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e.message)
    }
  }

  const onDragStart = (e, id) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e, id) => {
    e.preventDefault()
    if (id !== draggedId) setDragOverId(id)
  }

  const onDrop = (e, targetId) => {
    e.preventDefault()
    const sourceId = draggedId
    setDraggedId(null)
    setDragOverId(null)

    if (!sourceId || sourceId === targetId) return
    moverMateria(sourceId, targetId)
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

      <CCard className="mb-4 border-0 shadow-sm">
        <CCardHeader className="bg-body border-0 pb-0">
          <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
            <div>
              <div className="text-uppercase text-body-secondary small fw-semibold" style={{ letterSpacing: '0.05em' }}>Estrutura Acadêmica</div>
              <h3 className="mb-1 fw-bold">Gestão de Conteúdo</h3>
              <div className="text-body-secondary small">
                Organização hierárquica de matérias e assuntos (Base Gran Cursos).
              </div>
            </div>
            <div className="d-flex gap-2 align-items-start">
              <CButton color="danger" variant="outline" size="sm" className="rounded-pill px-3" onClick={limparVazias} disabled={limpando}>
                {limpando ? <CSpinner size="sm" /> : <><CIcon icon={cilTrash} className="me-1" /> Faxina de Vazias</>}
              </CButton>
            </div>
          </div>
        </CCardHeader>
        <CCardBody className="p-4">
          
          {/* Solicitações Pendentes (Somente Admin) */}
          {isAdmin && solicitacoes.length > 0 && (
            <div className="mb-4 p-3 border border-warning rounded-3 bg-warning-subtle shadow-sm">
              <h6 className="fw-bold text-warning-emphasis d-flex align-items-center gap-2 mb-3">
                <CIcon icon={cilCheckAlt} /> Solicitações de Reorganização ({solicitacoes.length})
              </h6>
              <div className="table-responsive">
                <CTable small align="middle" className="mb-0">
                  <CTableBody>
                    {solicitacoes.map(s => (
                      <CTableRow key={s.id}>
                        <CTableDataCell className="small">
                          <strong>{s.solicitante}</strong> propôs mover <code>{s.materia_nome}</code> para <code>{s.novo_parent_nome}</code>
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          <CButton color="success" size="sm" className="me-1" onClick={() => processarSolicitacao(s.id, 'aprovado')}>Aceitar</CButton>
                          <CButton color="danger" size="sm" onClick={() => processarSolicitacao(s.id, 'rejeitado')}>Rejeitar</CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </div>
            </div>
          )}
          <CRow className="mb-4 g-3">
            <CCol lg={8}>
              <div 
                className="p-3 rounded-4 border border-dashed h-100"
                style={{ 
                  background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }}
              >
                <div className="text-uppercase fw-bold text-primary mb-3" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                  🆕 Nova Categoria
                </div>
                <CRow className="g-2">
                  <CCol md={7}>
                    <CFormInput 
                      placeholder="Nome da matéria..." 
                      value={novaMateria} 
                      onChange={e => setNovaMateria(e.target.value)}
                      className="rounded-pill border-0 shadow-sm"
                      style={{ height: 42, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }}
                    />
                  </CCol>
                  <CCol md={3}>
                    <CFormSelect 
                      value={parentID} 
                      onChange={e => setParentID(e.target.value)}
                      className="rounded-pill border-0 shadow-sm"
                      style={{ height: 42, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }}
                    >
                      <option value="">Raiz</option>
                      {flattenedList.slice(0, 100).map(m => (
                        <option key={m.id} value={m.id}>{m.indice ? `${m.indice} ` : ''}{m.nome}</option>
                      ))}
                    </CFormSelect>
                  </CCol>
                  <CCol md={2}>
                    <CButton color="primary" className="w-100 rounded-pill fw-bold" onClick={criar} disabled={!novaMateria.trim()} style={{ height: 42 }}>
                      <CIcon icon={cilPlus} />
                    </CButton>
                  </CCol>
                </CRow>
              </div>
            </CCol>
            <CCol lg={4}>
              <div className="p-3 bg-body-tertiary rounded-4 border h-100" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}>
                <div className="text-uppercase fw-bold text-secondary mb-3" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                  🔍 Filtrar Assuntos
                </div>
                <div className="position-relative">
                  <CIcon 
                    icon={cilSearch} 
                    className="position-absolute translate-middle-y top-50 ms-3 text-body-secondary" 
                    style={{ width: 16, zIndex: 5 }}
                  />
                  <CFormInput 
                    className="ps-5 rounded-pill border-0 shadow-sm"
                    placeholder="Buscar por nome ou número..." 
                    value={busca} 
                    onChange={e => setBusca(e.target.value)}
                    style={{ height: 42, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', fontSize: 14 }}
                  />
                </div>
              </div>
            </CCol>
          </CRow>

          {loading ? (
            <div className="text-center py-5"><CSpinner color="primary" /></div>
          ) : (
            <div className="border-0 rounded-4 overflow-hidden shadow-sm">
              <div style={{ maxHeight: '600px', overflowY: 'auto', background: isDark ? 'rgba(255,255,255,0.01)' : '#fff' }}>
                <CTable hover align="middle" className="mb-0 border-0">
                  <CTableHead className="sticky-top shadow-sm" style={{ zIndex: 10 }}>
                    <CTableRow style={{ background: isDark ? '#1a1a1a' : '#f8fafc' }}>
                      <CTableHeaderCell className="ps-4 py-3 border-0" style={{ width: '70%', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                        Estrutura Hierárquica
                      </CTableHeaderCell>
                      <CTableHeaderCell className="text-center border-0" style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                        Questões
                      </CTableHeaderCell>
                      <CTableHeaderCell className="text-center pe-4 border-0" style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: isDark ? '#94a3b8' : '#64748b' }}>
                        Ações
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {flattenedList.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={3} className="text-center py-5 text-muted border-0">
                          Nenhum assunto encontrado.
                        </CTableDataCell>
                      </CTableRow>
                    ) : flattenedList.map((m) => {
                      const isOver = dragOverId === m.id
                      const isDragged = draggedId === m.id

                      return (
                        <CTableRow 
                          key={m.id} 
                          className={`${m.depth === 0 ? 'fw-bold' : ''} ${isOver ? 'bg-primary-subtle border-primary' : ''} border-bottom`}
                          draggable
                          onDragStart={(e) => onDragStart(e, m.id)}
                          onDragOver={(e) => onDragOver(e, m.id)}
                          onDrop={(e) => onDrop(e, m.id)}
                          onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                          style={{ 
                            cursor: 'grab', 
                            opacity: isDragged ? 0.4 : 1, 
                            transition: 'all 0.2s',
                            background: m.depth === 0 ? (isDark ? 'rgba(255,255,255,0.03)' : '#fcfcfc') : 'transparent'
                          }}
                        >
                          <CTableDataCell className="ps-4 py-3 border-0">
                            <div style={{ paddingLeft: m.depth * 20, display: 'flex', alignItems: 'center' }}>
                              <TreeLine depth={m.depth} />
                              
                              {editandoId === m.id ? (
                                <div className="d-flex flex-column gap-2 w-100 me-3 animation-fade-in">
                                  <CFormInput size="sm" className="rounded-3" value={editandoIndice} onChange={e => setEditandoIndice(e.target.value)} placeholder="Índice (ex: 3.1)" />
                                  <CInputGroup size="sm">
                                    <CFormInput className="rounded-start-3" value={editandoNome} onChange={e => setEditandoNome(e.target.value)} autoFocus />
                                    <CButton color="success" variant="outline" onClick={salvarEdicao}><CIcon icon={cilCheckAlt} /></CButton>
                                    <CButton color="secondary" variant="outline" className="rounded-end-3" onClick={() => setEditandoId(null)}><CIcon icon={cilX} /></CButton>
                                  </CInputGroup>
                                </div>
                              ) : (
                                <div className="d-flex align-items-center overflow-hidden">
                                  <span className="me-2 text-body-tertiary" style={{ cursor: 'grab', fontSize: 12 }}>⠿</span>
                                  {m.indice && (
                                    <span 
                                      className={`badge ${m.depth === 0 ? 'bg-primary text-white' : 'bg-secondary-subtle text-secondary border border-secondary-subtle'} me-2 shadow-sm rounded-3`} 
                                      style={{ minWidth: '28px', fontSize: 10, fontWeight: 700, padding: '4px 6px' }}
                                    >
                                      {m.depth === 0 ? m.indice : formatIndice(m.indice)}
                                    </span>
                                  )}
                                  <span className="text-truncate" style={{ fontSize: 14, letterSpacing: '-0.01em' }} title={m.nome}>{m.nome}</span>
                                </div>
                              )}
                            </div>
                          </CTableDataCell>
                          <CTableDataCell className="text-center border-0">
                            <CBadge 
                              color={m.total_questoes > 0 ? 'info' : 'secondary'} 
                              shape="rounded-pill" 
                              className={`px-3 py-2 fw-bold tabular-nums ${m.total_questoes > 0 ? 'bg-opacity-10 text-info border border-info border-opacity-25' : 'bg-opacity-10 text-secondary'}`}
                              style={{ fontSize: 11 }}
                            >
                              {m.total_questoes || 0}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell className="text-center pe-4 border-0">
                            <div className="d-flex justify-content-center gap-1">
                              {m.parent_id && (
                                <CButton color="info" size="sm" variant="ghost" className="rounded-circle p-2 hover-bg-light" 
                                  title="Mover para Raiz"
                                  onClick={() => moverMateria(m.id, null)}>
                                  <CIcon icon={cilPlus} size="sm" style={{ transform: 'rotate(45deg)' }} />
                                </CButton>
                              )}
                              <CButton color="warning" size="sm" variant="ghost" className="rounded-circle p-2 hover-bg-light" 
                                onClick={() => {
                                  setEditandoId(m.id)
                                  setEditandoNome(m.nome)
                                  setEditandoParentId(m.parent_id || '')
                                  setEditandoIndice(m.indice || '')
                                }}>
                                <CIcon icon={cilPencil} size="sm" />
                              </CButton>
                              <CButton color="danger" size="sm" variant="ghost" className="rounded-circle p-2 hover-bg-light" 
                                onClick={() => deletar(m.id, m.nome)}>
                                <CIcon icon={cilTrash} size="sm" />
                              </CButton>
                            </div>
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              </div>
            </div>
          )}
          
          <div className="mt-3 text-end">
            <small className="text-body-tertiary fw-medium" style={{ fontSize: 11, letterSpacing: '0.02em' }}>
              TOTAL DE REGISTROS: <span className="text-primary fw-bold">{flattenedList.length}</span>
            </small>
          </div>
        </CCardBody>
      </CCard>
      
      <style>{`
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animation-fade-in { animation: fadeIn 0.2s ease-out; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${isDark ? 'rgba(255,255,255,0.2)' : '#94a3b8'}; }
        .hover-bg-light:hover { background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'} !important; }
        .text-truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 400px;
        }
      `}</style>
    </div>
  )
}

const CInputGroupText = ({ children, className }) => (
  <span className={`input-group-text ${className}`}>{children}</span>
)

export default GestaoMaterias