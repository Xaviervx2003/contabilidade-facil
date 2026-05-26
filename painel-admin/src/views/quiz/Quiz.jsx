import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CProgress,
  CRow,
  CCollapse,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCheckCircle,
  cilXCircle,
  cilLightbulb,
  cilVideo,
  cilFullscreen,
  cilFullscreenExit,
  cilStar,
} from '@coreui/icons'
import api from '../../services/api'
import { API_URL } from '../../config'
import { calculateGrade, formatSeconds, shuffle } from '../../utils/quizUtils'
import MateriaMultiSelect from '../../components/MateriaMultiSelect'
import { useTheme } from '../../context/themeContext'
import useAuthSession from '../../hooks/useAuthSession'
import { getMatricula } from '../../utils/auth'
import { toast } from 'react-hot-toast'
import { confirmDialog } from '../../utils/confirm'
import { Icon } from '@iconify/react'
import gradeCurricular from '../../data/grade_curricular.json'
import curriculumMapping from '../../data/curriculumMapping.json'

/* ─── Utilitários Locais (Bulletproof) ───────────────────────────────────────── */
const calculateCorrectAnswersPercentage = (totalQuestionsCount, correctAnswersCount) => {
  if (!totalQuestionsCount || totalQuestionsCount === 0) return 0
  return Number(((correctAnswersCount * 100) / totalQuestionsCount).toFixed(2))
}

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

const obterLinkEmbed = (videoUrl) => {
  if (!videoUrl) return null
  let embedUrl = videoUrl
  if (videoUrl.includes('youtube.com/watch?v=')) {
    embedUrl = videoUrl.replace('watch?v=', 'embed/').split('&')[0]
  } else if (videoUrl.includes('youtu.be/')) {
    embedUrl = videoUrl.replace('youtu.be/', 'www.youtube.com/embed/')
  } else if (videoUrl.includes('vimeo.com/')) {
    embedUrl = videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/')
  }
  return embedUrl
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

import {
  SkeletonQuiz,
} from './components/QuizComponents'


import { useQuizLogic } from './hooks/useQuizLogic';
import ReadyScreen, { QuizRunning, FinishedScreen } from './components/ReadyScreen';

const Quiz = () => {
  const { status, setStatus, questions, setQuestions, queue, setQueue, skippedSet, setSkippedSet, selectedOption, setSelectedOption, score, setScore, error, setError, feedback, setFeedback, tempoLimite, setTempoLimite, remainingSeconds, setRemainingSeconds, startTime, setStartTime, elapsedSeconds, setElapsedSeconds, saving, setSaving, saved, setSaved, questionsAndAnswers, setQuestionsAndAnswers, activeTab, setActiveTab, isAnswerConfirmed, setIsAnswerConfirmed, isConfusing, setIsConfusing, commentText, setCommentText, commentStatus, setCommentStatus, materiasSelected, setMateriasSelected, quantidade, setQuantidade, isDark, setIsDark, isFullscreen, setIsFullscreen, soundEnabled, setSoundEnabled, savedSnapshot, setSavedSnapshot, showDica, setShowDica, modoEstudo, setModoEstudo, bancaSelecionada, setBancaSelecionada, orgaoSelecionado, setOrgaoSelecionado, cargoSelecionado, setCargoSelecionado, anoSelecionado, setAnoSelecionado, favoritos, setFavoritos, disciplinaPai, setDisciplinaPai, queryClient, nomeAluno, toggleFullscreen, toggleFavoritoMutation, alternarFavorito, materias, loadingMaterias, startQuizWithTime, startQuiz, resumeSnapshot, fetchQuestoesMutation, fetchAndStart, simuladoMutation, fetchAndStartSimuladoRapido, handleConfirmAnswer, handleNextQuestion, handleSkip, feedbackMutation, handleSendComment, handleFinishEarly, handleRetryErrors, handleReplay, handleReset, saveSessionMutation, handleSaveSession, handleShare, currentIndex, currentQuestion, totalAnswered, totalQuestions, finalScore, timerCritical, progress, isRevisiting, pendingSkipped, grade, getGradeColor, gradeColor, nome, isLogado, matricula, filtrosDisponiveis } = useQuizLogic();
  return (
    <CContainer fluid className="py-3 py-md-4 px-3 px-md-4">

      {!isLogado && status === 'ready' && (
        <div
          className="rounded-4 border-0 mb-4 d-flex align-items-center justify-content-between p-3"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: 48,
                height: 48,
                background: 'rgba(14, 165, 233, 0.1)',
                color: '#0ea5e9',
              }}
            >
              <Icon icon="solar:user-circle-bold-duotone" width="28" height="28" />
            </div>
            <div>
              <div className="fw-bold" style={{ color: 'var(--color-text-primary)', fontSize: '15px' }}>Modo Visitante</div>
              <div className="small text-body-secondary" style={{ fontSize: '13px' }}>Faça login para salvar seu progresso e acessar métricas.</div>
            </div>
          </div>
          <button
            className="rounded-pill px-4 py-2 fw-bold text-white transition-all shadow-sm"
            style={{
              background: 'var(--accent-primary, #FF385C)',
              border: 'none',
              fontSize: '13px',
              cursor: 'pointer',
            }}
            onClick={() => window.location.href = '#/login'}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Login
          </button>
        </div>
      )}
      {savedSnapshot && status === 'ready' && (
        <div
          className="rounded-4 border-0 mb-4 d-flex flex-wrap justify-content-between align-items-center gap-3 p-3"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: 48,
                height: 48,
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
              }}
            >
              <Icon icon="solar:history-bold-duotone" width="26" height="26" />
            </div>
            <div>
              <div className="fw-bold" style={{ color: 'var(--color-text-primary)', fontSize: '15px' }}>Quiz em andamento</div>
              <div className="small text-body-secondary" style={{ fontSize: '13px' }}>
                Você tem um quiz em andamento ({savedSnapshot.questionsAndAnswers?.length ?? 0} questões respondidas).
              </div>
            </div>
          </div>
          <div className="d-flex gap-2 flex-shrink-0">
            <button
              className="rounded-pill px-4 py-2 fw-bold text-white transition-all"
              style={{
                background: '#f59e0b',
                border: 'none',
                fontSize: '13px',
                cursor: 'pointer',
              }}
              onClick={() => resumeSnapshot(savedSnapshot)}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
            >
              Continuar
            </button>
            <button
              className="rounded-pill px-4 py-2 fw-bold text-body-secondary transition-all"
              style={{
                background: 'transparent',
                border: '1.5px solid var(--color-border)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
              onClick={() => {
                setSavedSnapshot(null)
                sessionStorage.removeItem(SESSION_KEY)
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <CRow className="justify-content-center">
        <CCol xs={12} xl={10}>
          <CCard className="shadow border-0 overflow-hidden quiz-glass-card">
            <CCardHeader className="bg-body border-0 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2 px-3 py-3">
              <div className="d-flex align-items-center gap-2">
                <div className="bg-primary bg-opacity-10 p-2 rounded-3">
                  <span style={{ fontSize: 20 }}>📘</span>
                </div>
                <div>
                  <h4 className="mb-0 fw-bold" style={{ fontSize: 18, letterSpacing: '-0.5px' }}>
                    Quiz de Contabilidade
                  </h4>
                  <small className="text-body-secondary" style={{ fontSize: 10, display: 'block', marginTop: -2 }}>
                    ALTA PERFORMANCE EM ESTUDOS
                  </small>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                {status === 'quiz' && (
                  <CBadge
                    color={timerCritical ? 'danger' : 'info'}
                    className="fs-6 px-3 py-2 rounded-pill tabular-nums"
                  >
                    ⏱ {formatSeconds(remainingSeconds)}
                  </CBadge>
                )}
                <CButton color="link" size="sm" onClick={toggleFullscreen} title="Modo Foco">
                  <CIcon icon={isFullscreen ? cilFullscreenExit : cilFullscreen} size="lg" />
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody className="p-3 p-md-4">
              {error && (
                <CAlert color="danger" dismissible onClose={() => setError('')}>
                  {error}
                </CAlert>
              )}
              {feedback && <CAlert color="info">{feedback}</CAlert>}

              {status === 'ready' && loadingMaterias && (
                <div className="text-center py-5">
                  <CSpinner color="primary" className="mb-3" />
                  <p className="text-body-secondary">Carregando matérias...</p>
                </div>
              )}

              {status === 'ready' && !loadingMaterias && (
                <ReadyScreen
                  materias={materias}
                  materiasSelected={materiasSelected}
                  setMateriasSelected={setMateriasSelected}
                  disciplinaPai={disciplinaPai}
                  setDisciplinaPai={setDisciplinaPai}
                  filtrosDisponiveis={filtrosDisponiveis}
                  bancaSelecionada={bancaSelecionada}
                  setBancaSelecionada={setBancaSelecionada}
                  orgaoSelecionado={orgaoSelecionado}
                  setOrgaoSelecionado={setOrgaoSelecionado}
                  cargoSelecionado={cargoSelecionado}
                  setCargoSelecionado={setCargoSelecionado}
                  anoSelecionado={anoSelecionado}
                  setAnoSelecionado={setAnoSelecionado}
                  quantidade={quantidade}
                  setQuantidade={setQuantidade}
                  tempoLimite={tempoLimite}
                  setTempoLimite={setTempoLimite}
                  modoEstudo={modoEstudo}
                  setModoEstudo={setModoEstudo}
                  onStartPersonalizado={fetchAndStart}
                  onStartSimuladoRapido={fetchAndStartSimuladoRapido}
                />
              )}

              {status === 'loading' && <SkeletonQuiz isDark={isDark} />}

              {status === 'quiz' && currentQuestion && queue.length > 0 && (
                <QuizRunning
                  isDark={isDark}
                  currentQuestion={currentQuestion}
                  queue={queue}
                  totalQuestions={totalQuestions}
                  totalAnswered={totalAnswered}
                  progress={progress}
                  selectedOption={selectedOption}
                  isAnswerConfirmed={isAnswerConfirmed}
                  isRevisiting={isRevisiting}
                  pendingSkipped={pendingSkipped}
                  showDica={showDica}
                  onToggleDica={() => setShowDica((d) => !d)}
                  onSelectOption={setSelectedOption}
                  onConfirmAnswer={handleConfirmAnswer}
                  onNextQuestion={handleNextQuestion}
                  onSkip={handleSkip}
                  onFinishEarly={handleFinishEarly}
                  onToggleFullscreen={toggleFullscreen}
                  isFullscreen={isFullscreen}
                  remainingSeconds={remainingSeconds}
                  timerCritical={timerCritical}
                  soundEnabled={soundEnabled}
                  favoritos={favoritos}
                  onAlternarFavorito={alternarFavorito}
                  onSendComment={handleSendComment}
                  commentText={commentText}
                  setCommentText={setCommentText}
                  commentStatus={commentStatus}
                  isConfusing={isConfusing}
                  setIsConfusing={setIsConfusing}
                />
              )}

              {status === 'finished' && (
                <FinishedScreen
                  grade={grade}
                  gradeColor={gradeColor}
                  finalScore={finalScore}
                  score={score}
                  totalAnswered={totalAnswered}
                  totalQuestions={totalQuestions}
                  elapsedSeconds={elapsedSeconds}
                  questionsAndAnswers={questionsAndAnswers}
                  isDark={isDark}
                  onReplay={handleReplay}
                  onRetryErrors={handleRetryErrors}
                  onShare={handleShare}
                  onReset={handleReset}
                  onSaveSession={handleSaveSession}
                  saving={saving}
                  saved={saved}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              )}
            </CCardBody>

            {status === 'finished' && (
              <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
                <small className={saved ? 'text-success' : 'text-body-secondary'}>
                  {saved ? '✅ Sessão salva' : saving ? '⏳ Salvando...' : ''}
                </small>
                <CButton
                  color="primary"
                  size="sm"
                  onClick={handleSaveSession}
                  disabled={saving || saved}
                >
                  {saving ? 'Salvando...' : saved ? '✅ Salvo' : '💾 Salvar sessão'}
                </CButton>
              </div>
            )}
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default Quiz
