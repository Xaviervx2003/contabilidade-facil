import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'

/**
 * FolderCard - Um componente premium para representar pastas de conteúdo.
 * Segue as diretrizes de design Airbnb e SaaS Estruturado.
 */
const FolderCard = ({ 
  title, 
  itemCount, 
  progress = 0, 
  color = '#FF385C', 
  icon = 'solar:folder-2-bold-duotone',
  onClick 
}) => {
  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 24,
        padding: '24px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.2s ease'
      }}
      className="folder-card"
    >
      {/* Efeito de Brilho Sutil no Canto */}
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        background: `${color}10`,
        borderRadius: '50%',
        filter: 'blur(20px)'
      }} />

      {/* Ícone e Badge */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div 
          style={{ 
            width: 56, 
            height: 56, 
            background: `${color}12`, 
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color
          }}
        >
          <Icon icon={icon} width="32" />
        </div>
        
        <div style={{
          background: 'var(--color-bg-tertiary)',
          padding: '6px 12px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 800,
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          border: '1px solid var(--color-border)'
        }}>
          <Icon icon="solar:play-stream-bold" width="14" style={{ color: color }} />
          {itemCount} {itemCount === 1 ? 'item' : 'itens'}
        </div>
      </div>

      {/* Título e Descrição */}
      <div className="flex-grow-1">
        <h5 style={{ 
          fontSize: 18, 
          fontWeight: 800, 
          color: 'var(--color-text-primary)', 
          letterSpacing: '-0.5px',
          marginBottom: 8,
          lineHeight: 1.2
        }}>
          {title}
        </h5>
        <div style={{ 
          fontSize: 13, 
          color: 'var(--color-text-secondary)', 
          opacity: 0.7,
          fontWeight: 500 
        }}>
          Explore os materiais e vídeos desta categoria.
        </div>
      </div>

      {/* Barra de Progresso do Grupo */}
      <div className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span style={{ fontSize: 10, fontWeight: 800, color: '#767676', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Seu Progresso
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, color: color }}>
            {progress}%
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 10, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ height: '100%', background: color, borderRadius: 10 }}
          />
        </div>
      </div>
    </motion.div>
  )
}

export default FolderCard
