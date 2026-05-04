import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { API_URL } from '../config'

const MateriaMultiSelect = ({ materias, selected, onChange, esconderVazias = true }) => {
  const [open, setOpen] = useState(false)
  const [activeRootId, setActiveRootId] = useState(null)
  const [filhosCache, setFilhosCache] = useState({})
  const [loadingId, setLoadingId] = useState(null)
  const [busca, setBusca] = useState('')
  const ref = useRef(null)

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

  // Toggle de raiz: carrega filhos se necessário, depois seleciona/deseleciona todos
  const toggleRaiz = useCallback(async (raiz) => {
    const s = String(raiz.id)
    const filhos = filhosCache[raiz.id]
    const isSelected = selected.includes(s)

    // Se filhos ainda não foram carregados, carrega antes de selecionar
    if (!filhos) {
      setLoadingId(raiz.id)
      try {
        const res = await fetch(`${API_URL}/api/admin/materias/${raiz.id}/filhos?esconder_vazias=${esconderVazias}`)
        const data = await res.json()
        const loaded = Array.isArray(data) ? data : []
        setFilhosCache(prev => ({ ...prev, [raiz.id]: loaded }))
        const filhosIds = loaded.map(f => String(f.id))
        onChange(isSelected
          ? selected.filter(x => x !== s && !filhosIds.includes(x))
          : [...new Set([...selected, s, ...filhosIds])]
        )
      } catch {
        setFilhosCache(prev => ({ ...prev, [raiz.id]: [] }))
        toggleItem(raiz.id)
      }
      setLoadingId(null)
      return
    }

    const filhosIds = filhos.map(f => String(f.id))
    onChange(isSelected
      ? selected.filter(x => x !== s && !filhosIds.includes(x))
      : [...new Set([...selected, s, ...filhosIds])]
    )
  }, [filhosCache, selected, onChange, toggleItem, esconderVazias])

  // Quantos filhos de uma raiz estão selecionados
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
              {raiz.indice}
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

        <span style={{ fontSize: 12, color: 'var(--cui-secondary-color)', flexShrink: 0 }}>
          {isLoading ? '⏳' : '›'}
        </span>
      </div>
    )
  }

  // ── Render item filho ────────────────────────────────────────────────────────
  const renderFilho = (filho) => {
    const isSelected = selected.includes(String(filho.id))
    const level = filho.indice ? (filho.indice.split('.').length - 1) : 0
    const paddingLeft = level * 20 + 12

    return (
      <div
        key={filho.id}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: `7px 12px 7px ${paddingLeft}px`,
          borderBottom: '1px solid var(--cui-border-color-translucent)',
          cursor: 'pointer',
          background: isSelected ? 'rgba(79,142,247,0.07)' : 'transparent',
          transition: 'background 0.15s',
          position: 'relative',
        }}
        onClick={() => toggleItem(filho.id)}
      >
        {/* Conector "L" */}
        {level > 0 && (
          <div style={{
            position: 'absolute',
            left: paddingLeft - 14,
            top: 0,
            bottom: '50%',
            width: 10,
            borderLeft: '1.5px solid #cbd5e1',
            borderBottom: '1.5px solid #cbd5e1',
            borderBottomLeftRadius: 3,
          }} />
        )}

        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => { e.stopPropagation(); toggleItem(filho.id) }}
          style={{ width: 14, height: 14, accentColor: '#4f8ef7', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
        />
        <span style={{
          fontSize: 13,
          fontWeight: level === 0 ? 600 : 400,
          color: 'var(--cui-body-color)',
          lineHeight: 1.4,
          wordBreak: 'break-word',
          flex: 1,
        }}>
          {filho.indice && (
            <span style={{ color: '#4f8ef7', fontWeight: 700, marginRight: 5, fontSize: 11, fontFamily: 'monospace' }}>
              {filho.indice}
            </span>
          )}
          {filho.nome}
        </span>
        {filho.total_questoes > 0 && (
          <span style={{ fontSize: 11, color: '#888', flexShrink: 0, marginTop: 2 }}>
            {filho.total_questoes}Q
          </span>
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

          {/* Colunas */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

            {/* Coluna 1: Disciplinas */}
            <div style={{
              width: '42%',
              borderRight: '1px solid var(--cui-border-color)',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--cui-tertiary-bg)',
            }}>
              <div style={{
                padding: '6px 12px',
                borderBottom: '1px solid var(--cui-border-color)',
                fontSize: 11,
                fontWeight: 700,
                textAlign: 'center',
                background: 'var(--cui-light)',
                color: 'var(--cui-secondary-color)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Disciplinas
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {raizes.length === 0
                  ? <div style={{ padding: 16, fontSize: 13, color: 'var(--cui-secondary-color)', textAlign: 'center' }}>Nenhuma disciplina encontrada.</div>
                  : raizes.map(renderRaiz)
                }
              </div>
            </div>

            {/* Coluna 2: Assuntos */}
            <div style={{ width: '58%', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                padding: '6px 12px',
                borderBottom: '1px solid var(--cui-border-color)',
                fontSize: 11,
                fontWeight: 700,
                textAlign: 'center',
                background: 'var(--cui-light)',
                color: 'var(--cui-secondary-color)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Assuntos
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {!activeRootId ? (
                  <div style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                    fontSize: 13,
                    color: 'var(--cui-secondary-color)',
                    textAlign: 'center',
                  }}>
                    Selecione uma disciplina ao lado para ver os assuntos.
                  </div>
                ) : loadingId === activeRootId ? (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--cui-secondary-color)' }}>
                    Carregando...
                  </div>
                ) : filhosAtivos.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--cui-secondary-color)' }}>
                    Nenhum assunto encontrado.
                  </div>
                ) : (
                  filhosAtivos.map(renderFilho)
                )}
              </div>
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