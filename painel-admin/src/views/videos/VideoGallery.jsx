import React, {
  useEffect, useState, useMemo, useCallback, useRef, memo
} from 'react'
import {
  CButton, CCard, CCardBody, CCol, CContainer,
  CFormSelect, CFormInput, CRow, CSpinner, CBadge, CAlert, CProgress,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch, cilX, cilList, cilGrid, cilMediaPlay,
  cilCheckCircle, cilStar, cilFindInPage,
} from '@coreui/icons'
import { API_URL } from '../../config'
import { useTheme } from '../../context/themeContext'

/* ─── Helpers ─── */

const fetchJSON = async (url) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

const extrairYouTubeId = (url) => {
  if (!url) return null
  const patterns = [/youtube\.com\/watch\?v=([^&]+)/, /youtu\.be\/([^?&]+)/, /youtube\.com\/embed\/([^?&]+)/]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

const obterLinkEmbed = (url) => {
  if (!url) return null
  const ytId = extrairYouTubeId(url)
  if (ytId) return `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`
  return url
}

const obterThumbnail = (url) => {
  const ytId = extrairYouTubeId(url)
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
  return null
}

const ls = {
  get: (key, def = null) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)) } catch { }
  },
}

/* ─── Componentes ─── */

const SkeletonCard = ({ isDark }) => (
  <CCol xs={12} md={6} xl={4} className="mb-4">
    <div style={{ height: 300, background: isDark ? 'rgba(255,255,255,0.05)' : '#eee', borderRadius: 20 }} className="animate-pulse" />
  </CCol>
)

const VideoCard = memo(({ q, assistido, onMarcarAssistido, isDark, modoLista }) => {
  const titulo = q.titulo || q.question || 'Sem título'
  const materiaLabel = q.materia_nome || q.assunto || 'Geral'
  const embedUrl = obterLinkEmbed(q.link_video)
  const thumbnail = obterThumbnail(q.link_video)
  const [iframeAtivo, setIframeAtivo] = useState(false)

  const cardStyle = {
    background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
    borderRadius: 20,
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    flexDirection: modoLista ? 'row' : 'column',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.2)' : '0 10px 30px rgba(0,0,0,0.02)',
  }

  return (
    <CCol xs={12} md={modoLista ? 12 : 6} xl={modoLista ? 12 : 4} className="mb-4" id={`vid-${q.id}`}>
      <div style={cardStyle} className="hover-lift video-card-row">
        {/* Thumbnail Section */}
        <div 
          className="video-card-thumb"
          style={{ width: modoLista ? '300px' : '100%', aspectRatio: '16/9', position: 'relative', background: '#000', flexShrink: 0 }}
        >
          {iframeAtivo ? (
            <iframe src={embedUrl} className="w-100 h-100 border-0" allowFullScreen title={titulo} />
          ) : (
            <div 
              className="w-100 h-100 cursor-pointer d-flex align-items-center justify-content-center"
              onClick={() => { setIframeAtivo(true); if (!assistido) onMarcarAssistido(q.id) }}
            >
              <img src={thumbnail} className="w-100 h-100 object-fit-cover opacity-75" alt="" />
              <div className="position-absolute bg-white rounded-circle d-flex align-items-center justify-content-center shadow-lg" style={{ width: 40, height: 40 }}>
                <CIcon icon={cilMediaPlay} className="text-primary ms-1" size="lg" />
              </div>
            </div>
          )}
          {assistido && (
            <div className="position-absolute top-0 end-0 m-2">
              <CBadge color="success" className="rounded-pill px-2" style={{ fontSize: 9 }}>✓ ASSISTIDO</CBadge>
            </div>
          )}
        </div>

        {/* Content Section */}
        <CCardBody className="p-3 p-md-4 d-flex flex-column">
          <div className="d-flex gap-2 mb-2">
            <CBadge color="primary" className="rounded-pill bg-opacity-10 text-primary border-0" style={{ fontSize: 9 }}>#{q.id}</CBadge>
            <CBadge color="secondary" className="rounded-pill bg-opacity-10 text-secondary border-0" style={{ fontSize: 9 }}>{materiaLabel}</CBadge>
          </div>
          <h5 className="fw-bold mb-3 flex-grow-1" style={{ fontSize: 'clamp(14px, 4vw, 16px)', lineHeight: 1.4 }}>{titulo}</h5>
          
          <div className="d-flex justify-content-between align-items-center mt-auto gap-2">
            {!assistido ? (
              <CButton size="sm" variant="ghost" className="text-success p-0" onClick={() => onMarcarAssistido(q.id)} style={{ fontSize: 11 }}>
                Marcar visto
              </CButton>
            ) : (
              <span className="small text-success fw-bold" style={{ fontSize: 11 }}>Concluído</span>
            )}
            <CButton size="sm" color="primary" variant="ghost" href={`#/quiz?busca=${q.id}`} style={{ fontSize: 11 }}>
              Praticar →
            </CButton>
          </div>
        </CCardBody>
      </div>
    </CCol>
  )
})

/* ─── Main ─── */

const VideoGallery = () => {
  const [questoesComVideo, setQuestoesComVideo] = useState([])
  const [materias, setMaterias] = useState([])
  const [materiaFiltro, setMateriaFiltro] = useState('')
  const [busca, setBusca] = useState('')
  const [modoVis, setModoVis] = useState('grade')
  const [modoPlaylist, setModoPlaylist] = useState(false)
  const [loading, setLoading] = useState(true)
  const [assistidos, setAssistidos] = useState(() => ls.get('videosAssistidos', []))
  const [desempenhoBaixo, setDesempenhoBaixo] = useState([])
  const { isDark } = useTheme()
  const matricula = sessionStorage.getItem('matricula')

  useEffect(() => { ls.set('videosAssistidos', assistidos) }, [assistidos])

  const marcarAssistido = useCallback((id) => {
    setAssistidos(prev => prev.includes(id) ? prev : [...prev, id])
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
    try {
      const promises = [
        fetchJSON(`${API_URL}/api/admin/materias`),
        fetchJSON(`${API_URL}/api/questoes?apenas_videos=true`),
        fetchJSON(`${API_URL}/api/videos`).catch(() => ({ dados: { data: [] } })),
      ]
      if (matricula) promises.push(fetchJSON(`${API_URL}/api/aluno/historico-grafico/${matricula}`).catch(() => null))
      
      const [dataMat, dataQuestRaw, dataVidRaw, dataHistorico] = await Promise.all(promises)
      
      const extrairArray = (res) => {
        if (Array.isArray(res)) return res
        if (res?.dados?.data && Array.isArray(res.dados.data)) return res.dados.data
        if (res?.dados && Array.isArray(res.dados)) return res.dados
        if (res?.data && Array.isArray(res.data)) return res.data
        return []
      }

      setMaterias(extrairArray(dataMat))
      
      const qVideos = extrairArray(dataQuestRaw).filter(q => q?.link_video)
      const vVideos = extrairArray(dataVidRaw)
      setQuestoesComVideo([...qVideos, ...vVideos])

      if (dataHistorico?.por_assunto && Array.isArray(dataHistorico.por_assunto)) {
        setDesempenhoBaixo(dataHistorico.por_assunto.filter(a => a.media_acerto < 60).map(a => a.assunto.toLowerCase()))
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [matricula])

  useEffect(() => { carregarDados() }, [carregarDados])

  const countPorMateria = useMemo(() => {
    const m = {}; questoesComVideo.forEach(q => { const id = q.materia_id || q.materia_ids?.[0]; if (id) m[id] = (m[id] || 0) + 1 }); return m
  }, [questoesComVideo])

  const filteredItems = useMemo(() => {
    return questoesComVideo.filter(q => {
      const mid = q.materia_id || q.materia_ids?.[0]
      const matchMat = !materiaFiltro || mid === parseInt(materiaFiltro)
      const t = (q.titulo || q.question || '').toLowerCase()
      const matchBusca = !busca || t.includes(busca.toLowerCase())
      return matchMat && matchBusca
    })
  }, [questoesComVideo, materiaFiltro, busca])

  const recomendados = useMemo(() => {
    if (!desempenhoBaixo.length) return []
    return questoesComVideo.filter(q => {
      const s = (q.materia_nome || q.assunto || '').toLowerCase()
      return desempenhoBaixo.some(a => s.includes(a))
    }).slice(0, 3)
  }, [questoesComVideo, desempenhoBaixo])

  const perc = questoesComVideo.length ? Math.round((assistidos.length / questoesComVideo.length) * 100) : 0

  return (
    <div className={`fade-in pb-5 ${isDark ? 'text-white' : 'text-dark'}`}>
      <style>{`
        .glass-card { background: ${isDark ? 'rgba(255,255,255,0.03)' : '#fff'}; border: 1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}; border-radius: 20px; backdrop-filter: blur(10px); }
        .header-section { padding: clamp(20px, 5vw, 40px) 0; border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}; margin-bottom: 30px; }
        .search-pill { background: ${isDark ? 'rgba(255,255,255,0.05)' : '#fff'}; border-radius: 50px; border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; transition: all 0.2s ease; }
        .search-pill:focus-within { border-color: var(--cui-primary); box-shadow: 0 0 0 4px rgba(var(--cui-primary-rgb), 0.1); }
        .hover-lift { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.1); }
        
        .fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slide-left { animation: slideLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .animate-pulse { animation: pulse 2s infinite; }

        @media (max-width: 768px) {
          h1 { font-size: 1.5rem !important; }
          .header-section { padding: 15px 0; margin-bottom: 20px; }
          .search-pill { border-radius: 12px; }
          .glass-card { border-radius: 15px; }
          .video-card-row { flex-direction: column !important; }
          .video-card-thumb { width: 100% !important; }
        }
      `}</style>

      {/* HEADER */}
      <div className="header-section">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="text-primary fw-bold text-uppercase mb-1" style={{ fontSize: 9, letterSpacing: '0.1em' }}>Vídeo-Aulas</div>
            <h1 className="fw-bold mb-0" style={{ letterSpacing: '-0.02em' }}>Centro de Aprendizado</h1>
            <p className="text-body-secondary mb-0 small d-none d-md-block">Assista, aprenda e domine todos os assuntos da contabilidade.</p>
          </div>
          <div className="text-md-end" style={{ minWidth: '100%', maxWidth: 300 }}>
            <div className="d-flex justify-content-between small fw-bold mb-1" style={{ fontSize: 11 }}>
              <span>Seu Progresso</span>
              <span>{perc}%</span>
            </div>
            <CProgress value={perc} color="primary" height={8} className="rounded-pill shadow-sm" />
            <div className="small text-body-secondary mt-1" style={{ fontSize: 10 }}>{assistidos.length} aulas concluídas</div>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <CRow className="mb-5 g-3">
        <CCol lg={5}>
          <div className="search-pill p-1 d-flex align-items-center">
            <div className="ps-3"><CIcon icon={cilSearch} className="opacity-50" /></div>
            <CFormInput placeholder="Pesquisar aula..." value={busca} onChange={e => setBusca(e.target.value)} className="bg-transparent border-0 shadow-none py-2" />
          </div>
        </CCol>
        <CCol lg={3}>
          <CFormSelect value={materiaFiltro} onChange={e => setMateriaFiltro(e.target.value)} className="search-pill border-0 py-2 h-100 ps-3">
            <option value="">Todas as matérias</option>
            {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </CFormSelect>
        </CCol>
        <CCol lg={4} className="d-flex justify-content-lg-end gap-2">
          <div className="bg-body-tertiary p-1 rounded-pill d-flex shadow-sm">
            <CButton variant={modoVis === 'grade' ? 'primary' : 'ghost'} className="rounded-circle p-2" onClick={() => setModoVis('grade')}><CIcon icon={cilGrid} /></CButton>
            <CButton variant={modoVis === 'lista' ? 'primary' : 'ghost'} className="rounded-circle p-2" onClick={() => setModoVis('lista')}><CIcon icon={cilList} /></CButton>
          </div>
          <CButton color={modoPlaylist ? 'warning' : 'primary'} className="rounded-pill px-4 fw-bold shadow-sm" onClick={() => setModoPlaylist(!modoPlaylist)}>
            <CIcon icon={cilMediaPlay} className="me-2" /> {modoPlaylist ? 'Sair' : 'Playlist'}
          </CButton>
        </CCol>
      </CRow>

      {/* RECOMENDADOS */}
      {recomendados.length > 0 && !busca && (
        <div className="glass-card p-4 mb-5" style={{ borderLeft: '6px solid #e55353' }}>
          <div className="d-flex align-items-center gap-3 mb-4">
            <div className="bg-danger p-2 rounded-3 text-white"><CIcon icon={cilStar} /></div>
            <h5 className="mb-0 fw-bold">Reforce seus pontos fracos</h5>
          </div>
          <CRow className="g-3">
            {recomendados.map(q => (
              <CCol key={q.id} md={4}>
                <div className="p-3 rounded-4 bg-body-tertiary d-flex align-items-center gap-3 cursor-pointer" onClick={() => setModoPlaylist(true)}>
                  <img src={obterThumbnail(q.link_video)} style={{ width: 80, height: 45, borderRadius: 8, objectFit: 'cover' }} alt="" />
                  <div className="text-truncate fw-bold small">{q.titulo || q.question}</div>
                </div>
              </CCol>
            ))}
          </CRow>
        </div>
      )}

      {/* GRID */}
      {loading ? (
        <CRow className="g-4">{[...Array(6)].map((_, i) => <SkeletonCard key={i} isDark={isDark} />)}</CRow>
      ) : (
        <CRow className="g-4">
          {filteredItems.map(v => <VideoCard key={v.id} q={v} isDark={isDark} modoLista={modoVis === 'lista'} assistido={assistidos.includes(v.id)} onMarcarAssistido={marcarAssistido} />)}
          {!filteredItems.length && (
            <div className="text-center py-5 opacity-50">
              <CIcon icon={cilFindInPage} size="3xl" className="mb-3" />
              <h5>Nenhum resultado encontrado</h5>
            </div>
          )}
        </CRow>
      )}

      {/* PLAYLIST */}
      {modoPlaylist && (
        <div 
          className="position-fixed shadow-lg p-4 animate-slide-left playlist-panel" 
          style={{ 
            top: 'clamp(80px, 10vh, 100px)', 
            right: 'clamp(10px, 2vw, 20px)', 
            bottom: 'clamp(10px, 2vw, 20px)', 
            width: 'min(350px, 90vw)', 
            background: isDark ? '#1a2535' : '#fff', 
            borderRadius: 24, 
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold m-0">Playlist de Estudo</h6>
            <CButton size="sm" variant="ghost" onClick={() => setModoPlaylist(false)}><CIcon icon={cilX} /></CButton>
          </div>
          <div className="overflow-auto h-100 pb-5 pe-2">
            {filteredItems.map((v, i) => (
              <div key={v.id} className={`p-3 rounded-4 mb-2 cursor-pointer ${assistidos.includes(v.id) ? 'bg-success bg-opacity-10' : 'bg-body-tertiary'}`} style={{ fontSize: 13 }} onClick={() => document.getElementById(`vid-${v.id}`)?.scrollIntoView({ behavior: 'smooth' })}>
                <div className="fw-bold text-truncate">{i+1}. {v.titulo || v.question}</div>
                <div className="small opacity-50">{v.materia_nome || v.assunto}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoGallery