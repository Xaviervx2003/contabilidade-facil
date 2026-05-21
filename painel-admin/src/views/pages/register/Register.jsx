import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCol,
  CFormInput,
  CRow,
  CSpinner
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilLowVision, cilImagePlus } from '@coreui/icons'
import { useRegister } from '../../../hooks/useAuth'

const Register = () => {
  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  
  const [showPassword, setShowPassword] = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  const { mutate: register, isPending: loading, error } = useRegister()
  const [erroLocal, setErroLocal] = useState('')

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAvatar(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleRegister = () => {
    if (!nome || !matricula || !senha) {
      setErroLocal('Preencha nome, matrícula e senha.')
      return
    }
    if (senha.length < 6) {
      setErroLocal('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setErroLocal('')
    
    register({ nome, matricula, senha, avatar }, {
      onSuccess: (data) => {
        if (data.sucesso) {
          navigate('/login')
        } else {
          setErroLocal(data.mensagem || 'Erro ao criar conta.')
        }
      },
      onError: () => {
        setErroLocal('Erro ao conectar com o servidor.')
      }
    })
  }

  const airbnbRed = '#FF5A5F'

  return (
    <div className="min-vh-100 d-flex bg-white">
      <CRow className="g-0 w-100 flex-row-reverse">
        
        {/* Lado Direito - Formulário */}
        <CCol md={6} lg={5} className="d-flex flex-column justify-content-center px-4 px-md-5 py-5" style={{ zIndex: 10 }}>
          <div className="mx-auto w-100" style={{ maxWidth: '420px' }}>
            
            <div className="mb-4 fade-in-up">
              <h1 className="fw-bolder mb-2" style={{ letterSpacing: '-0.02em', fontSize: '2rem', color: '#222222' }}>
                Crie sua conta
              </h1>
              <p className="text-muted" style={{ fontSize: '1.1rem' }}>Junte-se à maior comunidade de contabilidade.</p>
            </div>

            {(erroLocal || error) && (
              <div className="alert alert-danger py-3 rounded-4 small mb-4 border-0 d-flex align-items-center gap-3 fade-in" style={{ backgroundColor: '#fff8f6', color: '#d93900' }}>
                <CIcon icon={cilCheckCircle} size="lg" style={{ transform: 'rotate(180deg)' }} />
                <span className="fw-medium">{erroLocal || 'Erro no registro'}</span>
              </div>
            )}

            {/* Avatar Upload Opcional */}
            <div className="mb-4 d-flex justify-content-center fade-in-up">
              <div 
                className="position-relative rounded-circle d-flex align-items-center justify-content-center cursor-pointer avatar-upload"
                style={{ 
                  width: 100, height: 100, 
                  backgroundColor: '#f7f7f7', 
                  border: '2px dashed #dddddd',
                  backgroundImage: avatarPreview ? `url(${avatarPreview})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
                onClick={() => fileInputRef.current.click()}
              >
                {!avatarPreview && <CIcon icon={cilImagePlus} size="xl" className="text-muted" />}
                {avatarPreview && (
                  <div className="avatar-overlay position-absolute w-100 h-100 rounded-circle d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <CIcon icon={cilImagePlus} className="text-white" />
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="d-none" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                />
              </div>
            </div>
            <p className="text-center text-muted small mt-n3 mb-4 fade-in-up">Adicione uma foto (opcional)</p>

            <div className="mb-4 fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="form-floating mb-0 airbnb-input-wrapper">
                <CFormInput
                  id="nomeInput"
                  placeholder="Nome Completo"
                  className="airbnb-input rounded-top-3 border-bottom-0"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
                <label htmlFor="nomeInput" className="text-muted px-3">Nome Completo</label>
              </div>

              <div className="form-floating mb-0 airbnb-input-wrapper">
                <CFormInput
                  id="matriculaInput"
                  placeholder="Matrícula"
                  className="airbnb-input rounded-0 border-bottom-0"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
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
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
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

            <div className="fade-in-up" style={{ animationDelay: '0.2s' }}>
              <CButton
                className="w-100 py-3 fw-bold rounded-3 airbnb-btn mb-4"
                onClick={handleRegister}
                disabled={loading}
                style={{ backgroundColor: airbnbRed, borderColor: airbnbRed, color: 'white', fontSize: '1.1rem' }}
              >
                {loading ? <CSpinner size="sm" /> : 'Cadastrar'}
              </CButton>
            </div>

            <div className="text-center fade-in-up" style={{ animationDelay: '0.3s' }}>
              <p className="text-muted mb-0">
                Já tem uma conta? <Link to="/login" style={{ color: airbnbRed, fontWeight: 600, textDecoration: 'none' }}>Faça login</Link>
              </p>
            </div>

          </div>
        </CCol>

        {/* Lado Esquerdo - Imagem Hero */}
        <CCol md={6} lg={7} className="d-none d-md-block position-relative">
          <div 
            className="h-100 w-100" 
            style={{ 
              backgroundImage: 'url("https://images.unsplash.com/photo-1513258496099-48168024aec0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="position-absolute w-100 h-100" style={{ background: 'linear-gradient(135deg, rgba(255,90,95,0.4) 0%, rgba(34,34,34,0.4) 100%)' }}></div>
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
        
        .avatar-upload .avatar-overlay {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .avatar-upload:hover .avatar-overlay {
          opacity: 1;
        }
        .avatar-upload:hover {
          border-color: #FF5A5F !important;
        }
      `}</style>
    </div>
  )
}

export default Register
