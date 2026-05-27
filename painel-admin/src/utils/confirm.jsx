import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'

const ConfirmModal = ({ message, onResolve }) => {
  const [isOpen, setIsOpen] = useState(true)

  const handleClose = (result) => {
    setIsOpen(false)
    // Aguarda a animação de saída antes de resolver a promise
    setTimeout(() => onResolve(result), 250)
  }

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleClose(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: "'Nunito', 'Circular Std', sans-serif"
          }}
          onClick={() => handleClose(false)} // Fecha se clicar fora do modal
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            onClick={(e) => e.stopPropagation()} // Evita que clique no modal propague para o backdrop
            style={{
              background: 'var(--color-bg-elevated, #ffffff)',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
              <div style={{ 
                background: 'rgba(255, 56, 92, 0.12)', 
                color: 'var(--accent-primary, #FF385C)',
                padding: '14px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon icon="solar:danger-triangle-bold-duotone" width="32" height="32" />
              </div>
              <div style={{ paddingTop: '2px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '19px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  Atenção
                </h4>
                <p style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {message}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={() => handleClose(false)} 
                style={{ 
                  background: 'transparent', 
                  border: '1.5px solid var(--color-border)', 
                  borderRadius: '12px', 
                  padding: '12px 20px', 
                  fontSize: '14px', 
                  fontWeight: 700,
                  cursor: 'pointer', 
                  color: 'var(--color-text-primary)',
                  transition: 'all 0.2s',
                  flex: 1
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => handleClose(true)} 
                style={{ 
                  background: 'var(--accent-primary, #FF385C)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '12px', 
                  padding: '12px 20px', 
                  fontSize: '14px', 
                  fontWeight: 800, 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flex: 1,
                  boxShadow: '0 4px 12px rgba(255, 56, 92, 0.3)'
                }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.opacity = '0.9'; 
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 56, 92, 0.4)';
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.opacity = '1'; 
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 56, 92, 0.3)';
                }}
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/**
 * Exibe um diálogo de confirmação elegante montado na raiz do DOM.
 * Retorna uma Promise que SEMPRE resolve em true (confirmado) ou false (cancelado).
 * Isso evita o travamento de tela causado por Toasts que somem sem resolver a Promise.
 */
export const confirmDialog = (message) => {
  return new Promise((resolve) => {
    // Cria um contêiner DOM fora da hierarquia principal do React
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const handleResolve = (result) => {
      // Pequeno delay para garantir que o React desmontou a árvore virtual
      setTimeout(() => {
        root.unmount()
        container.remove()
      }, 50)
      
      resolve(result)
    }

    // Renderiza o modal customizado
    root.render(<ConfirmModal message={message} onResolve={handleResolve} />)
  })
}
