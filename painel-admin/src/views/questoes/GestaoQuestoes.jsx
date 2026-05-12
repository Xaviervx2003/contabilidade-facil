import React, { useEffect, useState, useCallback } from 'react'
import {
  CAlert, CButton, CCard, CCardBody, CCol, CContainer,
  CForm, CFormInput, CFormSelect, CFormTextarea,
  CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle,
  CRow, CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CSpinner, CBadge, CPagination, CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash, cilSearch, cilReload, cilVideo } from '@coreui/icons'
import { API_URL } from '../../config'
import { useSearchParams } from 'react-router-dom'
import MateriaMultiSelect from '../../components/MateriaMultiSelect'
import { useTheme } from '../../context/themeContext'

const PER_PAGE = 20

const INITIAL_FORM_STATE = {
  id: null,
  materia_ids: [],
  enunciado: '',
  opcao_a: '',
  opcao_b: '',
  opcao_c: '',
  opcao_d: '',
  opcao_e: '',
  resposta_correta: 'A',
  explicacao: '',
  link_video: '',
  banca: '',
  orgao: '',
  cargo: '',
  ano: '',
  escolaridade: '',
  modalidade: '',
}

const GestaoQuestoes = () => {
  const [searchParams] = useSearchParams()
  const buscaInicial = searchParams.get('busca') || ''
  const { isDark } = useTheme()

  const [questoes, setQuestoes] = useState([])
  const [materiasDisponiveis, setMateriasDisponiveis] = useState([])
  const [filtrosOpcoes, setFiltrosOpcoes] = useState({ bancas: [], orgaos: [], cargos: [], anos: [] })
  
  const [filtroBanca, setFiltroBanca] = useState('')
  const [filtroOrgao, setFiltroOrgao] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [searchTerm, setSearchTerm] = useState(buscaInicial)
  const [debouncedSearch, setDebouncedSearch] = useState(buscaInicial)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalQuestoes, setTotalQuestoes] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [modalVisible, setModalVisible] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)

  const carregarMaterias = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/materias`)
      const data = await res.json()
      setMateriasDisponiveis(data)
    } catch (err) { console.error(err) }
  }, [])

  const carregarFiltrosOpcoes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/filtros/questoes`)
      const responseJson = await res.json()
      setFiltrosOpcoes(responseJson.sucesso ? responseJson.dados : responseJson)
    } catch (err) { console.error(err) }
  }, [])

  const carregarQuestoes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: String(PER_PAGE),
      })
      if (debouncedSearch.trim()) params.set('busca', debouncedSearch.trim())
      if (filtroBanca) params.set('banca', filtroBanca)
      if (filtroOrgao) params.set('orgao', filtroOrgao)
      if (filtroAno) params.set('ano', filtroAno)

      const res = await fetch(`${API_URL}/api/questoes?${params.toString()}`)
      const responseJson = await res.json()
      const payload = responseJson.sucesso ? responseJson.dados : responseJson

      setQuestoes(payload.data || [])
      setTotalQuestoes(payload.total || 0)
      setTotalPages(payload.total_pages || 1)
    } catch (err) {
      setError('Erro ao carregar questões.')
    } finally { setLoading(false) }
  }, [currentPage, debouncedSearch, filtroBanca, filtroOrgao, filtroAno])

  useEffect(() => { carregarMaterias(); carregarFiltrosOpcoes(); }, [carregarMaterias, carregarFiltrosOpcoes])
  useEffect(() => { carregarQuestoes(); }, [carregarQuestoes])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const abrirParaNovo = () => { setFormData(INITIAL_FORM_STATE); setModoEdicao(false); setModalVisible(true); }
  const abrirParaEdicao = (q) => {
    setFormData({
      id: q.id,
      materia_ids: q.materia_ids || [],
      enunciado: q.question,
      opcao_a: q.options[0] || '',
      opcao_b: q.options[1] || '',
      opcao_c: q.options[2] || '',
      opcao_d: q.options[3] || '',
      opcao_e: q.options[4] || '',
      resposta_correta: q.answer,
      explicacao: q.explicacao || '',
      link_video: q.link_video || '',
      banca: q.banca || '',
      orgao: q.orgao || '',
      cargo: q.cargo || '',
      ano: q.ano || '',
      escolaridade: q.escolaridade || '',
      modalidade: q.modalidade || '',
    })
    setModoEdicao(true)
    setModalVisible(true)
  }

  const salvarQuestao = async () => {
    try {
      const url = formData.id ? `${API_URL}/api/questoes/${formData.id}` : `${API_URL}/api/questoes`
      const method = formData.id ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setSuccess('Questão salva com sucesso!')
        setModalVisible(false)
        carregarQuestoes()
        setTimeout(() => setSuccess(''), 3000)
      } else { setError('Erro ao salvar questão.') }
    } catch (err) { setError('Erro técnico ao salvar.') }
  }

  const deletarQuestao = async (id) => {
    if (!window.confirm('Excluir esta questão permanentemente?')) return
    try {
      const res = await fetch(`${API_URL}/api/questoes/${id}`, { method: 'DELETE' })
      if (res.ok) { setSuccess('Questão removida!'); carregarQuestoes(); setTimeout(() => setSuccess(''), 3000); }
    } catch (err) { setError('Erro ao excluir.') }
  }

  return (
    <div className="fade-in pb-5" style={{ overflowX: 'hidden' }}>
      <CContainer fluid className="px-3 px-md-4">
        
        {/* HEADER */}
        <div className="header-section mb-4" style={{ padding: '30px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#eee'}` }}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="text-primary fw-bold text-uppercase mb-1" style={{ fontSize: 9, letterSpacing: '0.1em' }}>Painel Admin</div>
              <h2 className="fw-bold mb-0" style={{ letterSpacing: '-0.02em', fontSize: '1.5rem' }}>Gestão de Questões</h2>
              <p className="text-body-secondary mb-0 small">Banco de dados com {totalQuestoes} questões cadastradas.</p>
            </div>
            <CButton color="primary" className="rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center" onClick={abrirParaNovo}>
              + Nova Questão
            </CButton>
          </div>
        </div>

        {/* FILTROS */}
        <div className="glass-card p-3 mb-4 shadow-sm">
          <CRow className="g-3 align-items-end">
            <CCol xs={12} lg={4}>
              <div className="search-pill p-1 d-flex align-items-center bg-body-tertiary border">
                <div className="ps-3"><CIcon icon={cilSearch} className="opacity-50" /></div>
                <CFormInput 
                  placeholder="Pesquisar enunciado ou ID..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="bg-transparent border-0 shadow-none py-2" 
                  style={{ fontSize: 13 }}
                />
              </div>
            </CCol>
            <CCol xs={6} md={3} lg={2}>
              <label className="text-uppercase fw-bold text-body-secondary mb-1 ms-2" style={{ fontSize: 8 }}>Banca</label>
              <CFormSelect size="sm" className="rounded-pill border-0 bg-body-tertiary px-3" value={filtroBanca} onChange={e => setFiltroBanca(e.target.value)} style={{ height: 38, fontSize: 12 }}>
                <option value="">Todas</option>
                {filtrosOpcoes.bancas.map(b => <option key={b} value={b}>{b}</option>)}
              </CFormSelect>
            </CCol>
            <CCol xs={6} md={3} lg={2}>
              <label className="text-uppercase fw-bold text-body-secondary mb-1 ms-2" style={{ fontSize: 8 }}>Ano</label>
              <CFormSelect size="sm" className="rounded-pill border-0 bg-body-tertiary px-3" value={filtroAno} onChange={e => setFiltroAno(e.target.value)} style={{ height: 38, fontSize: 12 }}>
                <option value="">Todos</option>
                {filtrosOpcoes.anos.map(a => <option key={a} value={a}>{a}</option>)}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={6} lg={2} className="d-flex align-items-center">
              <CButton color="secondary" variant="ghost" className="rounded-pill w-100 fw-bold" style={{ fontSize: 11, height: 38 }} onClick={() => { setSearchTerm(''); setFiltroBanca(''); setFiltroAno(''); }}>
                <CIcon icon={cilReload} className="me-1" size="sm" /> Limpar
              </CButton>
            </CCol>
          </CRow>
        </div>

        {/* TABELA */}
        <CCard className="glass-card border-0 shadow-sm overflow-hidden">
          <CCardBody className="p-0">
            {loading ? (
              <div className="text-center py-5"><CSpinner color="primary" /></div>
            ) : (
              <div className="table-responsive">
                <CTable hover align="middle" className="mb-0" style={{ fontSize: 12 }}>
                  <CTableHead className="bg-body-tertiary">
                    <CTableRow>
                      <CTableHeaderCell className="ps-4">ID</CTableHeaderCell>
                      <CTableHeaderCell>Questão</CTableHeaderCell>
                      <CTableHeaderCell>Banca/Ano</CTableHeaderCell>
                      <CTableHeaderCell>Vídeo</CTableHeaderCell>
                      <CTableHeaderCell className="text-end pe-4">Ações</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {questoes.map(q => (
                      <CTableRow key={q.id}>
                        <CTableDataCell className="ps-4 fw-bold text-primary">#{q.id}</CTableDataCell>
                        <CTableDataCell>
                          <div className="text-truncate" style={{ maxWidth: 350 }}>{q.question}</div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="fw-bold">{q.banca}</div>
                          <div className="text-body-secondary" style={{ fontSize: 10 }}>{q.ano}</div>
                        </CTableDataCell>
                        <CTableDataCell>
                          {q.link_video ? <CBadge color="danger" className="rounded-pill bg-opacity-10 text-danger border-0">VÍDEO</CBadge> : <span className="opacity-25">—</span>}
                        </CTableDataCell>
                        <CTableDataCell className="text-end pe-4">
                          <CButton color="info" variant="ghost" size="sm" onClick={() => abrirParaEdicao(q)} className="rounded-circle p-2 me-1"><CIcon icon={cilPencil} /></CButton>
                          <CButton color="danger" variant="ghost" size="sm" onClick={() => deletarQuestao(q.id)} className="rounded-circle p-2"><CIcon icon={cilTrash} /></CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </div>
            )}
          </CCardBody>
        </CCard>

        {/* PAGINAÇÃO */}
        {!loading && totalPages > 1 && (
          <div className="d-flex justify-content-center mt-4">
            <CPagination className="shadow-sm rounded-pill overflow-hidden">
              <CPaginationItem disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Anterior</CPaginationItem>
              <CPaginationItem active>{currentPage}</CPaginationItem>
              <CPaginationItem disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Próxima</CPaginationItem>
            </CPagination>
          </div>
        )}
      </CContainer>

      {/* MODAL */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} size="lg" backdrop="static" className="modal-premium">
        <CModalHeader className="border-0">
          <CModalTitle className="fw-bold">{modoEdicao ? 'Editar Questão' : 'Nova Questão'}</CModalTitle>
        </CModalHeader>
        <CModalBody className="p-4">
          <CForm className="row g-3">
            <CCol md={12}>
              <label className="text-uppercase fw-bold text-body-secondary mb-1" style={{ fontSize: 9 }}>Assuntos</label>
              <MateriaMultiSelect materias={materiasDisponiveis} selected={formData.materia_ids} onChange={ids => setFormData({ ...formData, materia_ids: ids })} />
            </CCol>
            <CCol md={12}>
              <label className="text-uppercase fw-bold text-body-secondary mb-1" style={{ fontSize: 9 }}>Enunciado</label>
              <CFormTextarea rows={3} value={formData.enunciado} onChange={e => setFormData({ ...formData, enunciado: e.target.value })} style={{ fontSize: 13, borderRadius: 10 }} />
            </CCol>
            {['a', 'b', 'c', 'd', 'e'].map(l => (
              <CCol md={6} key={l}>
                <CFormInput label={`Opção ${l.toUpperCase()}`} value={formData[`opcao_${l}`]} onChange={e => setFormData({ ...formData, [`opcao_${l}`]: e.target.value })} style={{ fontSize: 12 }} />
              </CCol>
            ))}
            <CCol md={6}>
              <CFormSelect label="Resposta Correta" value={formData.resposta_correta} onChange={e => setFormData({ ...formData, resposta_correta: e.target.value })}>
                {['A','B','C','D','E'].map(l => <option key={l} value={l}>{l}</option>)}
              </CFormSelect>
            </CCol>
            <CCol md={4}><CFormInput label="Banca" value={formData.banca} onChange={e => setFormData({ ...formData, banca: e.target.value })} /></CCol>
            <CCol md={4}><CFormInput label="Ano" value={formData.ano} onChange={e => setFormData({ ...formData, ano: e.target.value })} /></CCol>
            <CCol md={4}><CFormInput label="Vídeo (YouTube)" value={formData.link_video} onChange={e => setFormData({ ...formData, link_video: e.target.value })} /></CCol>
          </CForm>
        </CModalBody>
        <CModalFooter className="border-0">
          <CButton color="secondary" variant="ghost" onClick={() => setModalVisible(false)}>Cancelar</CButton>
          <CButton color="primary" className="rounded-pill px-4 fw-bold" onClick={salvarQuestao}>Salvar</CButton>
        </CModalFooter>
      </CModal>

      {/* ALERTAS */}
      {success && <CAlert color="success" className="position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg border-0 rounded-4" style={{ zIndex: 3000 }}>{success}</CAlert>}
      {error && <CAlert color="danger" className="position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg border-0 rounded-4" style={{ zIndex: 3000 }}>{error}</CAlert>}

      <style>{`
        .glass-card { background: ${isDark ? 'rgba(255,255,255,0.03)' : '#fff'}; border: 1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#eee'}; border-radius: 20px; backdrop-filter: blur(10px); }
        .search-pill { border-radius: 50px; }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default GestaoQuestoes
