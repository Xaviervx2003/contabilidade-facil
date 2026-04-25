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
} from '@coreui/icons'
import { CNavItem, CNavTitle } from '@coreui/react'

const getNavItens = () => {
  const papelUsuario = sessionStorage.getItem('papel') || 'aluno'

  const itens = [
    {
      component: CNavTitle,
      name: 'Estudos',
    },
    {
      component: CNavItem,
      name: 'Quiz',
      to: '/quiz',
      icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
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
  ]

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
        name: 'Relatórios',
        to: '/relatorios',
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

export default getNavItens