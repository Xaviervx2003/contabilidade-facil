/**
 * AppContent Component
 *
 * Main content area that renders routes defined in routes.js.
 * Enforces role-based access control using allowedRoles from route config.
 *
 * @component
 */

import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'

// routes config
import { routes } from '../routes'

const AppContent = () => {
  const papel = sessionStorage.getItem('papel') || 'aluno'

  return (
    <CContainer className="px-4" lg>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) => {
            if (!route.element) return null

            // Se a rota tem allowedRoles e o papel atual não está incluído, bloqueia
            if (route.allowedRoles && !route.allowedRoles.includes(papel)) {
              return (
                <Route
                  key={idx}
                  path={route.path}
                  element={<Navigate to="/quiz" replace />}
                />
              )
            }

            return (
              <Route
                key={idx}
                path={route.path}
                exact={route.exact}
                name={route.name}
                element={<route.element />}
              />
            )
          })}
          <Route path="/" element={<Navigate to={papel === 'aluno' ? 'quiz' : 'dashboard'} replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
