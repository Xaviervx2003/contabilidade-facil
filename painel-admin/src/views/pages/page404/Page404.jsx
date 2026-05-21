import React from 'react'
import { Link } from 'react-router-dom'
import { CButton, CCol, CContainer, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMagnifyingGlass, cilArrowLeft } from '@coreui/icons'

const Page404 = () => {
  const airbnbRed = '#FF5A5F'
  const airbnbTeal = '#00A699'

  return (
    <div className="min-vh-100 d-flex flex-row align-items-center bg-white">
      <CContainer>
        <CRow className="justify-content-center text-center">
          <CCol md={8} lg={6}>
            <div className="mb-5 position-relative mx-auto fade-in-up" style={{ width: '240px', height: '240px' }}>
              <div className="position-absolute w-100 h-100 rounded-circle" style={{ background: 'rgba(0,166,153,0.1)', animation: 'pulse 3s infinite' }}></div>
              <div className="position-absolute w-75 h-75 top-50 start-50 translate-middle rounded-circle" style={{ background: 'rgba(255,90,95,0.1)' }}></div>
              <CIcon icon={cilMagnifyingGlass} size="3xl" className="position-absolute top-50 start-50 translate-middle" style={{ color: airbnbRed, width: '100px', height: '100px' }} />
            </div>

            <div className="fade-in-up" style={{ animationDelay: '0.1s' }}>
              <h1 className="display-1 fw-bolder mb-3" style={{ color: '#222222', letterSpacing: '-0.05em' }}>404</h1>
              <h2 className="h3 fw-bold mb-3" style={{ color: '#484848' }}>Parece que nos perdemos!</h2>
              <p className="text-muted mb-5" style={{ fontSize: '1.1rem' }}>
                A página que você está procurando deve ter tirado férias. Mas não se preocupe, o caminho de volta está logo ali.
              </p>

              <Link to="/login" className="text-decoration-none">
                <CButton 
                  className="py-3 px-5 fw-bold rounded-pill shadow-sm d-inline-flex align-items-center gap-2 airbnb-btn"
                  style={{ backgroundColor: '#222222', borderColor: '#222222', color: 'white', fontSize: '1.1rem' }}
                >
                  <CIcon icon={cilArrowLeft} /> Voltar para o Início
                </CButton>
              </Link>
            </div>
          </CCol>
        </CRow>
      </CContainer>

      <style>{`
        .fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        .airbnb-btn {
          transition: transform 0.1s, box-shadow 0.2s;
        }
        .airbnb-btn:hover {
          transform: scale(0.98);
        }
        .airbnb-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  )
}

export default Page404
