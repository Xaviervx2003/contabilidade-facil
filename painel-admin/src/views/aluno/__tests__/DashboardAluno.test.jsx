/**
 * DashboardAluno.test.jsx
 *
 * Testa o DashboardAluno com mock do módulo api (Axios), que é o client
 * HTTP real utilizado pelo componente via useQuery do React Query.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

// ── Mocks de módulos ──────────────────────────────────────────────────────────

// Mock do cliente Axios — deve vir antes do import do componente
vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom')
  return {
    ...real,
    useNavigate: () => vi.fn(),
  }
})

vi.mock('../../../context/themeContext', () => ({
  __esModule: true,
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn(), currentTheme: {} }),
  ThemeProvider: ({ children }) => children,
}))

vi.mock('@iconify/react', () => ({
  Icon: ({ icon }) => <span data-testid="icon" data-icon={icon} />,
}))

// ── Import do componente (após os mocks) ──────────────────────────────────────
import DashboardAluno from '../DashboardAluno'
import api from '../../../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

const dashboardData = {
  nome: 'Aluno Teste',
  hoje: { questoes: 5, sessoes: 2, tempo_seg: 600 },
  semana: { questoes: 20, sessoes: 6, tempo_seg: 2400, dias_estudados: 3 },
  geral: { media_geral: 75, total_questoes: 100, total_sessoes: 20, tempo_total_seg: 12000 },
  streak: 3,
  progresso: { percentual: 60 },
  materias_fracas: [],
  materias_fortes: [],
  ultimas_sessoes: [],
  serie_semanal: [],
}

const missoesData = [
  { id: 1, titulo: 'Missão Mock', progresso: 0, status: 'pendente', dica: 'Dica' },
]

const quizAnalyticsData = {
  resumo: { total_questoes: 100, tempo_medio_seg: 600, media_acerto: 75 },
  por_materia: [],
  por_turno: [],
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('DashboardAluno', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()

    // Configurar o mock padrão do api.get para retornar dados válidos
    api.get.mockImplementation((url) => {
      if (url.includes('/api/aluno/dashboard/')) {
        return Promise.resolve({ data: dashboardData })
      }
      if (url.includes('/api/missoes/globais')) {
        return Promise.resolve({ data: missoesData })
      }
      if (url.includes('/api/aluno/quiz-analytics/')) {
        return Promise.resolve({ data: quizAnalyticsData })
      }
      return Promise.resolve({ data: {} })
    })
  })

  it('deve chamar o endpoint do dashboard com a matrícula quando disponível', async () => {
    sessionStorage.setItem('matricula', '2024001')
    sessionStorage.setItem('token', 'fake-token')

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <DashboardAluno />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Aguarda o componente disparar a query
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/aluno/dashboard/2024001')
      )
    })
  })

  it('deve chamar o endpoint de missões com a matrícula quando disponível', async () => {
    sessionStorage.setItem('matricula', '2024001')
    sessionStorage.setItem('token', 'fake-token')

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <DashboardAluno />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/missoes/globais/2024001')
      )
    })
  })

  it('deve chamar o endpoint de missões sem matrícula quando não está logado', async () => {
    // Sem matrícula mas com token — só missões globais devem ser buscadas
    sessionStorage.setItem('token', 'fake-token')

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <DashboardAluno />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/missoes\/globais$/)
      )
    })
  })
})
