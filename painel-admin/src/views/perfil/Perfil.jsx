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

const getInitials = (name) => {
  if (!name) return '??'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const Perfil = () => {
  const matricula = sessionStorage.getItem('matricula')
  const nomeUsuario = sessionStorage.getItem('nome') || ''
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState({ tipo: '', msg: '' })

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-coreui-theme')
      setIsDark(theme === 'dark')
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-coreui-theme'],
    })
    return () => observer.disconnect()
  }, [])

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
        <p className={`mt-3 ${isDark ? 'text-light-emphasis' : 'text-muted'}`}>
          Carregando perfil...
        </p>
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

  const initials = getInitials(nomeUsuario || perfil.nome)
  const avatarColors = ['#7eb8f7', '#2eb85c', '#f9b115', '#e55353', '#9d7ef7']
  const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)]

  return (
    <>
      <h3 className="mb-4">👤 Minha Conta</h3>
      <p className={`mb-4 ${isDark ? 'text-light-emphasis' : 'text-muted'}`}>
        Bem-vindo(a), <strong>{nomeUsuario || perfil.nome}</strong>! Aqui estão seus dados e opções
        de segurança.
      </p>

      <CRow>
        <CCol xs={12} md={6}>
          <CCard className="mb-4">
            <CCardHeader style={isDark ? { color: '#7eb8f7' } : {}}>
              <strong>Informações Pessoais</strong>
            </CCardHeader>
            <CCardBody>
              <div className="d-flex align-items-center mb-4">
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: avatarColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 24,
                    fontWeight: 700,
                    marginRight: 16,
                  }}
                >
                  {initials}
                </div>
                <div>
                  <div
                    className={`small ${isDark ? 'text-light-emphasis' : 'text-body-secondary'}`}
                  >
                    Nome
                  </div>
                  <div className="fs-5 fw-semibold">{perfil.nome}</div>
                </div>
              </div>

              <div className="d-flex align-items-center mb-3 pb-3 border-bottom">
                <CIcon icon={cilBadge} className="me-3 text-info" size="xl" />
                <div>
                  <div
                    className={`small ${isDark ? 'text-light-emphasis' : 'text-body-secondary'}`}
                  >
                    Matrícula
                  </div>
                  <div className="fs-5 fw-semibold">{perfil.matricula}</div>
                </div>
              </div>

              <div className="d-flex align-items-center mb-3 pb-3 border-bottom">
                <CIcon icon={cilLockLocked} className="me-3 text-warning" size="xl" />
                <div>
                  <div
                    className={`small ${isDark ? 'text-light-emphasis' : 'text-body-secondary'}`}
                  >
                    Tipo de Acesso
                  </div>
                  <div className="fs-5 fw-semibold text-capitalize">{perfil.papel}</div>
                </div>
              </div>

              {perfil.criado_em && (
                <div className="d-flex align-items-center">
                  <CIcon icon={cilCalendar} className="me-3 text-success" size="xl" />
                  <div>
                    <div
                      className={`small ${isDark ? 'text-light-emphasis' : 'text-body-secondary'}`}
                    >
                      Membro desde
                    </div>
                    <div className="fs-6">{formatarData(perfil.criado_em)}</div>
                  </div>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} md={6}>
          <CCard className="mb-4">
            <CCardHeader style={isDark ? { color: '#7eb8f7' } : {}}>
              <strong>🔒 Alterar Senha</strong>
            </CCardHeader>
            <CCardBody>
              {feedback.msg && (
                <CAlert
                  color={feedback.tipo}
                  dismissible
                  onClose={() => setFeedback({ tipo: '', msg: '' })}
                >
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
                    autoComplete="current-password"
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
                    autoComplete="new-password"
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
                    autoComplete="new-password"
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
