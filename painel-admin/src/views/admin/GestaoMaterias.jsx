import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { CSpinner } from '@coreui/react'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { API_URL } from '../../config'
import { useTheme } from '../../context/themeContext'

/* ── Tokens Airbnb ───────────────────────────────────────── */
const tk = {
  rausch:  '#FF385C',
  babu:    '#00A699',
  arches:  '#FC642D',
  foggy:   '#767676',
  swiss:   '#B0B0B0',
}

const FONT = "'Nunito', 'Circular Std', sans-serif"

/* ── Componentes de UI Básicos ───────────────────────────── */
const Label = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', color: tk.foggy, marginBottom: 6, fontFamily: FONT }}>{children}</div>
)

const AInput = ({ value, onChange, placeholder, autoFocus }) => (
  <input autoFocus={autoFocus} value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', height: 42, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', padding: '0 14px', fontSize: 13, fontFamily: FONT, outline: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = tk.rausch} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
)

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

  // Infinite Scroll state
  const [visibleCount, setVisibleCount] = useState(50)
  const { ref: observerRef, inView } = useInView()

  useEffect(() => {
    if (inView) {
      setVisibleCount(prev => prev + 50)
    }
  }, [inView])

  const userId = parseInt(sessionStorage.getItem('userId'), 10)
  const userPapel = sessionStorage.getItem('userPapel') || 'aluno'
  const isAdmin = userPapel === 'admin'
  const { isDark } = useTheme()

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/materias`)
      const data = await res.json()
      setMaterias(Array.isArray(data) ? data : [])
      if (isAdmin) carregarSolicitacoes()
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

  // Construção da Árvore
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

  // Lista Achatada para Renderização
  const flattenedList = useMemo(() => {
    const list = []
    const recurse = (node, depth = 0) => {
      list.push({ ...node, depth })
      if (node.children) node.children.forEach(c => recurse(c, depth + 1))
    }
    tree.forEach(root => recurse(root))

    if (!busca) return list
    const termo = busca.toLowerCase()
    return list.filter(m => m.nome.toLowerCase().includes(termo) || (m.indice && m.indice.includes(termo)))
  }, [tree, busca])

  // Reseta o scroll ao buscar
  useEffect(() => { setVisibleCount(50) }, [busca])

  const formatIndice = (indice) => indice ? indice.replace(/^\d+\./, '') : ''

  const criar = async () => {
    if (!novaMateria.trim()) return
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/admin/materias`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaMateria.trim(), parent_id: parentID === '' ? null : parseInt(parentID) }),
      })
      if (!res.ok) throw new Error('Erro ao criar')
      setSuccess('Matéria criada!')
      setNovaMateria(''); setParentID('')
      carregar()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) { setError(e.message); setTimeout(() => setError(''), 3000) }
  }

  const salvarEdicao = async () => {
    if (!editandoNome.trim()) return
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/${editandoId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: editandoNome.trim(), parent_id: editandoParentId === '' ? null : parseInt(editandoParentId), indice: editandoIndice.trim() }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setEditandoId(null)
      setSuccess('Matéria atualizada!')
      carregar()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) { setError(e.message); setTimeout(() => setError(''), 3000) }
  }

  const deletar = async (id, nome) => {
    if (!window.confirm(`Deletar "${nome}"?`)) return
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao deletar')
      setSuccess('Matéria removida!')
      carregar()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) { setError(e.message); setTimeout(() => setError(''), 3000) }
  }

  const limparVazias = async () => {
    if (!window.confirm("Remover todas as matérias sem questões e sem filhos?")) return
    setLimpando(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/limpar-vazias`, { method: 'DELETE' })
      const data = await res.json()
      setSuccess(data.mensagem)
      carregar()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) { setError(e.message); setTimeout(() => setError(''), 3000) } 
    finally { setLimpando(false) }
  }

  const moverMateria = async (id, novoParentId) => {
    const materia = materias.find(m => m.id === id)
    if (!materia) return

    if (!isAdmin) {
      try {
        const res = await fetch(`${API_URL}/api/admin/materias/solicitar-mover`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materia_id: id, novo_parent_id: novoParentId, usuario_id: userId }),
        })
        if (!res.ok) throw new Error('Erro ao enviar solicitação')
        setSuccess('Solicitação enviada ao Admin!')
        setTimeout(() => setSuccess(''), 3000)
      } catch (e) { setError(e.message); setTimeout(() => setError(''), 3000) }
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: materia.nome, parent_id: novoParentId, indice: materia.indice || '' }),
      })
      if (!res.ok) throw new Error('Erro ao mover matéria')
      setSuccess('Hierarquia atualizada!')
      carregar()
      setTimeout(() => setSuccess(''), 2000)
    } catch (e) { setError(e.message); setTimeout(() => setError(''), 3000); setLoading(false) }
  }

  const processarSolicitacao = async (sid, status) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/processar-solicitacao/${sid}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, usuario_id: userId })
      })
      if (!res.ok) throw new Error('Erro ao processar')
      setSuccess(`Solicitação ${status}!`)
      carregar()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) { setError(e.message); setTimeout(() => setError(''), 3000) }
  }

  const onDragStart = (e, id) => { setDraggedId(id); e.dataTransfer.effectAllowed = 'move' }
  const onDragOver = (e, id) => { e.preventDefault(); if (id !== draggedId) setDragOverId(id) }
  const onDrop = (e, targetId) => {
    e.preventDefault()
    const sourceId = draggedId
    setDraggedId(null); setDragOverId(null)
    if (!sourceId || sourceId === targetId) return
    moverMateria(sourceId, targetId)
  }

  const TreeLine = ({ depth }) => {
    if (depth === 0) return null
    return (
      <span style={{ color: tk.foggy, marginRight: 8, display: 'inline-flex', alignItems: 'center', opacity: 0.3 }}>
        <Icon icon="solar:round-alt-arrow-right-bold-duotone" width="16" />
      </span>
    )
  }

  const containerStyle = { minHeight: '100vh', background: 'var(--color-bg-primary)', padding: '32px 16px 60px', fontFamily: FONT }

  // Slice list for performance virtualization
  const visibleList = flattenedList.slice(0, visibleCount)

  return (
    <div style={containerStyle}>
      <style>{`
        .gq-hover:hover { background: var(--color-bg-tertiary); }
      `}</style>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <div style={{ color: tk.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            Estrutura Acadêmica
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                Gestão de Matérias
              </div>
              <div style={{ fontSize: 14, color: tk.foggy, marginTop: 6 }}>
                Organização hierárquica de matérias e assuntos base do banco de questões.
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
              onClick={limparVazias} disabled={limpando}
              style={{
                background: 'transparent', color: tk.rausch, border: `1.5px solid ${tk.rausch}`, borderRadius: 99,
                padding: '0 20px', height: 44, fontWeight: 700, fontSize: 13, cursor: limpando ? 'not-allowed' : 'pointer', fontFamily: FONT,
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              {limpando ? <CSpinner size="sm" /> : <><Icon icon="solar:trash-bin-trash-bold-duotone" width="18" /> Faxina de Vazias</>}
            </motion.button>
          </div>
        </motion.div>

        {/* SOLICITAÇÕES (ADMIN) */}
        {isAdmin && solicitacoes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24, padding: '20px 24px', background: `${tk.arches}15`, border: `1px solid ${tk.arches}40`, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: tk.arches, fontWeight: 800, marginBottom: 16 }}>
              <Icon icon="solar:bell-bing-bold-duotone" width="20" /> Solicitações de Reorganização ({solicitacoes.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {solicitacoes.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-elevated)', padding: '12px 16px', borderRadius: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                    <strong>{s.solicitante}</strong> propôs mover <span style={{ color: tk.rausch, fontWeight: 700 }}>{s.materia_nome}</span> para <span style={{ color: tk.babu, fontWeight: 700 }}>{s.novo_parent_nome}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => processarSolicitacao(s.id, 'aprovado')} style={{ background: tk.babu, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Aceitar</motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => processarSolicitacao(s.id, 'rejeitado')} style={{ background: tk.rausch, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Rejeitar</motion.button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* FILTROS E CRIAÇÃO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* Nova Categoria */}
          <div style={{ padding: '20px 24px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 20 }}>
            <Label>🆕 Nova Categoria</Label>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 200 }}><AInput placeholder="Nome da matéria..." value={novaMateria} onChange={e => setNovaMateria(e.target.value)} /></div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <select value={parentID} onChange={e => setParentID(e.target.value)} style={{ width: '100%', height: 42, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', padding: '0 14px', fontSize: 13, fontFamily: FONT, outline: 'none' }}>
                  <option value="">Raiz</option>
                  {flattenedList.slice(0, 100).map(m => (<option key={m.id} value={m.id}>{m.indice ? `${m.indice} ` : ''}{m.nome}</option>))}
                </select>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={criar} disabled={!novaMateria.trim()} style={{ height: 42, width: 42, borderRadius: 10, border: 'none', background: tk.babu, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: !novaMateria.trim() ? 'not-allowed' : 'pointer', opacity: !novaMateria.trim() ? 0.5 : 1 }}><Icon icon="solar:add-circle-bold-duotone" width="20" /></motion.button>
            </div>
          </div>

          {/* Busca */}
          <div style={{ padding: '20px 24px', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 20 }}>
            <Label>🔍 Filtrar Assuntos</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid var(--color-border)', borderRadius: 10, padding: '0 14px', height: 42, background: 'var(--color-bg-elevated)', marginTop: 12 }}>
              <Icon icon="solar:magnifer-linear" width="16" style={{ color: tk.foggy }} />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou número..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: FONT, color: 'var(--color-text-primary)', width: '100%' }} />
            </div>
          </div>
        </div>

        {/* TABELA DE MATÉRIAS (ÁRVORE) */}
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 20, overflow: 'hidden' }}>
          {loading ? <div style={{ textAlign: 'center', padding: '60px 0' }}><CSpinner color="primary" /></div> : (
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 140px', padding: '12px 24px', background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 10 }}>
                {['Estrutura Hierárquica', 'Questões', 'Ações'].map((h, i) => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: tk.foggy, textAlign: i === 0 ? 'left' : 'center' }}>{h}</div>
                ))}
              </div>
              
              {flattenedList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: tk.foggy, fontSize: 14 }}>
                  <Icon icon="solar:folder-error-bold-duotone" width="48" style={{ marginBottom: 12, opacity: 0.2 }} />
                  <div>Nenhum assunto encontrado.</div>
                </div>
              ) : (
                <div>
                  {visibleList.map((m) => {
                    const isOver = dragOverId === m.id
                    const isDragged = draggedId === m.id

                    return (
                      <div 
                        key={m.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, m.id)}
                        onDragOver={(e) => onDragOver(e, m.id)}
                        onDrop={(e) => onDrop(e, m.id)}
                        onDragEnd={() => { setDraggedId(null); setDragOverId(null) }}
                        className={!isDragged && !isOver ? 'gq-hover' : ''}
                        style={{ 
                          display: 'grid', gridTemplateColumns: '1fr 100px 140px', padding: '12px 24px',
                          borderBottom: '1px solid var(--color-border)', alignItems: 'center',
                          background: isOver ? `${tk.babu}10` : m.depth === 0 ? 'var(--color-bg-tertiary)' : 'transparent',
                          opacity: isDragged ? 0.4 : 1, cursor: 'grab', transition: 'background 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: m.depth * 24 }}>
                          <TreeLine depth={m.depth} />
                          
                          {editandoId === m.id ? (
                            <div style={{ display: 'flex', gap: 8, width: '100%', paddingRight: 16 }}>
                              <AInput value={editandoIndice} onChange={e => setEditandoIndice(e.target.value)} placeholder="Índice" />
                              <div style={{ flex: 1 }}><AInput value={editandoNome} onChange={e => setEditandoNome(e.target.value)} autoFocus /></div>
                              <button onClick={salvarEdicao} style={{ background: tk.babu, color: '#fff', border: 'none', borderRadius: 8, padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Icon icon="solar:check-circle-bold-duotone" width="16" /></button>
                              <button onClick={() => setEditandoId(null)} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: tk.foggy, borderRadius: 8, padding: '0 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Icon icon="solar:close-circle-bold-duotone" width="16" /></button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Icon icon="solar:reorder-bold-duotone" width="14" style={{ color: tk.swiss, cursor: 'grab' }} />
                              {m.indice && (
                                <span style={{ background: m.depth === 0 ? tk.babu : `${tk.babu}15`, color: m.depth === 0 ? '#fff' : tk.babu, fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>
                                  {m.depth === 0 ? m.indice : formatIndice(m.indice)}
                                </span>
                              )}
                              <span style={{ fontSize: 13, fontWeight: m.depth === 0 ? 800 : 600, color: 'var(--color-text-primary)' }}>{m.nome}</span>
                            </div>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <span style={{ background: m.total_questoes > 0 ? `${tk.arches}15` : 'var(--color-bg-tertiary)', color: m.total_questoes > 0 ? tk.arches : tk.foggy, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99 }}>
                            {m.total_questoes || 0}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                          {m.parent_id && (
                            <button onClick={() => moverMateria(m.id, null)} title="Mover para Raiz" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: `${tk.babu}15`, color: tk.babu, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon="solar:arrow-up-bold-duotone" width="14" /></button>
                          )}
                          <button onClick={() => { setEditandoId(m.id); setEditandoNome(m.nome); setEditandoParentId(m.parent_id || ''); setEditandoIndice(m.indice || '') }} title="Editar" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: tk.foggy, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon="solar:pen-bold-duotone" width="14" /></button>
                          <button onClick={() => deletar(m.id, m.nome)} title="Excluir" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: `${tk.rausch}15`, color: tk.rausch, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon="solar:trash-bin-trash-bold-duotone" width="14" /></button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Intersection Observer Target for Loading More */}
                  {visibleCount < flattenedList.length && (
                    <div ref={observerRef} style={{ padding: '20px', textAlign: 'center', color: tk.foggy, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <CSpinner size="sm" /> Carregando mais assuntos...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div style={{ padding: '12px 24px', background: 'var(--color-bg-tertiary)', borderTop: '1px solid var(--color-border)', textAlign: 'right', fontSize: 11, color: tk.foggy, fontWeight: 700, letterSpacing: '1px' }}>
            TOTAL: <span style={{ color: tk.rausch }}>{flattenedList.length}</span> MATÉRIAS
          </div>
        </div>
      </div>

      {/* ── ALERTAS FLUTUANTES ── */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: tk.babu, color: '#fff', borderRadius: 99, padding: '12px 24px', fontWeight: 700, fontSize: 14, fontFamily: FONT, boxShadow: `0 8px 24px ${tk.babu}40`, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon="solar:check-circle-bold-duotone" width="20" /> {success}
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onClick={() => setError('')} style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: tk.rausch, color: '#fff', borderRadius: 99, padding: '12px 24px', fontWeight: 700, fontSize: 14, fontFamily: FONT, boxShadow: `0 8px 24px ${tk.rausch}40`, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Icon icon="solar:close-circle-bold-duotone" width="20" /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GestaoMaterias