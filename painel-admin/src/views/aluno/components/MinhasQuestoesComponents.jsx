import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { CRow, CCol, CButton } from '@coreui/react';
import { tokens } from '../../../tokens';

export const Skeleton = ({ h = 20, w = '100%', radius = 12, className = '' }) => (
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

export const FeedbackSkeleton = () => (
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
export const StatCard = ({ icon, label, value, color }) => (
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
export const FAQItem = ({ item, isOpen, onToggle, index, onRevisarQuestao }) => {
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

