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

  const nomeAluno = sessionStorage.getItem('userName') || 'Aluno'

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
      const res = await fetch(`${API_URL}/api/questoes`)
      const data = await res.json()
      if (!res.ok || !Array.isArray(data) || data.length === 0) {
        throw new Error('Não foi possível carregar as questões.')
      }
      await startQuiz(data)
    } catch {
      setError('Erro ao buscar questões. Verifique se o backend está ativo.')
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

  const handleReplay = () => startQuiz(shuffle(questions))

  const handleReset = () => {
    setStatus('ready')
    setQuestions([])
    setQuestionsAndAnswers([])
    setScore(0)
    setFeedback('')
    setError('')
    setSaved(false)
  }

  const handleSaveSession = async () => {
    if (status !== 'finished' || saved) return
    setSaving(true)
    setError('')
    try {
      const total = questions.length
      const porcentagem = calculateScore(total, score)
      const userMatricula = sessionStorage.getItem('userMatricula') || nomeAluno
      const payload = {
        nome_aluno: userMatricula,
        assunto_estudado: 'Quiz de Contabilidade',
        questoes_respondidas: total,
        taxa_acerto: porcentagem,
        tempo_gasto_segundos: elapsedSeconds,
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
  const totalQuestions = questions.length
  const finalScore = calculateScore(totalQuestions, score)

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
                  <p>Selecione o tempo disponível para o seu quiz e pressione <strong>Iniciar</strong>.</p>
                  <CFormSelect
                    aria-label="Tempo para o quiz"
                    value={tempoLimite}
                    onChange={(e) => setTempoLimite(Number(e.target.value))}
                    className="mb-3"
                    style={{ maxWidth: 240 }}
                  >
                    {TIME_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </CFormSelect>
                  <CButton color="primary" onClick={fetchAndStart}>
                    ▶ Iniciar Quiz
                  </CButton>
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

                      {/* 1. Alerta de Acerto ou Erro */}
                      <CAlert color={selectedOption === currentQuestion.answer ? 'success' : 'danger'}>
                        <h5 className="alert-heading">
                          {selectedOption === currentQuestion.answer ? '✅ Resposta Correta!' : '❌ Resposta Incorreta'}
                        </h5>
                        <p className="mb-0">
                          A alternativa correta é a letra <strong>{currentQuestion.answer}</strong>.
                        </p>
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

                      {/* 3. Área para o Aluno enviar comentário */}
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
                    <span className="text-muted small">Aluno: {nomeAluno}</span>
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
                      totalQuestions={totalQuestions}
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