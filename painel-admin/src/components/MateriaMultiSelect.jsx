import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { API_URL } from '../config'

const MateriaMultiSelect = ({ materias, selected, onChange, esconderVazias = true, inline = false, rootId = null }) => {
  const [open, setOpen] = useState(false)
  const [filhosCache, setFilhosCache] = useState({})
  const [loadingId, setLoadingId] = useState(null)
  const [busca, setBusca] = useState('')
  const [history, setHistory] = useState([]) // Pilha de navegação: [ {id, nome}, ... ]
  const ref = useRef(null)

  const currentParent = history.length > 0 ? history[history.length - 1] : null

  // Remove o primeiro número do índice (ex: 4.1. -> 1.)
  const formatIndice = useCallback((indice) => {
    if (!indice) return ''
    return indice.replace(/^\d+\./, '')
  }, [])

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Invalida cache e reseta navegação quando esconderVazias ou rootId muda
  useEffect(() => {
    setFilhosCache({})
    if (rootId) {
      const rootNode = materias.find(m => m.id === rootId)
      if (rootNode) {
        setHistory([{ id: rootNode.id, nome: rootNode.nome }])
        // Carrega os filhos da raiz se necessário
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

  // Itens visíveis no nível atual
  const visibleItems = useMemo(() => {
    let items = []
    if (!currentParent) {
      // Nível Raiz
      items = materias.filter(m => !m.parent_id)
    } else {
      // Nível de Assunto
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
  }, [materias, currentParent, filhosCache, esconderVazias, busca])

  // Navegar para dentro
  const navigateTo = useCallback(async (node) => {
    if (!node.tem_filhos) return
    
    // Adiciona ao histórico
    setHistory(prev => [...prev, { id: node.id, nome: node.nome }])

    // Carrega filhos se necessário
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

  // Voltar um nível
  const navigateBack = () => setHistory(prev => prev.slice(0, -1))

  // Toggle de seleção
  const toggleItem = useCallback((id) => {
    const s = String(id)
    onChange(
      selected.includes(s)
        ? selected.filter(x => x !== s)
        : [...selected, s]
    )
  }, [selected, onChange])

  // Label do botão
  const label = useMemo(() => {
    if (selected.length === 0) return 'Todas as disciplinas'
    if (selected.length === 1) {
      const m = materias.find(x => String(x.id) === selected[0])
      return m ? m.nome : '1 selecionada'
    }
    return `${selected.length} selecionados`
  }, [selected, materias])

  // Componente de Item Individual (renderiza 100% de largura)
  const ListItem = ({ node }) => {
    const isSelected = selected.includes(String(node.id))
    const canGoDeeper = node.tem_filhos
    const isLoading = loadingId === node.id

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid var(--cui-border-color-translucent)',
          cursor: 'pointer',
          background: isSelected ? 'rgba(79,142,247,0.06)' : 'transparent',
          transition: 'background 0.15s',
        }}
        onClick={() => canGoDeeper ? navigateTo(node) : toggleItem(node.id)}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => { e.stopPropagation(); toggleItem(node.id) }}
          style={{ width: 18, height: 18, accentColor: '#4f8ef7', cursor: 'pointer', flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14,
            fontWeight: canGoDeeper ? 700 : 400,
            color: 'var(--cui-body-color)',
            lineHeight: 1.4,
            wordBreak: 'break-word'
          }}>
            {node.indice && (
              <span style={{ color: '#4f8ef7', fontWeight: 800, marginRight: 6, fontSize: 12, fontFamily: 'monospace' }}>
                {formatIndice(node.indice)}
              </span>
            )}
            {node.nome}
          </div>
          {node.total_questoes > 0 && (
            <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginTop: 2 }}>
              {node.total_questoes} questões disponíveis
            </div>
          )}
        </div>
        {canGoDeeper && (
          <div style={{ color: '#4f8ef7', fontSize: 18, fontWeight: 'bold', flexShrink: 0 }}>
            {isLoading ? '⏳' : '›'}
          </div>
        )}
      </div>
    )
  }

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
                onClick={(e) => { e.stopPropagation(); onChange([]) }}
                style={{ fontSize: 18, color: '#888', lineHeight: 1, cursor: 'pointer', padding: '0 4px' }}
              >
                ×
              </span>
            )}
            <span>{open ? '▲' : '▼'}</span>
          </div>
        </button>
      )}

      {(open || inline) && (
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
          overflow: 'hidden',
          animation: inline ? 'none' : 'fade-up 0.2s ease-out'
        }}>
          {/* Header de Navegação */}
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
                ⬅ Voltar
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
              loadingId !== currentParent?.id && visibleItems.map(node => <ListItem key={node.id} node={node} />)
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
      )}
    </div>
  )
}

export default MateriaMultiSelect