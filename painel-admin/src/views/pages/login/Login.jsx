import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import { API_URL } from '../../../config'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'

const Login = () => {
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const navigate = useNavigate()

  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!matricula || !senha) {
      setErro('Preencha a matrícula e a senha.')
      return
    }
    setErro('')
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula, senha })
      })
      const data = await response.json()

      if (data.sucesso) {
        sessionStorage.setItem('userId', data.dados.id)
        sessionStorage.setItem('papel', data.dados.papel)
        sessionStorage.setItem('nome', data.dados.nome)
        sessionStorage.setItem('matricula', data.dados.matricula)

        if (data.dados.papel === 'admin' || data.dados.papel === 'professor') {
          navigate('/dashboard')
        } else {
          navigate('/quiz')
        }
      } else {
        setErro(data.mensagem || 'Matrícula ou senha incorretos.')
      }
    } catch (error) {
      console.error('Erro na conexão:', error)
      setErro('Erro ao conectar com o servidor. Verifique se a API está rodando.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  <h1>Acesso ao Sistema</h1>
                  <p className="text-body-secondary">Entre com sua Matrícula e Senha</p>

                  {erro && (
                    <div className="alert alert-danger py-2 mb-3" role="alert">
                      {erro}
                    </div>
                  )}

                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      id="matricula"
                      placeholder="Matrícula (ex: 2213150043)"
                      autoComplete="username"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                  </CInputGroup>

                  <CInputGroup className="mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      id="senha"
                      type="password"
                      placeholder="Senha"
                      autoComplete="current-password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                  </CInputGroup>

                  <CRow>
                    <CCol xs={6}>
                      <CButton
                        id="btn-entrar"
                        color="primary"
                        className="px-4"
                        onClick={handleLogin}
                        disabled={loading}
                      >
                        {loading ? 'Entrando...' : 'Entrar'}
                      </CButton>
                    </CCol>
                    <CCol xs={6} className="text-right">
                      <CButton
                        color="link"
                        className="px-0"
                        onClick={() => navigate('/esqueceu-senha')}
                      >
                        Esqueceu a senha?
                      </CButton>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>

              <CCard className="text-white bg-primary py-5" style={{ width: '44%' }}>
                <CCardBody className="text-center">
                  <div>
                    <h2>Plataforma de Questões</h2>
                    <p>
                      Ambiente exclusivo para alunos de Ciências Contábeis da Universidade do Estado do Amazonas (UEA).
                    </p>
                    <Link to="/register">
                      <CButton color="primary" className="mt-3" active tabIndex={-1}>
                        Primeiro Acesso?
                      </CButton>
                    </Link>
                  </div>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login