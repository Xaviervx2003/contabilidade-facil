import React, { useState, useEffect } from 'react'
import {
  CCard, CCardBody, CCardHeader, CCol, CRow, CButton, CAlert,
  CFormInput, CFormLabel, CFormSelect, CFormTextarea, CSpinner,
  CBadge, CTable, CTableBody, CTableDataCell, CTableHead,
  CTableHeaderCell, CTableRow, CModal, CModalBody, CModalFooter,
  CModalHeader, CModalTitle,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash, cilPencil, cilClock, cilCheckCircle, cilWarning } from '@coreui/icons'
import { API_URL } from '../../config'
import { motion, AnimatePresence } from 'framer-motion'

/* ── Helpers ── */
const METRICA_LABELS = {
  manual:       { label: 'Manual',            icon: '✋', color: '#767676' },
  sessoes:      { label: 'Nº de Sessões',     icon: '📚', color: '#00A699' },
  media_acerto: { label: 'Média de Acertos',  icon: '🎯', color: '#FC642D' },
  questoes:     { label: 'Qtd. de Questões',  icon: '📝', color: '#8B5CF6' },
}

const STATUS_CONFIG = {
  pendente:  { color: '#f59e0b', bg: '#fef3c7', label: 'Pendente'  },
  concluida: { color: '#10b981', bg: '#d1fae5', label: 'Concluída' },
  expirada:  { color: '#ef4444', bg: '#fee2e2', label: 'Expirada'  },
}

const diasRestantesLabel = (data_limite) => {
  if (!data_limite) return null
  const diff = Math.ceil((new Date(data_limite + 'T23:59:59') - new Date()) / 86400000)
  if (diff < 0)  return { text: 'Expirada', color: '#ef4444' }
  if (diff === 0) return { text: 'Vence hoje!', color: '#f59e0b' }
  if (diff === 1) return { text: 'Vence amanhã', color: '#f59e0b' }
  return { text: `${diff} dias restantes`, color: '#10b981' }
}

/* ── Estado inicial do formulário ── */
const FORM_INICIAL = {
  titulo: '',
  descricao: '',
  xp: 100,
  icone: '🎯',
  cor: '#FF385C',
  metrica_tipo: 'manual',
  metrica_alvo: '',
  data_limite: '',
}

/* ── Componente Principal ── */
const GestaoMissoes = () => {
  const [missoes,    setMissoes]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [salvando,   setSalvando]   = useState(false)
  const [erro,       setErro]       = useState('')
  const [sucesso,    setSucesso]    = useState('')
  const [form,       setForm]       = useState(FORM_INICIAL)
  const [modalDel,   setModalDel]   = useState(null)   // id da missão a deletar

  const fetchMissoes = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/api/admin/missoes`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setMissoes(await r.json())
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
        xp:            Number(form.xp),
        metrica_alvo:  form.metrica_tipo !== 'manual' ? Number(form.metrica_alvo) : null,
        data_limite:   form.data_limite || null,
      }
      const r = await fetch(`${API_URL}/api/admin/missoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) {
        const err = await r.json()
        throw new Error(err.detail || `HTTP ${r.status}`)
      }
      setSucesso('✅ Missão criada com sucesso!')
      setForm(FORM_INICIAL)
      fetchMissoes()
    } catch (e) {
      setErro(`Erro: ${e.message}`)
    } finally {
      setSalvando(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const r = await fetch(`${API_URL}/api/admin/missoes/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error()
      setMissoes(m => m.filter(x => x.id !== id))
      setModalDel(null)
    } catch {
      setErro('Erro ao excluir missão.')
    }
  }

  const isAutomatica = form.metrica_tipo !== 'manual'

  return (
    <div style={{ padding: '24px 16px', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');`}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-0.5px', color: 'var(--color-text-primary)', margin: 0 }}>
          🎯 Gestão de Missões
        </h2>
        <p style={{ color: '#767676', fontSize: 14, marginTop: 4 }}>
          Crie desafios inteligentes com validação automática e prazo.
        </p>
      </div>

      <AnimatePresence>
        {erro    && <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}><CAlert color="danger"   dismissible onClose={() => setErro('')}>{erro}</CAlert></motion.div>}
        {sucesso && <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}><CAlert color="success" dismissible onClose={() => setSucesso('')}>{sucesso}</CAlert></motion.div>}
      </AnimatePresence>

      <CRow className="g-4">
        {/* ── Formulário ── */}
        <CCol xs={12} lg={4}>
          <CCard style={{ border: '1px solid var(--color-border)', borderRadius: 20, boxShadow: 'none' }}>
            <CCardHeader style={{ background: 'transparent', border: 'none', paddingBottom: 0, paddingTop: 20 }}>
              <strong style={{ fontSize: 15 }}>➕ Novo Desafio</strong>
            </CCardHeader>
            <CCardBody>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Ícone + Título */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 70 }}>
                      <CFormLabel style={{ fontSize: 12 }}>Ícone</CFormLabel>
                      <CFormInput value={form.icone} onChange={e => handleField('icone', e.target.value)} style={{ textAlign: 'center', fontSize: 20 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <CFormLabel style={{ fontSize: 12 }}>Título *</CFormLabel>
                      <CFormInput required value={form.titulo} onChange={e => handleField('titulo', e.target.value)} placeholder="Ex: Semana Implacável" />
                    </div>
                  </div>

                  {/* Descrição */}
                  <div>
                    <CFormLabel style={{ fontSize: 12 }}>Descrição *</CFormLabel>
                    <CFormTextarea required rows={2} value={form.descricao} onChange={e => handleField('descricao', e.target.value)} placeholder="Descreva o desafio..." />
                  </div>

                  {/* XP + Cor */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <CFormLabel style={{ fontSize: 12 }}>XP de Recompensa</CFormLabel>
                      <CFormInput type="number" min="10" value={form.xp} onChange={e => handleField('xp', e.target.value)} />
                    </div>
                    <div style={{ width: 70 }}>
                      <CFormLabel style={{ fontSize: 12 }}>Cor</CFormLabel>
                      <CFormInput type="color" value={form.cor} onChange={e => handleField('cor', e.target.value)} style={{ padding: 4, height: 38 }} />
                    </div>
                  </div>

                  {/* ── NOVO: Tipo de Validação ── */}
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
                    <CFormLabel style={{ fontSize: 12, fontWeight: 700, color: '#FF385C' }}>🤖 Validação Automática</CFormLabel>
                    <CFormSelect value={form.metrica_tipo} onChange={e => handleField('metrica_tipo', e.target.value)}>
                      <option value="manual">✋ Manual (aluno confirma)</option>
                      <option value="sessoes">📚 Nº de Sessões</option>
                      <option value="media_acerto">🎯 Média de Acertos (%)</option>
                      <option value="questoes">📝 Qtd. de Questões</option>
                    </CFormSelect>
                  </div>

                  {/* ── NOVO: Meta Numérica (só se automática) ── */}
                  <AnimatePresence>
                    {isAutomatica && (
                      <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} style={{ overflow:'hidden' }}>
                        <CFormLabel style={{ fontSize: 12 }}>
                          Meta / Alvo *
                          <span style={{ color:'#767676', marginLeft:6, fontWeight:400 }}>
                            {form.metrica_tipo === 'sessoes'      && '(ex: 5 sessões)'}
                            {form.metrica_tipo === 'media_acerto' && '(ex: 70 para 70%)'}
                            {form.metrica_tipo === 'questoes'     && '(ex: 100 questões)'}
                          </span>
                        </CFormLabel>
                        <CFormInput
                          type="number" min="1" required={isAutomatica}
                          value={form.metrica_alvo}
                          onChange={e => handleField('metrica_alvo', e.target.value)}
                          placeholder={form.metrica_tipo === 'media_acerto' ? 'Ex: 70' : 'Ex: 5'}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── NOVO: Data Limite ── */}
                  <div>
                    <CFormLabel style={{ fontSize: 12 }}>
                      📅 Prazo Máximo
                      <span style={{ color:'#767676', marginLeft:6, fontWeight:400 }}>(opcional)</span>
                    </CFormLabel>
                    <CFormInput type="date" value={form.data_limite} onChange={e => handleField('data_limite', e.target.value)} min={new Date().toISOString().split('T')[0]} />
                  </div>

                  <CButton type="submit" color="primary" disabled={salvando} style={{ borderRadius: 12, fontWeight: 700, padding: '10px 0', background: '#FF385C', border: 'none' }}>
                    {salvando ? <CSpinner size="sm" /> : '🚀 Lançar Desafio'}
                  </CButton>
                </div>
              </form>
            </CCardBody>
          </CCard>
        </CCol>

        {/* ── Tabela de Missões ── */}
        <CCol xs={12} lg={8}>
          <CCard style={{ border: '1px solid var(--color-border)', borderRadius: 20, boxShadow: 'none' }}>
            <CCardHeader style={{ background: 'transparent', border: 'none', paddingTop: 20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <strong style={{ fontSize: 15 }}>📋 Missões Ativas ({missoes.length})</strong>
              <CButton color="secondary" variant="outline" size="sm" onClick={fetchMissoes} style={{ borderRadius: 10 }}>
                Atualizar
              </CButton>
            </CCardHeader>
            <CCardBody style={{ padding: 0 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><CSpinner color="primary" /></div>
              ) : missoes.length === 0 ? (
                <div style={{ textAlign:'center', padding:40, color:'#767676', fontSize:14 }}>
                  Nenhuma missão criada ainda.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <CTable hover responsive style={{ marginBottom: 0, fontSize: 13 }}>
                    <CTableHead>
                      <CTableRow style={{ background: 'var(--color-bg-tertiary)' }}>
                        <CTableHeaderCell>Missão</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Validação</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Meta</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Prazo</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">XP</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Ações</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {missoes.map((m) => {
                        const metrica = METRICA_LABELS[m.metrica_tipo] || METRICA_LABELS.manual
                        const prazo   = diasRestantesLabel(m.data_limite)
                        return (
                          <CTableRow key={m.id}>
                            <CTableDataCell>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <span style={{ fontSize:20 }}>{m.icone || '🎯'}</span>
                                <div>
                                  <div style={{ fontWeight:700, color:'var(--color-text-primary)' }}>{m.titulo}</div>
                                  <div style={{ color:'#767676', fontSize:11, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.descricao}</div>
                                </div>
                              </div>
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              <span style={{ fontSize:11, fontWeight:700, background:`${metrica.color}15`, color:metrica.color, padding:'3px 10px', borderRadius:99 }}>
                                {metrica.icon} {metrica.label}
                              </span>
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              {m.metrica_alvo != null
                                ? <strong style={{ color:'var(--color-text-primary)' }}>{m.metrica_alvo}{m.metrica_tipo === 'media_acerto' ? '%' : ''}</strong>
                                : <span style={{ color:'#B0B0B0' }}>—</span>
                              }
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              {prazo ? (
                                <span style={{ fontSize:11, fontWeight:700, background:`${prazo.color}15`, color:prazo.color, padding:'3px 10px', borderRadius:99 }}>
                                  📅 {prazo.text}
                                </span>
                              ) : (
                                <span style={{ color:'#B0B0B0', fontSize:12 }}>Sem prazo</span>
                              )}
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              <span style={{ fontWeight:800, color:'#FF385C' }}>+{m.xp} XP</span>
                            </CTableDataCell>
                            <CTableDataCell className="text-center">
                              <CButton color="danger" variant="ghost" size="sm" onClick={() => setModalDel(m.id)} style={{ borderRadius:8 }}>
                                <CIcon icon={cilTrash} />
                              </CButton>
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* ── Modal Confirmação Delete ── */}
      <CModal visible={!!modalDel} onClose={() => setModalDel(null)}>
        <CModalHeader><CModalTitle>Excluir Missão?</CModalTitle></CModalHeader>
        <CModalBody>Esta ação é irreversível. O progresso dos alunos nesta missão também será perdido.</CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setModalDel(null)}>Cancelar</CButton>
          <CButton color="danger" onClick={() => handleDelete(modalDel)}>Excluir</CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default GestaoMissoes
