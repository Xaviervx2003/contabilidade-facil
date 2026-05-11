import React, { useEffect, useState, useCallback } from 'react'
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

import './GestaoQuestoes.scss'

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
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)

  const carregarMaterias = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/materias`)
      const data = await res.json()
      setMateriasDisponiveis(data)
    } catch (err) {
      console.error('Erro ao carregar matérias', err)
    }
  }, [])

  const carregarFiltrosOpcoes = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/filtros/questoes`)
      const responseJson = await res.json()
      const data = responseJson.sucesso !== undefined ? responseJson.dados : responseJson
      setFiltrosOpcoes(data)
    } catch (err) {
      console.error('Erro ao carregar opções de filtros', err)
    }
  }, [])

  const carregarQuestoes = useCallback(async () => {
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
      const responseJson = await res.json()
      const payload = responseJson.sucesso !== undefined ? responseJson.dados : responseJson

      setQuestoes(payload.data || [])
      setTotalQuestoes(payload.total || 0)
      setTotalPages(payload.total_pages || 1)
    } catch (err) {
      setError('Erro ao carregar questões da API.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearch, filtroBanca, filtroOrgao, filtroCargo, filtroAno])

  useEffect(() => {
    carregarMaterias()
    carregarFiltrosOpcoes()
  }, [carregarMaterias, carregarFiltrosOpcoes])

  useEffect(() => {
    carregarQuestoes()
  }, [carregarQuestoes])

  // Debounce de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Resetar página ao mudar filtros ou busca
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filtroBanca, filtroOrgao, filtroCargo, filtroAno])

  const abrirParaNovo = () => {
    setFormData(INITIAL_FORM_STATE)
    setModoEdicao(false)
    setModalVisible(true)
  }

  const abrirParaEdicao = useCallback((q) => {
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
  }, [])

  const salvarQuestao = async () => {
    setError('')
    setSuccess('')

    const { materia_ids, enunciado, opcao_a, opcao_b, opcao_c, opcao_d, opcao_e, resposta_correta, explicacao, link_video, banca, orgao, cargo, ano, escolaridade, modalidade, id } = formData

    if (materia_ids.length === 0) {
      setError('Por favor, selecione pelo menos uma matéria.')
      return
    }

    try {
      const endpoint = modoEdicao ? `${API_URL}/api/questoes/${id}` : `${API_URL}/api/questoes`
      const method = modoEdicao ? 'PUT' : 'POST'

      const r = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materia_ids,
          enunciado,
          opcao_a,
          opcao_b,
          opcao_c,
          opcao_d,
          opcao_e: opcao_e || null,
          resposta_correta,
          explicacao,
          link_video: link_video || null,
          banca: banca || null,
          orgao: orgao || null,
          cargo: cargo || null,
          ano: ano ? parseInt(ano, 10) : null,
          escolaridade: escolaridade || null,
          modalidade: modalidade || null,
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

  const deletarQuestao = useCallback(async (id) => {
    if (!window.confirm('Certeza que deseja deletar permanentemente esta questão?')) return

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
  }, [carregarQuestoes])

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
    <CRow className='gestao-questoes-container'>
      <CCol xs={12}>
        {error && <CAlert color='danger' dismissible onClose={() => setError('')}>{error}</CAlert>}
        {success && <CAlert color='success' dismissible onClose={() => setSuccess('')}>{success}</CAlert>}

        <CCard className='mb-4 premium-card'>
          <CCardHeader className='d-flex flex-column gap-3'>
            <div className='d-flex flex-column flex-lg-row justify-content-between gap-3'>
              <div>
                <div className="text-uppercase text-body-secondary small fw-semibold" style={{ letterSpacing: '0.05em' }}>Banco de Itens</div>
                <h3 className="mb-1 fw-bold">Gestão de Questões</h3>
                <div className="text-body-secondary small">
                  Administração de questões, gabaritos e comentários técnicos.
                </div>
              </div>
              <div className='d-flex align-items-center flex-wrap gap-2 mt-2 mt-md-0 w-100 justify-content-md-end'>
                <CInputGroup style={{ maxWidth: '100%', width: 'auto', flex: '1 1 250px' }}>
                  <CInputGroupText className='bg-transparent border-end-0'><CIcon icon={cilSearch} size='sm' /></CInputGroupText>
                  <CFormInput
                    className='search-input-premium border-start-0'
                    placeholder='Buscar enunciado ou matéria...'
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                  />
                </CInputGroup>
                <div className='d-flex gap-2 flex-grow-1 flex-md-grow-0'>
                  <input
                    type='file'
                    accept='.csv'
                    id='csv-import-input'
                    style={{ display: 'none' }}
                    onChange={handleCsvImport}
                  />
                  <CButton
                    color='success'
                    variant='outline'
                    className='btn-premium flex-grow-1 flex-md-grow-0'
                    onClick={() => document.getElementById('csv-import-input').click()}
                    title='Importar via CSV'
                  >
                    <CIcon icon={cilCloudUpload} className='me-1' /> CSV
                  </CButton>
                  <CButton color='primary' onClick={abrirParaNovo} className='btn-premium flex-grow-1 flex-md-grow-0'>
                    + Nova Questão
                  </CButton>
                </div>
              </div>
            </div>

            {/* Filtros Avançados */}
            <CRow className='g-3 glass-filter-bar p-3 mb-2 mx-0'>
              <CCol xs='12' md='3'>
                <label className='small fw-bold text-secondary mb-1'>Banca</label>
                <CFormSelect
                  size='sm'
                  className='search-input-premium'
                  value={filtroBanca}
                  onChange={(e) => setFiltroBanca(e.target.value)}
                >
                  <option value=''>Todas as Bancas</option>
                  {filtrosOpcoes.bancas?.map(b => <option key={b} value={b}>{b}</option>)}
                </CFormSelect>
              </CCol>
              <CCol xs='12' md='3'>
                <label className='small fw-bold text-secondary mb-1'>Órgão</label>
                <CFormSelect
                  size='sm'
                  className='search-input-premium'
                  value={filtroOrgao}
                  onChange={(e) => setFiltroOrgao(e.target.value)}
                >
                  <option value=''>Todos os Órgãos</option>
                  {filtrosOpcoes.orgaos?.map(o => <option key={o} value={o}>{o}</option>)}
                </CFormSelect>
              </CCol>
              <CCol xs='12' md='3'>
                <label className='small fw-bold text-secondary mb-1'>Cargo</label>
                <CFormSelect
                  size='sm'
                  className='search-input-premium'
                  value={filtroCargo}
                  onChange={(e) => setFiltroCargo(e.target.value)}
                >
                  <option value=''>Todos os Cargos</option>
                  {filtrosOpcoes.cargos?.map(c => <option key={c} value={c}>{c}</option>)}
                </CFormSelect>
              </CCol>
              <CCol xs='12' md='3'>
                <label className='small fw-bold text-secondary mb-1'>Ano</label>
                <CFormSelect
                  size='sm'
                  className='search-input-premium'
                  value={filtroAno}
                  onChange={(e) => setFiltroAno(e.target.value)}
                >
                  <option value=''>Todos os Anos</option>
                  {filtrosOpcoes.anos?.map(a => <option key={a} value={a}>{a}</option>)}
                </CFormSelect>
              </CCol>
            </CRow>
          </CCardHeader>

          <CCardBody>
            <CTable align='middle' className='mb-0 premium-table' hover responsive>
              <CTableHead className="bg-body-tertiary">
                <CTableRow>
                  <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold ps-4">ID</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold">Matérias</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold">Enunciado</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold text-center">Mídia</CTableHeaderCell>
                  <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold text-center pe-4">Ações</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {loading ? (
                  <CTableRow><CTableDataCell colSpan='5' className='text-center py-5'><CSpinner color='primary' /></CTableDataCell></CTableRow>
                ) : questoes.length === 0 ? (
                  <CTableRow><CTableDataCell colSpan='5' className='text-center py-5 text-body-secondary'>Nenhuma questão encontrada.</CTableDataCell></CTableRow>
                ) : questoes.map((q) => (
                  <CTableRow key={q.id}>
                    <CTableDataCell>
                      <span className='fw-bold text-primary'>#{q.id}</span>
                    </CTableDataCell>
                    <CTableDataCell>
                      {q.materias_nomes ? (
                        <div className='small text-primary fw-medium' style={{ maxWidth: '200px' }}>{q.materias_nomes}</div>
                      ) : (
                        <span className='small text-body-secondary fst-italic'>{q.assunto || 'Multi-Matéria'}</span>
                      )}
                    </CTableDataCell>
                    <CTableDataCell>
                      <div style={{ maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={q.question}>
                        {q.question}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell className='text-center'>
                      {q.link_video
                        ? <CBadge className='badge-video' title={q.link_video}>▶ VÍDEO</CBadge>
                        : <span className='text-body-secondary small'>—</span>
                      }
                    </CTableDataCell>
                    <CTableDataCell className='text-center'>
                      <div className='d-flex justify-content-center gap-1'>
                        <CButton color='info' variant='ghost' size='sm' className='btn-premium' onClick={() => abrirParaEdicao(q)}>
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton color='danger' variant='ghost' size='sm' className='btn-premium' onClick={() => deletarQuestao(q.id)}>
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </div>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>

            {totalPages > 1 && (
              <div className='d-flex justify-content-between align-items-center mt-4'>
                <small className='text-body-secondary fw-medium'>
                  Exibindo {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, totalQuestoes)} de {totalQuestoes}
                </small>
                <CPagination size='sm' aria-label='Navegação de questões' className='mb-0'>
                  <CPaginationItem
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    style={{ cursor: 'pointer' }}
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
                          style={{ cursor: 'pointer' }}
                        >
                          {p}
                        </CPaginationItem>
                      </React.Fragment>
                    ))}
                  <CPaginationItem
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    style={{ cursor: 'pointer' }}
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
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} size='lg' backdrop='static' className='modal-premium'>
        <CModalHeader>
          <CModalTitle>{modoEdicao ? 'Editar Questão' : 'Criar Nova Questão'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <span className='section-label'>Vínculo Pedagógico</span>
            <div className='mb-4 p-3 border rounded bg-body-tertiary shadow-sm'>
              <label className='fw-bold mb-2'>Matérias Relacionadas</label>
              <MateriaMultiSelect
                materias={materiasDisponiveis}
                selected={formData.materia_ids.map(String)}
                onChange={(selected) => setFormData({ ...formData, materia_ids: selected.map(Number) })}
              />
            </div>

            <span className='section-label'>Dados do Concurso</span>
            <div className='mb-4 p-3 border rounded bg-body-tertiary shadow-sm'>
              <CRow className='g-3'>
                <CCol md={4}>
                  <label className='form-label fw-bold small'>Banca</label>
                  <CFormInput className='search-input-premium' value={formData.banca} onChange={(e) => setFormData({ ...formData, banca: e.target.value })} placeholder='Ex: FGV, CESPE' />
                </CCol>
                <CCol md={4}>
                  <label className='form-label fw-bold small'>Órgão</label>
                  <CFormInput className='search-input-premium' value={formData.orgao} onChange={(e) => setFormData({ ...formData, orgao: e.target.value })} placeholder='Ex: Receita Federal' />
                </CCol>
                <CCol md={4}>
                  <label className='form-label fw-bold small'>Cargo</label>
                  <CFormInput className='search-input-premium' value={formData.cargo} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} placeholder='Ex: Auditor' />
                </CCol>
                <CCol md={4}>
                  <label className='form-label fw-bold small'>Ano</label>
                  <CFormInput className='search-input-premium' type='number' value={formData.ano} onChange={(e) => setFormData({ ...formData, ano: e.target.value })} placeholder='Ex: 2024' />
                </CCol>
                <CCol md={4}>
                  <label className='form-label fw-bold small'>Escolaridade</label>
                  <CFormInput className='search-input-premium' value={formData.escolaridade} onChange={(e) => setFormData({ ...formData, escolaridade: e.target.value })} placeholder='Ex: Nível Superior' />
                </CCol>
                <CCol md={4}>
                  <label className='form-label fw-bold small'>Modalidade</label>
                  <CFormInput className='search-input-premium' value={formData.modalidade} onChange={(e) => setFormData({ ...formData, modalidade: e.target.value })} placeholder='Ex: Múltipla Escolha' />
                </CCol>
              </CRow>
            </div>

            <span className='section-label'>Conteúdo da Questão</span>
            <div className='mb-3'>
              <label className='fw-bold form-label small'>Enunciado / Pergunta</label>
              <CFormTextarea
                className='search-input-premium'
                rows={4}
                value={formData.enunciado}
                onChange={(e) => setFormData({ ...formData, enunciado: e.target.value })}
                placeholder='Digite a pergunta completa aqui...'
              />
            </div>

            <CRow className='mb-3 g-3'>
              <CCol md={6}>
                <label className='fw-bold form-label small'>Opção A</label>
                <CFormInput className='search-input-premium' value={formData.opcao_a} onChange={(e) => setFormData({ ...formData, opcao_a: e.target.value })} />
              </CCol>
              <CCol md={6}>
                <label className='fw-bold form-label small'>Opção B</label>
                <CFormInput className='search-input-premium' value={formData.opcao_b} onChange={(e) => setFormData({ ...formData, opcao_b: e.target.value })} />
              </CCol>
              <CCol md={6}>
                <label className='fw-bold form-label small'>Opção C</label>
                <CFormInput className='search-input-premium' value={formData.opcao_c} onChange={(e) => setFormData({ ...formData, opcao_c: e.target.value })} />
              </CCol>
              <CCol md={6}>
                <label className='fw-bold form-label small'>Opção D</label>
                <CFormInput className='search-input-premium' value={formData.opcao_d} onChange={(e) => setFormData({ ...formData, opcao_d: e.target.value })} />
              </CCol>
            </CRow>

            <div className='mb-4'>
              <label className='fw-bold form-label small'>
                Opção E <span className='text-body-secondary fw-normal'>(opcional)</span>
              </label>
              <CFormInput
                className='search-input-premium'
                value={formData.opcao_e}
                onChange={(e) => setFormData({ ...formData, opcao_e: e.target.value })}
                placeholder='Deixe em branco para 4 alternativas'
              />
            </div>

            <div className="text-uppercase text-body-secondary small fw-semibold mb-2" style={{ letterSpacing: '0.05em' }}>Gabarito e Comentários</div>
            <CRow className='align-items-start g-3 mb-4'>
              <CCol md={4}>
                <label className='form-label fw-bold small text-primary'>Gabarito Oficial</label>
                <CFormSelect
                  className='search-input-premium'
                  value={formData.resposta_correta}
                  onChange={(e) => setFormData({ ...formData, resposta_correta: e.target.value })}
                >
                  <option value='A'>Alternativa A</option>
                  <option value='B'>Alternativa B</option>
                  <option value='C'>Alternativa C</option>
                  <option value='D'>Alternativa D</option>
                  <option value='E'>Alternativa E</option>
                </CFormSelect>
              </CCol>

              <CCol md={8}>
                <label className='fw-bold form-label small'>💡 Explicação Técnica</label>
                <CFormTextarea
                  className='search-input-premium'
                  rows={3}
                  value={formData.explicacao}
                  onChange={(e) => setFormData({ ...formData, explicacao: e.target.value })}
                  placeholder='Opcional. Por que essa é a resposta certa?'
                />
              </CCol>
            </CRow>

            <span className='section-label text-danger'>Conteúdo em Vídeo</span>
            <div className='mb-3 p-3 border-start border-start-4 border-danger rounded bg-body-tertiary shadow-sm'>
              <label className='fw-bold form-label text-danger small'>
                🎬 Link da Videoaula (YouTube/Vimeo)
              </label>
              <CFormInput
                className='search-input-premium'
                value={formData.link_video}
                onChange={(e) => setFormData({ ...formData, link_video: e.target.value })}
                placeholder='https://www.youtube.com/watch?v=...'
              />
              <small className='text-body-secondary mt-2 d-block'>
                O player será exibido automaticamente para os alunos que possuírem acesso.
              </small>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter className='border-top-0'>
          <CButton color='secondary' variant='ghost' className='btn-premium' onClick={() => setModalVisible(false)}>
            Cancelar
          </CButton>
          <CButton color='primary' className='btn-premium px-4' onClick={salvarQuestao}>
            {modoEdicao ? 'Salvar Alterações' : 'Publicar Questão'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default GestaoQuestoes
