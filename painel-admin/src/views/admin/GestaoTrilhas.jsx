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
import { cilPlus, cilPencil, cilTrash, cilVideo, cilCheck, cilDescription, cilChart, cilChartLine, cilChatBubble, cilUser, cilCheckCircle, cilCopy } from '@coreui/icons'
import { API_URL } from '../../config'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

const GestaoTrilhas = () => {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [modalTrilha, setModalTrilha] = useState(false)
  const [modalModulo, setModalModulo] = useState(false)
  const [modalEngajamento, setModalEngajamento] = useState(false)
  const [modalDuvidas, setModalDuvidas] = useState(false)
  const [respostaDuvida, setRespostaDuvida] = useState('')
  const [respondendoId, setRespondendoId] = useState(null)
  const queryClient = useQueryClient()

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

  const getTipoModulo = (modulo) => {
    if (modulo.materia_id || modulo.questoes_selecionadas?.length > 0) {
      return { label: 'Quiz', color: 'primary', icon: cilCheck }
    }
    if (modulo.link_video) {
      return { label: 'Video', color: 'danger', icon: cilVideo }
    }
    return { label: 'Texto', color: 'secondary', icon: cilDescription }
  }

  // REFACTOR PARA REACT QUERY
  const { data: trilhas = [], isLoading: loadingTrilhas } = useQuery({
    queryKey: ['adminTrilhas'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/trilhas`)
      return res.json()
    }
  })

  const { data: materias = [] } = useQuery({
    queryKey: ['adminMaterias'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/admin/materias`)
      return res.json()
    }
  })

  const { data: duvidasPendentes = [] } = useQuery({
    queryKey: ['adminDuvidasPendentes'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/trilhas/duvidas/pendentes`)
      return res.json()
    }
  })

  const { data: dadosEngajamento = [], isLoading: loadingEngajamento, refetch: refetchEngajamento } = useQuery({
    queryKey: ['adminEngajamento', trilhaAtiva?.id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/trilhas/${trilhaAtiva.id}/engajamento`)
      return res.json()
    },
    enabled: !!trilhaAtiva && modalEngajamento,
  })

  const loading = loadingTrilhas
  const totalModulos = trilhas.reduce((total, trilha) => total + (trilha.modulos?.length || 0), 0)
  const trilhasPublicadas = trilhas.filter(trilha => trilha.status === 'publicado').length
  const trilhasRascunho = trilhas.length - trilhasPublicadas

  // MUTAÇÕES
  const mutationSalvarTrilha = useMutation({
    mutationFn: async () => {
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
      } else {
        await fetch(`${API_URL}/api/trilhas?usuario_id=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formTrilha, capa_url: formTrilha.capa_url || null, nivel: formTrilha.nivel || null })
        })
      }
    },
    onSuccess: () => {
      toast.success(trilhaAtiva ? 'Trilha atualizada!' : 'Trilha criada!')
      setModalTrilha(false)
      queryClient.invalidateQueries({ queryKey: ['adminTrilhas'] })
    },
    onError: () => toast.error('Erro ao salvar trilha.')
  })

  const salvarTrilha = () => mutationSalvarTrilha.mutate()


  const deletarTrilha = async (id) => {
    if (!window.confirm("Certeza que deseja remover esta trilha e todos os seus módulos?")) return
    try {
      await fetch(`${API_URL}/api/trilhas/${id}`, { method: 'DELETE' })
      toast.success('Trilha removida!')
      queryClient.invalidateQueries({ queryKey: ['adminTrilhas'] })
    } catch (e) {
      toast.error('Erro ao remover trilha.')
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

      toast.success(formModulo.id ? 'Módulo atualizado!' : 'Módulo adicionado!')
      setModalModulo(false)
      queryClient.invalidateQueries({ queryKey: ['adminTrilhas'] })
    } catch (e) {
      console.error(e)
      toast.error(`Erro ao salvar modulo: ${e.message}`)
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
        toast.success('Resposta enviada!')
        setRespostaDuvida('')
        setRespondendoId(null)
        queryClient.invalidateQueries({ queryKey: ['adminDuvidasPendentes'] })
      }
    } catch (e) { toast.error('Erro ao responder.') }
  }

  const deletarModulo = async (id) => {
    if (!window.confirm("Remover este módulo da trilha?")) return
    try {
      await fetch(`${API_URL}/api/trilhas/modulos/${id}`, { method: 'DELETE' })
      toast.success('Módulo deletado!')
      queryClient.invalidateQueries({ queryKey: ['adminTrilhas'] })
    } catch (e) {
      toast.error('Erro ao deletar módulo.')
    }
  }

  const duplicarTrilha = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/trilhas/${id}/duplicar?usuario_id=${userId}`, { method: 'POST' })
      if (!res.ok) throw new Error('Falha ao duplicar')
      toast.success('Trilha duplicada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['adminTrilhas'] })
    } catch (e) {
      toast.error('Erro ao duplicar trilha.')
    }
  }

  const verEngajamento = (trilha) => {
    setTrilhaAtiva(trilha)
    setModalEngajamento(true)
  }

  return (
    <CRow>
      <CCol xs={12}>
        {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}
        {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}

        <CCard className="mb-4 border-0 shadow-sm">
          <CCardHeader className="bg-body border-0 pb-0">
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
              <div>
                <div className="text-uppercase text-body-secondary small fw-semibold" style={{ letterSpacing: '0.05em' }}>Educação Continuada</div>
                <h3 className="mb-1 fw-bold">Gestão de Trilhas</h3>
                <div className="text-body-secondary small">
                  Organize cursos, módulos, exercícios e materiais de apoio em um único fluxo.
                </div>
              </div>
              <div className="d-flex gap-2 align-items-start">
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
            </div>
          </CCardHeader>

          <CCardBody>
            <CRow className="g-3 mb-4">
              <CCol md={4}>
                <div className="p-3 rounded-4 border bg-body-tertiary h-100">
                  <div className="text-uppercase text-body-secondary small fw-bold mb-1" style={{ fontSize: 10, letterSpacing: '0.1em' }}>Trilhas Cadastradas</div>
                  <div className="fs-3 fw-bold tabular-nums">{trilhas.length}</div>
                </div>
              </CCol>
              <CCol md={4}>
                <div className="p-3 rounded-4 border bg-body-tertiary h-100">
                  <div className="text-uppercase text-body-secondary small fw-bold mb-1" style={{ fontSize: 10, letterSpacing: '0.1em' }}>Publicadas / Rascunhos</div>
                  <div className="fs-3 fw-bold tabular-nums">{trilhasPublicadas} / {trilhasRascunho}</div>
                </div>
              </CCol>
              <CCol md={4}>
                <div className="p-3 rounded-4 border bg-body-tertiary h-100">
                  <div className="text-uppercase text-body-secondary small fw-bold mb-1" style={{ fontSize: 10, letterSpacing: '0.1em' }}>Módulos no Total</div>
                  <div className="fs-3 fw-bold tabular-nums">{totalModulos}</div>
                </div>
              </CCol>
            </CRow>

            {loading ? (
              <CRow className="mt-3">
                {[...Array(3)].map((_, i) => (
                  <CCol xs={12} key={i} className="mb-4">
                    <div className="rounded-4 placeholder-glow" style={{ height: '140px', backgroundColor: 'var(--color-bg-secondary)' }}></div>
                  </CCol>
                ))}
              </CRow>
            ) : trilhas.length === 0 ? (
              <div className="text-center py-5 text-body-secondary">
                Nenhuma trilha criada ainda. Crie sua primeira trilha de aprendizado!
              </div>
            ) : (
              trilhas.map((t, index) => (
                <CCard key={t.id} className="mb-4 border-0 premium-card fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <CCardHeader className="bg-body-tertiary border-bottom">
                    <div className="d-flex flex-column flex-xl-row justify-content-between gap-3">
                      <div className="d-flex align-items-start gap-3">
                      {t.capa_url && (
                        <img src={t.capa_url} alt="capa" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                      )}
                      <div>
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                          <h5 className="mb-0 fw-bold">{t.nome}</h5>
                          <CBadge color={t.status === 'publicado' ? 'success' : 'warning'}>
                            {t.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                          </CBadge>
                          {t.nivel && <CBadge color="info" variant="outline">{t.nivel}</CBadge>}
                          <CBadge color="secondary" variant="outline">{t.modulos?.length || 0} modulos</CBadge>
                        </div>
                        <div className="small text-body-secondary" style={{ maxWidth: 720 }}>
                          {t.descricao || 'Sem descricao cadastrada.'}
                        </div>
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2 justify-content-xl-end">
                      <CButton color="success" variant="outline" size="sm" onClick={() => abrirModalModulo(t)}>
                        <CIcon icon={cilPlus} className="me-1" /> Modulo
                      </CButton>
                      <CButton color="info" variant="outline" size="sm" onClick={() => verEngajamento(t)} title="Ver Engajamento">
                        <CIcon icon={cilChart} className="me-1" /> Engajamento
                      </CButton>
                      <CButton color="secondary" variant="outline" size="sm" onClick={() => duplicarTrilha(t.id)} title="Duplicar Trilha">
                        <CIcon icon={cilCopy} className="me-1" /> Duplicar
                      </CButton>
                      <CButton color="primary" variant="outline" size="sm" onClick={() => { setTrilhaAtiva(t); setFormTrilha({ ...t, capa_url: t.capa_url || '', nivel: t.nivel || '' }); setModalTrilha(true) }}>
                        <CIcon icon={cilPencil} className="me-1" /> Editar
                      </CButton>
                      <CButton color="danger" variant="ghost" size="sm" onClick={() => deletarTrilha(t.id)}>
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </div>
                    </div>
                  </CCardHeader>
                  <CCardBody>
                    {t.modulos?.length > 0 ? (
                      <div className="d-flex flex-column gap-2">
                        {t.modulos.map(m => {
                          const tipo = getTipoModulo(m)
                          return (
                            <div key={m.id} className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 p-3 rounded border bg-body">
                              <div className="d-flex gap-3">
                                <div className="rounded-circle bg-body-tertiary border d-flex align-items-center justify-content-center fw-bold" style={{ width: 40, height: 40, flex: '0 0 40px' }}>
                                  {m.ordem}
                                </div>
                                <div>
                                  <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                    <strong>{m.nome}</strong>
                                    <CBadge color={tipo.color} variant="outline">
                                      <CIcon icon={tipo.icon} className="me-1" /> {tipo.label}
                                    </CBadge>
                                    {m.duracao_minutos && <CBadge color="light" className="text-body">{m.duracao_minutos} min</CBadge>}
                                  </div>
                                  <div className="small text-body-secondary mb-2">
                                    {m.descricao || 'Sem descricao rapida.'}
                                  </div>
                                  <div className="d-flex flex-wrap gap-2">
                                    {m.link_video && <CBadge color="danger"><CIcon icon={cilVideo} className="me-1" /> Video</CBadge>}
                                    {m.texto_teorico && <CBadge color="secondary"><CIcon icon={cilDescription} className="me-1" /> Texto</CBadge>}
                                    {m.materia_id && <CBadge color="primary"><CIcon icon={cilCheck} className="me-1" /> {m.materia_nome || 'Quiz'}</CBadge>}
                                    {m.questoes_selecionadas?.length > 0 && <CBadge color="dark">{m.questoes_selecionadas.length} questoes</CBadge>}
                                    {m.material_apoio_url && <CBadge color="warning">Material</CBadge>}
                                  </div>
                                </div>
                              </div>
                              <div className="d-flex gap-1 justify-content-end">
                                <CButton size="sm" color="primary" variant="ghost" onClick={() => abrirModalModulo(t, m)} title="Editar modulo">
                                  <CIcon icon={cilPencil} />
                                </CButton>
                                <CButton size="sm" color="danger" variant="ghost" onClick={() => deletarModulo(m.id)} title="Remover modulo">
                                  <CIcon icon={cilTrash} />
                                </CButton>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-body-secondary small py-4 border rounded bg-body-tertiary">
                        Nenhum modulo nesta trilha. Use o botao "Modulo" para adicionar a primeira aula.
                      </div>
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
                    Em: <strong>{d.trilha_nome}</strong> &gt; {d.modulo_nome}
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
