import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilBadge, cilArrowLeft } from '@coreui/icons'
import { API_URL } from '../../../config'

const EsqueceuSenha = () => {
  const navigate = useNavigate()

  // Passo 1: aluno informa matrícula + nome para confirmar identidade
  // Passo 2: aluno define a nova senha
  const [passo, setPasso] = useState(1)

  // Campos do passo 1
  const [matricula, setMatricula] = useState('')
  const [nome, setNome] = useState('')

  // Campos do passo 2
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)

  // PASSO 1 — Verifica identidade do aluno (matrícula + nome)
  const handleVerificarIdentidade = async (e) => {
    e.preventDefault()
    setErro(null)

    if (!matricula || !nome) {
      setErro('Preencha a matrícula e o seu nome completo.')
      return
    }

    setCarregando(true)
    try {
      const res = await fetch(`${API_URL}/api/verificar-identidade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula, nome }),
      })
      const data = await res.json()

      if (data.sucesso) {
        setPasso(2) // Identidade confirmada, vai para o passo 2
      } else {
        setErro(data.mensagem || 'Matrícula ou nome não encontrados.')
      }
    } catch {
      setErro('Não foi possível conectar ao servidor. Verifique se a API está rodando.')
    } finally {
      setCarregando(false)
    }
  }

  // PASSO 2 — Redefine a senha
  const handleRedefinirSenha = async (e) => {
    e.preventDefault()
    setErro(null)

    if (!novaSenha || !confirmarSenha) {
      setErro('Preencha os dois campos de senha.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }
    if (novaSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setCarregando(true)
    try {
      const res = await fetch(`${API_URL}/api/redefinir-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula, nova_senha: novaSenha }),
      })
      const data = await res.json()

      if (data.sucesso) {
        setSucesso('Senha redefinida com sucesso!')
        setTimeout(() => navigate('/login'), 2500)
      } else {
        setErro(data.mensagem || 'Não foi possível redefinir a senha.')
      }
    } catch {
      setErro('Não foi possível conectar ao servidor.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6} lg={5}>
            <CCard className="p-4">
              <CCardBody>
                {/* Cabeçalho */}
                <h1>Redefinir Senha</h1>
                <p className="text-body-secondary">
                  {passo === 1
                    ? 'Confirme sua identidade para continuar.'
                    : 'Escolha uma nova senha para sua conta.'}
                </p>

                {/* Indicador de passos */}
                <div className="d-flex align-items-center mb-4 gap-2">
                  <span
                    className={`badge rounded-pill px-3 py-2 ${passo >= 1 ? 'bg-primary' : 'bg-secondary'}`}
                  >
                    1 · Verificar identidade
                  </span>
                  <small className="text-body-secondary">→</small>
                  <span
                    className={`badge rounded-pill px-3 py-2 ${passo >= 2 ? 'bg-primary' : 'bg-secondary'}`}
                  >
                    2 · Nova senha
                  </span>
                </div>

                {/* Alertas de feedback */}
                {erro && (
                  <CAlert color="danger" dismissible onClose={() => setErro(null)}>
                    {erro}
                  </CAlert>
                )}
                {sucesso && (
                  <CAlert color="success">
                    ✅ {sucesso} Redirecionando para o login...
                  </CAlert>
                )}

                {/* ── PASSO 1: Confirmar identidade ── */}
                {passo === 1 && (
                  <CForm onSubmit={handleVerificarIdentidade}>
                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilBadge} />
                      </CInputGroupText>
                      <CFormInput
                        placeholder="Matrícula (ex: 2213150043)"
                        value={matricula}
                        onChange={(e) => setMatricula(e.target.value)}
                      />
                    </CInputGroup>

                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        placeholder="Seu nome completo"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                      />
                    </CInputGroup>

                    <div className="d-grid mb-3">
                      <CButton type="submit" color="primary" disabled={carregando}>
                        {carregando ? (
                          <>
                            <CSpinner size="sm" className="me-2" />
                            Verificando...
                          </>
                        ) : (
                          'Confirmar Identidade'
                        )}
                      </CButton>
                    </div>
                  </CForm>
                )}

                {/* ── PASSO 2: Nova senha ── */}
                {passo === 2 && (
                  <CForm onSubmit={handleRedefinirSenha}>
                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Nova senha (mín. 6 caracteres)"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                      />
                    </CInputGroup>

                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Confirmar nova senha"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                      />
                    </CInputGroup>

                    <div className="d-grid mb-3">
                      <CButton type="submit" color="success" disabled={carregando || !!sucesso}>
                        {carregando ? (
                          <>
                            <CSpinner size="sm" className="me-2" />
                            Salvando...
                          </>
                        ) : (
                          'Salvar Nova Senha'
                        )}
                      </CButton>
                    </div>
                  </CForm>
                )}

                {/* Link de voltar ao login */}
                <CButton
                  color="link"
                  className="p-0 text-decoration-none"
                  onClick={() => navigate('/login')}
                >
                  <CIcon icon={cilArrowLeft} className="me-1" />
                  Voltar ao Login
                </CButton>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default EsqueceuSenha
