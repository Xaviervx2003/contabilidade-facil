import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CContainer,
  CFormSelect,
  CFormTextarea,
  CNav,
  CNavItem,
  CNavLink,
  CProgress,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCheckCircle,
  cilXCircle,
  cilLightbulb,
  cilVideo,
  cilFullscreen,
  cilFullscreenExit,
  cilShare,
  cilVolumeHigh,
  cilVolumeOff,
} from '@coreui/icons'
import { API_URL } from '../../config'
import { calculateScore, calculateGrade, formatSeconds, shuffle } from '../../utils/quizUtils'

/* ─── Constantes e tokens ────────────────────────────────────────────────────── */

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
const SESSION_KEY = 'contabilidade_quiz_state'

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
})

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

const obterLinkEmbed = (url) => {
  if (!url) return null
  let e = url
  if (url.includes('youtube.com/watch?v=')) e = url.replace('watch?v=', 'embed/').split('&')[0]
  else if (url.includes('youtu.be/')) e = url.replace('youtu.be/', 'www.youtube.com/embed/')
  else if (url.includes('vimeo.com/')) e = url.replace('vimeo.com/', 'player.vimeo.com/video/')
  return e
}

const playSound = (correct, enabled) => {
  if (!enabled) return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    if (correct) {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523, ctx.currentTime)
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12)
    } else {
      osc.type = 'square'
      osc.frequency.setValueAtTime(180, ctx.currentTime)
    }
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch { }
}

/* ─── Skeleton de carregamento ───────────────────────────────────────────────── */

const SkeletonQuiz = ({ isDark }) => {
  const bg = isDark ? '#1a2535' : '#f1f3f5'
  const pulse = isDark ? '#253447' : '#e2e8f0'
  return (
    <div style={{ padding: 24 }}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            height: 52,
            background: `linear-gradient(90deg,${bg} 25%,${pulse} 50%,${bg} 75%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
            animationDelay: `${i * 0.1}s`,
            borderRadius: 8,
            marginBottom: 12,
          }}
        />
      ))}
    </div>
  )
}

/* ─── Componente de dropdown multi-matérias ───────────────────────────────────── */

const MateriaMultiSelect = ({ materias, selected, onChange }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id) => {
    const s = String(id)
    onChange(selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s])
  }

  const label =
    selected.length === 0 ? 'Todas as matérias' :
      selected.length === 1 ? (materias.find(m => String(m.id) === selected[0])?.nome ?? '1 selecionada') :
        `${selected.length} matérias selecionadas`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-outline-secondary w-100 d-flex justify-content-between align-items-center"
        onClick={() => setOpen(o => !o)}
        style={{ textAlign: 'left', overflow: 'hidden' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span className="ms-2 flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', zIndex: 1050, width: '100%', top: '100%', left: 0, marginTop: 2,
          background: 'var(--cui-body-bg)', border: '1px solid var(--cui-border-color)',
          borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center">
            <small className="text-body-secondary">Selecione as matérias</small>
            {selected.length > 0 && (
              <small className="text-primary" style={{ cursor: 'pointer' }} onClick={() => onChange([])}>
                Limpar
              </small>
            )}
          </div>
          {materias.map(m => (
            <label key={m.id} className="d-flex align-items-center gap-2 px-3 py-2" style={{ cursor: 'pointer', margin: 0 }}>
              <input type="checkbox" checked={selected.includes(String(m.id))} onChange={() => toggle(m.id)} />
              <span style={{ fontSize: 14 }}>{m.nome}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Tabela de revisão ──────────────────────────────────────────────────────── */

const ReviewTable = ({ questionsAndAnswers, isDark, T }) => (
  <div style={{ overflowX: 'auto', animation: 'fade-up .35s ease' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: T.surface }}>
          {['#', 'Pergunta', 'Sua resposta', 'Correta', ''].map(h => (
            <th key={h} style={{
              padding: '10px 14px', textAlign: 'left', color: T.muted, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap',
            }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {questionsAndAnswers.map((item, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: item.isCorrect ? `${T.green}10` : `${T.red}10` }}>
            <td style={{ padding: '10px 14px', color: T.muted }}>{i + 1}</td>
            <td style={{ padding: '10px 14px', color: T.text }}>{item.question}</td>
            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: item.isCorrect ? T.green : T.red }}>
              {item.userAnswer}
            </td>
            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: T.green }}>
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

/* ─── Componente Principal ───────────────────────────────────────────────────── */

const Quiz = () => {
  const [status, setStatus] = useState('ready')
  const [questions, setQuestions] = useState([])
  const [queue, setQueue] = useState([])
  const [skippedSet, setSkippedSet] = useState(new Set())
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
  const [materiasSelected, setMateriasSelected] = useState([])
  const [quantidade, setQuantidade] = useState(0)
  const [isDark, setIsDark] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('quiz_sound') === 'true')
  const [savedSnapshot, setSavedSnapshot] = useState(null)
  const [showDica, setShowDica] = useState(false)

  const nomeAluno = sessionStorage.getItem('nome') || 'Aluno'
  const T = useMemo(() => getTokens(isDark), [isDark])

  /* ── Detecção de tema ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-coreui-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-coreui-theme'] })
    return () => obs.disconnect()
  }, [])

  /* ── Fullscreen ────────────────────────────────────────────────────────────── */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { })
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { })
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  /* ── Som ───────────────────────────────────────────────────────────────────── */
  useEffect(() => { localStorage.setItem('quiz_sound', String(soundEnabled)) }, [soundEnabled])

  /* ── Buscar matérias ───────────────────────────────────────────────────────── */
  useEffect(() => {
    fetch(`${API_URL}/api/admin/materias`)
      .then(r => r.json())
      .then(d => setMaterias(Array.isArray(d) ? d : []))
      .catch(() => { })
  }, [])

  /* ── Snapshot (salvar estado) ───────────────────────────────────────────────── */
  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      try { setSavedSnapshot(JSON.parse(raw)) } catch { sessionStorage.removeItem(SESSION_KEY) }
    }
  }, [])

  useEffect(() => {
    if (status !== 'quiz') return
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        questions, queue, score, questionsAndAnswers,
        tempoLimite, remainingSeconds, startTime,
        skippedSet: [...skippedSet],
      }))
    } catch { }
  }, [status, queue, score, questionsAndAnswers, remainingSeconds])

  useEffect(() => {
    if (status === 'finished') sessionStorage.removeItem(SESSION_KEY)
  }, [status])

  /* ── Timer ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (status !== 'quiz' || isAnswerConfirmed) return
    const t = setInterval(() => setRemainingSeconds(p => p - 1), 1000)
    return () => clearInterval(t)
  }, [status, isAnswerConfirmed])

  useEffect(() => {
    if (status === 'quiz' && remainingSeconds <= 0) {
      setElapsedSeconds(tempoLimite); setRemainingSeconds(0); setStatus('finished')
      setFeedback('O tempo acabou. O quiz foi finalizado automaticamente.')
    }
  }, [remainingSeconds, status])

  useEffect(() => {
    if (status === 'finished' && !saved) handleSaveSession()
  }, [status, saved])

  /* ── Lógica do quiz ────────────────────────────────────────────────────────── */

  const startQuizWithTime = (questionsData, timeLimit) => {
    const indices = [...Array(questionsData.length).keys()]
    setError(''); setFeedback('')
    setQuestions(questionsData); setQueue(indices); setSkippedSet(new Set())
    setSelectedOption(''); setScore(0); setQuestionsAndAnswers([])
    setStartTime(Date.now()); setRemainingSeconds(timeLimit); setTempoLimite(timeLimit)
    setSaved(false); setActiveTab('stats'); setStatus('quiz')
    setIsAnswerConfirmed(false); setIsConfusing(false)
    setCommentText(''); setCommentStatus('idle'); setShowDica(false); setSavedSnapshot(null)
  }

  const startQuiz = (questionsData) => startQuizWithTime(questionsData, tempoLimite)

  const resumeSnapshot = (snapshot) => {
    setQuestions(snapshot.questions); setQueue(snapshot.queue); setScore(snapshot.score)
    setQuestionsAndAnswers(snapshot.questionsAndAnswers); setTempoLimite(snapshot.tempoLimite)
    setRemainingSeconds(snapshot.remainingSeconds); setStartTime(snapshot.startTime)
    setSkippedSet(new Set(snapshot.skippedSet || []))
    setSelectedOption(''); setIsAnswerConfirmed(false); setShowDica(false)
    setIsConfusing(false); setCommentText(''); setCommentStatus('idle')
    setSaved(false); setActiveTab('stats'); setFeedback(''); setError('')
    setSavedSnapshot(null); setStatus('quiz')
  }

  const fetchAndStart = async () => {
    setError(''); setFeedback(''); setStatus('loading')
    try {
      const res = await fetch(`${API_URL}/api/questoes`)
      let data = await res.json()
      if (!res.ok || !Array.isArray(data) || data.length === 0)
        throw new Error('Nenhuma questão encontrada.')
      if (materiasSelected.length > 0) {
  const selectedNomes = materiasSelected.map(id => {
    const m = materias.find(mat => String(mat.id) === String(id));
    return m ? m.nome : '';
  }).filter(Boolean);

  data = data.filter(q => {
    // Opção 1: materia_id (vinculado via questoes_materias)
    if (q.materia_id) return materiasSelected.includes(String(q.materia_id));
    // Opção 2: materia_ids (array de IDs)
    if (q.materia_ids) return q.materia_ids.some(id => materiasSelected.includes(String(id)));
    // Opção 3: assunto textual (fallback para questões importadas)
    const assunto = (q.assunto || '').toLowerCase();
    return selectedNomes.some(nome => assunto.includes(nome.toLowerCase()));
  });
  
  if (data.length === 0) throw new Error('Nenhuma questão para as matérias selecionadas.');
}
      let pool = shuffle(data)
      if (quantidade > 0 && quantidade < pool.length) pool = pool.slice(0, quantidade)
      startQuiz(pool)
    } catch (err) {
      setError(err.message || 'Erro ao buscar questões.')
      setStatus('ready')
    }
  }

  const fetchAndStartSimuladoRapido = async () => {
    setError(''); setFeedback(''); setStatus('loading')
    try {
      const res = await fetch(`${API_URL}/api/questoes`)
      const data = await res.json()
      if (!res.ok || !Array.isArray(data) || data.length === 0)
        throw new Error('Nenhuma questão encontrada.')
      startQuizWithTime(shuffle(data).slice(0, 10), 600)
    } catch (err) {
      setError(err.message || 'Erro ao buscar questões.')
      setStatus('ready')
    }
  }

  const handleConfirmAnswer = () => {
    if (!selectedOption) { setError('Selecione uma alternativa.'); return }
    const q = questions[queue[0]]
    const isCorrect = selectedOption === q.answer
    setQuestionsAndAnswers(prev => [...prev, {
      id: q.id, question: q.question, userAnswer: selectedOption, correctAnswer: q.answer, isCorrect,
      materia_nome: q.materia_nome || q.materia,
    }])
    if (isCorrect) setScore(p => p + 1)
    setError(''); setIsAnswerConfirmed(true)
    playSound(isCorrect, soundEnabled)
    setSkippedSet(prev => { const n = new Set(prev); n.delete(queue[0]); return n })
  }

  const handleNextQuestion = () => {
    setIsAnswerConfirmed(false); setIsConfusing(false); setCommentText(''); setCommentStatus('idle'); setShowDica(false)
    const newQueue = queue.slice(1)
    if (newQueue.length === 0) {
      setElapsedSeconds(Math.round((Date.now() - startTime) / 1000))
      setStatus('finished'); return
    }
    setQueue(newQueue); setSelectedOption('')
  }

  const handleSkip = () => {
    if (queue.length <= 1) return
    setSkippedSet(prev => new Set([...prev, queue[0]]))
    setQueue(q => [...q.slice(1), q[0]])
    setSelectedOption(''); setIsAnswerConfirmed(false); setShowDica(false)
    setIsConfusing(false); setCommentText(''); setCommentStatus('idle')
  }

  const handleSendComment = async () => {
    if (!commentText.trim() && !isConfusing) return
    setCommentStatus('sending')
    try {
      const q = questions[queue[0]]
      await fetch(`${API_URL}/api/feedbacks_questoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questao_id: q.id, nome_aluno: nomeAluno, texto: commentText, marcada_confusa: isConfusing }),
      })
      setCommentStatus('sent')
    } catch { setError('Falha ao enviar comentário.'); setCommentStatus('idle') }
  }

  const handleFinishEarly = () => {
    if (!window.confirm('Encerrar o simulado?')) return
    sessionStorage.removeItem(SESSION_KEY)
    setElapsedSeconds(Math.round((Date.now() - startTime) / 1000))
    setFeedback(`Simulado encerrado. ${questionsAndAnswers.length} de ${questions.length} questões respondidas.`)
    setStatus('finished')
  }

  const handleRetryErrors = () => {
    const wrongIds = new Set(questionsAndAnswers.filter(qa => !qa.isCorrect).map(qa => qa.id))
    const wrongQuestions = questions.filter(q => wrongIds.has(q.id))
    if (wrongQuestions.length === 0) { alert('Parabéns! Você não errou nenhuma questão. 🎉'); return }
    startQuiz(wrongQuestions)
  }

  const handleReplay = () => startQuiz(shuffle(questions))

  const handleReset = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setStatus('ready'); setQuestions([]); setQuestionsAndAnswers([])
    setQueue([]); setSkippedSet(new Set())
    setScore(0); setFeedback(''); setError(''); setSaved(false)
    setMateriasSelected([]); setQuantidade(0)
  }

  const handleSaveSession = async () => {
    if (status !== 'finished' || saved) return
    setSaving(true); setError('')
    try {
      const respondidas = questionsAndAnswers.length
      const porcentagem = calculateScore(respondidas, score)
      const matricula = sessionStorage.getItem('matricula') || nomeAluno
      const materiaLabel = materiasSelected.length > 0
        ? materias.filter(m => materiasSelected.includes(String(m.id))).map(m => m.nome).join(', ') || 'Quiz de Contabilidade'
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
          lista_detalhes: questionsAndAnswers.map(qa => ({ id: qa.id, acertou: qa.isCorrect })),
        }),
      })
      if (!res.ok) throw new Error()
      setSaved(true); setFeedback('Sessão salva com sucesso no dashboard.')
    } catch { setError('Não foi possível salvar a sessão.') } finally { setSaving(false) }
  }

  const handleShare = async () => {
    const m = Math.floor(elapsedSeconds / 60)
    const s = elapsedSeconds % 60
    const text = `🎓 Fiz o Quiz de Contabilidade Fácil!\n✅ ${score} acertos de ${totalAnswered} (${finalScore}%)\n⏱ Tempo: ${m}m ${s}s\n📘 Estude também em Contabilidade Fácil!`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Quiz de Contabilidade', text })
      } else {
        await navigator.clipboard.writeText(text)
        alert('✅ Copiado!')
      }
    } catch { }
  }

  /* ── Derivados ─────────────────────────────────────────────────────────────── */

  const currentIndex = queue[0] ?? 0
  const currentQuestion = status === 'quiz' ? questions[currentIndex] : null
  const totalAnswered = questionsAndAnswers.length
  const totalQuestions = questions.length
  const finalScore = calculateScore(totalAnswered || totalQuestions, score)
  const timerCritical = remainingSeconds <= 60
  const progress = totalQuestions ? (totalAnswered / totalQuestions) * 100 : 0
  const isRevisiting = status === 'quiz' && skippedSet.has(currentIndex)
  const pendingSkipped = skippedSet.size - (isRevisiting ? 1 : 0)
  const grade = useMemo(() => calculateGrade(finalScore), [finalScore])
  const gradeColor = finalScore >= 90 ? 'success' : finalScore >= 70 ? 'info' : finalScore >= 60 ? 'warning' : 'danger'

  /* ── Render ────────────────────────────────────────────────────────────────── */

  const cardBg = isDark ? '#1a2535' : '#ffffff'
  const cardBorder = isDark ? '#2d3f52' : '#e2e8f0'
  const bgPage = isDark ? '#111b27' : '#f4f7fa'

  return (
    <CContainer fluid style={{ background: bgPage, minHeight: '100vh', padding: '24px' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes fade-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Snapshot retomada */}
      {savedSnapshot && status === 'ready' && (
        <CAlert color="warning" className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <span>📌 Você tem um quiz em andamento ({savedSnapshot.questionsAndAnswers?.length ?? 0} questões respondidas).</span>
          <div className="d-flex gap-2 flex-shrink-0">
            <CButton color="warning" size="sm" onClick={() => resumeSnapshot(savedSnapshot)}>Continuar</CButton>
            <CButton color="secondary" size="sm" variant="outline" onClick={() => { setSavedSnapshot(null); sessionStorage.removeItem(SESSION_KEY) }}>Descartar</CButton>
          </div>
        </CAlert>
      )}

      <CRow className="justify-content-center">
        <CCol xs={12} xl={10}>
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: 'hidden', boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.06)' }}>
            {/* Cabeçalho */}
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <h4 style={{ color: isDark ? '#7eb8f7' : '#1a6fb5', fontWeight: 800, margin: 0, fontSize: 18 }}>
                📘 Quiz de Contabilidade
              </h4>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {status === 'quiz' && (
                  <CBadge color={timerCritical ? 'danger' : 'info'} style={{ fontSize: 14, padding: '6px 12px' }}>
                    ⏱ {formatSeconds(remainingSeconds)}
                  </CBadge>
                )}
                <CButton color="link" size="sm" onClick={toggleFullscreen} title="Modo Foco">
                  <CIcon icon={isFullscreen ? cilFullscreenExit : cilFullscreen} size="lg" />
                </CButton>
              </div>
            </div>

            {/* Corpo */}
            <div style={{ padding: 24 }}>

              {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}
              {feedback && <CAlert color="info">{feedback}</CAlert>}

              {/* ══ READY ══════════════════════════════════════════════════════════ */}
              {status === 'ready' && (
                <div style={{ animation: 'fade-up .35s ease' }}>
                  <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
                    <h5 style={{ color: T.text, fontWeight: 800, marginBottom: 8 }}>Pronto para testar seus conhecimentos?</h5>
                    <p style={{ color: T.muted, fontSize: 14 }}>Configure sua sessão abaixo ou inicie o simulado rápido.</p>
                  </div>

                  <CRow className="g-3 mb-4">
                    <CCol md={4}>
                      <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.muted }}>Matéria(s)</label>
                      <MateriaMultiSelect materias={materias} selected={materiasSelected} onChange={setMateriasSelected} />
                    </CCol>
                    <CCol md={4}>
                      <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.muted }}>Nº de Questões</label>
                      <CFormSelect value={quantidade} onChange={e => setQuantidade(Number(e.target.value))}>
                        {QTD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </CFormSelect>
                    </CCol>
                    <CCol md={4}>
                      <label className="form-label" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: T.muted }}>Tempo Limite</label>
                      <CFormSelect value={tempoLimite} onChange={e => setTempoLimite(Number(e.target.value))}>
                        {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </CFormSelect>
                    </CCol>
                  </CRow>

                  <div className="d-grid gap-2">
                    <button onClick={fetchAndStart} style={{
                      background: `linear-gradient(135deg, ${T.blue}cc, ${T.purple}cc)`,
                      border: 'none', borderRadius: 10, padding: '14px', color: '#fff', fontWeight: 800,
                      fontSize: 15, cursor: 'pointer', transition: 'transform .15s',
                    }}>
                      ▶ Iniciar Quiz Personalizado
                    </button>
                    <button onClick={fetchAndStartSimuladoRapido} style={{
                      background: `${T.green}18`, border: `1px solid ${T.green}50`, borderRadius: 10,
                      padding: '13px', color: T.green, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                      transition: 'transform .15s',
                    }}>
                      ⚡ Simulado Rápido — 10 Questões · 10 min
                    </button>
                  </div>
                </div>
              )}

              {/* ══ LOADING ═══════════════════════════════════════════════════════ */}
              {status === 'loading' && <SkeletonQuiz isDark={isDark} />}

              {/* ══ QUIZ ══════════════════════════════════════════════════════════ */}
              {status === 'quiz' && currentQuestion && (
                <div style={{ animation: 'fade-up .3s ease' }}>
                  {/* Progresso */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <small style={{ color: T.muted }}>Questão {totalAnswered + 1} de {totalQuestions}</small>
                    <small style={{ color: T.muted }}>{Math.round(progress)}%</small>
                  </div>
                  <CProgress value={progress} color="primary" className="mb-4" height={6} />

                  {currentQuestion.dica && !isAnswerConfirmed && (
                    <div className="mb-3">
                      <CButton color="warning" variant="outline" size="sm" onClick={() => setShowDica(d => !d)}>💡 {showDica ? 'Ocultar dica' : 'Ver dica'}</CButton>
                      {showDica && <CAlert color="warning" className="mt-2 mb-0 py-2 small"><strong>💡 Dica:</strong> {currentQuestion.dica}</CAlert>}
                    </div>
                  )}

                  <p style={{ fontSize: 16, color: T.text, fontWeight: 600, marginBottom: 20, lineHeight: 1.6 }}>
                    {currentQuestion.question}
                  </p>

                  <div className="d-grid gap-2 mb-4">
                    {currentQuestion.options.map((option, idx) => {
                      const val = LETTERS[idx]
                      const isSelected = selectedOption === val
                      const isCorrectAnswer = val === currentQuestion.answer
                      let color = 'secondary', variant = 'outline'
                      let bg = 'transparent'
                      if (isAnswerConfirmed) {
                        if (isCorrectAnswer) { color = 'success'; variant = undefined }
                        else if (isSelected) { color = 'danger'; variant = undefined }
                      } else if (isSelected) { color = 'primary'; variant = undefined }
                      return (
                        <CButton key={val} color={color} variant={variant}
                          disabled={isAnswerConfirmed}
                          onClick={() => !isAnswerConfirmed && setSelectedOption(val)}
                          className="text-start py-2"
                          style={{ fontWeight: isSelected || isAnswerConfirmed ? 700 : 400, transition: 'all .15s' }}
                        >
                          <strong>{val}.</strong> {option}
                        </CButton>
                      )
                    })}
                  </div>

                  {isAnswerConfirmed && (
                    <CAlert color={selectedOption === currentQuestion.answer ? 'success' : 'danger'}>
                      <CIcon icon={selectedOption === currentQuestion.answer ? cilCheckCircle : cilXCircle} className="me-2" />
                      {selectedOption === currentQuestion.answer ? 'Correto!' : 'Incorreto'} — Resposta correta: <strong>{currentQuestion.answer}</strong>
                      {currentQuestion.tentativas > 0 && (
                        <div className="mt-1 small">👥 {Math.round((currentQuestion.acertos / currentQuestion.tentativas) * 100)}% dos alunos acertaram.</div>
                      )}
                    </CAlert>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <CButton color="danger" variant="outline" size="sm" onClick={handleFinishEarly} disabled={questionsAndAnswers.length === 0}>⛔ Encerrar</CButton>
                      {!isAnswerConfirmed && queue.length > 1 && (
                        <CButton color="secondary" variant="outline" size="sm" onClick={handleSkip}>⏭ Pular</CButton>
                      )}
                    </div>
                    {!isAnswerConfirmed ? (
                      <button onClick={handleConfirmAnswer} disabled={!selectedOption} style={{
                        background: selectedOption ? T.green : T.border, border: 'none', borderRadius: 8, padding: '8px 20px',
                        color: selectedOption ? '#fff' : T.muted, fontWeight: 700, cursor: selectedOption ? 'pointer' : 'not-allowed',
                        transition: 'all .2s',
                      }}>
                        Confirmar resposta
                      </button>
                    ) : (
                      <button onClick={handleNextQuestion} style={{
                        background: T.blue, border: 'none', borderRadius: 8, padding: '8px 20px',
                        color: '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
                      }}>
                        {queue.length <= 1 ? 'Finalizar Quiz ✓' : 'Próxima →'}
                      </button>
                    )}
                  </div>

                  {/* Painel lateral */}
                  {isAnswerConfirmed && (
                    <CRow className="mt-4">
                      <CCol md={6}>
                        <div style={{ background: `${T.cyan}08`, border: `1px solid ${T.cyan}30`, borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ padding: '10px 14px', background: `${T.cyan}18`, borderBottom: `1px solid ${T.cyan}30`, fontWeight: 700, color: T.cyan, fontSize: 13 }}>
                            <CIcon icon={cilLightbulb} style={{ width: 14 }} /> Explicação do Professor
                          </div>
                          <div style={{ padding: 14, color: T.text, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {currentQuestion.explicacao || 'Nenhuma explicação adicional.'}
                          </div>
                          {currentQuestion.link_video && (
                            <div style={{ padding: '0 14px 14px' }}>
                              <div style={{ fontWeight: 700, color: T.red, fontSize: 12, marginBottom: 8 }}><CIcon icon={cilVideo} style={{ width: 13 }} /> Vídeo de Apoio</div>
                              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 8, overflow: 'hidden' }}>
                                <iframe src={obterLinkEmbed(currentQuestion.link_video)} title="Vídeo" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </CCol>
                      <CCol md={6}>
                        {currentQuestion.comentarios_publicos?.length > 0 && (
                          <div style={{ background: `${T.green}08`, border: `1px solid ${T.green}30`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                            <div style={{ padding: '10px 14px', background: `${T.green}18`, borderBottom: `1px solid ${T.green}30`, fontWeight: 700, color: T.green, fontSize: 13 }}>
                              💬 Comentários da Comunidade
                            </div>
                            <div style={{ padding: 14 }}>
                              {currentQuestion.comentarios_publicos.map((c, i) => (
                                <div key={i} style={{ marginBottom: i < currentQuestion.comentarios_publicos.length - 1 ? 12 : 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong style={{ color: T.green, fontSize: 12 }}>{c.nome_aluno}</strong>
                                    <small style={{ color: T.muted }}>{new Date(c.data_criacao).toLocaleDateString('pt-BR')}</small>
                                  </div>
                                  <p style={{ color: T.text, fontSize: 13, margin: '4px 0 0', fontStyle: 'italic' }}>"{c.texto}"</p>
                                  {c.resposta_professor && (
                                    <div style={{ marginTop: 8, marginLeft: 12, padding: '8px 12px', background: `${T.blue}12`, borderLeft: `3px solid ${T.blue}`, borderRadius: '0 6px 6px 0' }}>
                                      <small style={{ fontWeight: 700, color: T.blue }}>👨‍🏫 Professor:</small>{' '}
                                      <small style={{ color: T.muted }}>{c.resposta_professor}</small>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <small style={{ fontWeight: 700, color: T.muted }}>💬 Feedback</small>
                            <CButton color="warning" size="sm" variant={isConfusing ? undefined : 'outline'} onClick={() => setIsConfusing(!isConfusing)} disabled={commentStatus === 'sent'}>
                              {isConfusing ? '⚠️ Confusa' : 'Marcar confusa'}
                            </CButton>
                          </div>
                          <CFormTextarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Descreva sua dúvida..." maxLength={300} disabled={commentStatus === 'sent'} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                            <small style={{ color: T.muted }}>{commentText.length}/300</small>
                            {commentStatus === 'sent' ? (
                              <CButton color="success" size="sm" disabled>✅ Enviado</CButton>
                            ) : (
                              <CButton color="info" size="sm" onClick={handleSendComment} disabled={!commentText.trim() && !isConfusing}>Enviar</CButton>
                            )}
                          </div>
                        </div>
                      </CCol>
                    </CRow>
                  )}
                </div>
              )}

              {/* ══ FINISHED ════════════════════════════════════════════════════ */}
              {status === 'finished' && (
                <div style={{ animation: 'fade-up .35s ease' }}>
                  <CNav variant="tabs" className="mb-4">
                    <CNavItem><CNavLink active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>📊 Estatísticas</CNavLink></CNavItem>
                    <CNavItem><CNavLink active={activeTab === 'qna'} onClick={() => setActiveTab('qna')}>📋 Revisão</CNavLink></CNavItem>
                  </CNav>

                  {activeTab === 'stats' && (
                    <div style={{ textAlign: 'center' }}>
                      <CBadge color={gradeColor} className="fs-2 px-4 py-2 mb-2">{grade.grade}</CBadge>
                      {grade.remarks && <p style={{ color: T.muted, marginBottom: 20 }}>{grade.remarks}</p>}

                      <CRow className="g-3 mb-4">
                        <CCol xs={6} md={3}>
                          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 18 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: T.blue }}>{finalScore}%</div>
                            <small style={{ color: T.muted }}>Percentual</small>
                          </div>
                        </CCol>
                        <CCol xs={6} md={3}>
                          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 18 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: T.green }}>{score}</div>
                            <small style={{ color: T.muted }}>Acertos</small>
                          </div>
                        </CCol>
                        <CCol xs={6} md={3}>
                          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 18 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: T.red }}>{totalAnswered - score}</div>
                            <small style={{ color: T.muted }}>Erros</small>
                          </div>
                        </CCol>
                        <CCol xs={6} md={3}>
                          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 18 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: T.amber }}>{Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s</div>
                            <small style={{ color: T.muted }}>Tempo</small>
                          </div>
                        </CCol>
                      </CRow>

                      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <CButton color="primary" onClick={handleReplay}>🔄 Refazer</CButton>
                        {score < totalAnswered && (
                          <CButton color="danger" variant="outline" onClick={handleRetryErrors}>❌ Refazer erros ({totalAnswered - score})</CButton>
                        )}
                        <CButton color="success" variant="outline" onClick={handleShare}>📤 Compartilhar</CButton>
                        <CButton color="secondary" variant="outline" onClick={handleReset}>🏠 Voltar</CButton>
                      </div>
                    </div>
                  )}

                  {activeTab === 'qna' && <ReviewTable questionsAndAnswers={questionsAndAnswers} isDark={isDark} T={T} />}
                </div>
              )}
            </div>

            {/* Rodapé */}
            {status === 'finished' && (
              <div style={{ padding: '14px 24px', borderTop: `1px solid ${cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small style={{ color: saved ? T.green : T.muted }}>
                  {saved ? '✅ Sessão salva' : saving ? '⏳ Salvando...' : ''}
                </small>
                <CButton color="primary" size="sm" onClick={handleSaveSession} disabled={saving || saved}>
                  {saving ? 'Salvando...' : saved ? '✅ Salvo' : '💾 Salvar sessão'}
                </CButton>
              </div>
            )}
          </div>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default Quiz