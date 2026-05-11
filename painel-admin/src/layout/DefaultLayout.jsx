/**
 * DefaultLayout Component
 *
 * Layout principal para rotas protegidas.
 * Verifica autenticação via sessionStorage antes de renderizar.
 */

import React from 'react'
import { Navigate } from 'react-router-dom'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'

const DefaultLayout = () => {
  // 'papel' — mesma chave usada no Login.jsx ao salvar
  const papel = sessionStorage.getItem('papel')
  const isPublicRoute = window.location.hash.includes('/quiz') || window.location.hash.includes('/videos')

  if (!papel && !isPublicRoute) {
    return <Navigate to="/login" replace />
  }

  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <div className="body flex-grow-1">
          <AppContent />
        </div>
        <AppFooter />
      </div>
    </div>
  )
}

export default DefaultLayout