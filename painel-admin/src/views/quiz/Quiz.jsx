import React, { useEffect, useState } from 'react'
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
  CForm,
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
import { API_URL } from '../../config'
import {
  calculateScore,
  calculateGrade,
  formatSeconds,
  shuffle,
} from '../../utils/quizUtils'

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

// ✅ ALTERAÇÃO 1: Adicionado 'E' ao array de letras
const LETTERS = ['A', 'B', 'C', 'D', 'E']

// ---------------------------------------------------------------------------
// Componente interno – Tabela de revisão de respostas
// ---------------------------------------------------------------------------
const ReviewTable = ({ questionsAndAnswers }) => (
  <CTable bordered striped hover responsive className="mt-3">
    <CTableHead color="light">
      <CTableRow>
        <CTableHeaderCell style={{ width: '3%' }}>#</CTableHeaderCell>
        <CTableHeaderCell>Pergunta</CTableHeaderCell>
        <CTableHeaderCell style={{ width: '12%' }} className="text-center">
          Sua resposta
        </CTableHeaderCell>
        <CTableHeaderCell style={{ width: '12%' }} className="text-center">
          Resposta correta
        </CTableHeaderCell>
        <CTableHeaderCell style={{ width: '7%' }} className="text-center">
          Resultado
        </CTableHeaderCell>
      </CTableRow>
    </CTableHead>
    <CTableBody>
      {questionsAndAnswers.map((item, i) => (
        <CTableRow key={i} color={item.isCorrect ? 'success' : 'danger'}>
          <CTableDataCell>{i + 1}</CTableDataCell>
          <CTableDataCell>{item.question}</CTableDataCell>
          <CTableDataCell className="text-center fw-bold">{item.userAnswer}</CTableDataCell>
          <CTableDataCell className="text-center fw-bold">{item.correctAnswer}</CTableDataCell>
          <CTableDataCell className="text-center">
            {item.isCorrect ? '✅' : '❌'}
          </CTableDataCell>
        </CTableRow>
      ))}
    </CTableBody>
  </CTable>
)

// ---------------------------------------------------------------------------
// Componente interno – Estatísticas finais
// ---------------------------------------------------------------------------
const StatsPanel = ({ score, correctAnswers, totalQuestions, elapsedSeconds, onReplay, onReset }) => {
  const gradeResult = calculateGrade(score)
  const totalMinutes = Math.floor(elapsedSeconds / 60)
  const totalSecondsRest = elapsedSeconds % 60

  const gradeColor =
    score >= 90 ? 'success' :
      score >= 70 ? 'info' :
        score >= 60 ? 'warning' : 'danger'

  return (
    <div className="text-center py-2">
      {gradeResult && (
        <>
          <p className="fs-5 text-muted mb-1">{gradeResult.remarks}</p>
          <CBadge color={gradeColor} style={{ fontSize: '2rem', padding: '0.5rem 1.5rem' }} className="mb-4">
            Nota: {gradeResult.grade}
          </CBadge>
        </>
      )}

      <CRow className="justify-content-center g-3 mb-4">
        <CCol xs={6} md={3}>
          <CCard className="text-center border-0 bg-body-secondary h-100">
            <CCardBody>
              <div className="fs-3 fw-bold text-primary">{score}%</div>
              <small className="text-muted">Percentual</small>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={6} md={3}>
          <CCard className="text-center border-0 bg-body-secondary h-100">
            <CCardBody>
              <div className="fs-3 fw-bold text-success">{correctAnswers}</div>
              <small className="text-muted">Acertos</small>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={6} md={3}>
          <CCard className="text-center border-0 bg-body-secondary h-100">
            <CCardBody>
              <div className="fs-3 fw-bold text-danger">{totalQuestions - correctAnswers}</div>
              <small className="text-muted">Erros</small>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={6} md={3}>
          <CCard className="text-center border-0 bg-body-secondary h-100">
            <CCardBody>
              <div className="fs-3 fw-bold">{totalMinutes}m {totalSecondsRest}s</div>
              <small className="text-muted">Tempo gasto</small>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <div className="d-flex justify-content-center gap-3 flex-wrap">
        <CButton color="primary" onClick={onReplay}>
          🔄 Refazer Quiz
        </CButton>
        <CButton color="secondary" variant="outline" onClick={onReset}>
          🏠 Voltar ao início
        </CButton>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal – Quiz
// ---------------------------------------------------------------------------
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

  const nomeAluno = sessionStorage.getItem('nome') || 'Aluno'

  useEffect(() => {
    fetch(`${API_URL}/api/admin/materias`)
      .then(res => res.json())
      .then(data => setMaterias(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

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
      if (!res.ok || !Array.isArray(data) || data.length === 0) {
        throw new Error('Nenhuma questão encontrada para esta matéria.')
      }
      let pool = shuffle(data)
      if (quantidade > 0 && quantidade < pool.length) {
        pool = pool.slice(0, quantidade)
      }
      await startQuiz(pool)
    } catch (err) {
      setError(err.message || 'Erro ao buscar questões. Verifique se o backend está ativo.')
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
      if (!res.ok || !Array.isArray(data) || data.length === 0) {
        throw new Error('Nenhuma questão encontrada.')
      }
      let pool = shuffle(data).slice(0, 10)
      setTempoLimite(600) // 10 minutos
      await startQuiz(pool)
    } catch (err) {
      setError(err.message || 'Erro ao buscar questões. Verifique se o backend está ativo.')
      setStatus('ready')
    }
  }

  const handleConfirmAnswer = () => {
    if (!selectedOption) {
      setError('Selecione uma alternativa antes de continuar.')
      return
    }

    const question = questions[currentIndex]
    const isCorrect = selectedOption === question.answer

    const entry = {
      id: question.id,
      question: question.question,
      userAnswer: selectedOption,
      correctAnswer: question.answer,
      isCorrect,
    }
    setQuestionsAndAnswers([...questionsAndAnswers, entry])

    if (isCorrect) setScore((prev) => prev + 1)

    setError('')
    setFeedback('')
    setIsAnswerConfirmed(true)
  }

  const handleNextQuestion = () => {
    setIsAnswerConfirmed(false)
    setIsConfusing(false)
    setCommentText('')
    setCommentStatus('idle')

    const nextIndex = currentIndex + 1
    if (nextIndex >= questions.length) {
      setElapsedSeconds(Math.round((Date.now() - startTime) / 1000))
      setStatus('finished')
      return
    }

    setCurrentIndex(nextIndex)
    setSelectedOption('')
  }

  const handleSendComment = async () => {
    if (!commentText.trim() && !isConfusing) return

    setCommentStatus('sending')
    try {
      const currentQ = questions[currentIndex]
      const payload = {
        questao_id: currentQ.id,
        nome_aluno: nomeAluno,
        texto: commentText,
        marcada_confusa: isConfusing
      }

      const res = await fetch(`${API_URL}/api/feedbacks_questoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Erro ao salvar feedback')

      setCommentStatus('sent')
    } catch (e) {
      setError('Falha ao enviar comentário. Tente novamente.')
      setCommentStatus('idle')
    }
  }

  const handleFinishEarly = () => {
    if (!window.confirm('Deseja realmente encerrar o simulado? A nota será calculada com base nas questões já respondidas.')) return
    setElapsedSeconds(Math.round((Date.now() - startTime) / 1000))
    setFeedback(`Simulado encerrado pelo aluno. ${questionsAndAnswers.length} de ${questions.length} questões respondidas.`)
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
      const userMatricula = sessionStorage.getItem('matricula') || nomeAluno
      const materiaLabel = materiaSelecionada
        ? materias.find(m => String(m.id) === String(materiaSelecionada))?.nome || 'Quiz de Contabilidade'
        : 'Quiz de Contabilidade'
      const payload = {
        nome_aluno: userMatricula,
        assunto_estudado: materiaLabel,
        questoes_respondidas: respondidas,
        taxa_acerto: porcentagem,
        tempo_gasto_segundos: elapsedSeconds,
        lista_detalhes: questionsAndAnswers.map(qa => ({
          id: qa.id,
          acertou: qa.isCorrect
        }))
      }
      const res = await fetch(`${API_URL}/api/sessoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.mensagem || 'Falha ao salvar sessão')
      setSaved(true)
      setFeedback('Sessão salva com sucesso no dashboard.')
    } catch {
      setError('Não foi possível salvar a sessão. Tente novamente mais tarde.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (status !== 'quiz' || isAnswerConfirmed) return undefined
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
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
    if (status === 'finished' && !saved) {
      handleSaveSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, saved])

  const currentQuestion = questions[currentIndex]
  const totalAnswered = questionsAndAnswers.length
  const totalQuestions = questions.length
  const finalScore = calculateScore(totalAnswered || totalQuestions, score)

  return (
    <CContainer className="py-4">
      <CRow className="justify-content-center">
        <CCol xs={12} xl={10}>
          <CCard>
            <CCardHeader>
              <h2 className="mb-0">Quiz de Contabilidade</h2>
            </CCardHeader>

            <CCardBody>
              {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}
              {feedback && <CAlert color="info">{feedback}</CAlert>}

              {status === 'ready' && (
                <CForm>
                  <p>Configure seu simulado e pressione <strong>Iniciar</strong>.</p>
                  <CRow className="g-3 mb-4">
                    <CCol xs={12} md={4}>
                      <label className="form-label fw-bold small text-muted">📚 Matéria</label>
                      <CFormSelect
                        value={materiaSelecionada}
                        onChange={(e) => setMateriaSelecionada(e.target.value)}
                      >
                        <option value="">Todas as matérias</option>
                        {materias.map((m) => (
                          <option key={m.id} value={m.id}>{m.nome}</option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol xs={6} md={4}>
                      <label className="form-label fw-bold small text-muted">🔢 Questões</label>
                      <CFormSelect
                        value={quantidade}
                        onChange={(e) => setQuantidade(Number(e.target.value))}
                      >
                        {QTD_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </CFormSelect>
                    </CCol>
                    <CCol xs={6} md={4}>
                      <label className="form-label fw-bold small text-muted">⏱ Tempo</label>
                      <CFormSelect
                        value={tempoLimite}
                        onChange={(e) => setTempoLimite(Number(e.target.value))}
                      >
                        {TIME_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </CFormSelect>
                    </CCol>
                  </CRow>
                  <CButton color="primary" size="lg" onClick={fetchAndStart}>
                    ▶ Iniciar Quiz Personalizado
                  </CButton>
                  
                  <hr className="my-4" />
                  <div className="text-center">
                    <h5 className="text-muted mb-3">Ou vá direto ao ponto:</h5>
                    <CButton 
                      color="success" 
                      size="lg" 
                      className="w-100 py-3 text-white fw-bold fs-5 shadow-sm" 
                      onClick={fetchAndStartSimuladoRapido}
                    >
                      ▶️ Começar Simulado Rápido (10 Aleatórias em 10min)
                    </CButton>
                  </div>
                </CForm>
              )}

              {status === 'loading' && (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                  <p className="mt-3 text-muted">Carregando questões...</p>
                </div>
              )}

              {status === 'quiz' && currentQuestion && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>Pergunta {currentIndex + 1} de {totalQuestions}</strong>
                    <span className={`text-${remainingSeconds <= 60 ? 'danger' : 'muted'} fw-bold`}>
                      ⏱ {formatSeconds(remainingSeconds)}
                    </span>
                  </div>
                  <CProgress
                    className="mb-4"
                    value={((currentIndex + 1) / totalQuestions) * 100}
                    color="primary"
                  />
                  <p className="fs-5 mb-4">
                    {currentQuestion.question}
                    {isConfusing && <CBadge color="warning" className="ms-2">Confusa</CBadge>}
                  </p>

                  {/* ✅ ALTERAÇÃO 2: O layout de grid se adapta automaticamente.
                      Questões com 4 opções ficam em 2 colunas (md=6).
                      Questões com 5 opções ficam em coluna única (xs=12) para não quebrar. */}
                  <CRow className="g-2">
                    {currentQuestion.options.map((optionText, index) => {
                      // ✅ ALTERAÇÃO 3: Pega a letra do array LETTERS pelo índice.
                      // Se o backend mandar 4 opções, renderiza A-D. Se mandar 5, renderiza A-E.
                      const optionValue = LETTERS[index]
                      if (!optionValue) return null // segurança: ignora índices além de E

                      const isSelected = selectedOption === optionValue
                      const isCorrectAnswer = optionValue === currentQuestion.answer

                      let btnColor = 'secondary'
                      let isSolid = false

                      if (isAnswerConfirmed) {
                        if (isCorrectAnswer) {
                          btnColor = 'success'
                          isSolid = true
                        } else if (isSelected) {
                          btnColor = 'danger'
                          isSolid = true
                        }
                      } else if (isSelected) {
                        btnColor = 'primary'
                        isSolid = true
                      }

                      // ✅ ALTERAÇÃO 4: Se a questão tem 5 opções, cada botão ocupa linha inteira.
                      // Se tem 4 ou menos, mantém o layout original de 2 colunas.
                      const colSize = currentQuestion.options.length >= 5 ? 12 : 6

                      return (
                        <CCol xs={12} md={colSize} key={optionValue}>
                          <CButton
                            color={btnColor}
                            variant={isSolid ? undefined : 'outline'}
                            className={`w-100 p-3 text-start ${isAnswerConfirmed && !isCorrectAnswer && !isSelected ? 'opacity-50' : ''}`}
                            onClick={() => !isAnswerConfirmed && setSelectedOption(optionValue)}
                            style={{
                              cursor: isAnswerConfirmed ? 'default' : 'pointer',
                              color: isSolid ? '#fff' : ''
                            }}
                          >
                            <strong className="me-2">{optionValue}.</strong> {optionText}
                          </CButton>
                        </CCol>
                      )
                    })}
                  </CRow>

                  {/* ────────────────── FEEDBACK, EXPLICAÇÃO E COMENTÁRIOS ────────────────── */}
                  {isAnswerConfirmed && (
                    <div className="mt-4" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>

                      {/* 1. Alerta de Acerto ou Erro + Validação Social */}
                      <CAlert color={selectedOption === currentQuestion.answer ? 'success' : 'danger'}>
                        <h5 className="alert-heading">
                          {selectedOption === currentQuestion.answer ? '✅ Resposta Correta!' : '❌ Resposta Incorreta'}
                        </h5>
                        <p className="mb-0">
                          A alternativa correta é a letra <strong>{currentQuestion.answer}</strong>.
                        </p>
                        
                        {/* Validação Social */}
                        {currentQuestion.tentativas > 0 && (
                          <div className="mt-2 pt-2 border-top border-opacity-25 border-dark">
                            <span className="fw-bold" style={{ fontSize: '0.9rem' }}>
                              👥 Validação Social: {Math.round((currentQuestion.acertos / currentQuestion.tentativas) * 100)}% dos alunos também acertaram essa questão.
                            </span>
                          </div>
                        )}
                      </CAlert>

                      {/* 2. EXPLICAÇÃO DO PROFESSOR */}
                      <CCard className="mb-3 border-info">
                        <CCardBody className="bg-light">
                          <h6 className="text-info fw-bold mb-2">
                            💡 Explicação do Professor
                          </h6>
                          <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                            {currentQuestion.explicacao || 'Nenhum comentário adicional do professor para esta questão.'}
                          </p>
                        </CCardBody>
                      </CCard>

                      {/* 3. COMENTÁRIOS DA COMUNIDADE */}
                      {currentQuestion.comentarios_publicos && currentQuestion.comentarios_publicos.length > 0 && (
                        <CCard className="mb-3 border-success shadow-sm">
                          <CCardHeader className="bg-success text-white fw-bold">
                            💬 Comentários da Comunidade
                          </CCardHeader>
                          <CCardBody className="bg-light">
                            {currentQuestion.comentarios_publicos.map((comentario, idx) => (
                              <div key={idx} className={`mb-2 ${idx !== currentQuestion.comentarios_publicos.length - 1 ? 'border-bottom pb-2' : ''}`}>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <strong className="text-success">{comentario.nome_aluno || 'Aluno'}</strong>
                                  <small className="text-muted text-opacity-75">{new Date(comentario.data_criacao).toLocaleDateString('pt-BR')}</small>
                                </div>
                                <p className="mb-0 text-dark fst-italic">"{comentario.texto}"</p>
                              </div>
                            ))}
                          </CCardBody>
                        </CCard>
                      )}

                      {/* 4. Área para o Aluno enviar comentário */}
                      <CCard className="bg-body-tertiary border-0 mt-3">
                        <CCardBody>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-medium text-muted">
                              💬 Feedback sobre esta questão
                            </span>
                            <CButton
                              color="warning"
                              variant={isConfusing ? undefined : 'outline'}
                              size="sm"
                              className="rounded-pill"
                              onClick={() => setIsConfusing(!isConfusing)}
                              disabled={commentStatus === 'sending' || commentStatus === 'sent'}
                              style={{ color: isConfusing ? '#000' : '' }}
                            >
                              {isConfusing ? '⚠️ Marcada como confusa' : '⚠️ Marcar como confusa'}
                            </CButton>
                          </div>

                          <CFormTextarea
                            placeholder="Teve dúvida no enunciado? Achou a questão ambígua? Descreva aqui — o professor irá revisar."
                            rows={2}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            maxLength={300}
                            disabled={commentStatus === 'sending' || commentStatus === 'sent'}
                          />

                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <small className="text-muted">{commentText.length} / 300</small>

                            {commentStatus === 'sent' ? (
                              <span className="text-success fw-bold">✅ Feedback enviado ao professor!</span>
                            ) : (
                              <CButton
                                color="info"
                                variant={commentText.length > 0 || isConfusing ? undefined : 'outline'}
                                size="sm"
                                onClick={handleSendComment}
                                disabled={(!commentText.trim() && !isConfusing) || commentStatus === 'sending'}
                                style={{ color: (commentText.length > 0 || isConfusing) ? '#fff' : '' }}
                              >
                                {commentStatus === 'sending' ? <CSpinner size="sm" /> : 'Enviar comentário'}
                              </CButton>
                            )}
                          </div>
                        </CCardBody>
                      </CCard>
                    </div>
                  )}

                  {/* ────────────────── BOTÕES DE NAVEGAÇÃO ────────────────── */}
                  <div className="mt-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small">Aluno: {nomeAluno}</span>
                      <CButton
                        color="danger"
                        variant="outline"
                        size="sm"
                        onClick={handleFinishEarly}
                        disabled={questionsAndAnswers.length === 0}
                      >
                        ⛔ Encerrar Simulado
                      </CButton>
                    </div>
                    {!isAnswerConfirmed ? (
                      <CButton
                        color="success"
                        onClick={handleConfirmAnswer}
                        disabled={!selectedOption}
                        className="text-white"
                      >
                        Confirmar resposta →
                      </CButton>
                    ) : (
                      <CButton
                        color="primary"
                        onClick={handleNextQuestion}
                        className="text-white"
                      >
                        {currentIndex + 1 >= totalQuestions ? 'Finalizar Quiz →' : 'Próxima questão →'}
                      </CButton>
                    )}
                  </div>
                </>
              )}

              {/* ────────────────── QUIZ FINALIZADO ────────────────── */}
              {status === 'finished' && (
                <>
                  <CNav variant="tabs" className="mb-4">
                    <CNavItem>
                      <CNavLink
                        active={activeTab === 'stats'}
                        onClick={() => setActiveTab('stats')}
                        style={{ cursor: 'pointer' }}
                      >
                        📊 Estatísticas
                      </CNavLink>
                    </CNavItem>
                    <CNavItem>
                      <CNavLink
                        active={activeTab === 'qna'}
                        onClick={() => setActiveTab('qna')}
                        style={{ cursor: 'pointer' }}
                      >
                        📋 Revisão de Respostas
                      </CNavLink>
                    </CNavItem>
                  </CNav>

                  {activeTab === 'stats' && (
                    <StatsPanel
                      score={finalScore}
                      correctAnswers={score}
                      totalQuestions={totalAnswered || totalQuestions}
                      elapsedSeconds={elapsedSeconds}
                      onReplay={handleReplay}
                      onReset={handleReset}
                    />
                  )}

                  {activeTab === 'qna' && (
                    <ReviewTable questionsAndAnswers={questionsAndAnswers} />
                  )}
                </>
              )}
            </CCardBody>

            {status === 'finished' && (
              <CCardFooter className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <small className="text-muted">
                  {saved ? '✅ Sessão salva no dashboard.' : saving ? 'Salvando sessão...' : ''}
                </small>
                <CButton
                  color="primary"
                  size="sm"
                  onClick={handleSaveSession}
                  disabled={saving || saved}
                  className="text-white"
                >
                  {saving ? <><CSpinner size="sm" className="me-1" /> Salvando...</> : saved ? 'Sessão salva' : 'Salvar sessão'}
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