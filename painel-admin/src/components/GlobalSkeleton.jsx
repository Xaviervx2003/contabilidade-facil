import React from 'react'
import { CSpinner } from '@coreui/react'

const GlobalSkeleton = () => {
  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Sidebar Skeleton */}
      <div 
        className="d-none d-lg-block border-end" 
        style={{ width: '256px', backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <div className="p-3 border-bottom" style={{ height: '64px' }}>
           <div className="bg-body-tertiary rounded w-75 h-100 placeholder-glow"></div>
        </div>
        <div className="p-3 d-flex flex-column gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-body-tertiary rounded placeholder-glow" style={{ height: '32px', width: `${Math.random() * 40 + 50}%` }}></div>
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-grow-1 d-flex flex-column">
        {/* Header Skeleton */}
        <div className="border-bottom d-flex align-items-center px-4" style={{ height: '64px', backgroundColor: 'var(--color-bg-secondary)' }}>
          <div className="bg-body-tertiary rounded placeholder-glow" style={{ height: '24px', width: '200px' }}></div>
        </div>

        {/* Body Skeleton */}
        <div className="p-4 flex-grow-1 d-flex flex-column align-items-center justify-content-center">
            <CSpinner color="primary" variant="grow" className="mb-3" />
            <p className="text-body-secondary small text-uppercase fw-bold tracking-wider">Carregando Módulo...</p>
        </div>
      </div>
    </div>
  )
}

export default GlobalSkeleton
