import React, { createContext, useContext, useEffect, useState } from 'react'

// Definição da paleta de cores
const themes = {
    light: {
        // Cores principais
        primary: '#2c3e50',
        secondary: '#3498db',
        accent: '#e74c3c',

        // Fundos
        bg: {
            primary: '#ffffff',
            secondary: '#f8f9fa',
            tertiary: '#f0f0f0',
            elevated: '#ffffff',
        },

        // Textos
        text: {
            primary: '#2c3e50',
            secondary: '#5a6c7d',
            tertiary: '#7f8c8d',
            muted: '#95a5a6',
            inverse: '#ffffff',
        },

        // Bordas
        border: '#e0e0e0',
        divider: '#e8e8e8',

        // Estados
        hover: '#f5f5f5',
        active: '#e8f4f8',
        disabled: '#bdc3c7',

        // Cores de ícones
        icon: '#5a6c7d',
        iconHover: '#2c3e50',
    },

    dark: {
        // Cores principais (da paleta customizada)
        primary: '#E1E0CC',
        secondary: '#9ca3af',
        accent: '#DEDBC8',

        // Fundos
        bg: {
            primary: '#000000',
            secondary: '#151515',
            tertiary: '#212121',
            elevated: '#101010',
        },

        // Textos
        text: {
            primary: '#E1E0CC',
            secondary: '#9ca3af',
            tertiary: '#6b7280',
            muted: '#4b5563',
            inverse: '#000000',
        },

        // Bordas
        border: '#2a2a2a',
        divider: '#1a1a1a',

        // Estados
        hover: '#1a1a1a',
        active: '#212121',
        disabled: '#3a3a3a',

        // Cores de ícones
        icon: '#9ca3af',
        iconHover: '#E1E0CC',
    },
}

const ThemeContext = createContext()

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(() => {
        // Verificar preferência salva ou preferência do sistema
        const saved = localStorage.getItem('theme-mode')
        if (saved) return saved === 'dark'

        return window.matchMedia('(prefers-color-scheme: dark)').matches
    })

    useEffect(() => {
        // Salvar preferência
        localStorage.setItem('theme-mode', isDark ? 'dark' : 'light')

        // Aplicar ao documento
        const root = document.documentElement
        root.setAttribute('data-theme', isDark ? 'dark' : 'light')

        // Aplicar CSS variables
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

    const toggleTheme = () => {
        setIsDark(!isDark)
    }

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, currentTheme: isDark ? themes.dark : themes.light }}>
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