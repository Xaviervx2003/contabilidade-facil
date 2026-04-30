import React, { useState, useEffect, useMemo, useRef } from 'react'
import { API_URL } from '../config'

/* ─── Componente de dropdown em ÁRVORE (Tree Select) ─────────────────────────── */

const MateriaMultiSelect = ({ materias, selected, onChange, esconderVazias = true }) => {
  const [open, setOpen] = useState(false)
  const [activeRootId, setActiveRootId] = useState(null)
  const [filhosCache, setFilhosCache] = useState({}) 
  const [loadingId, setLoadingId] = useState(null)
  const [busca, setBusca] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 1. Filtra as Raízes (Disciplinas)
  const raizes = useMemo(() => {
    return materias
      .filter(m => !m.parent_id)
      .filter(m => !esconderVazias || m.total_questoes > 0 || m.tem_filhos)
      .sort((a, b) => (a.indice || '').localeCompare(b.indice || '', undefined, { numeric: true }) || a.nome.localeCompare(b.nome))
  }, [materias, esconderVazias])

  // Carrega filhos quando uma raiz é selecionada (ou foca nela)
  const loadFilhos = async (parentId) => {
    setActiveRootId(parentId)
    if (!filhosCache[parentId]) {
      setLoadingId(parentId)
      try {
        const res = await fetch(`${API_URL}/api/admin/materias/${parentId}/filhos?esconder_vazias=${esconderVazias}`)
        const data = await res.json()
        setFilhosCache(prev => ({ ...prev, [parentId]: Array.isArray(data) ? data : [] }))
      } catch {
        setFilhosCache(prev => ({ ...prev, [parentId]: [] }))
      }
      setLoadingId(null)
    }
  }

  const toggle = (id, recursively = false) => {
    const s = String(id)
    const isSelected = selected.includes(s)
    
    let newSelected = isSelected ? selected.filter(x => x !== s) : [...selected, s]

    // Lógica Gran Cursos: Selecionar filhos se clicar no pai
    if (recursively && filhosCache[id]) {
      const filhosIds = filhosCache[id].map(f => String(f.id))
      if (isSelected) {
        // Desmarcar todos os filhos
        newSelected = newSelected.filter(x => !filhosIds.includes(x))
      } else {
        // Marcar todos os filhos que ainda não estão marcados
        const aAdicionar = filhosIds.filter(x => !newSelected.includes(x))
        newSelected = [...newSelected, ...aAdicionar]
      }
    }
    
    onChange(newSelected)
  }

  const label =
    selected.length === 0 ? 'Todas as disciplinas' :
      selected.length === 1 ? (materias.find(m => String(m.id) === selected[0])?.nome ?? '1 selecionada') :
        `${selected.length} selecionados`

  const renderSimpleItem = (item, isRoot = false) => {
    const isActive = activeRootId === item.id
    const isSelected = selected.includes(String(item.id))

    return (
      <div
        key={item.id}
        className="d-flex align-items-start gap-2 px-3 py-2"
        onClick={() => isRoot ? loadFilhos(item.id) : toggle(item.id)}
        style={{
          borderBottom: '1px solid var(--cui-border-color-translucent)',
          cursor: 'pointer',
          background: isActive ? 'rgba(79,142,247,0.12)' : isSelected ? 'rgba(79,142,247,0.05)' : 'transparent',
          transition: 'all 0.2s',
          position: 'relative'
        }}
      >
        <div className="pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); toggle(item.id, isRoot) }}
            style={{ width: 16, height: 16, accentColor: '#4f8ef7', cursor: 'pointer' }}
          />
        </div>
        <div className="flex-grow-1">
          <div style={{ 
            fontSize: 13, 
            fontWeight: isRoot ? 700 : 400, 
            color: 'var(--cui-body-color)',
            lineHeight: '1.4',
            wordBreak: 'break-word' // ✅ Garante que o texto apareça todo
          }}>
            {item.indice && (
              <span style={{ 
                color: '#4f8ef7', 
                fontWeight: 800, 
                marginRight: 6,
                fontSize: 12,
                fontFamily: 'monospace'
              }}>
                {item.indice}
              </span>
            )}
            {item.nome}
          </div>
        </div>
        {isRoot && (
          <div className="pt-1 text-primary fw-bold" style={{ fontSize: 11 }}>
            {item.total_questoes || 0} Q
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center"
        onClick={() => setOpen(o => !o)}
        style={{ textAlign: 'left', overflow: 'hidden', height: 38 }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{label}</span>
        <span className="ms-2 flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', zIndex: 1050, width: '500px', top: '100%', left: 0, marginTop: 4,
          background: 'var(--cui-body-bg)', border: '1px solid var(--cui-border-color)',
          borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          display: 'flex', height: 400, overflow: 'hidden'
        }}>
          {/* Coluna 1: Disciplinas */}
          <div style={{ width: '40%', borderRight: '1px solid var(--cui-border-color)', display: 'flex', flexDirection: 'column', background: 'var(--cui-tertiary-bg)' }}>
            <div className="p-2 border-bottom small fw-bold text-center bg-light">Disciplinas</div>
            <div style={{ overflowY: 'auto', flexGrow: 1 }}>
              {raizes.map(r => renderSimpleItem(r, true))}
            </div>
          </div>

          {/* Coluna 2: Assuntos */}
          <div style={{ width: '60%', display: 'flex', flexDirection: 'column' }}>
            <div className="p-2 border-bottom small fw-bold text-center bg-light">Assuntos</div>
            <div style={{ overflowY: 'auto', flexGrow: 1 }}>
              {!activeRootId ? (
                <div className="h-100 d-flex align-items-center justify-content-center text-muted small p-4 text-center">
                  Selecione uma disciplina ao lado para ver os assuntos.
                </div>
              ) : loadingId === activeRootId ? (
                <div className="p-4 text-center">⏳ Carregando...</div>
              ) : (filhosCache[activeRootId] || []).length === 0 ? (
                <div className="p-4 text-center text-muted small">Nenhum assunto encontrado.</div>
              ) : (
                filhosCache[activeRootId]
                  .sort((a, b) => (a.indice || '').localeCompare(b.indice || '', undefined, { numeric: true }) || a.nome.localeCompare(b.nome))
                  .map(f => renderSimpleItem(f, false))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MateriaMultiSelect
