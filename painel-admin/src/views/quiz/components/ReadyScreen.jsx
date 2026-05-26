import React, { useState, useMemo } from 'react';
import { CButton, CProgress, CBadge, CFormInput, CFormSelect, CFormCheck, CFormSwitch } from '@coreui/react';
import { Icon } from '@iconify/react';
import { ChecklistItem, FilterGroupHeader } from './QuizComponents';
import { tokens } from '../../../tokens';

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
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleLimit, setVisibleLimit] = useState(6)
  const [modoFoco, setModoFoco] = useState('concurso') // 'concurso' | 'faculdade'
  const [periodoSelecionado, setPeriodoSelecionado] = useState(null)
  const [disciplinaFaculdade, setDisciplinaFaculdade] = useState(null)


  // Tópicos sugeridos baseados no Exame de Suficiência CFC
  const TOPICOS_RELEVANTES = [
    { nome: 'Contabilidade Geral', icon: '💎', peso: 'Alta' },
    { nome: 'Contabilidade de Custos', icon: '📊', peso: 'Média' },
    { nome: 'Ética Profissional', icon: '⚖️', peso: 'Alta' },
    { nome: 'Auditoria', icon: '🔍', peso: 'Média' },
    { nome: 'Direito', icon: '📜', peso: 'Média' },
  ]

  const selecionarSugerido = (nomeMateria) => {
    const matchedMateria = materias.find(
      (materia) => materia.nome.toLowerCase().includes(nomeMateria.toLowerCase()) && !materia.parent_id
    )
    if (matchedMateria) {
      setDisciplinaPai(matchedMateria.id)
      setActiveStep(1)
    }
  }

  const steps = [
    { id: 0, title: modoFoco === 'concurso' ? 'Disciplina' : 'Período', icon: '1', completed: modoFoco === 'concurso' ? !!disciplinaPai : !!disciplinaFaculdade },
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

  const progressValue = (steps.filter((step) => step.completed).length / steps.length) * 100

  const raizes = useMemo(() => {
    return materias
      .filter((materia) => !materia.parent_id)
      .filter((materia) => materia.nome.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [materias, searchTerm])

  const disciplinaNome = disciplinaPai ? materias.find((materia) => materia.id === disciplinaPai)?.nome : ''

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
          {/* Toggle Switch Elegante */}
          <div className="d-flex justify-content-center mb-4">
            <div className="bg-body-secondary rounded-pill p-1 d-inline-flex" style={{ border: '1px solid var(--cui-border-color)' }}>
              <CButton
                color={modoFoco === 'concurso' ? 'primary' : 'secondary'}
                variant={modoFoco === 'concurso' ? '' : 'ghost'}
                className="rounded-pill px-4 py-2 fw-bold transition-all"
                onClick={() => {
                  setModoFoco('concurso')
                  setPeriodoSelecionado(null)
                  setDisciplinaFaculdade(null)
                  setDisciplinaPai(null)
                  setMateriasSelected([])
                  setActiveStep(0)
                }}
                style={{ fontSize: 13, border: 'none' }}
              >
                🎯 Foco Concurso/CFC
              </CButton>
              <CButton
                color={modoFoco === 'faculdade' ? 'primary' : 'secondary'}
                variant={modoFoco === 'faculdade' ? '' : 'ghost'}
                className="rounded-pill px-4 py-2 fw-bold transition-all"
                onClick={() => {
                  setModoFoco('faculdade')
                  setPeriodoSelecionado(null)
                  setDisciplinaFaculdade(null)
                  setDisciplinaPai(null)
                  setMateriasSelected([])
                  setActiveStep(0)
                }}
                style={{ fontSize: 13, border: 'none' }}
              >
                🎓 Foco Faculdade
              </CButton>
            </div>
          </div>

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

      {/* Passo 0: Disciplina ou Período */}
      <ChecklistItem
        icon="📚"
        title="O que você quer estudar hoje?"
        subtitle={
          modoFoco === 'concurso'
            ? (disciplinaPai ? `Disciplina: ${disciplinaNome}` : 'Selecione a matéria principal')
            : (disciplinaFaculdade ? `Faculdade: ${disciplinaFaculdade.nome}` : 'Selecione seu período e disciplina')
        }
        isOpen={activeStep === 0}
        onToggle={() => setActiveStep(activeStep === 0 ? -1 : 0)}
        isCompleted={steps[0].completed}
        ctaLabel="Confirmar"
        onCta={() => setActiveStep(1)}
      >
        <div className="d-flex flex-column gap-2">
          {modoFoco === 'concurso' ? (
            <>
              {/* Seção de Tópicos Sugeridos */}
              <div className="mb-2 p-3 rounded-4 bg-body-secondary bg-opacity-25 border border-dashed border-primary border-opacity-25">
                <div className="text-uppercase fw-bold text-primary mb-2" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
                  🔥 Temas Relevantes (CFC)
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {TOPICOS_RELEVANTES.map((topico) => (
                    <div
                      key={topico.nome}
                      role="button"
                      tabIndex={0}
                      onClick={() => selecionarSugerido(topico.nome)}
                      onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && selecionarSugerido(topico.nome)}
                      className="px-3 py-2 rounded-pill border bg-body d-flex align-items-center gap-2 transition-all hover-translate-y-px shadow-sm"
                      style={{ cursor: 'pointer', fontSize: 12 }}
                    >
                      <span>{topico.icon}</span>
                      <span className="fw-semibold text-body-primary">{topico.nome}</span>
                      <CBadge color={topico.peso === 'Alta' ? 'danger' : 'warning'} className="rounded-pill" style={{ fontSize: 9 }}>
                        {topico.peso}
                      </CBadge>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="my-2 opacity-50" />

              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                <div className="text-uppercase fw-bold text-secondary" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
                  📚 Selecione uma Disciplina
                </div>
                <div className="position-relative" style={{ minWidth: '200px' }}>
                  <CFormInput
                    size="sm"
                    placeholder="🔍 Pesquisar disciplina..."
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value)
                      setVisibleLimit(6) // Reseta o limite ao pesquisar
                    }}
                    className="rounded-pill bg-body-tertiary border-0 px-3"
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>
              <CRow className="g-3">
                {raizes.slice(0, visibleLimit).map((materiaRaiz) => (
                  <CCol key={materiaRaiz.id} xs={12} sm={6}>
                    <div
                      className={`p-3 rounded-4 border cursor-pointer h-100 transition-all ${disciplinaPai === materiaRaiz.id ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : 'bg-body-tertiary border-transparent hover-shadow-sm'}`}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setDisciplinaPai(materiaRaiz.id)
                          setActiveStep(1)
                        }
                      }}
                      onClick={() => {
                        setDisciplinaPai(materiaRaiz.id)
                        setActiveStep(1)
                      }}
                    >
                      <div className="d-flex flex-column h-100 justify-content-between">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <div className={`rounded-circle d-flex align-items-center justify-content-center ${disciplinaPai === materiaRaiz.id ? 'bg-primary text-white' : 'bg-body border text-secondary'}`} style={{ width: 32, height: 32, fontSize: 14 }}>
                            📖
                          </div>
                          <span className={`fw-bold ${disciplinaPai === materiaRaiz.id ? 'text-primary' : 'text-body-primary'}`} style={{ fontSize: 14 }}>
                            {materiaRaiz.nome}
                          </span>
                        </div>
                        <div className="d-flex justify-content-end">
                          <CBadge color={disciplinaPai === materiaRaiz.id ? 'primary' : 'secondary'} variant="outline" className="rounded-pill px-2 py-1" style={{ fontSize: 10 }}>
                            {materiaRaiz.total_questoes} Questões
                          </CBadge>
                        </div>
                      </div>
                    </div>
                  </CCol>
                ))}
              </CRow>

              {raizes.length > visibleLimit && (
                <div className="text-center mt-3">
                  <CButton
                    color="secondary"
                    variant="ghost"
                    size="sm"
                    className="rounded-pill fw-bold text-primary"
                    onClick={() => setVisibleLimit(prev => prev + 6)}
                  >
                    + Ver mais disciplinas ({raizes.length - visibleLimit} restantes)
                  </CButton>
                </div>
              )}
            </>
          ) : (
            <>
              {/* UI para Foco Faculdade */}
              {!periodoSelecionado ? (
                <>
                  <div className="text-uppercase fw-bold text-secondary mb-3" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
                    📅 Selecione seu Período
                  </div>
                  <CRow className="g-3">
                    {gradeCurricular.grade.map((p) => (
                      <CCol key={p.periodo} xs={6} sm={3}>
                        <div
                          className="p-3 rounded-4 border cursor-pointer h-100 transition-all bg-body-tertiary hover-shadow-sm text-center"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setPeriodoSelecionado(p.periodo)}
                        >
                          <div className="fs-1 mb-2">🎓</div>
                          <div className="fw-bold">{p.periodo}º Período</div>
                          <div className="small text-body-secondary mt-1">{p.disciplinas.length} disciplinas</div>
                        </div>
                      </CCol>
                    ))}
                  </CRow>
                </>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="text-uppercase fw-bold text-secondary" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
                      📚 Disciplinas do {periodoSelecionado}º Período
                    </div>
                    <CButton
                      color="secondary"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPeriodoSelecionado(null)}
                      className="rounded-pill"
                    >
                      ← Voltar aos períodos
                    </CButton>
                  </div>
                  <CRow className="g-3">
                    {gradeCurricular.grade.find((p) => p.periodo === periodoSelecionado)?.disciplinas.map((disc) => {
                      const mapData = curriculumMapping[disc.codigo]
                      const isSelected = disciplinaFaculdade?.codigo === disc.codigo
                      return (
                        <CCol key={disc.codigo} xs={12} sm={6}>
                          <div
                            className={`p-3 rounded-4 border cursor-pointer h-100 transition-all ${isSelected ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : 'bg-body-tertiary border-transparent hover-shadow-sm'}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setDisciplinaFaculdade(disc)
                              if (mapData && mapData.topic_ids && mapData.topic_ids.length > 0) {
                                setMateriasSelected(mapData.topic_ids.map(String))
                              } else {
                                setMateriasSelected([])
                              }
                              setActiveStep(1)
                            }}
                          >
                            <div className="fw-bold mb-1" style={{ fontSize: 14, color: isSelected ? 'var(--cui-primary)' : 'inherit' }}>
                              {disc.nome}
                            </div>
                            <div className="text-body-secondary small text-truncate" title={disc.ementa}>
                              {disc.ementa}
                            </div>
                            {mapData && mapData.topic_ids.length > 0 ? (
                              <CBadge color="success" className="mt-2 rounded-pill">
                                {mapData.topic_ids.length} tópicos compatíveis
                              </CBadge>
                            ) : (
                              <CBadge color="secondary" className="mt-2 rounded-pill">
                                Mapeamento manual
                              </CBadge>
                            )}
                          </div>
                        </CCol>
                      )
                    })}
                  </CRow>
                </>
              )}
            </>
          )}
        </div>
      </ChecklistItem>

      {/* Passo 1: Assuntos */}
      <ChecklistItem
        icon="🔍"
        title="Quais assuntos específicos?"
        subtitle={
          materiasSelected.length
            ? `${materiasSelected.length} tópicos selecionados`
            : modoFoco === 'concurso'
              ? `Escolha os assuntos de ${disciplinaNome || '...'}`
              : `Revise os tópicos de ${disciplinaFaculdade?.nome || '...'}`
        }
        isOpen={activeStep === 1}
        onToggle={() => {
          if (modoFoco === 'concurso' && !disciplinaPai) {
            toast.error('Selecione uma disciplina primeiro!')
            setActiveStep(0)
            return
          }
          if (modoFoco === 'faculdade' && !disciplinaFaculdade) {
            toast.error('Selecione uma disciplina da faculdade primeiro!')
            setActiveStep(0)
            return
          }
          setActiveStep(activeStep === 1 ? -1 : 1)
        }}
        isCompleted={steps[1].completed}
        ctaLabel="Confirmar Assuntos"
        onCta={() => setActiveStep(2)}
      >
        {(modoFoco === 'concurso' && !disciplinaPai) || (modoFoco === 'faculdade' && !disciplinaFaculdade) ? (
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
                materiasSelected.map((selectedId) => {
                  const materia = materias.find((materiaObj) => String(materiaObj.id) === selectedId)
                  return (
                    <CBadge key={selectedId} color="primary" className="p-2 d-flex align-items-center gap-2 rounded-pill shadow-sm">
                      <span style={{ fontSize: 12 }}>{materia?.nome || selectedId}</span>
                      <span
                        role="button"
                        onClick={() => setMateriasSelected((prevSelected) => prevSelected.filter((id) => id !== selectedId))}
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
            <div className="p-3 border rounded-4 bg-body-tertiary">
              {modoFoco === 'faculdade' && disciplinaFaculdade && (!curriculumMapping[disciplinaFaculdade.codigo]?.topic_ids.length) && (
                <CAlert color="warning" className="mb-3 d-flex align-items-center gap-2 py-2">
                  <CIcon icon={cilLightbulb} />
                  <span style={{ fontSize: 13 }}>
                    Não conseguimos mapear automaticamente os tópicos para <b>{disciplinaFaculdade.nome}</b>.
                    Por favor, selecione manualmente no banco de questões abaixo.
                  </span>
                </CAlert>
              )}

              {modoFoco === 'faculdade' && (!curriculumMapping[disciplinaFaculdade?.codigo]?.topic_ids.length) ? (
                <div className="mb-3">
                  <label className="fw-bold small text-body-secondary mb-2">Selecione a disciplina correspondente no banco de questões:</label>
                  <CFormSelect
                    value={disciplinaPai || ''}
                    onChange={(e) => setDisciplinaPai(Number(e.target.value))}
                    className="rounded-3"
                  >
                    <option value="">Selecione...</option>
                    {materias.filter((m) => !m.parent_id).map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </CFormSelect>
                </div>
              ) : null}

              <MateriaMultiSelect
                materias={materias}
                selected={materiasSelected}
                onChange={setMateriasSelected}
                esconderVazias={true}
                inline={true}
                rootId={
                  modoFoco === 'faculdade' && curriculumMapping[disciplinaFaculdade?.codigo]?.topic_ids.length > 0
                    ? null
                    : disciplinaPai
                }
                focoFaculdadeTopicIds={
                  modoFoco === 'faculdade' && curriculumMapping[disciplinaFaculdade?.codigo]?.topic_ids.length > 0
                    ? curriculumMapping[disciplinaFaculdade.codigo].topic_ids
                    : null
                }
              />
            </div>
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
              onChange={(event) => setBancaSelecionada(event.target.value)}
            >
              <option value="">Todas as Bancas</option>
              {filtrosDisponiveis.bancas.map((banca) => (
                <option key={banca} value={banca}>
                  {banca}
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
              onChange={(event) => setOrgaoSelecionado(event.target.value)}
            >
              <option value="">Todos os Órgãos</option>
              {filtrosDisponiveis.orgaos.map((orgao) => (
                <option key={orgao} value={orgao}>
                  {orgao}
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
              onChange={(event) => setCargoSelecionado(event.target.value)}
            >
              <option value="">Todos os Cargos</option>
              {filtrosDisponiveis.cargos.map((cargo) => (
                <option key={cargo} value={cargo}>
                  {cargo}
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
              onChange={(event) => setAnoSelecionado(event.target.value)}
            >
              <option value="">Todos os Anos</option>
              {filtrosDisponiveis.anos.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
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
              {[10, 20, 50, 0].map((quantidadeOpcao) => (
                <CButton
                  key={quantidadeOpcao}
                  size="sm"
                  color="primary"
                  variant={quantidade === quantidadeOpcao ? 'solid' : 'outline'}
                  className="rounded-pill px-3"
                  onClick={() => setQuantidade(quantidadeOpcao)}
                >
                  {quantidadeOpcao === 0 ? 'Todas' : quantidadeOpcao}
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
                onChange={(event) => setQuantidade(Math.max(1, Number(event.target.value)))}
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
              onChange={(event) => setTempoLimite(Number(event.target.value))}
            >
              {TIME_OPTIONS.map((tempoOpcao) => (
                <option key={tempoOpcao.value} value={tempoOpcao.value}>
                  {tempoOpcao.label}
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
          ].map((modoOpcao) => (
            <CCol key={modoOpcao.id} xs={4}>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setModoEstudo(modoOpcao.id)
                  }
                }}
                onClick={() => setModoEstudo(modoOpcao.id)}
                className={`rounded-4 p-3 text-center transition-all h-100 ${modoEstudo === modoOpcao.id ? 'bg-primary text-white shadow-sm' : 'bg-body-tertiary border hover-shadow-sm'}`}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease', transform: modoEstudo === modoOpcao.id ? 'scale(1.05)' : 'scale(1)' }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>{modoOpcao.icon}</div>
                <div className="fw-bold" style={{ fontSize: 13 }}>{modoOpcao.label}</div>
                <div className={`small opacity-75 ${modoEstudo === modoOpcao.id ? 'text-white' : 'text-secondary'}`} style={{ fontSize: 10 }}>{modoOpcao.desc}</div>
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

       <button
          type="button"
          className="w-100 text-start rounded-4 p-3 border d-flex align-items-center gap-3 cursor-pointer transition-colors hover-shadow"
          style={{
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
          <div className="flex-grow-1">
            <h6 className="mb-0 fw-bold text-info">Simulado Relâmpago</h6>
            <small className="text-body-secondary">10 questões aleatórias · 15 minutos</small>
          </div>
          <div className="text-info fw-bold">Ir ›</div>
        </button>
      </div>
    </div>
  )
}

const QuizRunning = ({
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
  // Ponto 12: Atalhos de teclado — A/B/C/D/E seleciona, Enter confirma, N próxima
  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) return

      const key = event.key.toUpperCase()

      if (!isAnswerConfirmed && LETTERS.includes(key)) {
        const letterIndex = LETTERS.indexOf(key)
        if (letterIndex < currentQuestion.options.length) {
          event.preventDefault()
          onSelectOption(key)
        }
      }

      if (key === 'ENTER' && selectedOption && !isAnswerConfirmed) {
        event.preventDefault()
        onConfirmAnswer()
      }

      if ((key === 'N' || key === 'ARROWRIGHT') && isAnswerConfirmed) {
        event.preventDefault()
        onNextQuestion()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAnswerConfirmed, selectedOption, currentQuestion, onSelectOption, onConfirmAnswer, onNextQuestion])

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
            .map((tag, tagIndex) => (
              <CBadge
                key={tagIndex}
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
        {currentQuestion.options.map((option, optionIndex) => {
          const optionLetter = LETTERS[optionIndex]
          const isSelected = selectedOption === optionLetter
          const isCorrectAnswer = optionLetter === currentQuestion.answer

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
            <button
              type="button"
              key={optionLetter}
              disabled={isAnswerConfirmed}
              onClick={() => !isAnswerConfirmed && onSelectOption(optionLetter)}
              className={`w-100 text-start border d-flex align-items-center gap-3 p-3 rounded-4 transition-all quiz-option ${stateClass} ${!isAnswerConfirmed ? 'cursor-pointer hover-translate-y-px' : ''}`}
              style={{ minHeight: 64 }}
            >
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0 transition-colors ${circleClass}`}
                style={{ width: 32, height: 32, fontSize: 14 }}
              >
                {optionLetter}
              </div>
              <div className={`flex-grow-1 ${isSelected || (isAnswerConfirmed && isCorrectAnswer) ? 'fw-bold' : ''}`} style={{ fontSize: 14, lineHeight: 1.5 }}>
                {option}
              </div>
            </button>
          )
        })}
      </div>
      {isAnswerConfirmed && (
        <CAlert
          color={selectedOption === currentQuestion.answer ? 'success' : 'danger'}
          className="d-flex align-items-center animate-in shadow-sm"
          style={{ animationDuration: '0.3s' }}
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
                  {currentQuestion.comentarios_publicos.map((comentario, comentarioIndex) => (
                    <div
                      key={comentarioIndex}
                      className={`${comentarioIndex < currentQuestion.comentarios_publicos.length - 1 ? 'mb-3' : ''}`}
                    >
                      <div className="d-flex justify-content-between">
                        <strong className="text-success small">{comentario.nome_aluno}</strong>
                        <small className="text-body-secondary">
                          {new Date(comentario.data_criacao).toLocaleDateString('pt-BR')}
                        </small>
                      </div>
                      <p className="small fst-italic mt-1 mb-0">"{comentario.texto}"</p>
                      {comentario.resposta_professor && (
                        <div className="mt-2 ms-3 p-2 bg-primary bg-opacity-10 border-start border-primary border-3 rounded-end">
                          <small className="fw-bold text-primary">👨🏫 Professor:</small>{' '}
                          <small className="text-body-secondary">{comentario.resposta_professor}</small>
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

  return (
    <div style={{ animation: 'fade-up .35s ease' }}>
      <CCardBody className="p-4 p-md-5 text-center">
        <div className="mb-4" style={{ animation: 'bounce 2s infinite' }}>
          <span style={{ fontSize: 64 }}>{grade.emoji}</span>
        </div>

        <h2 className="fw-bold mb-1">{grade.title}</h2>
        <p className="text-body-secondary mb-4">{grade.message}</p>

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
      </CCardBody>
    </div>
  )
}

/* ─── Componente Principal ───────────────────────────────────────────────────── */

export default ReadyScreen;
