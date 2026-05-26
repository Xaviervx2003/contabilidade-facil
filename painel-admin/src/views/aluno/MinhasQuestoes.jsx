import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
    CContainer,
    CRow,
    CCol,
    CSpinner,
    CAlert,
    CButton,
    CPagination,
    CPaginationItem,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CBadge,
    CFormTextarea,
    CFormCheck,
    CFormLabel,
    CFormSelect,
} from '@coreui/react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { API_URL } from '../../config'
import api from '../../services/api'
import { getAlunoMatricula } from '../../utils/auth'
import { tokens } from '../../tokens'
import useAuthSession from '../../hooks/useAuthSession'

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


const MinhasQuestoes = () => {
    const { nome, matricula: matriculaSessao, token } = useAuthSession()
    const matricula = getAlunoMatricula() || matriculaSessao

    // Estados principais de listagem
    const [dados, setDados] = useState({ questoes: [], total: 0, total_paginas: 1 })
    const [loading, setLoading] = useState(true)
    const [pagina, setPagina] = useState(1)
    const [filtroAcerto, setFiltroAcerto] = useState('')
    const [filtroMateria, setFiltroMateria] = useState('')
    const [materias, setMaterias] = useState([])
    const porPagina = 12

    // Estados de Métricas
    const { data: metrics, isLoading: loadingMetrics } = useQuery({
        queryKey: ['metricas-estudante', matricula],
        queryFn: async () => {
            if (!matricula) throw new Error('Matrícula não encontrada')
            const res = await api.get(`/api/metricas-estudantes/desempenho/${matricula}`)
            return res.data
        },
        enabled: !!matricula && !!token,
        staleTime: 1000 * 60 * 5, // 5 minutos de cache
    })

    // Estados dos Custom Dropdowns (Airbnb Style)
    const [activeDropdown, setActiveDropdown] = useState(null) // 'status' ou 'materia' ou null
    const [buscaMateria, setBuscaMateria] = useState('')
    
    // Refs para fechar ao clicar fora
    const dropdownStatusRef = useRef(null)
    const dropdownMateriaRef = useRef(null)

    // Estados do Modal de Detalhes da Questão
    const [selectedQuestaoId, setSelectedQuestaoId] = useState(null)
    const [questaoDetail, setQuestaoDetail] = useState(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [errorDetail, setErrorDetail] = useState(null)

    // Estados do Modal de Dúvida Integrada (Helpdesk)
    const [duvidaModalOpen, setDuvidaModalOpen] = useState(false)
    const [textoDuvida, setTextoDuvida] = useState('')
    const [marcadaConfusa, setMarcadaConfusa] = useState(false)
    const [submittingDuvida, setSubmittingDuvida] = useState(false)
    const [duvidaMessage, setDuvidaMessage] = useState(null)

    
    // ==== TABS ====
    const [activeTab, setActiveTab] = useState('historico') // 'historico' | 'feedbacks'
    const queryClient = useQueryClient()
    const shouldReduceMotion = useReducedMotion()

    // ==== FEEDBACKS LOGIC ====
    const [searchFeedbacks, setSearchFeedbacks] = useState('')
    const [expandedId, setExpandedId] = useState(null)
    
    const { data: feedbacks = [], isLoading: loadingFeedbacks } = useQuery({
        queryKey: ['meusFeedbacks', matricula],
        queryFn: async () => {
            addDebugLog(`Carregando feedbacks para matrícula: ${matricula}...`, 'info')
            const { data } = await api.get(`/api/aluno/meus-feedbacks-v2?por_pagina=50`)
            return data.feedbacks || []
        },
        enabled: !!matricula && !!token && activeTab === 'feedbacks',
        staleTime: 1000 * 60 * 2,
    })

    const stats = useMemo(() => {
        const total = feedbacks.length
        const resolvidos = feedbacks.filter(f => f.resolvido).length
        const pendentes = total - resolvidos
        return { total, resolvidos, pendentes }
    }, [feedbacks])

    const filteredFeedbacks = useMemo(() => {
        if (!searchFeedbacks) return feedbacks
        const s = searchFeedbacks.toLowerCase()
        return feedbacks.filter(f => 
            (f.enunciado && f.enunciado.toLowerCase().includes(s)) || 
            (f.texto && f.texto.toLowerCase().includes(s)) ||
            String(f.questao_id).includes(s)
        )
    }, [searchFeedbacks, feedbacks])

    // Nova Pergunta Independente
    const [formModalOpen, setFormModalOpen] = useState(false)
    const [selectedQuestaoParaDuvida, setSelectedQuestaoParaDuvida] = useState('')
    
    const { data: questoesResolvidas = [], isLoading: loadingQuestoes } = useQuery({
        queryKey: ['questoes-resolvidas-form', matricula],
        queryFn: async () => {
            const { data } = await api.get(
                `/api/aluno/questoes-respondidas?matricula=${matricula}&por_pagina=30`
            )
            return data.questoes || []
        },
        enabled: formModalOpen && !!matricula && !!token,
        staleTime: 1000 * 60 * 5,
    })

    const abrirNovaPergunta = () => {
        setDuvidaMessage(null)
        setTextoDuvida('')
        setMarcadaConfusa(false)
        setSelectedQuestaoParaDuvida('')
        setFormModalOpen(true)
    }

    const handleSubmitNovaPergunta = (e) => {
        e.preventDefault()
        if (!textoDuvida.trim()) {
            setDuvidaMessage({ tipo: 'danger', texto: 'Escreva sua dúvida.' })
            return
        }
        setSubmittingDuvida(true)
        api.post(`/api/feedbacks_questoes`, {
            questao_id: selectedQuestaoParaDuvida || null,
            nome_aluno: nome || 'Aluno',
            texto: textoDuvida,
            marcada_confusa: marcadaConfusa
        })
        .then(res => {
            const resData = res.data
            setSubmittingDuvida(false)
            if (resData.sucesso || resData.id) {
                setDuvidaMessage({ tipo: 'success', texto: 'Dúvida enviada com sucesso!' })
                queryClient.invalidateQueries(['meusFeedbacks', matricula])
                closeTimerRef.current = setTimeout(() => {
                    setFormModalOpen(false)
                    setTextoDuvida('')
                    setDuvidaMessage(null)
                    setActiveTab('feedbacks')
                }, 1500)
            } else {
                setDuvidaMessage({ tipo: 'danger', texto: resData.mensagem || 'Erro ao enviar.' })
            }
        }).catch(err => {
            setSubmittingDuvida(false)
            setDuvidaMessage({ tipo: 'danger', texto: 'Erro de conexão.' })
        })
    }


    // ── Diagnóstico (apenas em desenvolvimento) ────────────────────────
    const [debugLogs, setDebugLogs] = useState([])
    const [showDebugPanel, setShowDebugPanel] = useState(false)
    // useCallback: função estável — não recriada em cada render
    const addDebugLog = useCallback((msg, type = 'info') => {
        setDebugLogs(prev => [...prev.slice(-49), { time: new Date().toLocaleTimeString(), msg, type }])
        if (import.meta.env.DEV) console.log(`[Diagnostic] [${type}] ${msg}`)
    }, [])

    // ── Ref para cleanup do setTimeout (evita setState em componente desmontado) ──
    const closeTimerRef = useRef(null)

    // Submissão de dúvida integrada
    const handleSubmitDuvida = (e) => {
        e.preventDefault()
        if (!textoDuvida.trim()) {
            setDuvidaMessage({ tipo: 'danger', texto: 'Escreva a sua dúvida ou sugestão.' })
            return
        }

        addDebugLog(`Iniciando submissão de dúvida para questão #${selectedQuestaoId}...`, 'info')
        setSubmittingDuvida(true)
        setDuvidaMessage(null)

        api.post(`/api/feedbacks_questoes`, {
            questao_id: selectedQuestaoId,
            nome_aluno: nome || 'Aluno Anônimo',
            texto: textoDuvida,
            marcada_confusa: marcadaConfusa
        })
        .then(res => {
            addDebugLog(`API respondeu com sucesso`, 'success')
            const resData = res.data
            setSubmittingDuvida(false)
            if (resData.sucesso || resData.id) {
                addDebugLog('Dúvida enviada com sucesso ao banco de dados!', 'success')
                setDuvidaMessage({ tipo: 'success', texto: 'Dúvida enviada com sucesso ao professor!' })
                // Salvar ref do timer para cleanup seguro
                closeTimerRef.current = setTimeout(() => {
                    setDuvidaModalOpen(false)
                    setTextoDuvida('')
                    setMarcadaConfusa(false)
                    setDuvidaMessage(null)
                }, 1800)
            } else {
                addDebugLog(`API retornou falha lógica: ${resData.mensagem}`, 'error')
                setDuvidaMessage({ tipo: 'danger', texto: resData.mensagem || 'Erro ao enviar dúvida.' })
            }
        })
        .catch(err => {
            addDebugLog(`Erro na requisição: ${err.message}`, 'error')
            setSubmittingDuvida(false)
            setDuvidaMessage({ tipo: 'danger', texto: 'Erro de conexão ao enviar.' })
        })
    }

    // Limpar timer ao desmontar o componente
    useEffect(() => {
        return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current) }
    }, [])

    // Fechar dropdowns ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeDropdown === 'status' && dropdownStatusRef.current && !dropdownStatusRef.current.contains(event.target)) {
                setActiveDropdown(null)
            }
            if (activeDropdown === 'materia' && dropdownMateriaRef.current && !dropdownMateriaRef.current.contains(event.target)) {
                setActiveDropdown(null)
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [activeDropdown])

    useEffect(() => {
        api.get(`/api/admin/materias`)
            .then(res => setMaterias(Array.isArray(res.data) ? res.data : []))
            .catch(() => { })
    }, [])

    // Carregar métricas removido (agora gerenciado pelo useQuery lá no topo)

    // Carregar lista de questões respondidas com paginação e filtros
    const carregarQuestoes = useCallback(() => {
        if (!matricula) return
        setLoading(true)
        const params = new URLSearchParams({
            matricula,
            pagina,
            por_pagina: porPagina,
        })
        if (filtroAcerto) params.set('acerto', filtroAcerto)
        if (filtroMateria) params.set('materia_id', filtroMateria)

        api.get(`/api/aluno/questoes-respondidas?${params.toString()}`)
            .then(res => res.data)
            .then(data => {
                setDados(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [matricula, pagina, filtroAcerto, filtroMateria, token])

    useEffect(() => {
        carregarQuestoes()
    }, [carregarQuestoes])

    // Carregar detalhes completos de uma questão ao abrir o modal
    useEffect(() => {
        if (!selectedQuestaoId) return
        setLoadingDetail(true)
        setErrorDetail(null)

        api.get(`/api/questoes?ids=${selectedQuestaoId}`)
            .then(res => res.data)
            .then(resData => {
                const questaoLista = resData.dados?.data || resData.dados || resData || []
                if (questaoLista.length > 0) {
                    setQuestaoDetail(questaoLista[0])
                } else {
                    setErrorDetail('Questão não encontrada.')
                }
                setLoadingDetail(false)
            })
            .catch(err => {
                if (import.meta.env.DEV) console.error('[MinhasQuestoes] Erro ao carregar detalhe:', err)
                setErrorDetail('Erro ao carregar detalhes da questão.')
                setLoadingDetail(false)
            })
    }, [selectedQuestaoId])

    const abrirRevisao = (id) => {
        setSelectedQuestaoId(id)
        setQuestaoDetail(null)
        setModalOpen(true)
    }

    const { questoes, total, total_paginas } = dados

    // Rótulo amigável do status de acerto
    const obterRotuloStatus = () => {
        if (filtroAcerto === 'acerto') return 'Apenas Acertos ✅'
        if (filtroAcerto === 'erro') return 'Apenas Erros ❌'
        return 'Todas as resoluções'
    }

    // Rótulo amigável da matéria selecionada
    const obterRotuloMateria = () => {
        if (!filtroMateria) return 'Todas as matérias'
        const mat = materias.find(m => String(m.id) === String(filtroMateria))
        return mat ? mat.nome : 'Todas as matérias'
    }

    // Filtrar matérias na busca interna do dropdown
    const materiasFiltradas = materias.filter(m => 
        m.nome.toLowerCase().includes(buscaMateria.toLowerCase())
    )

    return (
        <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
            <CContainer fluid className="px-3 px-md-5" style={{ paddingTop: 32 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                    {/* HEADER PREMIUM */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ marginBottom: 36 }}
                    >
                        <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Sua Performance</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>Minhas Questões 📝</div>
                        <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
                            Acompanhe seu histórico detalhado de resoluções e revise explicações com apoio em vídeo.
                        </div>
                    </motion.div>

                    
                    {/* TABS DE NAVEGAÇÃO */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: `1px solid ${tokens.border}`, paddingBottom: 16 }}>
                        <div 
                            onClick={() => setActiveTab('historico')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: 20,
                                cursor: 'pointer',
                                fontWeight: 800,
                                fontSize: 14,
                                background: activeTab === 'historico' ? 'var(--color-text-primary)' : 'transparent',
                                color: activeTab === 'historico' ? 'var(--color-bg-primary)' : tokens.foggy,
                                transition: 'all 0.2s'
                            }}
                        >
                            📝 Histórico de Resoluções
                        </div>
                        <div 
                            onClick={() => setActiveTab('feedbacks')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: 20,
                                cursor: 'pointer',
                                fontWeight: 800,
                                fontSize: 14,
                                background: activeTab === 'feedbacks' ? 'var(--color-text-primary)' : 'transparent',
                                color: activeTab === 'feedbacks' ? 'var(--color-bg-primary)' : tokens.foggy,
                                transition: 'all 0.2s'
                            }}
                        >
                            💬 Meus Feedbacks
                        </div>
                    </div>

{activeTab === 'historico' && (
                        <>
                            {/* CARDS DE METRICAS (KPIs) */}
                    <CRow className="g-4 mb-4">
                        <CCol xs={12} sm={4}>
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                                style={{
                                    background: tokens.bg,
                                    border: `1px solid ${tokens.border}`,
                                    borderRadius: 20,
                                    padding: 20,
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16
                                }}
                            >
                                <div style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    background: `${tokens.rausch}15`, color: tokens.rausch,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon icon="solar:pen-bold-duotone" width="24" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: tokens.foggy, fontWeight: 700, textTransform: 'uppercase' }}>QUESTÕES RESOLVIDAS</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text-primary)', marginTop: 2 }}>
                                        {loadingMetrics ? <CSpinner size="sm" color="danger" /> : (metrics?.questoes ?? total)}
                                    </div>
                                </div>
                            </motion.div>
                        </CCol>

                        <CCol xs={12} sm={4}>
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                style={{
                                    background: tokens.bg,
                                    border: `1px solid ${tokens.border}`,
                                    borderRadius: 20,
                                    padding: 20,
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16
                                }}
                            >
                                <div style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    background: `${tokens.babu}15`, color: tokens.babu,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon icon="solar:target-bold-duotone" width="24" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: tokens.foggy, fontWeight: 700, textTransform: 'uppercase' }}>TAXA DE ACERTO MÉDIA</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text-primary)', marginTop: 2 }}>
                                        {loadingMetrics ? <CSpinner size="sm" color="success" /> : `${metrics?.media_numero ?? 0}%`}
                                    </div>
                                </div>
                            </motion.div>
                        </CCol>

                        <CCol xs={12} sm={4}>
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                style={{
                                    background: tokens.bg,
                                    border: `1px solid ${tokens.border}`,
                                    borderRadius: 20,
                                    padding: 20,
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16
                                }}
                            >
                                <div style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    background: `${tokens.arches}15`, color: tokens.arches,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon icon="solar:playback-speed-bold-duotone" width="24" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: tokens.foggy, fontWeight: 700, textTransform: 'uppercase' }}>SESSÕES DE ESTUDO</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text-primary)', marginTop: 2 }}>
                                        {loadingMetrics ? <CSpinner size="sm" color="warning" /> : (metrics?.sessoes ?? 0)}
                                    </div>
                                </div>
                            </motion.div>
                        </CCol>
                    </CRow>

                    {/* FILTROS EXCLUSIVOS AIRBNB STYLE */}
                    <div style={{ position: 'relative', zIndex: 10 }}>
                        <div className="d-flex flex-column flex-md-row gap-3 align-items-center mb-4">
                            
                            {/* Segmento 1: Status de Acertos */}
                            <div 
                                ref={dropdownStatusRef}
                                style={{ flex: 1, width: '100%', position: 'relative' }}
                            >
                                <div 
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveDropdown(activeDropdown === 'status' ? null : 'status')
                                    }}
                                    style={{
                                        background: tokens.bg,
                                        border: `1px solid ${activeDropdown === 'status' ? tokens.rausch : tokens.border}`,
                                        borderRadius: 20,
                                        padding: '12px 20px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: 9, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status da Resolução</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 2 }}>
                                            {obterRotuloStatus()}
                                        </div>
                                    </div>
                                    <Icon 
                                        icon="solar:alt-arrow-down-bold" 
                                        style={{ color: tokens.foggy, transition: 'transform 0.2s', transform: activeDropdown === 'status' ? 'rotate(180deg)' : 'none' }} 
                                        width="14"
                                    />
                                </div>

                                <AnimatePresence>
                                    {activeDropdown === 'status' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute',
                                                top: '108%',
                                                left: 0,
                                                width: '100%',
                                                background: tokens.bg,
                                                border: `1px solid ${tokens.border}`,
                                                borderRadius: 18,
                                                boxShadow: '0 12px 36px rgba(0,0,0,0.1)',
                                                padding: 10,
                                                zIndex: 99,
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {/* Option 1: Todas */}
                                                <div 
                                                    onClick={() => { setFiltroAcerto(''); setPagina(1); setActiveDropdown(null) }}
                                                    style={{
                                                        padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        background: filtroAcerto === '' ? 'var(--color-bg-tertiary)' : 'transparent',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <Icon icon="solar:checklist-bold-duotone" style={{ color: tokens.foggy }} width="18" />
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Todas as resoluções</span>
                                                </div>

                                                {/* Option 2: Acertos */}
                                                <div 
                                                    onClick={() => { setFiltroAcerto('acerto'); setPagina(1); setActiveDropdown(null) }}
                                                    style={{
                                                        padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        background: filtroAcerto === 'acerto' ? 'var(--color-bg-tertiary)' : 'transparent',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <Icon icon="solar:check-circle-bold-duotone" style={{ color: tokens.babu }} width="18" />
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Apenas Acertos</span>
                                                </div>

                                                {/* Option 3: Erros */}
                                                <div 
                                                    onClick={() => { setFiltroAcerto('erro'); setPagina(1); setActiveDropdown(null) }}
                                                    style={{
                                                        padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        background: filtroAcerto === 'erro' ? 'var(--color-bg-tertiary)' : 'transparent',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <Icon icon="solar:bill-cross-bold-duotone" style={{ color: tokens.rausch }} width="18" />
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Apenas Erros</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Segmento 2: Matéria Relacionada */}
                            <div 
                                ref={dropdownMateriaRef}
                                style={{ flex: 1, width: '100%', position: 'relative' }}
                            >
                                <div 
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveDropdown(activeDropdown === 'materia' ? null : 'materia')
                                    }}
                                    style={{
                                        background: tokens.bg,
                                        border: `1px solid ${activeDropdown === 'materia' ? tokens.rausch : tokens.border}`,
                                        borderRadius: 20,
                                        padding: '12px 20px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: 9, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Matéria Relacionada</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 280 }}>
                                            {obterRotuloMateria()}
                                        </div>
                                    </div>
                                    <Icon 
                                        icon="solar:alt-arrow-down-bold" 
                                        style={{ color: tokens.foggy, transition: 'transform 0.2s', transform: activeDropdown === 'materia' ? 'rotate(180deg)' : 'none' }} 
                                        width="14"
                                    />
                                </div>

                                <AnimatePresence>
                                    {activeDropdown === 'materia' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute',
                                                top: '108%',
                                                right: 0,
                                                width: '100%',
                                                minWidth: 280,
                                                background: tokens.bg,
                                                border: `1px solid ${tokens.border}`,
                                                borderRadius: 18,
                                                boxShadow: '0 12px 36px rgba(0,0,0,0.1)',
                                                padding: 14,
                                                zIndex: 99,
                                            }}
                                        >
                                            {/* Busca Interna estilo Airbnb */}
                                            <div style={{ position: 'relative', marginBottom: 12 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar matéria..."
                                                    value={buscaMateria}
                                                    onChange={e => setBuscaMateria(e.target.value)}
                                                    onClick={e => e.stopPropagation()} // Impede fechar ao clicar na busca
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px 10px 36px',
                                                        borderRadius: 12,
                                                        border: `1px solid ${tokens.border}`,
                                                        background: tokens.bgSub,
                                                        color: 'var(--color-text-primary)',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        outline: 'none'
                                                    }}
                                                />
                                                <Icon 
                                                    icon="solar:magnifer-linear" 
                                                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: tokens.foggy }} 
                                                    width="16"
                                                />
                                            </div>

                                            {/* Lista Scrollável */}
                                            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
                                                {/* Opção Todas */}
                                                <div 
                                                    onClick={() => { setFiltroMateria(''); setPagina(1); setActiveDropdown(null); setBuscaMateria('') }}
                                                    style={{
                                                        padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                        background: filtroMateria === '' ? 'var(--color-bg-tertiary)' : 'transparent',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <Icon icon="solar:book-bookmark-bold-duotone" style={{ color: tokens.foggy }} width="16" />
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Todas as matérias</span>
                                                </div>

                                                {/* Lista Filtrada */}
                                                {materiasFiltradas.length === 0 ? (
                                                    <div style={{ textAlign: 'center', color: tokens.foggy, fontSize: 11, padding: '10px 0' }}>
                                                        Nenhuma matéria encontrada.
                                                    </div>
                                                ) : (
                                                    materiasFiltradas.map(m => {
                                                        const isSelected = String(filtroMateria) === String(m.id)
                                                        return (
                                                            <div 
                                                                key={m.id}
                                                                onClick={() => { setFiltroMateria(String(m.id)); setPagina(1); setActiveDropdown(null); setBuscaMateria('') }}
                                                                style={{
                                                                    padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                                    background: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                                                                    transition: 'background 0.2s'
                                                                }}
                                                            >
                                                                <Icon icon="solar:notebook-bold-duotone" style={{ color: isSelected ? tokens.rausch : tokens.foggy }} width="16" />
                                                                <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? tokens.rausch : 'var(--color-text-primary)' }}>
                                                                    {m.nome}
                                                                </span>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* FEED DE QUESTÕES */}
                    {loading ? (
                        <div className="text-center py-5">
                            <CSpinner color="danger" />
                            <p className="mt-3 text-body-secondary" style={{ fontWeight: 600 }}>Carregando suas resoluções...</p>
                        </div>
                    ) : (
                        <>
                            {questoes.length === 0 ? (
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
                                    <Icon icon="solar:document-bold-duotone" width="48" style={{ color: tokens.foggy, marginBottom: 16 }} />
                                    <h5 style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>Nenhuma questão resolvida encontrada</h5>
                                    <p style={{ color: tokens.foggy, fontSize: 13, maxWidth: 400, margin: '8px auto 0' }}>
                                        Tente alterar os filtros ou comece a praticar resolvendo quizes do sistema!
                                    </p>
                                </motion.div>
                            ) : (
                                <CRow className="g-3">
                                    <AnimatePresence mode="popLayout">
                                        {questoes.map((item, idx) => {
                                            const statusCor = item.acertou ? tokens.babu : tokens.rausch
                                            const statusBg = item.acertou ? `${tokens.babu}15` : `${tokens.rausch}15`
                                            return (
                                                <CCol xs={12} md={6} key={item.questao_id || idx}>
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 12 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.2 }}
                                                        whileHover={{ y: -2 }}
                                                        style={{
                                                            background: tokens.bg,
                                                            border: `1px solid ${tokens.border}`,
                                                            borderRadius: 20,
                                                            padding: 20,
                                                            boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
                                                            height: '100%',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            justifyContent: 'space-between',
                                                            gap: 16
                                                        }}
                                                    >
                                                        <div>
                                                            {/* Card Header Info */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                                <span style={{ fontSize: 10, color: tokens.foggy, fontWeight: 800 }}>
                                                                    ID: #{item.questao_id}
                                                                </span>
                                                                <span style={{
                                                                    fontSize: 11, fontWeight: 800,
                                                                    background: statusBg, color: statusCor,
                                                                    padding: '4px 10px', borderRadius: 99
                                                                }}>
                                                                    {item.acertou ? 'Acertou ✅' : 'Errou ❌'}
                                                                </span>
                                                            </div>

                                                            {/* Enunciado */}
                                                            <p style={{
                                                                fontSize: 14, fontWeight: 700,
                                                                color: 'var(--color-text-primary)',
                                                                lineHeight: 1.5,
                                                                marginBottom: 10,
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 3,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {item.enunciado}
                                                            </p>

                                                            {/* Tags */}
                                                            <div className="d-flex flex-wrap gap-1 mt-2">
                                                                <span style={{ background: tokens.bgSub, color: tokens.foggy, padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>
                                                                    {item.materias}
                                                                </span>
                                                                {item.assunto && item.assunto !== 'Sem assunto' && (
                                                                    <span style={{ background: tokens.bgSub, color: tokens.foggy, padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                                                                        {item.assunto}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Footer Row */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${tokens.border}`, paddingTop: 12, marginTop: 4 }}>
                                                            <span style={{ fontSize: 11, color: tokens.foggy, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <Icon icon="solar:calendar-linear" />
                                                                {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : 'Sem data'}
                                                            </span>

                                                            <CButton
                                                                onClick={() => abrirRevisao(item.questao_id)}
                                                                style={{
                                                                    background: `${tokens.babu}15`, color: tokens.babu, border: 'none',
                                                                    borderRadius: 10, padding: '6px 12px',
                                                                    fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <Icon icon="solar:eye-bold" /> Revisar
                                                            </CButton>
                                                        </div>
                                                    </motion.div>
                                                </CCol>
                                            )
                                        })}
                                    </AnimatePresence>
                                </CRow>
                            )}

                            {/* PAGINAÇÃO PREMIUM */}
                            {total_paginas > 1 && (
                                <div className="d-flex justify-content-center mt-5">
                                    <CPagination style={{ gap: 4 }}>
                                        <CPaginationItem 
                                            disabled={pagina === 1} 
                                            onClick={() => setPagina(p => p - 1)}
                                            style={{ cursor: pagina === 1 ? 'not-allowed' : 'pointer' }}
                                        >
                                            Anterior
                                        </CPaginationItem>
                                        {[...Array(total_paginas)].map((_, i) => {
                                            const isActive = pagina === i + 1
                                            return (
                                                <CPaginationItem 
                                                    key={i} 
                                                    active={isActive} 
                                                    onClick={() => setPagina(i + 1)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        background: isActive ? tokens.rausch : 'transparent',
                                                        borderColor: isActive ? tokens.rausch : 'var(--color-border)',
                                                        color: isActive ? '#fff' : 'var(--color-text-primary)',
                                                        fontWeight: 700,
                                                        borderRadius: 8
                                                    }}
                                                >
                                                    {i + 1}
                                                </CPaginationItem>
                                            )
                                        })}
                                        <CPaginationItem 
                                            disabled={pagina === total_paginas} 
                                            onClick={() => setPagina(p => p + 1)}
                                            style={{ cursor: pagina === total_paginas ? 'not-allowed' : 'pointer' }}
                                        >
                                            Próxima
                                        </CPaginationItem>
                                    </CPagination>
                                </div>
                            )}
                        </>
                    )}
                        </>
                    )}

                    {activeTab === 'feedbacks' && (
                        <div className="fade-in">
                            <div className="mb-4 d-flex flex-column lg:flex-row justify-content-between gap-4">
                                <div className="d-flex flex-wrap gap-3 w-100 lg:w-auto">
                                    <StatCard icon="solar:document-text-linear" label="Total" value={stats.total} color={tokens.rausch} />
                                    <StatCard icon="solar:check-circle-linear" label="Respondidos" value={stats.resolvidos} color={tokens.babu} />
                                    <StatCard icon="solar:clock-circle-linear" label="Em Aberto" value={stats.pendentes} color={tokens.arches} />
                                </div>
                            </div>

                            <div className="d-flex flex-column flex-md-row gap-3 align-items-center mb-4">
                                <div style={{ position: 'relative', flex: 1, width: '100%' }}>
                                    <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: tokens.foggy }}>
                                        <Icon icon="solar:magnifer-linear" width="20" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar dúvidas..."
                                        className="w-100"
                                        style={{
                                            background: tokens.bg, border: `1px solid ${tokens.border}`,
                                            borderRadius: 16, padding: '14px 16px 14px 44px',
                                            fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', outline: 'none'
                                        }}
                                        value={searchFeedbacks}
                                        onChange={(e) => setSearchFeedbacks(e.target.value)}
                                    />
                                </div>
                                <CButton
                                    onClick={abrirNovaPergunta}
                                    style={{
                                        background: tokens.rausch, color: '#fff', border: 'none',
                                        borderRadius: 16, padding: '14px 24px', fontWeight: 800, fontSize: 13,
                                        display: 'flex', alignItems: 'center', gap: 8
                                    }}
                                >
                                    <Icon icon="solar:chat-round-plus-bold" width="20" /> Mande sua Dúvida
                                </CButton>
                            </div>

                            {loadingFeedbacks ? (
                                <div className="grid grid-cols-1 gap-1">
                                    {[...Array(3)].map((_, i) => <FeedbackSkeleton key={i} />)}
                                </div>
                            ) : filteredFeedbacks.length === 0 ? (
                                <div style={{ background: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: 24, padding: '50px 20px', textAlign: 'center' }}>
                                    Nenhum feedback encontrado.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {filteredFeedbacks.map((item, idx) => (
                                        <FAQItem
                                            key={item.id} item={item} index={idx}
                                            isOpen={expandedId === item.id}
                                            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                            onRevisarQuestao={abrirRevisao}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </CContainer>

            
            <CModal visible={formModalOpen} onClose={() => setFormModalOpen(false)} size="md" backdrop="static">
                <div style={{ fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
                    <CModalHeader closeButton style={{ borderBottom: `1px solid ${tokens.border}` }}>
                        <CModalTitle style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>Mande sua Dúvida</CModalTitle>
                    </CModalHeader>
                    <form onSubmit={handleSubmitNovaPergunta}>
                        <CModalBody>
                            {duvidaMessage && <CAlert color={duvidaMessage.tipo} className="mb-3">{duvidaMessage.texto}</CAlert>}
                            <div className="mb-3">
                                <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tokens.foggy }}>Sobre qual questão é sua dúvida? (Opcional)</CFormLabel>
                                <CFormSelect
                                    value={selectedQuestaoParaDuvida}
                                    onChange={e => setSelectedQuestaoParaDuvida(e.target.value)}
                                    style={{ borderRadius: 12, background: tokens.bg, color: 'var(--color-text-primary)' }}
                                >
                                    <option value="">Geral / Outro Assunto</option>
                                    {questoesResolvidas.map(q => (
                                        <option key={q.questao_id} value={q.questao_id}>Questão #{q.questao_id} — {q.materia}</option>
                                    ))}
                                </CFormSelect>
                            </div>
                            <div className="mb-3">
                                <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tokens.foggy }}>Dúvida/Sugestão</CFormLabel>
                                <CFormTextarea rows={4} value={textoDuvida} onChange={e => setTextoDuvida(e.target.value)} required />
                            </div>
                            <div style={{ background: `${tokens.rausch}05`, border: `1px dashed ${tokens.rausch}30`, borderRadius: 16, padding: 16 }}>
                                <CFormCheck id="marcadaConfusaGeral" label="Marcar como CONFUSA (Possível erro no gabarito)" checked={marcadaConfusa} onChange={e => setMarcadaConfusa(e.target.checked)} />
                            </div>
                        </CModalBody>
                        <CModalFooter>
                            <CButton color="secondary" onClick={() => setFormModalOpen(false)}>Cancelar</CButton>
                            <CButton type="submit" style={{ background: tokens.rausch, color: '#fff', border: 'none' }} disabled={submittingDuvida}>
                                {submittingDuvida ? <CSpinner size="sm" /> : 'Enviar Pergunta'}
                            </CButton>
                        </CModalFooter>
                    </form>
                </div>
            </CModal>

            {/* MODAL DE REVISÃO DETALHADA */}
            <CModal 
                visible={modalOpen} 
                onClose={() => setModalOpen(false)} 
                size="lg"
                backdrop="static"
            >
                <div style={{ fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
                    <CModalHeader style={{ borderBottom: `1px solid ${tokens.border}` }}>
                        <CModalTitle style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Icon icon="solar:document-bold" style={{ color: tokens.rausch }} />
                            Detalhes da Questão #{selectedQuestaoId}
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
                            {/* Tags da Questão */}
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
                                {questaoDetail.assunto && (
                                    <CBadge color="danger" style={{ background: `${tokens.rausch}15`, color: tokens.rausch, padding: '6px 10px', fontSize: 10, fontWeight: 700 }}>
                                        {questaoDetail.assunto}
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
                                    const letra = String.fromCharCode(65 + idx) // A, B, C, D, E
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

                            {/* Explicação Teórica do Professor */}
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

                            {/* Resolução em Vídeo */}
                            {questaoDetail.link_video && (
                                <div style={{ background: `${tokens.rausch}08`, borderRadius: 16, padding: 20, border: `1px dashed ${tokens.rausch}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                        <div>
                                            <h6 style={{ fontWeight: 800, fontSize: 13, color: tokens.rausch, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Icon icon="solar:videocamera-record-bold-duotone" />
                                                Resolução em Vídeo Disponível!
                                            </h6>
                                            <p style={{ fontSize: 11, color: tokens.foggy, margin: 0 }}>
                                                Assista à explicação detalhada desta questão explicada passo a passo.
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
                <CModalFooter style={{ borderTop: `1px solid ${tokens.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <CButton
                        onClick={() => {
                            setDuvidaMessage(null)
                            setTextoDuvida('')
                            setMarcadaConfusa(false)
                            setDuvidaModalOpen(true)
                        }}
                        style={{
                            background: tokens.rausch,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            padding: '8px 16px',
                            fontWeight: 700,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 4px 10px rgba(255, 56, 92, 0.15)',
                            fontFamily: "'Circular Std', 'Nunito', sans-serif"
                        }}
                    >
                        <Icon icon="solar:chat-round-plus-bold" width="16" /> Mande sua Dúvida
                    </CButton>
                    <CButton 
                        color="secondary" 
                        onClick={() => setModalOpen(false)}
                        style={{ borderRadius: 10, fontWeight: 700, fontSize: 12, fontFamily: "'Circular Std', 'Nunito', sans-serif" }}
                    >
                        Fechar Revisão
                    </CButton>
                </CModalFooter>
                </div>
            </CModal>

            {/* MODAL DE SUBMISSÃO DE DÚVIDA INTEGRADA (HELPDESK) */}
            <CModal
                visible={duvidaModalOpen}
                onClose={() => setDuvidaModalOpen(false)}
                size="md"
                backdrop="static"
            >
                <div style={{ fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
                    <CModalHeader closeButton style={{ borderBottom: `1px solid ${tokens.border}` }}>
                        <CModalTitle style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                            Mande sua Dúvida — Questão #{selectedQuestaoId}
                        </CModalTitle>
                    </CModalHeader>
                    <form onSubmit={handleSubmitDuvida}>
                    <CModalBody style={{ background: 'var(--color-bg-primary)' }}>
                        {duvidaMessage && (
                            <CAlert color={duvidaMessage.tipo} className="mb-4" style={{ borderRadius: 12, fontSize: 12, fontWeight: 650 }}>
                                {duvidaMessage.texto}
                            </CAlert>
                        )}

                        <div className="mb-4">
                            <CFormLabel style={{ fontSize: 12, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase' }}>
                                Explique o que não ficou claro ou qual a sua dúvida:
                            </CFormLabel>
                            <CFormTextarea
                                rows={4}
                                placeholder="Digite aqui sua dúvida com riqueza de detalhes..."
                                value={textoDuvida}
                                onChange={e => setTextoDuvida(e.target.value)}
                                required
                                style={{
                                    borderRadius: 14,
                                    border: `1px solid ${tokens.border}`,
                                    background: tokens.bg,
                                    color: 'var(--color-text-primary)',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    padding: '12px 14px',
                                    outline: 'none',
                                    fontFamily: "'Circular Std', 'Nunito', sans-serif"
                                }}
                            />
                        </div>

                        <div style={{
                            background: `${tokens.rausch}05`,
                            border: `1px dashed ${tokens.rausch}30`,
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 4
                        }}>
                            <CFormCheck
                                id="marcadaConfusa"
                                label="Marcar esta questão como CONFUSA"
                                checked={marcadaConfusa}
                                onChange={e => setMarcadaConfusa(e.target.checked)}
                                style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)', cursor: 'pointer' }}
                            />
                            <div style={{ fontSize: 11, color: tokens.foggy, marginTop: 4, marginLeft: 24 }}>
                                Se você acha que o enunciado, gabarito ou as alternativas estão incorretos ou confusos.
                            </div>
                        </div>
                    </CModalBody>
                    <CModalFooter style={{ borderTop: `1px solid ${tokens.border}` }}>
                        <CButton
                            color="secondary"
                            onClick={() => setDuvidaModalOpen(false)}
                            style={{ borderRadius: 10, fontWeight: 700, fontSize: 12, fontFamily: "'Circular Std', 'Nunito', sans-serif" }}
                            disabled={submittingDuvida}
                        >
                            Cancelar
                        </CButton>
                        <CButton
                            type="submit"
                            style={{
                                background: tokens.rausch, color: '#fff', border: 'none',
                                borderRadius: 10, fontWeight: 700, fontSize: 12,
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontFamily: "'Circular Std', 'Nunito', sans-serif"
                            }}
                            disabled={submittingDuvida}
                        >
                            {submittingDuvida ? <CSpinner size="sm" /> : 'Enviar Pergunta 🚀'}
                        </CButton>
                    </CModalFooter>
                </form>
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
                                    Nenhum log registrado ainda.<br/>Abra a revisão e clique no botão de dúvida para testar.
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

export default MinhasQuestoes