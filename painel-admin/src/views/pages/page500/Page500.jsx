import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCol,
  CContainer,
  CRow,
  CBadge,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilHome, cilReload, cilWarning, cilCheckCircle } from '@coreui/icons'
import { API_URL } from '../../../config'

const Page500 = () => {
  const navigate = useNavigate()
  const [statusAPI, setStatusAPI] = useState('verificando') // 'verificando' | 'online' | 'offline'
  const [statusDB, setStatusDB] = useState('verificando')

  // Verifica se a API está respondendo ao carregar a página
  useEffect(() => {
    verificarServicos()
  }, [])

  const verificarServicos = async () => {
    setStatusAPI('verificando')
    setStatusDB('verificando')

    // 1. Testa a raiz da API FastAPI
    try {
      const res = await fetch(`${API_URL}/`, { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        setStatusAPI('online')
      } else {
        setStatusAPI('offline')
      }
    } catch {
      setStatusAPI('offline')
    }

    // 2. Testa uma rota que usa o banco (se a API estiver de pé)
    try {
      const res = await fetch(`${API_URL}/api/questoes`, { signal: AbortSignal.timeout(4000) })
      if (res.ok) {
        setStatusDB('online')
      } else {
        setStatusDB('offline')
      }
    } catch {
      setStatusDB('offline')
    }
  }

  const StatusBadge = ({ status }) => {
    if (status === 'verificando') {
      return (
        <CBadge color="secondary" className="ms-2">
          <CSpinner size="sm" className="me-1" />
          Verificando...
        </CBadge>
      )
    }
    if (status === 'online') {
      return (
        <CBadge color="success" className="ms-2">
          <CIcon icon={cilCheckCircle} className="me-1" />
          Online
        </CBadge>
      )
    }
    return (
      <CBadge color="danger" className="ms-2">
        <CIcon icon={cilWarning} className="me-1" />
        Offline
      </CBadge>
    )
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center text-center">
          <CCol md={7}>
            {/* Código de erro em destaque */}
            <div className="mb-4">
              <h1
                style={{
                  fontSize: '8rem',
                  fontWeight: '900',
                  color: 'var(--cui-danger)',
                  lineHeight: 1,
                }}
              >
                500
              </h1>
              <h4 className="pt-2">Erro interno no servidor</h4>
              <p className="text-body-secondary mt-2">
                Algo deu errado na comunicação com o servidor.
                <br />
                Veja o diagnóstico abaixo e tente novamente.
              </p>
            </div>

            {/* Painel de diagnóstico dos serviços */}
            <div
              className="border rounded p-4 mb-4 text-start"
              style={{ background: 'var(--cui-body-bg)' }}
            >
              <h6 className="text-body-secondary mb-3">🔍 Diagnóstico de Serviços</h6>

              <div className="d-flex align-items-center justify-content-between mb-2">
                <span>
                  <strong>API FastAPI</strong>
                  <small className="text-body-secondary ms-2">{API_URL}</small>
                </span>
                <StatusBadge status={statusAPI} />
              </div>

              <div className="d-flex align-items-center justify-content-between">
                <span>
                  <strong>Banco de Dados</strong>
                  <small className="text-body-secondary ms-2">PostgreSQL via API</small>
                </span>
                <StatusBadge status={statusDB} />
              </div>

              {(statusAPI === 'offline' || statusDB === 'offline') && (
                <div className="alert alert-warning mt-3 mb-0 py-2" role="alert">
                  <small>
                    💡 <strong>Dica:</strong> Verifique se o FastAPI está rodando com{' '}
                    <code>uvicorn main:app --reload</code> e se o container Docker do PostgreSQL está
                    ativo.
                  </small>
                </div>
              )}

              {statusAPI === 'online' && statusDB === 'online' && (
                <div className="alert alert-success mt-3 mb-0 py-2" role="alert">
                  <small>✅ Todos os serviços estão operacionais. Você já pode voltar ao sistema.</small>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="d-flex gap-3 justify-content-center">
              <CButton
                color="secondary"
                variant="outline"
                onClick={verificarServicos}
                disabled={statusAPI === 'verificando'}
              >
                <CIcon icon={cilReload} className="me-2" />
                Verificar novamente
              </CButton>
              <CButton color="primary" onClick={() => navigate('/dashboard')}>
                <CIcon icon={cilHome} className="me-2" />
                Ir para o Dashboard
              </CButton>
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Page500
