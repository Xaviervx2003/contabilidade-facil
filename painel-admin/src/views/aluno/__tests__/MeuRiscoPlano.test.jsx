import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import MeuRiscoPlano from '../MeuRiscoPlano'

// Mock global fetch
global.fetch = vi.fn()

describe('MeuRiscoPlano - Fallback de Missões', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('deve chamar o endpoint com matrícula quando disponível', async () => {
    sessionStorage.setItem('matricula', '2024001')
    sessionStorage.setItem('token', 'fake-token')
    
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
          { id: 1, titulo: 'Missão Teste', progresso: 50, status: 'pendente' }
      ])
    })

    render(
      <MemoryRouter>
        <MeuRiscoPlano />
      </MemoryRouter>
    )

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/missoes/globais/2024001'),
      expect.any(Object)
    )
    
    expect(await screen.findByText('Missão Teste')).toBeDefined()
  })

  it('deve chamar o endpoint de fallback quando matrícula estiver ausente', async () => {
    sessionStorage.setItem('token', 'fake-token')
    
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
          { id: 1, titulo: 'Missão Global', progresso: 0, status: 'pendente' }
      ])
    })

    render(
      <MemoryRouter>
        <MeuRiscoPlano />
      </MemoryRouter>
    )

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/missoes\/globais$/),
      expect.any(Object)
    )
    
    expect(await screen.findByText('Missão Global')).toBeDefined()
  })
})
