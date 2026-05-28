import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import {
    CRow, CCol, CSpinner, CAlert, CButton, CFormInput, CFormTextarea, CTooltip
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { confirmDialog } from '../../utils/confirm'
import { buildTokens } from '../../tokens'
import { useTheme } from '../../context/themeContext'
import { 
    useFeedbacksQuestoes, 
    useResolverFeedback, 
    useResponderFeedback, 
    useDeletarFeedback, 
    useAlternarPublicacaoFeedback 
} from '../../hooks/useQuestoes'

const FONT = "'Nunito', 'Circular Std', sans-serif"

// Helpers para avatar do aluno
const getIniciais = (nome) => {
    if (!nome) return '??'
    const partes = nome.trim().split(/\s+/)
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

const getCorAvatar = (nome) => {
    const cores = [
        '#FF5A5F', '#3b5998', '#34a853', '#8a3ab9',
        '#fbbc05', '#1abc9c', '#e67e22', '#2980b9',
    ]
    let hash = 0
    if (!nome) return cores[0]
    for (let i = 0; i < nome.length; i++) {
        hash = nome.charCodeAt(i) + ((hash << 5) - hash)
    }
    return cores[Math.abs(hash) % cores.length]
}

const FeedbacksQuestoes = () => {
    const { isDark, currentPalette } = useTheme()
    const tk = buildTokens(currentPalette)
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
            <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>

                {/* HEADER PREMIUM */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                        <div>
                            <div style={{ color: tk.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                                Suporte Pedagógico
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
                                    Feedbacks e Dúvidas
                                </div>
                                {pendentes > 0 && (
                                    <span style={{
                                        background: 'var(--accent-primary, #FF385C)',
                                        color: '#fff',
                                        fontSize: 11,
                                        fontWeight: 800,
                                        padding: '4px 10px',
                                        borderRadius: 20,
                                    }}>
                                        {pendentes} pendente{pendentes > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 14, color: tk.foggy, marginTop: 6 }}>
                                Gerencie as dúvidas e reportes de questões enviadas pelos estudantes.
                            </div>
                        </div>

                        <CButton
                            onClick={handleExportCSV}
                            disabled={feedbacks.length === 0}
                            style={{
                                background: 'var(--color-bg-elevated)',
                                border: `1px solid var(--color-border)`,
                                color: 'var(--color-text-primary)',
                                borderRadius: 16,
                                padding: '10px 18px',
                                fontSize: 13,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                                cursor: 'pointer',
                            }}
                        >
                            <Icon icon="solar:download-minimalistic-bold-duotone" width="18" style={{ color: tk.rausch }} />
                            Exportar CSV
                        </CButton>
                    </div>

                    {/* Barra de Filtros e Busca */}
                    <div className="d-flex justify-content-between align-items-center mt-4 gap-3 flex-wrap">
                        
                        {/* Segmented Control */}
                        <div style={{
                            display: 'inline-flex',
                            background: 'var(--color-bg-tertiary)',
                            padding: 5,
                            borderRadius: 16,
                            border: '1px solid var(--color-border)',
                            gap: 2,
                            position: 'relative',
                        }}>
                            {['pendente', 'resolvido', 'todos'].map(f => {
                                const labels = { pendente: '🔴 Pendentes', resolvido: '✅ Resolvidos', todos: '📋 Todos' }
                                const isActive = filtroStatus === f
                                return (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setFiltroStatus(f)}
                                        style={{
                                            border: 'none',
                                            borderRadius: 12,
                                            padding: '8px 16px',
                                            fontSize: 13,
                                            fontWeight: 800,
                                            background: isActive ? 'var(--color-bg-elevated)' : 'transparent',
                                            color: isActive 
                                                ? (f === 'pendente' ? tk.arches : f === 'resolvido' ? tk.babu : tk.rausch) 
                                                : tk.foggy,
                                            boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            transition: 'color 0.2s',
                                        }}
                                    >
                                        {labels[f]}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Campo de Busca */}
                        <div className="position-relative" style={{ minWidth: '250px', maxWidth: '350px', flex: 1 }}>
                            <div className="position-absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', color: tk.foggy }}>
                                <Icon icon="solar:magnifer-bold-duotone" width="18" />
                            </div>
                            <CFormInput
                                type="text"
                                placeholder="Buscar por aluno, comentário..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                style={{
                                    paddingLeft: 40,
                                    borderRadius: 14,
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg-elevated)',
                                    color: 'var(--color-text-primary)',
                                    fontSize: 14,
                                    height: '42px',
                                }}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* CONTEÚDO */}
                {isError && <CAlert color="danger" style={{ borderRadius: 16 }}>Erro ao carregar feedbacks</CAlert>}

                {loading ? (
                    <div className="text-center py-5">
                        <CSpinner size="md" />
                        <div className="mt-2 text-muted" style={{ fontSize: 13, fontWeight: 600 }}>Carregando feedbacks...</div>
                    </div>
                ) : feedbacks.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-5 text-muted">
                        <Icon icon="solar:dialog-close-bold-duotone" width="48" style={{ color: tk.swiss, marginBottom: 16 }} />
                        <h5 style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>
                            {filtroStatus === 'pendente'
                                ? 'Nenhum feedback pendente! 🎉'
                                : filtroStatus === 'resolvido'
                                    ? 'Nenhum feedback resolvido encontrado.'
                                    : 'Nenhum feedback recebido ainda!'}
                        </h5>
                        <p style={{ color: tk.foggy, fontSize: 13 }}>As mensagens e dúvidas dos alunos aparecerão aqui.</p>
                    </motion.div>
                ) : (
                    <CRow className="g-4">
                        {feedbacks.map((item, i) => {
                            const avatarNome = item.nome_aluno || "Aluno Indefinido"
                            return (
                                <CCol xs={12} key={item.id}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        style={{
                                            background: 'var(--color-bg-elevated)',
                                            border: `1px solid var(--color-border)`,
                                            borderRadius: 24,
                                            padding: '24px',
                                            position: 'relative',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                                            opacity: item.resolvido ? 0.8 : 1,
                                            transition: 'box-shadow 0.2s, opacity 0.2s',
                                        }}
                                    >
                                        {/* Status header do card */}
                                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                                            
                                            {/* Info do Aluno */}
                                            <div className="d-flex align-items-center gap-3">
                                                <div style={{
                                                    width: 44,
                                                    height: 44,
                                                    borderRadius: '50%',
                                                    background: getCorAvatar(avatarNome),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontWeight: 800,
                                                    fontSize: '14px',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                                }}>
                                                    {getIniciais(avatarNome)}
                                                </div>
                                                <div>
                                                    <div className="fw-bold" style={{ fontSize: 15, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                                                        {avatarNome.toLowerCase()}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: tk.foggy, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Icon icon="solar:calendar-linear" width="12" />
                                                        {item.data_criacao}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Badges de Tags e Ações */}
                                            <div className="d-flex align-items-center gap-2">
                                                
                                                {/* Tags */}
                                                <span style={{
                                                    background: item.marcada_confusa ? 'rgba(252, 100, 45, 0.08)' : 'rgba(118, 118, 118, 0.08)',
                                                    color: item.marcada_confusa ? tk.arches : tk.foggy,
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    padding: '4px 10px',
                                                    borderRadius: 12,
                                                }}>
                                                    {item.marcada_confusa ? '⚠️ Questão Confusa' : '💬 Dúvida Geral'}
                                                </span>
                                                
                                                {item.impacto >= 2 && !item.resolvido && (
                                                    <span style={{
                                                        background: 'rgba(255, 56, 92, 0.08)',
                                                        color: tk.rausch,
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        padding: '4px 10px',
                                                        borderRadius: 12,
                                                    }}>
                                                        🔥 {item.impacto} Reclamações
                                                    </span>
                                                )}

                                                <span style={{
                                                    background: item.resolvido ? 'rgba(0, 166, 153, 0.08)' : 'rgba(252, 100, 45, 0.08)',
                                                    color: item.resolvido ? tk.babu : tk.arches,
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    padding: '4px 10px',
                                                    borderRadius: 12,
                                                }}>
                                                    {item.resolvido ? '✅ Resolvido' : '🔴 Pendente'}
                                                </span>

                                                {/* Divisor */}
                                                <div style={{ width: '1px', height: '16px', background: 'var(--color-border)', margin: '0 4px' }} />

                                                {/* Ações */}
                                                <div className="d-flex gap-1">
                                                    {!item.resolvido && (
                                                        <CTooltip content="Resolver">
                                                            <CButton onClick={() => handleResolver(item.id)} style={{ border: 'none', background: 'none', color: tk.babu, padding: 6, display: 'flex', alignItems: 'center' }}>
                                                                <Icon icon="solar:check-circle-bold-duotone" width="22" />
                                                            </CButton>
                                                        </CTooltip>
                                                    )}
                                                    <CTooltip content="Editar Questão">
                                                        <CButton onClick={() => navigate(`/questoes?busca=${item.questao_id}`)} style={{ border: 'none', background: 'none', color: tk.rausch, padding: 6, display: 'flex', alignItems: 'center' }}>
                                                            <Icon icon="solar:pen-bold-duotone" width="22" />
                                                        </CButton>
                                                    </CTooltip>
                                                    <CTooltip content={item.publico ? "Tornar Privado" : "Tornar Público"}>
                                                        <CButton onClick={() => handlePublicar(item.id)} style={{ border: 'none', background: 'none', color: item.publico ? tk.babu : tk.swiss, padding: 6, display: 'flex', alignItems: 'center' }}>
                                                            <Icon icon={item.publico ? "solar:bell-ring-bold-duotone" : "solar:bell-off-bold-duotone"} width="22" />
                                                        </CButton>
                                                    </CTooltip>
                                                    <CTooltip content="Excluir">
                                                        <CButton onClick={() => handleDelete(item.id)} style={{ border: 'none', background: 'none', color: tk.rausch, padding: 6, display: 'flex', alignItems: 'center' }}>
                                                            <Icon icon="solar:trash-bin-trash-bold-duotone" width="22" />
                                                        </CButton>
                                                    </CTooltip>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Preview da Questão */}
                                        <div style={{
                                            background: 'var(--color-bg-tertiary)',
                                            padding: '16px 20px',
                                            borderRadius: 16,
                                            border: '1px dashed var(--color-border)',
                                            marginBottom: 20
                                        }}>
                                            <div style={{ fontSize: '11px', color: tk.foggy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                                                Questão Referenciada — ID #{item.questao_id}
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                                                {item.enunciado_questao
                                                    ? (item.enunciado_questao.length > 220 ? item.enunciado_questao.substring(0, 220) + '...' : item.enunciado_questao)
                                                    : 'Enunciado não disponível'}
                                            </div>
                                        </div>

                                        {/* Comentário do Estudante */}
                                        <div style={{ marginBottom: 20 }}>
                                            <div style={{ fontSize: '11px', color: tk.foggy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                                Mensagem do Estudante
                                            </div>
                                            <div style={{
                                                fontSize: '15px',
                                                fontWeight: 500,
                                                color: 'var(--color-text-primary)',
                                                background: 'rgba(var(--accent-primary-rgb, 255, 56, 92), 0.03)',
                                                borderLeft: `3px solid ${item.marcada_confusa ? tk.arches : tk.rausch}`,
                                                padding: '12px 16px',
                                                borderRadius: '0 12px 12px 0',
                                                lineHeight: 1.5
                                            }}>
                                                {item.texto ? `"${item.texto}"` : <span style={{ color: tk.foggy, fontStyle: 'italic' }}>Reporte de erro sem comentário em texto.</span>}
                                            </div>
                                        </div>

                                        {/* Resposta do Suporte / Input */}
                                        <div>
                                            {item.resposta_professor ? (
                                                <div style={{
                                                    background: 'rgba(0, 166, 153, 0.03)',
                                                    borderLeft: `3px solid ${tk.babu}`,
                                                    padding: '12px 16px',
                                                    borderRadius: '0 12px 12px 0',
                                                    marginTop: 10
                                                }}>
                                                    <div style={{ fontSize: '11px', color: tk.babu, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                                        Sua Resposta Enviada
                                                    </div>
                                                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                                                        {item.resposta_professor}
                                                    </div>
                                                </div>
                                            ) : !item.resolvido && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                                                    <CFormTextarea
                                                        rows={3}
                                                        placeholder="Responder para o estudante..."
                                                        value={respostaLocal[item.id] || ''}
                                                        onChange={(e) => setRespostaLocal({ ...respostaLocal, [item.id]: e.target.value })}
                                                        style={{
                                                            borderRadius: 14,
                                                            border: '1px solid var(--color-border)',
                                                            background: 'var(--color-bg-tertiary)',
                                                            color: 'var(--color-text-primary)',
                                                            fontSize: '14px',
                                                            fontFamily: FONT,
                                                            padding: '12px',
                                                            outline: 'none',
                                                            resize: 'none',
                                                        }}
                                                    />
                                                    <div className="d-flex justify-content-end">
                                                        <CButton 
                                                            disabled={submittingIds.has(item.id) || !respostaLocal[item.id]?.trim()}
                                                            onClick={() => handleResponder(item.id)}
                                                            style={{
                                                                background: tk.babu,
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: 12,
                                                                padding: '8px 20px',
                                                                fontWeight: 800,
                                                                fontSize: '13px',
                                                                boxShadow: `0 4px 12px ${tk.babu}25`,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            {submittingIds.has(item.id) 
                                                                ? <CSpinner size="sm" style={{ width: '14px', height: '14px' }} /> 
                                                                : 'Enviar Resposta'
                                                            }
                                                        </CButton>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </motion.div>
                                </CCol>
                            )
                        })}
                    </CRow>
                )}
            </div>
        </div>
    )
}

export default FeedbacksQuestoes