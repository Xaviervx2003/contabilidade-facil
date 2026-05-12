/**
 * App Component
 *
 * Root application component that sets up routing, theme management,
 * and lazy-loaded page components with suspense boundaries.
 *
 * Features:
 * - Client-side routing with HashRouter
 * - Light/Dark theme via ThemeProvider (persiste no localStorage)
 * - Lazy loading for all routes with loading spinner fallback
 * - Public routes (login, register, error pages)
 * - Protected routes wrapped in DefaultLayout
 *
 * @module App
 */

import React, { Suspense } from 'react'
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom'

import { CSpinner } from '@coreui/react'
import { ThemeProvider } from './context/themeContext'
import { Toaster } from 'react-hot-toast'
import './scss/style.scss'

// We use those styles to show code examples, you should remove them in your application.
import './scss/examples.scss'

// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))

// Pages
const Landing = React.lazy(() => import('./views/pages/landing/Landing'))
const Login = React.lazy(() => import('./views/pages/login/Login'))
const Register = React.lazy(() => import('./views/pages/register/Register'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))
const EsqueceuSenha = React.lazy(() => import('./views/pages/esqueceu-senha/EsqueceuSenha'))

const App = () => {
  return (
    <ThemeProvider>
      <HashRouter>
        <Suspense
          fallback={
            <div className="pt-3 text-center">
              <CSpinner color="primary" variant="grow" />
            </div>
          }
        >
          <Routes>
            <Route exact path="/" name="Landing Page" element={<Landing />} />
            <Route exact path="/login" name="Login Page" element={<Login />} />
            <Route exact path="/register" name="Register Page" element={<Register />} />
            <Route exact path="/404" name="Page 404" element={<Page404 />} />
            <Route exact path="/500" name="Page 500" element={<Page500 />} />
            <Route exact path="/esqueceu-senha" name="Esqueceu a Senha" element={<EsqueceuSenha />} />
            <Route path="*" name="Home" element={<DefaultLayout />} />
          </Routes>
        </Suspense>
      </HashRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '14px',
            fontSize: '13px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 99999,
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </ThemeProvider>
  )
}

export default App
