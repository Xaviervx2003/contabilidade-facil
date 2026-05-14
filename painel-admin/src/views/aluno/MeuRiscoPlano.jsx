import React, { useEffect, useMemo, useState } from 'react'
import {
    CCol, CRow, CBadge, CSpinner, CButton, CProgress, CAlert, CFormInput
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../config'
import { useTheme } from '../../context/themeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import toast from 'react-hot-toast'
import SCard from '../../components/premium/SCard'

/* ─── Tokens Airbnb-inspired ─────────────────────────────── */
const tokens = {
    rausch: '#FF385C',
    babu: '#00A699',
    arches: '#FC642D',
    hof: '#484848',
    foggy: '#767676',
}

const MeuRiscoPlano = () => {
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState('')
    const [dados, setDados] = useState(null)
    const [resumoAluno, setResumoAluno] = useState(null)
    const [missoesConcluidas, setMissoesConcluidas] = useState([])
    const [missoesPessoais, setMissoesPessoais] = useState([])
    const [missoesGlobais, setMissoesGlobais] = useState([])
    const [novaMissao, setNovaMissao] = useState('')
    const navigate = useNavigate()
    const { isDark } = useTheme()

    useEffect(() => {
        const carregar = async () => {
            const matricula = sessionStorage.getItem('matricula')
            if (!matricula) {
                setErro('Matrícula não encontrada.')
                setLoading(false)
                return
            }

            setLoading(true)
            try {
                // Carregamento resiliente: se um falhar, o outro continua
                const carregarDados = async (url) => {
                    try {
                        const res = await fetch(url)
                        if (!res.ok) return null
                        return await res.json()
                    } catch (e) {
                        return null
                    }
                }

                const [jsonKpi, jsonResumo, jsonGlobais] = await Promise.all([
                    carregarDados(`${API_URL}/api/metricas-estudantes/desempenho/${encodeURIComponent(matricula)}`),
                    carregarDados(`${API_URL}/api/aluno/dashboard/${encodeURIComponent(matricula)}`),
                    carregarDados(`${API_URL}/api/missoes/globais`)
                ])

                if (jsonKpi) setDados(jsonKpi)
                if (jsonResumo) setResumoAluno(jsonResumo)
                if (jsonGlobais) setMissoesGlobais(jsonGlobais)
                
                const mKey = `missoes_semanais:${matricula}`
                const pKey = `missoes_pessoais:${matricula}`
                setMissoesConcluidas(JSON.parse(sessionStorage.getItem(mKey) || '[]'))
                setMissoesPessoais(JSON.parse(localStorage.getItem(pKey) || '[]'))
            } catch (e) {
                console.error("Erro ao processar dados locais:", e)
            } finally {
                setLoading(false)
            }
        }
        carregar()
    }, [])

    const handleAddMissao = (textoSugestao = null) => {
        const textoFinal = textoSugestao || novaMissao
        if (!textoFinal.trim()) return

        const matricula = sessionStorage.getItem('matricula')
        const nova = { 
            id: `personal_${Date.now()}`, 
            titulo: textoFinal, 
            dica: 'Missão pessoal criada por você.', 
            progresso: 0, 
            icon: 'solar:pen-new-square-bold-duotone',
            isPersonal: true 
        }
        const atualizadas = [...missoesPessoais, nova]
        setMissoesPessoais(atualizadas)
        localStorage.setItem(`missoes_pessoais:${matricula}`, JSON.stringify(atualizadas))
        
        if (!textoSugestao) setNovaMissao('')
        toast.success('Missão adicionada com sucesso! 🎯')
    }

    const handleDeleteMissao = (id) => {
        const matricula = sessionStorage.getItem('matricula')
        const filtradas = missoesPessoais.filter(m => m.id !== id)
        setMissoesPessoais(filtradas)
        localStorage.setItem(`missoes_pessoais:${matricula}`, JSON.stringify(filtradas))
        toast.error('Missão removida.')
    }

    const plano = useMemo(() => {
        const churn = Number(dados?.churn_risco_percentual || 0)
        const mediaSemana = Number(resumoAluno?.semana?.media_acerto || 0)
        const sessoesSemana = Number(resumoAluno?.semana?.sessoes || 0)

        const base = dados ? [
            {
                id: 'sessoes',
                titulo: 'Ritmo de Estudo',
                dica: `Objetivo: 3 sessões. Atual: ${sessoesSemana}/3.`,
                progresso: Math.min(100, (sessoesSemana / 3) * 100),
                icon: 'solar:bolt-circle-bold-duotone'
            },
            {
                id: 'simulados',
                titulo: 'Excelência em Simulados',
                dica: `Média atual: ${mediaSemana.toFixed(1)}%. Meta: 80%.`,
                progresso: mediaSemana >= 80 ? 100 : Math.min(100, (mediaSemana / 80) * 100),
                icon: 'solar:star-circle-bold-duotone'
            },
        ] : []

        if (dados && churn >= 70) {
            base.unshift({
                id: 'anti-churn',
                titulo: 'Missão de Resgate 🚨',
                dica: 'Estude hoje para quebrar o ciclo de inatividade.',
                progresso: 20,
                icon: 'solar:shield-warning-bold-duotone'
            })
        }

        // Converter missões globais (Admin) para o formato do plano com trava de segurança
        const globaisFormatadas = Array.isArray(missoesGlobais) 
            ? missoesGlobais.map(g => ({
                id: `global_${g.id}`,
                titulo: g.titulo,
                dica: g.dica,
                progresso: 0,
                icon: g.icon || 'solar:target-bold',
                isGlobal: true
            }))
            : []

        return [...base, ...globaisFormatadas, ...missoesPessoais]
    }, [dados, resumoAluno, missoesPessoais, missoesGlobais])

    const progressoGeral = useMemo(() => {
        if (!plano.length) return 0
        const soma = plano.reduce((acc, p) => acc + Number(p.progresso || 0), 0)
        return Math.round(soma / plano.length)
    }, [plano])

    const toggleMissao = (id) => {
        const matricula = sessionStorage.getItem('matricula')
        const atual = missoesConcluidas.includes(id)
            ? missoesConcluidas.filter((m) => m !== id)
            : [...missoesConcluidas, id]
        setMissoesConcluidas(atual)
        sessionStorage.setItem(`missoes_semanais:${matricula}`, JSON.stringify(atual))
        if (!missoesConcluidas.includes(id)) toast.success('Missão marcada como concluída! 💪')
    }

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100" style={{ background: 'var(--color-bg-primary)' }}>
            <CSpinner style={{ color: tokens.rausch }} />
        </div>
    )

    if (erro) return <CAlert color="danger" className="m-4">{erro}</CAlert>

    const churn = Number(dados?.churn_risco_percentual || 0)
    const riscoStatus = churn >= 70 ? 'ALTO RISCO' : churn >= 40 ? 'RISCO MÉDIO' : 'RISCO BAIXO'
    const riscoCor = churn >= 70 ? tokens.rausch : churn >= 40 ? tokens.arches : tokens.babu

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: 'var(--color-bg-primary)', 
            padding: '32px 16px 48px',
            fontFamily: "'Nunito', sans-serif"
        }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');`}</style>
            
            <div style={{ maxWidth: 960, margin: '0 auto' }}>
                
                {/* ── Header Padrão 'Suas Jornadas' ── */}
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    style={{ marginBottom: 40 }}
                >
                    <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex gap-3">
                            <div style={{ 
                                width: 54, height: 54, borderRadius: 16, 
                                background: `${tokens.rausch}15`, color: tokens.rausch, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Icon icon="solar:academic-cap-bold-duotone" width="32" />
                            </div>
                            <div>
                                <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Suas Jornadas</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                                    Meu Risco + Missões 🎯
                                </div>
                                <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6, maxWidth: 500 }}>
                                    Acompanhe sua estratégia e gerencie seus desafios de forma simples e direta.
                                </div>
                            </div>
                        </div>
                        <CButton 
                            onClick={() => navigate('/quiz')}
                            style={{ background: tokens.rausch, color: '#fff', borderRadius: 12, fontWeight: 800, border: 'none' }}
                            className="px-4 py-2 d-flex align-items-center gap-2"
                        >
                            Praticar Agora
                            <Icon icon="solar:alt-arrow-right-bold" width="20" />
                        </CButton>
                    </div>
                </motion.div>

                {/* CARDS DE KPIS */}
                <CRow className="g-3 mb-4">
                    <CCol xs={12} md={4}>
                        <SCard padding="20px" style={{ borderLeft: `4px solid ${riscoCor}` }}>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <div style={{ color: riscoCor }}><Icon icon="solar:fire-bold-duotone" width="28" /></div>
                                <CBadge style={{ background: `${riscoCor}15`, color: riscoCor, borderRadius: 6 }}>{riscoStatus}</CBadge>
                            </div>
                            <div style={{ fontSize: 26, fontWeight: 800 }}>{churn.toFixed(1)}%</div>
                            <div style={{ fontSize: 11, color: tokens.foggy, fontWeight: 700 }}>RISCO DE EVASÃO</div>
                        </SCard>
                    </CCol>
                    <CCol xs={12} md={4}>
                        <SCard padding="20px">
                            <div style={{ color: tokens.babu, marginBottom: 8 }}><Icon icon="solar:graph-up-bold-duotone" width="28" /></div>
                            <div style={{ fontSize: 26, fontWeight: 800 }}>{Number(dados?.retencao_30d_percentual || 0).toFixed(1)}%</div>
                            <div style={{ fontSize: 11, color: tokens.foggy, fontWeight: 700 }}>RETENÇÃO 30 DIAS</div>
                        </SCard>
                    </CCol>
                    <CCol xs={12} md={4}>
                        <SCard padding="20px">
                            <div style={{ color: tokens.arches, marginBottom: 8 }}><Icon icon="solar:check-circle-bold-duotone" width="28" /></div>
                            <div style={{ fontSize: 26, fontWeight: 800 }}>{Number(dados?.conclusao_simulado_percentual || 0).toFixed(1)}%</div>
                            <div style={{ fontSize: 11, color: tokens.foggy, fontWeight: 700 }}>CONCLUSÃO DE ETAPAS</div>
                        </SCard>
                    </CCol>
                </CRow>

                {/* MISSÕES SEMANAIS */}
                <SCard delay={0.15}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                        <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-text-primary)' }}>Planejamento de Missões</span>
                    </div>
                    
                    {/* INPUT NOVA MISSÃO */}
                    <div className="mb-4">
                        <div className="d-flex gap-2 mb-2">
                            <CFormInput 
                                placeholder="Sua nova missão..." 
                                value={novaMissao}
                                onChange={e => setNovaMissao(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleAddMissao()}
                                className="border-0 bg-body-tertiary rounded-3 shadow-none px-3"
                                style={{ fontSize: 14 }}
                            />
                            <CButton 
                                onClick={() => handleAddMissao()}
                                style={{ background: tokens.babu, color: '#fff', borderRadius: 10, border: 'none' }}
                                className="px-3"
                            >
                                <Icon icon="solar:add-circle-bold" width="20" />
                            </CButton>
                        </div>
                        
                        {/* Sugestões Rápidas */}
                        <div className="d-flex flex-wrap gap-2 mt-3">
                            <span className="small text-muted me-1 mt-1">Sugestões:</span>
                            {['Estudar 1h', 'Resolver 50 questões', 'Revisar erros', 'Ler ementa'].map(opt => (
                                <CButton 
                                    key={opt}
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleAddMissao(opt)}
                                    style={{ 
                                        borderRadius: 20, 
                                        fontSize: 11, 
                                        fontWeight: 700, 
                                        background: 'var(--color-bg-tertiary)',
                                        color: tokens.foggy,
                                        border: '1px solid var(--color-border)'
                                    }}
                                    className="px-2 py-1"
                                >
                                    {opt}
                                </CButton>
                            ))}
                        </div>
                    </div>

                    <div className="mb-5 px-1">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span style={{ fontSize: 12, fontWeight: 800, color: tokens.foggy, textTransform: 'uppercase', letterSpacing: '1px' }}>Progresso Estratégico</span>
                            <span style={{ fontSize: 20, fontWeight: 800, color: tokens.babu }}>{progressoGeral}%</span>
                        </div>
                        <CProgress value={progressoGeral} color="success" height={10} className="rounded-pill bg-body-tertiary" />
                    </div>

                    <div className="d-flex flex-column gap-3">
                        {plano.map((m, i) => {
                            const done = missoesConcluidas.includes(m.id)
                            return (
                                <motion.div 
                                    key={m.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + (i * 0.05) }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 20,
                                        padding: '24px', borderRadius: 20,
                                        background: done ? 'var(--color-bg-tertiary)' : 'var(--color-bg-elevated)',
                                        border: done ? '1px solid transparent' : '1px solid var(--color-border)',
                                        boxShadow: done ? 'none' : '0 4px 12px rgba(0,0,0,0.02)',
                                        opacity: done ? 0.7 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {/* Checkbox Customizado */}
                                    <div 
                                        onClick={() => toggleMissao(m.id)}
                                        style={{
                                            width: 32, height: 32, borderRadius: 10,
                                            border: `2px solid ${done ? tokens.babu : 'var(--color-border)'}`,
                                            background: done ? tokens.babu : 'transparent',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', transition: 'all 0.2s', flexShrink: 0
                                        }}
                                    >
                                        {done && <Icon icon="solar:check-read-bold" width="20" />}
                                    </div>
                                    
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--color-text-primary)', textDecoration: done ? 'line-through' : 'none', letterSpacing: '-0.3px' }}>
                                                {m.titulo}
                                            </div>
                                            {m.isGlobal && <CBadge style={{ background: `${tokens.rausch}15`, color: tokens.rausch, fontSize: 9, fontWeight: 800, padding: '4px 8px' }}>DESAFIO</CBadge>}
                                            {m.isPersonal && <CBadge style={{ background: `${tokens.babu}15`, color: tokens.babu, fontSize: 9, fontWeight: 800, padding: '4px 8px' }}>PESSOAL</CBadge>}
                                        </div>
                                        <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 4, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {m.dica}
                                        </div>
                                    </div>

                                    {/* Ações Rápidas */}
                                    <div className="d-flex align-items-center gap-2">
                                        {m.isPersonal && (
                                            <CButton 
                                                variant="ghost" 
                                                size="sm" 
                                                className="p-2 text-danger opacity-50 hover-opacity-100"
                                                onClick={() => handleDeleteMissao(m.id)}
                                            >
                                                <Icon icon="solar:trash-bin-trash-bold" width="20" />
                                            </CButton>
                                        )}
                                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-bg-tertiary)', color: tokens.foggy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icon icon={m.icon || "solar:target-bold"} width="20" />
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </SCard>

                {/* BOX DE AVISO/RECOMENDAÇÃO */}
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    style={{ 
                        marginTop: 24, 
                        background: `${tokens.arches}10`, 
                        borderRadius: 20, 
                        padding: '24px', 
                        border: `1px solid ${tokens.arches}30`,
                        display: 'flex',
                        gap: 16,
                        alignItems: 'center'
                    }}
                >
                    <div style={{ width: 48, height: 48, background: tokens.arches, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Icon icon="solar:lightbulb-bold" width="24" />
                    </div>
                    <div>
                        <div className="fw-bold" style={{ color: tokens.arches }}>Dica do Mentor</div>
                        <div className="text-muted small">
                            {churn >= 70 
                                ? 'Foque em resolver pelo menos 5 questões hoje. Isso quebrará o sinal de alerta no sistema.' 
                                : 'Você está no caminho certo! Tente manter essa média de conclusão para garantir sua vaga.'}
                        </div>
                    </div>
                </motion.div>

            </div>
        </div>
    )
}

export default MeuRiscoPlano
