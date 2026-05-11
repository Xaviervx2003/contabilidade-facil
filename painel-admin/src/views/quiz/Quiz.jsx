import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
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
import { API_URL } from '../../config'
import { calculateGrade, formatSeconds, shuffle } from '../../utils/quizUtils'
import MateriaMultiSelect from '../../components/MateriaMultiSelect'
import { useTheme } from '../../context/themeContext'
import { getMatricula } from '../../utils/auth'

/* ─── Utilitários Locais (Bulletproof) ───────────────────────────────────────── */
const calculateScore = (total, correct) => {
  if (!total || total === 0) return 0
  return Number(((correct * 100) / total).toFixed(2))
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
  } catch {}
}

/* ─── Skeleton de carregamento ───────────────────────────────────────────────── */
const SkeletonQuiz = ({ isDark }) => {
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

/* ─── Tabela de revisão ──────────────────────────────────────────────────────── */
const ReviewTable = ({ questionsAndAnswers, isDark }) => (
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

/* ─── Subcomponentes das telas ───────────────────────────────────────────────── */

const FilterGroupHeader = ({ icon, title, subtitle }) => (
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

const ChecklistItem = ({
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
    <div
      className="p-3 d-flex align-items-center justify-content-between cursor-pointer"
      style={{
        cursor: 'pointer',
        background: isOpen ? 'rgba(var(--cui-primary-rgb), 0.03)' : 'transparent',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
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
    </div>
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

const ReadyScreen = ({
  materias,
  materiasSelected,
  setMateriasSelected,
  disciplinaPai,
  setDisciplinaPai,
  filtrosDisponiveis,
  bancaSelecionada,
  setBancaSelecionada,
  orgaoSelecionado,
  setOrgaoSelecionado,
  cargoSelecionado,
  setCargoSelecionado,
  anoSelecionado,
  setAnoSelecionado,
  quantidade,
  setQuantidade,
  tempoLimite,
  setTempoLimite,
  modoEstudo,
  setModoEstudo,
  onStartPersonalizado,
  onStartSimuladoRapido,
}) => {
  const [activeStep, setActiveStep] = useState(0)

  // Tópicos sugeridos baseados no Exame de Suficiência CFC
  const TOPICOS_RELEVANTES = [
    { nome: 'Contabilidade Geral', icon: '💎', peso: 'Alta' },
    { nome: 'Contabilidade de Custos', icon: '📊', peso: 'Média' },
    { nome: 'Ética Profissional', icon: '⚖️', peso: 'Alta' },
    { nome: 'Auditoria', icon: '🔍', peso: 'Média' },
    { nome: 'Direito', icon: '📜', peso: 'Média' },
  ]

  const selecionarSugerido = (nome) => {
    const d = materias.find(m => m.nome.toLowerCase().includes(nome.toLowerCase()) && !m.parent_id)
    if (d) {
      setDisciplinaPai(d.id)
      setActiveStep(1)
    }
  }

  const steps = [
    { id: 0, title: 'Disciplina', icon: '1', completed: !!disciplinaPai },
    { id: 1, title: 'Assuntos', icon: '2', completed: materiasSelected.length > 0 },
    {
      id: 2,
      title: 'Filtros',
      icon: '3',
      completed: !!(bancaSelecionada || orgaoSelecionado || cargoSelecionado || anoSelecionado),
    },
    { id: 3, title: 'Regras', icon: '4', completed: true },
    { id: 4, title: 'Foco', icon: '5', completed: true },
  ]

  const progressValue = (steps.filter((s) => s.completed).length / steps.length) * 100

  const raizes = materias.filter((m) => !m.parent_id)
  const disciplinaNome = disciplinaPai ? raizes.find((r) => r.id === disciplinaPai)?.nome : ''

  return (
    <div style={{ animation: 'fade-up .35s ease' }}>
      <div className="text-center mb-4">
        <div className="text-uppercase text-secondary small fw-semibold mb-2" style={{ letterSpacing: '2px', fontSize: 10 }}>
          ⚙️ Painel de Controle
        </div>
        <h3 className="fw-bold mb-2">Configure seu Treino</h3>
        <p className="text-body-secondary small mx-auto" style={{ maxWidth: 400 }}>
          Personalize as matérias e filtros para começar.
        </p>
        <div className="px-4 mt-3">
          <CProgress
            value={progressValue}
            color="success"
            height={6}
            className="rounded-pill shadow-sm mb-1"
          />
          <div
            className="d-flex justify-content-between small text-body-secondary px-1"
            style={{ fontSize: 10 }}
          >
            <span>Início</span>
            <span>{Math.round(progressValue)}% concluído</span>
          </div>
        </div>
      </div>

      {/* Passo 0: Disciplina */}
      <ChecklistItem
        icon="📚"
        title="O que você quer estudar hoje?"
        subtitle={disciplinaPai ? `Disciplina: ${disciplinaNome}` : 'Selecione a matéria principal'}
        isOpen={activeStep === 0}
        onToggle={() => setActiveStep(activeStep === 0 ? -1 : 0)}
        isCompleted={steps[0].completed}
        ctaLabel="Confirmar Disciplina"
        onCta={() => setActiveStep(1)}
      >
        <div className="d-flex flex-column gap-2">
          {/* Seção de Tópicos Sugeridos */}
          <div className="mb-2 p-3 rounded-4 bg-body-secondary bg-opacity-25 border border-dashed border-primary border-opacity-25">
            <div className="text-uppercase fw-bold text-primary mb-2" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
              🔥 Temas Relevantes (CFC)
            </div>
            <div className="d-flex flex-wrap gap-2">
              {TOPICOS_RELEVANTES.map((t) => (
                <div
                  key={t.nome}
                  role="button"
                  tabIndex={0}
                  onClick={() => selecionarSugerido(t.nome)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && selecionarSugerido(t.nome)}
                  className="px-3 py-2 rounded-pill border bg-body d-flex align-items-center gap-2 transition-all hover-translate-y-px shadow-sm"
                  style={{ cursor: 'pointer', fontSize: 12 }}
                >
                  <span>{t.icon}</span>
                  <span className="fw-semibold text-body-primary">{t.nome}</span>
                  <CBadge color={t.peso === 'Alta' ? 'danger' : 'warning'} className="rounded-pill" style={{ fontSize: 9 }}>
                    {t.peso}
                  </CBadge>
                </div>
              ))}
            </div>
          </div>

          <hr className="my-2 opacity-50" />

          <div className="text-uppercase fw-bold text-secondary mb-2" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
            📚 Selecione uma Disciplina
          </div>
          <CRow className="g-3">
            {raizes.map((r) => (
              <CCol key={r.id} xs={12} sm={6}>
                <div
                  className={`p-3 rounded-4 border cursor-pointer h-100 transition-all ${disciplinaPai === r.id ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : 'bg-body-tertiary border-transparent hover-shadow-sm'}`}
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setDisciplinaPai(r.id)
                      setActiveStep(1)
                    }
                  }}
                  onClick={() => {
                    setDisciplinaPai(r.id)
                    setActiveStep(1)
                  }}
                >
                  <div className="d-flex flex-column h-100 justify-content-between">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div className={`rounded-circle d-flex align-items-center justify-content-center ${disciplinaPai === r.id ? 'bg-primary text-white' : 'bg-body border text-secondary'}`} style={{ width: 32, height: 32, fontSize: 14 }}>
                        📖
                      </div>
                      <span className={`fw-bold ${disciplinaPai === r.id ? 'text-primary' : 'text-body-primary'}`} style={{ fontSize: 14 }}>
                        {r.nome}
                      </span>
                    </div>
                    <div className="d-flex justify-content-end">
                      <CBadge color={disciplinaPai === r.id ? 'primary' : 'secondary'} variant="outline" className="rounded-pill px-2 py-1" style={{ fontSize: 10 }}>
                        {r.total_questoes} Questões
                      </CBadge>
                    </div>
                  </div>
                </div>
              </CCol>
            ))}
          </CRow>
        </div>
      </ChecklistItem>

      {/* Passo 1: Assuntos */}
      <ChecklistItem
        icon="🔍"
        title="Quais assuntos específicos?"
        subtitle={
          materiasSelected.length
            ? `${materiasSelected.length} tópicos selecionados`
            : `Escolha os assuntos de ${disciplinaNome || '...'}`
        }
        isOpen={activeStep === 1}
        onToggle={() => {
          if (!disciplinaPai) {
            alert('Selecione uma disciplina primeiro!')
            setActiveStep(0)
            return
          }
          setActiveStep(activeStep === 1 ? -1 : 1)
        }}
        isCompleted={steps[1].completed}
        ctaLabel="Confirmar Assuntos"
        onCta={() => setActiveStep(2)}
      >
        {!disciplinaPai ? (
          <div className="text-center py-4 text-body-secondary">
            Selecione uma disciplina no passo anterior primeiro.
          </div>
        ) : (
          <div className="mb-3">
            <div className="text-uppercase fw-bold text-secondary mb-2" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
              🎯 Assuntos Selecionados
            </div>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {materiasSelected.length === 0 ? (
                <span className="text-body-secondary small italic">Nenhum assunto selecionado</span>
              ) : (
                materiasSelected.map(id => {
                  const m = materias.find(x => String(x.id) === id)
                  return (
                    <CBadge key={id} color="primary" className="p-2 d-flex align-items-center gap-2 rounded-pill shadow-sm">
                      <span style={{ fontSize: 12 }}>{m?.nome || id}</span>
                      <span 
                        role="button" 
                        onClick={() => setMateriasSelected(prev => prev.filter(x => x !== id))}
                        className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center"
                        style={{ cursor: 'pointer', fontSize: 10, width: 16, height: 16, fontWeight: 'bold' }}
                      >
                        ×
                      </span>
                    </CBadge>
                  )
                })
              )}
            </div>
            <MateriaMultiSelect
              materias={materias}
              selected={materiasSelected}
              onChange={setMateriasSelected}
              esconderVazias={true}
              inline={true}
              rootId={disciplinaPai}
            />
          </div>
        )}
      </ChecklistItem>

      {/* Passo 2: Dados do Concurso */}
      <ChecklistItem
        icon="🏛️"
        title="Dados do Concurso (Opcional)"
        subtitle="Filtre por banca, órgão ou ano específico"
        isOpen={activeStep === 2}
        onToggle={() => setActiveStep(activeStep === 2 ? -1 : 2)}
        isCompleted={steps[2].completed}
        ctaLabel="Continuar"
        onCta={() => setActiveStep(3)}
      >
        <CRow className="g-3">
          <CCol xs={12} sm={6}>
            <label className="form-label fw-semibold mb-1" style={{ fontSize: 12 }}>
              Banca
            </label>
            <CFormSelect
              size="sm"
              className="rounded-3"
              value={bancaSelecionada}
              onChange={(e) => setBancaSelecionada(e.target.value)}
            >
              <option value="">Todas as Bancas</option>
              {filtrosDisponiveis.bancas.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12} sm={6}>
            <label className="form-label fw-semibold mb-1" style={{ fontSize: 12 }}>
              Órgão
            </label>
            <CFormSelect
              size="sm"
              className="rounded-3"
              value={orgaoSelecionado}
              onChange={(e) => setOrgaoSelecionado(e.target.value)}
            >
              <option value="">Todos os Órgãos</option>
              {filtrosDisponiveis.orgaos.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12} sm={6}>
            <label className="form-label fw-semibold mb-1" style={{ fontSize: 12 }}>
              Cargo
            </label>
            <CFormSelect
              size="sm"
              className="rounded-3"
              value={cargoSelecionado}
              onChange={(e) => setCargoSelecionado(e.target.value)}
            >
              <option value="">Todos os Cargos</option>
              {filtrosDisponiveis.cargos.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12} sm={6}>
            <label className="form-label fw-semibold mb-1" style={{ fontSize: 12 }}>
              Ano
            </label>
            <CFormSelect
              size="sm"
              className="rounded-3"
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
            >
              <option value="">Todos os Anos</option>
              {filtrosDisponiveis.anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </CRow>
      </ChecklistItem>

      {/* Passo 3: Configuração */}
      <ChecklistItem
        icon="⚙️"
        title="Regras do Simulado"
        subtitle={`${quantidade === 0 ? 'Todas' : quantidade} questões · ${tempoLimite / 60} minutos`}
        isOpen={activeStep === 3}
        onToggle={() => setActiveStep(activeStep === 3 ? -1 : 3)}
        isCompleted={steps[3].completed}
        ctaLabel="Confirmar Regras"
        onCta={() => setActiveStep(4)}
      >
        <CRow className="g-3">
          <CCol xs={6}>
            <label className="form-label fw-semibold mb-2" style={{ fontSize: 12 }}>
              Selecione a Quantidade
            </label>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {[10, 20, 50, 0].map(val => (
                <CButton
                  key={val}
                  size="sm"
                  color="primary"
                  variant={quantidade === val ? 'solid' : 'outline'}
                  className="rounded-pill px-3"
                  onClick={() => setQuantidade(val)}
                >
                  {val === 0 ? 'Todas' : val}
                </CButton>
              ))}
              <CButton
                size="sm"
                color="secondary"
                variant={![0, 10, 20, 50].includes(quantidade) ? 'solid' : 'outline'}
                className="rounded-pill px-3"
                onClick={() => setQuantidade(5)}
              >
                Personalizado
              </CButton>
            </div>
            {![0, 10, 20, 50].includes(quantidade) && (
              <CFormInput
                type="number"
                size="sm"
                className="mt-2 rounded-3"
                placeholder="Digite a qtd..."
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
              />
            )}
          </CCol>
          <CCol xs={6}>
            <label className="form-label fw-semibold mb-1" style={{ fontSize: 12 }}>
              Tempo
            </label>
            <CFormSelect
              size="sm"
              className="rounded-3"
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
      </ChecklistItem>

      {/* Passo 4: Modo de Estudo */}
      <ChecklistItem
        icon="🎯"
        title="Foco do Treino"
        subtitle={
          modoEstudo === 'todas'
            ? 'Todas as questões'
            : modoEstudo === 'erros'
              ? 'Apenas erros'
              : 'Não respondidas'
        }
        isOpen={activeStep === 4}
        onToggle={() => setActiveStep(activeStep === 4 ? -1 : 4)}
        isCompleted={steps[4].completed}
      >
        <CRow className="g-2">
          {[
            { id: 'todas', icon: '📋', label: 'Todas', desc: 'Geral' },
            { id: 'nao_respondidas', icon: '🆕', label: 'Inéditas', desc: 'Novas' },
            { id: 'erros', icon: '❌', label: 'Erros', desc: 'Revisão' },
          ].map((m) => (
            <CCol key={m.id} xs={4}>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setModoEstudo(m.id)
                  }
                }}
                onClick={() => setModoEstudo(m.id)}
                className={`rounded-4 p-3 text-center transition-all h-100 ${modoEstudo === m.id ? 'bg-primary text-white shadow-sm' : 'bg-body-tertiary border hover-shadow-sm'}`}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease', transform: modoEstudo === m.id ? 'scale(1.05)' : 'scale(1)' }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>{m.icon}</div>
                <div className="fw-bold" style={{ fontSize: 13 }}>{m.label}</div>
                <div className={`small opacity-75 ${modoEstudo === m.id ? 'text-white' : 'text-secondary'}`} style={{ fontSize: 10 }}>{m.desc}</div>
              </div>
            </CCol>
          ))}
        </CRow>
      </ChecklistItem>

      <div className="mt-4 pt-3 border-top">
        <CButton
          color="primary"
          size="lg"
          className="w-100 fw-bold rounded-4 shadow-sm mb-3 py-3 d-flex align-items-center justify-content-center gap-2"
          onClick={onStartPersonalizado}
          disabled={!steps[0].completed}
          style={{ letterSpacing: '0.5px' }}
        >
          🚀 Iniciar Treino Personalizado
        </CButton>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onStartSimuladoRapido()
            }
          }}
          className="rounded-4 p-3 border d-flex align-items-center gap-3 cursor-pointer transition-colors hover-shadow"
          style={{
            cursor: 'pointer',
            background:
              'linear-gradient(135deg, rgba(var(--cui-info-rgb), 0.05) 0%, rgba(var(--cui-primary-rgb), 0.05) 100%)',
            border: '1px dashed var(--cui-info)',
            transition: 'box-shadow 0.2s, border-color 0.2s'
          }}
          onClick={onStartSimuladoRapido}
        >
          <div
            className="rounded-circle bg-info text-white d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 48, height: 48, fontSize: 24 }}
          >
            ⚡
          </div>
          <div className="flex-1">
            <h6 className="mb-0 fw-bold text-info">Simulado Relâmpago</h6>
            <small className="text-body-secondary">10 questões aleatórias · 15 minutos</small>
          </div>
          <div className="text-info fw-bold">Ir ›</div>
        </div>
      </div>
    </div>
  )
}

const QuizRunning = ({
  T,
  isDark,
  currentQuestion,
  queue,
  totalQuestions,
  totalAnswered,
  progress,
  selectedOption,
  isAnswerConfirmed,
  isRevisiting,
  pendingSkipped,
  showDica,
  onToggleDica,
  onSelectOption,
  onConfirmAnswer,
  onNextQuestion,
  onSkip,
  onFinishEarly,
  onToggleFullscreen,
  isFullscreen,
  remainingSeconds,
  timerCritical,
  soundEnabled,
  favoritos,
  onAlternarFavorito,
  onSendComment,
  commentText,
  setCommentText,
  commentStatus,
  isConfusing,
  setIsConfusing,
  handleFinishEarly,
  setError,
}) => {
  const ValLetra = (idx) => LETTERS[idx]

  return (
    <div style={{ animation: 'fade-up .3s ease' }}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="text-uppercase text-secondary fw-bold" style={{ fontSize: 11, letterSpacing: '0.1em' }}>
          Questão {totalAnswered + 1} <span className="text-body-tertiary">/ {totalQuestions}</span>
        </div>
        <div className="fw-bold tabular-nums text-primary" style={{ fontSize: 13 }}>{Math.round(progress)}%</div>
      </div>
      <CProgress value={progress} color="primary" className="mb-3" height={6} />

      {isRevisiting && (
        <CAlert color="warning" className="py-2 small mb-3">
          <strong>🔄 Revisando questão pulada</strong>
        </CAlert>
      )}

      {pendingSkipped > 0 && !isRevisiting && (
        <div className="mb-3">
          <CBadge color="info" shape="rounded-pill">
            ⏭ {pendingSkipped}{' '}
            {pendingSkipped === 1 ? 'questão pulada aguardando' : 'questões puladas aguardando'}
          </CBadge>
        </div>
      )}

      {currentQuestion.dica && !isAnswerConfirmed && (
        <div className="mb-3">
          <CButton color="warning" variant="outline" size="sm" onClick={onToggleDica}>
            💡 {showDica ? 'Ocultar dica' : 'Ver dica'}
          </CButton>
          {showDica && (
            <CAlert color="warning" className="mt-2 py-2 small">
              <strong>💡 Dica:</strong> {currentQuestion.dica}
            </CAlert>
          )}
        </div>
      )}

      <div className="mb-4 pt-1">
        <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
          <div className="px-3 py-1 rounded-pill bg-body-tertiary border d-flex align-items-center gap-2 shadow-sm">
            <CIcon icon={cilCheckCircle} className="text-primary" size="sm" />
            <span
              className="fw-bold text-uppercase"
              style={{ fontSize: 10, letterSpacing: '0.05em' }}
            >
              Concurso
            </span>
          </div>
          {[
            currentQuestion.banca,
            currentQuestion.ano,
            currentQuestion.orgao,
            currentQuestion.cargo,
          ]
            .filter(Boolean)
            .map((tag, idx) => (
              <CBadge
                key={idx}
                color="info"
                variant="outline"
                shape="rounded-pill"
                className="px-3 py-2 fw-medium border-info bg-info bg-opacity-10 text-info"
                style={{ fontSize: 11 }}
              >
                {tag}
              </CBadge>
            ))}
        </div>
        <div className="d-flex align-items-start gap-3">
          <div className="flex-grow-1">
            <p
              className="mb-0 fs-5 fw-bold text-reading"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {currentQuestion.question}
            </p>
          </div>
          <button
            onClick={() => onAlternarFavorito(currentQuestion.id)}
            className="btn btn-secondary shadow-sm p-2 rounded-circle border d-flex align-items-center justify-content-center"
            style={{
              width: 40,
              height: 40,
              transition: '0.2s',
              backgroundColor: 'var(--color-bg-elevated)',
            }}
            title={
              favoritos.includes(currentQuestion.id)
                ? 'Remover dos favoritos'
                : 'Adicionar aos favoritos'
            }
          >
            <CIcon
              icon={cilStar}
              style={{ color: favoritos.includes(currentQuestion.id) ? '#f59e0b' : '#94a3b8' }}
              width={20}
              height={20}
            />
          </button>
        </div>
      </div>

      <div className="d-flex flex-column gap-2 mb-4">
        {currentQuestion.options.map((option, idx) => {
          const val = LETTERS[idx]
          const isSelected = selectedOption === val
          const isCorrectAnswer = val === currentQuestion.answer
          
          let stateClass = 'bg-body border'
          let circleClass = 'bg-body-tertiary text-body-secondary'
          
          if (isAnswerConfirmed) {
            if (isCorrectAnswer) {
              stateClass = 'bg-success bg-opacity-10 border-success shadow-sm'
              circleClass = 'bg-success text-white'
            } else if (isSelected) {
              stateClass = 'bg-danger bg-opacity-10 border-danger'
              circleClass = 'bg-danger text-white'
            }
          } else if (isSelected) {
            stateClass = 'bg-primary bg-opacity-10 border-primary shadow-sm'
            circleClass = 'bg-primary text-white'
          }

          return (
            <div
              key={val}
              role="button"
              tabIndex={isAnswerConfirmed ? -1 : 0}
              onClick={() => !isAnswerConfirmed && onSelectOption(val)}
              onKeyDown={(e) => !isAnswerConfirmed && (e.key === 'Enter' || e.key === ' ') && onSelectOption(val)}
              className={`d-flex align-items-center gap-3 p-3 rounded-4 transition-all ${stateClass} ${!isAnswerConfirmed ? 'cursor-pointer hover-translate-y-px' : ''}`}
              style={{ cursor: isAnswerConfirmed ? 'default' : 'pointer', minHeight: 64 }}
            >
              <div 
                className={`rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0 transition-colors ${circleClass}`}
                style={{ width: 32, height: 32, fontSize: 14 }}
              >
                {val}
              </div>
              <div className={`flex-grow-1 ${isSelected || (isAnswerConfirmed && isCorrectAnswer) ? 'fw-bold' : ''}`} style={{ fontSize: 14, lineHeight: 1.5 }}>
                {option}
              </div>
            </div>
          )
        })}
      </div>

      {isAnswerConfirmed && (
        <CAlert
          color={selectedOption === currentQuestion.answer ? 'success' : 'danger'}
          className="d-flex align-items-center"
        >
          <CIcon
            icon={selectedOption === currentQuestion.answer ? cilCheckCircle : cilXCircle}
            className="me-2 flex-shrink-0"
          />
          <div>
            {selectedOption === currentQuestion.answer ? 'Correto!' : 'Incorreto'} — Resposta
            correta: <strong>{currentQuestion.answer}</strong>
            {currentQuestion.tentativas > 0 && (
              <div className="small mt-1">
                👥 {Math.round((currentQuestion.acertos / currentQuestion.tentativas) * 100)}% dos
                alunos acertaram.
              </div>
            )}
          </div>
        </CAlert>
      )}

      <div
        className="d-flex flex-column flex-md-row justify-content-md-between align-items-stretch align-items-md-center gap-2 mt-3 sticky-bottom bg-body py-3 border-top"
        style={{ zIndex: 1 }}
      >
        <div className="d-flex gap-2 order-2 order-md-1 justify-content-center">
          <CButton
            color="danger"
            variant="outline"
            size="sm"
            onClick={onFinishEarly}
            disabled={totalAnswered === 0}
          >
            ⛔ Encerrar
          </CButton>
          {!isAnswerConfirmed && queue.length > 1 && (
            <CButton color="secondary" variant="outline" size="sm" onClick={onSkip}>
              ⏭ Pular
            </CButton>
          )}
        </div>
        <div className="order-1 order-md-2 w-100" style={{ maxWidth: '400px', margin: '0 auto' }}>
          {!isAnswerConfirmed ? (
            <CButton
              color="success"
              disabled={!selectedOption}
              onClick={onConfirmAnswer}
              className="fw-bold px-4 py-2 w-100"
            >
              Confirmar resposta
            </CButton>
          ) : (
            <CButton color="primary" onClick={onNextQuestion} className="fw-bold px-4 py-2 w-100">
              {queue.length <= 1 ? 'Finalizar Quiz ✓' : 'Próxima →'}
            </CButton>
          )}
        </div>
      </div>

      {isAnswerConfirmed && (
        <CRow className="mt-4">
          <CCol md={6} className="mb-3 mb-md-0">
            <div className={`bg-info bg-opacity-10 rounded-3 overflow-hidden`}>
              <div className="px-3 py-2 bg-info bg-opacity-25 fw-bold text-info">
                <CIcon icon={cilLightbulb} className="me-1" /> Explicação do Professor
              </div>
              <div className="p-3 small text-pre-wrap">
                {currentQuestion.explicacao || 'Nenhuma explicação adicional.'}
              </div>
              {currentQuestion.link_video && (
                <div className="px-3 pb-3">
                  <div className="fw-bold text-danger small mb-2">
                    <CIcon icon={cilVideo} /> Vídeo de Apoio
                  </div>
                  <div className="ratio ratio-16x9 rounded overflow-hidden">
                    <iframe
                      src={obterLinkEmbed(currentQuestion.link_video)}
                      title="Vídeo"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          </CCol>
          <CCol md={6}>
            {currentQuestion.comentarios_publicos?.length > 0 && (
              <div className="bg-success bg-opacity-10 rounded-3 overflow-hidden mb-3">
                <div className="px-3 py-2 bg-success bg-opacity-25 fw-bold text-success">
                  💬 Comentários da Comunidade
                </div>
                <div className="p-3">
                  {currentQuestion.comentarios_publicos.map((c, i) => (
                    <div
                      key={i}
                      className={`${i < currentQuestion.comentarios_publicos.length - 1 ? 'mb-3' : ''}`}
                    >
                      <div className="d-flex justify-content-between">
                        <strong className="text-success small">{c.nome_aluno}</strong>
                        <small className="text-body-secondary">
                          {new Date(c.data_criacao).toLocaleDateString('pt-BR')}
                        </small>
                      </div>
                      <p className="small fst-italic mt-1 mb-0">"{c.texto}"</p>
                      {c.resposta_professor && (
                        <div className="mt-2 ms-3 p-2 bg-primary bg-opacity-10 border-start border-primary border-3 rounded-end">
                          <small className="fw-bold text-primary">👨🏫 Professor:</small>{' '}
                          <small className="text-body-secondary">{c.resposta_professor}</small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-body-tertiary rounded-3 p-3">
              <div className="d-flex justify-content-between mb-2">
                <small className="fw-bold text-body-secondary">💬 Feedback</small>
                <CButton
                  color="warning"
                  size="sm"
                  variant={isConfusing ? undefined : 'outline'}
                  onClick={() => setIsConfusing(!isConfusing)}
                  disabled={commentStatus === 'sent'}
                >
                  {isConfusing ? '⚠️ Confusa' : 'Marcar confusa'}
                </CButton>
              </div>
              <CFormTextarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Descreva sua dúvida..."
                aria-label="Descreva sua dúvida"
                autoComplete="off"
                maxLength={300}
                disabled={commentStatus === 'sent'}
              />
              <div className="d-flex justify-content-between mt-2">
                <small className="text-body-secondary">{commentText.length}/300</small>
                {commentStatus === 'sent' ? (
                  <CButton color="success" size="sm" disabled>
                    ✅ Enviado
                  </CButton>
                ) : (
                  <CButton
                    color="info"
                    size="sm"
                    onClick={onSendComment}
                    disabled={!commentText.trim() && !isConfusing}
                  >
                    Enviar
                  </CButton>
                )}
              </div>
            </div>
          </CCol>
        </CRow>
      )}
    </div>
  )
}

const FinishedScreen = ({
  T,
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
  // 🧠 Padrão defensivo: validar dados antes de renderizar
  const validTabs = useMemo(() => ['stats', 'qna'], [])
  const safeActiveTab = validTabs.includes(activeTab) ? activeTab : 'stats'

  const handleTabChange = useCallback(
    (tab) => {
      if (validTabs.includes(tab)) setActiveTab(tab)
    },
    [validTabs, setActiveTab],
  )

  return (
    <div style={{ animation: 'fade-up .35s ease' }}>
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
                className={`px-3 px-md-4 py-3 border-0 bg-transparent fw-bold transition-colors ${
                  isActive
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
          {grade.grade}
        </CBadge>
        {grade.remarks && <p className="text-body-secondary mb-3">{grade.remarks}</p>}

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
          <CButton color="primary" onClick={onReplay}>
            🔄 Refazer
          </CButton>
          {score < totalAnswered && (
            <CButton color="danger" variant="outline" onClick={onRetryErrors}>
              ❌ Refazer erros ({totalAnswered - score})
            </CButton>
          )}
          <CButton color="success" variant="outline" onClick={onShare}>
            📤 Compartilhar
          </CButton>
          <CButton color="secondary" variant="outline" onClick={onReset}>
            🏠 Voltar
          </CButton>
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
    </div>
  )
}

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
  const [filtrosDisponiveis, setFiltrosDisponiveis] = useState({
    bancas: [],
    orgaos: [],
    cargos: [],
    anos: [],
  })
  const [loadingMaterias, setLoadingMaterias] = useState(true)

  const nomeAluno = sessionStorage.getItem('nome') || 'Aluno'
  const matricula = getMatricula()

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
        .catch(() => {})
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {})
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

  // Load favorites
  useEffect(() => {
    if (!matricula) return
    fetch(`${API_URL}/api/favoritos/${matricula}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const ids = Array.isArray(data) ? data.map((item) => item.questao_id) : []
        setFavoritos(ids)
      })
      .catch(() => {})
  }, [matricula])

  const alternarFavorito = async (questaoId) => {
    if (!matricula) return
    const ehFavorito = favoritos.includes(questaoId)
    if (ehFavorito) {
      await fetch(`${API_URL}/api/favoritos/remover/${questaoId}?matricula=${matricula}`, {
        method: 'DELETE',
      })
      setFavoritos((prev) => prev.filter((id) => id !== questaoId))
    } else {
      await fetch(`${API_URL}/api/favoritos/adicionar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula, questao_id: questaoId }),
      })
      setFavoritos((prev) => [...prev, questaoId])
    }
  }

  // Fetch materias and unique filters
  useEffect(() => {
    setLoadingMaterias(true)
    fetch(`${API_URL}/api/admin/materias`)
      .then((r) => r.json())
      .then((d) => {
        setMaterias(Array.isArray(d) ? d : [])
        setLoadingMaterias(false)
      })
      .catch(() => {
        setLoadingMaterias(false)
      })

    fetch(`${API_URL}/api/questoes/valores-unicos`)
      .then((r) => r.json())
      .then((d) => setFiltrosDisponiveis(d))
      .catch(() => {})
  }, [])

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
      // Se não houver snapshot, verificamos se veio por Estudo Dirigido (IDs específicos)
      const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
      if (params.get('ids')) {
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
    } catch {}
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
    if (status === 'finished' && !saved) handleSaveSession()
  }, [status, saved])

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

  const fetchAndStart = async () => {
    setError('')
    setFeedback('')
    setStatus('loading')
    try {
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
      const res = await fetch(url)
      const responseJson = await res.json()
      let data = responseJson.sucesso !== undefined ? responseJson.dados : responseJson

      if (!res.ok || !Array.isArray(data) || data.length === 0)
        throw new Error(responseJson.mensagem || 'Nenhuma questão encontrada para este filtro.')
      let pool = shuffle(data)
      if (quantidade > 0 && quantidade < pool.length) pool = pool.slice(0, quantidade)
      startQuiz(pool)
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
      const res = await fetch(`${API_URL}/api/questoes?limit=30`)
      const responseJson = await res.json()
      let data = responseJson.sucesso !== undefined ? responseJson.dados : responseJson

      if (!res.ok || !Array.isArray(data) || data.length === 0)
        throw new Error(responseJson.mensagem || 'Nenhuma questão encontrada.')
      startQuizWithTime(shuffle(data).slice(0, 10), 600)
    } catch (err) {
      setError(err.message || 'Erro ao buscar questões.')
      setStatus('ready')
    }
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

  const handleSendComment = async () => {
    if (!commentText.trim() && !isConfusing) return
    setCommentStatus('sending')
    try {
      const q = questions[queue[0]]
      await fetch(`${API_URL}/api/feedbacks_questoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questao_id: q.id,
          nome_aluno: nomeAluno,
          texto: commentText,
          marcada_confusa: isConfusing,
        }),
      })
      setCommentStatus('sent')
    } catch {
      setError('Falha ao enviar comentário.')
      setCommentStatus('idle')
    }
  }

  const handleFinishEarly = () => {
    if (!window.confirm('Encerrar o simulado?')) return
    sessionStorage.removeItem(SESSION_KEY)
    setElapsedSeconds(Math.round((Date.now() - startTime) / 1000))
    setFeedback(
      `Simulado encerrado. ${questionsAndAnswers.length} de ${questions.length} questões respondidas.`,
    )
    setStatus('finished')
  }

  const handleRetryErrors = () => {
    const wrongIds = new Set(questionsAndAnswers.filter((qa) => !qa.isCorrect).map((qa) => qa.id))
    const wrongQuestions = questions.filter((q) => wrongIds.has(q.id))
    if (wrongQuestions.length === 0) {
      alert('Parabéns! Você não errou nenhuma questão. 🎉')
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

  const handleSaveSession = useCallback(async () => {
    if (status !== 'finished' || saved) return
    setSaving(true)
    setError('')
    try {
      const respondidas = questionsAndAnswers.length
      const porcentagem = calculateScore(respondidas, score)
      const matriculaOuNome = matricula || nomeAluno
      const materiaLabel =
        materiasSelected.length > 0
          ? materias
              .filter((m) => materiasSelected.includes(String(m.id)))
              .map((m) => m.nome)
              .join(', ') || 'Quiz de Contabilidade'
          : 'Quiz de Contabilidade'
      const res = await fetch(`${API_URL}/api/sessoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_aluno: matriculaOuNome,
          assunto_estudado: materiaLabel,
          questoes_respondidas: respondidas,
          taxa_acerto: porcentagem,
          tempo_gasto_segundos: elapsedSeconds,
          lista_detalhes: questionsAndAnswers.map((qa) => ({ id: qa.id, acertou: qa.isCorrect })),
        }),
      })
      if (!res.ok) throw new Error()

      // Se veio de uma trilha (Módulo), marca como concluído automaticamente
      const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
      const moduloId = params.get('modulo_id')
      if (moduloId && matricula) {
        try {
          await fetch(`${API_URL}/api/trilhas/progresso/${moduloId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matricula }),
          })
        } catch (e) {
          console.error('Erro ao marcar progresso do módulo:', e)
        }
      }

      setSaved(true)
      setFeedback('Sessão salva com sucesso no dashboard.')
    } catch {
      setError('Não foi possível salvar a sessão.')
    } finally {
      setSaving(false)
    }
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
  ])

  const handleShare = useCallback(async () => {
    const totalResp = questionsAndAnswers.length
    const scorePerc = calculateScore(totalResp || questions.length, score)
    const m = Math.floor(elapsedSeconds / 60)
    const s = elapsedSeconds % 60
    const text = `🎓 Fiz o Quiz de Contabilidade Fácil!\n✅ ${score} acertos de ${totalResp} (${scorePerc}%)\n⏱ Tempo: ${m}m ${s}s\n📘 Estude também em Contabilidade Fácil!`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Quiz de Contabilidade', text })
      } else {
        await navigator.clipboard.writeText(text)
        alert('✅ Copiado!')
      }
    } catch {}
  }, [elapsedSeconds, score, questionsAndAnswers, questions])

  // Derived values
  const currentIndex = queue[0] ?? 0
  const currentQuestion = (status === 'quiz' && queue.length > 0) ? (questions[currentIndex] ?? null) : null
  const totalAnswered = questionsAndAnswers.length
  const totalQuestions = questions.length
  const finalScore = calculateScore(totalAnswered || totalQuestions, score)
  const timerCritical = remainingSeconds <= 60
  const progress = totalQuestions ? (totalAnswered / totalQuestions) * 100 : 0
  const isRevisiting = status === 'quiz' && skippedSet.has(currentIndex)
  const pendingSkipped = skippedSet.size - (isRevisiting ? 1 : 0)
  const grade = useMemo(() => calculateGrade(finalScore), [finalScore])
  const gradeColor =
    finalScore >= 90
      ? 'success'
      : finalScore >= 70
        ? 'info'
        : finalScore >= 60
          ? 'warning'
          : 'danger'

  // Render
  return (
    <CContainer fluid className="py-3 py-md-4 px-3 px-md-4">
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes fade-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {savedSnapshot && status === 'ready' && (
        <CAlert
          color="warning"
          className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4"
        >
          <span>
            📌 Você tem um quiz em andamento ({savedSnapshot.questionsAndAnswers?.length ?? 0}{' '}
            questões respondidas).
          </span>
          <div className="d-flex gap-2 flex-shrink-0">
            <CButton color="warning" size="sm" onClick={() => resumeSnapshot(savedSnapshot)}>
              Continuar
            </CButton>
            <CButton
              color="secondary"
              size="sm"
              variant="outline"
              onClick={() => {
                setSavedSnapshot(null)
                sessionStorage.removeItem(SESSION_KEY)
              }}
            >
              Descartar
            </CButton>
          </div>
        </CAlert>
      )}

      <CRow className="justify-content-center">
        <CCol xs={12} xl={10}>
          <CCard className="shadow border-0 overflow-hidden">
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
