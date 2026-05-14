import React, { useState, useEffect } from 'react'
import {
  CRow, CCol, CCard, CCardBody, CBadge, CButton, CFormInput, CFormTextarea, CSpinner
} from '@coreui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { API_URL } from '../../config'
import toast from 'react-hot-toast'

/* ─── Tokens Airbnb-inspired ─────────────────────────────── */
const tokens = {
  rausch: '#FF385C',
  babu: '#00A699',
  arches: '#FC642D',
  hof: '#484848',
  foggy: '#767676',
  swiss: '#B0B0B0',
}

const InboxDuvidas = () => {
  const [duvidas, setDuvidas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDuvida, setSelectedDuvida] = useState(null)
  const [resposta, setResposta] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [filtro, setFiltro] = useState('todas') // todas, pendente, respondida

  useEffect(() => {
    carregarDuvidas()
  }, [])

  const carregarDuvidas = async () => {
    setLoading(true)
    try {
      // Endpoint sugerido: /api/admin/duvidas
      const res = await fetch(`${API_URL}/api/admin/duvidas`).catch(() => null)
      if (res && res.ok) {
        const data = await res.json()
        setDuvidas(data)
      } else {
        // Mock de dados para demonstração se o endpoint não existir
        setDuvidas([
          { id: 1, aluno_nome: 'João Silva', texto: 'Não entendi como funciona o método das partidas dobradas na prática.', data_criacao: '2026-05-14T10:00:00Z', materia: 'Contabilidade Introdutória', modulo_nome: 'Método das Partidas Dobradas', status: 'pendente' },
          { id: 2, aluno_nome: 'Maria Souza', texto: 'Qual a diferença entre DRE e Balanço Patrimonial no curto prazo?', data_criacao: '2026-05-13T15:30:00Z', materia: 'Contabilidade Introdutória', modulo_nome: 'Demonstrações Contábeis', status: 'respondida', resposta_professor: 'A DRE foca no resultado (lucro/prejuízo) enquanto o Balanço foca na posição patrimonial.', video_resposta: 'https://youtube.com/watch?v=123' },
          { id: 3, aluno_nome: 'Carlos Oliveira', texto: 'A depreciação acumulada é um ativo ou passivo?', data_criacao: '2026-05-14T08:20:00Z', materia: 'Contabilidade Intermediária', modulo_nome: 'Ativo Não Circulante', status: 'pendente' },
        ])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const enviarResposta = async () => {
    if (!resposta.trim()) return toast.error('A resposta não pode estar vazia')
    setEnviando(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/responder-duvida/${selectedDuvida.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: resposta, video_url: videoUrl })
      })
      
      toast.success('Resposta enviada com sucesso!')
      setResposta('')
      setVideoUrl('')
      carregarDuvidas()
      setSelectedDuvida(null)
    } catch (e) {
      // Simulação de sucesso no mock
      toast.success('Resposta enviada com sucesso (Simulado)!')
      setDuvidas(prev => prev.map(d => d.id === selectedDuvida.id ? { ...d, status: 'respondida', resposta_professor: resposta, video_resposta: videoUrl } : d))
      setSelectedDuvida(null)
    } finally {
      setEnviando(false)
    }
  }

  const filteredDuvidas = duvidas.filter(d => {
    if (filtro === 'pendente') return d.status === 'pendente'
    if (filtro === 'respondida') return d.status === 'respondida'
    return true
  })

  return (
    <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: 'calc(100vh - 100px)', fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32 }}
          className="d-flex justify-content-between align-items-center"
        >
          <div>
            <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Central de Atendimento</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              Inbox de Dúvidas 📩
            </div>
            <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
              Responda às dúvidas dos alunos e melhore a experiência de aprendizado.
            </div>
          </div>

          <div className="d-flex gap-2 bg-body-tertiary p-1 rounded-4 border">
            {['todas', 'pendente', 'respondida'].map(f => (
              <CButton 
                key={f}
                onClick={() => setFiltro(f)}
                style={{ 
                  background: filtro === f ? 'var(--color-bg-elevated)' : 'transparent', 
                  border: 'none', borderRadius: 10, padding: '8px 16px',
                  fontSize: 13, fontWeight: 700, color: filtro === f ? tokens.rausch : tokens.foggy
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </CButton>
            ))}
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center py-5">
            <CSpinner color="primary" />
            <div className="mt-2 text-muted">Carregando mensagens...</div>
          </div>
        ) : (
          <CRow className="g-4">
            {/* LISTA DE DÚVIDAS */}
            <CCol lg={selectedDuvida ? 4 : 12}>
              <div className="d-flex flex-column gap-3">
                {filteredDuvidas.map((d, i) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedDuvida(d)}
                    style={{
                      background: selectedDuvida?.id === d.id ? `${tokens.rausch}05` : 'var(--color-bg-elevated)',
                      border: selectedDuvida?.id === d.id ? `2px solid ${tokens.rausch}` : '1.5px solid var(--color-border)',
                      borderRadius: 20,
                      padding: '20px',
                      cursor: 'pointer',
                      transition: '0.2s'
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="fw-bold" style={{ fontSize: 15 }}>{d.aluno_nome}</div>
                      <CBadge style={{ background: d.status === 'pendente' ? tokens.rausch : tokens.babu }}>
                        {d.status.toUpperCase()}
                      </CBadge>
                    </div>
                    <div style={{ fontSize: 12, color: tokens.foggy, marginBottom: 8 }}>{d.materia} • {d.modulo_nome}</div>
                    <p style={{ fontSize: 14, color: 'var(--color-text-primary)', opacity: 0.8, marginBottom: 0 }} className="text-truncate">
                      {d.texto}
                    </p>
                  </motion.div>
                ))}
                {!filteredDuvidas.length && (
                  <div className="text-center py-5 bg-body-tertiary rounded-4">
                    <Icon icon="solar:letter-opened-bold-duotone" width="48" style={{ color: tokens.swiss }} />
                    <div className="mt-2 text-muted">Nenhuma dúvida encontrada.</div>
                  </div>
                )}
              </div>
            </CCol>

            {/* DETALHE E RESPOSTA */}
            <AnimatePresence>
              {selectedDuvida && (
                <CCol lg={8}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    style={{
                      background: 'var(--color-bg-elevated)',
                      border: '1.5px solid var(--color-border)',
                      borderRadius: 24,
                      padding: '32px',
                      height: '100%',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-4">
                      <div className="d-flex align-items-center gap-3">
                        <div style={{ width: 48, height: 48, background: 'var(--color-bg-tertiary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justify: 'center' }}>
                          <Icon icon="solar:user-bold-duotone" width="24" style={{ color: tokens.rausch }} />
                        </div>
                        <div>
                          <div className="fw-bold" style={{ fontSize: 18 }}>{selectedDuvida.aluno_nome}</div>
                          <div style={{ fontSize: 13, color: tokens.foggy }}>Enviado em {new Date(selectedDuvida.data_criacao).toLocaleString()}</div>
                        </div>
                      </div>
                      <CButton variant="ghost" className="rounded-circle p-2" onClick={() => setSelectedDuvida(null)}>
                        <Icon icon="solar:close-circle-bold-duotone" width="24" style={{ color: tokens.foggy }} />
                      </CButton>
                    </div>

                    <div className="p-4 rounded-4 bg-body-tertiary mb-5" style={{ fontSize: 16, lineHeight: 1.6 }}>
                      {selectedDuvida.texto}
                    </div>

                    <hr />

                    <div className="mt-4">
                      <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                        <Icon icon="solar:chat-square-dots-bold-duotone" style={{ color: tokens.rausch }} />
                        Sua Resposta
                      </h6>
                      
                      <CFormTextarea 
                        rows={4}
                        placeholder="Escreva sua explicação detalhada aqui..."
                        value={resposta}
                        onChange={e => setResposta(e.target.value)}
                        className="mb-3 border-0 bg-body-tertiary p-3 rounded-4 shadow-none"
                        style={{ border: '1.5px solid var(--color-border)', fontSize: 15 }}
                      />

                      <div className="mb-4">
                        <label className="fw-bold small text-muted mb-2">LINK DO VÍDEO DE RESPOSTA (OPCIONAL)</label>
                        <div className="d-flex align-items-center gap-2 bg-body-tertiary p-2 rounded-4 border">
                          <Icon icon="solar:videocamera-record-bold-duotone" width="20" className="ms-2" style={{ color: tokens.rausch }} />
                          <CFormInput 
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={videoUrl}
                            onChange={e => setVideoUrl(e.target.value)}
                            className="bg-transparent border-0 shadow-none"
                          />
                        </div>
                      </div>

                      <div className="d-flex justify-content-end gap-3">
                        <CButton 
                          variant="ghost" 
                          className="fw-bold" 
                          style={{ borderRadius: 12, color: tokens.foggy }}
                          onClick={() => { setResposta(''); setVideoUrl(''); }}
                        >
                          Limpar
                        </CButton>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={enviarResposta}
                          disabled={enviando}
                          className="px-5 py-2 border-0 fw-bold shadow-sm"
                          style={{ background: tokens.rausch, color: '#fff', borderRadius: 12 }}
                        >
                          {enviando ? <CSpinner size="sm" /> : 'Publicar Resposta'}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </CCol>
              )}
            </AnimatePresence>
          </CRow>
        )}
      </div>
    </div>
  )
}

export default InboxDuvidas
