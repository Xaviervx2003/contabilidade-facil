/**
 * themeContext.jsx — Sistema de Tema Light/Dark + Paleta de Cores de Destaque
 *
 * Gerencia:
 * 1. Tema claro/escuro (isDark / toggleTheme)
 * 2. Paleta de cores de destaque (accentPalette / setAccentPalette)
 *
 * Ambos são persistidos em localStorage e aplicados via CSS variables,
 * o que garante que todo o site reaja instantaneamente à troca.
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { COLOR_PALETTES, DEFAULT_PALETTE } from '../tokens'

// ── Paleta de Cores de Fundo (Light/Dark) ────────────────────────────────────
const themes = {
  light: {
    primary: '#2c3e50',
    secondary: '#3498db',
    accent: '#e74c3c',

    bg: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      tertiary: '#f0f0f0',
      elevated: '#ffffff',
    },

    text: {
      primary: '#2c3e50',
      secondary: '#5a6c7d',
      tertiary: '#7f8c8d',
      muted: '#95a5a6',
      inverse: '#ffffff',
    },

    border: '#e0e0e0',
    divider: '#e8e8e8',
    hover: '#f5f5f5',
    active: '#e8f4f8',
    disabled: '#bdc3c7',
    icon: '#5a6c7d',
    iconHover: '#2c3e50',
  },

  dark: {
    primary: '#E1E0CC',
    secondary: '#9ca3af',
    accent: '#DEDBC8',

    bg: {
      primary: '#000000',
      secondary: '#151515',
      tertiary: '#212121',
      elevated: '#101010',
    },

    text: {
      primary: '#E1E0CC',
      secondary: '#d1d5db',
      tertiary: '#9ca3af',
      muted: '#9ca3af',
      inverse: '#000000',
    },

    border: '#2a2a2a',
    divider: '#1a1a1a',
    hover: '#1a1a1a',
    active: '#212121',
    disabled: '#3a3a3a',
    icon: '#9ca3af',
    iconHover: '#E1E0CC',
  },
}

const semanticColors = {
  light: {
    success: '#27ae60',
    successBg: 'rgba(39, 174, 96, 0.1)',
    error: '#e74c3c',
    errorBg: 'rgba(231, 76, 60, 0.1)',
    warning: '#f39c12',
    warningBg: 'rgba(243, 156, 18, 0.1)',
    info: '#3498db',
    infoBg: 'rgba(52, 152, 219, 0.1)',
  },
  dark: {
    success: '#4ade80',
    successBg: 'rgba(74, 222, 128, 0.15)',
    error: '#f87171',
    errorBg: 'rgba(248, 113, 113, 0.15)',
    warning: '#fbbf24',
    warningBg: 'rgba(251, 191, 36, 0.15)',
    info: '#60a5fa',
    infoBg: 'rgba(96, 165, 250, 0.15)',
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  // ── Estado: Light / Dark ───────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // ── Estado: Paleta de Destaque ─────────────────────────────────────────────
  const [accentPalette, setAccentPaletteState] = useState(() => {
    const saved = localStorage.getItem('theme-accent')
    return saved && COLOR_PALETTES[saved] ? saved : DEFAULT_PALETTE
  })

  // ── Efeito: Aplicar Tema Claro/Escuro ─────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light')

    const root = document.documentElement

    // Sincronizar com CoreUI
    root.setAttribute('data-coreui-theme', isDark ? 'dark' : 'light')
    root.setAttribute('data-theme', isDark ? 'dark' : 'light')

    // Aplicar CSS variables de fundo/texto
    const currentTheme = isDark ? themes.dark : themes.light
    Object.entries(currentTheme).forEach(([key, value]) => {
      if (typeof value === 'object') {
        Object.entries(value).forEach(([subKey, subValue]) => {
          root.style.setProperty(`--color-${key}-${subKey}`, subValue)
        })
      } else {
        root.style.setProperty(`--color-${key}`, value)
      }
    })

    // Aplicar cores semânticas
    const semantic = isDark ? semanticColors.dark : semanticColors.light
    Object.entries(semantic).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value)
    })

    // color-scheme: corrige scrollbars e inputs nativos no dark mode
    root.style.colorScheme = isDark ? 'dark' : 'light'

    // meta theme-color: sincroniza barra do browser/mobile
    const bgColor = isDark ? themes.dark.bg.primary : themes.light.bg.primary
    let metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta')
      metaThemeColor.setAttribute('name', 'theme-color')
      document.head.appendChild(metaThemeColor)
    }
    metaThemeColor.setAttribute('content', bgColor)
  }, [isDark])

  // ── Efeito: Aplicar Paleta de Destaque ────────────────────────────────────
  useEffect(() => {
    const palette = COLOR_PALETTES[accentPalette] || COLOR_PALETTES[DEFAULT_PALETTE]
    const root = document.documentElement

    // Aplicar todas as CSS variables da paleta
    Object.entries(palette.cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    localStorage.setItem('theme-accent', accentPalette)
  }, [accentPalette])

  const toggleTheme = () => setIsDark((prev) => !prev)

  const setAccentPalette = (paletteId) => {
    if (COLOR_PALETTES[paletteId]) {
      setAccentPaletteState(paletteId)
    }
  }

  const currentPalette = COLOR_PALETTES[accentPalette] || COLOR_PALETTES[DEFAULT_PALETTE]

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleTheme,
        currentTheme: isDark ? themes.dark : themes.light,
        accentPalette,
        setAccentPalette,
        currentPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider')
  }
  return context
}

export default themes
