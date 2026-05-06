import React from 'react'
import CIcon from '@coreui/icons-react'
import {
    cilSpeedometer,
    cilPuzzle,
    cilPeople,
    cilNotes,
    cilHistory,
    cilCommentSquare,
    cilLibrary,
    cilVideo,
    cilChartLine,
    cilListRich,
    cilStar,
    cilMoon,
    cilSun,
} from '@coreui/icons'
import { CNavItem, CNavTitle } from '@coreui/react'
import { useTheme } from './themeContext'
import './nav.scss'

const getNavItens = () => {
    const papelUsuario = sessionStorage.getItem('papel') || 'aluno'

    const itens = [
        // ── Seção Estudos (visível para TODOS) ──
        {
            component: CNavTitle,
            name: 'Estudos',
        },
        {
            component: CNavItem,
            name: 'Meu Painel',
            to: '/aluno/dashboard',
            icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
        },
        {
            component: CNavItem,
            name: 'Quiz',
            to: '/quiz',
            icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
        },
        {
            component: CNavItem,
            name: 'Minhas Trilhas',
            to: '/aluno/trilhas',
            icon: <CIcon icon={cilListRich} customClassName="nav-icon" />,
        },
        {
            component: CNavItem,
            name: 'Vídeo-Aulas',
            to: '/videos',
            icon: <CIcon icon={cilVideo} customClassName="nav-icon" />,
        },
        {
            component: CNavItem,
            name: 'Meu Histórico',
            to: '/aluno/historico',
            icon: <CIcon icon={cilHistory} customClassName="nav-icon" />,
        },
        {
            component: CNavItem,
            name: 'Minhas Questões',
            to: '/aluno/questoes',
            icon: <CIcon icon={cilListRich} customClassName="nav-icon" />,
        },
        {
            component: CNavItem,
            name: 'Meus Feedbacks',
            to: '/aluno/feedbacks',
            icon: <CIcon icon={cilCommentSquare} customClassName="nav-icon" />,
        },
        {
            component: CNavItem,
            name: 'Minhas Conquistas',
            to: '/conquistas',
            icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
            badge: {
                color: 'warning',
                textColor: 'white',
                shape: 'rounded-pill',
                children: '🏆',
            },
        },
    ]

    // ── Seções de professor/admin ──
    if (papelUsuario === 'professor' || papelUsuario === 'admin') {
        itens.unshift(
            {
                component: CNavTitle,
                name: 'Principal',
            },
            {
                component: CNavItem,
                name: 'Dashboard',
                to: '/dashboard',
                icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
            },
        )

        itens.push(
            {
                component: CNavTitle,
                name: 'Administração',
            },
            {
                component: CNavItem,
                name: 'Gestão de Questões',
                to: '/questoes',
                icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
            },
            {
                component: CNavItem,
                name: 'Gestão de Matérias',
                to: '/materias',
                icon: <CIcon icon={cilLibrary} customClassName="nav-icon" />,
            },
            {
                component: CNavItem,
                name: 'Gestão de Trilhas',
                to: '/admin/trilhas',
                icon: <CIcon icon={cilListRich} customClassName="nav-icon" />,
            },
            {
                component: CNavItem,
                name: 'Relatórios',
                to: '/relatorios',
                icon: <CIcon icon={cilChartLine} customClassName="nav-icon" />,
            },
            {
                component: CNavItem,
                name: 'Desempenho dos Alunos',
                to: '/admin/desempenho',
                icon: <CIcon icon={cilChartLine} customClassName="nav-icon" />,
            },
            {
                component: CNavItem,
                name: 'Feedbacks',
                to: '/feedbacks',
                icon: <CIcon icon={cilCommentSquare} customClassName="nav-icon" />,
            },
        )
    }

    if (papelUsuario === 'admin') {
        itens.splice(itens.length - 2, 0, {
            component: CNavItem,
            name: 'Gestão de Usuários',
            to: '/usuarios',
            icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
        })
    }

    return itens
}

// Componente de Toggle do Tema
export const ThemeToggle = () => {
    const { isDark, toggleTheme } = useTheme()

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
            <CIcon
                icon={isDark ? cilSun : cilMoon}
                customClassName="theme-toggle-icon"
            />
        </button>
    )
}

export default getNavItens