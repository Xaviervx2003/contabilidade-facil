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
    <CContainer className="px-4 relative max-w-[1360px] mx-auto min-h-screen" lg>
      {/* Container Frame System */}
      <div className="pointer-events-none absolute inset-0 flex justify-center z-[-1]">
        <div className="w-full h-full relative">
          <div className="absolute left-0 md:left-4 top-0 bottom-0 w-px bg-slate-200/70 dark:bg-slate-800/50"></div>
          <div className="absolute right-0 md:right-4 top-0 bottom-0 w-px bg-slate-200/70 dark:bg-slate-800/50"></div>
        </div>
      </div>
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
                  element={<Navigate to={papel === 'aluno' ? '/quiz' : '/dashboard'} replace />}
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
          <Route path="/" element={<Navigate to="/quiz" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
