import React, { useEffect, useState, useCallback } from 'react'
import { CAlert, CSpinner, CContainer } from '@coreui/react'
import { API_URL } from '../../config'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'

/* ── Tokens de cor (inspirado Airbnb + Duolingo) ──────────── */
const T = {
    coral: '#FF385C',
    teal: '#00A699',
    orange: '#FC642D',
    gold: '#F5A623',
    muted: '#767676',
    border: 'var(--color-border)',
    bg: 'var(--color-bg-elevated)',
    bgSub: 'var(--color-bg-tertiary)',
    text: 'var(--color-text-primary)',
}

/* ── Helpers ─────────────────────────────────────────────── */
const METRICA_CONFIG = {
    manual: { icon: '✋', label: 'Manual', color: T.muted },
    sessoes: { icon: '📚', label: 'Sessões', color: T.teal },
    media_acerto: { icon: '🎯', label: 'Média de Acertos', color: T.orange },
    questoes: { icon: '📝', label: 'Questões', color: '#8B5CF6' },
}

const calcularPrazo = (data_limite) => {
    if (!data_limite) return null
    const diff = Math.ceil((new Date(data_limite + 'T23:59:59') - new Date()) / 86400000)
    if (diff < 0) return { texto: 'Expirou', cor: '#ef4444', urgente: true }
    if (diff === 0) return { texto: 'Vence hoje!', cor: '#f59e0b', urgente: true }
    if (diff === 1) return { texto: 'Vence amanhã', cor: '#f59e0b', urgente: true }
    if (diff <= 3) return { texto: `${diff} dias`, cor: '#f59e0b', urgente: false }
    return { texto: `${diff} dias`, cor: T.teal, urgente: false }
}

/* ── Circular Progress Ring ──────────────────────────────── */
const RingProgress = ({ value, size = 64, stroke = 5, color = T.coral }) => {
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const pct = Math.min(Math.max(value, 0), 100)
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-bg-tertiary)" strokeWidth={stroke} />
            <motion.circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={c}
                initial={{ strokeDashoffset: c }}
                animate={{ strokeDashoffset: c - (pct / 100) * c }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
            />
        </svg>
    )
}

/* ── Badge de Prazo ──────────────────────────────────────── */
const PrazoBadge = ({ data_limite }) => {
    const info = calcularPrazo(data_limite)
    if (!info) return null
    return (
        <motion.span
            animate={info.urgente ? { scale: [1, 1.06, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.8 }}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 700,
                background: `${info.cor}18`, color: info.cor,
                padding: '3px 10px', borderRadius: 99,
                border: `1px solid ${info.cor}35`,
            }}
        >
            <Icon icon="solar:clock-circle-bold-duotone" width="12" />
            {info.texto}
        </motion.span>
    )
}

/* ── Missão Card ─────────────────────────────────────────── */
const MissaoCard = ({ m, onConcluir, concluindo }) => {
    const cfg = METRICA_CONFIG[m.metrica_tipo] || METRICA_CONFIG.manual
    const isAuto = m.metrica_tipo !== 'manual'
    const pct = m.progresso ?? 0
    const isConcluida = m.status === 'concluida'
    const isExpirada = m.status === 'expirada'
    const borderColor = isConcluida ? T.teal : isExpirada ? '#ef4444' : T.border
    const accentColor = isConcluida ? T.teal : isExpirada ? '#ef4444' : (m.cor || T.coral)

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            layout
            style={{
                background: T.bg,
                border: `1px solid ${borderColor}`,
                borderRadius: 18,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                opacity: isExpirada ? 0.75 : 1,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Faixa colorida lateral */}
            <div style={{
                position: 'absolute', left: 0, top: 12, bottom: 12,
                width: 4, borderRadius: '0 4px 4px 0',
                background: accentColor,
            }} />

            {/* Ring de Progresso */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <RingProgress value={pct} size={60} stroke={5} color={accentColor} />
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isConcluida ? 18 : 14,
                    fontWeight: 800,
                    color: accentColor,
                }}>
                    {isConcluida ? '✓' : isExpirada ? '✕' : `${pct}%`}
                </div>
            </div>

            {/* Conteúdo Central */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{m.icone || '🎯'}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{m.titulo}</span>

                    {isConcluida && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: `${T.teal}15`, color: T.teal, padding: '2px 8px', borderRadius: 99 }}>
                            ✅ Concluída
                        </span>
                    )}
                    {isExpirada && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: '#ef444415', color: '#ef4444', padding: '2px 8px', borderRadius: 99 }}>
                            ⏰ Expirada
                        </span>
                    )}
                    {!isConcluida && <PrazoBadge data_limite={m.data_limite} />}
                </div>

                <p style={{ fontSize: 12, color: T.muted, margin: '0 0 8px', lineHeight: 1.4 }}>
                    {m.descricao}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{
                        fontSize: 11, fontWeight: 600,
                        background: `${cfg.color}12`, color: cfg.color,
                        padding: '2px 8px', borderRadius: 99,
                    }}>
                        {cfg.icon} {cfg.label}
                        {m.metrica_alvo != null && ` → ${m.metrica_alvo}${m.metrica_tipo === 'media_acerto' ? '%' : ''}`}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.coral }}>+{m.xp} XP</span>
                </div>

                {!isConcluida && !isExpirada && isAuto && (
                    <div style={{ marginTop: 8 }}>
                        <div style={{ height: 4, background: 'var(--color-bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                                style={{ height: '100%', background: accentColor, borderRadius: 99 }}
                            />
                        </div>
                        <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>
                            {m.metrica_tipo === 'sessoes' && `${Math.round((pct / 100) * m.metrica_alvo)} de ${m.metrica_alvo} sessões`}
                            {m.metrica_tipo === 'media_acerto' && `Média atual: ${Math.round((pct / 100) * m.metrica_alvo)}% de ${m.metrica_alvo}%`}
                            {m.metrica_tipo === 'questoes' && `${Math.round((pct / 100) * m.metrica_alvo)} de ${m.metrica_alvo} questões`}
                        </div>
                    </div>
                )}
            </div>

            {/* Botão de ação */}
            <div style={{ flexShrink: 0 }}>
                {!isConcluida && !isExpirada && !isAuto && (
                    <motion.button
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        onClick={() => onConcluir(m.id)}
                        disabled={concluindo === m.id}
                        style={{
                            background: T.coral, color: '#fff', border: 'none',
                            borderRadius: 12, padding: '9px 16px',
                            fontWeight: 700, fontSize: 12, cursor: 'pointer',
                            fontFamily: 'inherit', minWidth: 90,
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        {concluindo === m.id
                            ? <CSpinner size="sm" style={{ borderColor: '#fff', borderRightColor: 'transparent' }} />
                            : <><Icon icon="solar:check-circle-bold-duotone" width="16" /> Concluir</>
                        }
                    </motion.button>
                )}
                {isAuto && !isConcluida && !isExpirada && (
                    <div style={{ textAlign: 'center', width: 80 }}>
                        <Icon icon="solar:refresh-bold-duotone" width="20" style={{ color: T.muted, opacity: 0.5 }} />
                        <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>Auto</div>
                    </div>
                )}
                {isConcluida && (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${T.teal}15`, color: T.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="solar:verified-check-bold-duotone" width="22" />
                    </div>
                )}
                {isExpirada && (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ef444415', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="solar:close-circle-bold-duotone" width="22" />
                    </div>
                )}
            </div>
        </motion.div>
    )
}

/* ── Componente Principal ─────────────────────────────────── */
const MeuRiscoPlano = () => {
    const [missoes, setMissoes] = useState([])
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState('')
    const [concluindo, setConcluindo] = useState(null)
    const [toast, setToast] = useState(null)

    const matricula = sessionStorage.getItem('matricula')

    const fetchMissoes = useCallback(async () => {
        setLoading(true)
        try {
            const token = sessionStorage.getItem('token')
            const url = matricula 
                ? `${API_URL}/api/missoes/globais/${matricula}`
                : `${API_URL}/api/missoes/globais`

            const r = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (!r.ok) throw new Error()
            setMissoes(await r.json())
        } catch {
            setErro('Erro ao carregar missões. Tente recarregar a página.')
        } finally {
            setLoading(false)
        }
    }, [matricula])

    useEffect(() => { fetchMissoes() }, [fetchMissoes])

    const handleConcluir = async (missaoId) => {
        setConcluindo(missaoId)
        try {
            const r = await fetch(`${API_URL}/api/missoes/concluir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matricula, missao_id: missaoId }),
            })
            if (!r.ok) throw new Error((await r.json()).detail || 'Erro')
            setToast({ tipo: 'success', msg: '🎉 Missão concluída! XP adicionado!' })
            fetchMissoes()
        } catch (e) {
            setToast({ tipo: 'error', msg: e.message })
        } finally {
            setConcluindo(null)
            setTimeout(() => setToast(null), 3500)
        }
    }

    const pendentes = missoes.filter(m => m.status === 'pendente')
    const concluidas = missoes.filter(m => m.status === 'concluida')
    const expiradas = missoes.filter(m => m.status === 'expirada')

    return (
        <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', fontFamily: "'Nunito', sans-serif" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');`}</style>

            <CContainer fluid className="px-3 px-md-5" style={{ paddingTop: 32 }}>
                {/* Toast */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20 }}
                            style={{
                                position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
                                background: toast.tipo === 'success' ? T.teal : '#ef4444',
                                color: '#fff', borderRadius: 16, padding: '14px 20px',
                                fontWeight: 700, fontSize: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                display: 'flex', alignItems: 'center', gap: 10, maxWidth: 340,
                            }}
                        >
                            <Icon icon={toast.tipo === 'success' ? 'solar:star-bold-duotone' : 'solar:danger-bold-duotone'} width="22" />
                            {toast.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={{ maxWidth: 960, margin: '0 auto' }}>

                    {/* HEADER PREMIUM IDENTICO AO PAINEL / TRILHAS */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ marginBottom: 32 }}
                    >
                        <div style={{ color: T.coral, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Missões e Gamificação</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>Meus Desafios 🎯</div>
                        <div style={{ fontSize: 14, color: T.muted, marginTop: 6 }}>Complete missões para ganhar XP e subir no ranking.</div>
                    </motion.div>

                    {/* Erro */}
                    {erro && (
                        <CAlert color="danger" style={{ borderRadius: 14, marginBottom: 20 }}>
                            {erro}
                        </CAlert>
                    )}

                    {/* Loading */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                            <CSpinner color="primary" />
                            <div style={{ color: T.muted, fontSize: 13, marginTop: 12 }}>Carregando seus desafios...</div>
                        </div>
                    ) : missoes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                            <Icon icon="solar:ghost-bold-duotone" width="56" style={{ color: T.muted, opacity: 0.3 }} />
                            <div style={{ color: T.muted, fontSize: 15, marginTop: 12 }}>Nenhum desafio disponível no momento.</div>
                        </div>
                    ) : (
                        <>
                            {/* ── Pendentes ── */}
                            {pendentes.length > 0 && (
                                <section style={{ marginBottom: 32 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                        <Icon icon="solar:fire-bold-duotone" style={{ color: T.coral }} width="20" />
                                        <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Em Andamento</span>
                                        <span style={{ fontSize: 12, background: `${T.coral}12`, color: T.coral, padding: '2px 10px', borderRadius: 99, fontWeight: 700 }}>{pendentes.length}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <AnimatePresence>
                                            {pendentes.map(m => (
                                                <MissaoCard key={m.id} m={m} onConcluir={handleConcluir} concluindo={concluindo} />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </section>
                            )}

                            {/* ── Concluídas ── */}
                            {concluidas.length > 0 && (
                                <section style={{ marginBottom: 32 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                        <Icon icon="solar:verified-check-bold-duotone" style={{ color: T.teal }} width="20" />
                                        <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>Concluídas</span>
                                        <span style={{ fontSize: 12, background: `${T.teal}12`, color: T.teal, padding: '2px 10px', borderRadius: 99, fontWeight: 700 }}>{concluidas.length}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {concluidas.map(m => (
                                            <MissaoCard key={m.id} m={m} onConcluir={handleConcluir} concluindo={concluindo} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── Expiradas ── */}
                            {expiradas.length > 0 && (
                                <section style={{ marginBottom: 32 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                        <Icon icon="solar:clock-circle-bold-duotone" style={{ color: '#ef4444' }} width="20" />
                                        <span style={{ fontWeight: 700, fontSize: 15, color: '#ef4444' }}>Expiradas</span>
                                        <span style={{ fontSize: 12, background: '#ef444412', color: '#ef4444', padding: '2px 10px', borderRadius: 99, fontWeight: 700 }}>{expiradas.length}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {expiradas.map(m => (
                                            <MissaoCard key={m.id} m={m} onConcluir={handleConcluir} concluindo={concluindo} />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </CContainer>
        </div>
    )
}

export default MeuRiscoPlano