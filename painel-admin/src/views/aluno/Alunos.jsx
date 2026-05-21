/**
 * Desempenho dos Alunos — Modo Airbnb Premium
 * Painel operacional individual com cards expandíveis, filtros de risco e paginação circular.
 */
import React, { useEffect, useState, useCallback } from 'react'
import { CAlert, CSpinner } from '@coreui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { API_URL } from '../../config'
import { tokens, alpha, acertoColor } from '../../components/abnb/Tokens'
import { AirbnbProgress, SkeletonBlock } from '../../components/abnb/Cards'

/* ── helpers ──────────────────────────────────────────────────── */
const formatarTempo = (segundos) => {
  if (!segundos || segundos <= 0) return '—'
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/* ── Paginação Circular Premium ──────────────────────────────── */
const PaginacaoPremium = ({ paginaAtual, totalPaginas, onChange }) => {
  if (totalPaginas <= 1) return null

  // Gera range de páginas visíveis (max 5 em volta da atual)
  const getPages = () => {
    if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1)
    const pages = []
    const delta = 2
    const left = Math.max(2, paginaAtual - delta)
    const right = Math.min(totalPaginas - 1, paginaAtual + delta)
    pages.push(1)
    if (left > 2) pages.push('...')
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPaginas - 1) pages.push('...')
    pages.push(totalPaginas)
    return pages
  }

  const btnBase = {
    width: 38, height: 38, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
    border: 'none', transition: 'all 0.18s ease',
  }

  const btnAtivo = {
    ...btnBase,
    background: tokens.rausch,
    color: '#fff',
    boxShadow: `0 4px 14px ${alpha(tokens.rausch, 0.45)}`,
    transform: 'scale(1.1)',
  }

  const btnNormal = {
    ...btnBase,
    background: 'var(--color-bg-elevated)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border)',
  }

  const btnNav = (disabled) => ({
    ...btnBase,
    background: disabled ? 'var(--color-bg-tertiary)' : 'var(--color-bg-elevated)',
    color: disabled ? tokens.swiss : tokens.foggy,
    border: '1px solid var(--color-border)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 32, padding: '12px 0' }}>
      {/* Botão Anterior */}
      <motion.button
        whileHover={paginaAtual > 1 ? { scale: 1.1 } : {}}
        whileTap={paginaAtual > 1 ? { scale: 0.95 } : {}}
        disabled={paginaAtual === 1}
        onClick={() => paginaAtual > 1 && onChange(paginaAtual - 1)}
        style={btnNav(paginaAtual === 1)}
        aria-label="Página anterior"
      >
        <Icon icon="solar:alt-arrow-left-bold" width="16" />
      </motion.button>

      {/* Páginas */}
      {getPages().map((page, idx) =>
        page === '...' ? (
          <span key={`dots-${idx}`} style={{ color: tokens.foggy, fontSize: 14, padding: '0 4px', userSelect: 'none' }}>
            ···
          </span>
        ) : (
          <motion.button
            key={page}
            whileHover={{ scale: page === paginaAtual ? 1.1 : 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onChange(page)}
            style={page === paginaAtual ? btnAtivo : btnNormal}
            aria-label={`Ir para página ${page}`}
            aria-current={page === paginaAtual ? 'page' : undefined}
          >
            {page}
          </motion.button>
        )
      )}

      {/* Botão Próximo */}
      <motion.button
        whileHover={paginaAtual < totalPaginas ? { scale: 1.1 } : {}}
        whileTap={paginaAtual < totalPaginas ? { scale: 0.95 } : {}}
        disabled={paginaAtual === totalPaginas}
        onClick={() => paginaAtual < totalPaginas && onChange(paginaAtual + 1)}
        style={btnNav(paginaAtual === totalPaginas)}
        aria-label="Próxima página"
      >
        <Icon icon="solar:alt-arrow-right-bold" width="16" />
      </motion.button>
    </div>
  )
}

/* ── AlunoCard Expandível ─────────────────────────────────────── */
const AlunoCard = ({ aluno, index }) => {
  const [aberto, setAberto] = useState(false)
  const media = aluno.media_numero || 0
  const color = acertoColor(media)
  const totalErros = Object.values(aluno.erros_por_materia || {}).reduce((s, d) => s + (d.erros || 0), 0)

  const statusLabel = media >= 70 ? 'Aprovado' : media >= 40 ? 'Atenção' : 'Crítico'
  const statusColor = media >= 70 ? tokens.babu : media >= 40 ? tokens.arches : tokens.rausch

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        marginBottom: 12,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
      }}
      whileHover={{ boxShadow: `0 4px 20px ${alpha(tokens.rausch, 0.08)}` }}
    >
      {/* Linha de destaque de cor superior */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${statusColor}, ${alpha(statusColor, 0.3)})` }} />

      {/* Cabeçalho do card (clicável) */}
      <div
        onClick={() => setAberto(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', cursor: 'pointer', userSelect: 'none' }}
      >
        {/* Avatar */}
        <div style={{
          width: 46, height: 46, borderRadius: 14,
          background: alpha(color, 0.12),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, flexShrink: 0,
        }}>
          <Icon icon="solar:user-bold-duotone" width="24" />
        </div>

        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {aluno.nome}
          </div>
          <div style={{ fontSize: 12, color: tokens.foggy, marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>Mat. {aluno.matricula}</span>
            <span>·</span>
            <span>{aluno.sessoes} sessões</span>
            <span>·</span>
            <span>{aluno.questoes} questões</span>
            {aluno.tempo_medio_segundos > 0 && (
              <>
                <span>·</span>
                <span>⏱ {formatarTempo(aluno.tempo_medio_segundos)}/sessão</span>
              </>
            )}
          </div>
        </div>

        {/* Métricas direita */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          {/* Badge de status */}
          <div style={{
            padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
            background: alpha(statusColor, 0.1), color: statusColor,
            border: `1px solid ${alpha(statusColor, 0.2)}`,
          }}>
            {statusLabel}
          </div>

          {/* Percentual */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 22, color, lineHeight: 1, letterSpacing: '-0.5px' }}>
              {media.toFixed(1)}%
            </div>
            {totalErros > 0 && (
              <div style={{ fontSize: 11, color: tokens.rausch, marginTop: 2 }}>
                {totalErros} erro{totalErros !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Chevron */}
          <motion.div animate={{ rotate: aberto ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <Icon icon="solar:alt-arrow-down-linear" width="18" style={{ color: tokens.foggy }} />
          </motion.div>
        </div>
      </div>

      {/* Conteúdo Expandível */}
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            key="detalhe"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid var(--color-border)', padding: '20px 22px' }}>
              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { icon: 'solar:target-bold-duotone', label: 'Precisão', value: `${media.toFixed(1)}%`, color },
                  { icon: 'solar:folder-check-bold-duotone', label: 'Sessões', value: aluno.sessoes, color: '#6366f1' },
                  { icon: 'solar:notes-bold-duotone', label: 'Questões', value: aluno.questoes, color: tokens.babu },
                  { icon: 'solar:clock-circle-bold-duotone', label: 'Tempo Médio', value: formatarTempo(aluno.tempo_medio_segundos), color: tokens.arches },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: 14, padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon icon={s.icon} width="16" style={{ color: s.color }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: tokens.foggy, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        {s.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Erros por matéria */}
              {Object.keys(aluno.erros_por_materia || {}).length > 0 ? (
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: tokens.foggy,
                    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <Icon icon="solar:danger-bold-duotone" width="14" style={{ color: tokens.rausch }} />
                    Gargalos por Matéria
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {Object.entries(aluno.erros_por_materia)
                      .sort(([, a], [, b]) => (b.erros / Math.max(b.total, 1)) - (a.erros / Math.max(a.total, 1)))
                      .map(([mat, d], i) => {
                        const pctErro = d.total > 0 ? (d.erros / d.total) * 100 : 0
                        const c = d.erros > 0 ? acertoColor(100 - pctErro) : tokens.babu
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{mat}</span>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {d.erros > 0 && (
                                  <span style={{ fontSize: 11, color: tokens.rausch, fontWeight: 600 }}>
                                    {d.erros} erro{d.erros !== 1 ? 's' : ''}
                                  </span>
                                )}
                                <span style={{ fontSize: 12, fontWeight: 700, color: c }}>
                                  {d.total} total
                                </span>
                              </div>
                            </div>
                            <AirbnbProgress
                              value={pctErro}
                              color={d.erros > 0 ? tokens.rausch : tokens.babu}
                            />
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: tokens.foggy, fontSize: 13, padding: '16px 0' }}>
                  <Icon icon="solar:check-circle-bold-duotone" width="24" style={{ color: tokens.babu, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  Nenhum histórico detalhado de erros disponível.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Componente Principal ─────────────────────────────────────── */
const Alunos = () => {
  const [listaAlunos, setListaAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [filtroRisco, setFiltroRisco] = useState('all')

  const carregarMetricas = useCallback(async (pagina) => {
    setLoading(true)
    setErro(null)
    try {
      const userId = sessionStorage.getItem('userId')
      const params = new URLSearchParams({ pagina: pagina.toString(), por_pagina: '20' })
      if (userId) params.append('usuario_id', userId)

      const res = await fetch(`${API_URL}/api/metricas-estudantes/desempenho?${params}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `Erro ${res.status} ao carregar métricas`)
      }
      const data = await res.json()
      const dados = data.estudantes || data.alunos || []
      setListaAlunos(Array.isArray(dados) ? dados : [])
      setTotalPaginas(data.total_paginas || 1)
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarMetricas(paginaAtual)
  }, [paginaAtual, carregarMetricas])

  // Filtra por risco localmente
  const alunosFiltrados = listaAlunos.filter(a => {
    if (filtroRisco === 'all') return true
    const m = a.media_numero || 0
    if (filtroRisco === 'alto') return m < 40
    if (filtroRisco === 'medio') return m >= 40 && m < 70
    return m >= 70  // baixo risco = bom desempenho
  })

  // Contagem por risco para badges
  const contagem = {
    all: listaAlunos.length,
    alto: listaAlunos.filter(a => (a.media_numero || 0) < 40).length,
    medio: listaAlunos.filter(a => { const m = a.media_numero || 0; return m >= 40 && m < 70 }).length,
    baixo: listaAlunos.filter(a => (a.media_numero || 0) >= 70).length,
  }

  const FILTROS = [
    { key: 'all', label: 'Todos', icon: 'solar:users-group-rounded-bold-duotone', color: tokens.foggy },
    { key: 'alto', label: 'Alto Risco', icon: 'solar:danger-bold-duotone', color: tokens.rausch },
    { key: 'medio', label: 'Atenção', icon: 'solar:fire-bold-duotone', color: tokens.arches },
    { key: 'baixo', label: 'Aprovados', icon: 'solar:check-circle-bold-duotone', color: tokens.babu },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', padding: '32px 16px 48px' }}>
      <style>{`@keyframes skshimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            Painel Operacional
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
            Desempenho dos Alunos
          </div>
          <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
            Diagnóstico individual de aproveitamento, sessões e gargalos de aprendizado.
          </div>
        </motion.div>

        {/* Filtros de risco */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 16, padding: '14px 18px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: tokens.foggy, textTransform: 'uppercase', letterSpacing: '0.6px', width: '100%', marginBottom: 4 }}>
            Filtrar por Risco na Página Atual
          </div>
          {FILTROS.map(f => (
            <motion.button
              key={f.key}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setFiltroRisco(f.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 99, cursor: 'pointer',
                fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
                border: filtroRisco === f.key ? `1.5px solid ${alpha(f.color, 0.5)}` : '1.5px solid var(--color-border)',
                background: filtroRisco === f.key ? alpha(f.color, 0.08) : 'transparent',
                color: filtroRisco === f.key ? f.color : tokens.foggy,
              }}
            >
              <Icon icon={f.icon} width="15" />
              {f.label}
              <span style={{
                marginLeft: 2, fontSize: 11, fontWeight: 800,
                background: filtroRisco === f.key ? alpha(f.color, 0.15) : 'var(--color-bg-tertiary)',
                color: filtroRisco === f.key ? f.color : tokens.foggy,
                padding: '1px 7px', borderRadius: 99,
              }}>
                {contagem[f.key]}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Erro */}
        {erro && (
          <CAlert color="danger" dismissible onClose={() => setErro(null)} style={{ borderRadius: 14, marginBottom: 20, fontSize: 14 }}>
            {erro}
          </CAlert>
        )}

        {/* Lista */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}>
                <SkeletonBlock h={82} r={20} />
              </motion.div>
            ))}
          </div>
        ) : alunosFiltrados.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: 'center', padding: '60px 20px',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 20,
            }}
          >
            <Icon icon="solar:users-group-rounded-bold-duotone" width="48" style={{ color: tokens.swiss, marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>
              Nenhum aluno encontrado
            </div>
            <div style={{ fontSize: 13, color: tokens.foggy }}>
              {filtroRisco === 'all'
                ? 'Nenhum estudante registrou sessões de teste no momento.'
                : `Nenhum aluno no filtro "${FILTROS.find(f => f.key === filtroRisco)?.label}" para esta página.`}
            </div>
          </motion.div>
        ) : (
          <div>
            {/* Info de contagem */}
            <div style={{ fontSize: 12, color: tokens.foggy, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon icon="solar:filter-bold-duotone" width="14" style={{ color: tokens.rausch }} />
              Exibindo <strong style={{ color: 'var(--color-text-primary)' }}>{alunosFiltrados.length}</strong> aluno{alunosFiltrados.length !== 1 ? 's' : ''}
              {filtroRisco !== 'all' && ` com filtro "${FILTROS.find(f => f.key === filtroRisco)?.label}"`}
            </div>

            {/* Cards dos alunos */}
            {alunosFiltrados.map((aluno, i) => (
              <AlunoCard key={aluno.matricula || i} aluno={aluno} index={i} />
            ))}

            {/* Paginação Premium */}
            <PaginacaoPremium
              paginaAtual={paginaAtual}
              totalPaginas={totalPaginas}
              onChange={(pg) => {
                setPaginaAtual(pg)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Alunos