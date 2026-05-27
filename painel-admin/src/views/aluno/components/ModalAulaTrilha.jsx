import React, { useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CSpinner,
  CFormTextarea,
  CButton,
} from '@coreui/react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import api from '../../../services/api'
import { useNavigate } from 'react-router-dom'

/* ─── Helpers ─── */
const getEmbedUrl = (url) => {
  if (!url) return ''
  if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/')
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/')
  return url
}

const formatIsoToDateString = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR')
}

const ModalAulaTrilha = ({ visible, onClose, moduloAtivo, matricula, marcarConcluido, salvando }) => {
  const [abaAtiva, setAbaAtiva] = useState('aula')
  const [novaDuvida, setNovaDuvida] = useState('')
  const [enviandoDuvida, setEnviandoDuvida] = useState(false)
  const navigate = useNavigate()

  const { data: duvidas = [], refetch: refetchDuvidas } = useQuery({
    queryKey: ['duvidasModulo', moduloAtivo?.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/trilhas/modulos/${moduloAtivo.id}/duvidas`)
      return data
    },
    enabled: !!moduloAtivo && abaAtiva === 'duvidas',
  })

  const mutationDuvida = useMutation({
    mutationFn: async ({ moduloId, texto }) => {
      const { data } = await api.post(`/api/trilhas/modulos/${moduloId}/duvidas`, { matricula, texto })
      return data
    },
    onMutate: () => setEnviandoDuvida(true),
    onSuccess: () => {
      toast.success('Comentário enviado!')
      setNovaDuvida('')
      refetchDuvidas()
    },
    onSettled: () => setEnviandoDuvida(false),
  })

  const enviarDuvida = () => {
    if (!novaDuvida.trim()) return
    mutationDuvida.mutate({ moduloId: moduloAtivo.id, texto: novaDuvida })
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="xl"
      backdrop="static"
      scrollable
      className="modal-premium"
    >
      <div style={{ display: 'contents', fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
      <CModalHeader className="border-0 pb-0 pt-4 px-4 bg-body-elevated" style={{ backdropFilter: 'blur(12px)', background: 'rgba(var(--color-bg-elevated-rgb), 0.85)' }}>
        <div className="w-100">
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="px-2 py-1 rounded-pill fw-bold" style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)', color: 'var(--accent-primary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {moduloAtivo?.ordem}º Módulo
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted, #767676)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Aula de Contabilidade Fácil
            </span>
          </div>
          <h4 className="fw-bold mb-3" style={{ fontSize: 26, letterSpacing: '-0.8px', color: 'var(--color-text-primary)', lineHeight: 1.1 }}>
            {moduloAtivo?.nome}
          </h4>

          <div className="d-flex gap-4 border-bottom mt-2">
            <div
              onClick={() => setAbaAtiva('aula')}
              style={{
                cursor: 'pointer', paddingBottom: 10, position: 'relative',
                color: abaAtiva === 'aula' ? 'var(--accent-primary)' : 'var(--color-text-muted, #767676)',
                fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px',
                transition: '0.2s'
              }}
            >
              <Icon icon="solar:play-circle-bold-duotone" className="me-1" width="18" /> Vídeo Aula
              {abaAtiva === 'aula' && (
                <motion.div
                  layoutId="tab-underline"
                  className="position-absolute bottom-0 start-0 end-0"
                  style={{ height: 3, background: 'var(--accent-primary)', borderRadius: '3px 3px 0 0' }}
                />
              )}
            </div>
            <div
              onClick={() => setAbaAtiva('duvidas')}
              style={{
                cursor: 'pointer', paddingBottom: 10, position: 'relative',
                color: abaAtiva === 'duvidas' ? 'var(--accent-primary)' : 'var(--color-text-muted, #767676)',
                fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px',
                transition: '0.2s'
              }}
            >
              <Icon icon="solar:chat-round-dots-bold-duotone" className="me-1" width="18" /> Dúvidas
              {duvidas.length > 0 && <span className="ms-2 px-2 py-0.5 rounded-pill bg-danger text-white" style={{ fontSize: 10 }}>{duvidas.length}</span>}
              {abaAtiva === 'duvidas' && (
                <motion.div
                  layoutId="tab-underline"
                  className="position-absolute bottom-0 start-0 end-0"
                  style={{ height: 3, background: 'var(--accent-primary)', borderRadius: '3px 3px 0 0' }}
                />
              )}
            </div>
          </div>
        </div>
      </CModalHeader>

      <CModalBody className="p-0 bg-body-elevated">
        {abaAtiva === 'aula' ? (
          <div className="row g-0">
            <div className={moduloAtivo?.texto_teorico ? "col-12 col-lg-8" : "col-12"}>
              {moduloAtivo?.link_video ? (
                <div className="ratio ratio-16x9 bg-black shadow-lg overflow-hidden border-bottom">
                  <iframe
                    src={getEmbedUrl(moduloAtivo.link_video)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    title="Video aula"
                  />
                </div>
              ) : (
                <div className="p-5 text-center d-flex flex-column align-items-center justify-content-center bg-body-tertiary" style={{ minHeight: 400 }}>
                  <Icon icon="solar:document-text-bold-duotone" width="64" style={{ color: 'var(--color-border)' }} className="mb-3" />
                  <h5 className="fw-bold" style={{ letterSpacing: '-0.5px' }}>Conteúdo Teórico</h5>
                  <p className="text-body-secondary small">Acompanhe a leitura e o material de apoio abaixo.</p>
                </div>
              )}
            </div>

            {moduloAtivo?.texto_teorico && (
              <div className="col-12 col-lg-4 border-start bg-body-elevated">
                <div className="p-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {moduloAtivo?.material_apoio_url && (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="mb-4 p-3 rounded-4"
                      style={{ background: 'color-mix(in srgb, var(--accent-secondary) 8%, transparent)', border: '1.5px solid color-mix(in srgb, var(--accent-secondary) 15%, transparent)' }}
                    >
                      <h6 className="fw-bold mb-2" style={{ color: 'var(--accent-secondary)', fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Material de Estudo</h6>
                      <CButton
                        href={moduloAtivo.material_apoio_url}
                        target="_blank"
                        className="w-100 fw-bold border-0 shadow-sm"
                        style={{ background: 'var(--accent-secondary)', color: '#fff', borderRadius: 12, fontSize: 14, padding: '10px' }}
                      >
                        <Icon icon="solar:cloud-download-bold-duotone" className="me-2" width="18" /> Baixar PDF / Slides
                      </CButton>
                    </motion.div>
                  )}

                  <h6 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted, #767676)', textTransform: 'uppercase', letterSpacing: '1px' }} className="mb-3">
                    Resumo da Aula
                  </h6>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.75', fontSize: '15px', color: 'var(--color-text-primary)', letterSpacing: '-0.1px' }}>
                    {moduloAtivo.texto_teorico}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4" style={{ minHeight: '400px' }}>
            <div className="mb-4">
              <h6 className="fw-bold mb-3" style={{ fontSize: 16, letterSpacing: '-0.4px' }}>Sua dúvida ou comentário:</h6>
              <div className="d-flex flex-column gap-3">
                <CFormTextarea
                  placeholder="O que você achou desta aula?"
                  rows={3}
                  value={novaDuvida}
                  onChange={(e) => setNovaDuvida(e.target.value)}
                  className="border-0 bg-body-tertiary rounded-4 p-3 shadow-none"
                  style={{ fontSize: 15, border: '1.5px solid var(--color-border)' }}
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="align-self-end fw-bold px-4 py-2 border-0 shadow-sm"
                  style={{ background: 'var(--accent-primary)', color: '#fff', borderRadius: 12, fontSize: 15 }}
                  onClick={enviarDuvida}
                  disabled={enviandoDuvida}
                >
                  {enviandoDuvida ? <CSpinner size="sm" /> : 'Publicar Comentário'}
                </motion.button>
              </div>
            </div>

            <div className="mt-5">
              <h6 className="fw-bold border-bottom pb-2 mb-4 d-flex align-items-center gap-2" style={{ fontSize: 16, letterSpacing: '-0.4px' }}>
                <Icon icon="solar:chat-square-dots-bold-duotone" style={{ color: 'var(--accent-primary)' }} width="20" />
                Comentários da Turma ({duvidas.length})
              </h6>
              <div className="d-flex flex-column gap-3">
                {duvidas.length === 0 ? (
                  <div className="text-center py-4 text-body-secondary italic small">Ainda não há comentários nesta aula.</div>
                ) : duvidas.map((d, i) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -2 }}
                    className="p-3 rounded-4 bg-body-tertiary border shadow-sm"
                    style={{ border: '1px solid var(--color-border)' }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold small d-flex align-items-center gap-1" style={{ color: 'var(--color-text-primary)' }}>
                        <Icon icon="solar:user-circle-bold-duotone" style={{ color: 'var(--color-text-muted, #767676)' }} width="16" /> {d.aluno_nome}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted, #767676)', fontWeight: 600 }}>
                        {formatIsoToDateString(d.data_criacao)}
                      </span>
                    </div>
                    <div className="small" style={{ lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{d.texto}</div>
                    {d.resposta_professor && (
                      <div className="ms-4 p-3 mt-3 rounded-4 border-start border-4 shadow-sm" style={{ background: 'color-mix(in srgb, var(--accent-secondary) 6%, transparent)', borderStartColor: 'var(--accent-secondary)' }}>
                        <div className="fw-bold small mb-1 d-flex align-items-center gap-1" style={{ color: 'var(--accent-secondary)', fontSize: 12 }}>
                          <Icon icon="solar:verified-check-bold" width="14" /> Resposta do Professor
                        </div>
                        <div className="small" style={{ opacity: 0.9, lineHeight: 1.5 }}>{d.resposta_professor}</div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CModalBody>

      <CModalFooter className="border-0 pt-0 pb-4 px-4 bg-body-elevated justify-content-between align-items-center">
        <div style={{ fontSize: 12, color: 'var(--color-text-muted, #767676)', fontWeight: 600, letterSpacing: '0.3px' }}>
          Módulo {moduloAtivo?.ordem} • {moduloAtivo?.descricao}
        </div>
        <div className="d-flex gap-2">
          <CButton
            variant="ghost"
            onClick={onClose}
            className="fw-bold"
            style={{ color: 'var(--color-text-muted, #767676)', fontSize: 14 }}
          >
            Fechar
          </CButton>

          {/* Ação de Exercícios */}
          {(moduloAtivo?.materia_id || (moduloAtivo?.questoes_selecionadas?.length > 0)) ? (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="fw-bold border-0 shadow-sm px-4 py-2"
              style={{ background: 'var(--accent-tertiary)', color: '#fff', borderRadius: 12, fontSize: 14 }}
              onClick={() => {
                if (moduloAtivo.questoes_selecionadas?.length > 0) {
                  const ids = moduloAtivo.questoes_selecionadas.join(',')
                  navigate(`/quiz?ids=${ids}&modulo_id=${moduloAtivo.id}`)
                } else {
                  navigate(`/quiz?materia_id=${moduloAtivo.materia_id}&modulo_id=${moduloAtivo.id}`)
                }
                onClose()
              }}
            >
              <Icon icon="solar:pen-bold-duotone" className="me-2" width="18" /> Praticar Exercícios
            </motion.button>
          ) : (
            <div className="px-3 py-2 bg-body-tertiary rounded-3 small fst-italic text-body-secondary border">
              <Icon icon="solar:pen-new-square-linear" className="me-1" /> Exercícios em breve...
            </div>
          )}

          {!moduloAtivo?.concluido && (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              disabled={salvando === moduloAtivo?.id}
              onClick={() => {
                marcarConcluido(moduloAtivo.id)
                onClose()
              }}
              className="fw-bold border-0 shadow-sm px-4 py-2"
              style={{ background: 'var(--accent-secondary)', color: '#fff', borderRadius: 12, fontSize: 14 }}
            >
              {salvando === moduloAtivo?.id ? <CSpinner size="sm" /> : <><Icon icon="solar:check-circle-bold-duotone" className="me-2" width="18" /> Concluir Aula</>}
            </motion.button>
          )}
        </div>
      </CModalFooter>
      </div>
    </CModal>
  )
}

export default ModalAulaTrilha
