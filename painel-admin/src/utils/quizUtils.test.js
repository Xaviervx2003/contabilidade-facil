/**
 * quizUtils.test.js
 * Testes unitários com Vitest para as funções utilitárias do quiz.
 * Execute com: npm test
 */

import { describe, it, expect } from 'vitest'
import {
  calculateScore,
  calculateGrade,
  timeConverter,
  formatSeconds,
  shuffle,
} from './quizUtils'

// ---------------------------------------------------------------------------
// calculateScore
// ---------------------------------------------------------------------------
describe('calculateScore', () => {
  it('retorna a porcentagem correta com 2 casas decimais', () => {
    expect(calculateScore(10, 7)).toBe(70)
    expect(calculateScore(3, 1)).toBe(33.33)
    expect(calculateScore(200, 100)).toBe(50)
  })

  it('retorna 100 quando acertou tudo', () => {
    expect(calculateScore(5, 5)).toBe(100)
  })

  it('retorna 0 quando totalQuestions é zero (evita divisão por zero)', () => {
    expect(calculateScore(0, 0)).toBe(0)
  })

  it('retorna 0 quando não acertou nenhuma', () => {
    expect(calculateScore(10, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calculateGrade
// ---------------------------------------------------------------------------
describe('calculateGrade', () => {
  it('retorna A+ e comentário excelente para score >= 97', () => {
    expect(calculateGrade(97)).toMatchObject({
      grade: 'A+',
      remarks: 'Excelente! Você dominou este quiz. Parabéns!',
    })
    expect(calculateGrade(100)).toMatchObject({ grade: 'A+' })
  })

  it('retorna A para score entre 93 e 96', () => {
    expect(calculateGrade(93)).toMatchObject({ grade: 'A' })
    expect(calculateGrade(96)).toMatchObject({ grade: 'A' })
  })

  it('retorna A- para score entre 90 e 92', () => {
    expect(calculateGrade(90)).toMatchObject({ grade: 'A-' })
    expect(calculateGrade(92)).toMatchObject({ grade: 'A-' })
  })

  it('retorna B+ para score entre 87 e 89', () => {
    expect(calculateGrade(87)).toMatchObject({ grade: 'B+' })
    expect(calculateGrade(89)).toMatchObject({ grade: 'B+' })
  })

  it('retorna B para score entre 83 e 86', () => {
    expect(calculateGrade(83)).toMatchObject({ grade: 'B' })
    expect(calculateGrade(86)).toMatchObject({ grade: 'B' })
  })

  it('retorna C- para score entre 70 e 72', () => {
    expect(calculateGrade(70)).toMatchObject({ grade: 'C-' })
  })

  it('retorna F e mensagem de encorajamento para score < 60', () => {
    expect(calculateGrade(59)).toMatchObject({
      grade: 'F',
      remarks: 'Aprender é uma jornada. Continue estudando, você vai chegar lá!',
    })
    expect(calculateGrade(0)).toMatchObject({ grade: 'F' })
  })

  it('retorna null para entrada inválida (string, array, null, undefined)', () => {
    expect(calculateGrade('90')).toBeNull()
    expect(calculateGrade([90])).toBeNull()
    expect(calculateGrade(null)).toBeNull()
    expect(calculateGrade(undefined)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// timeConverter
// ---------------------------------------------------------------------------
describe('timeConverter', () => {
  it('converte 1 minuto em { hours: "00", minutes: "01", seconds: "00" }', () => {
    expect(timeConverter(60 * 1000)).toMatchObject({
      hours: '00',
      minutes: '01',
      seconds: '00',
    })
  })

  it('converte 1 hora exata corretamente', () => {
    expect(timeConverter(3600 * 1000)).toMatchObject({
      hours: '01',
      minutes: '00',
      seconds: '00',
    })
  })

  it('converte 1h 30min 45s corretamente', () => {
    const ms = (1 * 3600 + 30 * 60 + 45) * 1000
    expect(timeConverter(ms)).toMatchObject({
      hours: '01',
      minutes: '30',
      seconds: '45',
    })
  })

  it('retorna null para entrada inválida (string, null, undefined)', () => {
    expect(timeConverter('60')).toBeNull()
    expect(timeConverter(null)).toBeNull()
    expect(timeConverter(undefined)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// formatSeconds
// ---------------------------------------------------------------------------
describe('formatSeconds', () => {
  it('formata 0 segundos como "00:00"', () => {
    expect(formatSeconds(0)).toBe('00:00')
  })

  it('formata 90 segundos como "01:30"', () => {
    expect(formatSeconds(90)).toBe('01:30')
  })

  it('formata 600 segundos como "10:00"', () => {
    expect(formatSeconds(600)).toBe('10:00')
  })

  it('formata 3599 segundos como "59:59"', () => {
    expect(formatSeconds(3599)).toBe('59:59')
  })
})

// ---------------------------------------------------------------------------
// shuffle
// ---------------------------------------------------------------------------
describe('shuffle', () => {
  it('mantém o mesmo comprimento do array original', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(shuffle(arr)).toHaveLength(arr.length)
  })

  it('não modifica o array original (retorna nova cópia)', () => {
    const original = [1, 2, 3, 4, 5]
    const result = shuffle(original)
    expect(original).toEqual([1, 2, 3, 4, 5])
    expect(result).not.toBe(original)
  })

  it('contém todos os elementos originais (sem perder nem duplicar)', () => {
    const arr = ['a', 'b', 'c', 'd']
    const result = shuffle(arr)
    expect(result.sort()).toEqual([...arr].sort())
  })

  it('funciona com array de 1 elemento', () => {
    expect(shuffle(['x'])).toEqual(['x'])
  })

  it('funciona com array vazio', () => {
    expect(shuffle([])).toEqual([])
  })
})
