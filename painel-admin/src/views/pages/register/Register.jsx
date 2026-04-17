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
} from '@coreui/react'
import { API_URL } from '../../../config'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilBadge } from '@coreui/icons'

const Register = () => {
  const navigate = useNavigate()

  // Estados para os 3 campos do formulário
  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validação básica no front antes de chamar a API
    if (!nome || !matricula || !senha) {
      alert('Preencha todos os campos.')
      return
    }

    if (senha !== confirmarSenha) {
      alert('As senhas não coincidem.')
      return
    }

    setCarregando(true)

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, matricula, senha }),
      })

      const data = await response.json()

      if (data.sucesso) {
        alert('✅ Cadastro realizado com sucesso! Faça seu login.')
        navigate('/login')
      } else {
        alert('❌ Erro: ' + data.mensagem)
      }
    } catch (error) {
      console.error('Erro na conexão:', error)
      alert(`❌ Não foi possível conectar ao servidor. Verifique se a API FastAPI está rodando em ${API_URL}.`)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={9} lg={7} xl={6}>
            <CCard className="mx-4">
              <CCardBody className="p-4">
                <CForm onSubmit={handleSubmit}>
                  <h1>Criar Conta</h1>
                  <p className="text-body-secondary">
                    Cadastro exclusivo para alunos da UEA
                  </p>

                  {/* Campo: Nome Completo */}
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Nome completo"
                      autoComplete="name"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </CInputGroup>

                  {/* Campo: Matrícula */}
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilBadge} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Matrícula (ex: 2213150043)"
                      autoComplete="username"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                    />
                  </CInputGroup>

                  {/* Campo: Senha */}
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type="password"
                      placeholder="Senha"
                      autoComplete="new-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                  </CInputGroup>

                  {/* Campo: Confirmar Senha */}
                  <CInputGroup className="mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type="password"
                      placeholder="Confirmar senha"
                      autoComplete="new-password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                    />
                  </CInputGroup>

                  <div className="d-grid">
                    <CButton type="submit" color="success" disabled={carregando}>
                      {carregando ? (
                        <>
                          <CSpinner size="sm" className="me-2" />
                          Cadastrando...
                        </>
                      ) : (
                        'Criar Conta'
                      )}
                    </CButton>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Register
