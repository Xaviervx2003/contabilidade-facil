import React from 'react'
import { Outlet } from 'react-router-dom'
import {
    CContainer,
    CHeader,
    CHeaderBrand,
    CHeaderNav,
    CHeaderNavItem,
    CHeaderNavLink,
    CHeaderToggler,
    CNavbar,
    CNavbarBrand,
    CNavbarNav,
    CNavbarToggler,
    CSidebar,
    CSidebarBrand,
    CSidebarNav,
    CSidebarToggler,
    COffcanvas,
    COffcanvasHeader,
    COffcanvasTitle,
    COffcanvasBody,
    CFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu, cilX, cilAccountLogout } from '@coreui/icons'

import getNavItens, { ThemeToggle } from '../getNavItens'
import './DefaultLayout.scss'
import { useTheme } from '../themeContext'

const DefaultLayout = () => {
    const [sidebarShow, setSidebarShow] = React.useState(false)
    const { isDark, toggleTheme } = useTheme()
    const navItems = getNavItens()

    const handleLogout = () => {
        sessionStorage.clear()
        window.location.href = '/login'
    }

    return (
        <div className="wrapper d-flex flex-column min-vh-100">
            {/* Header */}
            <CHeader position="sticky" className="mb-4 border-bottom">
                <CContainer fluid>
                    <CHeaderToggler
                        onClick={() => setSidebarShow(!sidebarShow)}
                        className="d-md-none"
                        aria-label="Toggle sidebar"
                    >
                        <CIcon icon={sidebarShow ? cilX : cilMenu} />
                    </CHeaderToggler>

                    <CHeaderBrand className="mx-auto mx-md-0">
                        <strong>Contabilidade Fácil</strong>
                    </CHeaderBrand>

                    <CHeaderNav className="ms-auto">
                        <CHeaderNavItem className="d-none d-md-block">
                            <div className="theme-toggle-wrapper">
                                <ThemeToggle />
                            </div>
                        </CHeaderNavItem>
                        <CHeaderNavItem>
                            <CHeaderNavLink
                                onClick={handleLogout}
                                style={{ cursor: 'pointer' }}
                                title="Sair"
                            >
                                <CIcon icon={cilAccountLogout} />
                            </CHeaderNavLink>
                        </CHeaderNavItem>
                    </CHeaderNav>
                </CContainer>
            </CHeader>

            <div className="wrapper-body d-flex flex-grow-1">
                {/* Sidebar */}
                <CSidebar
                    visible={sidebarShow}
                    onVisibleChange={(visible) => setSidebarShow(visible)}
                    placement="start"
                    className="d-md-flex"
                    id="sidebar"
                >
                    <CSidebarBrand className="d-md-down-none">
                        <strong>CF</strong>
                    </CSidebarBrand>

                    <CSidebarNav>
                        {navItems.map((item, index) => (
                            <div key={index}>
                                {item.component === require('@coreui/react').CNavTitle ? (
                                    <div className="nav-title">{item.name}</div>
                                ) : (
                                    <div className="nav-item">
                                        {item.icon && <span className="nav-icon">{item.icon}</span>}
                                        <a href={item.to} className="nav-link">
                                            {item.name}
                                            {item.badge && (
                                                <span className={`badge bg-${item.badge.color} ms-2`}>
                                                    {item.badge.children}
                                                </span>
                                            )}
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}
                    </CSidebarNav>

                    <CSidebarToggler className="d-lg-none" onClick={() => setSidebarShow(false)} />
                </CSidebar>

                {/* Main Content */}
                <div className="wrapper-content flex-grow-1">
                    <CContainer fluid>
                        <Outlet />
                    </CContainer>
                </div>
            </div>

            {/* Footer */}
            <CFooter className="mt-auto">
                <div className="ms-auto">
                    <span className="me-3">© 2026 Contabilidade Fácil</span>
                </div>
            </CFooter>
        </div>
    )
}

export default DefaultLayout