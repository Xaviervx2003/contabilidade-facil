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
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilUser, cilLockLocked, cilBadge, cilCalendar } from '@coreui/icons'
import { API_URL } from '../../config'

const Perfil = () => {
  const matricula = sessionStorage.getItem('matricula')
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  // Estado do formulário de troca de senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState({ tipo: '', msg: '' })

  useEffect(() => {
    if (!matricula) {
      setLoading(false)
      return
    }
    fetch(`${API_URL}/api/perfil/${matricula}`)
      .then((res) => res.json())
      .then((data) => {
        setPerfil(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Erro ao buscar perfil:', err)
        setLoading(false)
      })
  }, [matricula])

  const handleAlterarSenha = async (e) => {
    e.preventDefault()
    setFeedback({ tipo: '', msg: '' })

    if (novaSenha.length < 6) {
      setFeedback({ tipo: 'warning', msg: 'A nova senha deve ter pelo menos 6 caracteres.' })
      return
    }
    if (novaSenha !== confirmaSenha) {
      setFeedback({ tipo: 'danger', msg: 'As senhas não coincidem.' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/alterar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricula,
          senha_atual: senhaAtual,
          nova_senha: novaSenha,
        }),
      })
      const data = await res.json()
      if (data.sucesso) {
        setFeedback({ tipo: 'success', msg: data.mensagem })
        setSenhaAtual('')
        setNovaSenha('')
        setConfirmaSenha('')
      } else {
        setFeedback({ tipo: 'danger', msg: data.mensagem })
      }
    } catch {
      setFeedback({ tipo: 'danger', msg: 'Erro de conexão com o servidor.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
        <p className="mt-3 text-muted">Carregando perfil...</p>
      </div>
    )
  }

  if (!matricula || !perfil) {
    return <CAlert color="warning">Faça login para ver seu perfil.</CAlert>
  }

  const formatarData = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  return (
    <>
      <h3 className="mb-4">👤 Minha Conta</h3>

      <CRow>
        {/* Dados do Perfil */}
        <CCol xs={12} md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Informações Pessoais</strong>
            </CCardHeader>
            <CCardBody>
              <div className="d-flex align-items-center mb-3 pb-3 border-bottom">
                <CIcon icon={cilUser} className="me-3 text-primary" size="xl" />
                <div>
                  <div className="text-body-secondary small">Nome Completo</div>
                  <div className="fs-5 fw-semibold">{perfil.nome}</div>
                </div>
              </div>

              <div className="d-flex align-items-center mb-3 pb-3 border-bottom">
                <CIcon icon={cilBadge} className="me-3 text-info" size="xl" />
                <div>
                  <div className="text-body-secondary small">Matrícula</div>
                  <div className="fs-5 fw-semibold">{perfil.matricula}</div>
                </div>
              </div>

              <div className="d-flex align-items-center mb-3 pb-3 border-bottom">
                <CIcon icon={cilLockLocked} className="me-3 text-warning" size="xl" />
                <div>
                  <div className="text-body-secondary small">Tipo de Acesso</div>
                  <div className="fs-5 fw-semibold text-capitalize">{perfil.papel}</div>
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Formulário de Troca de Senha */}
        <CCol xs={12} md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>🔒 Alterar Senha</strong>
            </CCardHeader>
            <CCardBody>
              {feedback.msg && (
                <CAlert color={feedback.tipo} dismissible onClose={() => setFeedback({ tipo: '', msg: '' })}>
                  {feedback.msg}
                </CAlert>
              )}

              <CForm onSubmit={handleAlterarSenha}>
                <div className="mb-3">
                  <CFormLabel>Senha Atual</CFormLabel>
                  <CFormInput
                    type="password"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Digite sua senha atual"
                    required
                  />
                </div>

                <div className="mb-3">
                  <CFormLabel>Nova Senha</CFormLabel>
                  <CFormInput
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>

                <div className="mb-4">
                  <CFormLabel>Confirmar Nova Senha</CFormLabel>
                  <CFormInput
                    type="password"
                    value={confirmaSenha}
                    onChange={(e) => setConfirmaSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                  />
                </div>

                <CButton type="submit" color="primary" className="w-100" disabled={saving}>
                  {saving ? (
                    <>
                      <CSpinner size="sm" className="me-2" /> Salvando...
                    </>
                  ) : (
                    '🔐 Alterar Senha'
                  )}
                </CButton>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Perfil
