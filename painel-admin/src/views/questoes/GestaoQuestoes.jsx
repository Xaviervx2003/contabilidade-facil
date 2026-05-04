import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CFormCheck,
  CSpinner,
  CInputGroup,
  CInputGroupText,
  CBadge,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash, cilSearch, cilCloudUpload } from '@coreui/icons'
import { API_URL } from '../../config'

import { useSearchParams } from 'react-router-dom'
import MateriaMultiSelect from '../../components/MateriaMultiSelect'

const PER_PAGE = 20

const GestaoQuestoes = () => {
  const [searchParams] = useSearchParams()
  const buscaInicial = searchParams.get('busca') || ''

  const [questoes, setQuestoes] = useState([])
  const [materiasDisponiveis, setMateriasDisponiveis] = useState([])
  
  // Opções para os selects de filtro
  const [filtrosOpcoes, setFiltrosOpcoes] = useState({ bancas: [], orgaos: [], cargos: [], anos: [] })
  
  // Valores selecionados nos filtros
  const [filtroBanca, setFiltroBanca] = useState('')
  const [filtroOrgao, setFiltroOrgao] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('')
  const [filtroAno, setFiltroAno] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState(buscaInicial)
  const [debouncedSearch, setDebouncedSearch] = useState(buscaInicial)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalQuestoes, setTotalQuestoes] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [modalVisible, setModalVisible] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)

  const [formData, setFormData] = useState({
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
    link_video: '',        // ← FASE 1: Link de vídeo opcional
    banca: '',
    orgao: '',
    cargo: '',
    ano: '',
    escolaridade: '',
    modalidade: '',
  })

  const carregarMaterias = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/materias`)
      const data = await res.json()
      setMateriasDisponiveis(data)
    } catch (err) {
      console.error("Erro ao carregar matérias", err)
    }
  }

  const carregarFiltrosOpcoes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/filtros/questoes`)
      const data = await res.json()
      setFiltrosOpcoes(data)
    } catch (err) {
      console.error("Erro ao carregar opções de filtros", err)
    }
  }

  // Debounce de busca (400ms) para não sobrecarregar a API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Resetar página ao mudar filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filtroBanca, filtroOrgao, filtroCargo, filtroAno])

  const carregarQuestoes = async () => {
    setLoading(true)
    setError('')
    try {
      const userId = sessionStorage.getItem('userId')
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: String(PER_PAGE),
      })
      if (userId) params.set('usuario_id', userId)
      if (debouncedSearch.trim()) params.set('busca', debouncedSearch.trim())
      if (filtroBanca) params.set('banca', filtroBanca)
      if (filtroOrgao) params.set('orgao', filtroOrgao)
      if (filtroCargo) params.set('cargo', filtroCargo)
      if (filtroAno) params.set('ano', filtroAno)

      const res = await fetch(`${API_URL}/api/questoes?${params.toString()}`)
      const data = await res.json()

      // Resposta paginada: { data: [...], total, page, per_page, total_pages }
      setQuestoes(data.data || [])
      setTotalQuestoes(data.total || 0)
      setTotalPages(data.total_pages || 1)
    } catch (err) {
      setError('Erro ao carregar questões da API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarMaterias()
    carregarFiltrosOpcoes()
  }, [])

  // Recarrega sempre que a página ou a busca muda
  useEffect(() => {
    carregarQuestoes()
  }, [currentPage, debouncedSearch, filtroBanca, filtroOrgao, filtroCargo, filtroAno])

  const abrirParaNovo = () => {
    setFormData({
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
      link_video: '',      // ← FASE 1
      banca: '',
      orgao: '',
      cargo: '',
      ano: '',
      escolaridade: '',
      modalidade: '',
    })
    setModoEdicao(false)
    setModalVisible(true)
  }

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
      link_video: q.link_video || '',   // ← FASE 1: Carrega o link existente
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

  const toggleMateria = (materiaId) => {
    setFormData((prev) => {
      const jaSelecionada = prev.materia_ids.includes(materiaId)
      return {
        ...prev,
        materia_ids: jaSelecionada
          ? prev.materia_ids.filter(id => id !== materiaId)
          : [...prev.materia_ids, materiaId]
      }
    })
  }

  const salvarQuestao = async () => {
    setError('')
    setSuccess('')

    if (formData.materia_ids.length === 0) {
      setError('Por favor, selecione pelo menos uma matéria.')
      return
    }

    try {
      const endpoint = modoEdicao ? `${API_URL}/api/questoes/${formData.id}` : `${API_URL}/api/questoes`
      const method = modoEdicao ? 'PUT' : 'POST'

      const r = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materia_ids: formData.materia_ids,
          enunciado: formData.enunciado,
          opcao_a: formData.opcao_a,
          opcao_b: formData.opcao_b,
          opcao_c: formData.opcao_c,
          opcao_d: formData.opcao_d,
          opcao_e: formData.opcao_e || null,
          resposta_correta: formData.resposta_correta,
          explicacao: formData.explicacao,
          link_video: formData.link_video || null,  // ← FASE 1: Envia null se vazio
          banca: formData.banca || null,
          orgao: formData.orgao || null,
          cargo: formData.cargo || null,
          ano: formData.ano ? parseInt(formData.ano) : null,
          escolaridade: formData.escolaridade || null,
          modalidade: formData.modalidade || null,
        }),
      })

      const resData = await r.json()
      if (resData.sucesso) {
        setSuccess(resData.mensagem)
        setModalVisible(false)
        carregarQuestoes()
      } else {
        setError(resData.mensagem || 'Erro ao salvar a questão.')
      }
    } catch (err) {
      setError('Erro na conexão com o servidor ao salvar a questão.')
    }
  }

  const deletarQuestao = async (id) => {
    if (!window.confirm("Certeza que deseja deletar permanentemente esta questão?")) return

    setError('')
    setSuccess('')
    try {
      const r = await fetch(`${API_URL}/api/questoes/${id}`, { method: 'DELETE' })
      const resData = await r.json()
      if (resData.sucesso) {
        setSuccess('Questão deletada com sucesso.')
        carregarQuestoes()
      } else {
        setError(resData.mensagem)
      }
    } catch (err) {
      setError('Erro na exclusão.')
    }
  }

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError('')
    setSuccess('')
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('arquivo', file)
      const res = await fetch(`${API_URL}/api/questoes/importar-csv`, {
        method: 'POST',
        body: formDataUpload,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Erro no upload')
      setSuccess(data.mensagem)
      if (data.erros?.length) {
        setError(`Avisos: ${data.erros.join(' | ')}`)
      }
      carregarQuestoes()
    } catch (err) {
      setError(err.message || 'Erro ao importar CSV.')
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}
        {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}

        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <strong>Gestão de Questões do Quiz</strong>
                <CBadge color="secondary">{totalQuestoes} questões</CBadge>
              </div>
              <div className="d-flex align-items-center flex-wrap gap-2 mt-2 mt-md-0 w-100 justify-content-md-end">
                <CInputGroup style={{ maxWidth: '100%', width: 'auto', flex: '1 1 250px' }}>
                  <CInputGroupText><CIcon icon={cilSearch} size="sm" /></CInputGroupText>
                  <CFormInput
                    placeholder="Buscar enunciado ou matéria..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                  />
                </CInputGroup>
                <div className="d-flex gap-2 flex-grow-1 flex-md-grow-0">
                  <input
                    type="file"
                    accept=".csv"
                    id="csv-import-input"
                    style={{ display: 'none' }}
                    onChange={handleCsvImport}
                  />
                  <CButton
                    color="success"
                    variant="outline"
                    className="flex-grow-1 flex-md-grow-0"
                    onClick={() => document.getElementById('csv-import-input').click()}
                    title="Importar via CSV"
                  >
                    <CIcon icon={cilCloudUpload} className="me-1" /> CSV
                  </CButton>
                  <CButton color="primary" onClick={abrirParaNovo} className="flex-grow-1 flex-md-grow-0">
                    + Nova
                  </CButton>
                </div>
              </div>
            </div>

            {/* Filtros Avançados */}
            <CRow className="g-2 bg-light p-2 rounded mx-0 border">
              <CCol xs="12" md="3">
                <CFormSelect
                  size="sm"
                  value={filtroBanca}
                  onChange={(e) => setFiltroBanca(e.target.value)}
                >
                  <option value="">Todas as Bancas</option>
                  {filtrosOpcoes.bancas?.map(b => <option key={b} value={b}>{b}</option>)}
                </CFormSelect>
              </CCol>
              <CCol xs="12" md="3">
                <CFormSelect
                  size="sm"
                  value={filtroOrgao}
                  onChange={(e) => setFiltroOrgao(e.target.value)}
                >
                  <option value="">Todos os Órgãos</option>
                  {filtrosOpcoes.orgaos?.map(o => <option key={o} value={o}>{o}</option>)}
                </CFormSelect>
              </CCol>
              <CCol xs="12" md="3">
                <CFormSelect
                  size="sm"
                  value={filtroCargo}
                  onChange={(e) => setFiltroCargo(e.target.value)}
                >
                  <option value="">Todos os Cargos</option>
                  {filtrosOpcoes.cargos?.map(c => <option key={c} value={c}>{c}</option>)}
                </CFormSelect>
              </CCol>
              <CCol xs="12" md="3">
                <CFormSelect
                  size="sm"
                  value={filtroAno}
                  onChange={(e) => setFiltroAno(e.target.value)}
                >
                  <option value="">Todos os Anos</option>
                  {filtrosOpcoes.anos?.map(a => <option key={a} value={a}>{a}</option>)}
                </CFormSelect>
              </CCol>
            </CRow>
          </CCardHeader>

          <CCardBody>
            <CTable align="middle" className="mb-0 border" hover responsive>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>ID</CTableHeaderCell>
                  <CTableHeaderCell>Matérias</CTableHeaderCell>
                  <CTableHeaderCell>Enunciado</CTableHeaderCell>
                  {/* ← FASE 1: Coluna de vídeo na tabela */}
                  <CTableHeaderCell className="text-center">Vídeo</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Ações</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {loading ? (
                  <CTableRow><CTableDataCell colSpan="5" className="text-center py-4"><CSpinner color="primary" /></CTableDataCell></CTableRow>
                ) : questoes.length === 0 ? (
                  <CTableRow><CTableDataCell colSpan="5" className="text-center py-4 text-muted">Nenhuma questão encontrada.</CTableDataCell></CTableRow>
                ) : questoes.map((q) => (
                  <CTableRow key={q.id}>
                    <CTableDataCell>
                      <strong>#{q.id}</strong>
                    </CTableDataCell>
                    <CTableDataCell>
                      {q.materias_nomes ? (
                        <span className="small text-primary fw-medium">{q.materias_nomes}</span>
                      ) : (
                        <span className="small text-muted fst-italic">{q.assunto || 'Multi-Matéria'}</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {q.question}
                      </div>
                    </CTableDataCell>
                    {/* ← FASE 1: Indicador visual se a questão tem vídeo */}
                    <CTableDataCell className="text-center">
                      {q.link_video
                        ? <CBadge color="danger" title={q.link_video}>▶ Vídeo</CBadge>
                        : <span className="text-muted small">—</span>
                      }
                    </CTableDataCell>
                    <CTableDataCell className="text-center">
                      <CButton color="info" variant="ghost" onClick={() => abrirParaEdicao(q)}>
                        <CIcon icon={cilPencil} /> Editar
                      </CButton>
                      <CButton color="danger" variant="ghost" className="ms-2" onClick={() => deletarQuestao(q.id)}>
                        <CIcon icon={cilTrash} /> Excluir
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>

            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <small className="text-muted">
                  Mostrando {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, totalQuestoes)} de {totalQuestoes}
                </small>
                <CPagination size="sm" aria-label="Navegação de questões">
                  <CPaginationItem
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    ‹
                  </CPaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <CPaginationItem disabled>…</CPaginationItem>
                        )}
                        <CPaginationItem
                          active={p === currentPage}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </CPaginationItem>
                      </React.Fragment>
                    ))}
                  <CPaginationItem
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    ›
                  </CPaginationItem>
                </CPagination>
              </div>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      {/* Modal de Criação / Edição */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} size="lg" backdrop="static">
        <CModalHeader>
          <CModalTitle>{modoEdicao ? 'Editar Questão' : 'Criar Nova Questão'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>

            {/* CHECKBOXES DE MATÉRIAS */}
            <div className="mb-4 p-3 border rounded bg-light">
              <label className="fw-bold mb-2">Vincular a quais matérias?</label>
              <MateriaMultiSelect 
                materias={materiasDisponiveis} 
                selected={formData.materia_ids.map(String)} 
                onChange={(selected) => setFormData({ ...formData, materia_ids: selected.map(Number) })}
              />
            </div>

            <div className="mb-4 p-3 border rounded bg-light">
              <label className="fw-bold mb-3 d-block text-primary">Metadados do Concurso</label>
              <CRow className="g-3">
                <CCol md={4}>
                  <label className="form-label fw-bold">Banca</label>
                  <CFormInput value={formData.banca} onChange={e => setFormData({ ...formData, banca: e.target.value })} placeholder="Ex: FGV, CESPE" />
                </CCol>
                <CCol md={4}>
                  <label className="form-label fw-bold">Órgão</label>
                  <CFormInput value={formData.orgao} onChange={e => setFormData({ ...formData, orgao: e.target.value })} placeholder="Ex: Receita Federal" />
                </CCol>
                <CCol md={4}>
                  <label className="form-label fw-bold">Cargo</label>
                  <CFormInput value={formData.cargo} onChange={e => setFormData({ ...formData, cargo: e.target.value })} placeholder="Ex: Auditor" />
                </CCol>
                <CCol md={4}>
                  <label className="form-label fw-bold">Ano</label>
                  <CFormInput type="number" value={formData.ano} onChange={e => setFormData({ ...formData, ano: e.target.value })} placeholder="Ex: 2024" />
                </CCol>
                <CCol md={4}>
                  <label className="form-label fw-bold">Escolaridade</label>
                  <CFormInput value={formData.escolaridade} onChange={e => setFormData({ ...formData, escolaridade: e.target.value })} placeholder="Ex: Nível Superior" />
                </CCol>
                <CCol md={4}>
                  <label className="form-label fw-bold">Modalidade</label>
                  <CFormInput value={formData.modalidade} onChange={e => setFormData({ ...formData, modalidade: e.target.value })} placeholder="Ex: Múltipla Escolha" />
                </CCol>
              </CRow>
            </div>

            <div className="mb-3">
              <label className="fw-bold form-label">Enunciado / Pergunta</label>
              <CFormTextarea
                rows={3}
                value={formData.enunciado}
                onChange={e => setFormData({ ...formData, enunciado: e.target.value })}
                placeholder="Digite a pergunta completa aqui..."
              />
            </div>

            <CRow className="mb-3">
              <CCol md={6}>
                <label className="fw-bold form-label">Opção A</label>
                <CFormInput value={formData.opcao_a} onChange={e => setFormData({ ...formData, opcao_a: e.target.value })} />
              </CCol>
              <CCol md={6}>
                <label className="fw-bold form-label">Opção B</label>
                <CFormInput value={formData.opcao_b} onChange={e => setFormData({ ...formData, opcao_b: e.target.value })} />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={6}>
                <label className="fw-bold form-label">Opção C</label>
                <CFormInput value={formData.opcao_c} onChange={e => setFormData({ ...formData, opcao_c: e.target.value })} />
              </CCol>
              <CCol md={6}>
                <label className="fw-bold form-label">Opção D</label>
                <CFormInput value={formData.opcao_d} onChange={e => setFormData({ ...formData, opcao_d: e.target.value })} />
              </CCol>
            </CRow>

            <div className="mb-3">
              <label className="fw-bold form-label">
                Opção E <span className="text-muted fw-normal">(opcional — deixe em branco para questões com 4 alternativas)</span>
              </label>
              <CFormInput
                value={formData.opcao_e}
                onChange={e => setFormData({ ...formData, opcao_e: e.target.value })}
                placeholder="Preencha apenas se a questão tiver 5 alternativas"
              />
            </div>

            <CRow className="align-items-end">
              <CCol md={4} className="mb-3">
                <label className="form-label font-bold text-primary">Qual é a resposta correta?</label>
                <CFormSelect
                  value={formData.resposta_correta}
                  onChange={e => setFormData({ ...formData, resposta_correta: e.target.value })}>
                  <option value="A">Alternativa A</option>
                  <option value="B">Alternativa B</option>
                  <option value="C">Alternativa C</option>
                  <option value="D">Alternativa D</option>
                  <option value="E">Alternativa E</option>
                </CFormSelect>
              </CCol>

              <CCol md={8} className="mb-3">
                <label className="fw-bold form-label">💡 Explicação (Aparece após responder)</label>
                <CFormTextarea
                  rows={2}
                  value={formData.explicacao}
                  onChange={e => setFormData({ ...formData, explicacao: e.target.value })}
                  placeholder="Opcional. Por que essa é a resposta certa?"
                />
              </CCol>
            </CRow>

            {/* ✅ FASE 1: Campo de Link do Vídeo */}
            <div className="mb-3 p-3 border rounded" style={{ borderColor: '#e55353', backgroundColor: '#fff5f5' }}>
              <label className="fw-bold form-label" style={{ color: '#c41a1a' }}>
                🎬 Link do Vídeo{' '}
                <span className="text-muted fw-normal" style={{ color: '#666' }}>
                  (opcional — YouTube ou Vimeo)
                </span>
              </label>
              <CFormInput
                value={formData.link_video}
                onChange={e => setFormData({ ...formData, link_video: e.target.value })}
                placeholder="Ex: https://www.youtube.com/watch?v=XXXXXXXXXXX"
              />
              <small className="text-muted mt-1 d-block">
                Cole o link normal do YouTube ou Vimeo. O sistema converte automaticamente para o player embutido.
              </small>
            </div>

          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setModalVisible(false)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={salvarQuestao}>
            {modoEdicao ? 'Salvar Alterações' : 'Criar Questão'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default GestaoQuestoes
