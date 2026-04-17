import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCol, CContainer, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilHome, cilArrowLeft } from '@coreui/icons'

const Page404 = () => {
  const navigate = useNavigate()

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center text-center">
          <CCol md={6}>
            {/* Código de erro em destaque */}
            <div className="mb-4">
              <h1
                style={{
                  fontSize: '8rem',
                  fontWeight: '900',
                  color: 'var(--cui-primary)',
                  lineHeight: 1,
                }}
              >
                404
              </h1>
              <h4 className="pt-2">Página não encontrada</h4>
              <p className="text-body-secondary mt-2">
                A rota que você tentou acessar não existe nesta plataforma.
                <br />
                Verifique o endereço ou volte para o início.
              </p>
            </div>

            {/* Ações */}
            <div className="d-flex gap-3 justify-content-center">
              <CButton color="secondary" variant="outline" onClick={() => navigate(-1)}>
                <CIcon icon={cilArrowLeft} className="me-2" />
                Voltar
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

export default Page404
