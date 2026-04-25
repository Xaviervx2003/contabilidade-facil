/**
 * Application Routes Configuration â€” Contabilidade FÃ¡cil
 * @module routes
 *
 * allowedRoles: array de papÃ©is que podem acessar a rota.
 * Se ausente, qualquer papel logado pode acessar.
 */

import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Quiz = React.lazy(() => import('./views/quiz/Quiz'))
const GestaoQuestoes = React.lazy(() => import('./views/questoes/GestaoQuestoes'))
const Historico = React.lazy(() => import('./views/historico/Historico'))
const Perfil = React.lazy(() => import('./views/perfil/Perfil'))
const FeedbacksQuestoes = React.lazy(() => import('./views/feedbacks/FeedbacksQuestoes'))
const GestaoUsuarios = React.lazy(() => import('./views/admin/GestaoUsuarios'))
const GestaoMaterias = React.lazy(() => import('./views/admin/GestaoMaterias'))
const VideoGallery = React.lazy(() => import('./views/videos/VideoGallery'))
const Relatorios = React.lazy(() => import('./views/relatorios/Relatorios'))
const HistoricoAluno = React.lazy(() => import('./views/aluno/HistoricoAluno'))

export const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard, allowedRoles: ['admin', 'professor'] },
  { path: '/quiz', name: 'Quiz', element: Quiz },
  { path: '/videos', name: 'VÃ­deo-Aulas', element: VideoGallery },
  { path: '/historico', name: 'Meu HistÃ³rico', element: Historico },
  { path: '/questoes', name: 'GestÃ£o de QuestÃµes', element: GestaoQuestoes, allowedRoles: ['admin', 'professor'] },
  { path: '/perfil', name: 'Minha Conta', element: Perfil },
  { path: '/feedbacks', name: 'Feedbacks dos Alunos', element: FeedbacksQuestoes, allowedRoles: ['admin', 'professor'] },
  { path: '/usuarios', name: 'GestÃ£o de UsuÃ¡rios', element: GestaoUsuarios, allowedRoles: ['admin'] },
  { path: '/materias', name: 'GestÃ£o de MatÃ©rias', element: GestaoMaterias, allowedRoles: ['admin', 'professor'] },
  { path: '/relatorios', name: 'RelatÃ³rios', element: Relatorios, allowedRoles: ['admin', 'professor'] },
  { path: '/aluno/historico', name: 'Meu HistÃ³rico', element: HistoricoAluno },
]

export default routes

