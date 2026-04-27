import React, { useEffect, useState, useMemo, useRef } from 'react'
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
import { cilCheckCircle, cilXCircle, cilLightbulb, cilVideo } from '@coreui/icons'
import { API_URL } from '../../config'
import { calculateScore, calculateGrade, formatSeconds, shuffle } from '../../utils/quizUtils'

/* ─── Constantes ─────────────────────────────────────────────────────────── */

const SESSION_KEY = 'contabilidade_quiz_state'

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

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const obterLinkEmbed = (url) => {
  if (!url) return null
  let e = url
  if (url.includes('youtube.com/watch?v=')) e = url.replace('watch?v=', 'embed/').split('&')[0]
  else if (url.includes('youtu.be/')) e = url.replace('youtu.be/', 'www.youtube.com/embed/')
  else if (url.includes('vimeo.com/')) e = url.replace('vimeo.com/', 'player.vimeo.com/video/')
  return e
}

/* Feature 8 — Feedback sonoro via Web Audio API */
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
      osc.frequency.setValueAtTime(523, ctx.currentTime)       // C5
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12) // E5
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

/* ─── Sub-componentes ────────────────────────────────────────────────────── */

/** Tabela de revisão ao final */
const ReviewTable = ({ questionsAndAnswers, isDark }) => (
  <CTable striped hover responsive {...(isDark ? { color: 'dark' } : {})}>
    <CTableHead>
      <CTableRow>
        <CTableHeaderCell>#</CTableHeaderCell>
        <CTableHeaderCell>Pergunta</CTableHeaderCell>
        <CTableHeaderCell className="text-center">Sua resposta</CTableHeaderCell>
        <CTableHeaderCell className="text-center">Correta</CTableHeaderCell>
        <CTableHeaderCell className="text-center">Resultado</CTableHeaderCell>
      </CTableRow>
    </CTableHead>
    <CTableBody>
      {questionsAndAnswers.map((item, i) => (
        <CTableRow key={i} color={item.isCorrect ? 'success' : 'danger'}>
          <CTableDataCell>{i + 1}</CTableDataCell>
          <CTableDataCell>{item.question}</CTableDataCell>
          <CTableDataCell className="text-center fw-bold">{item.userAnswer}</CTableDataCell>
          <CTableDataCell className="text-center fw-bold">{item.correctAnswer}</CTableDataCell>
          <CTableDataCell className="text-center">{item.isCorrect ? '✅' : '❌'}</CTableDataCell>
        </CTableRow>
      ))}
    </CTableBody>
  </CTable>
)

/** Feature 3 — Desempenho por matéria */
const StatsByMateria = ({ questionsAndAnswers, questions, isDark }) => {
  const stats = useMemo(() => {
    const map = {}
    questionsAndAnswers.forEach(qa => {
      const q = questions.find(q => q.id === qa.id)
      const nome = q?.materia_nome || q?.materia || 'Geral'
      if (!map[nome]) map[nome] = { total: 0, acertos: 0 }
      map[nome].total++
      if (qa.isCorrect) map[nome].acertos++
    })
    return Object.entries(map)
      .map(([nome, d]) => ({ nome, ...d, pct: Math.round((d.acertos / d.total) * 100) }))
      .sort((a, b) => b.pct - a.pct)
  }, [questionsAndAnswers, questions])

  if (stats.length <= 1) return null // só exibe quando há mais de uma matéria

  return (
    <CCard className="mt-4 text-start">
      <CCardHeader><strong>📚 Desempenho por Matéria</strong></CCardHeader>
      <CCardBody className="p-0">
        <CTable small {...(isDark ? { color: 'dark' } : {})} className="mb-0">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Matéria</CTableHeaderCell>
              <CTableHeaderCell className="text-center">Acertos</CTableHeaderCell>
              <CTableHeaderCell className="text-center">Total</CTableHeaderCell>
              <CTableHeaderCell className="text-center">%</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {stats.map((s, i) => (
              <CTableRow key={i}>
                <CTableDataCell>{s.nome}</CTableDataCell>
                <CTableDataCell className="text-center text-success fw-bold">{s.acertos}</CTableDataCell>
                <CTableDataCell className="text-center">{s.total}</CTableDataCell>
                <CTableDataCell className="text-center">
                  <CBadge color={s.pct >= 70 ? 'success' : s.pct >= 50 ? 'warning' : 'danger'}>
                    {s.pct}%
                  </CBadge>
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  )
}

/**
 * Feature 2 — Multi-select de matérias
 * Dropdown customizado com checkboxes. Fecha ao clicar fora.
 */
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
              <small
                className="text-primary"
                style={{ cursor: 'pointer' }}
                onClick={() => onChange([])}
              >
                Limpar
              </small>
            )}
          </div>
          {materias.map(m => (
            <label
              key={m.id}
              className="d-flex align-items-center gap-2 px-3 py-2"
              style={{ cursor: 'pointer', margin: 0 }}
            >
              <input
                type="checkbox"
                checked={selected.includes(String(m.id))}
                onChange={() => toggle(m.id)}
              />
              <span style={{ fontSize: 14 }}>{m.nome}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Componente principal ───────────────────────────────────────────────── */

const Quiz = () => {
  /* ── State principal ── */
  const [status, setStatus] = useState('ready')
  const [questions, setQuestions] = useState([])

  /**
   * Feature 5 — Pular questão
   * `queue` é um array de índices para `questions[]`.
   * queue[0] = questão atual. Pular move queue[0] para o fim.
   * Confirmar resposta remove queue[0]. queue vazio = fim do quiz.
   */
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
  const [materiasSelected, setMateriasSelected] = useState([])   // Feature 2
  const [quantidade, setQuantidade] = useState(0)
  const [isDark, setIsDark] = useState(false)

  const [showDica, setShowDica] = useState(false)                           // Feature 4
  const [soundEnabled, setSoundEnabled] = useState(                                 // Feature 8
    () => localStorage.getItem('quiz_sound') === 'true'
  )
  const [focusMode, setFocusMode] = useState(false)                           // Feature 7
  const [shareMsg, setShareMsg] = useState('')                              // Feature 9
  const [savedSnapshot, setSavedSnapshot] = useState(null)                           // Feature 6

  const nomeAluno = sessionStorage.getItem('nome') || 'Aluno'

  /* ── Derivados ── */
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

  /* ── Detecção de tema ── */
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute('data-coreui-theme') === 'dark')
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-coreui-theme'] })
    return () => obs.disconnect()
  }, [])

  /* ── Feature 6: verificar estado salvo ao montar ── */
  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      try { setSavedSnapshot(JSON.parse(raw)) }
      catch { sessionStorage.removeItem(SESSION_KEY) }
    }
  }, [])

  /* ── Feature 6: salvar estado durante o quiz ── */
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

  /* ── Feature 6: limpar ao terminar ── */
  useEffect(() => {
    if (status === 'finished') sessionStorage.removeItem(SESSION_KEY)
  }, [status])

  /* ── Feature 7: modo foco ── */
  useEffect(() => {
    let el = document.getElementById('quiz-focus-style')
    if (!el) {
      el = document.createElement('style')
      el.id = 'quiz-focus-style'
      document.head.appendChild(el)
    }
    el.textContent = focusMode
      ? '.sidebar, .sidebar-backdrop { display: none !important; } .wrapper { --cui-sidebar-occupy-start: 0 !important; }'
      : ''
    return () => { el.textContent = '' }
  }, [focusMode])

  /* ── Feature 8: persistir preferência de som ── */
  useEffect(() => { localStorage.setItem('quiz_sound', String(soundEnabled)) }, [soundEnabled])

  /* ── Fetch matérias ── */
  useEffect(() => {
    fetch(`${API_URL}/api/admin/materias`)
      .then(r => r.json())
      .then(d => setMaterias(Array.isArray(d) ? d : []))
      .catch(() => { })
  }, [])

  /* ── Timer ── */
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

  /* ─── Funções de controle ─────────────────────────────────────────────── */

  /** Inicia o quiz com um tempo específico (evita race condition de setState) */
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

  /* Feature 6: retomar estado salvo */
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

      /* Feature 2: filtrar por matérias selecionadas */
      if (materiasSelected.length > 0) {
        data = data.filter(q => materiasSelected.includes(String(q.materia_id)))
        if (data.length === 0)
          throw new Error('Nenhuma questão para as matérias selecionadas.')
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
    const q = questions[currentIndex]
    const isCorrect = selectedOption === q.answer
    setQuestionsAndAnswers(prev => [...prev, {
      id: q.id, question: q.question,
      userAnswer: selectedOption, correctAnswer: q.answer, isCorrect,
      materia_nome: q.materia_nome || q.materia,
    }])
    if (isCorrect) setScore(p => p + 1)
    setError(''); setIsAnswerConfirmed(true)
    playSound(isCorrect, soundEnabled)                                  // Feature 8
    setSkippedSet(prev => { const n = new Set(prev); n.delete(currentIndex); return n })
  }

  const handleNextQuestion = () => {
    setIsAnswerConfirmed(false); setIsConfusing(false)
    setCommentText(''); setCommentStatus('idle'); setShowDica(false)
    const newQueue = queue.slice(1)
    if (newQueue.length === 0) {
      setElapsedSeconds(Math.round((Date.now() - startTime) / 1000))
      setStatus('finished'); return
    }
    setQueue(newQueue); setSelectedOption('')
  }

  /* Feature 5: Pular questão — move para o fim da fila */
  const handleSkip = () => {
    if (queue.length <= 1) return
    setSkippedSet(prev => new Set([...prev, currentIndex]))
    setQueue(q => [...q.slice(1), q[0]])
    setSelectedOption(''); setIsAnswerConfirmed(false); setShowDica(false)
    setIsConfusing(false); setCommentText(''); setCommentStatus('idle')
  }

  const handleSendComment = async () => {
    if (!commentText.trim() && !isConfusing) return
    setCommentStatus('sending')
    try {
      const q = questions[currentIndex]
      await fetch(`${API_URL}/api/feedbacks_questoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questao_id: q.id, nome_aluno: nomeAluno, texto: commentText, marcada_confusa: isConfusing }),
      })
      setCommentStatus('sent')
    } catch {
      setError('Falha ao enviar comentário.'); setCommentStatus('idle')
    }
  }

  const handleFinishEarly = () => {
    if (!window.confirm('Encerrar o simulado?')) return
    sessionStorage.removeItem(SESSION_KEY)
    setElapsedSeconds(Math.round((Date.now() - startTime) / 1000))
    setFeedback(`Simulado encerrado. ${questionsAndAnswers.length} de ${questions.length} questões respondidas.`)
    setStatus('finished')
  }

  /* Feature 1: Refazer apenas os erros */
  const handleRetryErrors = () => {
    const wrongIds = new Set(questionsAndAnswers.filter(qa => !qa.isCorrect).map(qa => qa.id))
    const wrongQuestions = questions.filter(q => wrongIds.has(q.id))
    if (wrongQuestions.length === 0) { alert('Parabéns! Você não errou nenhuma questão. 🎉'); return }
    startQuiz(wrongQuestions)
  }

  const handleReplay = () => startQuiz(shuffle(questions))

  const handleReset = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setFocusMode(false)
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
    } catch {
      setError('Não foi possível salvar a sessão.')
    } finally { setSaving(false) }
  }

  /* Feature 9: Compartilhar resultado */
  const handleShare = async () => {
    const m = Math.floor(elapsedSeconds / 60)
    const s = elapsedSeconds % 60
    const text = `🎓 Fiz o Quiz de Contabilidade Fácil!\n✅ ${score} acertos de ${totalAnswered} (${finalScore}%)\n⏱ Tempo: ${m}m ${s}s\n📘 Estude também em Contabilidade Fácil!`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Quiz de Contabilidade', text })
        setShareMsg('✅ Compartilhado!')
      } else {
        await navigator.clipboard.writeText(text)
        setShareMsg('✅ Copiado para a área de transferência!')
      }
    } catch { }
    setTimeout(() => setShareMsg(''), 3000)
  }

  /* ─── Render ─────────────────────────────────────────────────────────── */

  return (
    <CContainer className="py-4">
      <CRow className="justify-content-center">
        <CCol xs={12} xl={10}>
          <CCard className="shadow-sm">

            {/* ── Cabeçalho ── */}
            <CCardHeader className={`d-flex justify-content-between align-items-center flex-wrap gap-2 ${isDark ? 'text-light' : ''}`}>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h4 className="mb-0">📘 Quiz de Contabilidade</h4>
                {/* Feature 7: Modo foco */}
                {status === 'quiz' && (
                  <CButton
                    color={focusMode ? 'warning' : 'secondary'}
                    variant="outline" size="sm"
                    onClick={() => setFocusMode(f => !f)}
                    title={focusMode ? 'Sair do modo foco' : 'Ativar modo foco (oculta sidebar)'}
                  >
                    {focusMode ? '⊠ Sair do foco' : '⛶ Modo foco'}
                  </CButton>
                )}
              </div>
              <div className="d-flex align-items-center gap-2">
                {/* Feature 8: Toggle som */}
                <CButton
                  color="secondary" variant="outline" size="sm"
                  onClick={() => setSoundEnabled(s => !s)}
                  title={soundEnabled ? 'Desativar som' : 'Ativar som'}
                >
                  {soundEnabled ? '🔊 Som' : '🔇 Mudo'}
                </CButton>
                {/* Timer */}
                {status === 'quiz' && (
                  <CBadge color={timerCritical ? 'danger' : 'info'} className="fs-6">
                    ⏱ {formatSeconds(remainingSeconds)}
                  </CBadge>
                )}
              </div>
            </CCardHeader>

            <CCardBody>
              {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}
              {feedback && <CAlert color="info">{feedback}</CAlert>}

              {/* ══ READY ══════════════════════════════════════════════════════════ */}
              {status === 'ready' && (
                <>
                  {/* Feature 6: Prompt de retomada */}
                  {savedSnapshot && (
                    <CAlert color="warning" className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                      <span>📌 Você tem um quiz em andamento ({savedSnapshot.questionsAndAnswers?.length ?? 0} questões respondidas). Deseja continuar?</span>
                      <div className="d-flex gap-2 flex-shrink-0">
                        <CButton color="warning" size="sm" onClick={() => resumeSnapshot(savedSnapshot)}>Continuar</CButton>
                        <CButton color="secondary" size="sm" variant="outline" onClick={() => { setSavedSnapshot(null); sessionStorage.removeItem(SESSION_KEY) }}>Descartar</CButton>
                      </div>
                    </CAlert>
                  )}

                  <h5 className="mb-4 text-center">🎯 Configurar Quiz</h5>
                  <CRow className="g-3 mb-4">
                    {/* Feature 2: Multi-select matérias */}
                    <CCol md={4}>
                      <label className="form-label">Matéria(s)</label>
                      <MateriaMultiSelect
                        materias={materias}
                        selected={materiasSelected}
                        onChange={setMateriasSelected}
                      />
                    </CCol>
                    <CCol md={4}>
                      <label className="form-label">Nº de Questões</label>
                      <CFormSelect value={quantidade} onChange={e => setQuantidade(Number(e.target.value))}>
                        {QTD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </CFormSelect>
                    </CCol>
                    <CCol md={4}>
                      <label className="form-label">Tempo Limite</label>
                      <CFormSelect value={tempoLimite} onChange={e => setTempoLimite(Number(e.target.value))}>
                        {TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </CFormSelect>
                    </CCol>
                  </CRow>
                  <div className="d-grid gap-2">
                    <CButton color="primary" size="lg" onClick={fetchAndStart}>▶ Iniciar Quiz Personalizado</CButton>
                    <CButton color="success" size="lg" variant="outline" onClick={fetchAndStartSimuladoRapido}>⚡ Simulado Rápido (10 questões, 10 min)</CButton>
                  </div>
                </>
              )}

              {/* ══ LOADING ═══════════════════════════════════════════════════════ */}
              {status === 'loading' && (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                  <p className="mt-3 text-body-secondary">Carregando questões...</p>
                </div>
              )}

              {/* ══ QUIZ ══════════════════════════════════════════════════════════ */}
              {status === 'quiz' && currentQuestion && (
                <>
                  {/* Progresso */}
                  <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
                    <span className="small text-body-secondary">
                      Respondidas: <strong>{totalAnswered}</strong> de {totalQuestions}
                    </span>
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                      {/* Feature 5: indicador de puladas */}
                      {pendingSkipped > 0 && (
                        <CBadge color="warning" title="Questões puladas aguardando resposta">
                          ⏭ {pendingSkipped} pulada{pendingSkipped > 1 ? 's' : ''}
                        </CBadge>
                      )}
                      {isRevisiting && (
                        <CBadge color="info">🔄 Revisitando questão pulada</CBadge>
                      )}
                      <small className="text-body-secondary">{Math.round(progress)}%</small>
                    </div>
                  </div>
                  <CProgress value={progress} className="mb-4" color="primary" />

                  {/* Feature 4: Dica (se a questão tiver o campo `dica`) */}
                  {currentQuestion.dica && !isAnswerConfirmed && (
                    <div className="mb-3">
                      <CButton
                        color="warning" variant="outline" size="sm"
                        onClick={() => setShowDica(d => !d)}
                      >
                        💡 {showDica ? 'Ocultar dica' : 'Ver dica'}
                      </CButton>
                      {showDica && (
                        <CAlert color="warning" className="mt-2 mb-0 py-2 small">
                          <strong>💡 Dica:</strong> {currentQuestion.dica}
                        </CAlert>
                      )}
                    </div>
                  )}

                  <p className="fs-5 mb-4">{currentQuestion.question}</p>

                  {/* Alternativas */}
                  <div className="d-grid gap-2 mb-4">
                    {currentQuestion.options.map((option, idx) => {
                      const val = LETTERS[idx]
                      const isSelected = selectedOption === val
                      const isCorrectAnswer = val === currentQuestion.answer
                      let color = 'secondary', variant = 'outline'
                      if (isAnswerConfirmed) {
                        if (isCorrectAnswer) { color = 'success'; variant = undefined }
                        else if (isSelected) { color = 'danger'; variant = undefined }
                      } else if (isSelected) { color = 'primary'; variant = undefined }
                      return (
                        <CButton key={val} color={color} variant={variant}
                          disabled={isAnswerConfirmed}
                          onClick={() => !isAnswerConfirmed && setSelectedOption(val)}
                          className="text-start py-2"
                        >
                          <strong>{val}.</strong> {option}
                        </CButton>
                      )
                    })}
                  </div>

                  {/* Feedback de resposta */}
                  {isAnswerConfirmed && (
                    <CAlert color={selectedOption === currentQuestion.answer ? 'success' : 'danger'}>
                      <CIcon icon={selectedOption === currentQuestion.answer ? cilCheckCircle : cilXCircle} className="me-2" />
                      {selectedOption === currentQuestion.answer ? 'Correto!' : 'Incorreto'} — Resposta correta: <strong>{currentQuestion.answer}</strong>
                      {currentQuestion.tentativas > 0 && (
                        <div className="mt-1 small">
                          👥 {Math.round((currentQuestion.acertos / currentQuestion.tentativas) * 100)}% dos alunos acertaram.
                        </div>
                      )}
                    </CAlert>
                  )}

                  {/* Ações */}
                  <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                    <div className="d-flex gap-2 flex-wrap">
                      <CButton color="danger" variant="outline" size="sm"
                        onClick={handleFinishEarly}
                        disabled={questionsAndAnswers.length === 0}
                      >
                        ⛔ Encerrar
                      </CButton>
                      {/* Feature 5: Pular questão */}
                      {!isAnswerConfirmed && queue.length > 1 && (
                        <CButton color="secondary" variant="outline" size="sm" onClick={handleSkip}>
                          ⏭ Pular
                        </CButton>
                      )}
                    </div>

                    {!isAnswerConfirmed ? (
                      <CButton color="success" onClick={handleConfirmAnswer} disabled={!selectedOption}>
                        Confirmar resposta
                      </CButton>
                    ) : (
                      <CButton color="primary" onClick={handleNextQuestion}>
                        {queue.length <= 1 ? 'Finalizar Quiz ✓' : 'Próxima →'}
                      </CButton>
                    )}
                  </div>

                  {/* Painel lateral: explicação + comentários + feedback */}
                  {isAnswerConfirmed && (
                    <CRow className="mt-4">
                      <CCol md={6}>
                        <CCard>
                          <CCardHeader className="bg-info text-white">
                            <CIcon icon={cilLightbulb} className="me-1" /> Explicação do Professor
                          </CCardHeader>
                          <CCardBody>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{currentQuestion.explicacao || 'Nenhuma explicação adicional.'}</p>
                            {currentQuestion.link_video && (
                              <div className="ratio ratio-16x9 mt-2">
                                <iframe src={obterLinkEmbed(currentQuestion.link_video)} title="Vídeo" allowFullScreen />
                              </div>
                            )}
                          </CCardBody>
                        </CCard>
                      </CCol>
                      <CCol md={6}>
                        {currentQuestion.comentarios_publicos?.length > 0 && (
                          <CCard className="mb-3">
                            <CCardHeader className="bg-success text-white">💬 Comentários da Comunidade</CCardHeader>
                            <CCardBody>
                              {currentQuestion.comentarios_publicos.map((c, i) => (
                                <div key={i} className="mb-2">
                                  <strong className="small">{c.nome_aluno}</strong>{' '}
                                  <small className="text-body-secondary">{new Date(c.data_criacao).toLocaleDateString('pt-BR')}</small>
                                  <p className="mb-0 fst-italic small">"{c.texto}"</p>
                                  {c.resposta_professor && (
                                    <div className="ms-3 p-2 border-start border-primary mt-1">
                                      <small className="fw-bold text-primary">👨‍🏫 Professor:</small>{' '}
                                      <small>{c.resposta_professor}</small>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </CCardBody>
                          </CCard>
                        )}
                        <CCard>
                          <CCardBody>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="small fw-bold">💬 Feedback</span>
                              <CButton
                                color="warning" size="sm"
                                variant={isConfusing ? undefined : 'outline'}
                                onClick={() => setIsConfusing(!isConfusing)}
                                disabled={commentStatus === 'sent'}
                              >
                                {isConfusing ? '⚠️ Confusa' : 'Marcar confusa'}
                              </CButton>
                            </div>
                            <CFormTextarea
                              placeholder="Descreva sua dúvida..."
                              value={commentText}
                              onChange={e => setCommentText(e.target.value)}
                              maxLength={300}
                              disabled={commentStatus === 'sent'}
                            />
                            <div className="d-flex justify-content-between align-items-center mt-2">
                              <small className="text-body-secondary">{commentText.length}/300</small>
                              {commentStatus === 'sent' ? (
                                <CButton color="success" size="sm" disabled>✅ Enviado</CButton>
                              ) : (
                                <CButton color="info" size="sm"
                                  onClick={handleSendComment}
                                  disabled={!commentText.trim() && !isConfusing}
                                >
                                  Enviar
                                </CButton>
                              )}
                            </div>
                          </CCardBody>
                        </CCard>
                      </CCol>
                    </CRow>
                  )}
                </>
              )}

              {/* ══ FINISHED ══════════════════════════════════════════════════════ */}
              {status === 'finished' && (
                <>
                  <CNav variant="tabs" className="mb-4">
                    <CNavItem>
                      <CNavLink active={activeTab === 'stats'} style={{ cursor: 'pointer' }} onClick={() => setActiveTab('stats')}>📊 Estatísticas</CNavLink>
                    </CNavItem>
                    <CNavItem>
                      <CNavLink active={activeTab === 'qna'} style={{ cursor: 'pointer' }} onClick={() => setActiveTab('qna')}>📋 Revisão</CNavLink>
                    </CNavItem>
                  </CNav>

                  {activeTab === 'stats' && (
                    <div className="text-center">
                      <CBadge color={gradeColor} className="fs-2 px-4 py-2 mb-2">{grade.grade}</CBadge>
                      {grade.remarks && <p className="text-body-secondary mb-4">{grade.remarks}</p>}

                      <CRow className="g-3 mb-4">
                        <CCol xs={6} md={3}>
                          <CCard className="text-center border-0">
                            <CCardBody>
                              <div className="fs-3 text-primary fw-bold">{finalScore}%</div>
                              <small className="text-body-secondary">Percentual</small>
                            </CCardBody>
                          </CCard>
                        </CCol>
                        <CCol xs={6} md={3}>
                          <CCard className="text-center border-0">
                            <CCardBody>
                              <div className="fs-3 text-success fw-bold">{score}</div>
                              <small className="text-body-secondary">Acertos</small>
                            </CCardBody>
                          </CCard>
                        </CCol>
                        <CCol xs={6} md={3}>
                          <CCard className="text-center border-0">
                            <CCardBody>
                              <div className="fs-3 text-danger fw-bold">{totalAnswered - score}</div>
                              <small className="text-body-secondary">Erros</small>
                            </CCardBody>
                          </CCard>
                        </CCol>
                        <CCol xs={6} md={3}>
                          <CCard className="text-center border-0">
                            <CCardBody>
                              <div className="fs-3 fw-bold">
                                {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
                              </div>
                              <small className="text-body-secondary">Tempo</small>
                            </CCardBody>
                          </CCard>
                        </CCol>
                      </CRow>

                      {/* Feature 9: Compartilhar */}
                      {shareMsg && <CAlert color="success" className="py-2 mb-3">{shareMsg}</CAlert>}

                      <div className="d-flex justify-content-center gap-2 flex-wrap">
                        <CButton color="primary" onClick={handleReplay}>🔄 Refazer</CButton>
                        {/* Feature 1: Refazer erros */}
                        {score < totalAnswered && (
                          <CButton color="danger" variant="outline" onClick={handleRetryErrors}>
                            ❌ Refazer erros ({totalAnswered - score})
                          </CButton>
                        )}
                        {/* Feature 9: Compartilhar */}
                        <CButton color="success" variant="outline" onClick={handleShare}>
                          📤 Compartilhar
                        </CButton>
                        <CButton color="secondary" variant="outline" onClick={handleReset}>🏠 Voltar</CButton>
                      </div>

                      {/* Feature 3: Desempenho por matéria */}
                      <StatsByMateria
                        questionsAndAnswers={questionsAndAnswers}
                        questions={questions}
                        isDark={isDark}
                      />
                    </div>
                  )}

                  {activeTab === 'qna' && (
                    <ReviewTable questionsAndAnswers={questionsAndAnswers} isDark={isDark} />
                  )}
                </>
              )}
            </CCardBody>

            {status === 'finished' && (
              <CCardFooter className="d-flex justify-content-between align-items-center">
                <small className={saved ? 'text-success' : 'text-body-secondary'}>
                  {saved ? '✅ Sessão salva no dashboard' : saving ? '⏳ Salvando...' : ''}
                </small>
                <CButton color="primary" size="sm" onClick={handleSaveSession} disabled={saving || saved}>
                  {saving ? '⏳ Salvando...' : saved ? '✅ Sessão salva' : '💾 Salvar sessão'}
                </CButton>
              </CCardFooter>
            )}

          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default Quiz