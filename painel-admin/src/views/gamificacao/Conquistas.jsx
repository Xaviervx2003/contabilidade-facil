import React, { useState, useEffect } from 'react'
import {
    CContainer,
    CRow,
    CCol,
    CAlert,
    CSpinner,
} from '@coreui/react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { getAlunoMatricula } from '../../utils/auth'
import { API_URL } from '../../config'
import api from '../../services/api'
import { formatIsoToDateString, formatIsoToShortDate } from '../../utils/formatDate'
import { buildTokens } from '../../tokens'
import { useTheme } from '../../context/themeContext'
const MEDAL_COLORS = {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    platinum: '#E5E4E2'
}

/* ─── Section Card ───────────────────────────────────────── */
const SCard = ({ children, style = {}, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 20,
            padding: '24px',
            height: '100%',
            ...style,
        }}
    >
        {children}
    </motion.div>
)

/* ─── Progress Bar ───────────────────────────────────────── */
const AirbnbProgress = ({ value, color }) => (
    <div style={{ height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            style={{ height: '100%', background: color, borderRadius: 99 }}
        />
    </div>
)

const Conquistas = ({ isTab = false }) => {
    const [conquistas, setConquistas] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { currentPalette } = useTheme()
    const tk = buildTokens(currentPalette)

    useEffect(() => {
        const carregarConquistas = async () => {
            try {
                const matricula = getAlunoMatricula()

                if (!matricula) {
                    setError('Esta area e exclusiva para alunos com matricula ativa.')
                    setLoading(false)
                    return
                }

                const url = `/api/aluno/conquistas/${matricula}`
                
                const res = await api.get(url)
                setConquistas(res.data)
                setError(null)
            } catch (err) {
                console.error('❌ Erro ao carregar conquistas:', err)
                setError(`Erro ao carregar conquistas: ${err.message}`)
            } finally {
                setLoading(false)
            }
        }

        carregarConquistas()
    }, [])

    if (loading) {
        return (
            <CContainer className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <div className="text-center">
                    <CSpinner color="primary" />
                    <p className="mt-3 text-body-secondary">Carregando suas conquistas...</p>
                </div>
            </CContainer>
        )
    }

    const renderAlert = (color, icon, title, desc) => (
        <div className={`my-4`}>
            <CAlert color={color} className="d-flex align-items-center gap-2">
                <span className="fs-5">{icon}</span>
                <span>{title}</span>
            </CAlert>
            {desc && <CAlert color="info">{desc}</CAlert>}
        </div>
    )

    if (error) return renderAlert('danger', '⚠️', error)
    if (!conquistas) return renderAlert('warning', '⚡', 'Nenhuma conquista encontrada.')

    const { streak, medalhas, total_questoes_respondidas, total_sessoes, tempo_estudo_total_minutos } = conquistas

    const getMedalColor = (tipo) => {
        switch (tipo) {
            case 'ouro': return MEDAL_COLORS.gold;
            case 'prata': return MEDAL_COLORS.silver;
            case 'bronze': return MEDAL_COLORS.bronze;
            case 'platina': return tk.babu;
            default: return tk.arches;
        }
    }

    const getMedalIcon = (tipo) => {
        switch (tipo) {
            case 'ouro': return 'solar:medal-star-bold-duotone';
            case 'prata': return 'solar:medal-ribbon-bold-duotone';
            case 'bronze': return 'solar:medal-ribbon-star-bold-duotone';
            case 'platina': return 'solar:crown-star-bold-duotone';
            default: return 'solar:star-fall-bold-duotone';
        }
    }

    const innerContent = (
        <div style={{ paddingTop: isTab ? 0 : 20 }}>
            {!isTab && (
                <div style={{ marginBottom: 30 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)' }}>🏆 Minhas Conquistas</h1>
                    <p style={{ color: tk.foggy, fontSize: 16 }}>Acompanhe seu progresso e desbloqueie novas medalhas</p>
                </div>
            )}

            <CRow className="g-3 mb-4">
                {/* Streak Card */}
                <CCol md={6}>
                    <SCard delay={0.1}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                background: `${tk.arches}15`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: tk.arches,
                            }}>
                                <Icon icon="solar:fire-bold-duotone" width="28" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>Seu Streak Atual</h2>
                                <span style={{ fontSize: 12, color: tk.foggy }}>Dias consecutivos de estudo</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
                            <span style={{ fontSize: 48, fontWeight: 800, color: tk.arches, lineHeight: 1 }}>{streak?.dias_atuais || 0}</span>
                            <span style={{ fontSize: 16, fontWeight: 600, color: tk.foggy }}>dias</span>
                        </div>

                        {streak?.dias_maximo && (
                            <div style={{ background: 'var(--color-bg-tertiary)', padding: '12px 16px', borderRadius: 12, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: tk.foggy }}>Máximo Pessoal</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{streak.dias_maximo} dias</span>
                            </div>
                        )}

                        {streak?.proxima_data_para_manter && (
                            <div style={{ background: `${tk.babu}15`, padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Icon icon="solar:calendar-date-bold-duotone" width="20" style={{ color: tk.babu }} />
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: tk.babu, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Próxima data para manter</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatIsoToShortDate(streak.proxima_data_para_manter)}</div>
                                </div>
                            </div>
                        )}
                    </SCard>
                </CCol>

                {/* Estatísticas Card */}
                <CCol md={6}>
                    <SCard delay={0.2}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                background: `${tk.babu}15`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: tk.babu,
                            }}>
                                <Icon icon="solar:chart-square-bold-duotone" width="28" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>Seu Desempenho</h2>
                                <span style={{ fontSize: 12, color: tk.foggy }}>Resumo geral das suas atividades</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ background: 'var(--color-bg-tertiary)', padding: '16px', borderRadius: 16 }}>
                                <Icon icon="solar:question-circle-bold-duotone" width="24" style={{ color: tk.rausch, marginBottom: 8 }} />
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>{total_questoes_respondidas || 0}</div>
                                <div style={{ fontSize: 12, color: tk.foggy, marginTop: 4, fontWeight: 600 }}>Questões</div>
                            </div>

                            <div style={{ background: 'var(--color-bg-tertiary)', padding: '16px', borderRadius: 16 }}>
                                <Icon icon="solar:book-bookmark-bold-duotone" width="24" style={{ color: tk.babu, marginBottom: 8 }} />
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>{total_sessoes || 0}</div>
                                <div style={{ fontSize: 12, color: tk.foggy, marginTop: 4, fontWeight: 600 }}>Sessões</div>
                            </div>

                            <div style={{ background: 'var(--color-bg-tertiary)', padding: '16px', borderRadius: 16, gridColumn: 'span 2' }}>
                                <Icon icon="solar:stopwatch-bold-duotone" width="24" style={{ color: tk.arches, marginBottom: 8 }} />
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>
                                    {tempo_estudo_total_minutos ? `${Math.floor(tempo_estudo_total_minutos / 60)}h ${tempo_estudo_total_minutos % 60}m` : '0m'}
                                </div>
                                <div style={{ fontSize: 12, color: tk.foggy, marginTop: 4, fontWeight: 600 }}>Tempo Total de Estudo</div>
                            </div>
                        </div>
                    </SCard>
                </CCol>
            </CRow>

            {/* Medalhas */}
            <div style={{ marginTop: 40, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>Medalhas e Badges</h2>
                    <span style={{ fontSize: 12, fontWeight: 700, background: `${tk.babu}15`, color: tk.babu, padding: '4px 12px', borderRadius: 99 }}>
                        {medalhas?.filter(m => m.desbloqueada).length || 0} DESBLOQUEADAS
                    </span>
                </div>

                {medalhas && medalhas.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                        {medalhas.map((medalha, idx) => {
                            const isUnlocked = medalha.desbloqueada
                            const medalColor = isUnlocked ? getMedalColor(medalha.tipo) : tk.foggy

                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.05 }}
                                    style={{
                                        background: isUnlocked ? 'var(--color-bg-elevated)' : 'var(--color-bg-tertiary)',
                                        border: `1px solid ${isUnlocked ? medalColor + '40' : 'var(--color-border)'}`,
                                        borderRadius: 20,
                                        padding: 20,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        opacity: isUnlocked ? 1 : 0.7
                                    }}
                                >
                                    {isUnlocked && (
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: medalColor }} />
                                    )}

                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <div style={{
                                            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                                            background: isUnlocked ? `${medalColor}15` : 'var(--color-border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: medalColor,
                                            filter: isUnlocked ? 'none' : 'grayscale(100%)'
                                        }}>
                                            <Icon icon={getMedalIcon(medalha.tipo)} width="32" />
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <h5 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>{medalha.nome}</h5>
                                            <p style={{ fontSize: 12, color: tk.foggy, marginBottom: 12, lineHeight: 1.4 }}>{medalha.descricao}</p>

                                            {!isUnlocked && medalha.progresso !== undefined && (
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 600, color: tk.foggy }}>Progresso</span>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: tk.arches }}>{Math.round(medalha.progresso)}%</span>
                                                    </div>
                                                    <AirbnbProgress value={medalha.progresso} color={tk.arches} />
                                                </div>
                                            )}

                                            {isUnlocked && medalha.data_desbloqueio && (
                                                <div style={{ fontSize: 11, fontWeight: 600, color: tk.babu, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Icon icon="solar:check-circle-bold-duotone" />
                                                    Desbloqueada em {formatIsoToShortDate(medalha.data_desbloqueio)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                ) : (
                    <CAlert color="info">Nenhuma medalha encontrada.</CAlert>
                )}
            </div>
        </div>
    )

    if (isTab) return innerContent

    return (
        <CContainer>
            {innerContent}
        </CContainer>
    )
}

export default Conquistas
