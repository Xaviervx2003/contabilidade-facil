import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCol,
  CFormInput,
  CRow,
  CSpinner
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilLowVision, cilArrowLeft } from '@coreui/icons'
import { useVerificarIdentidade, useRedefinirSenha } from '../../../hooks/useAuth'

const EsqueceuSenha = () => {
  const [passo, setPasso] = useState(1) // 1: Verificar, 2: Nova Senha
  const [matricula, setMatricula] = useState('')
  const [nome, setNome] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const { mutate: verificarIdentidade, isPending: loadingVerificacao, error: erroV } = useVerificarIdentidade()
  const { mutate: redefinirSenha, isPending: loadingRedefinicao, error: erroR } = useRedefinirSenha()
  
  const [erroLocal, setErroLocal] = useState('')
  const [sucessoMsg, setSucessoMsg] = useState('')

  const handleVerificar = () => {
    if (!matricula || !nome) {
      setErroLocal('Preencha a matrícula e seu nome completo.')
      return
    }
    setErroLocal('')
    
    verificarIdentidade({ matricula, nome }, {
      onSuccess: (data) => {
        if (data.sucesso) {
          setPasso(2)
        } else {
          setErroLocal(data.mensagem || 'Dados não conferem.')
        }
      },
      onError: () => {
        setErroLocal('Erro ao conectar com o servidor.')
      }
    })
  }

  const handleRedefinir = () => {
    if (novaSenha.length < 6) {
      setErroLocal('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    setErroLocal('')
    
    redefinirSenha({ matricula, nova_senha: novaSenha }, {
      onSuccess: (data) => {
        if (data.sucesso) {
          setSucessoMsg('Senha alterada com sucesso! Redirecionando...')
          setTimeout(() => navigate('/login'), 2500)
        } else {
          setErroLocal(data.mensagem || 'Erro ao alterar senha.')
        }
      },
      onError: () => {
        setErroLocal('Erro ao conectar com o servidor.')
      }
    })
  }

  const airbnbRed = '#FF5A5F'

  return (
    <div className="min-vh-100 d-flex bg-white align-items-center justify-content-center px-3">
      
      <div className="w-100 position-relative p-4 p-md-5 rounded-4 shadow-sm border fade-in-up" style={{ maxWidth: '480px', backgroundColor: '#fff', borderColor: '#EBEBEB' }}>
        
        <Link to="/login" className="position-absolute top-0 start-0 mt-4 ms-4 text-muted text-decoration-none d-flex align-items-center gap-2" style={{ transition: 'color 0.2s' }}>
          <CIcon icon={cilArrowLeft} /> <span className="small fw-medium">Voltar</span>
        </Link>

        <div className="text-center mt-4 mb-5">
          <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ background: 'rgba(255,90,95,0.1)', width: 64, height: 64 }}>
            <CIcon icon={cilLockLocked} size="xl" style={{ color: airbnbRed }} />
          </div>
          <h2 className="fw-bolder mb-2" style={{ letterSpacing: '-0.02em', color: '#222222' }}>
            {passo === 1 ? 'Recuperar Senha' : 'Nova Senha'}
          </h2>
          <p className="text-muted" style={{ fontSize: '1rem' }}>
            {passo === 1 ? 'Informe seus dados para validarmos sua identidade.' : 'Crie uma nova senha segura para sua conta.'}
          </p>
        </div>

        {(erroLocal || erroV || erroR) && (
          <div className="alert alert-danger py-3 rounded-4 small mb-4 border-0 d-flex align-items-center gap-3 fade-in" style={{ backgroundColor: '#fff8f6', color: '#d93900' }}>
            <CIcon icon={cilCheckCircle} size="lg" style={{ transform: 'rotate(180deg)' }} />
            <span className="fw-medium">{erroLocal || 'Erro na solicitação'}</span>
          </div>
        )}

        {sucessoMsg && (
          <div className="alert alert-success py-3 rounded-4 small mb-4 border-0 d-flex align-items-center gap-3 fade-in" style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
            <CIcon icon={cilCheckCircle} size="lg" />
            <span className="fw-medium">{sucessoMsg}</span>
          </div>
        )}

        {passo === 1 && (
          <div className="fade-in-up">
            <div className="form-floating mb-3 airbnb-input-wrapper">
              <CFormInput
                id="matriculaInput"
                placeholder="Matrícula"
                className="airbnb-input rounded-3"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
              />
              <label htmlFor="matriculaInput" className="text-muted px-3">Matrícula</label>
            </div>

            <div className="form-floating mb-4 airbnb-input-wrapper">
              <CFormInput
                id="nomeInput"
                placeholder="Nome Completo"
                className="airbnb-input rounded-3"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerificar()}
              />
              <label htmlFor="nomeInput" className="text-muted px-3">Nome Completo</label>
            </div>

            <CButton
              className="w-100 py-3 fw-bold rounded-3 airbnb-btn"
              onClick={handleVerificar}
              disabled={loadingVerificacao}
              style={{ backgroundColor: '#222222', borderColor: '#222222', color: 'white', fontSize: '1.1rem' }}
            >
              {loadingVerificacao ? <CSpinner size="sm" /> : 'Verificar Identidade'}
            </CButton>
          </div>
        )}

        {passo === 2 && !sucessoMsg && (
          <div className="fade-in-up">
            <div className="form-floating position-relative airbnb-input-wrapper mb-4">
              <CFormInput
                id="novaSenhaInput"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nova Senha"
                className="airbnb-input rounded-3"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRedefinir()}
              />
              <label htmlFor="novaSenhaInput" className="text-muted px-3">Nova Senha</label>
              
              <span 
                className="position-absolute end-0 top-50 translate-middle-y pe-3 cursor-pointer text-muted"
                onClick={() => setShowPassword(!showPassword)}
                style={{ zIndex: 10 }}
              >
                <CIcon icon={cilLowVision} />
              </span>
            </div>

            <CButton
              className="w-100 py-3 fw-bold rounded-3 airbnb-btn"
              onClick={handleRedefinir}
              disabled={loadingRedefinicao}
              style={{ backgroundColor: airbnbRed, borderColor: airbnbRed, color: 'white', fontSize: '1.1rem' }}
            >
              {loadingRedefinicao ? <CSpinner size="sm" /> : 'Salvar Nova Senha'}
            </CButton>
          </div>
        )}

      </div>

      <style>{`
        .fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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

export default EsqueceuSenha
