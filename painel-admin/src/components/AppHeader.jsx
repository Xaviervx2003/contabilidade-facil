/**
 * AppHeader Component
 *
 * Modernized application header with backdrop blur, custom themes, and refined controls.
 */

import React, { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CContainer,
  CHeader,
} from '@coreui/react'
import { Icon } from '@iconify/react'

import { AppBreadcrumb } from './index'
import { AppHeaderDropdown, AppHeaderNotifications } from './header/index'
import { useTheme } from '../context/themeContext'
import ThemePicker from './ThemePicker'
import useAuthSession from '../hooks/useAuthSession'

const AppHeader = () => {
  const headerRef = useRef()
  const { isDark, toggleTheme } = useTheme()

  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { isLogado } = useAuthSession()

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const scrolled = document.documentElement.scrollTop > 0
        headerRef.current.style.boxShadow = scrolled 
          ? '0 4px 20px rgba(0,0,0,0.06)' 
          : '0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)'
      }
    }

    document.addEventListener('scroll', handleScroll)
    return () => document.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <CHeader 
      position="sticky" 
      ref={headerRef}
      style={{
        top: 0,
        zIndex: 1020,
        background: isDark ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)',
        transition: 'background-color 0.3s, border-color 0.3s, box-shadow 0.2s',
        padding: '8px 0',
        marginBottom: '24px'
      }}
    >
      <CContainer className="px-4 d-flex align-items-center justify-content-between" fluid style={{ height: '54px' }}>
        
        {/* Lado Esquerdo: Hamburger e Navegação */}
        <div className="d-flex align-items-center gap-3">
          <button
            onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              width: 38,
              height: 38,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-primary)',
              transition: 'background-color 0.2s, transform 0.1s',
              padding: 0,
              marginInlineStart: '-8px',
              outline: 'none'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            aria-label="Alternar menu lateral"
          >
            <Icon icon="solar:hamburger-menu-bold-duotone" width="22" />
          </button>

          {isLogado && (
            <NavLink
              to="/dashboard"
              style={({ isActive }) => ({
                textDecoration: 'none',
                color: isActive ? 'var(--accent-primary)' : 'var(--color-text-primary)',
                fontWeight: 700,
                fontSize: '14px',
                background: isActive ? 'rgba(var(--accent-primary-rgb, 255, 56, 92), 0.08)' : 'transparent',
                padding: '8px 16px',
                borderRadius: 12,
                transition: 'all 0.2s',
                display: 'none', // Oculta em telas pequenas
              })}
              className="d-md-inline-block"
            >
              Dashboard
            </NavLink>
          )}
        </div>

        {/* Lado Direito: Ações, Tema, Dropdowns */}
        <div className="d-flex align-items-center gap-2">
          
          {/* Botão Sair */}
          {isLogado ? (
            <button
              onClick={(e) => {
                e.preventDefault()
                sessionStorage.clear()
                window.location.href = '#/login'
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-primary)',
                opacity: 0.8,
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                fontSize: '13px',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.opacity = 1; 
                e.currentTarget.style.backgroundColor = 'rgba(255, 56, 92, 0.08)'; 
                e.currentTarget.style.color = 'var(--accent-primary, #FF385C)' 
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.opacity = 0.8; 
                e.currentTarget.style.backgroundColor = 'transparent'; 
                e.currentTarget.style.color = 'var(--color-text-primary)' 
              }}
              title="Sair do sistema"
            >
              <Icon icon="solar:logout-bold-duotone" width="18" />
              <span className="d-none d-md-inline">Sair</span>
            </button>
          ) : (
            <NavLink 
              to="/login" 
              style={{
                fontSize: '13px',
                textDecoration: 'none',
                background: 'transparent',
                border: '1.5px solid var(--accent-primary)',
                color: 'var(--accent-primary)',
                borderRadius: 99,
                padding: '8px 16px',
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.2s'
              }}
            >
              Entrar / Cadastrar
            </NavLink>
          )}

          {/* Divisor Vertical */}
          <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', margin: '0 4px' }} />

          {/* Botão de Tema (Sol / Lua) */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              width: 38,
              height: 38,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              padding: 0,
              outline: 'none'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            aria-label="Alternar tema"
          >
            <Icon 
              icon={isDark ? 'solar:sun-2-bold-duotone' : 'solar:moon-bold-duotone'} 
              width="20" 
              style={{ color: isDark ? '#FBBF24' : 'var(--color-text-primary)' }} 
            />
          </button>

          {/* Paleta de Cores */}
          <ThemePicker />

          {/* Divisor Vertical */}
          <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', margin: '0 4px' }} />

          {/* Dropdown Notificações */}
          {isLogado && <AppHeaderNotifications />}

          {/* Dropdown Usuário */}
          {isLogado && <AppHeaderDropdown />}

        </div>
      </CContainer>
      
      {/* Container inferior: Breadcrumb */}
      <CContainer className="px-4 d-none d-md-block" fluid style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '6px' }}>
        <AppBreadcrumb />
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
