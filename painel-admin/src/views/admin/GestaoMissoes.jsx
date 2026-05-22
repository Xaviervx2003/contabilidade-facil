import React, { useState, useEffect } from 'react'
import { CSpinner, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import { Icon } from '@iconify/react'
import api from '../../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../context/themeContext'
import { tokens as tk } from '../../tokens'

const FONT = "'Nunito', 'Circular Std', sans-serif"

/* ── Helpers ── */
const METRICA_LABELS = {
  manual:       { label: 'Manual',            icon: 'solar:hand-stars-bold-duotone', color: tk.foggy },
  sessoes:      { label: 'Nº de Sessões',     icon: 'solar:book-bold-duotone',       color: tk.babu },
  media_acerto: { label: 'Média de Acertos',  icon: 'solar:target-bold-duotone',     color: tk.arches },
  questoes:     { label: 'Qtd. de Questões',  icon: 'solar:pen-bold-duotone',        color: '#8B5CF6' },
}

const diasRestantesLabel = (data_limite) => {
  if (!data_limite) return null
  const diff = Math.ceil((new Date(data_limite + 'T23:59:59') - new Date()) / 86400000)
  if (diff < 0)  return { text: 'Expirada', color: tk.rausch }
  if (diff === 0) return { text: 'Vence hoje!', color: '#f59e0b' }
  if (diff === 1) return { text: 'Vence amanhã', color: '#f59e0b' }
  return { text: `${diff} dias restantes`, color: tk.babu }
}

const FORM_INICIAL = { titulo: '', descricao: '', xp: 100, icone: '🎯', cor: tk.rausch, metrica_tipo: 'manual', metrica_alvo: '', data_limite: '' }

/* ── Componentes UI Básicos ── */
const Label = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.9px', color: tk.foggy, marginBottom: 6, fontFamily: FONT }}>{children}</div>
)

const AInput = ({ value, onChange, placeholder, type = 'text', min, required }) => (
  <input required={required} type={type} min={min} value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', height: 42, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', padding: '0 14px', fontSize: 13, fontFamily: FONT, outline: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = tk.rausch} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
)

const ATextarea = ({ value, onChange, placeholder, rows = 3, required }) => (
  <textarea required={required} rows={rows} value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', padding: '12px 14px', fontSize: 13, fontFamily: FONT, outline: 'none', transition: 'border-color 0.2s', resize: 'vertical' }} onFocus={e => e.target.style.borderColor = tk.rausch} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
)

const ASelect = ({ value, onChange, children }) => (
  <select value={value} onChange={onChange} style={{ width: '100%', height: 42, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', padding: '0 14px', fontSize: 13, fontFamily: FONT, outline: 'none', transition: 'border-color 0.2s', cursor: 'pointer' }} onFocus={e => e.target.style.borderColor = tk.rausch} onBlur={e => e.target.style.borderColor = 'var(--color-border)'}>{children}</select>
)

const GestaoMissoes = () => {
  const [missoes, setMissoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [form, setForm] = useState(FORM_INICIAL)
  const [modalDel, setModalDel] = useState(null)
  
  const { isDark } = useTheme()

  const fetchMissoes = async () => {
    setLoading(true)
    try {
      const r = await api.get('/api/admin/missoes')
      setMissoes(r.data)
    } catch (e) {
      setErro(`Erro ao carregar: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMissoes() }, [])

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro(''); setSucesso(''); setSalvando(true)
    try {
      const payload = {
        ...form,
        xp: Number(form.xp),
        metrica_alvo: form.metrica_tipo !== 'manual' ? Number(form.metrica_alvo) : null,
        data_limite: form.data_limite || null,
      }
      await api.post('/api/admin/missoes', payload)
      setSucesso('Missão criada com sucesso!')
      setForm(FORM_INICIAL)
      fetchMissoes()
      setTimeout(() => setSucesso(''), 3000)
    } catch (e) {
      setErro(`Erro: ${e.message}`); setTimeout(() => setErro(''), 3000)
    } finally {
      setSalvando(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/admin/missoes/${id}`)
      setMissoes(m => m.filter(x => x.id !== id))
      setModalDel(null)
      setSucesso('Missão excluída!')
      setTimeout(() => setSucesso(''), 3000)
    } catch {
      setErro('Erro ao excluir missão.'); setTimeout(() => setErro(''), 3000)
    }
  }

  const isAutomatica = form.metrica_tipo !== 'manual'

  const containerStyle = { minHeight: '100vh', background: 'var(--color-bg-primary)', padding: '32px 16px 60px', fontFamily: FONT }

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <div style={{ color: tk.arches, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            Gamificação
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                Gestão de Missões
              </div>
              <div style={{ fontSize: 14, color: tk.foggy, marginTop: 6 }}>
                Crie desafios inteligentes com validação automática e prazo.
              </div>
            </div>
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
          
          {/* FORMULÁRIO (ESQUERDA) */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 20, padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon icon="solar:star-fall-bold-duotone" width="20" color={tk.arches} /> Novo Desafio
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 80 }}><Label>Ícone</Label><AInput value={form.icone} onChange={e => handleField('icone', e.target.value)} /></div>
                  <div style={{ flex: 1 }}><Label>Título *</Label><AInput required value={form.titulo} onChange={e => handleField('titulo', e.target.value)} placeholder="Ex: Semana Implacável" /></div>
                </div>
                
                <div><Label>Descrição *</Label><ATextarea required value={form.descricao} onChange={e => handleField('descricao', e.target.value)} placeholder="Descreva o desafio..." /></div>
                
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}><Label>XP de Recompensa</Label><AInput type="number" min="10" value={form.xp} onChange={e => handleField('xp', e.target.value)} /></div>
                  <div style={{ width: 80 }}><Label>Cor</Label><input type="color" value={form.cor} onChange={e => handleField('cor', e.target.value)} style={{ width: '100%', height: 42, padding: 4, borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-elevated)', cursor: 'pointer' }} /></div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 4 }}>
                  <Label><span style={{ color: tk.rausch }}>🤖 Validação Automática</span></Label>
                  <ASelect value={form.metrica_tipo} onChange={e => handleField('metrica_tipo', e.target.value)}>
                    <option value="manual">✋ Manual (aluno confirma)</option>
                    <option value="sessoes">📚 Nº de Sessões</option>
                    <option value="media_acerto">🎯 Média de Acertos (%)</option>
                    <option value="questoes">📝 Qtd. de Questões</option>
                  </ASelect>
                </div>

                <AnimatePresence>
                  {isAutomatica && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                      <Label>Meta / Alvo * <span style={{ fontWeight: 400, textTransform: 'none' }}>{form.metrica_tipo === 'sessoes' ? '(ex: 5)' : form.metrica_tipo === 'media_acerto' ? '(ex: 70 para 70%)' : '(ex: 100)'}</span></Label>
                      <AInput required={isAutomatica} type="number" min="1" value={form.metrica_alvo} onChange={e => handleField('metrica_alvo', e.target.value)} placeholder="Ex: 5" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <Label>📅 Prazo Máximo <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></Label>
                  <AInput type="date" min={new Date().toISOString().split('T')[0]} value={form.data_limite} onChange={e => handleField('data_limite', e.target.value)} />
                </div>

                <motion.button type="submit" disabled={salvando} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ height: 48, borderRadius: 12, border: 'none', background: tk.rausch, color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: FONT, cursor: 'pointer', boxShadow: `0 4px 14px ${tk.rausch}40`, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {salvando ? <CSpinner size="sm" /> : <><Icon icon="solar:rocket-bold-duotone" width="18" /> Lançar Desafio</>}
                </motion.button>
              </div>
            </form>
          </motion.div>

          {/* LISTA DE MISSÕES (DIREITA) */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 20, overflow: 'hidden', gridColumn: 'span 2' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>📋 Missões Ativas ({missoes.length})</div>
              <motion.button onClick={fetchMissoes} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ background: 'transparent', border: '1px solid var(--color-border)', color: tk.foggy, borderRadius: 8, padding: '0 12px', height: 32, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Icon icon="solar:restart-bold-duotone" /> Atualizar</motion.button>
            </div>
            
            {loading ? <div style={{ padding: 60, textAlign: 'center' }}><CSpinner color="primary" /></div> : missoes.length === 0 ? <div style={{ padding: 60, textAlign: 'center', color: tk.foggy }}><Icon icon="solar:target-bold-duotone" width="48" style={{ opacity: 0.2, marginBottom: 12 }} /><div>Nenhuma missão criada ainda.</div></div> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-tertiary)', color: tk.foggy }}>
                      <th style={{ padding: '12px 24px', textAlign: 'left', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>Missão</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>Validação</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>Meta</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>Prazo</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>XP</th>
                      <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {missoes.map((m) => {
                        const metrica = METRICA_LABELS[m.metrica_tipo] || METRICA_LABELS.manual
                        const prazo = diasRestantesLabel(m.data_limite)
                        return (
                          <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ fontSize: 24, background: `${m.cor || tk.rausch}15`, width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.icone || '🎯'}</div>
                                <div>
                                  <div style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>{m.titulo}</div>
                                  <div style={{ color: tk.foggy, fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.descricao}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center' }}>
                              <span style={{ fontSize: 10, fontWeight: 800, background: `${metrica.color}15`, color: metrica.color, padding: '4px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}><Icon icon={metrica.icon} /> {metrica.label}</span>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                              {m.metrica_alvo != null ? `${m.metrica_alvo}${m.metrica_tipo === 'media_acerto' ? '%' : ''}` : <span style={{ color: tk.foggy }}>—</span>}
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center' }}>
                              {prazo ? (
                                <span style={{ fontSize: 10, fontWeight: 800, background: `${prazo.color}15`, color: prazo.color, padding: '4px 10px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}><Icon icon="solar:calendar-date-bold-duotone" /> {prazo.text}</span>
                              ) : <span style={{ color: tk.foggy, fontSize: 11, fontWeight: 700 }}>—</span>}
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center', fontWeight: 800, color: m.cor || tk.arches }}>+{m.xp} XP</td>
                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                              <motion.button onClick={() => setModalDel(m.id)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} style={{ background: `${tk.rausch}15`, color: tk.rausch, border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon icon="solar:trash-bin-trash-bold-duotone" width="16" /></motion.button>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* MODAL EXCLUSÃO */}
      <CModal visible={!!modalDel} onClose={() => setModalDel(null)}>
        <div style={{ fontFamily: FONT }}>
          <CModalHeader style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: tk.rausch, textTransform: 'uppercase', letterSpacing: '1px' }}>Atenção</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>Excluir Missão?</div>
            </div>
          </CModalHeader>
          <CModalBody style={{ padding: '24px', color: 'var(--color-text-primary)', fontSize: 14 }}>Esta ação é irreversível. O progresso dos alunos nesta missão também será perdido. Deseja continuar?</CModalBody>
          <CModalFooter style={{ borderTop: '1px solid var(--color-border)' }}>
            <motion.button onClick={() => setModalDel(null)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ height: 42, padding: '0 20px', borderRadius: 99, border: '1px solid var(--color-border)', background: 'transparent', color: tk.foggy, fontWeight: 600, fontFamily: FONT, cursor: 'pointer' }}>Cancelar</motion.button>
            <motion.button onClick={() => handleDelete(modalDel)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ height: 42, padding: '0 24px', borderRadius: 99, border: 'none', background: tk.rausch, color: '#fff', fontWeight: 700, fontFamily: FONT, cursor: 'pointer', boxShadow: `0 4px 14px ${tk.rausch}40` }}>Sim, Excluir</motion.button>
          </CModalFooter>
        </div>
      </CModal>

      {/* ALERTAS */}
      <AnimatePresence>
        {sucesso && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: tk.babu, color: '#fff', borderRadius: 99, padding: '12px 24px', fontWeight: 700, fontSize: 14, fontFamily: FONT, boxShadow: `0 8px 24px ${tk.babu}40`, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8 }}><Icon icon="solar:check-circle-bold-duotone" width="20" /> {sucesso}</motion.div>
        )}
        {erro && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onClick={() => setErro('')} style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: tk.rausch, color: '#fff', borderRadius: 99, padding: '12px 24px', fontWeight: 700, fontSize: 14, fontFamily: FONT, boxShadow: `0 8px 24px ${tk.rausch}40`, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><Icon icon="solar:close-circle-bold-duotone" width="20" /> {erro}</motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GestaoMissoes
