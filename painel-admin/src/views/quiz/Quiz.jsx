import React, { useEffect, useState, useMemo } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCol,
  CContainer,
  CFormSelect,
  CFormTextarea,
  CNav,
  CNavItem,
  CNavLink,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilXCircle, cilLightbulb, cilVideo } from '@coreui/icons'
import { API_URL } from '../../config'
import { calculateScore, calculateGrade, formatSeconds, shuffle } from '../../utils/quizUtils'

/* ─── constants ────────────────────────────────────────────────────────────── */

const TIME_OPTIONS = [
  { value: 300, label: '5 minutos' },
  { value: 600, label: '10 minutos' },
  { value: 900, label: '15 minutos' },
  { value: 1200, label: '20 minutos' },
  { value: 1800, label: '30 minutos' },
  { value: 3600, label: '1 hora' },
]

const QTD_OPTIONS = [
  { value: 0, label: 'Todas as questões' },
  { value: 5, label: '5 questões' },
  { value: 10, label: '10 questões' },
  { value: 15, label: '15 questões' },
  { value: 20, label: '20 questões' },
  { value: 30, label: '30 questões' },
  { value: 50, label: '50 questões' },
]

const LETTERS = ['A', 'B', 'C', 'D', 'E']

/* ─── dynamic design tokens ─────────────────────────────────────────────────── */

const getTokens = (isDark) => ({
  blue: '#4f8ef7',
  cyan: isDark ? '#22d3ee' : '#0891b2',
  green: isDark ? '#22c55e' : '#15803d',
  red: isDark ? '#f43f5e' : '#b91c1c',
  amber: isDark ? '#f59e0b' : '#b45309',
  purple: isDark ? '#a78bfa' : '#7c3aed',
  surface: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
  border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  text: isDark ? '#e2e8f0' : '#1e293b',
  muted: isDark ? 'rgba(226,232,240,0.45)' : 'rgba(15,23,42,0.5)',
  bgGlow: (color, px = 18) =>
    isDark
      ? `0 0 ${px}px ${color}44, 0 0 ${px * 2}px ${color}22`
      : `0 0 ${px}px ${color}22, 0 0 ${px * 2}px ${color}11`,
  ring: (color) =>
    isDark
      ? `0 0 0 2px ${color}66, 0 0 18px ${color}44, 0 0 36px ${color}22`
      : `0 0 0 2px ${color}55, 0 0 12px ${color}22`,
})

const glow = (color, px, isDark) =>
  isDark
    ? `0 0 ${px}px ${color}44, 0 0 ${px * 2}px ${color}22`
    : `0 0 ${px}px ${color}22, 0 0 ${px * 2}px ${color}11`

const ring = (color, isDark) =>
  isDark
    ? `0 0 0 2px ${color}66, ${glow(color, 18, isDark)}`
    : `0 0 0 2px ${color}55, ${glow(color, 12, isDark)}`

/* ─── dynamic global css ────────────────────────────────────────────────────── */

const buildGlobalCss = (T) => `
@keyframes halo-pulse {
  0%,100% { box-shadow: 0 0 16px ${T.red}44, 0 0 32px ${T.red}22; }
  50%      { box-shadow: 0 0 28px ${T.red}88, 0 0 48px ${T.red}44; }
}
@keyframes fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(.94); }
  to   { opacity: 1; transform: scale(1);   }
}
@keyframes spin-slow { to { transform: rotate(360deg); } }
.quiz-option-btn {
  transition: box-shadow .15s, border-color .15s, background .15s, transform .1s !important;
}
.quiz-option-btn:not(:disabled):hover {
  transform: translateY(-1px);
}
.quiz-tab-link { cursor: pointer; transition: color .15s !important; }
.quiz-select {
  background-color: ${T.surface} !important;
  border: 1px solid ${T.border} !important;
  color: ${T.text} !important;
  border-radius: 10px !important;
}
.quiz-select:focus {
  box-shadow: 0 0 0 2px ${T.blue}66 !important;
  border-color: ${T.blue} !important;
}
.quiz-select option { background: ${T.surface}; color: ${T.text}; }
.quiz-textarea {
  background: ${T.surface} !important;
  border: 1px solid ${T.border} !important;
  color: ${T.text} !important;
  border-radius: 10px !important;
  resize: none !important;
}
.quiz-textarea:focus {
  box-shadow: 0 0 0 2px ${T.blue}66 !important;
  border-color: ${T.blue} !important;
  outline: none !important;
}
.quiz-textarea::placeholder { color: ${T.muted} !important; }
`

/* ─── helper to inject & update global style ────────────────────────────────── */

let globalStyleEl = null
const updateGlobalStyle = (css) => {
  if (!globalStyleEl) {
    globalStyleEl = document.createElement('style')
    document.head.appendChild(globalStyleEl)
  }
  globalStyleEl.textContent = css
}

/* ─── helpers ───────────────────────────────────────────────────────────────── */

const obterLinkEmbed = (url) => {
  if (!url) return null
  let e = url
  if (url.includes('youtube.com/watch?v=')) e = url.replace('watch?v=', 'embed/').split('&')[0]
  else if (url.includes('youtu.be/')) e = url.replace('youtu.be/', 'www.youtube.com/embed/')
  else if (url.includes('vimeo.com/')) e = url.replace('vimeo.com/', 'player.vimeo.com/video/')
  return e
}

/* ─── sub-components ────────────────────────────────────────────────────────── */

/** Glowing pill label */
const Pill = ({ T, color, children, style }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: `${color}20`,
      border: `1px solid ${color}50`,
      borderRadius: 99,
      padding: '3px 12px',
      fontSize: 12,
      fontWeight: 700,
      color,
      boxShadow: `0 0 10px ${color}30`,
      letterSpacing: '0.05em',
      ...style,
    }}
  >
    {children}
  </span>
)

/** Single stat block used in results */
const StatBox = ({ T, value, label, color }) => (
  <div
    style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '18px 12px',
      textAlign: 'center',
      boxShadow: glow(color, 12, isDark),
    }}
  >
    <div
      style={{
        fontSize: 30,
        fontWeight: 800,
        color,
        fontVariantNumeric: 'tabular-nums',
        textShadow: `0 0 20px ${color}88`,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: 11,
        color: T.muted,
        fontWeight: 600,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        marginTop: 4,
      }}
    >
      {label}
    </div>
  </div>
)

/** Results panel */
const StatsPanel = ({
  T,
  isDark,
  score,
  correctAnswers,
  totalQuestions,
  elapsedSeconds,
  onReplay,
  onReset,
}) => {
  const grade = calculateGrade(score)
  const gradeColor = score >= 90 ? T.green : score >= 70 ? T.cyan : score >= 60 ? T.amber : T.red
  const m = Math.floor(elapsedSeconds / 60)
  const s = elapsedSeconds % 60

  return (
    <div style={{ animation: 'scale-in .4s ease', textAlign: 'center', padding: '8px 0' }}>
      {grade && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 14, color: T.muted, marginBottom: 10 }}>{grade.remarks}</div>
          <div
            style={{
              display: 'inline-block',
              fontSize: 52,
              fontWeight: 900,
              color: gradeColor,
              lineHeight: 1,
              textShadow: `0 0 40px ${gradeColor}99, 0 0 80px ${gradeColor}44`,
            }}
          >
            {grade.grade}
          </div>
        </div>
      )}

      <CRow className="justify-content-center g-3 mb-5">
        <CCol xs={6} md={3}>
          <StatBox T={T} value={`${score}%`} label="Percentual" color={T.blue} isDark={isDark} />
        </CCol>
        <CCol xs={6} md={3}>
          <StatBox T={T} value={correctAnswers} label="Acertos" color={T.green} isDark={isDark} />
        </CCol>
        <CCol xs={6} md={3}>
          <StatBox
            T={T}
            value={totalQuestions - correctAnswers}
            label="Erros"
            color={T.red}
            isDark={isDark}
          />
        </CCol>
        <CCol xs={6} md={3}>
          <StatBox
            T={T}
            value={`${m}m ${s}s`}
            label="Tempo gasto"
            color={T.amber}
            isDark={isDark}
          />
        </CCol>
      </CRow>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <GlowButton T={T} isDark={isDark} color={T.blue} onClick={onReplay}>
          🔄 Refazer Quiz
        </GlowButton>
        <GlowButton T={T} isDark={isDark} color={T.muted} onClick={onReset} ghost>
          🏠 Voltar ao início
        </GlowButton>
      </div>
    </div>
  )
}

/** Glow-edged button */
const GlowButton = ({
  T,
  isDark,
  color = T.blue,
  children,
  onClick,
  disabled,
  ghost,
  size,
  style,
}) => {
  const [hov, setHov] = useState(false)
  const base = ghost
    ? { background: 'transparent', border: `1px solid ${T.border}`, color: T.muted }
    : { background: hov ? `${color}28` : `${color}18`, border: `1px solid ${color}60`, color }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...base,
        borderRadius: 10,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: size === 'sm' ? '5px 14px' : '9px 22px',
        fontSize: size === 'sm' ? 12 : 14,
        boxShadow: !ghost && hov ? glow(color, 16, isDark) : 'none',
        transition: 'all .15s',
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

/** Review table at end */
const ReviewTable = ({ T, questionsAndAnswers }) => (
  <div style={{ overflowX: 'auto', animation: 'fade-up .35s ease' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: T.surface }}>
          {['#', 'Pergunta', 'Sua resposta', 'Correta', ''].map((h) => (
            <th
              key={h}
              style={{
                padding: '10px 14px',
                textAlign: 'left',
                color: T.muted,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                borderBottom: `1px solid ${T.border}`,
                whiteSpace: 'nowrap',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {questionsAndAnswers.map((item, i) => (
          <tr
            key={i}
            style={{
              borderBottom: `1px solid ${T.border}`,
              background: item.isCorrect ? `${T.green}10` : `${T.red}10`,
            }}
          >
            <td style={{ padding: '10px 14px', color: T.muted }}>{i + 1}</td>
            <td style={{ padding: '10px 14px', color: T.text }}>{item.question}</td>
            <td
              style={{
                padding: '10px 14px',
                textAlign: 'center',
                fontWeight: 700,
                color: item.isCorrect ? T.green : T.red,
              }}
            >
              {item.userAnswer}
            </td>
            <td
              style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: T.green }}
            >
              {item.correctAnswer}
            </td>
            <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 16 }}>
              {item.isCorrect ? '✅' : '❌'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

/* ─── main component ────────────────────────────────────────────────────────── */

const Quiz = () => {
  const [status, setStatus] = useState('ready')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState('')
  const [score, setScore] = useState(0)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [tempoLimite, setTempoLimite] = useState(900)
  const [remainingSeconds, setRemainingSeconds] = useState(900)
  const [startTime, setStartTime] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [questionsAndAnswers, setQuestionsAndAnswers] = useState([])
  const [activeTab, setActiveTab] = useState('stats')
  const [isAnswerConfirmed, setIsAnswerConfirmed] = useState(false)
  const [isConfusing, setIsConfusing] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentStatus, setCommentStatus] = useState('idle')
  const [materias, setMaterias] = useState([])
  const [materiaSelecionada, setMateriaSelecionada] = useState('')
  const [quantidade, setQuantidade] = useState(0)
  const [isDark, setIsDark] = useState(false)

  const nomeAluno = sessionStorage.getItem('nome') || 'Aluno'

  /* theme detection */
  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.getAttribute('data-coreui-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-coreui-theme'],
    })
    return () => obs.disconnect()
  }, [])

  /* dynamic tokens & global style */
  const T = useMemo(() => getTokens(isDark), [isDark])
  useEffect(() => {
    updateGlobalStyle(buildGlobalCss(T))
  }, [T])

  useEffect(() => {
    fetch(`${API_URL}/api/admin/materias`)
      .then((r) => r.json())
      .then((d) => setMaterias(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  /* ── quiz logic (unchanged) ── */

  const startQuiz = async (questionsData) => {
    setError('')
    setFeedback('')
    setQuestions(questionsData)
    setCurrentIndex(0)
    setSelectedOption('')
    setScore(0)
    setQuestionsAndAnswers([])
    setStartTime(Date.now())
    setRemainingSeconds(tempoLimite)
    setSaved(false)
    setActiveTab('stats')
    setStatus('quiz')
    setIsAnswerConfirmed(false)
    setIsConfusing(false)
    setCommentText('')
    setCommentStatus('idle')
  }

  const fetchAndStart = async () => {
    setError('')
    setFeedback('')
    setStatus('loading')
    try {
      const params = new URLSearchParams()
      if (materiaSelecionada) params.set('materia_id', materiaSelecionada)
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch(`${API_URL}/api/questoes${qs}`)
      const data = await res.json()
      if (!res.ok || !Array.isArray(data) || data.length === 0)
        throw new Error('Nenhuma questão encontrada para esta matéria.')
      let pool = shuffle(data)
      if (quantidade > 0 && quantidade < pool.length) pool = pool.slice(0, quantidade)
      await startQuiz(pool)
    } catch (err) {
      setError(err.message || 'Erro ao buscar questões.')
      setStatus('ready')
    }
  }

  const fetchAndStartSimuladoRapido = async () => {
    setError('')
    setFeedback('')
    setStatus('loading')
    try {
      const res = await fetch(`${API_URL}/api/questoes`)
      const data = await res.json()
      if (!res.ok || !Array.isArray(data) || data.length === 0)
        throw new Error('Nenhuma questão encontrada.')
      setTempoLimite(600)
      await startQuiz(shuffle(data).slice(0, 10))
    } catch (err) {
      setError(err.message || 'Erro ao buscar questões.')
      setStatus('ready')
    }
  }

  const handleConfirmAnswer = () => {
    if (!selectedOption) {
      setError('Selecione uma alternativa antes de continuar.')
      return
    }
    const q = questions[currentIndex]
    const isCorrect = selectedOption === q.answer
    setQuestionsAndAnswers((prev) => [
      ...prev,
      {
        id: q.id,
        question: q.question,
        userAnswer: selectedOption,
        correctAnswer: q.answer,
        isCorrect,
      },
    ])
    if (isCorrect) setScore((p) => p + 1)
    setError('')
    setFeedback('')
    setIsAnswerConfirmed(true)
  }

  const handleNextQuestion = () => {
    setIsAnswerConfirmed(false)
    setIsConfusing(false)
    setCommentText('')
    setCommentStatus('idle')
    const next = currentIndex + 1
    if (next >= questions.length) {
      setElapsedSeconds(Math.round((Date.now() - startTime) / 1000))
      setStatus('finished')
      return
    }
    setCurrentIndex(next)
    setSelectedOption('')
  }

  const handleSendComment = async () => {
    if (!commentText.trim() && !isConfusing) return
    setCommentStatus('sending')
    try {
      const q = questions[currentIndex]
      const res = await fetch(`${API_URL}/api/feedbacks_questoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questao_id: q.id,
          nome_aluno: nomeAluno,
          texto: commentText,
          marcada_confusa: isConfusing,
        }),
      })
      if (!res.ok) throw new Error()
      setCommentStatus('sent')
    } catch {
      setError('Falha ao enviar comentário.')
      setCommentStatus('idle')
    }
  }

  const handleFinishEarly = () => {
    if (!window.confirm('Deseja realmente encerrar o simulado?')) return
    setElapsedSeconds(Math.round((Date.now() - startTime) / 1000))
    setFeedback(
      `Simulado encerrado. ${questionsAndAnswers.length} de ${questions.length} questões respondidas.`,
    )
    setStatus('finished')
  }

  const handleReplay = () => startQuiz(shuffle(questions))

  const handleReset = () => {
    setStatus('ready')
    setQuestions([])
    setQuestionsAndAnswers([])
    setScore(0)
    setFeedback('')
    setError('')
    setSaved(false)
    setMateriaSelecionada('')
    setQuantidade(0)
  }

  const handleSaveSession = async () => {
    if (status !== 'finished' || saved) return
    setSaving(true)
    setError('')
    try {
      const respondidas = questionsAndAnswers.length
      const porcentagem = calculateScore(respondidas, score)
      const matricula = sessionStorage.getItem('matricula') || nomeAluno
      const materiaLabel = materiaSelecionada
        ? materias.find((m) => String(m.id) === String(materiaSelecionada))?.nome ||
          'Quiz de Contabilidade'
        : 'Quiz de Contabilidade'
      const res = await fetch(`${API_URL}/api/sessoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_aluno: matricula,
          assunto_estudado: materiaLabel,
          questoes_respondidas: respondidas,
          taxa_acerto: porcentagem,
          tempo_gasto_segundos: elapsedSeconds,
          lista_detalhes: questionsAndAnswers.map((qa) => ({ id: qa.id, acertou: qa.isCorrect })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.mensagem || 'Falha ao salvar')
      setSaved(true)
      setFeedback('Sessão salva com sucesso no dashboard.')
    } catch {
      setError('Não foi possível salvar a sessão.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (status !== 'quiz' || isAnswerConfirmed) return
    const t = setInterval(() => setRemainingSeconds((p) => p - 1), 1000)
    return () => clearInterval(t)
  }, [status, isAnswerConfirmed])

  useEffect(() => {
    if (status === 'quiz' && remainingSeconds <= 0) {
      setElapsedSeconds(tempoLimite)
      setRemainingSeconds(0)
      setStatus('finished')
      setFeedback('O tempo acabou. O quiz foi finalizado automaticamente.')
    }
  }, [remainingSeconds, status, tempoLimite])

  useEffect(() => {
    if (status === 'finished' && !saved) handleSaveSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, saved])

  /* ── derived ── */
  const currentQuestion = questions[currentIndex]
  const totalAnswered = questionsAndAnswers.length
  const totalQuestions = questions.length
  const finalScore = calculateScore(totalAnswered || totalQuestions, score)
  const timerCritical = remainingSeconds <= 60
  const progress = totalQuestions ? ((currentIndex + 1) / totalQuestions) * 100 : 0

  /* ── shared card style ── */
  const cardSt = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 20,
    backdropFilter: 'blur(16px)',
    boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 30px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  }

  const labelSt = {
    display: 'block',
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: T.muted,
  }

  /* ────────────────────────────────────────────────────────────────────────── */

  return (
    <CContainer className="py-4">
      <CRow className="justify-content-center">
        <CCol xs={12} xl={10}>
          {/* wrapper card */}
          <div style={cardSt}>
            {/* header */}
            <div
              style={{
                padding: '20px 28px',
                borderBottom: `1px solid ${T.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${T.blue}20`,
                    border: `1px solid ${T.blue}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: glow(T.blue, 12, isDark),
                    fontSize: 18,
                  }}
                >
                  📘
                </div>
                <span
                  style={{ fontWeight: 800, fontSize: 18, color: T.text, letterSpacing: '-0.02em' }}
                >
                  Quiz de Contabilidade
                </span>
              </div>
              {status === 'quiz' && (
                <Pill
                  T={T}
                  color={timerCritical ? T.red : T.cyan}
                  style={{ animation: timerCritical ? 'halo-pulse 1s ease infinite' : 'none' }}
                >
                  ⏱ {formatSeconds(remainingSeconds)}
                </Pill>
              )}
            </div>

            <div style={{ padding: '28px' }}>
              {/* alerts */}
              {error && (
                <div
                  style={{
                    background: `${T.red}15`,
                    border: `1px solid ${T.red}40`,
                    borderRadius: 10,
                    padding: '12px 16px',
                    marginBottom: 20,
                    color: T.red,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    animation: 'fade-up .25s ease',
                  }}
                >
                  ⚠️ {error}
                  <button
                    onClick={() => setError('')}
                    style={{
                      marginLeft: 'auto',
                      background: 'none',
                      border: 'none',
                      color: T.red,
                      cursor: 'pointer',
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
              {feedback && (
                <div
                  style={{
                    background: `${T.cyan}12`,
                    border: `1px solid ${T.cyan}35`,
                    borderRadius: 10,
                    padding: '12px 16px',
                    marginBottom: 20,
                    color: T.cyan,
                    fontSize: 14,
                    animation: 'fade-up .25s ease',
                  }}
                >
                  ℹ️ {feedback}
                </div>
              )}

              {/* ══ READY ══════════════════════════════════════════════════════ */}
              {status === 'ready' && (
                <div style={{ animation: 'fade-up .35s ease' }}>
                  <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: T.text,
                        letterSpacing: '-0.02em',
                        marginBottom: 8,
                      }}
                    >
                      Pronto para testar seus conhecimentos?
                    </div>
                    <div style={{ color: T.muted, fontSize: 14 }}>
                      Configure sua sessão abaixo ou inicie o simulado rápido.
                    </div>
                  </div>

                  <CRow className="g-3 mb-5">
                    <CCol xs={12} md={4}>
                      <label style={labelSt}>📚 Matéria</label>
                      <CFormSelect
                        className="quiz-select"
                        value={materiaSelecionada}
                        onChange={(e) => setMateriaSelecionada(e.target.value)}
                      >
                        <option value="">Todas as matérias</option>
                        {materias.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol xs={6} md={4}>
                      <label style={labelSt}>🔢 Questões</label>
                      <CFormSelect
                        className="quiz-select"
                        value={quantidade}
                        onChange={(e) => setQuantidade(Number(e.target.value))}
                      >
                        {QTD_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol xs={6} md={4}>
                      <label style={labelSt}>⏱ Tempo</label>
                      <CFormSelect
                        className="quiz-select"
                        value={tempoLimite}
                        onChange={(e) => setTempoLimite(Number(e.target.value))}
                      >
                        {TIME_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>
                  </CRow>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                      onClick={fetchAndStart}
                      style={{
                        background: `linear-gradient(135deg, ${T.blue}cc, ${T.purple}cc)`,
                        border: 'none',
                        borderRadius: 12,
                        padding: '14px',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 15,
                        cursor: 'pointer',
                        boxShadow: `${glow(T.blue, 20, isDark)}, 0 4px 16px rgba(0,0,0,0.3)`,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      ▶ Iniciar Quiz Personalizado
                    </button>
                    <button
                      onClick={fetchAndStartSimuladoRapido}
                      style={{
                        background: `${T.green}18`,
                        border: `1px solid ${T.green}50`,
                        borderRadius: 12,
                        padding: '13px',
                        color: T.green,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        boxShadow: glow(T.green, 12, isDark),
                      }}
                    >
                      ⚡ Simulado Rápido — 10 Questões · 10 min
                    </button>
                  </div>
                </div>
              )}

              {/* ══ LOADING ═════════════════════════════════════════════════════ */}
              {status === 'loading' && (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      border: `3px solid ${T.blue}30`,
                      borderTopColor: T.blue,
                      borderRadius: '50%',
                      animation: 'spin-slow .8s linear infinite',
                      margin: '0 auto 20px',
                    }}
                  />
                  <div style={{ color: T.muted, fontSize: 14 }}>Carregando questões...</div>
                </div>
              )}

              {/* ══ QUIZ ════════════════════════════════════════════════════════ */}
              {status === 'quiz' && currentQuestion && (
                <div style={{ animation: 'fade-up .3s ease' }}>
                  {/* progress */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>
                      Questão {currentIndex + 1} / {totalQuestions}
                    </span>
                    <span style={{ fontSize: 12, color: T.muted }}>
                      {Math.round(progress)}% concluído
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                      borderRadius: 99,
                      marginBottom: 24,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${T.blue}, ${T.purple})`,
                        borderRadius: 99,
                        transition: 'width .4s ease',
                        boxShadow: glow(T.blue, 8, isDark),
                      }}
                    />
                  </div>

                  <CRow>
                    {/* question column */}
                    <CCol lg={isAnswerConfirmed ? 7 : 12} style={{ transition: 'all .3s ease' }}>
                      {/* confusing badge */}
                      {isConfusing && (
                        <Pill T={T} color={T.amber} style={{ marginBottom: 10 }}>
                          ⚠️ Marcada como confusa
                        </Pill>
                      )}

                      {/* question text */}
                      <p
                        style={{
                          fontSize: 17,
                          fontWeight: 600,
                          color: T.text,
                          lineHeight: 1.6,
                          marginBottom: 20,
                        }}
                      >
                        {currentQuestion.question}
                      </p>

                      {/* options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {currentQuestion.options.map((text, idx) => {
                          const val = LETTERS[idx]
                          if (!val) return null
                          const isSel = selectedOption === val
                          const isRight = val === currentQuestion.answer

                          let borderColor = T.border
                          let bg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                          let textColor = T.text
                          let shadow = 'none'
                          let leftColor = 'transparent'

                          if (isAnswerConfirmed) {
                            if (isRight) {
                              borderColor = T.green
                              bg = `${T.green}14`
                              textColor = T.green
                              shadow = ring(T.green, isDark)
                              leftColor = T.green
                            } else if (isSel) {
                              borderColor = T.red
                              bg = `${T.red}12`
                              textColor = T.red
                              shadow = ring(T.red, isDark)
                              leftColor = T.red
                            } else {
                              borderColor = 'transparent'
                              textColor = isDark ? 'rgba(226,232,240,0.25)' : 'rgba(15,23,42,0.3)'
                            }
                          } else if (isSel) {
                            borderColor = T.blue
                            bg = `${T.blue}18`
                            textColor = T.blue
                            shadow = ring(T.blue, isDark)
                            leftColor = T.blue
                          }

                          return (
                            <button
                              key={val}
                              className="quiz-option-btn"
                              disabled={isAnswerConfirmed}
                              onClick={() => !isAnswerConfirmed && setSelectedOption(val)}
                              style={{
                                background: bg,
                                border: `1px solid ${borderColor}`,
                                borderRadius: 12,
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                cursor: isAnswerConfirmed ? 'default' : 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                boxShadow: shadow,
                                color: textColor,
                                borderLeft: `3px solid ${leftColor || borderColor}`,
                              }}
                            >
                              <span
                                style={{
                                  minWidth: 28,
                                  height: 28,
                                  borderRadius: 8,
                                  background: `${borderColor}30`,
                                  border: `1px solid ${borderColor}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: 12,
                                  color: textColor,
                                  flexShrink: 0,
                                }}
                              >
                                {val}
                              </span>
                              <span style={{ fontSize: 14, lineHeight: 1.45 }}>{text}</span>
                              {isAnswerConfirmed && isRight && (
                                <span style={{ marginLeft: 'auto', fontSize: 16 }}>✓</span>
                              )}
                              {isAnswerConfirmed && isSel && !isRight && (
                                <span style={{ marginLeft: 'auto', fontSize: 16 }}>✗</span>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* feedback alert */}
                      {isAnswerConfirmed &&
                        (() => {
                          const ok = selectedOption === currentQuestion.answer
                          return (
                            <div
                              style={{
                                marginTop: 16,
                                padding: '14px 16px',
                                background: ok ? `${T.green}12` : `${T.red}12`,
                                border: `1px solid ${ok ? T.green : T.red}40`,
                                borderRadius: 12,
                                animation: 'fade-up .3s ease',
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: ok ? T.green : T.red,
                                  marginBottom: 4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                }}
                              >
                                {ok ? '✅ Correto!' : '❌ Incorreto'}
                              </div>
                              <div style={{ fontSize: 13, color: T.muted }}>
                                A alternativa correta é a letra{' '}
                                <strong style={{ color: T.green }}>{currentQuestion.answer}</strong>
                                .
                              </div>
                              {currentQuestion.tentativas > 0 && (
                                <div
                                  style={{
                                    marginTop: 8,
                                    paddingTop: 8,
                                    borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                                    fontSize: 12,
                                    color: T.cyan,
                                  }}
                                >
                                  👥{' '}
                                  {Math.round(
                                    (currentQuestion.acertos / currentQuestion.tentativas) * 100,
                                  )}
                                  % dos alunos acertaram esta questão.
                                </div>
                              )}
                            </div>
                          )
                        })()}
                    </CCol>

                    {/* sidebar column (explanation + comments) */}
                    {isAnswerConfirmed && (
                      <CCol lg={5}>
                        <div
                          style={{
                            marginTop: 0,
                            animation: 'fade-up .35s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                          }}
                        >
                          {/* explanation */}
                          <div
                            style={{
                              background: `${T.cyan}08`,
                              border: `1px solid ${T.cyan}30`,
                              borderRadius: 14,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                padding: '10px 14px',
                                background: `${T.cyan}18`,
                                borderBottom: `1px solid ${T.cyan}30`,
                                fontWeight: 700,
                                color: T.cyan,
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <CIcon icon={cilLightbulb} style={{ width: 14 }} /> Explicação do
                              Professor
                            </div>
                            <div
                              style={{
                                padding: '14px',
                                color: T.text,
                                fontSize: 13,
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {currentQuestion.explicacao ||
                                'Nenhuma explicação adicional para esta questão.'}
                            </div>
                            {currentQuestion.link_video && (
                              <div style={{ padding: '0 14px 14px' }}>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    color: T.red,
                                    fontSize: 12,
                                    marginBottom: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <CIcon icon={cilVideo} style={{ width: 13 }} /> Vídeo de Apoio
                                </div>
                                <div
                                  style={{
                                    position: 'relative',
                                    paddingBottom: '56.25%',
                                    height: 0,
                                    borderRadius: 10,
                                    overflow: 'hidden',
                                  }}
                                >
                                  <iframe
                                    src={obterLinkEmbed(currentQuestion.link_video)}
                                    title="Vídeo"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '100%',
                                      border: 'none',
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* community comments */}
                          {currentQuestion.comentarios_publicos?.length > 0 && (
                            <div
                              style={{
                                background: `${T.green}08`,
                                border: `1px solid ${T.green}30`,
                                borderRadius: 14,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  padding: '10px 14px',
                                  background: `${T.green}18`,
                                  borderBottom: `1px solid ${T.green}30`,
                                  fontWeight: 700,
                                  color: T.green,
                                  fontSize: 13,
                                }}
                              >
                                💬 Comentários da Comunidade
                              </div>
                              <div
                                style={{
                                  padding: 14,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 12,
                                }}
                              >
                                {currentQuestion.comentarios_publicos.map((c, i) => (
                                  <div key={i}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 4,
                                      }}
                                    >
                                      <span
                                        style={{ fontWeight: 700, color: T.green, fontSize: 12 }}
                                      >
                                        {c.nome_aluno || 'Aluno'}
                                      </span>
                                      <span style={{ color: T.muted, fontSize: 11 }}>
                                        {new Date(c.data_criacao).toLocaleDateString('pt-BR')}
                                      </span>
                                    </div>
                                    <p
                                      style={{
                                        color: T.text,
                                        fontSize: 13,
                                        margin: 0,
                                        fontStyle: 'italic',
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      "{c.texto}"
                                    </p>
                                    {c.resposta_professor && (
                                      <div
                                        style={{
                                          marginTop: 8,
                                          marginLeft: 12,
                                          padding: '8px 12px',
                                          background: `${T.blue}12`,
                                          border: `1px solid ${T.blue}30`,
                                          borderLeft: `3px solid ${T.blue}`,
                                          borderRadius: '0 8px 8px 0',
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: T.blue,
                                            marginBottom: 4,
                                          }}
                                        >
                                          👨‍🏫 Professor
                                        </div>
                                        <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
                                          {c.resposta_professor}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* feedback box */}
                          <div
                            style={{
                              background: T.surface,
                              border: `1px solid ${T.border}`,
                              borderRadius: 14,
                              padding: 14,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 10,
                              }}
                            >
                              <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>
                                💬 Feedback sobre esta questão
                              </span>
                              <button
                                onClick={() => setIsConfusing(!isConfusing)}
                                disabled={commentStatus === 'sending' || commentStatus === 'sent'}
                                style={{
                                  background: isConfusing ? `${T.amber}25` : 'transparent',
                                  border: `1px solid ${isConfusing ? T.amber : T.border}`,
                                  borderRadius: 20,
                                  padding: '3px 10px',
                                  color: isConfusing ? T.amber : T.muted,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: isConfusing ? glow(T.amber, 8, isDark) : 'none',
                                  transition: 'all .15s',
                                }}
                              >
                                {isConfusing ? '⚠️ Confusa' : '⚠️ Marcar confusa'}
                              </button>
                            </div>
                            <CFormTextarea
                              className="quiz-textarea"
                              placeholder="Teve dúvida no enunciado? Descreva aqui."
                              rows={2}
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              maxLength={300}
                              disabled={commentStatus === 'sending' || commentStatus === 'sent'}
                            />
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 8,
                              }}
                            >
                              <span style={{ fontSize: 11, color: T.muted }}>
                                {commentText.length} / 300
                              </span>
                              {commentStatus === 'sent' ? (
                                <Pill T={T} color={T.green}>
                                  ✅ Enviado!
                                </Pill>
                              ) : (
                                <GlowButton
                                  T={T}
                                  isDark={isDark}
                                  size="sm"
                                  color={T.cyan}
                                  onClick={handleSendComment}
                                  disabled={
                                    (!commentText.trim() && !isConfusing) ||
                                    commentStatus === 'sending'
                                  }
                                >
                                  {commentStatus === 'sending' ? '...' : 'Enviar'}
                                </GlowButton>
                              )}
                            </div>
                          </div>
                        </div>
                      </CCol>
                    )}
                  </CRow>

                  {/* footer actions */}
                  <div
                    style={{
                      marginTop: 28,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Pill T={T} color={T.muted}>
                        👤 {nomeAluno}
                      </Pill>
                      <GlowButton
                        T={T}
                        isDark={isDark}
                        color={T.red}
                        size="sm"
                        ghost
                        onClick={handleFinishEarly}
                        disabled={questionsAndAnswers.length === 0}
                      >
                        ⛔ Encerrar
                      </GlowButton>
                    </div>
                    {!isAnswerConfirmed ? (
                      <button
                        onClick={handleConfirmAnswer}
                        disabled={!selectedOption}
                        style={{
                          background: selectedOption
                            ? `linear-gradient(135deg, ${T.green}cc, ${T.cyan}aa)`
                            : isDark
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.04)',
                          border: 'none',
                          borderRadius: 10,
                          padding: '10px 24px',
                          color: selectedOption ? '#fff' : T.muted,
                          fontWeight: 800,
                          fontSize: 14,
                          cursor: selectedOption ? 'pointer' : 'not-allowed',
                          boxShadow: selectedOption ? glow(T.green, 16, isDark) : 'none',
                          transition: 'all .2s',
                        }}
                      >
                        Confirmar resposta →
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuestion}
                        style={{
                          background: `linear-gradient(135deg, ${T.blue}cc, ${T.purple}aa)`,
                          border: 'none',
                          borderRadius: 10,
                          padding: '10px 24px',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: 14,
                          cursor: 'pointer',
                          boxShadow: glow(T.blue, 16, isDark),
                        }}
                      >
                        {currentIndex + 1 >= totalQuestions
                          ? 'Finalizar Quiz →'
                          : 'Próxima questão →'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ══ FINISHED ════════════════════════════════════════════════════ */}
              {status === 'finished' && (
                <div style={{ animation: 'fade-up .35s ease' }}>
                  {/* tabs */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 4,
                      marginBottom: 28,
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      borderRadius: 12,
                      padding: 4,
                    }}
                  >
                    {[
                      { id: 'stats', label: '📊 Estatísticas' },
                      { id: 'qna', label: '📋 Revisão' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          borderRadius: 9,
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 13,
                          background:
                            activeTab === t.id
                              ? `linear-gradient(135deg, ${T.blue}cc, ${T.purple}cc)`
                              : 'transparent',
                          color: activeTab === t.id ? '#fff' : T.muted,
                          boxShadow: activeTab === t.id ? glow(T.blue, 10, isDark) : 'none',
                          transition: 'all .2s',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'stats' && (
                    <StatsPanel
                      T={T}
                      isDark={isDark}
                      score={finalScore}
                      correctAnswers={score}
                      totalQuestions={totalAnswered || totalQuestions}
                      elapsedSeconds={elapsedSeconds}
                      onReplay={handleReplay}
                      onReset={handleReset}
                    />
                  )}
                  {activeTab === 'qna' && (
                    <ReviewTable T={T} questionsAndAnswers={questionsAndAnswers} />
                  )}
                </div>
              )}
            </div>

            {/* footer */}
            {status === 'finished' && (
              <div
                style={{
                  padding: '14px 28px',
                  borderTop: `1px solid ${T.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12, color: saved ? T.green : T.muted }}>
                  {saved ? '✅ Sessão salva no dashboard.' : saving ? '⏳ Salvando sessão...' : ''}
                </span>
                <GlowButton
                  T={T}
                  isDark={isDark}
                  color={T.blue}
                  onClick={handleSaveSession}
                  disabled={saving || saved}
                  size="sm"
                >
                  {saving ? '⏳ Salvando...' : saved ? '✅ Sessão salva' : '💾 Salvar sessão'}
                </GlowButton>
              </div>
            )}
          </div>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default Quiz
