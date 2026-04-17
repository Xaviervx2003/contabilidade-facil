/**
 * Application Routes Configuration — Contabilidade Fácil
 * @module routes
 */

import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Quiz = React.lazy(() => import('./views/quiz/Quiz'))
const GestaoQuestoes = React.lazy(() => import('./views/questoes/GestaoQuestoes'))
const Historico = React.lazy(() => import('./views/historico/Historico'))
const Perfil = React.lazy(() => import('./views/perfil/Perfil'))
const FeedbacksQuestoes = React.lazy(() => import('./views/feedbacks/FeedbacksQuestoes'))
const GestaoUsuarios = React.lazy(() => import('./views/admin/GestaoUsuarios'))

export const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/quiz', name: 'Quiz', element: Quiz },
  { path: '/historico', name: 'Meu Histórico', element: Historico },
  { path: '/questoes', name: 'Gestão de Questões', element: GestaoQuestoes },
  { path: '/perfil', name: 'Minha Conta', element: Perfil },
  { path: '/feedbacks', name: 'Feedbacks dos Alunos', element: FeedbacksQuestoes },
  { path: '/usuarios', name: 'Gestão de Usuários', element: GestaoUsuarios },
]

export default routes