import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import {
    CRow, CCol, CBadge, CSpinner, CAlert, CButton, CFormInput, CFormTextarea, CTooltip
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { confirmDialog } from '../../utils/confirm'
import { tokens } from '../../tokens'
import { useTheme } from '../../context/themeContext'
import { 
    useFeedbacksQuestoes, 
    useResolverFeedback, 
    useResponderFeedback, 
    useDeletarFeedback, 
    useAlternarPublicacaoFeedback 
} from '../../hooks/useQuestoes'

const FONT = "'Nunito', 'Circular Std', sans-serif"

const FeedbacksQuestoes = () => {
    const { isDark } = useTheme()
    const navigate = useNavigate()
    
    const [filtroStatus, setFiltroStatus] = useState('pendente')
    const [busca, setBusca] = useState('')
    const [debouncedBusca, setDebouncedBusca] = useState('')
    const [respostaLocal, setRespostaLocal] = useState({}) // { [id]: 'texto' }
    const [submittingIds, setSubmittingIds] = useState(new Set())

    const filtrosAtuais = useMemo(() => {
        const f = {}
        if (filtroStatus !== 'todos') f.status = filtroStatus
        if (debouncedBusca) f.busca = debouncedBusca
        return f
    }, [filtroStatus, debouncedBusca])

    const { data: feedbacksData, isFetching: loading, isError } = useFeedbacksQuestoes(filtrosAtuais)
    const feedbacks = feedbacksData?.data || []

    const pendentes = useMemo(() => feedbacks.filter(f => !f.resolvido).length, [feedbacks])
    const resolvidos = useMemo(() => feedbacks.filter(f => f.resolvido).length, [feedbacks])

    const { mutateAsync: resolverFeedback } = useResolverFeedback()
    const { mutateAsync: responderFeedback } = useResponderFeedback()
    const { mutateAsync: deletarFeedback } = useDeletarFeedback()
    const { mutateAsync: publicarFeedback } = useAlternarPublicacaoFeedback()

    const handleResolver = async (id) => {
        try {
            await resolverFeedback(id)
            toast.success('Feedback resolvido com sucesso!')
        } catch (err) {
            toast.error('Não foi possível marcar como resolvido. Tente novamente.')
        }
    }

    const handleResponder = async (id) => {
        const texto = respostaLocal[id]
        if (!texto?.trim()) return

        setSubmittingIds(prev => new Set(prev).add(id))
        try {
            await responderFeedback({ id, resposta: texto })
            setRespostaLocal(prev => ({ ...prev, [id]: '' }))
            toast.success('Resposta enviada!')
        } catch (err) {
            toast.error('Não foi possível enviar a resposta. Tente novamente.')
        } finally {
            setSubmittingIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(id)
                return newSet
            })
        }
    }

    const handleDelete = async (id) => {
        if (!await confirmDialog('Tem certeza que deseja APAGAR permanentemente este feedback?')) return
        try {
            await deletarFeedback(id)
            toast.success('Feedback apagado!')
        } catch (err) {
            toast.error('Não foi possível apagar o feedback. Tente novamente.')
        }
    }

    const handlePublicar = async (id) => {
        try {
            await publicarFeedback(id)
            toast.success('Status de publicação alterado!')
        } catch (err) {
            toast.error('Não foi possível alterar a publicação do feedback. Tente novamente.')
        }
    }

    // Exportar feedbacks como CSV
    const handleExportCSV = () => {
        if (feedbacks.length === 0) return
        const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`
        const header = 'Data,Aluno,Questao ID,Enunciado,Comentario,Status,Tipo'
        const rows = feedbacks.map(f =>
            [
                escape(f.data_criacao),
                escape(f.nome_aluno),
                f.questao_id,
                escape(f.enunciado_questao),
                escape(f.texto),
                f.resolvido ? 'Resolvido' : 'Pendente',
                f.marcada_confusa ? 'Confusa' : 'Duvida',
            ].join(',')
        )
        const csv = '\uFEFF' + header + '\n' + rows.join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `feedbacks_${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    // Debounce na busca
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedBusca(busca)
        }, 400)
        return () => clearTimeout(timer)
    }, [busca])

    return (
        <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: 'calc(100vh - 80px)', fontFamily: FONT }}>
            <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 16px' }}>

                {/* HEADER PREMIUM */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                        <div>
                            <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                                Suporte Pedagógico
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
                                    Feedbacks e Dúvidas
                                </div>
                                {pendentes > 0 && (
                                    <CBadge color="danger" shape="rounded-pill" style={{ fontSize: 12 }}>
                                        {pendentes} pendente{pendentes > 1 ? 's' : ''}
                                    </CBadge>
                                )}
                            </div>
                            <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
                                Gerencie as mensagens e reporte de questões enviadas pelos alunos.
                            </div>
                        </div>

                        <CButton
                            onClick={handleExportCSV}
                            disabled={feedbacks.length === 0}
                            style={{
                                background: 'transparent',
                                border: `1.5px solid var(--color-border)`,
                                color: 'var(--color-text-primary)',
                                borderRadius: 20,
                                padding: '8px 16px',
                                fontSize: 13,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <Icon icon="ph:download-simple-bold" width="16" />
                            Exportar CSV
                        </CButton>
                    </div>

                    {/* Barra de Filtros */}
                    <div className="d-flex justify-content-between align-items-center mt-4 gap-3 flex-wrap">
                        <div className="d-flex gap-2 bg-body-tertiary p-1 rounded-4 border">
                            {['pendente', 'resolvido', 'todos'].map(f => {
                                const labels = { pendente: '🔴 Pendentes', resolvido: '✅ Resolvidos', todos: '📋 Todos' }
                                return (
                                    <CButton
                                        key={f}
                                        onClick={() => setFiltroStatus(f)}
                                        style={{
                                            background: filtroStatus === f ? 'var(--color-bg-elevated)' : 'transparent',
                                            border: 'none',
                                            borderRadius: 10,
                                            padding: '8px 16px',
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: filtroStatus === f ? (f === 'pendente' ? tokens.arches : f === 'resolvido' ? tokens.babu : tokens.rausch) : tokens.foggy,
                                            boxShadow: filtroStatus === f ? '0 2px 10px rgba(0,0,0,0.05)' : 'none'
                                        }}
                                    >
                                        {labels[f]}
                                    </CButton>
                                )
                            })}
                        </div>

                        <div className="position-relative" style={{ minWidth: '250px', maxWidth: '350px', flex: 1 }}>
                            <div className="position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: tokens.foggy }}>
                                <Icon icon="ph:magnifying-glass-bold" width="18" />
                            </div>
                            <CFormInput
                                type="text"
                                placeholder="Buscar por aluno, comentário..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                style={{
                                    paddingLeft: 40,
                                    borderRadius: 12,
                                    border: '1.5px solid var(--color-border)',
                                    background: 'var(--color-bg-primary)',
                                    color: 'var(--color-text-primary)'
                                }}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* CONTEÚDO */}
                {isError && <CAlert color="danger">Erro ao carregar feedbacks</CAlert>}

                {loading ? (
                    <div className="text-center py-5">
                        <CSpinner color="primary" />
                        <div className="mt-2 text-muted">Carregando mensagens...</div>
                    </div>
                ) : feedbacks.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-5 text-muted">
                        <Icon icon="ph:empty-bold" width="48" style={{ color: tokens.foggy, marginBottom: 16 }} />
                        <h5>
                            {filtroStatus === 'pendente'
                                ? 'Nenhum feedback pendente! 🎉'
                                : filtroStatus === 'resolvido'
                                    ? 'Nenhum feedback resolvido encontrado.'
                                    : 'Nenhum feedback recebido ainda!'}
                        </h5>
                        <p style={{ color: tokens.foggy }}>As mensagens e dúvidas dos alunos aparecerão aqui.</p>
                    </motion.div>
                ) : (
                    <CRow className="g-4">
                        {feedbacks.map((item, i) => (
                            <CCol xs={12} key={item.id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    whileHover={{ scale: 1.005 }}
                                    style={{
                                        background: 'var(--color-bg-elevated)',
                                        border: `1.5px solid var(--color-border)`,
                                        borderRadius: 20,
                                        padding: '24px',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        opacity: item.resolvido ? 0.75 : 1
                                    }}
                                >
                                    {/* Faixa lateral indicadora de status */}
                                    <div style={{
                                        position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
                                        background: item.resolvido ? tokens.babu : item.impacto >= 5 ? tokens.rausch : tokens.arches
                                    }} />

                                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                <div className="fw-bold" style={{ fontSize: 16, color: 'var(--color-text-primary)' }}>
                                                    {item.nome_aluno ? item.nome_aluno.toUpperCase() : "ALUNO NÃO IDENTIFICADO"}
                                                </div>
                                                <span style={{ fontSize: 12, color: tokens.foggy }}>• {item.data_criacao}</span>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <CBadge style={{ background: item.marcada_confusa ? tokens.arches : tokens.secondary, color: '#fff', fontSize: 11, padding: '4px 8px' }}>
                                                    {item.marcada_confusa ? '⚠️ Confusa' : '💬 Dúvida'}
                                                </CBadge>
                                                {item.impacto >= 2 && !item.resolvido && (
                                                    <CBadge style={{ background: item.impacto >= 5 ? tokens.rausch : tokens.arches, color: '#fff', fontSize: 11, padding: '4px 8px' }}>
                                                        🔥 {item.impacto} reclamações
                                                    </CBadge>
                                                )}
                                                <CBadge style={{ background: item.resolvido ? tokens.babu : 'var(--color-bg-tertiary)', color: item.resolvido ? '#fff' : tokens.foggy, fontSize: 11, padding: '4px 8px' }}>
                                                    {item.resolvido ? '✅ Resolvido' : '🔴 Pendente'}
                                                </CBadge>
                                            </div>
                                        </div>

                                        <div className="d-flex gap-2">
                                            {!item.resolvido && (
                                                <CTooltip content="Marcar como resolvido">
                                                    <CButton variant="ghost" onClick={() => handleResolver(item.id)} style={{ border: 'none', color: tokens.babu, padding: 4 }}>
                                                        <Icon icon="ph:check-circle-bold" width="24" />
                                                    </CButton>
                                                </CTooltip>
                                            )}
                                            <CTooltip content="Editar Questão">
                                                <CButton variant="ghost" onClick={() => navigate(`/questoes?busca=${item.questao_id}`)} style={{ border: 'none', color: 'var(--color-text-secondary)', padding: 4 }}>
                                                    <Icon icon="ph:pencil-simple-bold" width="22" />
                                                </CButton>
                                            </CTooltip>
                                            <CTooltip content={item.publico ? "Ocultar da Comunidade" : "Tornar Público"}>
                                                <CButton variant="ghost" onClick={() => handlePublicar(item.id)} style={{ border: 'none', color: item.publico ? tokens.babu : tokens.arches, padding: 4 }}>
                                                    <Icon icon={item.publico ? "ph:megaphone-bold" : "ph:megaphone-simple-slash-bold"} width="22" />
                                                </CButton>
                                            </CTooltip>
                                            <CTooltip content="Excluir">
                                                <CButton variant="ghost" onClick={() => handleDelete(item.id)} style={{ border: 'none', color: tokens.rausch, padding: 4 }}>
                                                    <Icon icon="ph:trash-bold" width="22" />
                                                </CButton>
                                            </CTooltip>
                                        </div>
                                    </div>

                                    {/* Detalhes da Questão */}
                                    <div style={{ background: 'var(--color-bg-tertiary)', padding: '16px', borderRadius: 12, marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, color: tokens.foggy, fontWeight: 700, marginBottom: 4 }}>
                                            QUESTÃO #{item.questao_id}
                                        </div>
                                        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                                            {item.enunciado_questao
                                                ? (item.enunciado_questao.length > 200 ? item.enunciado_questao.substring(0, 200) + '...' : item.enunciado_questao)
                                                : 'Enunciado indisponível'}
                                        </div>
                                    </div>

                                    {/* Comentário e Resposta */}
                                    <div className="d-flex flex-column gap-3">
                                        <div>
                                            <div style={{ fontSize: 12, color: tokens.foggy, fontWeight: 700, marginBottom: 4 }}>COMENTÁRIO DO ALUNO</div>
                                            <div style={{ fontSize: 15, color: 'var(--color-text-primary)' }}>
                                                {item.texto ? `"${item.texto}"` : <span style={{ color: tokens.foggy, fontStyle: 'italic' }}>Sem comentário em texto</span>}
                                            </div>
                                        </div>

                                        {item.resposta_professor ? (
                                            <div style={{ borderLeft: `4px solid ${tokens.babu}`, paddingLeft: 12, marginLeft: 4 }}>
                                                <div style={{ fontSize: 12, color: tokens.babu, fontWeight: 700, marginBottom: 2 }}>SUA RESPOSTA</div>
                                                <div style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{item.resposta_professor}</div>
                                            </div>
                                        ) : !item.resolvido && (
                                            <div className="d-flex flex-column gap-2 mt-2" style={{ width: '100%' }}>
                                                 <CFormTextarea
                                                     rows={3}
                                                     placeholder="Escrever resposta para o aluno..."
                                                     value={respostaLocal[item.id] || ''}
                                                     onChange={(e) => setRespostaLocal({ ...respostaLocal, [item.id]: e.target.value })}
                                                     style={{
                                                         borderRadius: 12, border: '1.5px solid var(--color-border)',
                                                         background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
                                                         fontSize: 14,
                                                         fontFamily: FONT
                                                     }}
                                                 />
                                                 <div className="d-flex justify-content-end">
                                                     <CButton 
                                                         disabled={submittingIds.has(item.id) || !respostaLocal[item.id]?.trim()}
                                                         onClick={() => handleResponder(item.id)}
                                                         style={{ background: tokens.babu, color: '#fff', border: 'none', borderRadius: 12, padding: '8px 16px', fontWeight: 700 }}
                                                     >
                                                         {submittingIds.has(item.id) ? <CSpinner size="sm" /> : 'Enviar Resposta'}
                                                     </CButton>
                                                 </div>
                                             </div>
                                        )}
                                    </div>
                                </motion.div>
                            </CCol>
                        ))}
                    </CRow>
                )}
            </div>
        </div>
    )
}

export default FeedbacksQuestoes