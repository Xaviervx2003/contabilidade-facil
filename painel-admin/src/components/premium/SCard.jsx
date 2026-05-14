import React from 'react'
import { motion } from 'framer-motion'

/**
 * SCard - Super Card Premium
 * Um contêiner padronizado com design Airbnb, sombras suaves e suporte a Glassmorphism.
 */
const SCard = ({ 
  children, 
  title, 
  icon, 
  headerAction, 
  padding = '24px', 
  style = {}, 
  className = '',
  delay = 0 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 24,
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        height: '100%',
        ...style
      }}
      className={`premium-card ${className}`}
    >
      {(title || icon || headerAction) && (
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div className="d-flex align-items-center gap-2">
            {icon && <div style={{ color: 'var(--color-primary)', display: 'flex' }}>{icon}</div>}
            {title && <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-text-primary)', letterSpacing: '-0.2px' }}>{title}</span>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div style={{ padding }}>
        {children}
      </div>
    </motion.div>
  )
}

export default SCard
