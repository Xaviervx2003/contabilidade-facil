import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    CContainer,
    CRow,
    CCol,
    CCard,
    CCardBody,
    CSpinner,
    CAlert,
    CButton,
} from '@coreui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { API_URL } from '../../config'
import api from '../../services/api'
import { getAlunoMatricula } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import { tokens } from '../../tokens'

/* ── Circular Progress Ring ──────────────────────────────── */
const RingProgress = ({ value, size = 120, stroke = 10, color = tokens.rausch }) => {
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
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
            />
        </svg>
    )
}

const MeuRiscoPlano = () => {
    const matricula = getAlunoMatricula() || sessionStorage.getItem('matricula')
    const navigate = useNavigate()

    const { data: metrics, isLoading: loading, error: queryError } = useQuery({
        queryKey: ['metricas-estudante', matricula],
        queryFn: async () => {
            if (!matricula) throw new Error('Esta área é exclusiva para alunos com matrícula ativa.')
            try {
                const res = await api.get(`/api/metricas-estudantes/desempenho/${matricula}`)
                return res.data
            } catch (apiError) {
                if (apiError.response && apiError.response.status === 404) return null
                throw new Error('Não foi possível carregar o seu diagnóstico. Tente novamente.')
            }
        },
        enabled: !!matricula,
        staleTime: 1000 * 60 * 5 // 5 minutos de cache
    })

    const error = queryError ? queryError.message : null

    // Configurações do simulador de horas
    const [horasSemanais, setHorasSemanais] = useState(8)
    const [checklistStatus, setChecklistStatus] = useState({})

    // Determina a checklist com base nas horas
    const obterMetasPorHoras = (horas) => {
        if (horas < 6) {
            return [
                { id: 'sessao_1', text: 'Realizar 1 sessão de estudo focada (25min)', icon: 'solar:playback-speed-bold-duotone' },
                { id: 'quest_10', text: 'Resolver 10 questões da sua matéria mais fraca', icon: 'solar:pen-bold-duotone' },
                { id: 'erros_1', text: 'Revisar pelo menos 2 questões que errou no histórico', icon: 'solar:bill-cross-bold-duotone' }
            ]
        } else if (horas <= 12) {
            return [
                { id: 'sessao_3', text: 'Completar 3 sessões de estudo cronometradas', icon: 'solar:playback-speed-bold-duotone' },
                { id: 'quest_30', text: 'Resolver 30 questões de fixação', icon: 'solar:pen-bold-duotone' },
                { id: 'trilha_1', text: 'Concluir 1 módulo inteiro nas suas Trilhas', icon: 'solar:map-arrow-square-bold-duotone' },
                { id: 'erros_2', text: 'Revisar e corrigir seus erros mais frequentes', icon: 'solar:bill-cross-bold-duotone' },
                { id: 'media_70', text: 'Manter média de acertos semanal acima de 70%', icon: 'solar:star-bold-duotone' }
            ]
        } else {
            return [
                { id: 'sessao_6', text: 'Realizar 6 sessões de estudo avançadas', icon: 'solar:playback-speed-bold-duotone' },
                { id: 'quest_60', text: 'Resolver 60 questões de provas anteriores', icon: 'solar:pen-bold-duotone' },
                { id: 'trilha_2', text: 'Concluir 2 ou mais módulos nas Trilhas de Estudo', icon: 'solar:map-arrow-square-bold-duotone' },
                { id: 'simulado', text: 'Fazer 1 Simulado Geral Cronometrado', icon: 'solar:document-bold-duotone' },
                { id: 'erros_max', text: 'Zerar as dúvidas de erros nas matérias prioritárias', icon: 'solar:bill-cross-bold-duotone' },
                { id: 'media_80', text: 'Manter média de acertos semanal acima de 80%', icon: 'solar:star-bold-duotone' },
                { id: 'horas_total', text: 'Alcançar a meta de estudos diários programada', icon: 'solar:alarm-bold-duotone' }
            ]
        }
    }

    const metasAtuais = obterMetasPorHoras(horasSemanais)

    const toggleMeta = (id) => {
        setChecklistStatus(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
                <div className="text-center">
                    <CSpinner color="primary" />
                    <p className="mt-3 text-body-secondary" style={{ fontFamily: 'Nunito', fontWeight: 600 }}>Calculando seu diagnóstico personalizado...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', padding: '40px 0', fontFamily: 'Nunito' }}>
                <CContainer className="px-4">
                    <CAlert color="danger" className="d-flex align-items-center gap-2" style={{ borderRadius: 16 }}>
                        <Icon icon="solar:danger-bold-duotone" width="24" />
                        <span>{error}</span>
                    </CAlert>
                </CContainer>
            </div>
        )
    }

    // Processamento das matérias fracas a partir de erros_por_materia
    const obterMateriasFracas = () => {
        if (!metrics || !metrics.erros_por_materia) return []
        const lista = []
        Object.entries(metrics.erros_por_materia).forEach(([nome, info]) => {
            if (info.total > 0) {
                const taxaErro = info.erros / info.total
                lista.push({
                    materia: nome,
                    total: info.total,
                    erros: info.erros,
                    taxaErro: taxaErro,
                    taxaAcerto: 1 - taxaErro
                })
            }
        })
        return lista.sort((a, b) => b.taxaErro - a.taxaErro).slice(0, 3)
    }

    const materiasFracas = obterMateriasFracas()

    // Configurações dinâmicas baseadas no risco de reprovação/evasão
    const riscoVal = metrics?.churn_risco_percentual ?? 0
    let riscoNivel = 'Baixo'
    let riscoCor = tokens.babu
    let riscoBg = `${tokens.babu}15`
    let riscoMensagem = 'Parabéns! Seu nível de engajamento está altíssimo. Continue nesse ritmo para blindar sua aprovação!'
    let riscoEmoji = '🚀'

    if (riscoVal >= 70) {
        riscoNivel = 'Crítico'
        riscoCor = tokens.rausch
        riscoBg = `${tokens.rausch}15`
        riscoMensagem = 'Alerta de Risco! Você reduziu bastante sua frequência de estudos ultimamente. Que tal realizar um simulado rápido hoje para retomar o foco?'
        riscoEmoji = '⚠️'
    } else if (riscoVal >= 35) {
        riscoNivel = 'Médio'
        riscoCor = tokens.arches
        riscoBg = `${tokens.arches}15`
        riscoMensagem = 'Atenção! Seu engajamento oscilou nas últimas semanas. Fazer revisões curtas pode te ajudar a consolidar as matérias.'
        riscoEmoji = '⚡'
    }

    return (
        <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', fontFamily: "'Nunito', sans-serif" }}>
            <CContainer fluid className="px-3 px-md-5" style={{ paddingTop: 32 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    
                    {/* HEADER PREMIUM */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ marginBottom: 36 }}
                    >
                        <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Sua Jornada</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>Meu Risco + Plano de Estudos 📈</div>
                        <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
                            Acompanhe seu diagnóstico acadêmico de engajamento e execute seu planejamento semanal dinâmico.
                        </div>
                    </motion.div>

                    {/* ESTADO VAZIO (Aluno novo sem sessões de estudo) */}
                    {!metrics || metrics.sessoes === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                background: tokens.bg,
                                border: `1px solid ${tokens.border}`,
                                borderRadius: 24,
                                padding: '60px 24px',
                                textAlign: 'center',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
                            }}
                        >
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%',
                                background: `${tokens.rausch}15`, color: tokens.rausch,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px'
                            }}>
                                <Icon icon="solar:graph-bold-duotone" width="40" />
                            </div>
                            <h3 style={{ fontWeight: 800, fontSize: 22, color: 'var(--color-text-primary)', marginBottom: 8 }}>Seu Diagnóstico Está Sendo Gerado!</h3>
                            <p style={{ color: tokens.foggy, maxWidth: 500, margin: '0 auto 24px', fontSize: 14, lineHeight: 1.6 }}>
                                Você ainda não possui sessões de estudo completadas. Faça o seu primeiro quiz ou trilha de estudo para calcularmos seu risco de reprovação e criarmos um plano inteligente para você!
                            </p>
                            <CButton 
                                onClick={() => navigate('/quiz')}
                                style={{
                                    background: tokens.rausch, color: '#fff', border: 'none',
                                    borderRadius: 14, padding: '12px 28px',
                                    fontWeight: 700, fontSize: 14, boxShadow: '0 4px 14px rgba(255, 56, 92, 0.2)'
                                }}
                            >
                                Iniciar Primeiro Quiz 🚀
                            </CButton>
                        </motion.div>
                    ) : (
                        <CRow className="g-4">
                            
                            {/* COLUNA ESQUERDA: DIAGNÓSTICO E RISCO */}
                            <CCol lg={7}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    
                                    {/* CARD: RISK ASSESSMENT */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        style={{
                                            background: tokens.bg,
                                            border: `1px solid ${tokens.border}`,
                                            borderRadius: 24,
                                            padding: 24,
                                            boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <h4 style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Icon icon="solar:shield-warning-bold-duotone" style={{ color: riscoCor }} width="20" />
                                            Diagnóstico de Risco Acadêmico
                                        </h4>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                                            {/* Ring Progress */}
                                            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                                <RingProgress value={riscoVal} stroke={8} color={riscoCor} size={110} />
                                                <div style={{
                                                    position: 'absolute', inset: 0,
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                    fontFamily: 'inherit'
                                                }}>
                                                    <span style={{ fontSize: 24, fontWeight: 900, color: riscoCor }}>{riscoVal}%</span>
                                                    <span style={{ fontSize: 9, color: tokens.foggy, fontWeight: 700, textTransform: 'uppercase' }}>Risco</span>
                                                </div>
                                            </div>

                                            {/* Status Box */}
                                            <div style={{ flex: 1, minWidth: 200 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 800, background: riscoBg, color: riscoCor, padding: '4px 12px', borderRadius: 99 }}>
                                                        {riscoEmoji} Nível {riscoNivel}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                                                    {riscoMensagem}
                                                </p>
                                            </div>
                                        </div>

                                        <hr style={{ borderTop: `1px solid ${tokens.border}`, margin: '20px 0' }} />

                                        {/* Sub indicadores */}
                                        <CRow className="g-3 text-center">
                                            <CCol xs={6}>
                                                <div style={{ background: tokens.bgSub, borderRadius: 16, padding: '12px 10px' }}>
                                                    <div style={{ color: tokens.foggy, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>RETENÇÃO DE 30 DIAS</div>
                                                    <div style={{ fontSize: 18, fontWeight: 900, color: tokens.babu }}>
                                                        {metrics.retencao_30d_percentual ?? 0}%
                                                    </div>
                                                </div>
                                            </CCol>
                                            <CCol xs={6}>
                                                <div style={{ background: tokens.bgSub, borderRadius: 16, padding: '12px 10px' }}>
                                                    <div style={{ color: tokens.foggy, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>SIMULADOS FOCADOS</div>
                                                    <div style={{ fontSize: 18, fontWeight: 900, color: tokens.rausch }}>
                                                        {metrics.conclusao_simulado_percentual ?? 0}%
                                                    </div>
                                                </div>
                                            </CCol>
                                        </CRow>
                                    </motion.div>

                                    {/* CARD: RECOMENDAÇÕES INTELIGENTES (Matérias Fracas) */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        style={{
                                            background: tokens.bg,
                                            border: `1px solid ${tokens.border}`,
                                            borderRadius: 24,
                                            padding: 24,
                                            boxShadow: '0 8px 30px rgba(0,0,0,0.03)'
                                        }}
                                    >
                                        <h4 style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Icon icon="solar:lightbulb-bold-duotone" style={{ color: tokens.gold }} width="20" />
                                            Foco de Estudo Recomendado
                                        </h4>
                                        <p style={{ fontSize: 12, color: tokens.foggy, marginBottom: 20 }}>
                                            Matérias onde você teve maior taxa de erro. Sugerimos revisar estes temas.
                                        </p>

                                        {materiasFracas.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '20px 0', color: tokens.foggy, fontSize: 13 }}>
                                                Nenhum erro registrado para listar focos. Excelente!
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {materiasFracas.map((item, idx) => (
                                                    <div 
                                                        key={idx}
                                                        style={{
                                                            background: tokens.bgSub,
                                                            border: `1px solid ${tokens.border}`,
                                                            borderRadius: 16,
                                                            padding: '14px 18px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: 12
                                                        }}
                                                    >
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)', textTransform: 'capitalize', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                {item.materia}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: tokens.foggy, marginTop: 2 }}>
                                                                {item.erros} erros de {item.total} respondidas • Taxa de acerto: {Math.round(item.taxaAcerto * 100)}%
                                                            </div>
                                                        </div>

                                                        <CButton
                                                            onClick={() => navigate(`/quiz?materia=${encodeURIComponent(item.materia)}`)}
                                                            style={{
                                                                background: `${tokens.rausch}15`, color: tokens.rausch, border: 'none',
                                                                borderRadius: 10, padding: '6px 12px',
                                                                fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4
                                                            }}
                                                        >
                                                            Praticar <Icon icon="solar:alt-arrow-right-bold" />
                                                        </CButton>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                            </CCol>

                            {/* COLUNA DIREITA: PLANO DE ESTUDOS / CRONOGRAMA DINÂMICO */}
                            <CCol lg={5}>
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                    style={{
                                        background: tokens.bg,
                                        border: `1px solid ${tokens.border}`,
                                        borderRadius: 24,
                                        padding: 24,
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
                                        height: '100%'
                                    }}
                                >
                                    <h4 style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Icon icon="solar:calendar-date-bold-duotone" style={{ color: tokens.babu }} width="20" />
                                        Plano de Estudos Semanal
                                    </h4>
                                    <p style={{ fontSize: 12, color: tokens.foggy, marginBottom: 20 }}>
                                        Ajuste suas horas planejadas para gerar uma checklist sob medida.
                                    </p>

                                    {/* SLIDER DE HORAS */}
                                    <div style={{ background: tokens.bgSub, borderRadius: 18, padding: '16px 20px', marginBottom: 24 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Meta de Carga Horária</span>
                                            <span style={{ fontSize: 18, fontWeight: 900, color: tokens.babu }}>{horasSemanais} horas</span>
                                        </div>
                                        
                                        <input 
                                            type="range" 
                                            min="3" 
                                            max="20" 
                                            step="1" 
                                            value={horasSemanais}
                                            onChange={(e) => setHorasSemanais(Number(e.target.value))}
                                            style={{
                                                width: '100%',
                                                accentColor: tokens.babu,
                                                cursor: 'pointer'
                                            }}
                                        />

                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: tokens.foggy, marginTop: 6 }}>
                                            <span>3h (Essencial)</span>
                                            <span>12h (Focado)</span>
                                            <span>20h (Intenso)</span>
                                        </div>
                                    </div>

                                    {/* CHECKLIST METAS DINÂMICAS */}
                                    <h5 style={{ fontWeight: 800, fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Checklist de Objetivos da Semana
                                    </h5>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {metasAtuais.map((meta) => {
                                            const isChecked = !!checklistStatus[meta.id]
                                            return (
                                                <motion.div 
                                                    key={meta.id}
                                                    whileHover={{ x: 2 }}
                                                    onClick={() => toggleMeta(meta.id)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: 12,
                                                        background: isChecked ? 'var(--color-bg-tertiary)' : 'transparent',
                                                        border: `1px solid ${isChecked ? 'transparent' : tokens.border}`,
                                                        borderRadius: 14,
                                                        padding: '12px 14px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    {/* Check Icon */}
                                                    <div style={{ marginTop: 2, flexShrink: 0 }}>
                                                        <Icon 
                                                            icon={isChecked ? "solar:check-circle-bold" : "solar:circle-linear"} 
                                                            width="18" 
                                                            style={{ color: isChecked ? tokens.babu : tokens.foggy }} 
                                                        />
                                                    </div>
                                                    
                                                    {/* Meta Content */}
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ 
                                                            fontSize: 13, 
                                                            fontWeight: 600, 
                                                            color: isChecked ? tokens.foggy : 'var(--color-text-primary)',
                                                            textDecoration: isChecked ? 'line-through' : 'none'
                                                        }}>
                                                            {meta.text}
                                                        </div>
                                                    </div>

                                                    <Icon icon={meta.icon} width="16" style={{ color: isChecked ? tokens.babu : tokens.foggy, opacity: 0.5, flexShrink: 0 }} />
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                    
                                    {/* Barra de progresso da meta semanal */}
                                    {metasAtuais.length > 0 && (
                                        <div style={{ marginTop: 24 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: tokens.foggy, marginBottom: 6 }}>
                                                <span>Progresso Semanal</span>
                                                <strong>
                                                    {Math.round((metasAtuais.filter(m => checklistStatus[m.id]).length / metasAtuais.length) * 100)}%
                                                </strong>
                                            </div>
                                            <div style={{ height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
                                                <motion.div 
                                                    style={{ 
                                                        height: '100%', 
                                                        background: tokens.babu, 
                                                        borderRadius: 99 
                                                    }}
                                                    animate={{ width: `${(metasAtuais.filter(m => checklistStatus[m.id]).length / metasAtuais.length) * 100}%` }}
                                                    transition={{ duration: 0.3 }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </CCol>
                        </CRow>
                    )}
                </div>
            </CContainer>
        </div>
    )
}

export default MeuRiscoPlano