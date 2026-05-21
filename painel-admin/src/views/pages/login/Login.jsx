import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCol,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CFormCheck,
  CSpinner
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilCheckCircle, cilLowVision } from '@coreui/icons'
import { useLogin } from '../../../hooks/useAuth'

const Login = () => {
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const { mutate: login, isPending: loading, error } = useLogin()
  const [erroLocal, setErroLocal] = useState('')

  const handleLogin = () => {
    if (!matricula || !senha) {
      setErroLocal('Preencha a matrícula e a senha.')
      return
    }
    setErroLocal('')
    
    login({ matricula, senha }, {
      onSuccess: (data) => {
        if (data.sucesso) {
          if (data.dados.papel === 'admin' || data.dados.papel === 'professor') {
            navigate('/admin/dashboard')
          } else {
            navigate('/dashboard')
          }
        } else {
          setErroLocal(data.mensagem || 'Matrícula ou senha incorretos.')
        }
      },
      onError: () => {
        setErroLocal('Erro ao conectar com o servidor.')
      }
    })
  }

  // Cores Airbnb style
  const airbnbRed = '#FF5A5F'

  return (
    <div className="min-vh-100 d-flex bg-white">
      <CRow className="g-0 w-100">
        
        {/* Lado Esquerdo - Formulário */}
        <CCol md={6} lg={5} className="d-flex flex-column justify-content-center px-4 px-md-5 py-5" style={{ zIndex: 10 }}>
          <div className="mx-auto w-100" style={{ maxWidth: '420px' }}>
            
            <div className="mb-5 fade-in-up">
              <div className="d-inline-flex align-items-center justify-content-center rounded-3 mb-4" style={{ background: airbnbRed, width: 48, height: 48 }}>
                <span className="text-white fw-bold fs-4">C</span>
              </div>
              <h1 className="fw-bolder mb-2" style={{ letterSpacing: '-0.02em', fontSize: '2rem', color: '#222222' }}>
                Bem-vindo ao Contabilidade Fácil.
              </h1>
              <p className="text-muted" style={{ fontSize: '1.1rem' }}>Entre para continuar sua jornada.</p>
            </div>

            {(erroLocal || error) && (
              <div className="alert alert-danger py-3 rounded-4 small mb-4 border-0 d-flex align-items-center gap-3 fade-in" style={{ backgroundColor: '#fff8f6', color: '#d93900' }}>
                <CIcon icon={cilCheckCircle} size="lg" style={{ transform: 'rotate(180deg)' }} />
                <span className="fw-medium">{erroLocal || 'Erro no login'}</span>
              </div>
            )}

            <div className="mb-4 fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="form-floating mb-3 airbnb-input-wrapper">
                <CFormInput
                  id="matriculaInput"
                  placeholder="Matrícula"
                  className="airbnb-input rounded-top-3 border-bottom-0"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <label htmlFor="matriculaInput" className="text-muted px-3">Matrícula ou E-mail</label>
              </div>

              <div className="form-floating position-relative airbnb-input-wrapper">
                <CFormInput
                  id="senhaInput"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  className="airbnb-input rounded-bottom-3"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                <label htmlFor="senhaInput" className="text-muted px-3">Senha</label>
                
                <span 
                  className="position-absolute end-0 top-50 translate-middle-y pe-3 cursor-pointer text-muted"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ zIndex: 10 }}
                >
                  <CIcon icon={cilLowVision} />
                </span>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4 fade-in-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/esqueceu-senha" style={{ color: '#222222', fontWeight: 600, textDecoration: 'underline' }}>
                Esqueceu a senha?
              </Link>
            </div>

            <div className="fade-in-up" style={{ animationDelay: '0.3s' }}>
              <CButton
                className="w-100 py-3 fw-bold rounded-3 airbnb-btn mb-4"
                onClick={handleLogin}
                disabled={loading}
                style={{ backgroundColor: airbnbRed, borderColor: airbnbRed, color: 'white', fontSize: '1.1rem' }}
              >
                {loading ? <CSpinner size="sm" /> : 'Entrar'}
              </CButton>
            </div>

            <div className="text-center fade-in-up" style={{ animationDelay: '0.4s' }}>
              <p className="text-muted mb-0">
                Não tem uma conta? <Link to="/register" style={{ color: airbnbRed, fontWeight: 600, textDecoration: 'none' }}>Cadastre-se</Link>
              </p>
            </div>

          </div>
        </CCol>

        {/* Lado Direito - Imagem Hero */}
        <CCol md={6} lg={7} className="d-none d-md-block position-relative">
          <div 
            className="h-100 w-100" 
            style={{ 
              backgroundImage: 'url("https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="position-absolute w-100 h-100" style={{ background: 'linear-gradient(135deg, rgba(255,90,95,0.4) 0%, rgba(0,166,153,0.4) 100%)' }}></div>
          </div>
        </CCol>

      </CRow>

      <style>{`
        .fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .airbnb-input {
          height: 60px;
          border: 1px solid #B0B0B0;
          box-shadow: none !important;
          transition: border-color 0.2s, border-width 0.2s;
        }
        .airbnb-input:focus {
          border: 2px solid #222222 !important;
          z-index: 5;
        }
        .airbnb-btn {
          transition: transform 0.1s, box-shadow 0.2s;
        }
        .airbnb-btn:hover:not(:disabled) {
          transform: scale(0.98);
        }
        .airbnb-btn:active:not(:disabled) {
          transform: scale(0.95);
        }
        .cursor-pointer { cursor: pointer; }
      `}</style>
    </div>
  )
}

export default Login