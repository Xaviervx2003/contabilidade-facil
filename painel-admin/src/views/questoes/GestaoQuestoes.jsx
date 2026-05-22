import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle,
  CRow, CCol, CSpinner,
} from '@coreui/react'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { API_URL } from '../../config'
import { useSearchParams } from 'react-router-dom'
import MateriaMultiSelect from '../../components/MateriaMultiSelect'
import { useTheme } from '../../context/themeContext'
import { 
  useFiltrosQuestoes, 
  useQuestoes, 
  useCriarQuestao, 
  useEditarQuestao, 
  useDeletarQuestao 
} from '../../hooks/useQuestoes'
import { tokens as tk } from '../../tokens'

// Mantemos alias 'tk' para compatibilidade com o restante do arquivo

const FONT = "'Nunito', 'Circular Std', sans-serif"
const PER_PAGE = 20

const INITIAL_FORM = {
  id: null,
  materia_ids: [],
  enunciado: '',
  opcao_a: '', opcao_b: '', opcao_c: '', opcao_d: '', opcao_e: '',
  resposta_correta: 'A',
  explicacao: '',
  dica: '',
  link_video: '',
  banca: '',
  orgao: '',
  cargo: '',
  ano: '',
  escolaridade: '',
  modalidade: '',
}

const LETRAS = ['A', 'B', 'C', 'D', 'E']

const validar = (f) => {
  const e = {}
  if (!f.enunciado.trim()) e.enunciado = 'Enunciado obrigatório.'
  if (!f.opcao_a.trim())   e.opcao_a   = 'Opção A obrigatória.'
  if (!f.opcao_b.trim())   e.opcao_b   = 'Opção B obrigatória.'
  return e
}

/* ── Skeleton ─────────────────────────────────────────────── */
const Skel = ({ h = 20, w = '100%', r = 10 }) => (
  <div style={{
    height: h, width: w, borderRadius: r,
    background: 'linear-gradient(90deg,var(--sk1)25%,var(--sk2)50%,var(--sk1)75%)',
    backgroundSize: '200% 100%',
    animation: 'skshimmer 1.4s ease infinite',
  }} />
)

/* ── Card base ───────────────────────────────────────────── */
const SCard = ({ children, style = {}, delay = 0, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
    onClick={onClick}
    style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 20,
      padding: '20px 24px',
      fontFamily: FONT,
      ...style,
    }}
  >
    {children}
  </motion.div>
)

/* ── Eyebrow label ───────────────────────────────────────── */
const Label = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.9px', color: tk.foggy, marginBottom: 6, fontFamily: FONT,
  }}>
    {children}
  </div>
)

/* ── Field wrapper ───────────────────────────────────────── */
const Field = ({ label, icon, children, hint }) => (
  <div style={{ marginBottom: 20 }}>
    {label && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon && <Icon icon={icon} width="14" style={{ color: tk.foggy }} />}
        <Label>{label}</Label>
      </div>
    )}
    {children}
    {hint && (
      <div style={{ fontSize: 11, color: tk.foggy, marginTop: 5, fontStyle: 'italic', fontFamily: FONT }}>
        {hint}
      </div>
    )}
  </div>
)

/* ── Input estilo Airbnb ─────────────────────────────────── */
const AInput = ({ value, onChange, placeholder, type = 'text' }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={{
      width: '100%', height: 42, borderRadius: 10,
      border: '1.5px solid var(--color-border)',
      background: 'var(--color-bg-elevated)',
      color: 'var(--color-text-primary)',
      padding: '0 14px', fontSize: 13, fontFamily: FONT,
      outline: 'none', transition: 'border-color 0.2s',
    }}
    onFocus={e => { e.target.style.borderColor = tk.rausch }}
    onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
  />
)

/* ── Textarea estilo Airbnb ──────────────────────────────── */
const ATextarea = ({ value, onChange, placeholder, rows = 4 }) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    style={{
      width: '100%', borderRadius: 12,
      border: '1.5px solid var(--color-border)',
      background: 'var(--color-bg-elevated)',
      color: 'var(--color-text-primary)',
      padding: '12px 14px', fontSize: 13, fontFamily: FONT,
      outline: 'none', resize: 'vertical', lineHeight: 1.6,
      transition: 'border-color 0.2s',
    }}
    onFocus={e => { e.target.style.borderColor = tk.rausch }}
    onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
  />
)

/* ── Select estilo Airbnb ────────────────────────────────── */
const ASelect = ({ value, onChange, children }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      width: '100%', height: 42, borderRadius: 10,
      border: '1.5px solid var(--color-border)',
      background: 'var(--color-bg-elevated)',
      color: 'var(--color-text-primary)',
      padding: '0 14px', fontSize: 13, fontFamily: FONT,
      outline: 'none', cursor: 'pointer',
      transition: 'border-color 0.2s',
    }}
    onFocus={e => { e.target.style.borderColor = tk.rausch }}
    onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
  >
    {children}
  </select>
)

/* ── Ícone indicador na tabela ───────────────────────────── */
const Indicador = ({ icon, color, title }) => (
  <span title={title} style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 8,
    background: `${color}15`, color,
    transition: 'transform 0.15s ease',
    cursor: 'default',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.18)' }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
  >
    <Icon icon={icon} width="14" />
  </span>
)

/* ════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════ */
const GestaoQuestoes = () => {
  const [searchParams] = useSearchParams()
  const { isDark } = useTheme()

  /* ── Estados ───────────────────────────────────────────────── */
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtroBanca, setFiltroBanca] = useState('')
  const [filtroAno, setFiltroAno] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState(0)
  const [errosForm, setErrosForm] = useState({})
  const [modalVisible, setModalVisible] = useState(false)
  const [materiasDisponiveis, setMateriasDisponiveis] = useState([])
  const [salvando, setSalvando] = useState(false)

  const { data: filtrosDados } = useFiltrosQuestoes()
  const filtrosOpcoes = filtrosDados || { bancas: [], anos: [] }

  const filtrosAtuais = useMemo(() => {
    const f = { page: currentPage, per_page: PER_PAGE }
    if (debouncedSearch.trim()) f.busca = debouncedSearch.trim()
    if (filtroBanca) f.banca = filtroBanca
    if (filtroAno) f.ano = filtroAno
    return f
  }, [currentPage, debouncedSearch, filtroBanca, filtroAno])

  const { data: questoesData, isFetching: loading, isError } = useQuestoes(filtrosAtuais)
  const questoes = questoesData?.data || []
  const totalQuestoes = questoesData?.total || 0
  const totalPages = questoesData?.total_pages || 1

  if (isError) {
    if (!error) setError('Erro ao carregar questões.')
  }

  const { mutateAsync: criarQuestao } = useCriarQuestao()
  const { mutateAsync: editarQuestao } = useEditarQuestao()
  const { mutateAsync: deletarQuestao } = useDeletarQuestao()

  /* ── Data fetching (Matérias) ────────────────────────────── */
  const carregarMaterias = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/materias`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      })
      if (res.ok) {
        setMateriasDisponiveis(await res.json())
      }
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { carregarMaterias() }, [carregarMaterias])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  /* ── Modal ───────────────────────────────────────────────── */
  const abrirNovo = () => {
    setFormData(INITIAL_FORM); setModoEdicao(false)
    setAbaAtiva(0); setErrosForm({}); setModalVisible(true)
  }

  const abrirEdicao = (q) => {
    setFormData({
      id: q.id,
      materia_ids: q.materia_ids || [],
      enunciado: q.question || '',
      opcao_a: q.options?.[0] || '', opcao_b: q.options?.[1] || '',
      opcao_c: q.options?.[2] || '', opcao_d: q.options?.[3] || '',
      opcao_e: q.options?.[4] || '',
      resposta_correta: q.answer || 'A',
      explicacao: q.explicacao || '',
      dica: q.dica || '',
      link_video: q.link_video || '',
      banca: q.banca || '', orgao: q.orgao || '', cargo: q.cargo || '',
      ano: q.ano || '', escolaridade: q.escolaridade || '', modalidade: q.modalidade || '',
    })
    setModoEdicao(true); setAbaAtiva(0); setErrosForm({}); setModalVisible(true)
  }

  const salvar = async () => {
    const erros = validar(formData)
    if (Object.keys(erros).length > 0) {
      setErrosForm(erros)
      if (erros.enunciado || erros.opcao_a || erros.opcao_b) setAbaAtiva(0)
      return
    }
    setErrosForm({}); setSalvando(true)
    try {
      if (formData.id) {
        await editarQuestao({ id: formData.id, dados: formData })
      } else {
        await criarQuestao(formData)
      }
      setSuccess('Questão salva com sucesso!')
      setModalVisible(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { 
      setError('Erro ao salvar questão.')
      setTimeout(() => setError(''), 3000)
    }
    finally { setSalvando(false) }
  }

  const deletar = async (id) => {
    if (!window.confirm('Excluir esta questão permanentemente?')) return
    try {
      await deletarQuestao(id)
      setSuccess('Questão removida!')
      setTimeout(() => setSuccess(''), 3000)
    } catch { setError('Erro ao excluir.') }
  }

  const upd = (field, val) => setFormData(p => ({ ...p, [field]: val }))

  const abasComErro = useMemo(() => {
    const s = new Set()
    if (errosForm.enunciado || errosForm.opcao_a || errosForm.opcao_b) s.add(0)
    return s
  }, [errosForm])

  const ABAS = ['📝 Conteúdo', '💡 Resolução', '🏷️ Classificação']

  /* ── Styles inline ───────────────────────────────────────── */
  const containerStyle = {
    minHeight: '100vh',
    background: 'var(--color-bg-primary)',
    padding: '32px 16px 60px',
    fontFamily: FONT,
    '--sk1': isDark ? '#1e2535' : '#f0f0f0',
    '--sk2': isDark ? '#252f42' : '#e0e0e0',
  }

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes skshimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes gqFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div style={{ maxWidth: 1080, margin: '0 auto' }}>

        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ color: tk.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            Painel Admin
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                Gestão de Questões
              </div>
              <div style={{ fontSize: 14, color: tk.foggy, marginTop: 6 }}>
                Banco com <strong style={{ color: 'var(--color-text-primary)' }}>{totalQuestoes.toLocaleString('pt-BR')}</strong> questões cadastradas.
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={abrirNovo}
              style={{
                background: tk.rausch, color: '#fff',
                border: 'none', borderRadius: 99,
                padding: '12px 24px', fontWeight: 700,
                fontSize: 14, cursor: 'pointer', fontFamily: FONT,
                boxShadow: `0 4px 14px ${tk.rausch}40`,
              }}
            >
              + Nova Questão
            </motion.button>
          </div>
        </motion.div>

        {/* ── FILTROS ── */}
        <SCard delay={0.05} style={{ padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <Label>Pesquisar</Label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                border: '1.5px solid var(--color-border)', borderRadius: 50,
                padding: '0 14px', height: 42,
                background: 'var(--color-bg-elevated)',
                transition: 'border-color 0.2s',
              }}
                onFocusCapture={e => { e.currentTarget.style.borderColor = tk.rausch }}
                onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
              >
                <Icon icon="solar:magnifer-linear" width="16" style={{ color: tk.foggy, flexShrink: 0 }} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar enunciado ou ID..."
                  style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontFamily: FONT, color: 'var(--color-text-primary)', width: '100%' }}
                />
              </div>
            </div>

            {/* Banca */}
            <div style={{ minWidth: 140 }}>
              <Label>Banca</Label>
              <ASelect value={filtroBanca} onChange={e => setFiltroBanca(e.target.value)}>
                <option value="">Todas</option>
                {filtrosOpcoes.bancas?.map(b => <option key={b} value={b}>{b}</option>)}
              </ASelect>
            </div>

            {/* Ano */}
            <div style={{ minWidth: 110 }}>
              <Label>Ano</Label>
              <ASelect value={filtroAno} onChange={e => setFiltroAno(e.target.value)}>
                <option value="">Todos</option>
                {filtrosOpcoes.anos?.map(a => <option key={a} value={a}>{a}</option>)}
              </ASelect>
            </div>

            {/* Limpar */}
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setSearchTerm(''); setFiltroBanca(''); setFiltroAno('') }}
              style={{
                height: 42, borderRadius: 50, border: '1.5px solid var(--color-border)',
                background: 'transparent', color: tk.foggy, padding: '0 18px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Icon icon="solar:restart-linear" width="14" />
              Limpar
            </motion.button>
          </div>
        </SCard>

        {/* ── TABELA ── */}
        <SCard delay={0.1} style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[0,1,2,3,4].map(i => <Skel key={i} h={44} r={10} />)}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {/* Cabeçalho */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr 160px 100px 90px',
                gap: 0, padding: '12px 24px',
                background: 'var(--color-bg-tertiary)',
                borderBottom: '1px solid var(--color-border)',
              }}>
                {['ID', 'Questão', 'Banca / Ano', 'Extras', 'Ações'].map((h, i) => (
                  <div key={h} style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: tk.foggy,
                    textAlign: i === 3 ? 'center' : i === 4 ? 'right' : 'left',
                  }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Linhas */}
              {questoes.length === 0 && (
                <div style={{ padding: '60px 24px', textAlign: 'center', color: tk.foggy, fontSize: 14 }}>
                  <Icon icon="solar:ghost-bold-duotone" width="48" style={{ marginBottom: 12, opacity: 0.2 }} />
                  <div>Nenhuma questão encontrada.</div>
                </div>
              )}
              <AnimatePresence>
                {questoes.map((q, idx) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ backgroundColor: 'var(--color-bg-tertiary)', x: 2 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '70px 1fr 160px 100px 90px',
                      padding: '14px 24px',
                      borderBottom: '1px solid var(--color-border)',
                      alignItems: 'center',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* ID */}
                    <div style={{
                      fontWeight: 700, fontSize: 12,
                      color: tk.rausch,
                      background: `${tk.rausch}10`,
                      borderRadius: 8, padding: '3px 8px',
                      display: 'inline-block', width: 'fit-content',
                    }}>
                      #{q.id}
                    </div>

                    {/* Enunciado */}
                    <div style={{ fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>
                      {q.question}
                    </div>

                    {/* Banca/Ano */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {q.banca && (
                        <span style={{ background: `${tk.rausch}12`, color: tk.rausch, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>
                          {q.banca}
                        </span>
                      )}
                      {q.ano && (
                        <span style={{ background: 'var(--color-bg-tertiary)', color: tk.foggy, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>
                          {q.ano}
                        </span>
                      )}
                      {!q.banca && !q.ano && <span style={{ opacity: 0.25 }}>—</span>}
                    </div>

                    {/* Extras */}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      {q.link_video && <Indicador icon="solar:video-frame-play-bold-duotone" color={tk.rausch} title="Tem vídeo" />}
                      {q.explicacao && <Indicador icon="solar:document-text-bold-duotone" color={tk.babu} title="Tem explicação" />}
                      {q.dica && <Indicador icon="solar:lightbulb-bold-duotone" color={tk.arches} title="Tem dica" />}
                      {!q.link_video && !q.explicacao && !q.dica && <span style={{ opacity: 0.25 }}>—</span>}
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <motion.button
                        whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.94 }}
                        onClick={() => abrirEdicao(q)}
                        title="Editar"
                        style={{
                          width: 32, height: 32, borderRadius: '50%', border: 'none',
                          background: `${tk.babu}15`, color: tk.babu,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon icon="solar:pen-bold-duotone" width="14" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.94 }}
                        onClick={() => deletar(q.id)}
                        title="Excluir"
                        style={{
                          width: 32, height: 32, borderRadius: '50%', border: 'none',
                          background: `${tk.rausch}15`, color: tk.rausch,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon icon="solar:trash-bin-trash-bold-duotone" width="14" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </SCard>

        {/* ── PAGINAÇÃO ── */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              style={{
                height: 38, padding: '0 18px', borderRadius: 99,
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-bg-elevated)',
                color: currentPage === 1 ? tk.swiss : 'var(--color-text-primary)',
                fontSize: 13, fontWeight: 600, cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontFamily: FONT,
              }}
            >← Anterior</motion.button>

            <div style={{
              height: 38, padding: '0 18px', borderRadius: 99,
              background: `${tk.rausch}12`, color: tk.rausch,
              display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700,
            }}>
              {currentPage} / {totalPages}
            </div>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              style={{
                height: 38, padding: '0 18px', borderRadius: 99,
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-bg-elevated)',
                color: currentPage === totalPages ? tk.swiss : 'var(--color-text-primary)',
                fontSize: 13, fontWeight: 600, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontFamily: FONT,
              }}
            >Próxima →</motion.button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          MODAL
      ══════════════════════════════════════════ */}
      <CModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        size="xl"
        backdrop="static"
      >
        <div style={{ fontFamily: FONT }}>
          <CModalHeader style={{ borderBottom: '1px solid var(--color-border)', padding: '20px 24px 12px' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: tk.rausch, marginBottom: 4 }}>
                {modoEdicao ? `Editando #${formData.id}` : 'Nova questão'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
                {modoEdicao ? 'Editar Questão' : 'Criar Questão'}
              </div>
            </div>
          </CModalHeader>

          {/* ABAS NAV */}
          <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid var(--color-border)' }}>
            {ABAS.map((aba, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setAbaAtiva(i)}
                style={{
                  position: 'relative', background: 'none', border: 'none',
                  padding: '12px 16px', fontSize: 13, fontFamily: FONT,
                  fontWeight: abaAtiva === i ? 700 : 500,
                  color: abaAtiva === i ? tk.rausch : tk.foggy,
                  cursor: 'pointer',
                  borderBottom: abaAtiva === i ? `2px solid ${tk.rausch}` : '2px solid transparent',
                  marginBottom: -1, transition: 'color 0.2s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {aba}
                {abasComErro.has(i) && (
                  <span style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: tk.rausch, color: '#fff',
                    fontSize: 9, fontWeight: 800,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'gqFadeIn 0.3s ease',
                  }}>!</span>
                )}
              </button>
            ))}
          </div>

          <CModalBody style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
            <AnimatePresence mode="wait">

              {/* ABA 0: CONTEÚDO */}
              {abaAtiva === 0 && (
                <motion.div key="aba0" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Field label="Enunciado" icon="solar:document-text-bold-duotone">
                    <ATextarea
                      value={formData.enunciado}
                      onChange={e => upd('enunciado', e.target.value)}
                      placeholder="Digite o enunciado completo da questão..."
                      rows={4}
                    />
                    {errosForm.enunciado && (
                      <div style={{ fontSize: 11, color: tk.rausch, marginTop: 4 }}>{errosForm.enunciado}</div>
                    )}
                  </Field>

                  {/* Preview */}
                  {formData.enunciado.trim() && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      style={{
                        background: `${tk.rausch}08`,
                        border: `1px dashed ${tk.rausch}30`,
                        borderRadius: 12, padding: '12px 16px', marginBottom: 20,
                      }}
                    >
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: tk.rausch, marginBottom: 6 }}>Pré-visualização</div>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-primary)' }}>{formData.enunciado}</p>
                    </motion.div>
                  )}

                  <Field label="Opções de resposta">
                    <CRow className="g-2">
                      {['a', 'b', 'c', 'd', 'e'].map(l => (
                        <CCol md={6} key={l}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            border: `1.5px solid ${formData.resposta_correta === l.toUpperCase() ? tk.babu : 'var(--color-border)'}`,
                            borderRadius: 12, padding: '8px 12px',
                            background: formData.resposta_correta === l.toUpperCase() ? `${tk.babu}06` : 'var(--color-bg-elevated)',
                            transition: 'all 0.2s',
                          }}>
                            <span style={{
                              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                              background: formData.resposta_correta === l.toUpperCase() ? tk.babu : 'var(--color-bg-tertiary)',
                              color: formData.resposta_correta === l.toUpperCase() ? '#fff' : tk.foggy,
                              fontSize: 11, fontWeight: 800, fontFamily: FONT,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.2s',
                            }}>
                              {l.toUpperCase()}
                            </span>
                            <input
                              value={formData[`opcao_${l}`]}
                              onChange={e => upd(`opcao_${l}`, e.target.value)}
                              placeholder={`Opção ${l.toUpperCase()}${l === 'a' || l === 'b' ? ' *' : ''}`}
                              style={{
                                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                                fontSize: 13, fontFamily: FONT, color: 'var(--color-text-primary)',
                              }}
                            />
                          </div>
                          {errosForm[`opcao_${l}`] && (
                            <div style={{ fontSize: 11, color: tk.rausch, marginTop: 3 }}>{errosForm[`opcao_${l}`]}</div>
                          )}
                        </CCol>
                      ))}
                    </CRow>
                  </Field>

                  <Field label="Resposta correta">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {LETRAS.map(l => (
                        <motion.button
                          key={l}
                          type="button"
                          whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }}
                          onClick={() => upd('resposta_correta', l)}
                          style={{
                            width: 46, height: 46, borderRadius: 12,
                            border: `2px solid ${formData.resposta_correta === l ? tk.babu : 'var(--color-border)'}`,
                            background: formData.resposta_correta === l ? tk.babu : 'transparent',
                            color: formData.resposta_correta === l ? '#fff' : tk.foggy,
                            fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: FONT,
                            boxShadow: formData.resposta_correta === l ? `0 4px 12px ${tk.babu}40` : 'none',
                            transition: 'all 0.2s',
                          }}
                        >
                          {l}
                        </motion.button>
                      ))}
                    </div>
                  </Field>
                </motion.div>
              )}

              {/* ABA 1: RESOLUÇÃO */}
              {abaAtiva === 1 && (
                <motion.div key="aba1" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Field label="Explicação da resposta" icon="solar:document-text-bold-duotone">
                    <ATextarea
                      value={formData.explicacao}
                      onChange={e => upd('explicacao', e.target.value)}
                      placeholder="Explique por que a resposta está correta e por que as outras estão erradas..."
                      rows={5}
                    />
                  </Field>
                  <Field
                    label="Dica (Gamificação)"
                    icon="solar:lightbulb-bold-duotone"
                    hint="Esta dica é exibida para o aluno antes de revelar a resposta no modo de estudo."
                  >
                    <ATextarea
                      value={formData.dica}
                      onChange={e => upd('dica', e.target.value)}
                      placeholder="Uma dica curta que o aluno pode usar se estiver travado..."
                      rows={3}
                    />
                  </Field>
                  <Field label="Link do Vídeo (YouTube)" icon="solar:video-frame-play-bold-duotone">
                    <AInput
                      value={formData.link_video}
                      onChange={e => upd('link_video', e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </Field>
                </motion.div>
              )}

              {/* ABA 2: CLASSIFICAÇÃO */}
              {abaAtiva === 2 && (
                <motion.div key="aba2" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Field label="Assuntos / Matérias">
                    <MateriaMultiSelect
                      materias={materiasDisponiveis}
                      selected={formData.materia_ids}
                      onChange={ids => upd('materia_ids', ids)}
                      inline={true}
                    />
                  </Field>
                  <CRow className="g-3">
                    {[
                      { f: 'banca',      label: 'Banca',        ph: 'Ex: CESPE, FGV...' },
                      { f: 'orgao',      label: 'Órgão',        ph: 'Ex: STF, TCU...' },
                      { f: 'ano',        label: 'Ano',          ph: 'Ex: 2023' },
                      { f: 'cargo',      label: 'Cargo',        ph: 'Ex: Auditor Fiscal...' },
                    ].map(({ f, label, ph }) => (
                      <CCol md={6} key={f}>
                        <Field label={label}>
                          <AInput value={formData[f]} onChange={e => upd(f, e.target.value)} placeholder={ph} />
                        </Field>
                      </CCol>
                    ))}
                    <CCol md={6}>
                      <Field label="Escolaridade">
                        <ASelect value={formData.escolaridade} onChange={e => upd('escolaridade', e.target.value)}>
                          <option value="">Qualquer</option>
                          <option value="Superior">Superior</option>
                          <option value="Médio">Médio</option>
                          <option value="Fundamental">Fundamental</option>
                        </ASelect>
                      </Field>
                    </CCol>
                    <CCol md={6}>
                      <Field label="Modalidade">
                        <ASelect value={formData.modalidade} onChange={e => upd('modalidade', e.target.value)}>
                          <option value="">Qualquer</option>
                          <option value="Múltipla Escolha">Múltipla Escolha</option>
                          <option value="Certo ou Errado">Certo ou Errado</option>
                        </ASelect>
                      </Field>
                    </CCol>
                  </CRow>
                </motion.div>
              )}

            </AnimatePresence>
          </CModalBody>

          <CModalFooter style={{ borderTop: '1px solid var(--color-border)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between' }}>
            {/* Nav entre abas */}
            <div style={{ display: 'flex', gap: 8 }}>
              {abaAtiva > 0 && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setAbaAtiva(p => p - 1)}
                  style={{ height: 38, padding: '0 16px', borderRadius: 99, border: '1.5px solid var(--color-border)', background: 'transparent', color: tk.foggy, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}
                >← Anterior</motion.button>
              )}
              {abaAtiva < ABAS.length - 1 && (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setAbaAtiva(p => p + 1)}
                  style={{ height: 38, padding: '0 16px', borderRadius: 99, border: `1.5px solid ${tk.rausch}`, background: 'transparent', color: tk.rausch, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
                >Próxima →</motion.button>
              )}
            </div>

            {/* Cancelar / Salvar */}
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => setModalVisible(false)}
                style={{ height: 42, padding: '0 20px', borderRadius: 99, border: '1.5px solid var(--color-border)', background: 'transparent', color: tk.foggy, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}
              >Cancelar</motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                type="button"
                onClick={salvar}
                disabled={salvando}
                style={{
                  height: 42, padding: '0 24px', borderRadius: 99,
                  border: 'none', background: tk.rausch, color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer',
                  fontFamily: FONT, opacity: salvando ? 0.7 : 1,
                  boxShadow: `0 4px 14px ${tk.rausch}40`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {salvando && <CSpinner size="sm" style={{ width: 14, height: 14, borderWidth: 2 }} />}
                Salvar Questão
              </motion.button>
            </div>
          </CModalFooter>
        </div>
      </CModal>

      {/* ── ALERTAS FLUTUANTES ── */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
              background: tk.babu, color: '#fff', borderRadius: 99,
              padding: '12px 24px', fontWeight: 700, fontSize: 14, fontFamily: FONT,
              boxShadow: `0 8px 24px ${tk.babu}40`, zIndex: 9999,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <Icon icon="solar:check-circle-bold-duotone" width="20" />
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            onClick={() => setError('')}
            style={{
              position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
              background: tk.rausch, color: '#fff', borderRadius: 99,
              padding: '12px 24px', fontWeight: 700, fontSize: 14, fontFamily: FONT,
              boxShadow: `0 8px 24px ${tk.rausch}40`, zIndex: 9999,
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            }}
          >
            <Icon icon="solar:close-circle-bold-duotone" width="20" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GestaoQuestoes
