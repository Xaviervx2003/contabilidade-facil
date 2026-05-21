import React from 'react'
import { Link } from 'react-router-dom'
import { CButton, CCol, CContainer, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSettings, cilArrowLeft } from '@coreui/icons'

const Page500 = () => {
  const airbnbTeal = '#00A699'

  return (
    <div className="min-vh-100 d-flex flex-row align-items-center bg-white">
      <CContainer>
        <CRow className="justify-content-center text-center">
          <CCol md={8} lg={6}>
            <div className="mb-5 position-relative mx-auto fade-in-up" style={{ width: '240px', height: '240px' }}>
              <div className="position-absolute w-100 h-100 rounded-circle" style={{ background: 'rgba(255,165,0,0.1)', animation: 'spin-slow 10s linear infinite' }}></div>
              <div className="position-absolute w-75 h-75 top-50 start-50 translate-middle rounded-circle" style={{ background: 'rgba(0,166,153,0.1)' }}></div>
              <CIcon icon={cilSettings} size="3xl" className="position-absolute top-50 start-50 translate-middle" style={{ color: airbnbTeal, width: '90px', height: '90px', transform: 'rotate(-45deg)' }} />
            </div>

            <div className="fade-in-up" style={{ animationDelay: '0.1s' }}>
              <h1 className="display-1 fw-bolder mb-3" style={{ color: '#222222', letterSpacing: '-0.05em' }}>500</h1>
              <h2 className="h3 fw-bold mb-3" style={{ color: '#484848' }}>Houston, temos um pequeno problema!</h2>
              <p className="text-muted mb-5" style={{ fontSize: '1.1rem' }}>
                Nossos robôs contadores deixaram cair café no servidor. A equipe já está com os esfregões limpando tudo. Tente novamente em alguns minutinhos!
              </p>

              <Link to="/login" className="text-decoration-none">
                <CButton 
                  className="py-3 px-5 fw-bold rounded-pill shadow-sm d-inline-flex align-items-center gap-2 airbnb-btn"
                  style={{ backgroundColor: '#222222', borderColor: '#222222', color: 'white', fontSize: '1.1rem' }}
                >
                  <CIcon icon={cilArrowLeft} /> Voltar com Segurança
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
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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

export default Page500
