/**
 * ThemePicker.jsx — Seletor de Paleta de Cores do Layout
 *
 * Exibe um botão 🎨 no header que abre um popover com as paletas disponíveis.
 * Ao selecionar, a cor de destaque de toda a interface muda instantaneamente.
 */

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useTheme } from '../context/themeContext'
import { COLOR_PALETTES } from '../tokens'

const ThemePicker = () => {
  const { accentPalette, setAccentPalette, currentPalette } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const palettes = Object.values(COLOR_PALETTES)

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Botão de abertura */}
      <button
        className="theme-toggle"
        onClick={() => setIsOpen((v) => !v)}
        title="Personalizar cores do layout"
        aria-label="Abrir seletor de paleta de cores"
        aria-expanded={isOpen}
        style={{
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Anel colorido mostrando a paleta ativa */}
        <span
          style={{
            display: 'block',
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: `conic-gradient(
              ${currentPalette.primary} 0deg 120deg,
              ${currentPalette.secondary} 120deg 240deg,
              ${currentPalette.accent} 240deg 360deg
            )`,
            boxShadow: `0 0 0 2px var(--color-bg-elevated)`,
          }}
        />
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 12px)',
              right: 0,
              width: 240,
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 20,
              boxShadow: '0 16px 48px rgba(0,0,0,0.16)',
              padding: '16px',
              zIndex: 9999,
            }}
          >
            {/* Cabeçalho */}
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: 'var(--color-text-muted, #767676)',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Icon icon="solar:palette-bold-duotone" width="14" />
              Paleta de Cores
            </div>

            {/* Grade de paletas */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
            }}>
              {palettes.map((palette) => {
                const isActive = accentPalette === palette.id
                return (
                  <motion.button
                    key={palette.id}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setAccentPalette(palette.id)
                      setIsOpen(false)
                    }}
                    title={palette.label}
                    aria-pressed={isActive}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 6px',
                      borderRadius: 14,
                      border: isActive
                        ? `2px solid ${palette.primary}`
                        : '2px solid transparent',
                      background: isActive
                        ? `${palette.primary}12`
                        : 'var(--color-bg-tertiary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                  >
                    {/* Bolha de cor */}
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: `conic-gradient(
                        ${palette.primary} 0deg 120deg,
                        ${palette.secondary} 120deg 240deg,
                        ${palette.accent} 240deg 360deg
                      )`,
                      boxShadow: isActive
                        ? `0 4px 12px ${palette.primary}50`
                        : '0 2px 6px rgba(0,0,0,0.08)',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon
                            icon="solar:check-circle-bold"
                            width="12"
                            style={{ color: palette.primary }}
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Nome */}
                    <span style={{
                      fontSize: 10,
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? palette.primary : 'var(--color-text-muted, #767676)',
                      letterSpacing: '0.2px',
                    }}>
                      {palette.label}
                    </span>
                  </motion.button>
                )
              })}
            </div>

            {/* Dica */}
            <div style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--color-border)',
              fontSize: 11,
              color: 'var(--color-text-muted, #767676)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Icon icon="solar:info-circle-linear" width="12" />
              A escolha é salva automaticamente.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ThemePicker
