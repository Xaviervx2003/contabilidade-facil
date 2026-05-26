import { useEffect, useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../../services/api'
import { API_URL } from '../../../config'
import { calculateGrade, shuffle } from '../../../utils/quizUtils'
import { useTheme } from '../../../context/themeContext'
import useAuthSession from '../../../hooks/useAuthSession'
import { toast } from 'react-hot-toast'
import { confirmDialog } from '../../../utils/confirm'

const SESSION_KEY = 'contabilidade_quiz_state'

const calculateCorrectAnswersPercentage = (totalQuestionsCount, correctAnswersCount) => {
  if (!totalQuestionsCount || totalQuestionsCount === 0) return 0
  return Number(((correctAnswersCount * 100) / totalQuestionsCount).toFixed(2))
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

export const useQuizLogic = () => {
  const [status, setStatus] = useState('ready')
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false)
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
  const [materiasSelected, setMateriasSelected] = useState([])
  const [quantidade, setQuantidade] = useState(0)
  const [isDark, setIsDark] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('quiz_sound') === 'true',
  )
  const [savedSnapshot, setSavedSnapshot] = useState(null)
  const [showDica, setShowDica] = useState(false)
  const [modoEstudo, setModoEstudo] = useState('todas')
  const [bancaSelecionada, setBancaSelecionada] = useState('')
  const [orgaoSelecionado, setOrgaoSelecionado] = useState('')
  const [cargoSelecionado, setCargoSelecionado] = useState('')
  const [anoSelecionado, setAnoSelecionado] = useState('')
  const [favoritos, setFavoritos] = useState([])
  const [disciplinaPai, setDisciplinaPai] = useState(null) // ID da disciplina raiz selecionada
  const queryClient = useQueryClient()

  const { nome, isLogado, matricula } = useAuthSession()
  const nomeAluno = nome || 'Aluno'

  // Theme detection
  const { isDark: themeIsDark } = useTheme()
  useEffect(() => {
    setIsDark(themeIsDark)
  }, [themeIsDark])

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => { })
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => { })
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Sound persistence
  useEffect(() => {
    localStorage.setItem('quiz_sound', String(soundEnabled))
  }, [soundEnabled])

  // Load favorites using React Query
  const { data: favoritosData = [] } = useQuery({
    queryKey: ['favoritos', matricula],
    queryFn: async () => {
      if (!matricula) return []
      const res = await api.get(`/api/favoritos/${matricula}`)
      return res.data
    },
    enabled: !!matricula,
    staleTime: 1000 * 60 * 5,
  })

  // Sincroniza o state local com os dados da query (para manter atualizações otimistas)
  useEffect(() => {
    if (Array.isArray(favoritosData)) {
      setFavoritos(favoritosData.map((item) => item.questao_id))
    }
  }, [favoritosData])

  const toggleFavoritoMutation = useMutation({
    mutationFn: async ({ questaoId, isFavorito }) => {
      if (isFavorito) {
        await api.delete(`/api/favoritos/remover/${questaoId}?matricula=${matricula}`)
      } else {
        await api.post(`/api/favoritos/adicionar`, { matricula, questao_id: questaoId })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoritos', matricula] })
    }
  })

  const alternarFavorito = (questaoId) => {
    if (!matricula) return
    const ehFavorito = favoritos.includes(questaoId)
    // Atualização Otimista local
    if (ehFavorito) {
      setFavoritos((prev) => prev.filter((id) => id !== questaoId))
    } else {
      setFavoritos((prev) => [...prev, questaoId])
    }
    toggleFavoritoMutation.mutate({ questaoId, isFavorito: ehFavorito })
  }

  // Fetch materias and unique filters using React Query
  const { data: materiasData = [], isLoading: loadingMaterias } = useQuery({
    queryKey: ['admin-materias'],
    queryFn: async () => {
      const res = await api.get('/api/admin/materias')
      return res.data
    },
    staleTime: 1000 * 60 * 10,
  })
  const materias = Array.isArray(materiasData) ? materiasData : []

  const { data: filtrosDisponiveis = { bancas: [], orgaos: [], cargos: [], anos: [] } } = useQuery({
    queryKey: ['valores-unicos'],
    queryFn: async () => {
      const res = await api.get('/api/questoes/valores-unicos')
      return res.data
    },
    staleTime: 1000 * 60 * 10,
  })

  // Snapshot restore
  useEffect(() => {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      try {
        setSavedSnapshot(JSON.parse(raw))
      } catch {
        sessionStorage.removeItem(SESSION_KEY)
      }
    } else {
      // Se não houver snapshot, verificamos se veio por Estudo Dirigido (IDs específicos) ou Trilha (Materia ID)
      const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
      const materiaId = params.get('materia_id')
      if (materiaId) {
        setMateriasSelected([materiaId])
      }
      if (params.get('ids') || params.get('materia_id')) {
        fetchAndStart()
      }
    }
  }, [])

  // Save snapshot
  useEffect(() => {
    if (status !== 'quiz') return
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          questions,
          queue,
          score,
          questionsAndAnswers,
          tempoLimite,
          remainingSeconds,
          startTime,
          skippedSet: [...skippedSet],
        }),
      )
    } catch { }
  }, [status, queue, score, questionsAndAnswers, remainingSeconds])

  useEffect(() => {
    if (status === 'finished') sessionStorage.removeItem(SESSION_KEY)
  }, [status])

  // Timer
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
  }, [remainingSeconds, status])

  useEffect(() => {
    if (status === 'finished' && !saved && !saving) {
      handleSaveSession()
    }
  }, [status, saved, saving, handleSaveSession])

  // Start quiz functions
  const startQuizWithTime = (questionsData, timeLimit) => {
    const indices = [...Array(questionsData.length).keys()]
    setError('')
    setFeedback('')
    setQuestions(questionsData)
    setQueue(indices)
    setSkippedSet(new Set())
    setSelectedOption('')
    setScore(0)
    setQuestionsAndAnswers([])
    setStartTime(Date.now())
    setRemainingSeconds(timeLimit)
    setTempoLimite(timeLimit)
    setSaved(false)
    setActiveTab('stats')
    setStatus('quiz')
    setIsAnswerConfirmed(false)
    setIsConfusing(false)
    setCommentText('')
    setCommentStatus('idle')
    setShowDica(false)
    setSavedSnapshot(null)
  }

  const startQuiz = (questionsData) => startQuizWithTime(questionsData, tempoLimite)

  const resumeSnapshot = (snapshot) => {
    setQuestions(snapshot.questions)
    setQueue(snapshot.queue)
    setScore(snapshot.score)
    setQuestionsAndAnswers(snapshot.questionsAndAnswers)
    setTempoLimite(snapshot.tempoLimite)
    setRemainingSeconds(snapshot.remainingSeconds)
    setStartTime(snapshot.startTime)
    setSkippedSet(new Set(snapshot.skippedSet || []))
    setSelectedOption('')
    setIsAnswerConfirmed(false)
    setShowDica(false)
    setIsConfusing(false)
    setCommentText('')
    setCommentStatus('idle')
    setSaved(false)
    setActiveTab('stats')
    setFeedback('')
    setError('')
    setSavedSnapshot(null)
    setStatus('quiz')
  }

  const fetchQuestoesMutation = useMutation({
    mutationFn: async (url) => {
      const path = url.replace(API_URL, '')
      const res = await api.get(path)
      let data = res.data.sucesso !== undefined ? res.data.dados : res.data
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(res.data.mensagem || 'Nenhuma questão encontrada para este filtro.')
      }
      return data
    },
    onMutate: () => {
      setError('')
      setFeedback('')
      setStatus('loading')
    },
    onSuccess: (data) => {
      let pool = shuffle(data)
      if (quantidade > 0 && quantidade < pool.length) pool = pool.slice(0, quantidade)
      startQuiz(pool)
    },
    onError: (err) => {
      setError(err.message || 'Erro ao buscar questões.')
      setStatus('ready')
    }
  })

  const fetchAndStart = async () => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
    const explicitIds = params.get('ids')

    if (explicitIds) {
      params.set('ids', explicitIds)
    } else {
      if (materiasSelected.length > 0) {
        materiasSelected.forEach((id) => params.append('materia_id', id))
      } else if (disciplinaPai) {
        params.append('materia_id', disciplinaPai)
      }
      if (matricula) {
        params.set('matricula', matricula)
        params.set('modo_estudo', modoEstudo)
      }
      if (bancaSelecionada) params.set('banca', bancaSelecionada)
      if (orgaoSelecionado) params.set('orgao', orgaoSelecionado)
      if (cargoSelecionado) params.set('cargo', cargoSelecionado)
      if (anoSelecionado) params.set('ano', anoSelecionado)
    }
    const maxNeeded = quantidade > 0 ? Math.min(quantidade * 3, 500) : 500
    params.set('limit', String(maxNeeded))

    const url = `${API_URL}/api/questoes${params.toString() ? '?' + params.toString() : ''}`
    fetchQuestoesMutation.mutate(url)
  }

  const simuladoMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get('/api/questoes?limit=30')
      let data = res.data.sucesso !== undefined ? res.data.dados : res.data
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(res.data.mensagem || 'Nenhuma questão encontrada.')
      }
      return data
    },
    onMutate: () => {
      setError('')
      setFeedback('')
      setStatus('loading')
    },
    onSuccess: (data) => {
      startQuizWithTime(shuffle(data).slice(0, 10), 600)
    },
    onError: (err) => {
      setError(err.message || 'Erro ao buscar questões.')
      setStatus('ready')
    }
  })

  const fetchAndStartSimuladoRapido = async () => {
    simuladoMutation.mutate()
  }

  const handleConfirmAnswer = () => {
    if (!selectedOption) {
      setError('Selecione uma alternativa.')
      return
    }
    const currentIdx = queue[0]
    if (currentIdx === undefined) return  // guard: fila vazia
    const q = questions[currentIdx]
    if (!q) return  // guard: questão não existe
    const isCorrect = selectedOption === q.answer
    setQuestionsAndAnswers((prev) => [
      ...prev,
      {
        id: q.id,
        question: q.question,
        userAnswer: selectedOption,
        correctAnswer: q.answer,
        isCorrect,
        materia_nome: q.materia_nome || q.materia,
      },
    ])
    if (isCorrect) setScore((p) => p + 1)
    setError('')
    setIsAnswerConfirmed(true)
    playSound(isCorrect, soundEnabled)
    setSkippedSet((prev) => {
      const n = new Set(prev)
      n.delete(currentIdx)
      return n
    })
  }

  const handleNextQuestion = () => {
    setIsAnswerConfirmed(false)
    setIsConfusing(false)
    setCommentText('')
    setCommentStatus('idle')
    setShowDica(false)
    const newQueue = queue.slice(1)
    if (newQueue.length === 0) {
      setElapsedSeconds(Math.round((Date.now() - startTime) / 1000))
      setStatus('finished')
      return
    }
    setQueue(newQueue)
    setSelectedOption('')
  }

  const handleSkip = () => {
    if (queue.length <= 1) return
    setSkippedSet((prev) => new Set([...prev, queue[0]]))
    setQueue((q) => [...q.slice(1), q[0]])
    setSelectedOption('')
    setIsAnswerConfirmed(false)
    setShowDica(false)
    setIsConfusing(false)
    setCommentText('')
    setCommentStatus('idle')
  }

  const feedbackMutation = useMutation({
    mutationFn: async ({ qId, texto, confusa }) => {
      return await api.post('/api/feedbacks_questoes', {
        questao_id: qId,
        nome_aluno: nomeAluno,
        texto,
        marcada_confusa: confusa,
      })
    },
    onMutate: () => setCommentStatus('sending'),
    onSuccess: () => setCommentStatus('sent'),
    onError: () => {
      setError('Falha ao enviar comentário.')
      setCommentStatus('idle')
    }
  })

  const handleSendComment = async () => {
    if (!commentText.trim() && !isConfusing) return
    const q = questions[queue[0]]
    feedbackMutation.mutate({ qId: q.id, texto: commentText, confusa: isConfusing })
  }

  const handleFinishEarly = async () => {
    if (isConfirmingFinish) return
    setIsConfirmingFinish(true)
    try {
      const confirmed = await confirmDialog('Encerrar o simulado?')
      if (!confirmed) return

      sessionStorage.removeItem(SESSION_KEY)
      setElapsedSeconds(Math.round((Date.now() - startTime) / 1000))
      setFeedback(
        `Simulado encerrado. ${(questionsAndAnswers || []).length} de ${questions.length} questões respondidas.`,
      )
      setStatus('finished')
    } finally {
      setIsConfirmingFinish(false)
    }
  }

  const handleRetryErrors = () => {
    const wrongIds = new Set(questionsAndAnswers.filter((qa) => !qa.isCorrect).map((qa) => qa.id))
    const wrongQuestions = questions.filter((q) => wrongIds.has(q.id))
    if (wrongQuestions.length === 0) {
      toast.success('Parabéns! Você não errou nenhuma questão. 🎉')
      return
    }
    startQuiz(wrongQuestions)
  }

  const handleReplay = () => startQuiz(shuffle(questions))

  const handleReset = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setStatus('ready')
    setQuestions([])
    setQuestionsAndAnswers([])
    setQueue([])
    setSkippedSet(new Set())
    setScore(0)
    setFeedback('')
    setError('')
    setSaved(false)
    setMateriasSelected([])
    setQuantidade(0)
  }

  const saveSessionMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/api/sessoes', payload)
    },
    onMutate: () => {
      setSaving(true)
      setError('')
    },
    onSuccess: async () => {
      // Se veio de uma trilha (Módulo), marca como concluído automaticamente
      const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
      const moduloId = params.get('modulo_id')
      if (moduloId && matricula) {
        try {
          await api.post(`/api/trilhas/progresso/${moduloId}`, { matricula })
        } catch (e) {
          console.error('Erro ao marcar progresso do módulo:', e)
        }
      }

      setSaved(true)
      setFeedback('Sessão salva com sucesso no dashboard.')
      setSaving(false)
    },
    onError: () => {
      setError('Não foi possível salvar a sessão.')
      setSaving(false)
    }
  })

  const handleSaveSession = useCallback(() => {
    if (status !== 'finished' || saved) return
    const respondidas = (questionsAndAnswers || []).length
    const porcentagem = calculateCorrectAnswersPercentage(respondidas, score)
    const materiaLabel =
      materiasSelected.length > 0
        ? materias
          .filter((m) => materiasSelected.includes(String(m.id)))
          .map((m) => m.nome)
          .join(', ') || 'Quiz de Contabilidade'
        : 'Quiz de Contabilidade'

    // matricula_aluno deve ser a matrícula do usuário (para a FK da tabela sessoes_estudo);
    // nome_aluno é o nome de exibição (snapshot). Ambos devem ser enviados separadamente.
    saveSessionMutation.mutate({
      matricula_aluno: matricula || null,
      nome_aluno: nomeAluno || matricula || null,
      assunto_estudado: materiaLabel,
      questoes_respondidas: respondidas,
      taxa_acerto: porcentagem,
      tempo_gasto_segundos: elapsedSeconds,
      lista_detalhes: (questionsAndAnswers || []).map((qa) => ({ id: qa.id, acertou: qa.isCorrect })),
    })
  }, [
    status,
    saved,
    questionsAndAnswers,
    score,
    matricula,
    nomeAluno,
    materiasSelected,
    materias,
    elapsedSeconds,
    saveSessionMutation
  ])

  const handleShare = useCallback(async () => {
    const totalResp = (questionsAndAnswers || []).length
    const scorePerc = calculateCorrectAnswersPercentage(totalResp || questions.length, score)
    const m = Math.floor(elapsedSeconds / 60)
    const s = elapsedSeconds % 60
    const text = `🎓 Fiz o Quiz de Contabilidade Fácil!\n✅ ${score} acertos de ${totalResp} (${scorePerc}%)\n⏱ Tempo: ${m}m ${s}s\n📘 Estude também em Contabilidade Fácil!`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Quiz de Contabilidade', text })
      } else {
        await navigator.clipboard.writeText(text)
        toast.success('Copiado para a área de transferência! ✅')
      }
    } catch { }
  }, [elapsedSeconds, score, questionsAndAnswers, questions])

  // Derived values
  const currentIndex = queue[0] ?? 0
  const currentQuestion = (status === 'quiz' && queue.length > 0) ? (questions[currentIndex] ?? null) : null
  const totalAnswered = (questionsAndAnswers || []).length
  const totalQuestions = questions.length
  const finalScore = calculateCorrectAnswersPercentage(totalAnswered || totalQuestions, score)
  const timerCritical = remainingSeconds <= 60
  const progress = totalQuestions ? (totalAnswered / totalQuestions) * 100 : 0
  const isRevisiting = status === 'quiz' && skippedSet.has(currentIndex)
  const pendingSkipped = skippedSet.size - (isRevisiting ? 1 : 0)
  const grade = useMemo(() => calculateGrade(finalScore), [finalScore])
  
  // Clean Code: Função auxiliar no lugar de ternário aninhado
  const getGradeColor = (score) => {
    if (score >= 90) return 'success'
    if (score >= 70) return 'info'
    if (score >= 60) return 'warning'
    return 'danger'
  }
  const gradeColor = getGradeColor(finalScore)

  return {
    filtrosDisponiveis,
    status,
    setStatus,
    questions,
    setQuestions,
    queue,
    setQueue,
    skippedSet,
    setSkippedSet,
    selectedOption,
    setSelectedOption,
    score,
    setScore,
    error,
    setError,
    feedback,
    setFeedback,
    tempoLimite,
    setTempoLimite,
    remainingSeconds,
    setRemainingSeconds,
    startTime,
    setStartTime,
    elapsedSeconds,
    setElapsedSeconds,
    saving,
    setSaving,
    saved,
    setSaved,
    questionsAndAnswers,
    setQuestionsAndAnswers,
    activeTab,
    setActiveTab,
    isAnswerConfirmed,
    setIsAnswerConfirmed,
    isConfusing,
    setIsConfusing,
    commentText,
    setCommentText,
    commentStatus,
    setCommentStatus,
    materiasSelected,
    setMateriasSelected,
    quantidade,
    setQuantidade,
    isDark,
    setIsDark,
    isFullscreen,
    setIsFullscreen,
    soundEnabled,
    setSoundEnabled,
    savedSnapshot,
    setSavedSnapshot,
    showDica,
    setShowDica,
    modoEstudo,
    setModoEstudo,
    bancaSelecionada,
    setBancaSelecionada,
    orgaoSelecionado,
    setOrgaoSelecionado,
    cargoSelecionado,
    setCargoSelecionado,
    anoSelecionado,
    setAnoSelecionado,
    favoritos,
    setFavoritos,
    disciplinaPai,
    setDisciplinaPai,
    queryClient,
    nomeAluno,
    toggleFullscreen,
        toggleFavoritoMutation,
    alternarFavorito,
    materias,
    loadingMaterias,
    startQuizWithTime,
    startQuiz,
    resumeSnapshot,
    fetchQuestoesMutation,
    fetchAndStart,
    simuladoMutation,
    fetchAndStartSimuladoRapido,
    handleConfirmAnswer,
    handleNextQuestion,
    handleSkip,
    feedbackMutation,
    handleSendComment,
    handleFinishEarly,
    handleRetryErrors,
    handleReplay,
    handleReset,
    saveSessionMutation,
    handleSaveSession,
    handleShare,
    currentIndex,
    currentQuestion,
    totalAnswered,
    totalQuestions,
    finalScore,
    timerCritical,
    progress,
    isRevisiting,
    pendingSkipped,
    grade,
    getGradeColor,
    gradeColor,
    nome,
    isLogado,
    matricula
  }
}
