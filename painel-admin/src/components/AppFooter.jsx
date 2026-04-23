import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <span className="fw-bold">Contabilidade Fácil</span>
        <span className="ms-1">&copy; {new Date().getFullYear()}. Todos os direitos reservados.</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Plataforma de Estudos</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
