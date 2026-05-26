import React, { useEffect, useState, useCallback } from 'react'
import { CSpinner, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter } from '@coreui/react'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import { useTheme } from '../../context/themeContext'
import { tokens as tk } from '../../tokens'
import { confirmDialog } from '../../utils/confirm'

const FONT = "'Nunito', 'Circular Std', sans-serif"

/* ── Helpers ── */
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

const obterThumbnail = (url) => {
  const ytId = extrairYouTubeId(url)
  if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
  return null
}

/* ── Componentes UI Básicos ── */
const Label = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', color: tk.foggy, marginBottom: 6, fontFamily: FONT }}>{children}</div>
)

const AInput = ({ value, onChange, placeholder }) => (
  <input value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', height: 42, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', padding: '0 14px', fontSize: 13, fontFamily: FONT, outline: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = tk.rausch} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
)

const ASelect = ({ value, onChange, children }) => (
  <select value={value} onChange={onChange} style={{ width: '100%', height: 42, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', padding: '0 14px', fontSize: 13, fontFamily: FONT, outline: 'none', transition: 'border-color 0.2s', cursor: 'pointer' }} onFocus={e => e.target.style.borderColor = tk.rausch} onBlur={e => e.target.style.borderColor = 'var(--color-border)'}>{children}</select>
)

const Skel = () => (
  <div
    className="skshimmer"
    style={{ height: 280, borderRadius: 16 }}
  />
)

const GestaoVideos = () => {
  const [videos, setVideos] = useState([])
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [busca, setBusca] = useState('')
  const [materiaFiltro, setMateriaFiltro] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const [modalVisible, setModalVisible] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [formData, setFormData] = useState({ id: null, titulo: '', link: '', materia_ids: [] })
  const [salvando, setSalvando] = useState(false)

  const { isDark } = useTheme()

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        apenas_videos: 'true', page: String(currentPage), per_page: '20', busca: busca,
      })
      if (materiaFiltro) params.append('materia_id', materiaFiltro)

      const [resVideos, resMaterias] = await Promise.all([
        api.get(`/api/videos?${params.toString()}`),
        api.get('/api/admin/materias')
      ])
      const respVideos = resVideos.data
      const dataMaterias = resMaterias.data

      if (respVideos.sucesso) {
        setVideos(respVideos.dados.data)
        setTotalPages(respVideos.dados.total_pages)
        setTotalItems(respVideos.dados.total)
      }
      setMaterias(Array.isArray(dataMaterias) ? dataMaterias : [])
    } catch (err) {
      setError('Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, busca, materiaFiltro])

  useEffect(() => { carregarDados() }, [carregarDados])

  const abrirModal = (video = null) => {
    if (video) {
      setModoEdicao(true)
      setFormData({ id: video.id, titulo: video.titulo || '', link: video.link_video || '', materia_ids: [video.materia_id].filter(Boolean) })
    } else {
      setModoEdicao(false)
      setFormData({ id: null, titulo: '', link: '', materia_ids: [] })
    }
    setModalVisible(true)
  }

  const salvarVideo = async () => {
    if (!formData.titulo || !formData.link || formData.materia_ids.length === 0) {
      setError('Preencha título, link e matéria.')
      setTimeout(() => setError(''), 3000)
      return
    }

    setSalvando(true)
    setError('')
    try {
      const payload = { titulo: formData.titulo, link_video: formData.link, materia_id: formData.materia_ids[0] || null }
      const url = modoEdicao ? `/api/videos/${formData.id}` : `/api/videos`
      if (modoEdicao) {
        await api.put(url, payload)
      } else {
        await api.post(url, payload)
      }
      setSuccess('Vídeo salvo com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
      setModalVisible(false)
      carregarDados()
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(''), 3000)
    } finally {
      setSalvando(false)
    }
  }

  const excluirVideo = async (id) => {
    if (!await confirmDialog('Certeza que deseja remover este vídeo?')) return
    try {
      await api.delete(`/api/videos/${id}`)
      setSuccess('Vídeo removido.')
      setTimeout(() => setSuccess(''), 3000)
      carregarDados()
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(''), 3000)
    }
  }

  const containerStyle = { minHeight: '100vh', background: 'var(--color-bg-primary)', padding: '32px 16px 60px', fontFamily: FONT }

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <div style={{ color: tk.babu, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            Gestão de Conteúdo
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                Gestão de Vídeos
              </div>
              <div style={{ fontSize: 14, color: tk.foggy, marginTop: 6 }}>
                Gerencie as videoaulas do YouTube vinculadas às matérias.
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => abrirModal()}
              style={{ background: tk.babu, color: '#fff', border: 'none', borderRadius: 99, padding: '0 24px', height: 44, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT, boxShadow: `0 4px 14px ${tk.babu}40`, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Icon icon="solar:video-frame-play-bold-duotone" width="18" /> Novo Vídeo
            </motion.button>
          </div>
        </motion.div>

        {/* FILTROS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--color-border)', borderRadius: 99, padding: '0 16px', height: 46, background: 'var(--color-bg-elevated)', transition: 'border-color 0.2s' }}>
            <Icon icon="solar:magnifer-linear" width="18" style={{ color: tk.foggy }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar por título ou ID..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: FONT, color: 'var(--color-text-primary)', width: '100%' }} />
          </div>
          <div>
            <select value={materiaFiltro} onChange={e => setMateriaFiltro(e.target.value)} style={{ width: '100%', height: 46, borderRadius: 99, border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', padding: '0 16px', fontSize: 13, fontFamily: FONT, outline: 'none', cursor: 'pointer' }}>
              <option value="">Todas as matérias</option>
              {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <motion.button onClick={carregarDados} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ background: 'transparent', color: tk.foggy, border: '1px solid var(--color-border)', borderRadius: 99, padding: '0 20px', height: 46, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon icon="solar:restart-bold-duotone" width="16" /> Atualizar
            </motion.button>
          </div>
        </div>

        {/* GRID DE VÍDEOS */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {[0,1,2,3,4,5,6,7].map(i => <Skel key={i} />)}
          </div>
        ) : videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: tk.foggy }}>
            <Icon icon="solar:video-frame-play-bold-duotone" width="64" style={{ marginBottom: 16, opacity: 0.2 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>Nenhum vídeo encontrado.</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>Tente ajustar seus filtros de busca.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            <AnimatePresence>
              {videos.map((v, idx) => {
                const materiaNome = materias.find(m => m.id === (v.materia_ids?.[0] || v.materia_id))?.nome || 'Geral'
                return (
                  <motion.div key={v.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                    whileHover={{ y: -4, boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.06)' }}
                  >
                    {/* Thumbnail */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
                      <img src={obterThumbnail(v.link_video) || 'https://via.placeholder.com/640x360?text=Sem+Thumbnail'} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                      <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, backdropFilter: 'blur(4px)' }}>
                        #{v.id}
                      </div>
                      <div style={{ position: 'absolute', bottom: 12, left: 12, background: tk.rausch, color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon icon="solar:play-circle-bold" /> YouTube
                      </div>
                    </div>
                    {/* Infos */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: tk.babu, marginBottom: 6 }}>{materiaNome}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.4, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 40 }}>
                        {v.titulo}
                      </div>
                      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => abrirModal(v)} style={{ flex: 1, background: `${tk.babu}15`, color: tk.babu, border: 'none', borderRadius: 8, height: 32, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <Icon icon="solar:pen-bold-duotone" /> Editar
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => excluirVideo(v.id)} style={{ width: 32, height: 32, background: `${tk.rausch}15`, color: tk.rausch, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon icon="solar:trash-bin-trash-bold-duotone" />
                        </motion.button>
                        <motion.a href={v.link_video} target="_blank" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ width: 32, height: 32, background: 'var(--color-bg-tertiary)', color: tk.foggy, border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                          <Icon icon="solar:external-link-bold-duotone" />
                        </motion.a>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* PAGINAÇÃO */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40, gap: 12 }}>
            <div style={{ fontSize: 12, color: tk.foggy }}>Exibindo página <strong style={{ color: 'var(--color-text-primary)' }}>{currentPage}</strong> de {totalPages} ({totalItems} totais)</div>
            <div style={{ display: 'flex', gap: 6, background: 'var(--color-bg-elevated)', padding: 6, borderRadius: 99, border: '1px solid var(--color-border)' }}>
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ background: 'transparent', border: 'none', color: tk.foggy, padding: '0 12px', fontSize: 12, fontWeight: 700, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}>Anterior</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages).map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ color: tk.foggy, padding: '0 4px', fontSize: 12 }}>...</span>}
                  <button onClick={() => setCurrentPage(p)} style={{ width: 28, height: 28, borderRadius: '50%', background: p === currentPage ? tk.babu : 'transparent', color: p === currentPage ? '#fff' : tk.foggy, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{p}</button>
                </React.Fragment>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ background: 'transparent', border: 'none', color: tk.foggy, padding: '0 12px', fontSize: 12, fontWeight: 700, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}>Próximo</button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} size="lg">
        <div style={{ fontFamily: FONT }}>
          <CModalHeader style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: tk.babu, textTransform: 'uppercase', letterSpacing: '1px' }}>Editor</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>{modoEdicao ? 'Editar Vídeo' : 'Novo Vídeo'}</div>
            </div>
          </CModalHeader>
          <CModalBody style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Label>Título da Videoaula</Label>
                <AInput value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} placeholder="Ex: Contabilidade Geral - Balanço Patrimonial" />
              </div>
              <div>
                <Label>Link do YouTube</Label>
                <AInput value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                {formData.link && extrairYouTubeId(formData.link) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, fontWeight: 700, color: tk.babu }}>
                    <Icon icon="solar:check-circle-bold" /> ID Extraído: {extrairYouTubeId(formData.link)}
                  </div>
                )}
              </div>
              <div>
                <Label>Matéria Relacionada</Label>
                <ASelect value={formData.materia_ids[0] || ''} onChange={e => setFormData({ ...formData, materia_ids: e.target.value ? [Number(e.target.value)] : [] })}>
                  <option value="">Selecione uma matéria...</option>
                  {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </ASelect>
              </div>
            </div>
          </CModalBody>
          <CModalFooter style={{ borderTop: '1px solid var(--color-border)' }}>
            <motion.button onClick={() => setModalVisible(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ height: 42, padding: '0 20px', borderRadius: 99, border: '1px solid var(--color-border)', background: 'transparent', color: tk.foggy, fontWeight: 600, fontFamily: FONT, cursor: 'pointer' }}>Cancelar</motion.button>
            <motion.button onClick={salvarVideo} disabled={salvando} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ height: 42, padding: '0 24px', borderRadius: 99, border: 'none', background: tk.babu, color: '#fff', fontWeight: 700, fontFamily: FONT, cursor: 'pointer', boxShadow: `0 4px 14px ${tk.babu}40` }}>
              {salvando ? <CSpinner size="sm" /> : (modoEdicao ? 'Salvar Alterações' : 'Publicar Vídeo')}
            </motion.button>
          </CModalFooter>
        </div>
      </CModal>

      {/* ALERTAS */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: tk.babu, color: '#fff', borderRadius: 99, padding: '12px 24px', fontWeight: 700, fontSize: 14, fontFamily: FONT, boxShadow: `0 8px 24px ${tk.babu}40`, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8 }}><Icon icon="solar:check-circle-bold-duotone" width="20" /> {success}</motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onClick={() => setError('')} style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: tk.rausch, color: '#fff', borderRadius: 99, padding: '12px 24px', fontWeight: 700, fontSize: 14, fontFamily: FONT, boxShadow: `0 8px 24px ${tk.rausch}40`, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><Icon icon="solar:close-circle-bold-duotone" width="20" /> {error}</motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GestaoVideos
