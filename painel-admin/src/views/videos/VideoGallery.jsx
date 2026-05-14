import React, { useEffect, useState, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import confetti from 'canvas-confetti'
import toast from 'react-hot-toast'
import {
  CButton, CCol, CContainer,
  CFormSelect, CFormInput, CRow, CSpinner
} from '@coreui/react'
import { API_URL } from '../../config'
import { useTheme } from '../../context/themeContext'

/* ─── Tokens Airbnb-inspired ─────────────────────────────── */
const tokens = {
  rausch: '#FF385C',
  babu: '#00A699',
  arches: '#FC642D',
  hof: '#484848',
  foggy: '#767676',
  swiss: '#B0B0B0',
}

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

/* ─── Componentes de UI Premium ─── */
const SCard = ({ children, style = {}, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
    style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 20,
      overflow: 'hidden',
      height: '100%',
      ...style,
    }}
  >
    {children}
  </motion.div>
)

const AirbnbProgress = ({ value, color = tokens.rausch }) => (
  <div style={{ height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
      style={{ height: '100%', background: color, borderRadius: 99 }}
    />
  </div>
)

const VideoCard = memo(({ q, assistido, onMarcarAssistido, isDark, modoLista }) => {
  const titulo = q.titulo || q.question || 'Sem título'
  const materiaLabel = q.materia_nome || q.assunto || 'Geral'
  const thumbnail = obterThumbnail(q.link_video)
  const [iframeAtivo, setIframeAtivo] = useState(false)

  const embedUrl = useMemo(() => {
    const ytId = extrairYouTubeId(q.link_video)
    return ytId ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&autoplay=1` : q.link_video
  }, [q.link_video])

  return (
    <CCol xs={12} md={modoLista ? 12 : 6} xl={modoLista ? 12 : 4} className="mb-4">
      <motion.div
        whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.12)' }}
        transition={{ duration: 0.2 }}
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: modoLista ? 'row' : 'column',
          cursor: 'pointer'
        }}
        onClick={() => { setIframeAtivo(true); if (!assistido) onMarcarAssistido(q.id) }}
      >
        <div style={{ width: modoLista ? '320px' : '100%', aspectRatio: '16/9', position: 'relative', background: '#000', flexShrink: 0 }}>
          {iframeAtivo ? (
            <iframe src={embedUrl} className="w-100 h-100 border-0" allow="autoplay; encrypted-media" allowFullScreen title={titulo} />
          ) : (
            <>
              <img src={thumbnail} className="w-100 h-100 object-fit-cover opacity-80" alt="" />
              <div className="position-absolute inset-0 d-flex align-items-center justify-content-center">
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center shadow-lg" 
                  style={{ width: 54, height: 54, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)' }}
                >
                  <Icon icon="solar:play-bold" style={{ color: tokens.rausch }} width="24" className="ms-1" />
                </div>
              </div>
            </>
          )}
          {assistido && (
            <div className="position-absolute top-3 end-3 shadow-sm">
              <span className="px-2 py-1 rounded-pill fw-bold text-white" style={{ background: tokens.babu, fontSize: 9, letterSpacing: '0.5px' }}>
                ✓ ASSISTIDO
              </span>
            </div>
          )}
        </div>

        <div className="p-4 d-flex flex-column flex-grow-1">
          <div className="d-flex gap-2 mb-2">
            <span style={{ fontSize: 10, fontWeight: 700, color: tokens.rausch, background: `${tokens.rausch}15`, padding: '2px 8px', borderRadius: 6 }}>
              #{q.id}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: tokens.foggy, background: 'var(--color-bg-tertiary)', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
              {materiaLabel}
            </span>
          </div>
          <h5 className="fw-bold mb-3" style={{ fontSize: 16, lineHeight: 1.3, letterSpacing: '-0.3px', color: 'var(--color-text-primary)' }}>
            {titulo}
          </h5>
          
          <div className="d-flex justify-content-between align-items-center mt-auto">
            <span style={{ fontSize: 12, color: assistido ? tokens.babu : tokens.foggy, fontWeight: 600 }}>
              {assistido ? 'Concluído' : 'Aguardando'}
            </span>
            <div className="d-flex gap-2">
               <CButton 
                 size="sm" 
                 href={`#/quiz?busca=${q.id}`}
                 className="fw-bold border-0 px-3"
                 style={{ borderRadius: 10, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', fontSize: 11 }}
               >
                 Praticar
               </CButton>
            </div>
          </div>
        </div>
      </motion.div>
    </CCol>
  )
})

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
    if (assistidos.includes(id)) return
    setAssistidos(prev => [...prev, id])
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.7 }, colors: [tokens.rausch, tokens.babu, tokens.arches] })
    toast.success('Aula concluída com sucesso! 🎉')
    if (matricula) {
      fetch(`${API_URL}/api/aluno/video-assistido/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula }),
      }).catch(() => { })
    }
  }, [matricula, assistidos])

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const promises = [
        fetchJSON(`${API_URL}/api/admin/materias`).catch(() => []),
        fetchJSON(`${API_URL}/api/questoes?apenas_videos=true`).catch(() => ({ dados: { data: [] } })),
        fetchJSON(`${API_URL}/api/videos`).catch(() => ({ dados: { data: [] } })),
      ]
      if (matricula) promises.push(fetchJSON(`${API_URL}/api/aluno/historico-grafico/${matricula}`).catch(() => ({ por_assunto: [] })))
      
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

  const filteredItems = useMemo(() => {
    return questoesComVideo.filter(q => {
      const mid = q.materia_id || q.materia_ids?.[0]
      const matchMat = !materiaFiltro || mid === parseInt(materiaFiltro)
      const t = (q.titulo || q.question || '').toLowerCase()
      return matchMat && (!busca || t.includes(busca.toLowerCase()))
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
    <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', fontFamily: "'Nunito', sans-serif" }}>
      <CContainer fluid className="px-3 px-md-5" style={{ paddingTop: 32 }}>
      <style>{`
        @keyframes skshimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .search-field { background: var(--color-bg-elevated); border: 1.5px solid var(--color-border); border-radius: 14px; transition: 0.2s; }
        .search-field:focus-within { border-color: ${tokens.rausch}; box-shadow: 0 0 0 4px rgba(255, 56, 92, 0.1); }
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* HEADER PREMIUM IDENTICO AO PAINEL */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Centro de Aprendizado</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            Aprenda no seu Ritmo 🎓
          </div>
          <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
            Assista às aulas exclusivas e domine os conceitos fundamentais da contabilidade.
          </div>
        </motion.div>

        {/* FILTROS E BUSCA */}
        <CRow className="mb-5 g-3">
          <CCol lg={5}>
            <div className="search-field d-flex align-items-center px-3 py-1">
              <Icon icon="solar:magnifer-linear" style={{ color: tokens.foggy }} width="20" />
              <CFormInput 
                placeholder="Pesquisar por título ou assunto..." 
                value={busca} 
                onChange={e => setBusca(e.target.value)} 
                className="bg-transparent border-0 shadow-none py-2"
                style={{ fontSize: 15 }}
              />
            </div>
          </CCol>
          <CCol lg={3}>
            <CFormSelect 
              value={materiaFiltro} 
              onChange={e => setMateriaFiltro(e.target.value)} 
              className="search-field py-2 h-100 ps-3 shadow-none"
              style={{ fontSize: 15 }}
            >
              <option value="">Todas as matérias</option>
              {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </CFormSelect>
          </CCol>
          <CCol lg={4} className="d-flex justify-content-lg-end gap-3">
            <div className="d-flex bg-body-tertiary p-1 rounded-4 border">
              <CButton 
                onClick={() => setModoVis('grade')}
                style={{ background: modoVis === 'grade' ? 'var(--color-bg-elevated)' : 'transparent', border: 'none', borderRadius: 10, padding: '8px 12px' }}
              >
                <Icon icon="solar:widget-2-bold-duotone" style={{ color: modoVis === 'grade' ? tokens.rausch : tokens.foggy }} />
              </CButton>
              <CButton 
                onClick={() => setModoVis('lista')}
                style={{ background: modoVis === 'lista' ? 'var(--color-bg-elevated)' : 'transparent', border: 'none', borderRadius: 10, padding: '8px 12px' }}
              >
                <Icon icon="solar:list-bold-duotone" style={{ color: modoVis === 'lista' ? tokens.rausch : tokens.foggy }} />
              </CButton>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="fw-bold border-0 px-4 shadow-sm"
              style={{ background: tokens.rausch, color: '#fff', borderRadius: 14, fontSize: 14 }}
              onClick={() => setModoPlaylist(!modoPlaylist)}
            >
              <Icon icon="solar:play-stream-bold-duotone" className="me-2" /> {modoPlaylist ? 'Fechar' : 'Playlist'}
            </motion.button>
          </CCol>
        </CRow>

        {/* RECOMENDADOS (CARD ESTILO SCard) */}
        {recomendados.length > 0 && !busca && (
          <SCard delay={0.1} style={{ marginBottom: 48, borderLeft: `6px solid ${tokens.arches}`, background: `linear-gradient(90deg, ${tokens.arches}05 0%, transparent 100%)` }}>
            <div className="d-flex align-items-center gap-3 mb-4">
              <div className="rounded-3 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, background: `${tokens.arches}15`, color: tokens.arches }}>
                <Icon icon="solar:star-bold-duotone" width="22" />
              </div>
              <h5 className="mb-0 fw-bold" style={{ letterSpacing: '-0.5px' }}>Recomendado para você</h5>
            </div>
            <CRow className="g-3">
              {recomendados.map((q, i) => (
                <CCol key={q.id} md={4}>
                  <motion.div 
                    whileHover={{ x: 4, background: 'var(--color-bg-elevated)' }}
                    className="p-3 rounded-4 d-flex align-items-center gap-3 cursor-pointer border" 
                    onClick={() => setModoPlaylist(true)}
                  >
                    <img src={obterThumbnail(q.link_video)} style={{ width: 80, height: 45, borderRadius: 10, objectFit: 'cover' }} alt="" />
                    <div className="text-truncate fw-bold small" style={{ color: 'var(--color-text-primary)' }}>{q.titulo || q.question}</div>
                  </motion.div>
                </CCol>
              ))}
            </CRow>
          </SCard>
        )}

        {/* GRID DE VÍDEOS */}
        {loading ? (
          <CRow className="g-4">
            {[1,2,3,4,5,6].map(i => <CCol key={i} xs={12} md={6} xl={4}><div style={{ height: 320, background: 'var(--color-bg-tertiary)', borderRadius: 20 }} className="animate-pulse" /></CCol>)}
          </CRow>
        ) : (
          <CRow className="g-4">
            {filteredItems.map((v, i) => (
              <VideoCard key={v.id} q={v} isDark={isDark} modoLista={modoVis === 'lista'} assistido={assistidos.includes(v.id)} onMarcarAssistido={marcarAssistido} />
            ))}
            {!filteredItems.length && (
              <div className="text-center py-5">
                <Icon icon="solar:ghost-bold-duotone" width="64" style={{ color: tokens.swiss, opacity: 0.3 }} />
                <h5 className="mt-3" style={{ color: tokens.foggy }}>Nenhuma aula encontrada</h5>
              </div>
            )}
          </CRow>
        )}
      </div>

      {/* PLAYLIST PANEL GLASSMORPHISM */}
      {/* PLAYLIST PANEL GLASSMORPHISM */}
      <AnimatePresence>
        {modoPlaylist && (
          <motion.div 
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            style={{ 
              position: 'fixed', top: 100, right: 30, bottom: 30, width: 380, 
              background: 'rgba(var(--color-bg-elevated-rgb), 0.85)', 
              backdropFilter: 'blur(16px)', border: '1px solid var(--color-border)',
              borderRadius: 30, zIndex: 2000, display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
            }}
          >
            <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="fw-bold m-0" style={{ letterSpacing: '-0.4px' }}>Playlist de Estudo</h6>
              <CButton variant="ghost" className="rounded-circle p-2" onClick={() => setModoPlaylist(false)}>
                <Icon icon="solar:close-circle-bold-duotone" style={{ color: tokens.foggy }} width="24" />
              </CButton>
            </div>
            <div className="overflow-auto p-4 flex-grow-1">
              {filteredItems.map((v, i) => (
                <motion.div 
                  key={v.id} 
                  whileHover={{ x: 5 }}
                  className={`p-3 rounded-4 mb-3 cursor-pointer border-0 shadow-sm ${assistidos.includes(v.id) ? 'bg-success bg-opacity-10' : 'bg-body-tertiary'}`} 
                  onClick={() => document.getElementById(`vid-${v.id}`)?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <div className="d-flex align-items-center gap-3">
                    <span style={{ fontSize: 14, fontWeight: 800, color: assistidos.includes(v.id) ? tokens.babu : tokens.foggy }}>{String(i+1).padStart(2, '0')}</span>
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-bold text-truncate" style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{v.titulo || v.question}</div>
                      <div style={{ fontSize: 11, color: tokens.foggy }}>{v.materia_nome || v.assunto}</div>
                    </div>
                    {assistidos.includes(v.id) && <Icon icon="solar:check-circle-bold" style={{ color: tokens.babu }} width="16" />}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </CContainer>
    </div>
  )
}

export default VideoGallery