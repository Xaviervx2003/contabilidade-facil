/**
 * Application Routes Configuration — Contabilidade Fácil
 * @module routes
 *
 * allowedRoles: array de papéis que podem acessar a rota.
 * Se ausente, qualquer papel logado pode acessar.
 */

import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Quiz = React.lazy(() => import('./views/quiz/Quiz'))
const GestaoQuestoes = React.lazy(() => import('./views/questoes/GestaoQuestoes'))
const Alunos = React.lazy(() => import('./views/aluno/Alunos'))
const Perfil = React.lazy(() => import('./views/perfil/Perfil'))
const FeedbacksQuestoes = React.lazy(() => import('./views/feedbacks/FeedbacksQuestoes'))
const GestaoUsuarios = React.lazy(() => import('./views/admin/GestaoUsuarios.tsx'))
const GestaoMaterias = React.lazy(() => import('./views/admin/GestaoMaterias'))
const VideoGallery = React.lazy(() => import('./views/videos/VideoGallery'))
const Relatorios = React.lazy(() => import('./views/relatorios/Relatorios'))
const HistoricoAluno = React.lazy(() => import('./views/aluno/HistoricoAluno'))
const MinhasQuestoes = React.lazy(() => import('./views/aluno/MinhasQuestoes'))
const GestaoTrilhas = React.lazy(() => import('./views/admin/GestaoTrilhas'))
const MinhasTrilhas = React.lazy(() => import('./views/aluno/MinhasTrilhas'))
const Conquistas = React.lazy(() => import('./views/gamificacao/Conquistas'))
const DashboardAluno = React.lazy(() => import('./views/aluno/DashboardAluno'))
const CentralRisco = React.lazy(() => import('./views/admin/CentralRisco'))
const MeuRiscoPlano = React.lazy(() => import('./views/aluno/MeuRiscoPlano'))
const GestaoVideos = React.lazy(() => import('./views/admin/GestaoVideos'))
const InboxDuvidas = React.lazy(() => import('./views/admin/InboxDuvidas'))
const GestaoMissoes = React.lazy(() => import('./views/admin/GestaoMissoes'))
const Missoes = React.lazy(() => import('./views/gamificacao/Missoes'))

export const routes = [
  { path: '/', exact: true, name: 'Home' },
  {
    path: '/dashboard',
    name: 'Dashboard',
    element: Dashboard,
    allowedRoles: ['admin', 'professor'],
  },
  { path: '/aluno/dashboard', name: 'Meu Painel', element: DashboardAluno, allowedRoles: ['aluno'] },
  { path: '/quiz', name: 'Quiz', element: Quiz },
  { path: '/videos', name: 'Vídeo-Aulas', element: VideoGallery },

  { path: '/aluno/questoes', name: 'Histórico & Dúvidas', element: MinhasQuestoes, allowedRoles: ['aluno'] },
  {
    path: '/questoes',
    name: 'Gestão de Questões',
    element: GestaoQuestoes,
    allowedRoles: ['admin', 'professor'],
  },
  { path: '/perfil', name: 'Minha Conta', element: Perfil },
  {
    path: '/feedbacks',
    name: 'Feedbacks dos Alunos',
    element: FeedbacksQuestoes,
    allowedRoles: ['admin', 'professor'],
  },
  {
    path: '/usuarios',
    name: 'Gestão de Usuários',
    element: GestaoUsuarios,
    allowedRoles: ['admin'],
  },
  {
    path: '/materias',
    name: 'Gestão de Matérias',
    element: GestaoMaterias,
    allowedRoles: ['admin', 'professor'],
  },
  {
    path: '/relatorios',
    name: 'Relatórios',
    element: Relatorios,
    allowedRoles: ['admin', 'professor'],
  },
  {
    path: '/admin/desempenho',
    name: 'Desempenho dos Alunos',
    element: Alunos,
    allowedRoles: ['admin', 'professor'],
  },
  {
    path: '/admin/trilhas',
    name: 'Gestão de Trilhas',
    element: GestaoTrilhas,
    allowedRoles: ['admin', 'professor'],
  },
  {
    path: '/admin/central-risco',
    name: 'Central de Risco',
    element: CentralRisco,
    allowedRoles: ['admin', 'professor'],
  },
  {
    path: '/admin/videos',
    name: 'Gestão de Vídeos',
    element: GestaoVideos,
    allowedRoles: ['admin', 'professor'],
  },
  {
    path: '/admin/inbox',
    name: 'Inbox de Dúvidas',
    element: InboxDuvidas,
    allowedRoles: ['admin', 'professor'],
  },
  {
    path: '/admin/missoes',
    name: 'Gestão de Missões',
    element: GestaoMissoes,
    allowedRoles: ['admin', 'professor'],
  },
  { path: '/aluno/historico', name: 'Meu Histórico', element: HistoricoAluno, allowedRoles: ['aluno'] },
  { path: '/aluno/meu-risco-plano', name: 'Meu Risco + Plano', element: MeuRiscoPlano, allowedRoles: ['aluno'] },
  { path: '/aluno/trilhas', name: 'Minhas Trilhas', element: MinhasTrilhas, allowedRoles: ['aluno'] },
  { path: '/conquistas', name: 'Minhas Conquistas', element: Conquistas, allowedRoles: ['aluno'] },
  { path: '/aluno/desafios', name: 'Meus Desafios', element: Missoes, allowedRoles: ['aluno'] },
]

export default routes
