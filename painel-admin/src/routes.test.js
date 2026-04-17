/**
 * routes.test.js — Testes automatizados de validação das rotas.
 */

import { describe, it, expect } from 'vitest'
import { routes } from './routes'

describe('Configuração de Rotas', () => {
  it('deve exportar um array de rotas', () => {
    expect(Array.isArray(routes)).toBe(true)
    expect(routes.length).toBeGreaterThan(0)
  })

  it('cada rota deve ter ao menos "path" e "name"', () => {
    routes.forEach((route) => {
      expect(route).toHaveProperty('path')
      expect(route).toHaveProperty('name')
    })
  })
})

describe('Rotas funcionais obrigatórias', () => {
  const rotasObrigatorias = [
    { path: '/', name: 'Home' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/quiz', name: 'Quiz' },
    { path: '/historico', name: 'Meu Histórico' },
    { path: '/alunos', name: 'Gestão de Alunos' },
    { path: '/questoes', name: 'Gestão de Questões' },
    { path: '/perfil', name: 'Minha Conta' },
  ]

  rotasObrigatorias.forEach(({ path, name }) => {
    it(`deve conter a rota "${name}" em "${path}"`, () => {
      const rota = routes.find((r) => r.path === path)
      expect(rota).toBeDefined()
      expect(rota.name).toBe(name)
    })
  })

  it('rotas com componentes devem ter "element" definido (exceto Home)', () => {
    routes
      .filter((r) => r.path !== '/')
      .forEach((route) => {
        expect(route.element).toBeDefined()
      })
  })
})

describe('Rotas de demonstração removidas', () => {
  const rotasProibidas = [
    '/theme/colors', '/base/accordion', '/base/cards', '/buttons/buttons',
    '/forms/form-control', '/charts', '/icons/coreui-icons', '/notifications/alerts', '/widgets',
  ]

  rotasProibidas.forEach((path) => {
    it(`NÃO deve conter a rota de demo "${path}"`, () => {
      expect(routes.find((r) => r.path === path)).toBeUndefined()
    })
  })
})
