import React, { useMemo, useCallback } from 'react';
import { CCardBody, CBadge, CRow, CCol, CButton } from '@coreui/react';
import { Icon } from '@iconify/react';
import { ReviewTable } from './QuizComponents';
import useAuthSession from '../../../hooks/useAuthSession';

const FinishedScreen = ({
  grade,
  gradeColor,
  finalScore,
  score,
  totalAnswered,
  totalQuestions,
  elapsedSeconds,
  questionsAndAnswers,
  isDark,
  onReplay,
  onRetryErrors,
  onShare,
  onReset,
  onSaveSession,
  saving,
  saved,
  activeTab,
  setActiveTab,
}) => {
  const { isLogado } = useAuthSession()
  // 🧠 Padrão defensivo: validar dados antes de renderizar
  const validTabs = useMemo(() => ['stats', 'qna'], [])
  const safeActiveTab = validTabs.includes(activeTab) ? activeTab : 'stats'

  const handleTabChange = useCallback(
    (tab) => {
      if (validTabs.includes(tab)) setActiveTab(tab)
    },
    [validTabs, setActiveTab],
  )

  const gradeDetails = useMemo(() => {
    if (!grade || !grade.grade) {
      return {
        emoji: '📝',
        title: 'Quiz Concluído!',
        message: 'Você finalizou o quiz. Confira seus resultados abaixo.'
      }
    }
    const letter = grade.grade;
    if (letter.startsWith('A')) {
      return {
        emoji: '🏆',
        title: 'Desempenho Excelente!',
        message: grade.remarks || 'Você dominou completamente este quiz!'
      }
    }
    if (letter.startsWith('B')) {
      return {
        emoji: '🥈',
        title: 'Muito Bom!',
        message: grade.remarks || 'Ótimo desempenho! Continue assim!'
      }
    }
    if (letter.startsWith('C')) {
      return {
        emoji: '🥉',
        title: 'Bom Trabalho!',
        message: grade.remarks || 'Você foi aprovado e está no caminho certo!'
      }
    }
    if (letter.startsWith('D')) {
      return {
        emoji: '📚',
        title: 'Estude um Pouco Mais!',
        message: grade.remarks || 'Você passou, mas revise os pontos fracos.'
      }
    }
    return {
      emoji: '✍️',
      title: 'Continue Estudando!',
      message: grade.remarks || 'Aprender é uma jornada. Revise seus erros!'
    }
  }, [grade])

  return (
    <div style={{ animation: 'fade-up .35s ease' }}>
      <CCardBody className="p-4 p-md-5 text-center">
        <div className="mb-4" style={{ animation: 'bounce 2s infinite' }}>
          <span style={{ fontSize: 64 }}>{gradeDetails.emoji}</span>
        </div>

        <h2 className="fw-bold mb-1">{gradeDetails.title}</h2>
        <p className="text-body-secondary mb-4">{gradeDetails.message}</p>

        {!isLogado && (
          <div className="p-4 rounded-4 bg-primary bg-opacity-10 border border-primary border-opacity-25 mb-4 shadow-sm">
            <h6 className="fw-bold text-primary mb-2">🚀 Quer ver sua evolução?</h6>
            <p className="small text-body-secondary mb-3">Seus resultados de hoje não serão salvos. Crie uma conta gratuita para ter acesso a relatórios de BI e mapas de calor.</p>
            <CButton color="primary" className="rounded-pill px-4 shadow-sm" onClick={() => window.location.href = '#/register'}>
              Cadastrar Agora
            </CButton>
          </div>
        )}

        {/* 🎨 Abas com feedback visual + acessibilidade melhorada */}
        <div role="tablist" className="mb-4 border-bottom">
          <div className="d-flex gap-0 gap-md-2">
            {validTabs.map((tab) => {
              const isActive = safeActiveTab === tab
              const tabConfig = {
                stats: { icon: '📊', label: 'Estatísticas' },
                qna: { icon: '📋', label: 'Revisão' },
              }[tab]

              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tab-${tab}`}
                  onClick={() => handleTabChange(tab)}
                  className={`px-3 px-md-4 py-3 border-0 bg-transparent fw-bold transition-colors ${isActive
                    ? 'text-primary border-bottom border-primary border-2'
                    : 'text-body-secondary hover-primary'
                    }`}
                  style={{
                    cursor: 'pointer',
                    borderBottomWidth: isActive ? '3px' : '0',
                    transition: 'color 0.2s, border-color 0.2s',
                  }}
                >
                  <span className="me-2">{tabConfig.icon}</span>
                  {tabConfig.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 📊 TAB: ESTATÍSTICAS */}
        <div
          id="tab-stats"
          role="tabpanel"
          aria-labelledby="tab-stats"
          style={{ display: safeActiveTab === 'stats' ? 'block' : 'none' }}
        >
          <CBadge color={gradeColor} className="fs-2 px-4 py-2 mb-2">
            {grade?.grade || 'F'}
          </CBadge>
          {grade?.remarks && <p className="text-body-secondary mb-3">{grade.remarks}</p>}

          <CRow className="g-3 mb-4">
            <CCol xs={6} md={3}>
              <div className="bg-body-tertiary rounded-3 p-3">
                <div className="fs-2 fw-bold text-primary tabular-nums">{finalScore}%</div>
                <div className="text-uppercase text-secondary fw-semibold mt-1" style={{ fontSize: 9, letterSpacing: '0.05em' }}>Percentual</div>
              </div>
            </CCol>
            <CCol xs={6} md={3}>
              <div className="bg-body-tertiary rounded-3 p-3">
                <div className="fs-2 fw-bold text-success tabular-nums">{score}</div>
                <div className="text-uppercase text-secondary fw-semibold mt-1" style={{ fontSize: 9, letterSpacing: '0.05em' }}>Acertos</div>
              </div>
            </CCol>
            <CCol xs={6} md={3}>
              <div className="bg-body-tertiary rounded-3 p-3">
                <div className="fs-2 fw-bold text-danger">{totalAnswered - score}</div>
                <small className="text-body-secondary">Erros</small>
              </div>
            </CCol>
            <CCol xs={6} md={3}>
              <div className="bg-body-tertiary rounded-3 p-3">
                <div className="fs-2 fw-bold text-warning">
                  {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s
                </div>
                <small className="text-body-secondary">Tempo</small>
              </div>
            </CCol>
          </CRow>

          <div className="d-flex flex-wrap justify-content-center gap-2">
            <button
              onClick={onReplay}
              className="d-flex align-items-center gap-2 px-4 py-2 fw-bold text-white transition-all shadow-sm"
              style={{
                background: 'var(--accent-primary, #FF385C)',
                border: 'none',
                borderRadius: '30px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 56, 92, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 56, 92, 0.2)';
              }}
            >
              <Icon icon="solar:restart-bold-duotone" width="18" height="18" />
              Refazer
            </button>
            {score < totalAnswered && (
              <button
                onClick={onRetryErrors}
                className="d-flex align-items-center gap-2 px-4 py-2 fw-bold transition-all"
                style={{
                  background: 'transparent',
                  color: 'var(--cui-danger)',
                  border: '2px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '30px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                  e.currentTarget.style.borderColor = 'var(--cui-danger)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                }}
              >
                <Icon icon="solar:close-circle-bold-duotone" width="18" height="18" />
                Refazer erros ({totalAnswered - score})
              </button>
            )}
            <button
              onClick={onShare}
              className="d-flex align-items-center gap-2 px-4 py-2 fw-bold text-success transition-all"
              style={{
                background: 'transparent',
                border: '2px solid rgba(25, 135, 84, 0.2)',
                borderRadius: '30px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(25, 135, 84, 0.08)';
                e.currentTarget.style.borderColor = 'var(--cui-success)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(25, 135, 84, 0.2)';
              }}
            >
              <Icon icon="solar:share-bold-duotone" width="18" height="18" />
              Compartilhar
            </button>
            <button
              onClick={onReset}
              className="d-flex align-items-center gap-2 px-4 py-2 fw-bold text-body-secondary transition-all"
              style={{
                background: 'transparent',
                border: '2px solid var(--color-border)',
                borderRadius: '30px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-hover)';
                e.currentTarget.style.borderColor = 'var(--color-border-hover, var(--color-border))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              <Icon icon="solar:home-2-bold-duotone" width="18" height="18" />
              Voltar
            </button>
          </div>
        </div>

        {/* 📋 TAB: REVISÃO */}
        <div
          id="tab-qna"
          role="tabpanel"
          aria-labelledby="tab-qna"
          style={{ display: safeActiveTab === 'qna' ? 'block' : 'none' }}
        >
          <ReviewTable questionsAndAnswers={questionsAndAnswers} isDark={isDark} />
        </div>
      </CCardBody>
    </div>
  )
}

export default FinishedScreen;
