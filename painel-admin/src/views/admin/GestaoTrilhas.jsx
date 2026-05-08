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
import { cilPlus, cilPencil, cilTrash, cilVideo, cilCheck, cilDescription, cilChart, cilChartLine, cilChatBubble, cilUser, cilCheckCircle } from '@coreui/icons'
import { API_URL } from '../../config'

const GestaoTrilhas = () => {
  const [trilhas, setTrilhas] = useState([])
  const [materias, setMaterias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [modalTrilha, setModalTrilha] = useState(false)
  const [modalModulo, setModalModulo] = useState(false)
  const [modalEngajamento, setModalEngajamento] = useState(false)
  const [modalDuvidas, setModalDuvidas] = useState(false)
  const [dadosEngajamento, setDadosEngajamento] = useState([])
  const [duvidasPendentes, setDuvidasPendentes] = useState([])
  const [loadingEngajamento, setLoadingEngajamento] = useState(false)
  const [respostaDuvida, setRespostaDuvida] = useState('')
  const [respondendoId, setRespondendoId] = useState(null)

  const [trilhaAtiva, setTrilhaAtiva] = useState(null)
  const [formTrilha, setFormTrilha] = useState({ nome: '', descricao: '', status: 'rascunho', capa_url: '', nivel: '', modulos: [] })

  const [formModulo, setFormModulo] = useState({
    id: null,
    nome: '',
    descricao: '',
    ordem: 1,
    tipo: 'video',
    link_video: '',
    texto_teorico: '',
    materia_id: '',
    questoes_selecionadas: '',
    duracao_minutos: '',
    material_apoio_url: ''
  })

  const userId = sessionStorage.getItem('userId')

  const carregarDados = async () => {
    setLoading(true)
    setError('')
    try {
      const [resTrilhas, resMaterias, resDuvidas] = await Promise.all([
        fetch(`${API_URL}/api/trilhas`),
        fetch(`${API_URL}/api/admin/materias`),
        fetch(`${API_URL}/api/trilhas/duvidas/pendentes`)
      ])
      const dataTrilhas = await resTrilhas.json()
      const dataMaterias = await resMaterias.json()
      const dataDuvidas = await resDuvidas.json()
      
      setTrilhas(Array.isArray(dataTrilhas) ? dataTrilhas : [])
      setMaterias(Array.isArray(dataMaterias) ? dataMaterias : [])
      setDuvidasPendentes(Array.isArray(dataDuvidas) ? dataDuvidas : [])
    } catch (err) {
      setError('Erro ao carregar dados do servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregarDados() }, [])

  // ── Trilhas ──
  const salvarTrilha = async () => {
    try {
      if (trilhaAtiva) {
        await fetch(`${API_URL}/api/trilhas/${trilhaAtiva.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: formTrilha.nome,
            descricao: formTrilha.descricao,
            status: formTrilha.status,
            capa_url: formTrilha.capa_url || null,
            nivel: formTrilha.nivel || null
          })
        })
        setSuccess('Trilha atualizada!')
      } else {
        await fetch(`${API_URL}/api/trilhas?usuario_id=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formTrilha,
            capa_url: formTrilha.capa_url || null,
            nivel: formTrilha.nivel || null
          })
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
  const abrirModalModulo = (trilha, modulo = null) => {
    setTrilhaAtiva(trilha)
    if (modulo) {
      let tipo = 'video'
      if (modulo.materia_id || (modulo.questoes_selecionadas && modulo.questoes_selecionadas.length > 0)) tipo = 'quiz'
      else if (modulo.texto_teorico && !modulo.link_video) tipo = 'texto'

      setFormModulo({
        id: modulo.id,
        nome: modulo.nome || '',
        descricao: modulo.descricao || '',
        ordem: modulo.ordem,
        tipo,
        link_video: modulo.link_video || '',
        texto_teorico: modulo.texto_teorico || '',
        materia_id: modulo.materia_id || '',
        questoes_selecionadas: modulo.questoes_selecionadas ? modulo.questoes_selecionadas.join(', ') : '',
        duracao_minutos: modulo.duracao_minutos || '',
        material_apoio_url: modulo.material_apoio_url || ''
      })
    } else {
      setFormModulo({
        id: null, nome: '', descricao: '',
        ordem: (trilha.modulos?.length || 0) + 1,
        tipo: 'video', link_video: '', texto_teorico: '',
        materia_id: '', questoes_selecionadas: '',
        duracao_minutos: '', material_apoio_url: ''
      })
    }
    setModalModulo(true)
  }

  const salvarModulo = async () => {
    try {
      const ordemVal = parseInt(formModulo.ordem)
      const materiaVal = formModulo.tipo === 'quiz' && formModulo.materia_id ? parseInt(formModulo.materia_id) : null
      const duracaoVal = formModulo.duracao_minutos ? parseInt(formModulo.duracao_minutos) : null

      const payload = {
        nome: formModulo.nome,
        descricao: formModulo.descricao,
        ordem: isNaN(ordemVal) ? 0 : ordemVal,
        link_video: formModulo.link_video || null,
        texto_teorico: formModulo.texto_teorico || null,
        materia_id: isNaN(materiaVal) ? null : materiaVal,
        questoes_selecionadas: formModulo.questoes_selecionadas
          ? formModulo.questoes_selecionadas.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
          : null,
        duracao_minutos: isNaN(duracaoVal) ? null : duracaoVal,
        material_apoio_url: formModulo.material_apoio_url || null
      }

      let url = `${API_URL}/api/trilhas/${trilhaAtiva.id}/modulos`
      let method = 'POST'
      if (formModulo.id) {
        url = `${API_URL}/api/trilhas/modulos/${formModulo.id}`
        method = 'PUT'
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Erro na API')
      }

      setSuccess(formModulo.id ? 'Módulo atualizado!' : 'Módulo adicionado!')
      setModalModulo(false)
      carregarDados()
    } catch (e) {
      console.error(e)
      setError(`Erro ao deletar: ${e.message}`)
    }
  }

  const responderDuvida = async (id) => {
    if (!respostaDuvida.trim()) return
    try {
      const res = await fetch(`${API_URL}/api/trilhas/duvidas/${id}/responder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resposta: respostaDuvida })
      })
      if (res.ok) {
        setSuccess('Resposta enviada!')
        setRespostaDuvida('')
        setRespondendoId(null)
        carregarDados()
      }
    } catch (e) { setError('Erro ao responder.') }
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
            <div className="d-flex gap-2">
              <CButton color="warning" variant="outline" className="position-relative" onClick={() => setModalDuvidas(true)}>
                <CIcon icon={cilChatBubble} className="me-1" /> Dúvidas Alunos
                {duvidasPendentes.length > 0 && (
                  <CBadge color="danger" position="top-end" shape="rounded-pill">
                    {duvidasPendentes.length}
                  </CBadge>
                )}
              </CButton>
              <CButton color="primary" onClick={() => {
                setTrilhaAtiva(null)
                setFormTrilha({ nome: '', descricao: '', status: 'rascunho', capa_url: '', nivel: '', modulos: [] })
                setModalTrilha(true)
              }}>
                <CIcon icon={cilPlus} className="me-1" /> Nova Trilha
              </CButton>
            </div>
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
                    <div className="d-flex align-items-center gap-3">
                      {t.capa_url && (
                        <img src={t.capa_url} alt="capa" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                      )}
                      <div>
                        <h5 className="mb-1">{t.nome}</h5>
                        <div className="small text-body-secondary">{t.descricao}</div>
                        <div className="d-flex gap-2 mt-1">
                          <CBadge color={t.status === 'publicado' ? 'success' : 'warning'}>
                            {t.status.toUpperCase()}
                          </CBadge>
                          {t.nivel && <CBadge color="info" variant="outline">{t.nivel}</CBadge>}
                        </div>
                      </div>
                    </div>
                    <div>
                      <CButton color="info" variant="outline" size="sm" className="me-1" onClick={() => verEngajamento(t)} title="Ver Engajamento">
                        <CIcon icon={cilChart} />
                      </CButton>
                      <CButton color="secondary" variant="outline" size="sm" className="me-1" onClick={() => duplicarTrilha(t.id)} title="Duplicar Trilha">
                        <CIcon icon={cilCopy} />
                      </CButton>
                      <CButton color="info" variant="outline" size="sm" className="me-1" onClick={() => { setTrilhaAtiva(t); setFormTrilha({ ...t, capa_url: t.capa_url || '', nivel: t.nivel || '' }); setModalTrilha(true) }}>
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
                                {m.duracao_minutos && (
                                  <span className="small text-body-secondary">⏱️ {m.duracao_minutos} min</span>
                                )}
                              </CTableDataCell>
                              <CTableDataCell>
                                {m.link_video && <CBadge color="danger"><CIcon icon={cilVideo} /> Vídeo</CBadge>}
                                {m.texto_teorico && <CBadge color="secondary" className="ms-1"><CIcon icon={cilDescription} /> Texto</CBadge>}
                                {m.materia_id && <CBadge color="primary" className="ms-1"><CIcon icon={cilCheck} /> Quiz ({m.materia_nome})</CBadge>}
                                {m.questoes_selecionadas?.length > 0 && <CBadge color="dark" className="ms-1"><CIcon icon={cilCheck} /> {m.questoes_selecionadas.length} Questões</CBadge>}
                                {m.material_apoio_url && <CBadge color="warning" className="ms-1">📎 Material</CBadge>}
                              </CTableDataCell>
                              <CTableDataCell>
                                <CButton size="sm" color="info" variant="ghost" onClick={() => abrirModalModulo(t, m)} title="Editar Módulo">
                                  <CIcon icon={cilPencil} />
                                </CButton>
                                <CButton size="sm" color="danger" variant="ghost" onClick={() => deletarModulo(m.id)} title="Remover Módulo">
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
              <CFormInput value={formTrilha.nome} onChange={e => setFormTrilha({ ...formTrilha, nome: e.target.value })} placeholder="Ex: Contabilidade para Iniciantes" />
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold">Descrição</label>
              <CFormTextarea value={formTrilha.descricao} onChange={e => setFormTrilha({ ...formTrilha, descricao: e.target.value })} rows={3} />
            </div>
            <CRow className="mb-3">
              <CCol md={8}>
                <label className="form-label fw-bold">Status</label>
                <CFormSelect value={formTrilha.status} onChange={e => setFormTrilha({ ...formTrilha, status: e.target.value })}>
                  <option value="rascunho">Rascunho (Alunos não veem)</option>
                  <option value="publicado">Publicado (Visível para todos)</option>
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <label className="form-label fw-bold">Nível</label>
                <CFormSelect value={formTrilha.nivel} onChange={e => setFormTrilha({ ...formTrilha, nivel: e.target.value })}>
                  <option value="">Não definido</option>
                  <option value="Básico">Básico</option>
                  <option value="Intermediário">Intermediário</option>
                  <option value="Avançado">Avançado</option>
                </CFormSelect>
              </CCol>
            </CRow>
            <div className="mb-3">
              <label className="form-label fw-bold">URL da Imagem de Capa</label>
              <CFormInput
                value={formTrilha.capa_url}
                onChange={e => setFormTrilha({ ...formTrilha, capa_url: e.target.value })}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              {formTrilha.capa_url && (
                <img src={formTrilha.capa_url} alt="preview" className="mt-2 rounded" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
              )}
              <small className="text-body-secondary">Link de uma imagem externa para a capa do curso.</small>
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
        <CModalHeader><CModalTitle>{formModulo.id ? 'Editar Módulo' : 'Adicionar Módulo'}: {trilhaAtiva?.nome}</CModalTitle></CModalHeader>
        <CModalBody>
          <CForm>
            <CRow className="mb-3">
              <CCol md={2}>
                <label className="form-label fw-bold">Ordem</label>
                <CFormInput type="number" value={formModulo.ordem} onChange={e => setFormModulo({ ...formModulo, ordem: e.target.value })} />
              </CCol>
              <CCol md={7}>
                <label className="form-label fw-bold">Nome do Módulo (Aula)</label>
                <CFormInput value={formModulo.nome} onChange={e => setFormModulo({ ...formModulo, nome: e.target.value })} placeholder="Ex: Aula 1 - O que é Ativo?" />
              </CCol>
              <CCol md={3}>
                <label className="form-label fw-bold">Duração (min)</label>
                <CFormInput type="number" min="1" value={formModulo.duracao_minutos} onChange={e => setFormModulo({ ...formModulo, duracao_minutos: e.target.value })} placeholder="Ex: 15" />
              </CCol>
            </CRow>

            <div className="mb-3">
              <label className="form-label fw-bold">Descrição rápida</label>
              <CFormInput value={formModulo.descricao} onChange={e => setFormModulo({ ...formModulo, descricao: e.target.value })} />
            </div>

            <div className="mb-3 p-3 bg-body-tertiary border rounded">
              <label className="form-label fw-bold">Tipo de Conteúdo Primário</label>
              <CFormSelect value={formModulo.tipo} onChange={e => setFormModulo({ ...formModulo, tipo: e.target.value })} className="mb-3">
                <option value="video">🎥 Vídeo + Teoria (Padrão)</option>
                <option value="texto">📄 Apenas Texto / Leitura</option>
                <option value="quiz">📝 Quiz Prático (Exercícios)</option>
              </CFormSelect>

              {formModulo.tipo !== 'quiz' && (
                <>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Link do YouTube / Vimeo</label>
                    <CFormInput value={formModulo.link_video} onChange={e => setFormModulo({ ...formModulo, link_video: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                    <small className="text-body-secondary">O vídeo aparecerá no topo do modal para o aluno.</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Conteúdo Teórico (Apoio)</label>
                    <CFormTextarea value={formModulo.texto_teorico} onChange={e => setFormModulo({ ...formModulo, texto_teorico: e.target.value })} rows={5} placeholder="Escreva aqui o conteúdo da aula..." />
                  </div>
                </>
              )}

              {formModulo.tipo === 'quiz' && (
                <div className="mb-3">
                  <label className="form-label">Vincular a qual Matéria de Questões?</label>
                  <CFormSelect value={formModulo.materia_id} onChange={e => setFormModulo({ ...formModulo, materia_id: e.target.value })} className="mb-3">
                    <option value="">Selecione uma matéria...</option>
                    {materias.map(m => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </CFormSelect>
                  <label className="form-label fw-bold text-primary">Ou selecione Questões Específicas (IDs)</label>
                  <CFormInput
                    value={formModulo.questoes_selecionadas}
                    onChange={e => setFormModulo({ ...formModulo, questoes_selecionadas: e.target.value })}
                    placeholder="Ex: 12, 45, 89 (Separe por vírgula)"
                  />
                  <small className="text-body-secondary">Se colocar IDs aqui, o aluno fará apenas essas questões específicas.</small>
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">📎 Link de Material de Apoio (PDF / Slides)</label>
              <CFormInput
                value={formModulo.material_apoio_url}
                onChange={e => setFormModulo({ ...formModulo, material_apoio_url: e.target.value })}
                placeholder="https://drive.google.com/... ou link direto para PDF"
              />
              <small className="text-body-secondary">O aluno verá um botão de download no modal da aula.</small>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={() => setModalModulo(false)}>Cancelar</CButton>
          <CButton color="success" onClick={salvarModulo}>{formModulo.id ? 'Salvar Alterações' : 'Adicionar Módulo'}</CButton>
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
                      <CBadge color="light" className="text-dark">{a.concluidos} / {a.total_modulos}</CBadge>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CModalBody>
      </CModal>
      {/* MODAL DE DÚVIDAS PENDENTES */}
      <CModal visible={modalDuvidas} onClose={() => setModalDuvidas(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Dúvidas e Comentários Pendentes</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {duvidasPendentes.length === 0 ? (
            <div className="text-center py-4">Tudo limpo! Nenhuma dúvida pendente.</div>
          ) : (
            <div className="d-flex flex-column gap-4">
              {duvidasPendentes.map(d => (
                <div key={d.id} className="p-3 border rounded bg-light">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold"><CIcon icon={cilUser} /> {d.aluno_nome}</span>
                    <span className="small text-muted">{new Date(d.data_criacao).toLocaleString()}</span>
                  </div>
                  <div className="small text-primary mb-2">
                    Em: <strong>{d.trilha_nome}</strong> > {d.modulo_nome}
                  </div>
                  <div className="p-2 bg-white rounded border mb-3">
                    {d.texto}
                  </div>
                  
                  {respondendoId === d.id ? (
                    <div className="mt-2">
                      <CFormTextarea 
                        placeholder="Escreva sua resposta..." 
                        rows={3} 
                        value={respostaDuvida}
                        onChange={(e) => setRespostaDuvida(e.target.value)}
                        className="mb-2"
                      />
                      <div className="d-flex gap-2">
                        <CButton color="success" size="sm" className="text-white" onClick={() => responderDuvida(d.id)}>Enviar Resposta</CButton>
                        <CButton color="secondary" size="sm" variant="ghost" onClick={() => setRespondendoId(null)}>Cancelar</CButton>
                      </div>
                    </div>
                  ) : (
                    <CButton color="primary" size="sm" onClick={() => setRespondendoId(d.id)}>Responder</CButton>
                  )}
                </div>
              ))}
            </div>
          )}
        </CModalBody>
      </CModal>
    </CRow>
  )
}

export default GestaoTrilhas