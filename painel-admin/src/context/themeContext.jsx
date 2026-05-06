/**
 * themeContext.jsx — Sistema de Tema Light/Dark
 *
 * Gerencia o estado do tema (light/dark) e aplica CSS variables
 * para que todo o site use cores consistentes.
 *
 * Integra com o CoreUI via `data-coreui-theme` para que os
 * componentes nativos (@coreui/react) também respeitem o tema.
 */

import React, { createContext, useContext, useEffect, useState } from 'react'

// ── Paleta de Cores ──────────────────────────────────────────────────────────
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
      secondary: '#9ca3af',
      tertiary: '#6b7280',
      muted: '#4b5563',
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

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light')

    const root = document.documentElement

    // Sincronizar com CoreUI (para CButton, CCard, etc. funcionarem)
    root.setAttribute('data-coreui-theme', isDark ? 'dark' : 'light')
    root.setAttribute('data-theme', isDark ? 'dark' : 'light')

    // Aplicar CSS variables customizadas
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
  }, [isDark])

  const toggleTheme = () => setIsDark((prev) => !prev)

  return (
    <ThemeContext.Provider
      value={{ isDark, toggleTheme, currentTheme: isDark ? themes.dark : themes.light }}
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
