import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CFormSelect,
  CRow,
  CSpinner,
  CBadge,
  CAlert,
} from '@coreui/react'
import { API_URL } from '../../config'

const VideoGallery = () => {
  const [questoesComVideo, setQuestoesComVideo] = useState([])
  const [materias, setMaterias] = useState([])
  const [materiaFiltro, setMateriaFiltro] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const carregarDados = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Carregar matérias para o filtro
      const resMat = await fetch(`${API_URL}/api/admin/materias`)
      const dataMat = await resMat.json()
      setMaterias(dataMat)

      // 2. Carregar questões
      const resQuest = await fetch(`${API_URL}/api/questoes`)
      const dataQuest = await resQuest.json()
      
      // Filtrar apenas as que possuem link de vídeo
      const filtradas = dataQuest.filter(q => q.link_video && q.link_video.trim() !== '')
      setQuestoesComVideo(filtradas)
    } catch (err) {
      setError('Erro ao carregar os vídeos do servidor.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Função auxiliar para converter link em embed
  const obterLinkEmbed = (url) => {
    if (!url) return null;
    let embedUrl = url;
    if (url.includes('youtube.com/watch?v=')) {
      embedUrl = url.replace('watch?v=', 'embed/');
      embedUrl = embedUrl.split('&')[0];
    } else if (url.includes('youtu.be/')) {
      embedUrl = url.replace('youtu.be/', 'www.youtube.com/embed/');
    } else if (url.includes('vimeo.com/')) {
      embedUrl = url.replace('vimeo.com/', 'player.vimeo.com/video/');
    }
    return embedUrl;
  };

  const questoesExibidas = materiaFiltro 
    ? questoesComVideo.filter(q => q.materia_ids && q.materia_ids.includes(parseInt(materiaFiltro)))
    : questoesComVideo

  return (
    <CContainer className="pb-5">
      <CCard className="mb-4 border-0 shadow-sm">
        <CCardHeader className="bg-white border-0 py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h3 className="mb-0 text-primary">🎥 Portal de Vídeo-Aulas</h3>
              <p className="text-muted mb-0">Assista às explicações detalhadas por assunto</p>
            </div>
            <div style={{ minWidth: '250px' }}>
              <label className="form-label small fw-bold text-muted mb-1">Filtrar por Matéria</label>
              <CFormSelect 
                value={materiaFiltro} 
                onChange={(e) => setMateriaFiltro(e.target.value)}
                className="shadow-sm"
              >
                <option value="">Todas as matérias</option>
                {materias.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </CFormSelect>
            </div>
          </div>
        </CCardHeader>
      </CCard>

      {error && <CAlert color="danger">{error}</CAlert>}

      {loading ? (
        <div className="text-center py-5">
          <CSpinner color="primary" />
          <p className="mt-3 text-muted">Buscando aulas disponíveis...</p>
        </div>
      ) : questoesExibidas.length === 0 ? (
        <CCard className="text-center py-5 border-0 bg-light">
          <CCardBody>
            <h4 className="text-muted">Nenhum vídeo encontrado para este filtro.</h4>
            <CButton color="primary" variant="ghost" className="mt-2" onClick={() => setMateriaFiltro('')}>
              Limpar Filtros
            </CButton>
          </CCardBody>
        </CCard>
      ) : (
        <CRow>
          {questoesExibidas.map((q) => (
            <CCol xs={12} md={6} xl={4} key={q.id} className="mb-4">
              <CCard className="h-100 border-0 shadow-sm hover-shadow transition">
                <div className="ratio ratio-16x9">
                  <iframe
                    src={obterLinkEmbed(q.link_video)}
                    title={`Aula ID ${q.id}`}
                    allowFullScreen
                    className="rounded-top"
                  ></iframe>
                </div>
                <CCardBody className="d-flex flex-column">
                  <div className="mb-2">
                    <CBadge color="info" className="me-1">#{q.id}</CBadge>
                    <CBadge color="secondary" variant="outline">{q.assunto || 'Múltiplas Matérias'}</CBadge>
                  </div>
                  <h6 className="card-title text-dark flex-grow-1" style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>
                    {q.question.length > 100 ? q.question.substring(0, 100) + '...' : q.question}
                  </h6>
                  <div className="mt-3 border-top pt-3">
                    <p className="small text-muted mb-2" style={{ fontStyle: 'italic' }}>
                      {q.explicacao ? q.explicacao.substring(0, 60) + '...' : 'Explicação resumida não disponível.'}
                    </p>
                    <CButton 
                      color="primary" 
                      variant="outline" 
                      size="sm" 
                      className="w-100"
                      href={`#/quiz?busca=${q.id}`}
                    >
                      Ver Questão Completa
                    </CButton>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          ))}
        </CRow>
      )}

      <style>
        {`
          .hover-shadow:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
          }
          .transition {
            transition: all 0.3s ease-in-out;
          }
        `}
      </style>
    </CContainer>
  )
}

export default VideoGallery
