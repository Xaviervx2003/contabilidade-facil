import React from 'react'
import { CButton, CBadge } from '@coreui/react'

export const SkeletonQuiz = ({ isDark }) => {
  const bg = isDark ? '#1a2535' : '#f1f3f5'
  const pulse = isDark ? '#253447' : '#e2e8f0'
  return (
    <div className="p-3 p-md-4">
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

export const ReviewTable = ({ questionsAndAnswers, isDark }) => (
  <div className="table-responsive" style={{ animation: 'fade-up .35s ease' }}>
    <table className="table table-borderless w-100 m-0" style={{ fontSize: 13 }}>
      <thead>
        <tr className="bg-opacity-10">
          {['#', 'Pergunta', 'Sua resposta', 'Correta', ''].map((h) => (
            <th
              key={h}
              className="px-3 py-2 text-start small fw-bold text-uppercase border-bottom"
              style={{ color: isDark ? '#94a3b8' : '#475569', letterSpacing: '0.07em' }}
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
            className={`border-bottom ${item.isCorrect ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'}`}
          >
            <td className="px-3 py-2 text-muted">{i + 1}</td>
            <td className="px-3 py-2">{item.question}</td>
            <td
              className="px-3 py-2 text-center fw-bold"
              style={{ color: item.isCorrect ? '#22c55e' : '#ef4444' }}
            >
              {item.userAnswer}
            </td>
            <td className="px-3 py-2 text-center fw-bold text-success">{item.correctAnswer}</td>
            <td className="px-3 py-2 text-center fs-5">{item.isCorrect ? '✅' : '❌'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export const FilterGroupHeader = ({ icon, title, subtitle }) => (
  <div className="mb-1">
    <div className="d-flex align-items-center gap-2 mb-1">
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '0.02em',
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </span>
    </div>
    {subtitle && (
      <div className="text-body-secondary small" style={{ marginLeft: 28, fontSize: 12 }}>
        {subtitle}
      </div>
    )}
  </div>
)

export const ChecklistItem = ({
  icon,
  title,
  subtitle,
  children,
  isOpen,
  onToggle,
  isCompleted,
  ctaLabel,
  onCta,
}) => (
  <div
    className={`mb-3 rounded-4 border transition-colors ${isOpen ? 'shadow-sm border-primary' : 'bg-body-tertiary border-transparent'}`}
    style={{ transition: 'background-color 0.3s, border-color 0.3s, box-shadow 0.3s', overflow: 'visible' }}
  >
    <button
      type="button"
      aria-expanded={isOpen}
      className="p-3 d-flex align-items-center justify-content-between w-100 border-0 text-start cursor-pointer"
      style={{
        background: isOpen ? 'rgba(var(--cui-primary-rgb), 0.03)' : 'transparent',
      }}
      onClick={onToggle}
    >
      <div className="d-flex align-items-center gap-3">
        <div
          className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${isCompleted ? 'bg-success text-white' : isOpen ? 'bg-primary text-white' : 'bg-secondary text-white'}`}
          style={{ width: 40, height: 40, transition: 'background-color 0.3s, color 0.3s', flexShrink: 0 }}
        >
          {isCompleted ? '✓' : icon}
        </div>
        <div>
          <h6 className="mb-0 fw-bold" style={{ fontSize: 15 }}>
            {title}
          </h6>
          <div className="text-body-secondary" style={{ fontSize: 12, opacity: 0.8 }}>
            {subtitle}
          </div>
        </div>
      </div>
      <div
        className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
      >
        ▼
      </div>
    </button>
    {isOpen && (
      <div className="px-4 pb-4 pt-2 border-top bg-body">
        {children}
        {ctaLabel && (
          <div className="d-flex justify-content-end mt-3">
            <CButton
              color="primary"
              size="sm"
              variant="outline"
              className="rounded-pill px-3"
              onClick={(e) => {
                e.stopPropagation()
                onCta && onCta()
              }}
            >
              {ctaLabel}
            </CButton>
          </div>
        )}
      </div>
    )}
  </div>
)
