import React from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '@iconify/react'

/**
 * Exibe um diálogo de confirmação elegante usando react-hot-toast.
 * Retorna uma Promise que resolve em true (confirmado) ou false (cancelado).
 */
export const confirmDialog = (message) => {
  return new Promise((resolve) => {
    toast((t) => (
      <div style={{ fontFamily: "'Nunito', sans-serif", padding: '4px 2px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <Icon icon="solar:question-square-bold" width="22" style={{ color: 'var(--accent-primary, #FF385C)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
            {message}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button 
            type="button"
            onClick={() => { toast.dismiss(t.id); resolve(false); }} 
            style={{ 
              background: 'transparent', 
              border: '1.5px solid var(--color-border)', 
              borderRadius: 8, 
              padding: '6px 12px', 
              fontSize: 11, 
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
              padding: '6px 14px', 
              fontSize: 11, 
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
    ), { 
      duration: Infinity, 
      position: 'top-center',
      style: {
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
        minWidth: '280px',
        maxWidth: '350px',
        zIndex: 99999
      }
    });
  });
}
