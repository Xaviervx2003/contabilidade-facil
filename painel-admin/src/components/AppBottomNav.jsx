import React from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import CIcon from '@coreui/icons-react'
import {
  cilPuzzle,
  cilVideo,
  cilSpeedometer,
  cilMenu,
  cilUser,
} from '@coreui/icons'
import { useTheme } from '../context/themeContext'

const AppBottomNav = () => {
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { isDark } = useTheme()
  const isLogado = !!sessionStorage.getItem('papel')

  return (
    <nav className={`bottom-nav d-md-none ${isDark ? 'bottom-nav-dark' : 'bottom-nav-light'}`}>
      <NavLink to="/quiz" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
        <CIcon icon={cilPuzzle} size="xl" />
        <span>Quiz</span>
      </NavLink>

      <NavLink to="/videos" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
        <CIcon icon={cilVideo} size="xl" />
        <span>Vídeos</span>
      </NavLink>

      {isLogado ? (
        <NavLink to="/aluno/dashboard" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
          <CIcon icon={cilSpeedometer} size="xl" />
          <span>Painel</span>
        </NavLink>
      ) : (
        <NavLink to="/login" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
          <CIcon icon={cilUser} size="xl" />
          <span>Entrar</span>
        </NavLink>
      )}

      <button
        type="button"
        className="bottom-nav-link border-0 bg-transparent"
        onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
      >
        <CIcon icon={cilMenu} size="xl" />
        <span>Menu</span>
      </button>
    </nav>
  )
}

export default AppBottomNav
