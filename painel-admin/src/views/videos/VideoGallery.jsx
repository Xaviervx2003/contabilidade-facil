import React, {
  useEffect, useState, useMemo, useCallback, useRef, memo
} from 'react'
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CContainer,
  CFormSelect, CFormInput, CRow, CSpinner, CBadge, CAlert, CProgress,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch, cilX, cilList, cilGrid, cilMediaPlay,
  cilChevronRight, cilChevronLeft, cilCheck, cilPencil,
  cilFilter, cilSortAscending,
} from '@coreui/icons'
import { API_URL } from '../../config'
import { useTheme } from '../../context/themeContext'

/* ─── Helpers ─── */

// fetch com verificação de r.ok
const fetchJSON = async (url) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

// Extrair ID do YouTube de qualquer formato de URL
const extrairYouTubeId = (url) => {
  if (!url) return null
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

// Extrair ID do Vimeo
const extrairVimeoId = (url) => {
  if (!url) return null
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m ? m[1] : null
}

// Gerar URL de embed limpa (sem parâmetros extras)
const obterLinkEmbed = (url) => {
  if (!url) return null
  const ytId = extrairYouTubeId(url)
  if (ytId) return `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`
  const viId = extrairVimeoId(url)
  if (viId) return `https://player.vimeo.com/video/${viId}`
  return url
}

// Thumbnail estática do YouTube (sem carregar o iframe)
const obterThumbnail = (url) => {
  const ytId = extrairYouTubeId(url)
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
  return null
}

// Storage helpers com fallback silencioso
const ls = {
  get: (key, def = null) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)) } catch { }
  },
}

/* ─── Skeleton card ─── */
const SkeletonCard = ({ isDark }) => {
  const bg = isDark ? '#1a2535' : '#f1f3f5'
  const pulse = isDark ? '#253447' : '#e2e8f0'
  return (
    <CCol xs={12} md={6} xl={4} className="mb-4">
      <CCard className="h-100 border-0" style={{ background: isDark ? '#1a2535' : '#fff', borderRadius: 12 }}>
        <div style={{ width: '100%', paddingBottom: '56.25%', position: 'relative', background: bg, borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg,${bg} 25%,${pulse} 50%,${bg} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
        </div>
        <CCardBody>
          <div style={{ height: 12, width: '40%', background: bg, borderRadius: 6, marginBottom: 8, animation: 'shimmer 1.4s infinite', backgroundSize: '200% 100%', backgroundImage: `linear-gradient(90deg,${bg} 25%,${pulse} 50%,${bg} 75%)` }} />
          <div style={{ height: 14, width: '90%', background: bg, borderRadius: 6, marginBottom: 6, animation: 'shimmer 1.4s infinite 0.1s', backgroundSize: '200% 100%', backgroundImage: `linear-gradient(90deg,${bg} 25%,${pulse} 50%,${bg} 75%)` }} />
          <div style={{ height: 14, width: '70%', background: bg, borderRadius: 6, animation: 'shimmer 1.4s infinite 0.2s', backgroundSize: '200% 100%', backgroundImage: `linear-gradient(90deg,${bg} 25%,${pulse} 50%,${bg} 75%)` }} />
        </CCardBody>
      </CCard>
    </CCol>
  )
}

/* ─── VideoCard com lazy iframe + thumbnail + anotações ─── */
const VideoCard = memo(({ q, assistido, onMarcarAssistido, isDark, modoLista, materiaFiltro }) => {
  const [iframeAtivo, setIframeAtivo] = useState(false)
  const [anotacao, setAnotacao] = useState(() => ls.get(`nota:${q.id}`, ''))
  const [editandoNota, setEditandoNota] = useState(false)
  const cardRef = useRef(null)

  // IntersectionObserver — pré-aquece quando card fica visível, não carrega iframe ainda
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) obs.disconnect()
        // Não carrega iframe automaticamente — só ao clicar no play
      },
      { rootMargin: '200px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const salvarNota = useCallback(() => {
    ls.set(`nota:${q.id}`, anotacao)
    setEditandoNota(false)
  }, [q.id, anotacao])

  const thumbnail = obterThumbnail(q.link_video)
  const embedUrl = obterLinkEmbed(q.link_video)

  const bgCard = isDark ? '#1a2535' : '#ffffff'
  const borderCard = isDark ? '#2d3f52' : '#e2e8f0'

  // Montagem do assunto/matéria para o link do quiz
  const assuntoSlug = encodeURIComponent(q.assunto || '')
  const materiaParam = materiaFiltro ? `&materia_id=${materiaFiltro}` : ''

  if (modoLista) {
    // ─── MODO LISTA ───
    return (
      <div ref={cardRef} className="d-flex flex-column flex-md-row gap-3 p-3 mb-3" style={{
        background: bgCard,
        border: `1px solid ${assistido ? (isDark ? '#1a3d2b' : '#d1f0df') : borderCard}`,
        borderLeft: assistido ? '4px solid #2eb85c' : `4px solid ${isDark ? '#2d3f52' : '#e2e8f0'}`,
        borderRadius: 10,
        transition: 'border-color 0.2s',
      }}>
        {/* Thumbnail lista */}
        <div className="align-self-center align-self-md-start" style={{ width: '100%', maxWidth: '240px', flexShrink: 0, position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
          {iframeAtivo ? (
            <iframe
              src={embedUrl}
              title={`Vídeo ${q.id}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              style={{ width: '100%', aspectRatio: '16/9', border: 'none', display: 'block' }}
            />
          ) : (
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIframeAtivo(true)
                  if (!assistido) onMarcarAssistido(q.id)
                }
              }}
              onClick={() => { setIframeAtivo(true); if (!assistido) onMarcarAssistido(q.id) }}
              style={{ width: '100%', aspectRatio: '16/9', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
            >
              {thumbnail
                ? <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                : <div style={{ width: '100%', height: '100%', background: '#1a2535' }} />
              }
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CIcon icon={cilMediaPlay} style={{ color: '#e00', width: 16, height: 16 }} />
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Conteúdo lista */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <CBadge color="info">#{q.id}</CBadge>
            <CBadge color="secondary" style={{ fontWeight: 400 }}>{q.assunto || 'Geral'}</CBadge>
            {assistido && <CBadge color="success">✓ Assistido</CBadge>}
          </div>
          <p style={{ fontSize: 13, color: isDark ? '#e0e8f0' : '#1f2937', margin: '0 0 6px', lineHeight: 1.4, fontWeight: 500 }}>
            {q.question?.length > 120 ? q.question.substring(0, 120) + '…' : q.question}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!assistido && (
              <CButton size="sm" color="success" variant="outline" onClick={() => onMarcarAssistido(q.id)} style={{ fontSize: 11 }}>
                ✓ Marcar assistido
              </CButton>
            )}
            <CButton size="sm" color="primary" variant="outline" href={`#/quiz?busca=${q.id}${materiaParam}`} style={{ fontSize: 11 }}>
              Testar conhecimento →
            </CButton>
          </div>
        </div>
      </div>
    )
  }

  // ─── MODO GRADE ───
  return (
    <CCol xs={12} md={6} xl={4} className="mb-4">
      <div ref={cardRef} style={{
        background: bgCard,
        border: `1px solid ${assistido ? (isDark ? '#1a3d2b' : '#d1f0df') : borderCard}`,
        borderTop: assistido ? '3px solid #2eb85c' : `3px solid ${isDark ? '#2d3f52' : '#e2e8f0'}`,
        borderRadius: 12, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
      >
        {/* Thumbnail / iframe */}
        <div style={{ width: '100%', paddingBottom: '56.25%', position: 'relative', background: '#000', flexShrink: 0 }}>
          {iframeAtivo ? (
            <iframe
              src={embedUrl}
              title={`Vídeo ${q.id}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIframeAtivo(true)
                  if (!assistido) onMarcarAssistido(q.id)
                }
              }}
              onClick={() => { setIframeAtivo(true); if (!assistido) onMarcarAssistido(q.id) }}
              style={{ position: 'absolute', inset: 0, cursor: 'pointer' }}
            >
              {thumbnail
                ? <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                : <div style={{ width: '100%', height: '100%', background: isDark ? '#253447' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CIcon icon={cilMediaPlay} style={{ color: isDark ? '#5d7290' : '#94a3b8', width: 32, height: 32 }} />
                </div>
              }
              {/* Overlay play */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', transition: 'background 0.2s' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                  <CIcon icon={cilMediaPlay} style={{ color: '#e00', width: 22, height: 22, marginLeft: 3 }} />
                </div>
              </div>
              {/* Badge assistido */}
              {assistido && (
                <div style={{ position: 'absolute', top: 8, right: 8, background: '#2eb85c', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                  ✓ Assistido
                </div>
              )}
            </div>
          )}
        </div>

        {/* Corpo do card */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <CBadge color="info" style={{ fontSize: 10 }}>#{q.id}</CBadge>
            <CBadge color="secondary" style={{ fontSize: 10, fontWeight: 400 }}>{q.assunto || 'Geral'}</CBadge>
          </div>
          <p style={{ fontSize: 13, color: isDark ? '#e0e8f0' : '#1f2937', margin: '0 0 8px', lineHeight: 1.45, fontWeight: 500, flex: 1 }}>
            {q.question?.length > 100 ? q.question.substring(0, 100) + '…' : q.question}
          </p>
          {q.explicacao && (
            <p style={{ fontSize: 11, color: isDark ? '#5d7290' : '#94a3b8', margin: '0 0 10px', fontStyle: 'italic' }}>
              {q.explicacao.substring(0, 70)}…
            </p>
          )}

          {/* Anotações */}
          <div style={{ borderTop: `1px solid ${isDark ? '#2d3f52' : '#f0f4f8'}`, paddingTop: 10, marginTop: 'auto' }}>
            {editandoNota ? (
              <div>
                <textarea
                  value={anotacao}
                  onChange={e => setAnotacao(e.target.value)}
                  placeholder="Suas anotações sobre este vídeo..."
                  rows={3}
                  style={{
                    width: '100%', fontSize: 12, borderRadius: 6,
                    border: `1px solid ${isDark ? '#2d3f52' : '#d1d5db'}`,
                    background: isDark ? '#111b27' : '#f9fafb',
                    color: isDark ? '#e0e8f0' : '#1f2937',
                    padding: '6px 8px', resize: 'vertical', outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <CButton size="sm" color="success" onClick={salvarNota} style={{ fontSize: 11 }}>Salvar</CButton>
                  <CButton size="sm" color="secondary" variant="outline" onClick={() => setEditandoNota(false)} style={{ fontSize: 11 }}>Cancelar</CButton>
                </div>
              </div>
            ) : (
              <div>
                {anotacao ? (
                  <p style={{ fontSize: 11, color: isDark ? '#7eb8f7' : '#2563eb', margin: '0 0 6px', fontStyle: 'italic', lineHeight: 1.4 }}>
                    📝 {anotacao.length > 80 ? anotacao.substring(0, 80) + '…' : anotacao}
                  </p>
                ) : null}
                <div style={{ display: 'flex', gap: 6 }}>
                  <CButton size="sm" color="secondary" variant="outline" onClick={() => setEditandoNota(true)} style={{ fontSize: 11, flex: 1 }}>
                    <CIcon icon={cilPencil} style={{ width: 12, height: 12, marginRight: 4 }} />
                    {anotacao ? 'Editar nota' : 'Anotar'}
                  </CButton>
                  <CButton size="sm" color="primary" variant="outline" href={`#/quiz?busca=${q.id}${materiaParam}`} style={{ fontSize: 11, flex: 1 }}>
                    Testar →
                  </CButton>
                </div>
                {!assistido && (
                  <CButton size="sm" color="success" variant="ghost" className="w-100 mt-2" onClick={() => onMarcarAssistido(q.id)} style={{ fontSize: 11 }}>
                    ✓ Marcar como assistido
                  </CButton>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </CCol>
  )
})

/* ─── Modo Playlist ─── */
const ModoPlaylist = ({ questoes, isDark, onFechar }) => {
  const [idx, setIdx] = useState(0)
  const q = questoes[idx]
  if (!q) return null
  const bg = isDark ? '#111b27' : '#f4f7fa'
  const card = isDark ? '#1a2535' : '#fff'
  const border = isDark ? '#2d3f52' : '#e2e8f0'

  return (
    <div style={{ background: bg, borderRadius: 12, padding: 20, marginBottom: 24, border: `1px solid ${border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: isDark ? '#7eb8f7' : '#1a6fb5', fontWeight: 700 }}>
          🎬 Modo Playlist — {idx + 1} / {questoes.length}
        </span>
        <CButton size="sm" color="secondary" variant="outline" onClick={onFechar} style={{ fontSize: 11 }}>
          <CIcon icon={cilX} style={{ width: 12, height: 12 }} /> Sair
        </CButton>
      </div>
      <CProgress value={((idx + 1) / questoes.length) * 100} color="primary" height={4} className="mb-3 rounded-pill" />
      <div style={{ background: '#000', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
        <iframe
          key={q.id}
          src={obterLinkEmbed(q.link_video)}
          title={`Playlist ${idx + 1}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          style={{ width: '100%', aspectRatio: '16/9', border: 'none', display: 'block' }}
        />
      </div>
      <p style={{ fontSize: 13, color: isDark ? '#e0e8f0' : '#1f2937', margin: '0 0 12px', fontWeight: 500 }}>
        {q.question?.length > 120 ? q.question.substring(0, 120) + '…' : q.question}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <CButton size="sm" color="secondary" variant="outline" disabled={idx === 0} onClick={() => setIdx(i => i - 1)} style={{ flex: 1 }}>
          <CIcon icon={cilChevronLeft} style={{ width: 14, height: 14 }} /> Anterior
        </CButton>
        <CButton size="sm" color="primary" disabled={idx === questoes.length - 1} onClick={() => setIdx(i => i + 1)} style={{ flex: 1 }}>
          Próximo <CIcon icon={cilChevronRight} style={{ width: 14, height: 14 }} />
        </CButton>
      </div>
    </div>
  )
}

/* ─── Componente Principal ─── */
const VideoGallery = () => {
  const [questoesComVideo, setQuestoesComVideo] = useState([])
  const [materias, setMaterias] = useState([])
  const [materiaFiltro, setMateriaFiltro] = useState('')
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState('padrao')
  const [modoVis, setModoVis] = useState('grade') // 'grade' | 'lista'
  const [modoPlaylist, setModoPlaylist] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assistidos, setAssistidos] = useState(() => ls.get('videosAssistidos', []))
  const [desempenhoBaixo, setDesempenhoBaixo] = useState([]) // assuntos com acerto < 60%

  const { isDark } = useTheme()
  const matricula = sessionStorage.getItem('matricula')

  // Persistir assistidos
  useEffect(() => { ls.set('videosAssistidos', assistidos) }, [assistidos])

  const marcarAssistido = useCallback((id) => {
    setAssistidos(prev => prev.includes(id) ? prev : [...prev, id])
    // Registrar no backend (analytics) — fire and forget
    if (matricula) {
      fetch(`${API_URL}/api/aluno/video-assistido/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula }),
      }).catch(() => { })
    }
  }, [matricula])

  const carregarDados = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Carregar em paralelo: matérias + questões + desempenho do aluno
      const promises = [
        fetchJSON(`${API_URL}/api/admin/materias`),
        fetchJSON(`${API_URL}/api/questoes`),
      ]
      if (matricula) {
        promises.push(
          fetchJSON(`${API_URL}/api/aluno/historico-grafico/${matricula}`).catch(() => null)
        )
      }
      const [dataMat, dataQuest, dataHistorico] = await Promise.all(promises)

      setMaterias(Array.isArray(dataMat) ? dataMat : [])

      const filtradas = (Array.isArray(dataQuest) ? dataQuest : [])
        .filter(q => q.link_video && q.link_video.trim() !== '')
      setQuestoesComVideo(filtradas)

      // Extrair assuntos fracos do histórico
      if (dataHistorico?.por_assunto) {
        const fracos = dataHistorico.por_assunto
          .filter(a => a.media_acerto < 60)
          .map(a => a.assunto.toLowerCase())
        setDesempenhoBaixo(fracos)
      }
    } catch (err) {
      setError('Erro ao carregar os vídeos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [matricula])

  useEffect(() => { carregarDados() }, [carregarDados])

  // Contador de vídeos por matéria (para mostrar no select)
  const countPorMateria = useMemo(() => {
    const m = {}
    questoesComVideo.forEach(q => {
      if (q.materia_ids) {
        q.materia_ids.forEach(id => { m[id] = (m[id] || 0) + 1 })
      }
    })
    return m
  }, [questoesComVideo])

  // Filtro + busca + ordenação — tudo em um useMemo para evitar loops
  const questoesExibidas = useMemo(() => {
    let lista = [...questoesComVideo]

    // Filtro de matéria
    if (materiaFiltro) {
      lista = lista.filter(q => q.materia_ids?.includes(parseInt(materiaFiltro)))
    }

    // Busca por texto
    if (busca.trim()) {
      const termo = busca.toLowerCase()
      lista = lista.filter(q =>
        q.question?.toLowerCase().includes(termo) ||
        q.assunto?.toLowerCase().includes(termo)
      )
    }

    // Ordenação
    if (ordenacao === 'naoAssistidos') {
      lista.sort((a, b) => {
        const aA = assistidos.includes(a.id)
        const bA = assistidos.includes(b.id)
        return aA === bA ? 0 : aA ? 1 : -1
      })
    } else if (ordenacao === 'assistidos') {
      lista.sort((a, b) => {
        const aA = assistidos.includes(a.id)
        const bA = assistidos.includes(b.id)
        return aA === bA ? 0 : aA ? -1 : 1
      })
    } else if (ordenacao === 'az') {
      lista.sort((a, b) => (a.assunto || '').localeCompare(b.assunto || ''))
    }

    return lista
  }, [questoesComVideo, materiaFiltro, busca, ordenacao, assistidos])

  // Vídeos recomendados (assuntos com desempenho baixo)
  const questoesRecomendadas = useMemo(() => {
    if (!desempenhoBaixo.length) return []
    return questoesComVideo.filter(q =>
      q.assunto && desempenhoBaixo.some(a => q.assunto.toLowerCase().includes(a))
    ).slice(0, 3)
  }, [questoesComVideo, desempenhoBaixo])

  const totalAssistidos = assistidos.filter(id => questoesComVideo.some(q => q.id === id)).length
  const percentualAssistido = questoesComVideo.length > 0
    ? Math.round((totalAssistidos / questoesComVideo.length) * 100)
    : 0

  const bgPage = isDark ? '#111b27' : '#f4f7fa'
  const bgCard = isDark ? '#1a2535' : '#ffffff'
  const borderCard = isDark ? '#2d3f52' : '#e2e8f0'

  return (
    <div style={{ background: bgPage, minHeight: '100vh', padding: '24px' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* Cabeçalho + Progresso */}
      <div style={{ background: bgCard, border: `1px solid ${borderCard}`, borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ color: isDark ? '#7eb8f7' : '#1a6fb5', fontWeight: 800, margin: 0, fontSize: 20 }}>
              Portal de Vídeo-Aulas
            </h3>
            <p style={{ color: isDark ? '#5d7290' : '#64748b', margin: '4px 0 0', fontSize: 13 }}>
              {questoesComVideo.length} vídeos disponíveis · {totalAssistidos} assistidos
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Toggle modo visualização */}
            <div style={{ display: 'flex', border: `1px solid ${borderCard}`, borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => setModoVis('grade')} style={{
                padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 12,
                background: modoVis === 'grade' ? (isDark ? '#2d3f52' : '#e2e8f0') : 'transparent',
                color: isDark ? '#e0e8f0' : '#1f2937',
              }}>
                <CIcon icon={cilGrid} style={{ width: 14, height: 14 }} />
              </button>
              <button onClick={() => setModoVis('lista')} style={{
                padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 12,
                background: modoVis === 'lista' ? (isDark ? '#2d3f52' : '#e2e8f0') : 'transparent',
                color: isDark ? '#e0e8f0' : '#1f2937',
              }}>
                <CIcon icon={cilList} style={{ width: 14, height: 14 }} />
              </button>
            </div>
            {questoesExibidas.length > 0 && (
              <CButton size="sm" color={modoPlaylist ? 'warning' : 'primary'} variant="outline"
                onClick={() => setModoPlaylist(v => !v)} style={{ fontSize: 12 }}>
                {modoPlaylist ? '✕ Fechar Playlist' : '▶ Playlist'}
              </CButton>
            )}
          </div>
        </div>

        {/* Barra de progresso geral */}
        {questoesComVideo.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: isDark ? '#5d7290' : '#94a3b8', marginBottom: 4 }}>
              <span>Progresso da galeria</span>
              <span>{percentualAssistido}%</span>
            </div>
            <CProgress value={percentualAssistido} color="success" height={8} className="rounded-pill" />
          </div>
        )}
      </div>

      {/* Recomendações por desempenho */}
      {questoesRecomendadas.length > 0 && !loading && (
        <div style={{
          background: isDark ? '#1e1520' : '#fff5f5',
          border: `1px solid ${isDark ? '#3d2020' : '#fecaca'}`,
          borderLeft: '4px solid #e55353',
          borderRadius: 10, padding: '14px 16px', marginBottom: 20,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#e55353', margin: '0 0 10px' }}>
            🎯 Assista agora — seus pontos fracos
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {questoesRecomendadas.map(q => (
              <div key={q.id} style={{
                background: isDark ? '#1a2535' : '#fff',
                border: `1px solid ${isDark ? '#3d2020' : '#fecaca'}`,
                borderRadius: 8, padding: '8px 12px', flex: '1 1 200px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}>
                <span style={{ fontSize: 12, color: isDark ? '#e0e8f0' : '#1f2937', fontWeight: 500 }}>
                  {q.assunto || `Questão #${q.id}`}
                </span>
                <CButton size="sm" color="danger" variant="outline" href={`#`}
                  onClick={() => document.getElementById(`video-${q.id}`)?.scrollIntoView({ behavior: 'smooth' })}
                  style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                  Ver vídeo
                </CButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: bgCard, border: `1px solid ${borderCard}`, borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Busca */}
          <div style={{ flex: '2 1 200px' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#5d7290' : '#94a3b8', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Buscar
            </label>
            <div style={{ position: 'relative' }}>
              <CIcon icon={cilSearch} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: isDark ? '#5d7290' : '#94a3b8' }} />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por assunto ou enunciado..."
                style={{
                  width: '100%', paddingLeft: 32, paddingRight: busca ? 32 : 10,
                  height: 36, borderRadius: 8, fontSize: 13,
                  border: `1px solid ${isDark ? '#2d3f52' : '#d1d5db'}`,
                  background: isDark ? '#111b27' : '#fff',
                  color: isDark ? '#e0e8f0' : '#1f2937', outline: 'none',
                }}
              />
              {busca && (
                <button onClick={() => setBusca('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  color: isDark ? '#5d7290' : '#94a3b8',
                }}>
                  <CIcon icon={cilX} style={{ width: 12, height: 12 }} />
                </button>
              )}
            </div>
          </div>

          {/* Filtro matéria */}
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#5d7290' : '#94a3b8', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Matéria
            </label>
            <CFormSelect value={materiaFiltro} onChange={e => setMateriaFiltro(e.target.value)} style={{ height: 36, fontSize: 13 }}>
              <option value="">Todas ({questoesComVideo.length})</option>
              {materias.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nome} {countPorMateria[m.id] ? `(${countPorMateria[m.id]})` : ''}
                </option>
              ))}
            </CFormSelect>
          </div>

          {/* Ordenação */}
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#5d7290' : '#94a3b8', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ordenar por
            </label>
            <CFormSelect value={ordenacao} onChange={e => setOrdenacao(e.target.value)} style={{ height: 36, fontSize: 13 }}>
              <option value="padrao">Padrão</option>
              <option value="naoAssistidos">Não assistidos primeiro</option>
              <option value="assistidos">Assistidos primeiro</option>
              <option value="az">A → Z (assunto)</option>
            </CFormSelect>
          </div>

          {/* Limpar */}
          {(busca || materiaFiltro || ordenacao !== 'padrao') && (
            <CButton size="sm" color="secondary" variant="outline"
              onClick={() => { setBusca(''); setMateriaFiltro(''); setOrdenacao('padrao') }}
              style={{ height: 36, fontSize: 12, alignSelf: 'flex-end' }}>
              <CIcon icon={cilX} style={{ width: 12, height: 12, marginRight: 4 }} /> Limpar
            </CButton>
          )}
        </div>

        {/* Resultado da busca */}
        {(busca || materiaFiltro) && !loading && (
          <p style={{ fontSize: 12, color: isDark ? '#5d7290' : '#94a3b8', marginTop: 8, marginBottom: 0 }}>
            {questoesExibidas.length} resultado{questoesExibidas.length !== 1 ? 's' : ''} encontrado{questoesExibidas.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {error && <CAlert color="danger" className="mb-3">{error}</CAlert>}

      {/* Modo Playlist */}
      {modoPlaylist && questoesExibidas.length > 0 && (
        <ModoPlaylist questoes={questoesExibidas} isDark={isDark} onFechar={() => setModoPlaylist(false)} />
      )}

      {/* Grid / Lista */}
      {loading ? (
        <CRow>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} isDark={isDark} />)}
        </CRow>
      ) : questoesExibidas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: bgCard, borderRadius: 12, border: `1px solid ${borderCard}` }}>
          <p style={{ fontSize: 32, margin: '0 0 12px' }}>🎬</p>
          <h5 style={{ color: isDark ? '#e0e8f0' : '#1f2937', marginBottom: 8 }}>Nenhum vídeo encontrado</h5>
          <p style={{ color: isDark ? '#5d7290' : '#94a3b8', fontSize: 13, marginBottom: 16 }}>
            {busca ? `Sem resultados para "${busca}"` : 'Nenhum vídeo para este filtro.'}
          </p>
          <CButton size="sm" color="primary" variant="outline"
            onClick={() => { setBusca(''); setMateriaFiltro(''); setOrdenacao('padrao') }}>
            Limpar filtros
          </CButton>
        </div>
      ) : modoVis === 'lista' ? (
        <div>
          {questoesExibidas.map(q => (
            <VideoCard
              key={q.id}
              q={q}
              assistido={assistidos.includes(q.id)}
              onMarcarAssistido={marcarAssistido}
              isDark={isDark}
              modoLista={true}
              materiaFiltro={materiaFiltro}
            />
          ))}
        </div>
      ) : (
        <CRow>
          {questoesExibidas.map(q => (
            <VideoCard
              key={q.id}
              q={q}
              assistido={assistidos.includes(q.id)}
              onMarcarAssistido={marcarAssistido}
              isDark={isDark}
              modoLista={false}
              materiaFiltro={materiaFiltro}
            />
          ))}
        </CRow>
      )}
    </div>
  )
}

export default VideoGallery