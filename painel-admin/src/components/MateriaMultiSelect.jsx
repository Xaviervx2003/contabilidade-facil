import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { API_URL } from '../config'

const MateriaMultiSelect = ({ materias, selected, onChange, esconderVazias = true }) => {
  const [open, setOpen] = useState(false)
  const [activeRootId, setActiveRootId] = useState(null)
  const [filhosCache, setFilhosCache] = useState({})
  const [loadingId, setLoadingId] = useState(null)
  const [busca, setBusca] = useState('')
  const [expandedNodes, setExpandedNodes] = useState(new Set())
  const ref = useRef(null)

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

  // Invalida cache quando esconderVazias muda
  useEffect(() => {
    setFilhosCache({})
    setActiveRootId(null)
    setExpandedNodes(new Set())
  }, [esconderVazias])

  // Disciplinas raiz ordenadas
  const raizes = useMemo(() => {
    const termo = busca.toLowerCase().trim()
    return materias
      .filter(m => !m.parent_id)
      .filter(m => !esconderVazias || m.total_questoes > 0 || m.tem_filhos)
      .filter(m => !termo || m.nome.toLowerCase().includes(termo))
      .sort((a, b) =>
        (a.indice || '').localeCompare(b.indice || '', undefined, { numeric: true }) ||
        a.nome.localeCompare(b.nome)
      )
  }, [materias, esconderVazias, busca])

  // Carrega filhos sob demanda
  const loadFilhos = useCallback(async (parentId) => {
    setActiveRootId(parentId)
    if (filhosCache[parentId] !== undefined) return
    setLoadingId(parentId)
    try {
      const res = await fetch(`${API_URL}/api/admin/materias/${parentId}/filhos?esconder_vazias=${esconderVazias}`)
      const data = await res.json()
      setFilhosCache(prev => ({ ...prev, [parentId]: Array.isArray(data) ? data : [] }))
    } catch {
      setFilhosCache(prev => ({ ...prev, [parentId]: [] }))
    }
    setLoadingId(null)
  }, [filhosCache, esconderVazias])

  // Toggle de um item individual
  const toggleItem = useCallback((id) => {
    const s = String(id)
    onChange(
      selected.includes(s)
        ? selected.filter(x => x !== s)
        : [...selected, s]
    )
  }, [selected, onChange])

  // Expansão recursiva de sub-nós na coluna direita
  const toggleExpand = useCallback(async (e, node) => {
    e.stopPropagation()
    const id = node.id
    if (expandedNodes.has(id)) {
      setExpandedNodes(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } else {
      setExpandedNodes(prev => new Set(prev).add(id))
      if (filhosCache[id] === undefined) {
        setLoadingId(id)
        try {
          const res = await fetch(`${API_URL}/api/admin/materias/${id}/filhos?esconder_vazias=${esconderVazias}`)
          const data = await res.json()
          setFilhosCache(prev => ({ ...prev, [id]: Array.isArray(data) ? data : [] }))
        } catch {
          setFilhosCache(prev => ({ ...prev, [id]: [] }))
        }
        setLoadingId(null)
      }
    }
  }, [expandedNodes, filhosCache, esconderVazias])

  // Toggle de raiz (marca/desmarca toda a raiz - apenas superficial ou se filhos existirem)
  const toggleRaiz = useCallback(async (raiz) => {
    const s = String(raiz.id)
    const isSelected = selected.includes(s)
    
    // Se quiser desmarcar, remove o id
    if (isSelected) {
      onChange(selected.filter(x => x !== s))
      return
    }
    // Se quiser marcar, adiciona o id (sem forçar carregar filhos pra não pesar)
    onChange([...selected, s])
  }, [selected, onChange])

  // Quantos filhos de uma raiz estão selecionados (apenas primeiro nível)
  const countFilhosSelecionados = (parentId) => {
    const filhos = filhosCache[parentId]
    if (!filhos) return null
    return filhos.filter(f => selected.includes(String(f.id))).length
  }

  // Label do botão
  const label = useMemo(() => {
    if (selected.length === 0) return 'Todas as disciplinas'
    if (selected.length === 1) return materias.find(m => String(m.id) === selected[0])?.nome ?? '1 selecionada'
    return `${selected.length} selecionados`
  }, [selected, materias])

  // ── Render item raiz ────────────────────────────────────────────────────────
  const renderRaiz = (raiz) => {
    const isActive = activeRootId === raiz.id
    const isSelected = selected.includes(String(raiz.id))
    const filhosCount = countFilhosSelecionados(raiz.id)
    const isLoading = loadingId === raiz.id

    return (
      <div
        key={raiz.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: '1px solid var(--cui-border-color-translucent)',
          cursor: 'pointer',
          background: isActive
            ? 'rgba(79,142,247,0.15)'
            : isSelected
              ? 'rgba(79,142,247,0.06)'
              : 'transparent',
          transition: 'background 0.15s',
        }}
        onClick={() => loadFilhos(raiz.id)}
      >
        <input
          type="checkbox"
          checked={isSelected}
          disabled={isLoading}
          onChange={(e) => { e.stopPropagation(); toggleRaiz(raiz) }}
          style={{ width: 15, height: 15, accentColor: '#4f8ef7', cursor: 'pointer', flexShrink: 0 }}
        />
        <span style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--cui-body-color)',
          lineHeight: 1.4,
          wordBreak: 'break-word',
        }}>
          {raiz.indice && (
            <span style={{ color: '#4f8ef7', fontWeight: 800, marginRight: 5, fontSize: 11, fontFamily: 'monospace' }}>
              {formatIndice(raiz.indice)}
            </span>
          )}
          {raiz.nome}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 2 }}>
          <span style={{ fontSize: 11, color: '#4f8ef7', fontWeight: 700 }}>
            {raiz.total_questoes || 0}Q
          </span>
          {filhosCount !== null && filhosCount > 0 && (
            <span style={{
              fontSize: 10,
              background: '#4f8ef7',
              color: '#fff',
              borderRadius: 10,
              padding: '1px 6px',
              fontWeight: 700,
              lineHeight: 1.5,
            }}>
              {filhosCount} ✓
            </span>
          )}
        </div>

        <span style={{ fontSize: 12, color: 'var(--cui-secondary-color)', flexShrink: 0, transform: isActive ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
          {isLoading ? '⏳' : '›'}
        </span>

      {/* Renderização dos filhos aninhados */}
      {isActive && (
        <div style={{ background: 'rgba(0,0,0,0.015)' }}>
          {isLoading ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: 'var(--cui-secondary-color)' }}>Carregando...</div>
          ) : filhosAtivos.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: 'var(--cui-secondary-color)' }}>Nenhum assunto encontrado.</div>
          ) : (
            filhosAtivos.map(node => <TreeNode key={node.id} node={node} level={0} />)
          )}
        </div>
      )}
    </div>
  )
}

  // ── Render item recursivo (TreeNode) ───────────────────────────────────────
  const TreeNode = ({ node, level = 0 }) => {
    const isSelected = selected.includes(String(node.id))
    const isExpanded = expandedNodes.has(node.id)
    const paddingLeft = level * 16 + 12
    const temFilhos = node.tem_filhos
    const isLoading = loadingId === node.id

    return (
      <div key={node.id}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
            padding: `7px 12px 7px ${paddingLeft}px`,
            borderBottom: '1px solid var(--cui-border-color-translucent)',
            cursor: 'pointer',
            background: isSelected ? 'rgba(79,142,247,0.07)' : 'transparent',
            transition: 'background 0.15s',
            position: 'relative',
          }}
          onClick={() => toggleItem(node.id)}
        >
          {/* Seta de expansão */}
          {temFilhos ? (
            <button
              onClick={(e) => toggleExpand(e, node)}
              style={{
                background: 'transparent', border: 'none', padding: '0 4px',
                cursor: 'pointer', color: 'var(--cui-secondary-color)',
                fontSize: 10, outline: 'none', marginTop: 3, flexShrink: 0
              }}
            >
              {isLoading ? '⏳' : isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <div style={{ width: 15, flexShrink: 0 }} />
          )}

          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); toggleItem(node.id) }}
            style={{ width: 14, height: 14, accentColor: '#4f8ef7', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
          />
          <span style={{
            fontSize: 13,
            color: 'var(--cui-body-color)',
            lineHeight: 1.4,
            wordBreak: 'break-word',
            flex: 1,
          }}>
            {node.indice && (
              <span style={{ color: '#4f8ef7', fontWeight: 700, marginRight: 5, fontSize: 11, fontFamily: 'monospace' }}>
                {formatIndice(node.indice)}
              </span>
            )}
            {node.nome}
          </span>
          {node.total_questoes > 0 && (
            <span style={{ fontSize: 11, color: '#888', flexShrink: 0, marginTop: 2 }}>
              {node.total_questoes}Q
            </span>
          )}
        </div>
        
        {isExpanded && filhosCache[node.id] && (
          <div style={{ background: 'rgba(0,0,0,0.015)' }}>
            {filhosCache[node.id].map(f => <TreeNode key={f.id} node={f} level={level + 1} />)}
          </div>
        )}
      </div>
    )
  }

  // ── Filhos ordenados da disciplina ativa ─────────────────────────────────────
  const filhosAtivos = useMemo(() => {
    if (!activeRootId) return []
    return (filhosCache[activeRootId] || []).sort(
      (a, b) =>
        (a.indice || '').localeCompare(b.indice || '', undefined, { numeric: true }) ||
        a.nome.localeCompare(b.nome)
    )
  }, [filhosCache, activeRootId])

  // ── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <div ref={ref} style={{ position: 'relative' }}>

      {/* Botão trigger */}
      <button
        type="button"
        className="btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center"
        onClick={() => setOpen(o => !o)}
        style={{ textAlign: 'left', overflow: 'hidden', height: 38 }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {selected.length > 0 && (
            <span
              role="button"
              title="Limpar seleção"
              onClick={(e) => { e.stopPropagation(); onChange([]) }}
              style={{ fontSize: 14, color: '#888', lineHeight: 1, cursor: 'pointer', padding: '0 2px' }}
            >
              ×
            </span>
          )}
          <span style={{ fontSize: 12 }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          zIndex: 1050,
          width: 520,
          maxWidth: 'calc(100vw - 32px)',
          top: '100%',
          left: 0,
          marginTop: 4,
          background: 'var(--cui-body-bg)',
          border: '1px solid var(--cui-border-color)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 460,
          overflow: 'hidden',
        }}>

          {/* Busca */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--cui-border-color)' }}>
            <input
              type="text"
              placeholder="Buscar disciplina..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{
                width: '100%',
                fontSize: 13,
                padding: '5px 10px',
                border: '1px solid var(--cui-border-color)',
                borderRadius: 6,
                background: 'var(--cui-body-bg)',
                color: 'var(--cui-body-color)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Corpo do Menu (Coluna Única) */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {raizes.length === 0
                ? <div style={{ padding: 16, fontSize: 13, color: 'var(--cui-secondary-color)', textAlign: 'center' }}>Nenhuma disciplina encontrada.</div>
                : raizes.map(renderRaiz)
              }
            </div>
          </div>

          {/* Rodapé com contador e ação */}
          {selected.length > 0 && (
            <div style={{
              padding: '6px 12px',
              borderTop: '1px solid var(--cui-border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--cui-tertiary-bg)',
              fontSize: 12,
            }}>
              <span style={{ color: 'var(--cui-secondary-color)' }}>
                {selected.length} {selected.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-link p-0"
                style={{ fontSize: 12, color: '#dc3545', textDecoration: 'none' }}
                onClick={() => onChange([])}
              >
                Limpar tudo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MateriaMultiSelect