import React from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '@iconify/react'

/**
 * Exibe um diálogo de confirmação elegante usando react-hot-toast.
 * Retorna uma Promise que resolve em true (confirmado) ou false (cancelado).
 */
export const confirmDialog = (message) => {
  return new Promise((resolve) => {
    toast.custom(
      (t) => (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(3px)',
            animation: t.visible ? 'fadeIn 0.2s ease-out' : 'fadeOut 0.2s ease-in',
            opacity: t.visible ? 1 : 0,
            transition: 'opacity 0.2s',
            fontFamily: "'Nunito', sans-serif"
          }}
        >
          <div 
            style={{ 
              background: 'var(--color-bg-elevated)', 
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              minWidth: '300px',
              maxWidth: '380px',
              transform: t.visible ? 'scale(1)' : 'scale(0.95)',
              transition: 'transform 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
              <Icon icon="solar:question-square-bold" width="28" style={{ color: 'var(--accent-primary, #FF385C)', flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                {message}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={() => { toast.dismiss(t.id); resolve(false); }} 
                style={{ 
                  background: 'transparent', 
                  border: '1.5px solid var(--color-border)', 
                  borderRadius: 8, 
                  padding: '8px 16px', 
                  fontSize: 13, 
                  fontWeight: 700,
                  cursor: 'pointer', 
                  color: 'var(--color-text-secondary)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => { toast.dismiss(t.id); resolve(true); }} 
                style={{ 
                  background: 'var(--accent-primary, #FF385C)', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: '8px 20px', 
                  fontSize: 13, 
                  fontWeight: 800, 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 10px rgba(255, 56, 92, 0.2)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ),
      {
        duration: Infinity,
      }
    )
  })
}
