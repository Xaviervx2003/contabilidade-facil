import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CSpinner,
} from '@coreui/react'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useTheme } from '../../context/themeContext'
import { buildTokens } from '../../tokens'
import useAuthSession from '../../hooks/useAuthSession'
import { confirmDialog } from '../../utils/confirm'

const FONT = "'Nunito', 'Circular Std', sans-serif"

/* ── Componentes de UI Básicos ───────────────────────────── */
const Skel = ({ h = 20, w = '100%', r = 10 }) => (
  <div
    className="skshimmer"
    style={{ height: h, width: w, borderRadius: r }}
  />
)

const Label = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.9px', color: 'var(--color-text-muted, #767676)', marginBottom: 6, fontFamily: FONT,
  }}>
    {children}
  </div>
)

const AInput = ({ value, onChange, placeholder, type = 'text', min }) => (
  <input
    type={type}
    min={min}
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
    onFocus={e => { e.target.style.borderColor = 'var(--accent-primary)' }}
    onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
  />
)

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
    onFocus={e => { e.target.style.borderColor = 'var(--accent-primary)' }}
    onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
  />
)

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
    onFocus={e => { e.target.style.borderColor = 'var(--accent-primary)' }}
    onBlur={e => { e.target.style.borderColor = 'var(--color-border)' }}
  >
    {children}
  </select>
)

/* ── Componente Principal ────────────────────────────────── */
const GestaoTrilhas = () => {
  const { isDark, currentPalette } = useTheme()
  const tk = buildTokens(currentPalette)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [modalTrilha, setModalTrilha] = useState(false)
  const [modalModulo, setModalModulo] = useState(false)
  const [modalEngajamento, setModalEngajamento] = useState(false)
  const [modalDuvidas, setModalDuvidas] = useState(false)
  const [respostaDuvida, setRespostaDuvida] = useState('')
  const [respondendoId, setRespondendoId] = useState(null)
  
  const queryClient = useQueryClient()
  const { userId } = useAuthSession()

  const [trilhaAtiva, setTrilhaAtiva] = useState(null)
  const [formTrilha, setFormTrilha] = useState({ nome: '', descricao: '', status: 'rascunho', capa_url: '', nivel: '', modulos: [] })
  const [formModulo, setFormModulo] = useState({
    id: null, nome: '', descricao: '', ordem: 1, tipo: 'video',
    link_video: '', texto_teorico: '', materia_id: '',
    questoes_selecionadas: '', duracao_minutos: '', material_apoio_url: ''
  })

  const { data: trilhas = [], isLoading: loadingTrilhas } = useQuery({
    queryKey: ['adminTrilhas'],
    queryFn: async () => {
      const res = await api.get('/api/trilhas')
      return Array.isArray(res.data) ? res.data : (res.data.data || [])
    }
  })

  const { data: materias = [] } = useQuery({
    queryKey: ['adminMaterias'],
    queryFn: async () => {
      const res = await api.get('/api/admin/materias')
      return res.data
    }
  })

  const { data: duvidasPendentes = [] } = useQuery({
    queryKey: ['adminDuvidasPendentes'],
    queryFn: async () => {
      const res = await api.get('/api/trilhas/duvidas/pendentes')
      return res.data
    }
  })

  const { data: dadosEngajamento = [], isLoading: loadingEngajamento } = useQuery({
    queryKey: ['adminEngajamento', trilhaAtiva?.id],
    queryFn: async () => {
      const res = await api.get(`/api/trilhas/${trilhaAtiva.id}/engajamento`)
      return res.data
    },
    enabled: !!trilhaAtiva && modalEngajamento,
  })

  const loading = loadingTrilhas
  const totalModulos = trilhas.reduce((t, r) => t + (r.modulos?.length || 0), 0)
  const trilhasPublicadas = trilhas.filter(t => t.status === 'publicado').length
  const trilhasRascunho = trilhas.length - trilhasPublicadas

  // Mutações (Trilhas)
  const mutationSalvarTrilha = useMutation({
    mutationFn: async () => {
      if (trilhaAtiva) {
        await api.put(`/api/trilhas/${trilhaAtiva.id}`, {
          nome: formTrilha.nome, descricao: formTrilha.descricao, status: formTrilha.status,
          capa_url: formTrilha.capa_url || null, nivel: formTrilha.nivel || null
        })
      } else {
        await api.post(`/api/trilhas?usuario_id=${userId}`, {
          ...formTrilha, capa_url: formTrilha.capa_url || null, nivel: formTrilha.nivel || null
        })
      }
    },
    onSuccess: () => {
      setSuccess(trilhaAtiva ? 'Trilha atualizada!' : 'Trilha criada!')
      setTimeout(() => setSuccess(''), 3000)
      setModalTrilha(false)
      queryClient.invalidateQueries({ queryKey: ['adminTrilhas'] })
    },
    onError: () => { setError('Erro ao salvar trilha.'); setTimeout(() => setError(''), 3000) }
  })

  const salvarTrilha = () => mutationSalvarTrilha.mutate()

  const deletarTrilha = async (id) => {
    if (!await confirmDialog("Certeza que deseja remover esta trilha e todos os seus módulos?")) return
    try {
      await api.delete(`/api/trilhas/${id}`)
      setSuccess('Trilha removida!')
      setTimeout(() => setSuccess(''), 3000)
      queryClient.invalidateQueries({ queryKey: ['adminTrilhas'] })
    } catch (e) { setError('Erro ao remover trilha.'); setTimeout(() => setError(''), 3000) }
  }

  const duplicarTrilha = async (id) => {
    try {
      const res = await api.post(`/api/trilhas/${id}/duplicar?usuario_id=${userId}`)
      if (!res.data) throw new Error('Falha ao duplicar')
      setSuccess('Trilha duplicada!')
      setTimeout(() => setSuccess(''), 3000)
      queryClient.invalidateQueries({ queryKey: ['adminTrilhas'] })
    } catch (e) { setError('Erro ao duplicar.'); setTimeout(() => setError(''), 3000) }
  }

  // Mutações (Módulos)
  const abrirModalModulo = (trilha, modulo = null) => {
    setTrilhaAtiva(trilha)
    if (modulo) {
      let tipo = 'video'
      if (modulo.materia_id || (modulo.questoes_selecionadas && modulo.questoes_selecionadas.length > 0)) tipo = 'quiz'
      else if (modulo.texto_teorico && !modulo.link_video) tipo = 'texto'

      setFormModulo({
        id: modulo.id, nome: modulo.nome || '', descricao: modulo.descricao || '',
        ordem: modulo.ordem, tipo, link_video: modulo.link_video || '',
        texto_teorico: modulo.texto_teorico || '', materia_id: modulo.materia_id || '',
        questoes_selecionadas: modulo.questoes_selecionadas ? modulo.questoes_selecionadas.join(', ') : '',
        duracao_minutos: modulo.duracao_minutos || '', material_apoio_url: modulo.material_apoio_url || ''
      })
    } else {
      setFormModulo({
        id: null, nome: '', descricao: '', ordem: (trilha.modulos?.length || 0) + 1,
        tipo: 'video', link_video: '', texto_teorico: '', materia_id: '',
        questoes_selecionadas: '', duracao_minutos: '', material_apoio_url: ''
      })
    }
    setModalModulo(true)
  }

  const salvarModulo = async () => {
    try {
      const ordemVal = parseInt(formModulo.ordem)
      const materiaVal = formModulo.tipo === 'quiz' && formModulo.materia_id ? parseInt(formModulo.materia_id) : null
      const duracaoVal = formModulo.duracao_minutos ? parseInt(formModulo.duracao_minutos) : null

      const payload = {
        nome: formModulo.nome, descricao: formModulo.descricao, ordem: isNaN(ordemVal) ? 0 : ordemVal,
        link_video: formModulo.link_video || null, texto_teorico: formModulo.texto_teorico || null,
        materia_id: isNaN(materiaVal) ? null : materiaVal,
        questoes_selecionadas: formModulo.questoes_selecionadas ? formModulo.questoes_selecionadas.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : null,
        duracao_minutos: isNaN(duracaoVal) ? null : duracaoVal, material_apoio_url: formModulo.material_apoio_url || null
      }

      const url = formModulo.id ? `/api/trilhas/modulos/${formModulo.id}` : `/api/trilhas/${trilhaAtiva.id}/modulos`

      if (formModulo.id) {
        await api.put(url, payload)
      } else {
        await api.post(url, payload)
      }

      setSuccess(formModulo.id ? 'Módulo atualizado!' : 'Módulo adicionado!')
      setTimeout(() => setSuccess(''), 3000)
      setModalModulo(false)
      queryClient.invalidateQueries({ queryKey: ['adminTrilhas'] })
    } catch (e) { setError(`Erro ao salvar modulo: ${e.message}`); setTimeout(() => setError(''), 3000) }
  }

  const deletarModulo = async (id) => {
    if (!await confirmDialog("Remover este módulo da trilha?")) return
    try {
      await api.delete(`/api/trilhas/modulos/${id}`)
      setSuccess('Módulo deletado!')
      setTimeout(() => setSuccess(''), 3000)
      queryClient.invalidateQueries({ queryKey: ['adminTrilhas'] })
    } catch (e) { setError('Erro ao deletar módulo.'); setTimeout(() => setError(''), 3000) }
  }

  const responderDuvida = async (id) => {
    if (!respostaDuvida.trim()) return
    try {
      await api.put(`/api/trilhas/duvidas/${id}/responder`, { resposta: respostaDuvida })
      setSuccess('Resposta enviada!')
      setTimeout(() => setSuccess(''), 3000)
      setRespostaDuvida(''); setRespondendoId(null)
      queryClient.invalidateQueries({ queryKey: ['adminDuvidasPendentes'] })
    } catch (e) { setError('Erro ao responder.'); setTimeout(() => setError(''), 3000) }
  }

  const verEngajamento = (trilha) => { setTrilhaAtiva(trilha); setModalEngajamento(true) }

  const containerStyle = {
    minHeight: '100vh', background: 'var(--color-bg-primary)',
    padding: '32px 16px 60px', fontFamily: FONT,
  }

  return (
    <div style={containerStyle}>

      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <div style={{ color: tk.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            Educação Continuada
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                Gestão de Trilhas
              </div>
              <div style={{ fontSize: 14, color: tk.foggy, marginTop: 6 }}>
                Organize cursos, módulos, exercícios e materiais de apoio em um único fluxo.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => setModalDuvidas(true)}
                style={{
                  background: 'transparent', color: tk.arches, border: `1.5px solid ${tk.arches}`, borderRadius: 99,
                  padding: '0 20px', height: 44, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
                  display: 'flex', alignItems: 'center', gap: 8, position: 'relative'
                }}
              >
                <Icon icon="solar:chat-square-dots-bold-duotone" width="18" /> Dúvidas
                {duvidasPendentes.length > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6, background: tk.rausch, color: '#fff',
                    fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 10, lineHeight: 1
                  }}>{duvidasPendentes.length}</span>
                )}
              </motion.button>
              <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setTrilhaAtiva(null); setFormTrilha({ nome: '', descricao: '', status: 'rascunho', capa_url: '', nivel: '', modulos: [] }); setModalTrilha(true) }}
                style={{
                  background: tk.rausch, color: '#fff', border: 'none', borderRadius: 99,
                  padding: '0 24px', height: 44, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT,
                  boxShadow: `0 4px 14px ${tk.rausch}40`, display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <Icon icon="solar:add-circle-bold-duotone" width="18" /> Nova Trilha
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* METRICS CARDS */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Trilhas Cadastradas', val: trilhas.length },
            { label: 'Publicadas / Rascunhos', val: `${trilhasPublicadas} / ${trilhasRascunho}` },
            { label: 'Módulos no Total', val: totalModulos }
          ].map((m, i) => (
            <div key={i} className="gq-card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: tk.foggy, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>{m.val}</div>
            </div>
          ))}
        </motion.div>

        {/* LISTA DE TRILHAS */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[0,1,2].map(i => <Skel key={i} h={140} r={20} />)}
          </div>
        ) : trilhas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: tk.foggy, fontSize: 14 }}>
            <Icon icon="solar:ghost-bold-duotone" width="48" style={{ marginBottom: 12, opacity: 0.2 }} />
            <div>Nenhuma trilha criada ainda.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <AnimatePresence>
              {trilhas.map((t, idx) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="gq-card" style={{ overflow: 'hidden' }}>
                  {/* Trilha Header */}
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      {t.capa_url ? (
                        <img src={t.capa_url} alt="capa" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 64, height: 64, borderRadius: 12, background: `${tk.babu}15`, color: tk.babu, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon icon="solar:book-bold-duotone" width="32" />
                        </div>
                      )}
                      <div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>{t.nome}</div>
                          <span style={{ background: t.status === 'publicado' ? `${tk.babu}15` : `${tk.arches}15`, color: t.status === 'publicado' ? tk.babu : tk.arches, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                            {t.status}
                          </span>
                          {t.nivel && <span style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: tk.foggy }}>{t.nivel}</span>}
                        </div>
                        <div style={{ fontSize: 13, color: tk.foggy, maxWidth: 600 }}>{t.descricao || 'Sem descrição cadastrada.'}</div>
                      </div>
                    </div>
                    {/* Ações da Trilha */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => abrirModalModulo(t)} title="Adicionar Módulo" style={{ background: `${tk.babu}15`, color: tk.babu, border: 'none', borderRadius: 8, padding: '0 12px', height: 36, fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Icon icon="solar:add-circle-bold-duotone" /> Módulo</motion.button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => verEngajamento(t)} title="Engajamento" style={{ background: 'transparent', color: tk.foggy, border: '1px solid var(--color-border)', borderRadius: 8, padding: '0 12px', height: 36, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Icon icon="solar:chart-square-bold-duotone" /> Engajamento</motion.button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => duplicarTrilha(t.id)} title="Duplicar" style={{ background: 'transparent', color: tk.foggy, border: '1px solid var(--color-border)', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon="solar:copy-bold-duotone" width="16" /></motion.button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setTrilhaAtiva(t); setFormTrilha({ ...t, capa_url: t.capa_url || '', nivel: t.nivel || '' }); setModalTrilha(true) }} title="Editar" style={{ background: 'transparent', color: tk.foggy, border: '1px solid var(--color-border)', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon="solar:pen-bold-duotone" width="16" /></motion.button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => deletarTrilha(t.id)} title="Excluir" style={{ background: `${tk.rausch}15`, color: tk.rausch, border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon="solar:trash-bin-trash-bold-duotone" width="16" /></motion.button>
                    </div>
                  </div>
                  {/* Módulos */}
                  <div style={{ padding: '16px 24px' }}>
                    {t.modulos?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {t.modulos.map(m => {
                          const isQuiz = m.materia_id || (m.questoes_selecionadas && m.questoes_selecionadas.length > 0)
                          const isVideo = m.link_video
                          const tipo = isQuiz ? { l: 'Quiz', c: tk.babu, i: 'solar:target-bold-duotone' } : isVideo ? { l: 'Vídeo', c: tk.rausch, i: 'solar:video-frame-play-bold-duotone' } : { l: 'Texto', c: tk.arches, i: 'solar:document-text-bold-duotone' }
                          return (
                            <motion.div key={m.id} whileHover={{ backgroundColor: 'var(--color-bg-tertiary)' }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--color-border)', transition: 'background 0.2s' }}>
                              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: tk.foggy }}>
                                  {m.ordem}
                                </div>
                                <div>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.nome}</span>
                                    <span style={{ background: `${tipo.c}15`, color: tipo.c, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}><Icon icon={tipo.i} /> {tipo.l}</span>
                                    {m.duracao_minutos && <span style={{ background: 'var(--color-bg-tertiary)', color: tk.foggy, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>{m.duracao_minutos} MIN</span>}
                                  </div>
                                  <div style={{ fontSize: 12, color: tk.foggy }}>{m.descricao || 'Sem descrição rápida.'}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => abrirModalModulo(t, m)} style={{ background: 'none', border: 'none', color: tk.foggy, cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }} onMouseEnter={e=>e.currentTarget.style.background='var(--color-bg-elevated)'} onMouseLeave={e=>e.currentTarget.style.background='none'}><Icon icon="solar:pen-bold-duotone" width="16" /></button>
                                <button onClick={() => deletarModulo(m.id)} style={{ background: 'none', border: 'none', color: tk.rausch, cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }} onMouseEnter={e=>e.currentTarget.style.background=`${tk.rausch}15`} onMouseLeave={e=>e.currentTarget.style.background='none'}><Icon icon="solar:trash-bin-trash-bold-duotone" width="16" /></button>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: tk.foggy, fontSize: 13, padding: '16px 0', background: 'var(--color-bg-tertiary)', borderRadius: 12 }}>Nenhum módulo cadastrado. Adicione a primeira aula!</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── MODAIS ── */}

      {/* Modal Trilha */}
      <CModal visible={modalTrilha} onClose={() => setModalTrilha(false)} backdrop="static">
        <div style={{ fontFamily: FONT }}>
          <CModalHeader style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: tk.rausch, textTransform: 'uppercase', letterSpacing: '1px' }}>{trilhaAtiva ? 'Editando' : 'Nova'}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>Trilha de Aprendizado</div>
            </div>
          </CModalHeader>
          <CModalBody style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><Label>Nome da Trilha (Curso)</Label><AInput value={formTrilha.nome} onChange={e => setFormTrilha({ ...formTrilha, nome: e.target.value })} placeholder="Ex: Contabilidade para Iniciantes" /></div>
              <div><Label>Descrição</Label><ATextarea value={formTrilha.descricao} onChange={e => setFormTrilha({ ...formTrilha, descricao: e.target.value })} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <Label>Status</Label>
                  <ASelect value={formTrilha.status} onChange={e => setFormTrilha({ ...formTrilha, status: e.target.value })}>
                    <option value="rascunho">Rascunho</option>
                    <option value="publicado">Publicado</option>
                  </ASelect>
                </div>
                <div>
                  <Label>Nível</Label>
                  <ASelect value={formTrilha.nivel} onChange={e => setFormTrilha({ ...formTrilha, nivel: e.target.value })}>
                    <option value="">Não definido</option>
                    <option value="Básico">Básico</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                  </ASelect>
                </div>
              </div>
              <div><Label>URL da Capa</Label><AInput value={formTrilha.capa_url} onChange={e => setFormTrilha({ ...formTrilha, capa_url: e.target.value })} placeholder="https://..." /></div>
            </div>
          </CModalBody>
          <CModalFooter style={{ borderTop: '1px solid var(--color-border)' }}>
            <motion.button onClick={() => setModalTrilha(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ height: 42, padding: '0 20px', borderRadius: 99, border: '1.5px solid var(--color-border)', background: 'transparent', color: tk.foggy, fontWeight: 600, fontFamily: FONT, cursor: 'pointer' }}>Cancelar</motion.button>
            <motion.button onClick={salvarTrilha} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ height: 42, padding: '0 24px', borderRadius: 99, border: 'none', background: tk.rausch, color: '#fff', fontWeight: 700, fontFamily: FONT, cursor: 'pointer', boxShadow: `0 4px 14px ${tk.rausch}40` }}>Salvar Trilha</motion.button>
          </CModalFooter>
        </div>
      </CModal>

      {/* Modal Módulo */}
      <CModal visible={modalModulo} onClose={() => setModalModulo(false)} backdrop="static" size="lg">
        <div style={{ fontFamily: FONT }}>
          <CModalHeader style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: tk.babu, textTransform: 'uppercase', letterSpacing: '1px' }}>{trilhaAtiva?.nome}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>{formModulo.id ? 'Editar Módulo' : 'Novo Módulo'}</div>
            </div>
          </CModalHeader>
          <CModalBody style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px', gap: 16 }}>
                <div><Label>Ordem</Label><AInput type="number" value={formModulo.ordem} onChange={e => setFormModulo({ ...formModulo, ordem: e.target.value })} /></div>
                <div><Label>Nome do Módulo (Aula)</Label><AInput value={formModulo.nome} onChange={e => setFormModulo({ ...formModulo, nome: e.target.value })} placeholder="Ex: Aula 1" /></div>
                <div><Label>Duração (min)</Label><AInput type="number" min="1" value={formModulo.duracao_minutos} onChange={e => setFormModulo({ ...formModulo, duracao_minutos: e.target.value })} placeholder="Ex: 15" /></div>
              </div>
              <div><Label>Descrição rápida</Label><AInput value={formModulo.descricao} onChange={e => setFormModulo({ ...formModulo, descricao: e.target.value })} /></div>
              
              <div style={{ padding: '16px', background: 'var(--color-bg-tertiary)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                <Label>Tipo de Conteúdo Primário</Label>
                <ASelect value={formModulo.tipo} onChange={e => setFormModulo({ ...formModulo, tipo: e.target.value })}>
                  <option value="video">🎥 Vídeo + Teoria (Padrão)</option>
                  <option value="texto">📄 Apenas Texto / Leitura</option>
                  <option value="quiz">📝 Quiz Prático (Exercícios)</option>
                </ASelect>
                
                {formModulo.tipo !== 'quiz' && (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div><Label>Link do YouTube / Vimeo</Label><AInput value={formModulo.link_video} onChange={e => setFormModulo({ ...formModulo, link_video: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></div>
                    <div><Label>Conteúdo Teórico (Apoio)</Label><ATextarea value={formModulo.texto_teorico} onChange={e => setFormModulo({ ...formModulo, texto_teorico: e.target.value })} rows={4} /></div>
                  </div>
                )}

                {formModulo.tipo === 'quiz' && (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div><Label>Vincular a Matéria inteira?</Label><ASelect value={formModulo.materia_id} onChange={e => setFormModulo({ ...formModulo, materia_id: e.target.value })}><option value="">Selecione uma matéria...</option>{materias.map(m => (<option key={m.id} value={m.id}>{m.nome}</option>))}</ASelect></div>
                    <div><Label>Ou IDs de Questões Específicas</Label><AInput value={formModulo.questoes_selecionadas} onChange={e => setFormModulo({ ...formModulo, questoes_selecionadas: e.target.value })} placeholder="Ex: 12, 45, 89" /></div>
                  </div>
                )}
              </div>
              <div><Label>Link de Material de Apoio (Opcional)</Label><AInput value={formModulo.material_apoio_url} onChange={e => setFormModulo({ ...formModulo, material_apoio_url: e.target.value })} placeholder="https://..." /></div>
            </div>
          </CModalBody>
          <CModalFooter style={{ borderTop: '1px solid var(--color-border)' }}>
            <motion.button onClick={() => setModalModulo(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ height: 42, padding: '0 20px', borderRadius: 99, border: '1.5px solid var(--color-border)', background: 'transparent', color: tk.foggy, fontWeight: 600, fontFamily: FONT, cursor: 'pointer' }}>Cancelar</motion.button>
            <motion.button onClick={salvarModulo} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ height: 42, padding: '0 24px', borderRadius: 99, border: 'none', background: tk.babu, color: '#fff', fontWeight: 700, fontFamily: FONT, cursor: 'pointer', boxShadow: `0 4px 14px ${tk.babu}40` }}>{formModulo.id ? 'Salvar Alterações' : 'Adicionar Módulo'}</motion.button>
          </CModalFooter>
        </div>
      </CModal>

      {/* Modal Engajamento */}
      <CModal visible={modalEngajamento} onClose={() => setModalEngajamento(false)} size="lg">
        <div style={{ fontFamily: FONT }}>
          <CModalHeader style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: tk.foggy, textTransform: 'uppercase', letterSpacing: '1px' }}>{trilhaAtiva?.nome}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>Métricas de Engajamento</div>
            </div>
          </CModalHeader>
          <CModalBody style={{ padding: '24px' }}>
            {loadingEngajamento ? <div style={{ textAlign: 'center', padding: '40px 0' }}><CSpinner color="primary" /></div> : dadosEngajamento.length === 0 ? <div style={{ textAlign: 'center', padding: '40px 0', color: tk.foggy, fontSize: 14 }}>Nenhum aluno iniciou esta trilha ainda.</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: tk.foggy }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '1px' }}>Aluno</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '1px' }}>Matrícula</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '1px' }}>Progresso</th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: '1px' }}>Módulos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosEngajamento.map(a => (
                      <tr key={a.matricula} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{a.nome}</td>
                        <td style={{ padding: '12px 8px', color: tk.foggy }}>{a.matricula}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${a.progresso_percentual}%`, height: '100%', background: a.progresso_percentual === 100 ? tk.babu : tk.rausch }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 800, color: a.progresso_percentual === 100 ? tk.babu : tk.rausch }}>{a.progresso_percentual}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: tk.foggy }}>{a.concluidos} / {a.total_modulos}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CModalBody>
        </div>
      </CModal>

      {/* Modal Dúvidas */}
      <CModal visible={modalDuvidas} onClose={() => setModalDuvidas(false)} size="lg">
        <div style={{ fontFamily: FONT }}>
          <CModalHeader style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: tk.arches, textTransform: 'uppercase', letterSpacing: '1px' }}>Suporte</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>Dúvidas Pendentes</div>
            </div>
          </CModalHeader>
          <CModalBody style={{ padding: '24px' }}>
            {duvidasPendentes.length === 0 ? <div style={{ textAlign: 'center', padding: '40px 0', color: tk.foggy, fontSize: 14 }}>Tudo limpo! Nenhuma dúvida pendente.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {duvidasPendentes.map(d => (
                  <div key={d.id} style={{ padding: '16px', border: '1px solid var(--color-border)', borderRadius: 16, background: 'var(--color-bg-tertiary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)' }}><Icon icon="solar:user-bold-duotone" width="16" color={tk.arches} /> {d.aluno_nome}</div>
                      <div style={{ fontSize: 11, color: tk.foggy }}>{new Date(d.data_criacao).toLocaleString('pt-BR')}</div>
                    </div>
                    <div style={{ fontSize: 11, color: tk.arches, fontWeight: 700, marginBottom: 12 }}>Em: {d.trilha_nome} &gt; {d.modulo_nome}</div>
                    <div style={{ padding: '12px', background: 'var(--color-bg-elevated)', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 12 }}>{d.texto}</div>
                    
                    {respondendoId === d.id ? (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <ATextarea placeholder="Escreva sua resposta..." rows={3} value={respostaDuvida} onChange={e => setRespostaDuvida(e.target.value)} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <motion.button onClick={() => setRespondendoId(null)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ height: 32, padding: '0 16px', borderRadius: 99, border: '1px solid var(--color-border)', background: 'transparent', color: tk.foggy, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>Cancelar</motion.button>
                          <motion.button onClick={() => responderDuvida(d.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ height: 32, padding: '0 16px', borderRadius: 99, border: 'none', background: tk.babu, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Enviar Resposta</motion.button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.button onClick={() => setRespondendoId(d.id)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ height: 32, padding: '0 16px', borderRadius: 99, border: 'none', background: tk.arches, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Responder</motion.button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CModalBody>
        </div>
      </CModal>

      {/* ── ALERTAS FLUTUANTES ── */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: tk.babu, color: '#fff', borderRadius: 99, padding: '12px 24px', fontWeight: 700, fontSize: 14, fontFamily: FONT, boxShadow: `0 8px 24px ${tk.babu}40`, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8 }}
          ><Icon icon="solar:check-circle-bold-duotone" width="20" /> {success}</motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onClick={() => setError('')}
            style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: tk.rausch, color: '#fff', borderRadius: 99, padding: '12px 24px', fontWeight: 700, fontSize: 14, fontFamily: FONT, boxShadow: `0 8px 24px ${tk.rausch}40`, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          ><Icon icon="solar:close-circle-bold-duotone" width="20" /> {error}</motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GestaoTrilhas
