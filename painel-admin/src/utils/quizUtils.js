/**
 * quizUtils.js
 * Utilitários do Quiz — migrados e adaptados da quiz-app (legado).
 * Todas as funções são puras (sem efeitos colaterais) para facilitar testes.
 */

// ---------------------------------------------------------------------------
// calculateScore
// Retorna a porcentagem de acerto arredondada em 2 casas decimais.
// Retorna 0 quando totalQuestions === 0 (evita divisão por zero).
// ---------------------------------------------------------------------------
export const calculateScore = (totalQuestions, correctAnswers) => {
  if (totalQuestions === 0) return 0
  return Number(((correctAnswers * 100) / totalQuestions).toFixed(2))
}

// ---------------------------------------------------------------------------
// calculateGrade
// Converte uma porcentagem numérica em { grade, remarks }.
// grade  → notação americana: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F
// remarks → comentário motivacional em português
// Retorna null para entrada inválida.
// ---------------------------------------------------------------------------
export const calculateGrade = (score) => {
  if (score === null || score === undefined || typeof score !== 'number') {
    return null
  }

  const percentage = parseInt(score)
  let grade = null
  let remarks = null

  if (percentage >= 97) grade = 'A+'
  else if (percentage >= 93) grade = 'A'
  else if (percentage >= 90) grade = 'A-'
  else if (percentage >= 87) grade = 'B+'
  else if (percentage >= 83) grade = 'B'
  else if (percentage >= 80) grade = 'B-'
  else if (percentage >= 77) grade = 'C+'
  else if (percentage >= 73) grade = 'C'
  else if (percentage >= 70) grade = 'C-'
  else if (percentage >= 67) grade = 'D+'
  else if (percentage >= 63) grade = 'D'
  else if (percentage >= 60) grade = 'D-'
  else grade = 'F'

  if (score >= 90) remarks = 'Excelente! Você dominou este quiz. Parabéns!'
  else if (score >= 80) remarks = 'Ótimo trabalho! Você foi muito bem no quiz.'
  else if (score >= 70) remarks = 'Bom esforço! Você foi aprovado no quiz.'
  else if (score >= 60) remarks = 'Você passou, mas há espaço para melhorar.'
  else remarks = 'Aprender é uma jornada. Continue estudando, você vai chegar lá!'

  return { grade, remarks }
}

// ---------------------------------------------------------------------------
// timeConverter
// Converte millisegundos → { hours, minutes, seconds } (strings com 2 dígitos).
// Retorna null para entrada inválida.
// ---------------------------------------------------------------------------
export const timeConverter = (milliseconds) => {
  if (
    milliseconds === null ||
    milliseconds === undefined ||
    typeof milliseconds !== 'number'
  ) {
    return null
  }

  const hours = `0${Math.floor(milliseconds / 3600000)}`.slice(-2)
  const minutes = `0${Math.floor((milliseconds / 60000) % 60)}`.slice(-2)
  const seconds = `0${Math.floor((milliseconds / 1000) % 60)}`.slice(-2)

  return { hours, minutes, seconds }
}

// ---------------------------------------------------------------------------
// formatSeconds
// Converte segundos inteiros → string "mm:ss" (usado no timer do Quiz.jsx).
// ---------------------------------------------------------------------------
export const formatSeconds = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// shuffle
// Embaralha um array usando Fisher-Yates.
// Não modifica o array original — retorna uma nova cópia.
// ---------------------------------------------------------------------------
export const shuffle = (array) => {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
