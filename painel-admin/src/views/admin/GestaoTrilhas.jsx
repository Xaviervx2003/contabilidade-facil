import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CForm,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash, cilPlus, cilCheck, cilVideo, cilDescription, cilCopy, cilChart } from '@coreui/icons'
import { API_URL } from '../../config'

const GestaoTrilhas = () => {
  const [trilhas, setTrilhas] = useState([])
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals
  const [modalTrilha, setModalTrilha] = useState(false)
  const [modalModulo, setModalModulo] = useState(false)
  const [modalEngajamento, setModalEngajamento] = useState(false)
  const [dadosEngajamento, setDadosEngajamento] = useState([])
  const [loadingEngajamento, setLoadingEngajamento] = useState(false)

  // States for forms
  const [trilhaAtiva, setTrilhaAtiva] = useState(null)
  const [formTrilha, setFormTrilha] = useState({ nome: '', descricao: '', status: 'rascunho', modulos: [] })
  
  const [formModulo, setFormModulo] = useState({
    nome: '',
    descricao: '',
    ordem: 1,
    tipo: 'video', // video, texto, quiz
    link_video: '',
    texto_teorico: '',
    materia_id: '',
    questoes_selecionadas: ''
  })

  const userId = sessionStorage.getItem('userId')

  const carregarDados = async () => {
    setLoading(true)
    setError('')
    try {
      const [resTrilhas, resMaterias] = await Promise.all([
        fetch(`${API_URL}/api/trilhas`),
        fetch(`${API_URL}/api/admin/materias`)
      ])
      
      const dataTrilhas = await resTrilhas.json()
      const dataMaterias = await resMaterias.json()
      
      setTrilhas(Array.isArray(dataTrilhas) ? dataTrilhas : [])
      setMaterias(Array.isArray(dataMaterias) ? dataMaterias : [])
    } catch (err) {
      setError('Erro ao carregar dados do servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // ── Trilhas ──
  const salvarTrilha = async () => {
    try {
      if (trilhaAtiva) {
        // Atualizar
        await fetch(`${API_URL}/api/trilhas/${trilhaAtiva.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: formTrilha.nome,
            descricao: formTrilha.descricao,
            status: formTrilha.status
          })
        })
        setSuccess('Trilha atualizada!')
      } else {
        // Criar nova
        await fetch(`${API_URL}/api/trilhas?usuario_id=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formTrilha)
        })
        setSuccess('Trilha criada!')
      }
      setModalTrilha(false)
      carregarDados()
    } catch (e) {
      setError('Erro ao salvar trilha.')
    }
  }

  const deletarTrilha = async (id) => {
    if (!window.confirm("Certeza que deseja remover esta trilha e todos os seus módulos?")) return
    try {
      await fetch(`${API_URL}/api/trilhas/${id}`, { method: 'DELETE' })
      setSuccess('Trilha removida!')
      carregarDados()
    } catch (e) {
      setError('Erro ao remover trilha.')
    }
  }

  // ── Módulos ──
  const abrirModalModulo = (trilha) => {
    setTrilhaAtiva(trilha)
    setFormModulo({
      nome: '',
      descricao: '',
      ordem: (trilha.modulos?.length || 0) + 1,
      tipo: 'video',
      link_video: '',
      texto_teorico: '',
      materia_id: '',
      questoes_selecionadas: ''
    })
    setModalModulo(true)
  }

  const salvarModulo = async () => {
    try {
      const ordemVal = parseInt(formModulo.ordem)
      const materiaVal = formModulo.tipo === 'quiz' && formModulo.materia_id ? parseInt(formModulo.materia_id) : null

      const payload = {
        nome: formModulo.nome,
        descricao: formModulo.descricao,
        ordem: isNaN(ordemVal) ? 0 : ordemVal,
        link_video: formModulo.tipo === 'video' ? formModulo.link_video : null,
        texto_teorico: formModulo.tipo === 'texto' ? formModulo.texto_teorico : null,
        materia_id: isNaN(materiaVal) ? null : materiaVal,
        questoes_selecionadas: formModulo.questoes_selecionadas ? formModulo.questoes_selecionadas.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : null
      }

      const res = await fetch(`${API_URL}/api/trilhas/${trilhaAtiva.id}/modulos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Erro na API')
      }

      setSuccess('Módulo adicionado!')
      setModalModulo(false)
      carregarDados()
    } catch (e) {
      console.error(e)
      setError(`Erro ao salvar módulo: ${e.message}`)
    }
  }

  const deletarModulo = async (id) => {
    if (!window.confirm("Remover este módulo da trilha?")) return
    try {
      await fetch(`${API_URL}/api/trilhas/modulos/${id}`, { method: 'DELETE' })
      carregarDados()
    } catch (e) {
      setError('Erro ao deletar módulo.')
    }
  }

  const duplicarTrilha = async (id) => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/api/trilhas/${id}/duplicar?usuario_id=${userId}`, { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao duplicar')
      setSuccess('Trilha duplicada com sucesso! (Criada como Rascunho)')
      carregarDados()
    } catch (e) {
      setError('Erro ao duplicar trilha.')
    } finally {
      setLoading(false)
    }
  }

  const verEngajamento = async (trilha) => {
    setTrilhaAtiva(trilha)
    setModalEngajamento(true)
    setLoadingEngajamento(true)
    try {
      const res = await fetch(`${API_URL}/api/trilhas/${trilha.id}/engajamento`)
      const data = await res.json()
      setDadosEngajamento(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingEngajamento(false)
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}
        {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}

        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Gestão de Trilhas de Aprendizagem (Cursos)</strong>
            <CButton color="primary" onClick={() => { setTrilhaAtiva(null); setFormTrilha({ nome: '', descricao: '', status: 'rascunho', modulos: [] }); setModalTrilha(true); }}>
              <CIcon icon={cilPlus} className="me-1" /> Nova Trilha
            </CButton>
          </CCardHeader>

          <CCardBody>
            {loading ? (
              <div className="text-center py-5"><CSpinner /></div>
            ) : trilhas.length === 0 ? (
              <div className="text-center py-5 text-body-secondary">
                Nenhuma trilha criada ainda. Crie sua primeira trilha de aprendizado!
              </div>
            ) : (
              trilhas.map(t => (
                <CCard key={t.id} className="mb-4 border-info">
                  <CCardHeader className="d-flex justify-content-between align-items-center bg-body-tertiary">
                    <div>
                      <h5 className="mb-1">{t.nome}</h5>
                      <div className="small text-body-secondary">{t.descricao}</div>
                      <CBadge color={t.status === 'publicado' ? 'success' : 'warning'} className="mt-2">
                        {t.status.toUpperCase()}
                      </CBadge>
                    </div>
                    <div>
                      <CButton color="info" variant="outline" size="sm" className="me-1" onClick={() => verEngajamento(t)} title="Ver Engajamento de Alunos">
                        <CIcon icon={cilChart} />
                      </CButton>
                      <CButton color="secondary" variant="outline" size="sm" className="me-1" onClick={() => duplicarTrilha(t.id)} title="Duplicar Trilha">
                        <CIcon icon={cilCopy} />
                      </CButton>
                      <CButton color="info" variant="outline" size="sm" className="me-1" onClick={() => { setTrilhaAtiva(t); setFormTrilha(t); setModalTrilha(true) }}>
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton color="danger" variant="outline" size="sm" onClick={() => deletarTrilha(t.id)}>
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </div>
                  </CCardHeader>
                  <CCardBody>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <strong>Módulos ({t.modulos?.length || 0})</strong>
                      <CButton size="sm" color="success" variant="outline" onClick={() => abrirModalModulo(t)}>
                        + Adicionar Módulo
                      </CButton>
                    </div>

                    {t.modulos?.length > 0 ? (
                      <CTable small hover bordered responsive className="mb-0">
                        <CTableHead>
                          <CTableRow>
                            <CTableHeaderCell>#</CTableHeaderCell>
                            <CTableHeaderCell>Nome</CTableHeaderCell>
                            <CTableHeaderCell>Conteúdo</CTableHeaderCell>
                            <CTableHeaderCell>Ações</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {t.modulos.map(m => (
                            <CTableRow key={m.id}>
                              <CTableDataCell className="fw-bold">{m.ordem}</CTableDataCell>
                              <CTableDataCell>
                                {m.nome}
                                <div className="small text-body-secondary">{m.descricao}</div>
                              </CTableDataCell>
                              <CTableDataCell>
                                {m.link_video && <CBadge color="danger"><CIcon icon={cilVideo} /> Vídeo</CBadge>}
                                {m.texto_teorico && <CBadge color="secondary" className="ms-1"><CIcon icon={cilDescription} /> Texto</CBadge>}
                                {m.materia_id && <CBadge color="primary" className="ms-1"><CIcon icon={cilCheck} /> Quiz ({m.materia_nome})</CBadge>}
                                {m.questoes_selecionadas?.length > 0 && <CBadge color="dark" className="ms-1"><CIcon icon={cilCheck} /> {m.questoes_selecionadas.length} Questões Específicas</CBadge>}
                              </CTableDataCell>
                              <CTableDataCell>
                                <CButton size="sm" color="danger" variant="ghost" onClick={() => deletarModulo(m.id)}>
                                  <CIcon icon={cilTrash} />
                                </CButton>
                              </CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    ) : (
                      <div className="text-body-secondary small">Nenhum módulo nesta trilha.</div>
                    )}
                  </CCardBody>
                </CCard>
              ))
            )}
          </CCardBody>
        </CCard>
      </CCol>

      {/* MODAL TRILHA */}
      <CModal visible={modalTrilha} onClose={() => setModalTrilha(false)} backdrop="static">
        <CModalHeader><CModalTitle>{trilhaAtiva ? 'Editar Trilha' : 'Nova Trilha'}</CModalTitle></CModalHeader>
        <CModalBody>
          <CForm>
            <div className="mb-3">
              <label className="form-label fw-bold">Nome da Trilha (Curso)</label>
              <CFormInput value={formTrilha.nome} onChange={e => setFormTrilha({...formTrilha, nome: e.target.value})} placeholder="Ex: Contabilidade para Iniciantes" />
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold">Descrição</label>
              <CFormTextarea value={formTrilha.descricao} onChange={e => setFormTrilha({...formTrilha, descricao: e.target.value})} rows={3} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold">Status</label>
              <CFormSelect value={formTrilha.status} onChange={e => setFormTrilha({...formTrilha, status: e.target.value})}>
                <option value="rascunho">Rascunho (Alunos não veem)</option>
                <option value="publicado">Publicado (Visível para todos)</option>
              </CFormSelect>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setModalTrilha(false)}>Cancelar</CButton>
          <CButton color="primary" onClick={salvarTrilha}>Salvar Trilha</CButton>
        </CModalFooter>
      </CModal>

      {/* MODAL MÓDULO */}
      <CModal visible={modalModulo} onClose={() => setModalModulo(false)} backdrop="static" size="lg">
        <CModalHeader><CModalTitle>Adicionar Módulo na Trilha: {trilhaAtiva?.nome}</CModalTitle></CModalHeader>
        <CModalBody>
          <CForm>
            <CRow className="mb-3">
              <CCol md={2}>
                <label className="form-label fw-bold">Ordem</label>
                <CFormInput type="number" value={formModulo.ordem} onChange={e => setFormModulo({...formModulo, ordem: e.target.value})} />
              </CCol>
              <CCol md={10}>
                <label className="form-label fw-bold">Nome do Módulo (Aula)</label>
                <CFormInput value={formModulo.nome} onChange={e => setFormModulo({...formModulo, nome: e.target.value})} placeholder="Ex: Aula 1 - O que é Ativo?" />
              </CCol>
            </CRow>
            
            <div className="mb-3">
              <label className="form-label fw-bold">Descrição rápida</label>
              <CFormInput value={formModulo.descricao} onChange={e => setFormModulo({...formModulo, descricao: e.target.value})} />
            </div>

            <div className="mb-3 p-3 bg-body-tertiary border rounded">
              <label className="form-label fw-bold">Tipo de Conteúdo Primário</label>
              <CFormSelect value={formModulo.tipo} onChange={e => setFormModulo({...formModulo, tipo: e.target.value})} className="mb-3">
                <option value="video">🎥 Vídeo-Aula (Teoria)</option>
                <option value="texto">📄 Texto / Leitura</option>
                <option value="quiz">📝 Quiz Prático (Exercícios)</option>
              </CFormSelect>

              {formModulo.tipo === 'video' && (
                <div>
                  <label className="form-label">Link do YouTube / Vimeo</label>
                  <CFormInput value={formModulo.link_video} onChange={e => setFormModulo({...formModulo, link_video: e.target.value})} placeholder="https://youtube.com/watch?v=..." />
                </div>
              )}

              {formModulo.tipo === 'texto' && (
                <div>
                  <label className="form-label">Conteúdo Teórico</label>
                  <CFormTextarea value={formModulo.texto_teorico} onChange={e => setFormModulo({...formModulo, texto_teorico: e.target.value})} rows={5} placeholder="Escreva aqui o conteúdo da aula..." />
                </div>
              )}

              {formModulo.tipo === 'quiz' && (
                <div className="mb-3">
                  <label className="form-label">Vincular a qual Matéria de Questões?</label>
                  <CFormSelect value={formModulo.materia_id} onChange={e => setFormModulo({...formModulo, materia_id: e.target.value})} className="mb-3">
                    <option value="">Selecione uma matéria...</option>
                    {materias.map(m => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </CFormSelect>
                  
                  <label className="form-label fw-bold text-primary">Ou selecione Questões Específicas (IDs)</label>
                  <CFormInput 
                    value={formModulo.questoes_selecionadas} 
                    onChange={e => setFormModulo({...formModulo, questoes_selecionadas: e.target.value})} 
                    placeholder="Ex: 12, 45, 89 (Separe por vírgula)"
                  />
                  <small className="text-body-secondary">Se você colocar IDs aqui, o aluno fará apenas essas questões específicas nesta aula.</small>
                </div>
              )}
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setModalModulo(false)}>Cancelar</CButton>
          <CButton color="success" onClick={salvarModulo}>Adicionar Módulo</CButton>
        </CModalFooter>
      </CModal>

      {/* MODAL ENGAJAMENTO */}
      <CModal visible={modalEngajamento} onClose={() => setModalEngajamento(false)} size="lg">
        <CModalHeader><CModalTitle>Engajamento: {trilhaAtiva?.nome}</CModalTitle></CModalHeader>
        <CModalBody>
          {loadingEngajamento ? (
            <div className="text-center py-4"><CSpinner /></div>
          ) : dadosEngajamento.length === 0 ? (
            <div className="text-center py-4 text-body-secondary">Nenhum aluno iniciou esta trilha ainda.</div>
          ) : (
            <CTable align="middle" responsive hover>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Aluno</CTableHeaderCell>
                  <CTableHeaderCell>Matrícula</CTableHeaderCell>
                  <CTableHeaderCell>Progresso</CTableHeaderCell>
                  <CTableHeaderCell>Módulos</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {dadosEngajamento.map(a => (
                  <CTableRow key={a.matricula}>
                    <CTableDataCell className="fw-bold">{a.nome}</CTableDataCell>
                    <CTableDataCell>{a.matricula}</CTableDataCell>
                    <CTableDataCell style={{ width: '150px' }}>
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ flex: 1, height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${a.progresso_percentual}%`, height: '100%', background: a.progresso_percentual === 100 ? '#10b981' : '#6366f1' }} />
                        </div>
                        <span className="small fw-bold">{a.progresso_percentual}%</span>
                      </div>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="light" className="text-dark">
                        {a.concluidos} / {a.total_modulos}
                      </CBadge>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CModalBody>
      </CModal>
    </CRow>
  )
}

export default GestaoTrilhas
