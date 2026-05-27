import React, { useState, useRef, useEffect } from 'react'
import { CAvatar } from '@coreui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useNavigate } from 'react-router-dom'
import useAuthSession from '../../hooks/useAuthSession'

// Gera as iniciais a partir do nome (ex: "João Silva" → "JS")
const getIniciais = (nome) => {
  const partes = nome.trim().split(/\s+/)
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

// Gera uma cor de fundo baseada no nome (consistente por usuário)
const getCorAvatar = (nome) => {
  const cores = [
    '#FF5A5F', '#3b5998', '#34a853', '#8a3ab9',
    '#fbbc05', '#1abc9c', '#e67e22', '#2980b9',
  ]
  let hash = 0
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  }
  return cores[Math.abs(hash) % cores.length]
}

const AppHeaderDropdown = () => {
  const navigate = useNavigate()
  const { nome, papel } = useAuthSession()
  const userName = nome || 'Usuário'
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    sessionStorage.clear()
    window.location.href = '#/login'
  }

  // Itens em Breve
  const handleFutureClick = (e) => {
    e.preventDefault()
  }

  const dropdownItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 20px',
    border: 'none',
    background: 'transparent',
    color: 'var(--color-text-primary)',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s, color 0.15s',
  }

  const headerStyle = {
    padding: '12px 20px',
    borderBottom: '1px solid var(--color-border)',
    marginBottom: 8,
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Gatilho (Avatar) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '50%',
          outline: 'none',
        }}
        aria-label="Menu do usuário"
        aria-expanded={isOpen}
      >
        <CAvatar
          size="md"
          style={{
            backgroundColor: getCorAvatar(userName),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.85rem',
            color: '#fff',
            boxShadow: isOpen ? '0 0 0 2px var(--accent-primary)' : '0 2px 6px rgba(0,0,0,0.08)',
            transition: 'all 0.2s',
          }}
        >
          {getIniciais(userName)}
        </CAvatar>
      </button>

      {/* Menu Suspenso */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 12px)',
              right: 0,
              width: 260,
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 20,
              boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
              zIndex: 1050,
              padding: '8px 0',
            }}
          >
            {/* Cabeçalho do Dropdown */}
            <div style={headerStyle}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                Olá, {userName.split(' ')[0]}!
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginTop: 2,
              }}>
                {papel === 'aluno' ? '🏆 Estudante' : papel === 'admin' ? '🛡️ Administrador' : '💼 Professor'}
              </div>
            </div>

            {/* Links Ativos */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <motion.button
                whileHover={{ x: 3, backgroundColor: 'var(--color-bg-tertiary)' }}
                onClick={() => {
                  setIsOpen(false)
                  navigate('/perfil')
                }}
                style={dropdownItemStyle}
              >
                <Icon icon="solar:user-bold-duotone" width="18" style={{ color: 'var(--accent-primary)' }} />
                Minha Conta
              </motion.button>

              <motion.button
                whileHover={{ x: 3, backgroundColor: 'var(--color-bg-tertiary)' }}
                onClick={() => {
                  setIsOpen(false)
                  navigate('/aluno/historico')
                }}
                style={dropdownItemStyle}
              >
                <Icon icon="solar:history-bold-duotone" width="18" style={{ color: 'var(--accent-primary)' }} />
                Meu Histórico
              </motion.button>
            </div>

            {/* Separador */}
            <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 0' }} />

            {/* Em Breve / Configurações */}
            <div style={{ display: 'flex', flexDirection: 'column', opacity: 0.6 }}>
              <button onClick={handleFutureClick} style={{ ...dropdownItemStyle, cursor: 'not-allowed' }} title="Recurso em breve">
                <Icon icon="solar:bell-bold-duotone" width="18" />
                <span>Notificações</span>
                <span style={{ fontSize: '9px', fontWeight: 800, background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: 6, marginLeft: 'auto' }}>breve</span>
              </button>

              <button onClick={handleFutureClick} style={{ ...dropdownItemStyle, cursor: 'not-allowed' }} title="Recurso em breve">
                <Icon icon="solar:letter-bold-duotone" width="18" />
                <span>Mensagens</span>
                <span style={{ fontSize: '9px', fontWeight: 800, background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: 6, marginLeft: 'auto' }}>breve</span>
              </button>

              <button onClick={handleFutureClick} style={{ ...dropdownItemStyle, cursor: 'not-allowed' }} title="Recurso em breve">
                <Icon icon="solar:settings-bold-duotone" width="18" />
                <span>Configurações</span>
                <span style={{ fontSize: '9px', fontWeight: 800, background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: 6, marginLeft: 'auto' }}>breve</span>
              </button>
            </div>

            {/* Separador */}
            <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 0' }} />

            {/* Sair */}
            <motion.button
              whileHover={{ backgroundColor: 'rgba(255, 56, 92, 0.08)' }}
              onClick={handleLogout}
              style={{
                ...dropdownItemStyle,
                color: 'var(--accent-primary, #FF385C)',
              }}
            >
              <Icon icon="solar:logout-bold-duotone" width="18" />
              Sair do Sistema
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AppHeaderDropdown