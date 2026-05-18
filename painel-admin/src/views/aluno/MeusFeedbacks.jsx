import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Icon } from '@iconify/react'
import {
    CSpinner,
    CAlert,
    CRow,
    CCol,
    CContainer,
    CButton,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CBadge,
    CFormTextarea,
    CFormCheck,
    CFormLabel,
} from '@coreui/react'
import { API_URL } from '../../config'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAlunoMatricula } from '../../utils/auth'
import toast from 'react-hot-toast'

/* ── Tokens de Design (Airbnb Premium Style) ────────────── */
const tokens = {
    rausch: '#FF385C',  // Coral principal
    babu: '#00A699',    // Teal/Verde
    arches: '#FC642D',  // Laranja
    hof: '#484848',
    foggy: '#767676',   // Cinza Muted
    border: 'var(--color-border)',
    bg: 'var(--color-bg-elevated)',
    bgSub: 'var(--color-bg-tertiary)',
    text: 'var(--color-text-primary)',
}

// ── Skeleton Loader ─────────────────────────────────────────────
const Skeleton = ({ h = 20, w = '100%', radius = 12, className = '' }) => (
    <div 
        className={`placeholder-glow ${className}`} 
        style={{ 
            height: h, 
            width: w, 
            borderRadius: radius, 
            backgroundColor: 'var(--color-bg-tertiary)',
            opacity: 0.5 
        }} 
    />
)

const FeedbackSkeleton = () => (
    <div style={{ background: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: 20, padding: 20, marginBottom: 12 }}>
        <div className="flex justify-between gap-4">
            <div className="flex-1">
                <div className="flex gap-2 mb-3">
                    <Skeleton h={12} w="80px" />
                    <Skeleton h={12} w="60px" />
                </div>
                <Skeleton h={18} w="70%" className="mb-2" />
                <Skeleton h={14} w="40%" />
            </div>
            <Skeleton h={24} w="24px" radius={6} />
        </div>
    </div>
)

// ── Metric Cards ────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }) => (
    <div style={{
        background: tokens.bg,
        border: `1px solid ${tokens.border}`,
        borderRadius: 18,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        minWidth: 140,
        boxShadow: '0 4px 15px rgba(0,0,0,0.01)'
    }}>
        <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `${color}15`, color: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <Icon icon={icon} width="20" />
        </div>
        <div>
            <div style={{ fontSize: 9, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-text-primary)', marginTop: 2 }}>{value}</div>
        </div>
    </div>
)

// ── FAQ Item Component (Doubt Row) ──────────────────────────────
const FAQItem = ({ item, isOpen, onToggle, index, onRevisarQuestao }) => {
    const shouldReduceMotion = useReducedMotion()
    const statusCor = item.resolvido ? tokens.babu : tokens.arches
    const statusBg = item.resolvido ? `${tokens.babu}15` : `${tokens.arches}15`
    
    return (
        <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: shouldReduceMotion ? 0 : index * 0.04 }}
            style={{
                background: tokens.bg,
                border: `1px solid ${isOpen ? tokens.rausch : tokens.border}`,
                borderRadius: 20,
                marginBottom: 12,
                overflow: 'hidden',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: isOpen ? '0 8px 30px rgba(0,0,0,0.03)' : '0 4px 15px rgba(0,0,0,0.005)'
            }}
        >
            {/* Header Accordion */}
            <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onToggle()
                    }
                }}
                onClick={onToggle}
                style={{
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16
                }}
            >
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, color: tokens.foggy, fontWeight: 800 }}>
                            {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : 'Sem data'}
                        </span>
                        <span style={{
                            fontSize: 10, fontWeight: 800,
                            background: statusBg, color: statusCor,
                            padding: '3px 8px', borderRadius: 8
                        }}>
                            {item.resolvido ? 'Resolvido ✅' : 'Aguardando Professor ⏳'}
                        </span>
                        {item.marcada_confusa && (
                            <span style={{
                                fontSize: 10, fontWeight: 800,
                                background: `${tokens.rausch}15`, color: tokens.rausch,
                                padding: '3px 8px', borderRadius: 8
                            }}>
                                ⚠️ Questão Confusa
                            </span>
                        )}
                    </div>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.4, margin: '0 0 4px 0' }}>
                        Questão #{item.questao_id}: {item.enunciado}
                    </h4>
                    <p style={{ fontSize: 12, color: tokens.foggy, fontWeight: 600, margin: 0, fontStyle: 'italic' }}>
                        {item.texto
                            ? item.texto.length > 100
                                ? `"${item.texto.substring(0, 100)}..."`
                                : `"${item.texto}"`
                            : 'Sem descrição'}
                    </p>
                </div>
                <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isOpen ? `${tokens.rausch}15` : tokens.bgSub,
                    color: isOpen ? tokens.rausch : tokens.foggy,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                    marginTop: 4
                }}>
                    <Icon icon="solar:alt-arrow-down-linear" width="18" />
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                        <div style={{
                            padding: '16px 20px 20px 20px',
                            borderTop: `1px solid ${tokens.border}`,
                            background: tokens.bgSub,
                        }}>
                            <CRow className="g-4">
                                <CCol xs={12} md={6}>
                                    <div style={{ fontSize: 10, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                        Minha Dúvida Enviada
                                    </div>
                                    <div style={{
                                        background: tokens.bg,
                                        border: `1px solid ${tokens.border}`,
                                        borderRadius: 14,
                                        padding: 14,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: 'var(--color-text-secondary)',
                                        lineHeight: 1.5,
                                        fontStyle: 'italic'
                                    }}>
                                        {item.texto || 'Nenhuma descrição detalhada enviada.'}
                                    </div>
                                </CCol>

                                <CCol xs={12} md={6}>
                                    <div style={{ fontSize: 10, color: tokens.babu, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                        Resposta da Equipe Técnica / Professor
                                    </div>
                                    <div style={{
                                        background: item.resolvido ? `${tokens.babu}05` : tokens.bg,
                                        border: `1px solid ${item.resolvido ? tokens.babu : tokens.border}`,
                                        borderRadius: 14,
                                        padding: 14,
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: item.resposta_professor ? 'var(--color-text-primary)' : tokens.foggy,
                                        lineHeight: 1.5
                                    }}>
                                        {item.resposta_professor ? (
                                            item.resposta_professor
                                        ) : (
                                            <span style={{ fontStyle: 'italic', fontWeight: 500 }}>
                                                Aguardando resposta do professor. Você será notificado neste painel assim que for respondido.
                                            </span>
                                        )}
                                    </div>
                                </CCol>
                            </CRow>

                            {/* Integração Estudo: Botão de Revisão Direta */}
                            {item.questao_id && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${tokens.border}`, marginTop: 16, paddingTop: 12 }}>
                                    <CButton
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onRevisarQuestao(item.questao_id)
                                        }}
                                        style={{
                                            background: `${tokens.rausch}15`, color: tokens.rausch, border: 'none',
                                            borderRadius: 10, padding: '6px 12px',
                                            fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Icon icon="solar:book-bookmark-bold" /> Revisar Questão Associada
                                    </CButton>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

const MeusFeedbacks = () => {
    const shouldReduceMotion = useReducedMotion()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [expandedId, setExpandedId] = useState(null)
    
    // Estados do Formulário de Nova Dúvida (Helpdesk)
    const [formModalOpen, setFormModalOpen] = useState(false)
    const [selectedQuestaoParaDuvida, setSelectedQuestaoParaDuvida] = useState('')
    const [textoDuvida, setTextoDuvida] = useState('')
    const [marcadaConfusa, setMarcadaConfusa] = useState(false)
    const [submittingDuvida, setSubmittingDuvida] = useState(false)
    const [duvidaMessage, setDuvidaMessage] = useState(null)

    // Estados do Modal de Revisão Integrada
    const [selectedQuestaoId, setSelectedQuestaoId] = useState(null)
    const [questaoDetail, setQuestaoDetail] = useState(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [revisaoModalOpen, setRevisaoModalOpen] = useState(false)
    const [errorDetail, setErrorDetail] = useState(null)

    const nome = sessionStorage.getItem('nome')
    const matricula = getAlunoMatricula() || sessionStorage.getItem('matricula')
    const token = sessionStorage.getItem('token')

    // ── Sistema de Diagnóstico (apenas em desenvolvimento) ────────
    const [debugLogs, setDebugLogs] = useState([])
    const [showDebugPanel, setShowDebugPanel] = useState(false)
    // useCallback → função estável, não recriada a cada render
    const addDebugLog = useCallback((msg, type = 'info') => {
        // Limita o buffer a 50 entradas para evitar vazamento de memória
        setDebugLogs(prev => [...prev.slice(-49), { time: new Date().toLocaleTimeString(), msg, type }])
        if (import.meta.env.DEV) console.log(`[Diagnostic] [${type}] ${msg}`)
    }, [])

    // ── Carregar feedbacks via nova rota autenticada (v2) ─────────
    const { data: feedbacks = [], isLoading: loading } = useQuery({
        queryKey: ['meusFeedbacks', matricula], // usa matricula — identificador único e imutável
        queryFn: async () => {
            addDebugLog(`Carregando feedbacks para matrícula: ${matricula}...`, 'info')
            const res = await fetch(`${API_URL}/api/aluno/meus-feedbacks-v2?por_pagina=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            addDebugLog(`Resposta de feedbacks: ${res.status}`, res.ok ? 'success' : 'error')
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            addDebugLog(`Feedbacks carregados: ${data.feedbacks?.length || 0} itens.`, 'success')
            return data.feedbacks || []
        },
        enabled: !!matricula && !!token,
        staleTime: 1000 * 60 * 2, // cache 2 minutos
    })

    // ── Questoes resolvidas para o dropdown (com cache de 5min) ──
    const { data: questoesResolvidas = [], isLoading: loadingQuestoes } = useQuery({
        queryKey: ['questoes-resolvidas-form', matricula],
        queryFn: async () => {
            addDebugLog(`Carregando questões resolvidas para matrícula: ${matricula}...`, 'info')
            const res = await fetch(
                `${API_URL}/api/aluno/questoes-respondidas?matricula=${matricula}&por_pagina=30`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            addDebugLog(`API de questões respondeu com status: ${res.status}`, res.ok ? 'success' : 'error')
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            addDebugLog(`Carregadas ${data.questoes?.length || 0} questões resolvidas.`, 'success')
            return data.questoes || []
        },
        enabled: formModalOpen && !!matricula && !!token,
        staleTime: 1000 * 60 * 5, // cache 5 minutos — não faz fetch toda vez que o modal abre
    })

    const abrirNovaPergunta = () => {
        addDebugLog('Abrindo modal de nova dúvida acadêmica...', 'info')
        setDuvidaMessage(null)
        setTextoDuvida('')
        setMarcadaConfusa(false)
        setSelectedQuestaoParaDuvida('')
        setFormModalOpen(true)
        addDebugLog('Modal de dúvidas aberto com sucesso.', 'success')
    }

    // ── Submissão do novo feedback ───────────────────────────────
    const handleSubmitDuvida = async (e) => {
        e.preventDefault()
        if (!textoDuvida.trim()) {
            setDuvidaMessage({ tipo: 'danger', texto: 'Escreva a sua dúvida ou sugestão.' })
            return
        }

        addDebugLog(`Enviando dúvida para a API...`, 'info')
        setSubmittingDuvida(true)
        setDuvidaMessage(null)

        try {
            const res = await fetch(`${API_URL}/api/feedbacks_questoes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // segurança: token JWT
                },
                body: JSON.stringify({
                    questao_id: selectedQuestaoParaDuvida ? parseInt(selectedQuestaoParaDuvida) : null,
                    nome_aluno: nome || 'Aluno Anônimo',
                    texto: textoDuvida,
                    marcada_confusa: marcadaConfusa
                })
            })

            // Verificar status HTTP antes de parsear JSON
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const resData = await res.json()
            addDebugLog(`API respondeu: ${resData.sucesso ? 'sucesso' : resData.mensagem}`, resData.sucesso ? 'success' : 'warning')

            setSubmittingDuvida(false)
            if (resData.sucesso || resData.id) {
                setDuvidaMessage({ tipo: 'success', texto: 'Dúvida enviada com sucesso ao professor!' })
                queryClient.invalidateQueries({ queryKey: ['meusFeedbacks', matricula] })
                setTimeout(() => { setFormModalOpen(false) }, 1500)
            } else {
                setDuvidaMessage({ tipo: 'danger', texto: resData.mensagem || 'Erro ao enviar dúvida.' })
            }
        } catch (err) {
            addDebugLog(`Erro na submissão: ${err.message}`, 'error')
            setSubmittingDuvida(false)
            setDuvidaMessage({ tipo: 'danger', texto: `Erro de conexão: ${err.message}` })
        }
    }

    // Abrir Modal de Revisão Completa da Questão
    const handleRevisarQuestao = (questaoId) => {
        setSelectedQuestaoId(questaoId)
        setQuestaoDetail(null)
        setRevisaoModalOpen(true)
    }

    // Carregar detalhes da questão
    useEffect(() => {
        if (!selectedQuestaoId) return
        setLoadingDetail(true)
        setErrorDetail(null)

        fetch(`${API_URL}/api/questoes?ids=${selectedQuestaoId}`)
            .then(res => {
                if (!res.ok) throw new Error('Erro')
                return res.json()
            })
            .then(resData => {
                const questaoLista = resData.dados?.data || resData.dados || resData || []
                if (questaoLista.length > 0) {
                    setQuestaoDetail(questaoLista[0])
                } else {
                    setErrorDetail('Questão não encontrada.')
                }
                setLoadingDetail(false)
            })
            .catch(() => {
                setErrorDetail('Erro ao carregar detalhes.')
                setLoadingDetail(false)
            })
    }, [selectedQuestaoId])

    const stats = useMemo(() => {
        const total = feedbacks.length
        const resolvidos = feedbacks.filter(f => f.resolvido).length
        const pendentes = total - resolvidos
        return { total, resolvidos, pendentes }
    }, [feedbacks])

    const filteredFeedbacks = useMemo(() => {
        if (!search) return feedbacks
        const s = search.toLowerCase()
        return feedbacks.filter(f => 
            (f.enunciado && f.enunciado.toLowerCase().includes(s)) || 
            (f.texto && f.texto.toLowerCase().includes(s)) ||
            String(f.questao_id).includes(s)
        )
    }, [search, feedbacks])

    if (!nome) return (
        <div className="min-h-screen bg-bg-primary p-8 flex items-center justify-center" style={{ background: 'var(--color-bg-primary)', fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
            <CAlert color="warning" className="max-w-md w-full premium-card border-orange-500/20">
                <div className="flex items-center gap-3">
                    <Icon icon="solar:user-block-linear" width="24" className="text-orange-500" />
                    <span>Faça login para ver seu histórico de feedbacks.</span>
                </div>
            </CAlert>
        </div>
    )

    return (
        <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
            <CContainer fluid className="px-3 px-md-5" style={{ paddingTop: 32 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                    {/* HEADER PREMIUM & METRICS */}
                    <div className="mb-5 d-flex flex-column lg:flex-row justify-content-between align-items-start lg:align-items-end gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ flex: 1 }}
                        >
                            <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 6 }}>
                                Área do Aluno
                            </div>
                            <h2 style={{ fontSize: 32, fontWeight: 850, color: 'var(--color-text-primary)', letterSpacing: '-1px', lineHeight: 1.1 }}>
                                Suporte <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', color: tokens.rausch }}>& Feedbacks</span> 💬
                            </h2>
                            <p style={{ fontSize: 14, color: tokens.foggy, fontWeight: 550, marginTop: 8, maxWidth: 500, lineHeight: 1.5 }}>
                                Consulte suas dúvidas anteriores, mande novas perguntas aos professores e estude de forma totalmente integrada ao seu progresso.
                            </p>
                        </motion.div>

                        {/* KPI METRIC CARDS */}
                        <div className="d-flex flex-wrap gap-3 w-100 lg:w-auto" style={{ maxWidth: 500 }}>
                            <StatCard icon="solar:document-text-linear" label="Total de Chamados" value={stats.total} color={tokens.rausch} />
                            <StatCard icon="solar:check-circle-linear" label="Respondidos" value={stats.resolvidos} color={tokens.babu} />
                            <StatCard icon="solar:clock-circle-linear" label="Em Aberto" value={stats.pendentes} color={tokens.arches} />
                        </div>
                    </div>

                    {/* BUSCA E SUPORTE DE CONTATO (AIRBNB STYLE) */}
                    <motion.div
                        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: shouldReduceMotion ? 0 : 0.15 }}
                        className="d-flex flex-column flex-md-row gap-3 align-items-center mb-4"
                    >
                        {/* Search Bar */}
                        <div style={{ position: 'relative', flex: 1, width: '100%' }}>
                            <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: tokens.foggy, pointerEvents: 'none' }}>
                                <Icon icon="solar:magnifer-linear" width="20" />
                            </div>
                            <input
                                type="text"
                                placeholder="Pesquisar em suas dúvidas ou por ID da questão..."
                                className="w-100"
                                style={{
                                    background: tokens.bg,
                                    border: `1px solid ${tokens.border}`,
                                    borderRadius: 16,
                                    padding: '14px 16px 14px 44px',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: 'var(--color-text-primary)',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.01)'
                                }}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {search && (
                                <button 
                                    onClick={() => setSearch('')}
                                    style={{
                                        position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', color: tokens.foggy
                                    }}
                                >
                                    <Icon icon="solar:close-circle-bold" width="18" />
                                </button>
                            )}
                        </div>

                        {/* Botão de Nova Dúvida (Helpdesk) */}
                        <CButton
                            onClick={abrirNovaPergunta}
                            style={{
                                background: tokens.rausch,
                                color: '#fff',
                                border: 'none',
                                borderRadius: 16,
                                padding: '14px 24px',
                                fontWeight: 800,
                                fontSize: 13,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                boxShadow: '0 4px 15px rgba(255, 56, 92, 0.15)',
                                height: 50,
                                width: '100%',
                                mdWidth: 'auto',
                                justifyContent: 'center'
                            }}
                        >
                            <Icon icon="solar:chat-round-plus-bold" width="20" /> Mande sua Dúvida
                        </CButton>
                    </motion.div>

                    {/* FEED DE CHAMADOS */}
                    <div className="relative">
                        {loading ? (
                            <div className="grid grid-cols-1 gap-1">
                                {[...Array(4)].map((_, i) => <FeedbackSkeleton key={i} />)}
                            </div>
                        ) : filteredFeedbacks.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{
                                    background: tokens.bg,
                                    border: `1px solid ${tokens.border}`,
                                    borderRadius: 24,
                                    padding: '50px 20px',
                                    textAlign: 'center'
                                }}
                            >
                                <div style={{
                                    width: 72, height: 72, borderRadius: '50%',
                                    background: 'var(--color-bg-tertiary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 20px', color: tokens.foggy
                                }}>
                                    <Icon icon="solar:chat-round-line-broken" width="32" />
                                </div>
                                <h5 style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>Nenhum chamado de feedback encontrado</h5>
                                <p style={{ color: tokens.foggy, fontSize: 13, maxWidth: 420, margin: '8px auto 0' }}>
                                    {search 
                                        ? `Não encontramos resultados para a busca "${search}".` 
                                        : "Tudo limpo por aqui! Quando tiver dúvidas sobre alguma alternativa ou gabarito, mande para nossa equipe."}
                                </p>
                            </motion.div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {filteredFeedbacks.map((item, idx) => (
                                    <FAQItem
                                        key={item.id}
                                        item={item}
                                        index={idx}
                                        isOpen={expandedId === item.id}
                                        onToggle={() => setExpandedId(prev => prev === item.id ? null : item.id)}
                                        onRevisarQuestao={handleRevisarQuestao}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CContainer>

            {/* MODAL / FORMULÁRIO DE NOVA DÚVIDA (HELPDESK ACADÊMICO) */}
            <CModal
                visible={formModalOpen}
                onClose={() => setFormModalOpen(false)}
                backdrop="static"
                size="lg"
            >
                <div style={{ fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
                    <CModalHeader style={{ borderBottom: `1px solid ${tokens.border}` }}>
                        <CModalTitle style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Icon icon="solar:chat-round-plus-bold" style={{ color: tokens.rausch }} />
                            Mande sua Dúvida Acadêmica
                        </CModalTitle>
                    </CModalHeader>
                    <form onSubmit={handleSubmitDuvida}>
                    <CModalBody style={{ padding: 24 }}>
                        {duvidaMessage && (
                            <CAlert color={duvidaMessage.tipo} className="mb-3">
                                {duvidaMessage.texto}
                            </CAlert>
                        )}

                        {/* Dropdown de Questões Resolvidas */}
                        <div className="mb-4">
                            <CFormLabel style={{ fontSize: 12, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase' }}>
                                Questão Relacionada
                            </CFormLabel>
                            {loadingQuestoes ? (
                                <div className="py-2"><CSpinner size="sm" color="danger" /> Carregando seu histórico...</div>
                            ) : (
                                <select
                                    value={selectedQuestaoParaDuvida}
                                    onChange={e => setSelectedQuestaoParaDuvida(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: 12,
                                        border: `1px solid ${tokens.border}`,
                                        background: tokens.bgSub,
                                        color: 'var(--color-text-primary)',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">Dúvida Geral / Sem questão específica 🌍</option>
                                    {questoesResolvidas.map(q => (
                                        <option key={q.questao_id} value={q.questao_id}>
                                            Questão #{q.questao_id} — {q.materias} (Gabarito: {q.acertou ? 'Acertou ✅' : 'Errou ❌'})
                                        </option>
                                    ))}
                                </select>
                            )}
                            <div style={{ fontSize: 11, color: tokens.foggy, marginTop: 4 }}>
                                Selecione a questão sobre a qual você deseja tirar dúvidas com o professor.
                            </div>
                        </div>

                        {/* Descrição Detalhada da Dúvida */}
                        <div className="mb-4">
                            <CFormLabel style={{ fontSize: 12, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase' }}>
                                O que te deixou confuso(a) nessa questão?
                            </CFormLabel>
                            <CFormTextarea
                                rows={4}
                                placeholder="Explique em detalhes qual é a sua dúvida em relação ao gabarito, alternativa ou explicação teórica da questão..."
                                value={textoDuvida}
                                onChange={e => setTextoDuvida(e.target.value)}
                                style={{
                                    borderRadius: 14,
                                    border: `1px solid ${tokens.border}`,
                                    background: tokens.bgSub,
                                    color: 'var(--color-text-primary)',
                                    padding: 14,
                                    fontSize: 13,
                                    fontWeight: 600
                                }}
                            />
                        </div>

                        {/* Checkbox Confusa */}
                        <div className="mb-2">
                            <CFormCheck
                                id="confusaCheck"
                                label="Marcar esta questão como contendo erro de enunciado ou gabarito ambíguo"
                                checked={marcadaConfusa}
                                onChange={e => setMarcadaConfusa(e.target.checked)}
                                style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}
                            />
                        </div>
                    </CModalBody>
                    <CModalFooter style={{ borderTop: `1px solid ${tokens.border}` }}>
                        <CButton
                            color="secondary"
                            onClick={() => setFormModalOpen(false)}
                            style={{ borderRadius: 10, fontWeight: 700, fontSize: 12 }}
                            disabled={submittingDuvida}
                        >
                            Cancelar
                        </CButton>
                        <CButton
                            type="submit"
                            style={{
                                background: tokens.rausch, color: '#fff', border: 'none',
                                borderRadius: 10, fontWeight: 700, fontSize: 12
                            }}
                            disabled={submittingDuvida}
                        >
                            {submittingDuvida ? <CSpinner size="sm" /> : 'Enviar Pergunta 🚀'}
                        </CButton>
                    </CModalFooter>
                </form>
                </div>
            </CModal>

            {/* MODAL DE REVISÃO INTEGRADA (Carrega detalhes reais da questão) */}
            <CModal 
                visible={revisaoModalOpen} 
                onClose={() => setRevisaoModalOpen(false)} 
                size="lg"
                backdrop="static"
            >
                <div style={{ fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
                    <CModalHeader style={{ borderBottom: `1px solid ${tokens.border}` }}>
                        <CModalTitle style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Icon icon="solar:document-bold" style={{ color: tokens.rausch }} />
                            Revisão de Questão #{selectedQuestaoId}
                        </CModalTitle>
                    </CModalHeader>
                <CModalBody style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
                    {loadingDetail ? (
                        <div className="text-center py-5">
                            <CSpinner color="danger" />
                            <p className="mt-3 text-body-secondary" style={{ fontWeight: 600 }}>Carregando dados da questão...</p>
                        </div>
                    ) : errorDetail ? (
                        <CAlert color="danger" className="d-flex align-items-center gap-2">
                            <Icon icon="solar:danger-bold-duotone" width="20" />
                            <span>{errorDetail}</span>
                        </CAlert>
                    ) : questaoDetail ? (
                        <div>
                            {/* Tags */}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                                {questaoDetail.banca && (
                                    <CBadge color="light" className="text-dark" style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700 }}>
                                        Banca: {questaoDetail.banca}
                                    </CBadge>
                                )}
                                {questaoDetail.ano && (
                                    <CBadge color="light" className="text-dark" style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700 }}>
                                        Ano: {questaoDetail.ano}
                                    </CBadge>
                                )}
                                {questaoDetail.dificuldade && (
                                    <CBadge color="light" className="text-dark" style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700 }}>
                                        Dificuldade: {questaoDetail.dificuldade}
                                    </CBadge>
                                )}
                            </div>

                            {/* Enunciado Integral */}
                            <div style={{ background: tokens.bgSub, borderRadius: 16, padding: 20, border: `1px solid ${tokens.border}`, marginBottom: 24 }}>
                                <h6 style={{ fontWeight: 800, fontSize: 12, color: tokens.foggy, textTransform: 'uppercase', marginBottom: 8 }}>Enunciado da Questão</h6>
                                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {questaoDetail.question}
                                </p>
                            </div>

                            {/* Alternativas */}
                            <h6 style={{ fontWeight: 800, fontSize: 12, color: tokens.foggy, textTransform: 'uppercase', marginBottom: 12 }}>Alternativas Cadastradas</h6>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                                {questaoDetail.options?.map((opcao, idx) => {
                                    const letra = String.fromCharCode(65 + idx)
                                    const ehCorreta = letra === questaoDetail.answer?.toUpperCase()
                                    
                                    return (
                                        <div 
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 12,
                                                padding: '14px 16px',
                                                borderRadius: 14,
                                                background: ehCorreta ? `${tokens.babu}10` : 'transparent',
                                                border: `1px solid ${ehCorreta ? tokens.babu : tokens.border}`,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{
                                                width: 24, height: 24, borderRadius: '50%',
                                                background: ehCorreta ? tokens.babu : tokens.bgSub,
                                                color: ehCorreta ? '#fff' : tokens.foggy,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, fontWeight: 800, flexShrink: 0
                                            }}>
                                                {letra}
                                            </span>
                                            <div style={{ 
                                                fontSize: 13, 
                                                fontWeight: ehCorreta ? 700 : 600, 
                                                color: ehCorreta ? tokens.babu : 'var(--color-text-primary)',
                                                lineHeight: 1.4
                                            }}>
                                                {opcao}
                                            </div>
                                            {ehCorreta && (
                                                <Icon 
                                                    icon="solar:check-circle-bold" 
                                                    style={{ color: tokens.babu, marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }} 
                                                    width="18" 
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Explicação Teórica */}
                            {questaoDetail.explicacao && (
                                <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 16, padding: 20, border: `1px solid ${tokens.border}`, marginBottom: 24 }}>
                                    <h6 style={{ fontWeight: 800, fontSize: 12, color: tokens.foggy, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Icon icon="solar:lightbulb-bold-duotone" style={{ color: tokens.arches }} />
                                        Explicação do Professor
                                    </h6>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                                        {questaoDetail.explicacao}
                                    </p>
                                </div>
                            )}

                            {/* Vídeo */}
                            {questaoDetail.link_video && (
                                <div style={{ background: `${tokens.rausch}08`, borderRadius: 16, padding: 20, border: `1px dashed ${tokens.rausch}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                        <div>
                                            <h6 style={{ fontWeight: 800, fontSize: 13, color: tokens.rausch, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Icon icon="solar:videocamera-record-bold-duotone" />
                                                Resolução em Vídeo Disponível!
                                            </h6>
                                            <p style={{ fontSize: 11, color: tokens.foggy, margin: 0 }}>
                                                Assista à explicação detalhada desta questão com o professor.
                                            </p>
                                        </div>
                                        <CButton 
                                            href={questaoDetail.link_video}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                background: tokens.rausch, color: '#fff', border: 'none',
                                                borderRadius: 12, padding: '8px 16px',
                                                fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                                                boxShadow: '0 4px 10px rgba(255, 56, 92, 0.15)'
                                            }}
                                        >
                                            <Icon icon="solar:play-bold" /> Assistir Resolução
                                        </CButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </CModalBody>
                <CModalFooter style={{ borderTop: `1px solid ${tokens.border}` }}>
                    <CButton 
                        color="secondary" 
                        onClick={() => setRevisaoModalOpen(false)}
                        style={{ borderRadius: 10, fontWeight: 700, fontSize: 12 }}
                    >
                        Fechar Revisão
                    </CButton>
                </CModalFooter>
                </div>
            </CModal>

            {/* PAINEL DE DIAGNÓSTICO — apenas em desenvolvimento */}
            {import.meta.env.DEV && (
            <div style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 99999,
                fontFamily: "'Circular Std', 'Nunito', sans-serif"
            }}>
                <CButton
                    color="dark"
                    size="sm"
                    onClick={() => setShowDebugPanel(!showDebugPanel)}
                    style={{
                        borderRadius: 30,
                        padding: '10px 18px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 700,
                        fontSize: 12,
                        background: '#1e293b',
                        color: '#fff',
                        border: 'none'
                    }}
                >
                    <Icon 
                        icon="solar:shield-warning-bold" 
                        width="16" 
                        style={{ color: debugLogs.some(l => l.type === 'error') ? tokens.rausch : '#10b981' }} 
                    />
                    Console de Diagnóstico {debugLogs.filter(l => l.type === 'error').length > 0 && `(${debugLogs.filter(l => l.type === 'error').length} 🚨)`}
                </CButton>

                {showDebugPanel && (
                    <div style={{
                        position: 'absolute',
                        bottom: 54,
                        right: 0,
                        width: 350,
                        maxHeight: 450,
                        background: 'var(--color-bg-elevated)',
                        border: `1px solid ${tokens.border}`,
                        borderRadius: 20,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '14px 18px',
                            borderBottom: `1px solid ${tokens.border}`,
                            fontWeight: 850,
                            fontSize: 13,
                            background: 'rgba(255, 56, 92, 0.08)',
                            color: tokens.rausch,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Icon icon="solar:bug-bold" /> PAINEL DE DIAGNÓSTICO
                            </span>
                            <CButton 
                                size="sm" 
                                color="link" 
                                onClick={() => setDebugLogs([])} 
                                style={{ fontSize: 11, padding: 0, color: tokens.foggy, textDecoration: 'none', fontWeight: 700 }}
                            >
                                Limpar
                            </CButton>
                        </div>
                        <div style={{ 
                            padding: 16, 
                            overflowY: 'auto', 
                            flex: 1, 
                            fontSize: 12, 
                            background: 'var(--color-bg-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                        }}>
                            {debugLogs.length === 0 ? (
                                <div style={{ color: tokens.foggy, textAlign: 'center', padding: '32px 16px', fontWeight: 600 }}>
                                    Nenhum log registrado ainda.<br/>Clique no botão de dúvida para testar a integração.
                                </div>
                            ) : (
                                debugLogs.map((log, i) => (
                                    <div key={i} style={{
                                        borderBottom: `1px solid ${tokens.border}`,
                                        paddingBottom: 8,
                                        color: log.type === 'error' ? tokens.rausch : log.type === 'success' ? '#10b981' : log.type === 'warning' ? '#f59e0b' : 'var(--color-text-primary)'
                                    }}>
                                        <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, marginBottom: 2 }}>[{log.time}]</div>
                                        <div style={{ fontWeight: 650, lineHeight: 1.4 }}>{log.msg}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            )}
        </div>
    )
}

export default MeusFeedbacks