import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import DashboardAluno from '../DashboardAluno'

// Mock global fetch
global.fetch = vi.fn()

// Mocks de hooks
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => vi.fn(),
  MemoryRouter: ({ children }) => <div>{children}</div>,
}))

vi.mock('../../../context/themeContext', () => ({
  __esModule: true,
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn(), currentTheme: {} }),
  ThemeProvider: ({ children }) => children,
}))

// Mock do Iconify para evitar erros de renderização em ambiente de teste
vi.mock('@iconify/react', () => ({
  Icon: () => <span data-testid="icon" />,
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

describe('DashboardAluno - Fallback de Missões', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    
    // Mock do dashboard principal para não quebrar o componente
    fetch.mockImplementation((url) => {
      if (url.includes('/api/aluno/dashboard/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            nome: 'Teste',
            hoje: { questoes: 0, sessoes: 0, tempo_seg: 0 },
            semana: { questoes: 0, sessoes: 0, tempo_seg: 0, dias_estudados: 0 },
            geral: { media_geral: 0, total_questoes: 0, total_sessoes: 0, tempo_total_seg: 0 },
            streak: 0,
            progresso: { percentual: 0 },
            materias_fracas: [],
            materias_fortes: [],
            ultimas_sessoes: [],
            serie_semanal: []
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, titulo: 'Missão Mock', progresso: 0, status: 'pendente', dica: 'Dica' }
        ])
      })
    })
  })

  it('deve chamar o endpoint com matrícula quando disponível', async () => {
    sessionStorage.setItem('matricula', '2024001')
    sessionStorage.setItem('token', 'fake-token')
    
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <DashboardAluno />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Verifica se fetch foi chamado para missões com a matrícula
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/missoes/globais/2024001'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer fake-token'
        })
      })
    )
  })

  it('deve chamar o endpoint de fallback e mostrar aviso quando matrícula estiver ausente', async () => {
    // Simulando que o dashboard-aluno carregou, mas matricula ainda não está no sessionStorage (fallback)
    sessionStorage.setItem('token', 'fake-token')
    
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <DashboardAluno />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Verifica se fetch foi chamado para o endpoint de fallback (sem a barra final de matrícula)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/missoes\/globais$/),
      expect.any(Object)
    )

    // Verifica se o aviso "Sincronizando seu progresso..." aparece
    const aviso = await screen.findByText(/Sincronizando seu progresso.../i)
    expect(aviso).toBeDefined()
  })
})
