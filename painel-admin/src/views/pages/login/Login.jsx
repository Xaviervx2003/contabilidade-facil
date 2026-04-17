import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
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

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula, senha })
      })

      const data = await response.json()

      if (data.sucesso) {
        // ✅ Chaves padronizadas — iguais ao que DefaultLayout e Dashboard leem
        sessionStorage.setItem('userId', data.dados.id)
        sessionStorage.setItem('papel', data.dados.papel)
        sessionStorage.setItem('nome', data.dados.nome)
        sessionStorage.setItem('matricula', data.dados.matricula)

        // Roteamento por papel
        if (data.dados.papel === 'admin' || data.dados.papel === 'professor') {
          navigate('/dashboard')
        } else {
          navigate('/quiz')
        }
      } else {
        alert("Acesso Negado: " + data.mensagem)
      }
    } catch (error) {
      console.error("Erro na conexão:", error)
      alert("Erro ao conectar com o servidor. Verifique se a API está rodando.")
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
                  <CForm onSubmit={handleLogin}>
                    <h1>Acesso ao Sistema</h1>
                    <p className="text-body-secondary">Entre com sua Matrícula e Senha</p>

                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        placeholder="Matrícula (ex: 2213150043)"
                        autoComplete="username"
                        value={matricula}
                        onChange={(e) => setMatricula(e.target.value)}
                      />
                    </CInputGroup>

                    <CInputGroup className="mb-4">
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        type="password"
                        placeholder="Senha"
                        autoComplete="current-password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                      />
                    </CInputGroup>

                    <CRow>
                      <CCol xs={6}>
                        <CButton type="submit" color="primary" className="px-4">
                          Entrar
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
                  </CForm>
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