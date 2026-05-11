import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Icon } from '@iconify/react'
import {
    CSpinner,
    CAlert,
} from '@coreui/react'
import { API_URL } from '../../config'

const FAQItem = ({ item, isOpen, onToggle, index }) => {
    const shouldReduceMotion = useReducedMotion()
    
    return (
        <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: shouldReduceMotion ? 0 : index * 0.05 }}
            className={`mb-4 rounded-2xl border overflow-hidden transition-colors duration-300 ${
                isOpen ? 'border-primary shadow-soft bg-bg-secondary' : 'border-border bg-bg-elevated hover:border-border/80'
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
                        <span className="text-[10px] uppercase tracking-widest text-text-muted font-light">
                            {new Date(item.data).toLocaleDateString('pt-BR')}
                        </span>
                        {item.resolvido ? (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--color-successBg)] text-[var(--color-success)] text-[9px] font-bold uppercase tracking-wider">Resolvido</span>
                        ) : (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--color-warningBg)] text-[var(--color-warning)] text-[9px] font-bold uppercase tracking-wider">Pendente</span>
                        )}
                    </div>
                    <h4 className="text-text-primary text-sm md:text-base font-medium leading-snug mb-1">
                        {item.enunciado}
                    </h4>
                    <p className="text-text-secondary text-xs md:text-sm font-light italic">
                        "{(item.texto || 'Sem descrição').substring(0, 100)}..."
                    </p>
                </div>
                <div className={`mt-1 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-text-muted'}`}>
                    <Icon icon="solar:alt-arrow-down-linear" width="24" />
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
                        <div className="px-5 pb-5 pt-2 border-t border-divider">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <div>
                                    <div className="text-text-tertiary text-[10px] uppercase tracking-widest mb-2 font-semibold">Minha Dúvida</div>
                                    <div className="text-text-secondary text-sm leading-relaxed bg-bg-tertiary p-4 rounded-xl border border-divider italic">
                                        {item.texto || 'Nenhuma descrição detalhada enviada.'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-primary text-[10px] uppercase tracking-widest mb-2 font-bold">Resposta do Professor</div>
                                    <div className="text-text-primary text-sm leading-relaxed bg-bg-secondary p-4 rounded-xl border border-border">
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
    const [feedbacks, setFeedbacks] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [expandedId, setExpandedId] = useState(null)
    const nome = sessionStorage.getItem('nome')

    useEffect(() => {
        if (!nome) return
        setLoading(true)
        // Buscamos todos os feedbacks para permitir filtro local (FAQ Style)
        fetch(`${API_URL}/api/aluno/meus-feedbacks/${encodeURIComponent(nome)}?por_pagina=50`)
            .then(res => res.json())
            .then(data => {
                setFeedbacks(data.feedbacks || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [nome])

    const filteredFeedbacks = useMemo(() => {
        if (!search) return feedbacks
        const s = search.toLowerCase()
        return feedbacks.filter(f => 
            (f.enunciado && f.enunciado.toLowerCase().includes(s)) || 
            (f.texto && f.texto.toLowerCase().includes(s))
        )
    }, [search, feedbacks])

    if (!nome) return <CAlert color="warning">Faça login para ver seus feedbacks.</CAlert>

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary font-sans p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-10 text-center md:text-left">
                    <motion.div
                        initial={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h2 className="text-primary text-3xl md:text-4xl font-normal tracking-tight mb-2">
                            Central de Suporte <span className="font-serif italic">& Dúvidas</span>
                        </h2>
                        <p className="text-text-secondary font-light text-sm md:text-base">
                            Consulte suas dúvidas anteriores e veja as explicações dos professores.
                        </p>
                    </motion.div>
                </div>

                {/* Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: shouldReduceMotion ? 0 : 0.2 }}
                    className="relative mb-12"
                >
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-text-muted">
                        <Icon icon="solar:magnifer-linear" width="20" />
                    </div>
                    <input
                        type="text"
                        placeholder="Pesquisar em suas dúvidas ou questões..."
                        aria-label="Pesquisar em suas dúvidas"
                        autoComplete="off"
                        className="w-full bg-bg-elevated border border-border rounded-2xl py-4 pl-12 pr-4 text-sm md:text-base text-text-primary focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button 
                            onClick={() => setSearch('')}
                            className="absolute inset-y-0 right-4 border-0 bg-transparent text-text-muted hover:text-text-primary transition-colors"
                        >
                            <Icon icon="solar:close-circle-linear" width="20" />
                        </button>
                    )}
                </motion.div>

                {/* FAQ List */}
                <div className="relative">
                    <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none" />
                    
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <CSpinner color="primary" />
                            <span className="text-text-muted text-xs tracking-widest uppercase">Carregando histórico...</span>
                        </div>
                    ) : filteredFeedbacks.length === 0 ? (
                        <div className="text-center py-20 bg-bg-elevated rounded-3xl border border-border">
                            <Icon icon="solar:notes-minimalistic-linear" width="48" className="text-text-muted mb-4 mx-auto" />
                            <p className="text-text-secondary font-light">Nenhuma dúvida encontrada para sua busca.</p>
                        </div>
                    ) : (
                        filteredFeedbacks.map((item, idx) => (
                            <FAQItem
                                key={item.id}
                                item={item}
                                index={idx}
                                isOpen={expandedId === item.id}
                                onToggle={() => setExpandedId(prev => prev === item.id ? null : item.id)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default MeusFeedbacks