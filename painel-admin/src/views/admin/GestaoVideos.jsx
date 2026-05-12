import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  CAlert,
  CButton,
  CCol,
  CRow,
  CSpinner,
  CFormInput,
  CFormSelect,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CBadge,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilPencil,
  cilTrash,
  cilVideo,
  cilSearch,
  cilLibrary,
  cilReload,
  cilExternalLink,
} from '@coreui/icons'
import { API_URL } from '../../config'
import { useTheme } from '../../context/themeContext'

/* ─── Helpers ─── */
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

/* ─── Skeleton Card ─── */
const SkeletonCard = ({ isDark }) => {
  const bg = isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'
  return (
    <CCol xs={12} md={6} lg={4} xl={3} className="mb-4">
      <div style={{
        height: 280,
        background: bg,
        borderRadius: 16,
        animation: 'shimmer 1.5s infinite linear',
        backgroundSize: '200% 100%',
        backgroundImage: `linear-gradient(90deg, ${bg} 25%, ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} 50%, ${bg} 75%)`
      }} />
    </CCol>
  )
}

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
        apenas_videos: 'true',
        page: String(currentPage),
        per_page: '20',
        busca: busca,
      })
      if (materiaFiltro) params.append('materia_id', materiaFiltro)

      const [resVideos, resMaterias] = await Promise.all([
        fetch(`${API_URL}/api/videos?${params.toString()}`),
        fetch(`${API_URL}/api/admin/materias`)
      ])
      const respVideos = await resVideos.json()
      const dataMaterias = await resMaterias.json()

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

  // Removido o useMemo de filtragem local pois agora é server-side
  const videosFiltrados = videos

  const abrirModal = (video = null) => {
    if (video) {
      setModoEdicao(true)
      setFormData({
        id: video.id,
        titulo: video.titulo || '',
        link: video.link_video || '',
        materia_ids: [video.materia_id].filter(Boolean)
      })
    } else {
      setModoEdicao(false)
      setFormData({ id: null, titulo: '', link: '', materia_ids: [] })
    }
    setModalVisible(true)
  }

  const salvarVideo = async () => {
    if (!formData.titulo || !formData.link || formData.materia_ids.length === 0) {
      setError('Preencha o título, o link e selecione uma matéria.')
      return
    }

    setSalvando(true)
    setError('')
    try {
      const payload = {
        titulo: formData.titulo,
        link_video: formData.link,
        materia_id: formData.materia_ids[0] || null
      }

      const url = modoEdicao ? `${API_URL}/api/videos/${formData.id}` : `${API_URL}/api/videos`
      const method = modoEdicao ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Falha ao salvar vídeo.')

      setSuccess('Vídeo salvo com sucesso!')
      setModalVisible(false)
      carregarDados()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const excluirVideo = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este vídeo?')) return
    
    try {
      // Como o vídeo é uma questão, podemos ou excluir a questão ou apenas limpar o link_video.
      // Para ser mais limpo, vamos apenas limpar o link_video se for uma questão real, 
      // ou excluir se for um "vídeo-aula" criado por aqui.
      const res = await fetch(`${API_URL}/api/videos/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Falha ao excluir.')
      
      setSuccess('Vídeo removido.')
      carregarDados()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message)
    }
  }

  /* ── Estilos Premium ── */
  const cardStyle = {
    background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
    borderRadius: 16,
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s ease',
    boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.04)',
  }

  const headerSectionStyle = {
    position: 'relative',
    padding: '40px 0',
    marginBottom: 32,
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`,
  }

  return (
    <div className="fade-in">
      {/* ── Header Estilizado (SaaS Pattern) ── */}
      <div style={headerSectionStyle}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="text-primary fw-bold text-uppercase mb-1" style={{ fontSize: 10, letterSpacing: '0.15em' }}>
              Gestão de Conteúdo
            </div>
            <h2 className="fw-bold mb-1" style={{ letterSpacing: '-0.02em' }}>
              Gestão de Vídeos
            </h2>
            <p className="text-body-secondary small mb-0">
              Gerencie as videoaulas do YouTube e Vimeo vinculadas às matérias.
            </p>
          </div>
          <CButton 
            color="primary" 
            className="rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
            onClick={() => abrirModal()}
            style={{ height: 44 }}
          >
            <CIcon icon={cilPlus} /> Adicionar Vídeo
          </CButton>
        </div>
      </div>

      {/* ── Filtros ── */}
      <CRow className="mb-4 g-3 align-items-end">
        <CCol md={5}>
          <div className="position-relative">
            <CIcon 
              icon={cilSearch} 
              className="position-absolute translate-middle-y top-50 ms-3 text-body-secondary" 
              style={{ width: 16 }}
            />
            <CFormInput 
              placeholder="Pesquisar por título ou ID..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="ps-5 rounded-pill border-0 shadow-sm"
              style={{ height: 46, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }}
            />
          </div>
        </CCol>
        <CCol md={3}>
          <CFormSelect 
            value={materiaFiltro}
            onChange={(e) => setMateriaFiltro(e.target.value)}
            className="rounded-pill border-0 shadow-sm"
            style={{ height: 46, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }}
          >
            <option value="">Todas as matérias</option>
            {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </CFormSelect>
        </CCol>
        <CCol md={4} className="text-md-end">
          <CButton variant="ghost" className="text-body-secondary" onClick={carregarDados}>
            <CIcon icon={cilReload} /> Atualizar
          </CButton>
        </CCol>
      </CRow>

      {error && <CAlert color="danger" className="rounded-4 shadow-sm mb-4">{error}</CAlert>}
      {success && <CAlert color="success" className="rounded-4 shadow-sm mb-4">{success}</CAlert>}

      {/* ── Grid de Vídeos ── */}
      {loading ? (
        <CRow>
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} isDark={isDark} />)}
        </CRow>
      ) : (
        <CRow className="g-4">
          {videosFiltrados.map((v) => (
            <CCol key={v.id} xs={12} md={6} lg={4} xl={3}>
              <div 
                style={cardStyle}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.04)' }}
              >
                {/* Thumbnail */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
                  <img 
                    src={obterThumbnail(v.link_video) || 'https://via.placeholder.com/640x360?text=Sem+Thumbnail'} 
                    alt="" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                  />
                  <div className="position-absolute top-0 end-0 m-2">
                    <CBadge color="dark" className="bg-opacity-75 rounded-pill">#{v.id}</CBadge>
                  </div>
                  <div className="position-absolute bottom-0 start-0 m-2">
                    <CBadge color="danger" className="rounded-pill d-flex align-items-center gap-1">
                      <CIcon icon={cilVideo} size="sm" /> YouTube
                    </CBadge>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 d-flex flex-column flex-grow-1">
                  <div className="text-uppercase fw-bold text-primary mb-1" style={{ fontSize: 9 }}>
                    {materias.find(m => m.id === (v.materia_ids?.[0] || v.materia_id))?.nome || 'Geral'}
                  </div>
                  <h6 className="fw-bold mb-3 text-truncate-2" style={{ height: 36, fontSize: 14, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {v.titulo}
                  </h6>
                  
                  <div className="mt-auto d-flex gap-2">
                    <CButton 
                      size="sm" 
                      color="info" 
                      variant="ghost" 
                      className="flex-grow-1 rounded-pill fw-bold"
                      onClick={() => abrirModal(v)}
                    >
                      <CIcon icon={cilPencil} size="sm" /> Editar
                    </CButton>
                    <CButton 
                      size="sm" 
                      color="danger" 
                      variant="ghost" 
                      className="rounded-circle p-2"
                      onClick={() => excluirVideo(v.id)}
                    >
                      <CIcon icon={cilTrash} size="sm" />
                    </CButton>
                    <CButton 
                      size="sm" 
                      color="secondary" 
                      variant="ghost" 
                      className="rounded-circle p-2"
                      href={v.link_video}
                      target="_blank"
                    >
                      <CIcon icon={cilExternalLink} size="sm" />
                    </CButton>
                  </div>
                </div>
              </div>
            </CCol>
          ))}

          {videosFiltrados.length === 0 && !loading && (
            <CCol xs={12} className="text-center py-5">
              <div className="mb-3" style={{ fontSize: 48 }}>🎥</div>
              <h5 className="text-body-secondary">Nenhum vídeo encontrado.</h5>
              <CButton color="primary" variant="link" onClick={() => { setBusca(''); setMateriaFiltro('') }}>
                Limpar filtros
              </CButton>
            </CCol>
          )}
        </CRow>
      )}

      {/* ── Paginação ── */}
      {!loading && totalPages > 1 && (
        <div className="d-flex flex-column align-items-center mt-5 mb-4">
          <div className="text-body-secondary small mb-3">
            Exibindo página <strong>{currentPage}</strong> de {totalPages} ({totalItems} vídeos totais)
          </div>
          <CPagination align="center" className="shadow-sm rounded-pill overflow-hidden">
            <CPaginationItem 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{ cursor: 'pointer' }}
            >
              Anterior
            </CPaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <CPaginationItem disabled>…</CPaginationItem>}
                  <CPaginationItem 
                    active={p === currentPage} 
                    onClick={() => setCurrentPage(p)}
                    style={{ cursor: 'pointer' }}
                  >
                    {p}
                  </CPaginationItem>
                </React.Fragment>
              ))
            }
            <CPaginationItem 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{ cursor: 'pointer' }}
            >
              Próximo
            </CPaginationItem>
          </CPagination>
        </div>
      )}

      {/* ── Modal de Cadastro ── */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} size="lg" className="modal-premium">
        <CModalHeader>
          <CModalTitle className="fw-bold">{modoEdicao ? 'Editar Vídeo' : 'Novo Vídeo'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <div className="mb-4">
            <label className="form-label fw-bold small text-body-secondary text-uppercase">Título da Videoaula</label>
            <CFormInput 
              value={formData.titulo} 
              onChange={e => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Contabilidade Geral - Balanço Patrimonial"
              className="rounded-3"
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold small text-body-secondary text-uppercase">Link do YouTube / Vimeo</label>
            <CFormInput 
              value={formData.link} 
              onChange={e => setFormData({ ...formData, link: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              className="rounded-3"
            />
            {formData.link && (
              <div className="mt-2 d-flex align-items-center gap-2 text-success small">
                <CIcon icon={cilVideo} size="sm" /> Link detectado: {extrairYouTubeId(formData.link) ? 'YouTube' : 'Outro'}
              </div>
            )}
          </div>

          <div>
            <label className="form-label fw-bold small text-body-secondary text-uppercase">Matéria Relacionada</label>
            <CFormSelect 
              value={formData.materia_ids[0] || ''} 
              onChange={e => {
                const val = e.target.value;
                setFormData({ ...formData, materia_ids: val ? [Number(val)] : [] })
              }}
              className="rounded-3"
            >
              <option value="">Selecione uma matéria...</option>
              {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </CFormSelect>
          </div>
        </CModalBody>
        <CModalFooter className="border-0 p-4">
          <CButton color="secondary" variant="ghost" onClick={() => setModalVisible(false)}>Cancelar</CButton>
          <CButton color="primary" className="px-4 fw-bold" onClick={salvarVideo} disabled={salvando}>
            {salvando ? <CSpinner size="sm" /> : (modoEdicao ? 'Salvar Alterações' : 'Publicar Vídeo')}
          </CButton>
        </CModalFooter>
      </CModal>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .text-truncate-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .fade-in {
          animation: fade-in 0.5s ease;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

export default GestaoVideos
