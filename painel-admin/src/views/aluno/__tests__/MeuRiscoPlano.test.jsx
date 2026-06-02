/**
 * MeuRiscoPlano.test.jsx
 *
 * Testa o MeuRiscoPlano com mock do módulo api (Axios).
 * O componente carrega métricas do aluno via api.get()
 * e exibe diagnóstico de risco + plano de estudos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ── Mocks de módulos ──────────────────────────────────────────────────────────

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../../utils/auth', () => ({
  getAlunoMatricula: vi.fn(() => sessionStorage.getItem('matricula')),
}))

vi.mock('@iconify/react', () => ({
  Icon: ({ icon }) => <span data-testid="icon" data-icon={icon} />,
}))

vi.mock('../../../context/themeContext', () => ({
  __esModule: true,
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn(), currentTheme: {} }),
  ThemeProvider: ({ children }) => children,
}))

// ── Import do componente (após os mocks) ──────────────────────────────────────
import MeuRiscoPlano from '../MeuRiscoPlano'
import api from '../../../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

const metricsData = {
  sessoes: 10,
  questoes_respondidas: 50,
  taxa_acerto_media: 72,
  churn_risco_percentual: 20,
  tempo_medio_seg: 900,
  erros_por_materia: {
    'Contabilidade Geral': { total: 20, erros: 8 },
    'Custos': { total: 15, erros: 5 },
  },
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('MeuRiscoPlano - Diagnóstico Acadêmico', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('deve chamar o endpoint de métricas com a matrícula quando disponível', async () => {
    sessionStorage.setItem('matricula', '2024001')
    sessionStorage.setItem('token', 'fake-token')

    api.get.mockResolvedValue({ data: metricsData })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <MeuRiscoPlano />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/metricas-estudantes/desempenho/2024001')
      )
    })
  })

  it('deve exibir mensagem de erro quando matrícula estiver ausente', async () => {
    // Sem matrícula — o componente deve exibir mensagem de acesso exclusivo
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <MeuRiscoPlano />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // O componente seta o erro e não chama a API
    await waitFor(() => {
      expect(api.get).not.toHaveBeenCalled()
    })

    const errMsg = await screen.findByText(/exclusiva para alunos/i)
    expect(errMsg).toBeDefined()
  })

  it('deve exibir estado vazio quando aluno não tem sessões de estudo', async () => {
    sessionStorage.setItem('matricula', '2024001')
    sessionStorage.setItem('token', 'fake-token')

    // Retorna 404 — sem histórico ainda
    api.get.mockRejectedValue({ response: { status: 404 } })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <MeuRiscoPlano />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Componente exibe estado vazio: "Seu Diagnóstico Está Sendo Gerado!"
    const emptyMsg = await screen.findByText(/Diagnóstico Está Sendo Gerado/i)
    expect(emptyMsg).toBeDefined()
  })
})
