import React, { useEffect, useState, useCallback } from 'react'
import {
  CAlert, CButton, CCol, CRow, CSpinner, CBadge, CModal, CModalHeader, CModalBody, CModalFooter, CFormTextarea
} from '@coreui/react'
import { API_URL } from '../../config'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useTheme } from '../../context/themeContext'
import { formatIsoToDateString } from '../../utils/formatDate'
import { useNavigate } from 'react-router-dom'
import { getAlunoMatricula } from '../../utils/auth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

/* ─── Tokens Airbnb-inspired ─────────────────────────────── */
const tokens = {
  rausch: '#FF385C',
  babu: '#00A699',
  arches: '#FC642D',
  hof: '#484848',
  foggy: '#767676',
  swiss: '#B0B0B0',
}

/* ─── SCard Component ─── */
const SCard = ({ children, delay = 0, style = {} }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    style={{
      background: 'var(--color-bg-elevated)',
      borderRadius: 20,
      padding: '24px',
      border: '1.5px solid var(--color-border)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
      height: '100%',
      ...style
    }}
  >
    {children}
  </motion.div>
)

/* ─── AirbnbProgress ─── */
const AirbnbProgress = ({ value, color = tokens.rausch }) => (
  <div style={{ height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 10, overflow: 'hidden' }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 1, ease: 'easeOut' }}
      style={{ height: '100%', background: color, borderRadius: 10 }}
    />
  </div>
)

const MinhasTrilhas = () => {
  const [modalAula, setModalAula] = useState(false)
  const [moduloAtivo, setModuloAtivo] = useState(null)
  const [salvando, setSalvando] = useState(null)
  const [abaAtiva, setAbaAtiva] = useState('aula')
  const [novaDuvida, setNovaDuvida] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const matricula = getAlunoMatricula()

  const { data: trilhas = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['minhasTrilhas', matricula],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/trilhas/aluno/${matricula}`)
      if (!res.ok) throw new Error('Erro ao carregar as trilhas')
      return res.json()
    },
    enabled: !!matricula,
  })

  const { data: duvidas = [], refetch: refetchDuvidas } = useQuery({
    queryKey: ['duvidasModulo', moduloAtivo?.id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/trilhas/modulos/${moduloAtivo.id}/duvidas`)
      return res.json()
    },
    enabled: !!moduloAtivo && abaAtiva === 'duvidas',
  })

  const mutationConcluir = useMutation({
    mutationFn: async (moduloId) => {
      await fetch(`${API_URL}/api/trilhas/progresso/${moduloId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula }),
      })
    },
    onMutate: (id) => setSalvando(id),
    onSuccess: () => {
      toast.success('Progresso salvo!')
      queryClient.invalidateQueries({ queryKey: ['minhasTrilhas', matricula] })
    },
    onSettled: () => setSalvando(null),
  })

  const mutationDuvida = useMutation({
    mutationFn: async () => {
      await fetch(`${API_URL}/api/trilhas/duvidas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulo_id: moduloAtivo.id, texto: novaDuvida, matricula }),
      })
    },
    onSuccess: () => {
      toast.success('Dúvida enviada!')
      setNovaDuvida(''); refetchDuvidas();
    },
  })

  const handleAcessarModulo = (m) => {
    if (m.link_video || m.texto_teorico) {
      setModuloAtivo(m); setAbaAtiva('aula'); setModalAula(true);
    } else if (m.materia_id || (m.questoes_selecionadas?.length > 0)) {
      const url = m.questoes_selecionadas?.length > 0 
        ? `/quiz?ids=${m.questoes_selecionadas.join(',')}&modulo_id=${m.id}`
        : `/quiz?materia_id=${m.materia_id}&modulo_id=${m.id}`
      navigate(url)
    }
  }

  const getEmbedUrl = (url) => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : url
  }

  const trilhasFiltradas = trilhas.filter(t => {
    if (filtro === 'concluida') return t.progresso_percentual === 100
    if (filtro === 'progresso') return t.progresso_percentual > 0 && t.progresso_percentual < 100
    return true
  })

  if (loading) {
    return (
      <div style={{ padding: '32px 16px', background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ height: 40, width: 300, background: 'var(--color-bg-tertiary)', borderRadius: 10, marginBottom: 12 }} className="animate-pulse" />
          <div style={{ height: 20, width: 450, background: 'var(--color-bg-tertiary)', borderRadius: 10, marginBottom: 48 }} className="animate-pulse" />
          <CRow className="g-4">
            {[1,2,3].map(i => <CCol key={i} md={6} lg={4}><div style={{ height: 350, background: 'var(--color-bg-tertiary)', borderRadius: 20 }} className="animate-pulse" /></CCol>)}
          </CRow>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', padding: '32px 16px 48px', fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        
        {/* HEADER PREMIUM IDENTICO AO PAINEL */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Suas Jornadas</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            Minhas Trilhas de Estudo 🚀
          </div>
          <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
            Siga o caminho estruturado pelos nossos professores para garantir sua aprovação.
          </div>
        </motion.div>

        {queryError && <CAlert color="danger" className="mb-4">{queryError.message}</CAlert>}

        {/* FILTROS RAPIDOS */}
        <div className="d-flex gap-2 mb-5 overflow-auto pb-2">
          {['todas', 'progresso', 'concluida'].map(f => (
            <motion.button
              key={f}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setFiltro(f)}
              style={{
                padding: '10px 20px', borderRadius: 14, border: '1.5px solid',
                borderColor: filtro === f ? tokens.rausch : 'var(--color-border)',
                background: filtro === f ? `${tokens.rausch}08` : 'var(--color-bg-elevated)',
                color: filtro === f ? tokens.rausch : tokens.foggy,
                fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, transition: '0.2s', whiteSpace: 'nowrap'
              }}
            >
              <Icon icon={f === 'todas' ? 'solar:folder-bold-duotone' : f === 'progresso' ? 'solar:play-bold-duotone' : 'solar:verified-check-bold-duotone'} width="18" />
              {f === 'todas' ? 'Todas' : f === 'progresso' ? 'Em Andamento' : 'Concluídas'}
            </motion.button>
          ))}
        </div>

        {trilhasFiltradas.length === 0 ? (
          <div className="text-center py-5">
            <Icon icon="solar:ghost-bold-duotone" width="64" style={{ color: tokens.swiss, opacity: 0.3 }} />
            <h5 className="mt-3" style={{ color: tokens.foggy }}>Nenhuma trilha nesta categoria</h5>
          </div>
        ) : (
          <CRow className="g-4">
            {trilhasFiltradas.map((t, i) => {
              const modulos = t.modulos || []
              const proximo = modulos.find(m => !m.concluido) || modulos[0]
              const concluida = t.progresso_percentual === 100
              return (
                <CCol key={t.id} xs={12} md={6} lg={4}>
                  <SCard delay={i * 0.05}>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="p-2 rounded-3" style={{ background: concluida ? `${tokens.babu}15` : `${tokens.rausch}10`, color: concluida ? tokens.babu : tokens.rausch }}>
                        <Icon icon={concluida ? "solar:medal-bold-duotone" : "solar:notebook-bold-duotone"} width="24" />
                      </div>
                      <CBadge color={concluida ? 'success' : 'primary'} style={{ borderRadius: 8, fontSize: 11, padding: '4px 8px' }}>
                        {concluida ? 'CONCLUÍDO' : `${t.progresso_percentual}%`}
                      </CBadge>
                    </div>
                    <h5 className="fw-bold mb-2 text-truncate text-capitalize" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>{t.nome}</h5>
                    <p style={{ fontSize: 12, color: tokens.foggy, height: 36, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>{t.descricao}</p>
                    <div className="mt-4 mb-4">
                      <div className="d-flex justify-content-between small mb-2 fw-bold" style={{ fontSize: 11, color: tokens.foggy, textTransform: 'uppercase' }}>
                        <span>Progresso</span><span>{t.progresso_percentual}%</span>
                      </div>
                      <AirbnbProgress value={t.progresso_percentual} color={concluida ? tokens.babu : tokens.rausch} />
                    </div>
                    <div className="p-3 rounded-4 bg-body-tertiary border mb-4">
                      <div style={{ fontSize: 10, fontWeight: 800, color: tokens.foggy, textTransform: 'uppercase', marginBottom: 4 }}>{concluida ? 'PARABÉNS!' : 'PRÓXIMO PASSO'}</div>
                      <div className="fw-bold text-truncate" style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{concluida ? 'Trilha completada com sucesso' : proximo?.nome}</div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handleAcessarModulo(concluida ? modulos[0] : proximo)}
                      className="w-100 border-0 fw-bold py-2 shadow-sm"
                      style={{ background: concluida ? tokens.babu : tokens.rausch, color: '#fff', borderRadius: 14, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <Icon icon={concluida ? "solar:restart-bold-duotone" : "solar:play-bold-duotone"} width="18" />
                      {concluida ? 'Revisar Conteúdo' : 'Continuar Jornada'}
                    </motion.button>
                  </SCard>
                </CCol>
              )
            })}
          </CRow>
        )}
      </div>

      <CModal visible={modalAula} onClose={() => setModalAula(false)} size="xl" backdrop="static" scrollable className="modal-premium" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <CModalHeader className="border-0 pb-0 pt-4 px-4" style={{ background: 'rgba(var(--color-bg-elevated-rgb), 0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="w-100">
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="px-2 py-1 rounded-pill fw-bold" style={{ background: 'rgba(255, 56, 92, 0.12)', color: '#FF385C', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{moduloAtivo?.ordem}º Módulo</span>
              <span style={{ fontSize: 11, color: '#767676', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aula de Contabilidade Fácil</span>
            </div>
            <h4 className="fw-bold mb-3" style={{ fontSize: 26, letterSpacing: '-0.8px', color: 'var(--color-text-primary)', lineHeight: 1.1 }}>{moduloAtivo?.nome}</h4>
            <div className="d-flex gap-4 border-bottom mt-2">
              {['aula', 'duvidas'].map(a => (
                <div key={a} onClick={() => setAbaAtiva(a)} style={{ cursor: 'pointer', paddingBottom: 10, position: 'relative', color: abaAtiva === a ? '#FF385C' : '#767676', fontWeight: 700, fontSize: 15, transition: '0.2s' }}>
                  <Icon icon={a === 'aula' ? "solar:play-circle-bold-duotone" : "solar:chat-round-dots-bold-duotone"} className="me-1" width="18" /> {a === 'aula' ? 'Vídeo Aula' : 'Dúvidas'}
                  {abaAtiva === a && <motion.div layoutId="tab-underline" className="position-absolute bottom-0 start-0 end-0" style={{ height: 3, background: '#FF385C', borderRadius: '3px 3px 0 0' }} />}
                </div>
              ))}
            </div>
          </div>
        </CModalHeader>
        <CModalBody className="p-0 bg-body-elevated">
          {abaAtiva === 'aula' ? (
            <div className="row g-0">
              <div className={moduloAtivo?.texto_teorico ? "col-12 col-lg-8" : "col-12"}>
                {moduloAtivo?.link_video ? (
                  <div className="ratio ratio-16x9 bg-black shadow-lg overflow-hidden border-bottom"><iframe src={getEmbedUrl(moduloAtivo.link_video)} allowFullScreen loading="lazy" /></div>
                ) : (
                  <div className="p-5 text-center d-flex flex-column align-items-center justify-content-center bg-body-tertiary" style={{ minHeight: 400 }}>
                    <Icon icon="solar:document-text-bold-duotone" width="64" style={{ color: '#B0B0B0' }} className="mb-3" />
                    <h5 className="fw-bold">Conteúdo Teórico</h5><p className="text-body-secondary small">Acompanhe o material de apoio abaixo.</p>
                  </div>
                )}
              </div>
              {moduloAtivo?.texto_teorico && (
                <div className="col-12 col-lg-4 border-start bg-body-elevated">
                  <div className="p-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    {moduloAtivo?.material_apoio_url && (
                      <div className="mb-4 p-3 rounded-4" style={{ background: 'rgba(0, 166, 153, 0.08)', border: '1.5px solid rgba(0, 166, 153, 0.15)' }}>
                        <CButton href={moduloAtivo.material_apoio_url} target="_blank" className="w-100 fw-bold border-0 shadow-sm" style={{ background: '#00A699', color: '#fff', borderRadius: 12, fontSize: 14 }}>Baixar Material</CButton>
                      </div>
                    )}
                    <h6 style={{ fontSize: 11, fontWeight: 700, color: '#767676', textTransform: 'uppercase' }} className="mb-3">Resumo da Aula</h6>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.75', fontSize: '15px', color: 'var(--color-text-primary)' }}>{moduloAtivo.texto_teorico}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4" style={{ minHeight: '400px' }}>
              <CFormTextarea placeholder="Sua dúvida..." rows={3} value={novaDuvida} onChange={(e) => setNovaDuvida(e.target.value)} className="border-0 bg-body-tertiary rounded-4 p-3 mb-3 shadow-none" style={{ fontSize: 15, border: '1.5px solid var(--color-border)' }} />
              <CButton onClick={() => mutationDuvida.mutate()} className="float-end fw-bold px-4 border-0 shadow-sm" style={{ background: '#FF385C', color: '#fff', borderRadius: 12 }}>Publicar</CButton>
              <div className="mt-5 pt-4 border-top">
                {duvidas.map(d => (
                  <div key={d.id} className="p-3 rounded-4 bg-body-tertiary border mb-3">
                    <div className="fw-bold small mb-1">{d.aluno_nome} <span className="float-end text-muted">{formatIsoToDateString(d.data_criacao)}</span></div>
                    <div className="small">{d.texto}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter className="border-0 pt-0 pb-4 px-4 bg-body-elevated justify-content-between align-items-center">
          <div style={{ fontSize: 12, color: '#767676', fontWeight: 600 }}>Módulo {moduloAtivo?.ordem} • {moduloAtivo?.descricao}</div>
          <div className="d-flex gap-2">
            <CButton variant="ghost" onClick={() => setModalAula(false)} style={{ color: '#767676', fontWeight: 700 }}>Fechar</CButton>
            {!moduloAtivo?.concluido && (
              <CButton onClick={() => { mutationConcluir.mutate(moduloAtivo.id); setModalAula(false); }} className="fw-bold border-0 shadow-sm" style={{ background: '#00A699', color: '#fff', borderRadius: 12 }}>Concluir Aula</CButton>
            )}
          </div>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default MinhasTrilhas
