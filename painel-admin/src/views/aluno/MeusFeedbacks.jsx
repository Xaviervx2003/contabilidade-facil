import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import {
    CSpinner,
    CAlert,
} from '@coreui/react'
import { API_URL } from '../../config'

const FAQItem = ({ item, isOpen, onToggle, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`mb-4 rounded-2xl border overflow-hidden transition-all duration-300 ${
                isOpen ? 'border-primary shadow-[0_0_20px_rgba(222,219,200,0.1)] bg-[#151515]' : 'border-white/5 bg-[#101010] hover:border-white/20'
            }`}
        >
            <div
                className="p-4 md:p-5 cursor-pointer flex justify-between items-start gap-4"
                onClick={onToggle}
            >
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase tracking-widest text-primary/60 font-light">
                            {new Date(item.data).toLocaleDateString('pt-BR')}
                        </span>
                        {item.resolvido ? (
                            <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[9px] font-bold uppercase tracking-wider">Resolvido</span>
                        ) : (
                            <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[9px] font-bold uppercase tracking-wider">Pendente</span>
                        )}
                    </div>
                    <h4 className="text-primary text-sm md:text-base font-medium leading-snug mb-1">
                        {item.enunciado}
                    </h4>
                    <p className="text-white/40 text-xs md:text-sm font-light italic">
                        "{(item.texto || 'Sem descrição').substring(0, 100)}..."
                    </p>
                </div>
                <div className={`mt-1 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-white/20'}`}>
                    <Icon icon="solar:alt-arrow-down-linear" width="24" />
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className="px-5 pb-5 pt-2 border-t border-white/5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <div>
                                    <div className="text-primary/40 text-[10px] uppercase tracking-widest mb-2 font-semibold">Minha Dúvida</div>
                                    <div className="text-white/80 text-sm leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5 italic">
                                        {item.texto || 'Nenhuma descrição detalhada enviada.'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-primary text-[10px] uppercase tracking-widest mb-2 font-bold">Resposta do Professor</div>
                                    <div className="text-primary/90 text-sm leading-relaxed bg-primary/5 p-4 rounded-xl border border-primary/20">
                                        {item.resposta_professor ? (
                                            item.resposta_professor
                                        ) : (
                                            <span className="text-white/20 italic font-light">
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
    const [feedbacks, setFeedbacks] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [expandedId, setExpandedId] = useState(null)
    const nome = sessionStorage.getItem('nome')

    useEffect(() => {
        if (!nome) return
        setLoading(true)
        // Buscamos todos os feedbacks para permitir filtro local (FAQ Style)
        fetch(`${API_URL}/api/aluno/meus-feedbacks/${encodeURIComponent(nome)}?por_pagina=100`)
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
        <div className="min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-black p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-10 text-center md:text-left">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <h2 className="text-primary text-3xl md:text-4xl font-normal tracking-tight mb-2">
                            Central de Suporte <span className="font-serif italic">& Dúvidas</span>
                        </h2>
                        <p className="text-white/40 font-light text-sm md:text-base">
                            Consulte suas dúvidas anteriores e veja as explicações dos professores.
                        </p>
                    </motion.div>
                </div>

                {/* Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative mb-12"
                >
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/30">
                        <Icon icon="solar:magnifer-linear" width="20" />
                    </div>
                    <input
                        type="text"
                        placeholder="Pesquisar em suas dúvidas ou questões..."
                        className="w-full bg-[#101010] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm md:text-base text-primary focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/20 shadow-2xl"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button 
                            onClick={() => setSearch('')}
                            className="absolute inset-y-0 right-4 border-0 bg-transparent text-white/20 hover:text-white transition-colors"
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
                            <span className="text-primary/60 text-xs tracking-widest uppercase">Carregando histórico...</span>
                        </div>
                    ) : filteredFeedbacks.length === 0 ? (
                        <div className="text-center py-20 bg-[#101010] rounded-3xl border border-white/5">
                            <Icon icon="solar:notes-minimalistic-linear" width="48" className="text-white/10 mb-4 mx-auto" />
                            <p className="text-white/40 font-light">Nenhuma dúvida encontrada para sua busca.</p>
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