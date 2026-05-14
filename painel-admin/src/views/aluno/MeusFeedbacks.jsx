import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Icon } from '@iconify/react'
import {
    CSpinner,
    CAlert,
    CRow,
    CCol,
} from '@coreui/react'
import { API_URL } from '../../config'
import { useQuery } from '@tanstack/react-query'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

// ── Helpers & Components ─────────────────────────────────────────────

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
    <div className="mb-4 p-5 rounded-2xl border border-border bg-bg-elevated/50">
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

const StatCard = ({ icon, label, value, colorClass = 'text-primary' }) => (
    <div className="premium-card p-4 flex items-center gap-4 flex-1 min-w-[160px]">
        <div className={`w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center ${colorClass}`}>
            <Icon icon={icon} width="24" />
        </div>
        <div>
            <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold leading-none mb-1">{label}</div>
            <div className="text-xl font-bold leading-none">{value}</div>
        </div>
    </div>
)

const FAQItem = ({ item, isOpen, onToggle, index }) => {
    const shouldReduceMotion = useReducedMotion()
    
    return (
        <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: shouldReduceMotion ? 0 : index * 0.05 }}
            className={`mb-4 rounded-2xl border overflow-hidden transition-all duration-300 quiz-glass-card ${
                isOpen ? 'border-primary shadow-lg' : 'border-border hover:border-primary/30'
            }`}
        >
            <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onToggle()
                    }
                }}
                className="p-4 md:p-5 cursor-pointer flex justify-between items-start gap-4"
                onClick={onToggle}
            >
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                            {new Date(item.data).toLocaleDateString('pt-BR')}
                        </span>
                        {item.resolvido ? (
                            <span className="px-2 py-0.5 rounded-lg bg-green-500/10 text-green-500 text-[9px] font-bold uppercase tracking-wider border border-green-500/20">Resolvido</span>
                        ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-500 text-[9px] font-bold uppercase tracking-wider border border-orange-500/20">Pendente</span>
                        )}
                    </div>
                    <h4 className="text-text-primary text-sm md:text-base font-semibold leading-snug mb-1">
                        {item.enunciado}
                    </h4>
                    <p className="text-text-secondary text-xs md:text-sm font-medium opacity-70">
                        "{(item.texto || 'Sem descrição').substring(0, 100)}..."
                    </p>
                </div>
                <div className={`mt-1 w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center transition-all duration-300 ${isOpen ? 'rotate-180 text-primary bg-primary/10 shadow-inner' : 'text-text-muted'}`}>
                    <Icon icon="solar:alt-arrow-down-linear" width="20" />
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: 'easeInOut' }}
                    >
                        <div className="px-5 pb-5 pt-2 border-t border-divider/50 bg-bg-secondary/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <div>
                                    <div className="text-text-tertiary text-[10px] uppercase tracking-widest mb-3 font-bold opacity-60">Minha Dúvida</div>
                                    <div className="text-text-secondary text-sm leading-relaxed bg-bg-elevated/50 p-4 rounded-xl border border-divider/50 italic shadow-sm">
                                        {item.texto || 'Nenhuma descrição detalhada enviada.'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-primary text-[10px] uppercase tracking-widest mb-3 font-bold">Resposta do Professor</div>
                                    <div className="text-text-primary text-sm leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/10 shadow-sm backdrop-blur-sm">
                                        {item.resposta_professor ? (
                                            item.resposta_professor
                                        ) : (
                                            <span className="text-text-muted italic font-light">
                                                Aguardando resposta do professor. Você será notificado assim que for respondido.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

const MeusFeedbacks = () => {
    const shouldReduceMotion = useReducedMotion()
    const [search, setSearch] = useState('')
    const [expandedId, setExpandedId] = useState(null)
    const nome = sessionStorage.getItem('nome')

    const { data: feedbacks = [], isLoading: loading } = useQuery({
        queryKey: ['meusFeedbacks', nome],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/aluno/meus-feedbacks/${encodeURIComponent(nome)}?por_pagina=100`)
            if (!res.ok) throw new Error('Erro ao carregar feedbacks')
            const data = await res.json()
            return data.feedbacks || []
        },
        enabled: !!nome,
    })

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
            (f.texto && f.texto.toLowerCase().includes(s))
        )
    }, [search, feedbacks])

    if (!nome) return (
        <div className="min-h-screen bg-bg-primary p-8 flex items-center justify-center">
            <CAlert color="warning" className="max-w-md w-full premium-card border-orange-500/20">
                <div className="flex items-center gap-3">
                    <Icon icon="solar:user-block-linear" width="24" className="text-orange-500" />
                    <span>Faça login para ver seu histórico de feedbacks.</span>
                </div>
            </CAlert>
        </div>
    )

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary font-sans p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex-1"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest mb-3">
                            <Icon icon="solar:chat-round-check-bold" width="14" />
                            Central de Atendimento
                        </div>
                        <h2 className="text-text-primary text-3xl md:text-5xl font-normal tracking-tight mb-2">
                            Suporte <span className="font-serif italic text-primary">& Feedbacks</span>
                        </h2>
                        <p className="text-text-secondary font-medium text-sm md:text-base opacity-70">
                            Consulte suas dúvidas anteriores e acompanhe as explicações dos nossos especialistas.
                        </p>
                    </motion.div>

                    <div className="flex flex-wrap gap-3 w-full lg:w-auto pb-1">
                        <StatCard icon="solar:document-text-linear" label="Total" value={stats.total} />
                        <StatCard icon="solar:check-circle-linear" label="Resolvidos" value={stats.resolvidos} colorClass="text-green-500" />
                        <StatCard icon="solar:clock-circle-linear" label="Pendentes" value={stats.pendentes} colorClass="text-orange-500" />
                    </div>
                </div>

                {/* Search Bar Premium */}
                <motion.div
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: shouldReduceMotion ? 0 : 0.2 }}
                    className="relative mb-12"
                >
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-text-muted">
                        <Icon icon="solar:magnifer-linear" width="22" />
                    </div>
                    <input
                        type="text"
                        placeholder="Pesquisar em suas dúvidas ou questões..."
                        aria-label="Pesquisar em suas dúvidas"
                        autoComplete="off"
                        className="w-full bg-bg-elevated/50 backdrop-blur-md border border-border rounded-2xl py-5 pl-14 pr-12 text-sm md:text-base text-text-primary focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-text-muted/60 shadow-lg shadow-black/5"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button 
                            onClick={() => setSearch('')}
                            className="absolute inset-y-0 right-5 border-0 bg-transparent text-text-muted hover:text-primary transition-colors"
                        >
                            <Icon icon="solar:close-circle-bold" width="22" />
                        </button>
                    )}
                </motion.div>

                {/* Feedback List */}
                <div className="relative">
                    {loading ? (
                        <div className="grid grid-cols-1 gap-1">
                            {[...Array(5)].map((_, i) => <FeedbackSkeleton key={i} />)}
                        </div>
                    ) : filteredFeedbacks.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-20 bg-bg-elevated/50 backdrop-blur-sm rounded-3xl border border-border border-dashed"
                        >
                            <div className="w-48 h-48 mx-auto mb-6 opacity-80">
                                <DotLottieReact
                                    src="https://lottie.host/805626a5-3f33-4f9e-a89c-a1f73b64f3d1/9XvGjZ6zQ6.lottie"
                                    loop
                                    autoplay
                                />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Nada por aqui ainda</h3>
                            <p className="text-text-secondary font-medium opacity-60 max-w-sm mx-auto">
                                {search 
                                    ? `Não encontramos resultados para "${search}". Tente outros termos.` 
                                    : "Você ainda não enviou nenhuma dúvida. Quando precisar de ajuda, conte conosco!"}
                            </p>
                            {search && (
                                <button 
                                    onClick={() => setSearch('')}
                                    className="mt-6 text-primary font-bold hover:underline"
                                >
                                    Limpar busca
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 gap-1">
                            {filteredFeedbacks.map((item, idx) => (
                                <FAQItem
                                    key={item.id}
                                    item={item}
                                    index={idx}
                                    isOpen={expandedId === item.id}
                                    onToggle={() => setExpandedId(prev => prev === item.id ? null : item.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Footer Insight */}
                <div className="mt-20 text-center border-t border-divider pt-10 pb-20">
                    <div className="inline-flex items-center gap-2 text-text-muted text-xs tracking-widest uppercase font-bold opacity-40">
                        <Icon icon="solar:shield-check-linear" width="16" />
                        Área Segura & Monitorada
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MeusFeedbacks