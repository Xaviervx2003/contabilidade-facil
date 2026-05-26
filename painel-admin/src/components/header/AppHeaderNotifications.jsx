import React, { useState, useEffect, useCallback, useRef } from 'react'
import { CSpinner } from '@coreui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import api from '../../services/api'
import { getAlunoMatricula } from '../../utils/auth'

const AppHeaderNotifications = () => {
  const [notificacoes, setNotificacoes] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const matricula = getAlunoMatricula()

  const carregarNotificacoes = useCallback(async () => {
    if (!matricula) return
    try {
      const res = await api.get(`/api/trilhas/notificacoes/${matricula}`)
      setNotificacoes(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error('Erro ao carregar notificações:', e)
    }
  }, [matricula])

  useEffect(() => {
    carregarNotificacoes()
    // Polling a cada 2 minutos
    const interval = setInterval(carregarNotificacoes, 120000)
    return () => clearInterval(interval)
  }, [carregarNotificacoes])

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

  const marcarLida = async (id) => {
    try {
      await api.put(`/api/trilhas/notificacoes/${id}/lida`)
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    } catch (e) {
      console.error(e)
    }
  }

  const pendentes = notificacoes.filter(n => !n.lida).length

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Gatilho (Sino de Notificações) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          padding: 8,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-primary)',
          borderRadius: 12,
          position: 'relative',
          transition: 'background-color 0.2s',
          outline: 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        aria-label="Notificações"
        aria-expanded={isOpen}
      >
        <Icon icon={isOpen ? "solar:bell-bold" : "solar:bell-bold-duotone"} width="22" style={{ color: isOpen ? 'var(--accent-primary)' : 'var(--color-text-primary)' }} />
        {pendentes > 0 && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            background: 'var(--accent-primary, #FF385C)',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 800,
            borderRadius: '50%',
            width: 15,
            height: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px var(--color-bg-elevated, #fff)',
          }}>
            {pendentes}
          </span>
        )}
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
              width: 320,
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 20,
              boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
              zIndex: 1050,
              padding: '16px 0 0',
              overflow: 'hidden',
            }}
          >
            {/* Cabeçalho */}
            <div style={{
              padding: '0 20px 12px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>Notificações</span>
              {pendentes > 0 && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  background: 'rgba(255, 56, 92, 0.08)',
                  padding: '2px 8px',
                  borderRadius: 8,
                }}>
                  {pendentes} nova{pendentes > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Lista de Notificações */}
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {loading ? (
                <div className="text-center py-4"><CSpinner size="sm" /></div>
              ) : notificacoes.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--color-text-muted, #767676)',
                }}>
                  <Icon icon="solar:bell-off-bold-duotone" width="36" style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Tudo limpo por aqui!</div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: 4 }}>Nenhuma notificação encontrada no momento.</div>
                </div>
              ) : (
                notificacoes.map((n) => (
                  <motion.a
                    key={n.id}
                    href={`#${n.link || '/dashboard'}`}
                    onClick={() => {
                      marcarLida(n.id)
                      setIsOpen(false)
                    }}
                    whileHover={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                    style={{
                      display: 'block',
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--color-border)',
                      textDecoration: 'none',
                      color: 'var(--color-text-primary)',
                      position: 'relative',
                    }}
                  >
                    {!n.lida && (
                      <span style={{
                        position: 'absolute',
                        left: 8,
                        top: 20,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--accent-primary, #FF385C)',
                      }} />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{
                        fontWeight: n.lida ? 600 : 800,
                        fontSize: '13px',
                        lineHeight: 1.3,
                        color: 'var(--color-text-primary)',
                      }}>
                        {n.titulo}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        color: 'var(--color-text-muted, #767676)',
                        whiteSpace: 'nowrap',
                      }}>
                        {new Date(n.data_criacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--color-text-muted, #767676)',
                      marginTop: 4,
                      lineHeight: 1.3,
                    }}>
                      {n.mensagem}
                    </div>
                  </motion.a>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AppHeaderNotifications
