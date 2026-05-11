/**
 * AppHeader Component
 *
 * Main application header with navigation, theme switcher, and user menu.
 * Features include:
 * - Sidebar toggle button
 * - Primary navigation links
 * - Theme toggle (light/dark) via ThemeContext
 * - Logout button
 * - Breadcrumb navigation
 * - Sticky positioning with scroll shadow effect
 *
 * @component
 */

import React, { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CContainer,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilAccountLogout,
  cilMenu,
  cilMoon,
  cilSun,
} from '@coreui/icons'

import { AppBreadcrumb } from './index'
import { AppHeaderDropdown, AppHeaderNotifications } from './header/index'
import { useTheme } from '../context/themeContext'

const AppHeader = () => {
  const headerRef = useRef()
  const { isDark, toggleTheme } = useTheme()

  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const isLogado = !!sessionStorage.getItem('papel')

  useEffect(() => {
    const handleScroll = () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    }

    document.addEventListener('scroll', handleScroll)
    return () => document.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>
      <CContainer className="border-bottom px-4" fluid>
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        <CHeaderNav className="d-none d-md-flex">
          {isLogado && (
            <CNavItem>
              <CNavLink to="/dashboard" as={NavLink}>
                Dashboard
              </CNavLink>
            </CNavItem>
          )}
        </CHeaderNav>
        <CHeaderNav className="ms-auto">
          {isLogado ? (
            <CNavItem>
              <CNavLink
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  sessionStorage.clear()
                  window.location.href = '#/login'
                }}
                className="d-flex align-items-center text-danger"
                title="Sair do sistema"
              >
                <CIcon icon={cilAccountLogout} size="lg" className="me-1" />
                <span className="d-none d-md-inline">Sair</span>
              </CNavLink>
            </CNavItem>
          ) : (
            <CNavItem className="d-flex align-items-center">
              <CButton 
                to="/login" 
                as={NavLink} 
                color="primary" 
                variant="outline" 
                className="rounded-pill px-3 fw-bold shadow-sm"
                style={{ fontSize: '13px' }}
              >
                Entrar / Cadastrar
              </CButton>
            </CNavItem>
          )}
        </CHeaderNav>
        <CHeaderNav>
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          {/* Theme Toggle Button */}
          <CNavItem className="d-flex align-items-center">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              aria-label="Alternar tema"
            >
              <CIcon icon={isDark ? cilSun : cilMoon} size="lg" />
            </button>
          </CNavItem>
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          {isLogado && <AppHeaderNotifications />}
          {isLogado && <AppHeaderDropdown />}
        </CHeaderNav>
      </CContainer>
      <CContainer className="px-4" fluid>
        <AppBreadcrumb />
      </CContainer>
    </CHeader>
  )
}

export default AppHeader

