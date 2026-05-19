import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { API_URL } from '../config'


const ListItem = ({ node, selected, loadingId, navigateTo, toggleItem, formatIndice }) => {
  const isSelected = selected.includes(String(node.id))
  const canGoDeeper = node.tem_filhos
  const isLoading = loadingId === node.id

  return (
    <div
      className={`d-flex align-items-center gap-3 p-3 border-bottom transition-all ${isSelected ? 'bg-primary bg-opacity-10' : 'bg-transparent hover-bg-light'}`}
      style={{
        cursor: 'pointer',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (canGoDeeper) navigateTo(node)
          else toggleItem(node.id)
        }
      }}
      onClick={() => {
        if (canGoDeeper) navigateTo(node)
        else toggleItem(node.id)
      }}
    >
      <div className="form-check mb-0">
        <input
          className="form-check-input"
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation()
            toggleItem(node.id)
          }}
          style={{ width: 20, height: 20, cursor: 'pointer' }}
        />
      </div>
      <div className="flex-grow-1 min-width-0">
        <div className="d-flex align-items-baseline gap-2 flex-wrap">
          {node.indice && (
            <span className="badge bg-primary bg-opacity-10 text-primary fw-bold" style={{ fontSize: 10, letterSpacing: '0.5px' }}>
              {formatIndice(node.indice)}
            </span>
          )}
          <span className={`text-body-primary ${canGoDeeper ? 'fw-bold' : ''}`} style={{ fontSize: 14 }}>
            {node.nome}
          </span>
        </div>
        {node.total_questoes > 0 && (
          <div className="text-secondary mt-1" style={{ fontSize: 11 }}>
            <span className="fw-semibold">{node.total_questoes}</span> questões disponíveis
          </div>
        )}
      </div>
      {canGoDeeper && (
        <div className="text-primary opacity-50">
          {isLoading ? (
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          ) : (
            <span style={{ fontSize: 18 }}>→</span>
          )}
        </div>
      )}
    </div>
  )
}

const MateriaMultiSelect = ({ materias, selected, onChange, esconderVazias = true, inline = false, rootId = null, focoFaculdadeTopicIds = null }) => {
  const [open, setOpen] = useState(false)
  const [filhosCache, setFilhosCache] = useState({})
  const [loadingId, setLoadingId] = useState(null)
  const [busca, setBusca] = useState('')
  const [history, setHistory] = useState([]) 
  const ref = useRef(null)

  const currentParent = history.length > 0 ? history[history.length - 1] : null

  
  const formatIndice = useCallback((indice) => {
    if (!indice) return ''
    return indice.replace(/^\d+\./, '')
  }, [])

  
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  
  useEffect(() => {
    setFilhosCache({})
    if (rootId) {
      const rootNode = materias.find(m => m.id === rootId)
      if (rootNode) {
        setHistory([{ id: rootNode.id, nome: rootNode.nome }])
        
        const load = async () => {
          setLoadingId(rootId)
          try {
            const res = await fetch(`${API_URL}/api/admin/materias/${rootId}/filhos?esconder_vazias=${esconderVazias}`)
            const data = await res.json()
            setFilhosCache(prev => ({ ...prev, [rootId]: Array.isArray(data) ? data : [] }))
          } catch {}
          setLoadingId(null)
        }
        load()
      }
    } else {
      setHistory([])
    }
  }, [esconderVazias, rootId, materias])

  
  const visibleItems = useMemo(() => {
    let items = []
    
    if (focoFaculdadeTopicIds && !currentParent) {
      items = materias.filter(m => focoFaculdadeTopicIds.includes(m.id))
    } else if (!currentParent) {
      items = materias.filter(m => !m.parent_id)
    } else {
      items = filhosCache[currentParent.id] || []
    }

    const termo = busca.toLowerCase().trim()
    return items
      .filter(m => !esconderVazias || m.total_questoes > 0 || m.tem_filhos)
      .filter(m => !termo || m.nome.toLowerCase().includes(termo))
      .sort((a, b) =>
        (a.indice || '').localeCompare(b.indice || '', undefined, { numeric: true }) ||
        a.nome.localeCompare(b.nome)
      )
  }, [materias, currentParent, filhosCache, esconderVazias, busca, focoFaculdadeTopicIds])

  
  const navigateTo = useCallback(async (node) => {
    if (!node.tem_filhos) return
    
    
    setHistory(prev => [...prev, { id: node.id, nome: node.nome }])

    
    if (filhosCache[node.id] === undefined) {
      setLoadingId(node.id)
      try {
        const res = await fetch(`${API_URL}/api/admin/materias/${node.id}/filhos?esconder_vazias=${esconderVazias}`)
        const data = await res.json()
        setFilhosCache(prev => ({ ...prev, [node.id]: Array.isArray(data) ? data : [] }))
      } catch {
        setFilhosCache(prev => ({ ...prev, [node.id]: [] }))
      }
      setLoadingId(null)
    }
  }, [filhosCache, esconderVazias])

  
  const navigateBack = () => setHistory(prev => prev.slice(0, -1))

  
  const toggleItem = useCallback((id) => {
    const s = String(id)
    onChange(
      selected.includes(s)
        ? selected.filter(x => x !== s)
        : [...selected, s]
    )
  }, [selected, onChange])

  
  const label = useMemo(() => {
    if (selected.length === 0) return 'Todas as disciplinas'
    if (selected.length === 1) {
      const m = materias.find(x => String(x.id) === selected[0])
      return m ? m.nome : '1 selecionada'
    }
    return `${selected.length} selecionados`
  }, [selected, materias])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {!inline && (
        <button
          type="button"
          className="btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center"
          onClick={() => setOpen(o => !o)}
          style={{ textAlign: 'left', overflow: 'hidden', height: 42 }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>
            {label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {selected.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange([])
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onChange([])
                }}
                style={{ fontSize: 18, color: '#888', lineHeight: 1, cursor: 'pointer', padding: '0 4px' }}
                aria-label="Limpar seleção"
              >
                x
              </span>
            )}
            <span>{open ? '^' : 'v'}</span>
          </div>
        </button>
      )}

      {(open || inline) ? (
        <div style={{
          position: inline ? 'relative' : 'absolute',
          zIndex: 1050,
          width: '100%',
          top: inline ? '0' : '100%',
          left: 0,
          marginTop: inline ? 0 : 4,
          background: 'var(--cui-body-bg)',
          border: inline ? '1px solid var(--cui-border-color)' : '1px solid var(--cui-border-color)',
          borderRadius: 12,
          boxShadow: inline ? 'none' : '0 10px 40px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 500,
          overflow: 'hidden'
        }}>
          {/* Header de Navegacao */}
          <div style={{ 
            padding: '12px 16px', 
            background: 'var(--cui-tertiary-bg)', 
            borderBottom: '1px solid var(--cui-border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            {history.length > (rootId ? 1 : 0) ? (
              <button 
                type="button"
                onClick={navigateBack}
                className="btn btn-sm btn-primary rounded-pill px-3"
              >
                Voltar
              </button>
            ) : (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f8ef7' }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--cui-secondary-color)', fontWeight: 700, letterSpacing: '0.5px' }}>
                {history.length <= (rootId ? 1 : 0) ? 'Assuntos' : 'Sub-assuntos'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentParent ? currentParent.nome : 'Selecione o que estudar'}
              </div>
            </div>
          </div>

          {/* Busca */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--cui-border-color)' }}>
            <input
              type="text"
              placeholder={`Buscar em ${currentParent ? 'assuntos' : 'disciplinas'}...`}
              aria-label="Buscar"
              autoComplete="off"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{
                width: '100%',
                fontSize: 14,
                padding: '8px 12px',
                border: '1px solid var(--cui-border-color)',
                borderRadius: 8,
                background: 'var(--cui-body-bg)',
                color: 'var(--cui-body-color)',
                outline: 'none',
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Lista de Itens */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loadingId === currentParent?.id && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--cui-secondary-color)' }}>
                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                Carregando assuntos...
              </div>
            )}
            
            {loadingId !== currentParent?.id && visibleItems.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--cui-secondary-color)', fontSize: 14 }}>
                {busca ? 'Nenhum resultado para sua busca.' : 'Nenhum item encontrado neste nível.'}
              </div>
            ) : (
              loadingId !== currentParent?.id &&
              visibleItems.map((node) => (
                <ListItem
                  key={node.id}
                  node={node}
                  selected={selected}
                  loadingId={loadingId}
                  navigateTo={navigateTo}
                  toggleItem={toggleItem}
                  formatIndice={formatIndice}
                />
              ))
            )}
          </div>

          {/* Rodapé */}
          {selected.length > 0 && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(79,142,247,0.05)',
              borderTop: '1px solid var(--cui-border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4f8ef7' }}>
                {selected.length} selecionados
              </span>
              <button
                type="button"
                className="btn btn-sm btn-link text-danger text-decoration-none p-0 fw-bold"
                onClick={() => onChange([])}
              >
                Limpar Tudo
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default MateriaMultiSelect
