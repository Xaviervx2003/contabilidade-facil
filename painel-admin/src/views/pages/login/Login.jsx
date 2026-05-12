import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CFormCheck,
  CSpinner
} from '@coreui/react'
import { API_URL } from '../../../config'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilCheckCircle, cilLowVision, cilFindInPage, cilChartLine } from '@coreui/icons'
import { useTheme } from '../../../context/themeContext'

const Login = () => {
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const navigate = useNavigate()

  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const { isDark } = useTheme()

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
      setErro('Erro ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-vh-100 d-flex flex-column align-items-center justify-content-center p-3 ${isDark ? 'bg-dark' : 'bg-light'}`} style={{
      background: isDark ? 'radial-gradient(circle at top right, #1a202c, #0d1117)' : 'radial-gradient(circle at top right, #f8fafc, #e2e8f0)'
    }}>
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={5} lg={4}>
            {/* Logo / Brand */}
            <div className="text-center mb-4 fade-in">
              <div className="d-inline-flex align-items-center justify-content-center bg-primary rounded-circle shadow-lg mb-3" style={{ width: 64, height: 64 }}>
                <CIcon icon={cilChartLine} className="text-white" size="xl" />
              </div>
              <h2 className="fw-bold mb-0" style={{ letterSpacing: '-0.04em' }}>Contabilidade Fácil</h2>
              <p className="text-body-secondary small">UEA - Portal do Aluno</p>
            </div>

            <CCard className="border-0 shadow-lg rounded-4 overflow-hidden fade-in" style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)'
            }}>
              <CCardBody className="p-4 p-md-5">
                <div className="mb-4">
                  <h3 className="fw-bold mb-1">Bem-vindo de volta!</h3>
                  <p className="text-body-secondary small">Entre para continuar seus estudos</p>
                </div>

                {erro && (
                  <div className="alert alert-danger py-2 rounded-3 small mb-4 border-0 bg-danger bg-opacity-10 text-danger d-flex align-items-center gap-2">
                    <CIcon icon={cilCheckCircle} style={{ transform: 'rotate(180deg)' }} />
                    {erro}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label small fw-bold text-body-secondary text-uppercase">Matrícula</label>
                  <CInputGroup className="input-group-premium">
                    <CInputGroupText className="bg-transparent border-end-0">
                      <CIcon icon={cilUser} className="text-body-secondary" />
                    </CInputGroupText>
                    <CFormInput
                      className="border-start-0 ps-0"
                      placeholder="seu@email.com ou matrícula"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                  </CInputGroup>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between">
                    <label className="form-label small fw-bold text-body-secondary text-uppercase">Senha</label>
                    <Link to="/esqueceu-senha" title="Recuperar senha" style={{ fontSize: '0.75rem', textDecoration: 'none' }} className="fw-bold">
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <CInputGroup className="input-group-premium">
                    <CInputGroupText className="bg-transparent border-end-0">
                      <CIcon icon={cilLockLocked} className="text-body-secondary" />
                    </CInputGroupText>
                    <CFormInput
                      type={showPassword ? 'text' : 'password'}
                      className="border-start-0 border-end-0 ps-0"
                      placeholder="Digite sua senha"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                    <CInputGroupText 
                      className="bg-transparent border-start-0 cursor-pointer" 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ cursor: 'pointer' }}
                    >
                      <CIcon icon={cilLowVision} className={showPassword ? 'text-primary' : 'text-body-secondary'} />
                    </CInputGroupText>
                  </CInputGroup>
                </div>

                <div className="d-flex align-items-center mb-4">
                  <CFormCheck 
                    id="rememberMe" 
                    label="Lembrar credenciais" 
                    className="small text-body-secondary"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                </div>

                <CButton
                  color="primary"
                  className="w-100 py-2 fw-bold rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2 mb-4"
                  onClick={handleLogin}
                  disabled={loading}
                  style={{ height: 48 }}
                >
                  {loading ? <CSpinner size="sm" /> : 'Entrar'}
                </CButton>

                <div className="text-center">
                  <p className="text-body-secondary small mb-0">
                    Não tem conta? <Link to="/register" className="fw-bold text-decoration-none">Criar conta</Link>
                  </p>
                </div>
              </CCardBody>
            </CCard>

            {/* Footer Links */}
            <div className="text-center mt-5 text-body-secondary small fade-in" style={{ fontSize: 11 }}>
              <Link to="/termos" className="text-inherit text-decoration-none mx-2">Termos de Uso</Link>
              <Link to="/privacidade" className="text-inherit text-decoration-none mx-2">Política de Privacidade</Link>
            </div>
          </CCol>
        </CRow>
      </CContainer>

      <style>{`
        .fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .input-group-premium .form-control:focus {
          box-shadow: none;
          border-color: var(--cui-primary);
        }
        .input-group-premium .input-group-text {
          transition: border-color 0.15s ease-in-out;
        }
        .input-group-premium:focus-within .input-group-text {
          border-color: var(--cui-primary);
        }
        .cursor-pointer { cursor: pointer; }
      `}</style>
    </div>
  )
}

export default Login