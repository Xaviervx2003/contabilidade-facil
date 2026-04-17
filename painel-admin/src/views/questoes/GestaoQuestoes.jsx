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
  CSpinner
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash } from '@coreui/icons'
import { API_URL } from '../../config'

const GestaoQuestoes = () => {
  const [questoes, setQuestoes] = useState([])
  const [materiasDisponiveis, setMateriasDisponiveis] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [modalVisible, setModalVisible] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)

  // ✅ ALTERAÇÃO 1: Estado do formulário agora inclui opcao_e
  const [formData, setFormData] = useState({
    id: null,
    materia_ids: [],
    enunciado: '',
    opcao_a: '',
    opcao_b: '',
    opcao_c: '',
    opcao_d: '',
    opcao_e: '',           // ← NOVO
    resposta_correta: 'A',
    explicacao: ''
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

  const carregarQuestoes = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/questoes`)
      const data = await res.json()
      setQuestoes(data)
    } catch (err) {
      setError('Erro ao carregar questões da API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarMaterias()
    carregarQuestoes()
  }, [])

  const abrirParaNovo = () => {
    setFormData({
      id: null,
      materia_ids: [],
      enunciado: '',
      opcao_a: '',
      opcao_b: '',
      opcao_c: '',
      opcao_d: '',
      opcao_e: '',           // ← NOVO
      resposta_correta: 'A',
      explicacao: ''
    })
    setModoEdicao(false)
    setModalVisible(true)
  }

  // ✅ ALTERAÇÃO 2: Ao abrir para edição, lê options[4] como opcao_e (pode ser undefined)
  const abrirParaEdicao = (q) => {
    setFormData({
      id: q.id,
      materia_ids: q.materia_ids || [],
      enunciado: q.question,
      opcao_a: q.options[0] || '',
      opcao_b: q.options[1] || '',
      opcao_c: q.options[2] || '',
      opcao_d: q.options[3] || '',
      opcao_e: q.options[4] || '',  // ← NOVO (vazio se a questão só tiver 4 opções)
      resposta_correta: q.answer,
      explicacao: q.explicacao || ''
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

  // ✅ ALTERAÇÃO 3: Envia opcao_e para o backend (vazio = sem 5ª alternativa)
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
          opcao_e: formData.opcao_e || null,  // ← NOVO (null se vazio)
          resposta_correta: formData.resposta_correta,
          explicacao: formData.explicacao
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

  return (
    <CRow>
      <CCol xs={12}>
        {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}
        {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}

        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Gestão de Questões do Quiz</strong>
            <CButton color="primary" onClick={abrirParaNovo}>
              + Nova Questão
            </CButton>
          </CCardHeader>

          <CCardBody>
            <CTable align="middle" className="mb-0 border" hover responsive>
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>ID</CTableHeaderCell>
                  <CTableHeaderCell>Matérias</CTableHeaderCell>
                  <CTableHeaderCell>Enunciado</CTableHeaderCell>
                  <CTableHeaderCell className="text-center">Ações</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {loading ? (
                  <CTableRow><CTableDataCell colSpan="4" className="text-center py-4"><CSpinner color="primary" /></CTableDataCell></CTableRow>
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
              <div className="d-flex flex-wrap gap-3">
                {materiasDisponiveis.length > 0 ? (
                  materiasDisponiveis.map(m => (
                    <CFormCheck
                      key={m.id}
                      id={`materia-q-${m.id}`}
                      label={m.nome}
                      checked={formData.materia_ids.includes(m.id)}
                      onChange={() => toggleMateria(m.id)}
                    />
                  ))
                ) : (
                  <span className="text-muted small">Nenhuma matéria cadastrada no sistema ainda.</span>
                )}
              </div>
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

            {/* ✅ ALTERAÇÃO 4: Campo Opção E — ocupa linha inteira, com indicação de opcional */}
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
                {/* ✅ ALTERAÇÃO 5: Seletor agora inclui Alternativa E */}
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

              {/* CAMPO DE EXPLICAÇÃO */}
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