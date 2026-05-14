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
                const [resKpi, resResumo, resGlobais] = await Promise.all([
                    fetch(`${API_URL}/api/metricas-estudantes/desempenho/${encodeURIComponent(matricula)}`),
                    fetch(`${API_URL}/api/aluno/dashboard/${encodeURIComponent(matricula)}`),
                    fetch(`${API_URL}/api/missoes/globais`)
                ])
                const [jsonKpi, jsonResumo, jsonGlobais] = await Promise.all([
                    resKpi.json(), resResumo.json(), resGlobais.json()
                ])
                setDados(jsonKpi)
                setResumoAluno(jsonResumo)
                setMissoesGlobais(jsonGlobais)
                
                const mKey = `missoes_semanais:${matricula}`
                const pKey = `missoes_pessoais:${matricula}`
                setMissoesConcluidas(JSON.parse(sessionStorage.getItem(mKey) || '[]'))
                setMissoesPessoais(JSON.parse(localStorage.getItem(pKey) || '[]'))
            } catch (e) {
                setErro(`Falha ao carregar dados: ${e.message}`)
            } finally {
                setLoading(false)
            }
        }
        carregar()
    }, [])

    const handleAddMissao = () => {
        if (!novaMissao.trim()) return
        const matricula = sessionStorage.getItem('matricula')
        const nova = { 
            id: `personal_${Date.now()}`, 
            titulo: novaMissao, 
            dica: 'Missão pessoal criada por você.', 
            progresso: 0, 
            icon: 'solar:pen-new-square-bold-duotone',
            isPersonal: true 
        }
        const atualizadas = [...missoesPessoais, nova]
        setMissoesPessoais(atualizadas)
        localStorage.setItem(`missoes_pessoais:${matricula}`, JSON.stringify(atualizadas))
        setNovaMissao('')
        toast.success('Missão pessoal adicionada! 🎯')
    }

    const handleDeleteMissao = (id) => {
        const matricula = sessionStorage.getItem('matricula')
        const filtradas = missoesPessoais.filter(m => m.id !== id)
        setMissoesPessoais(filtradas)
        localStorage.setItem(`missoes_pessoais:${matricula}`, JSON.stringify(filtradas))
        toast.error('Missão removida.')
    }

    const plano = useMemo(() => {
        if (!dados) return []
        const churn = Number(dados.churn_risco_percentual || 0)
        const mediaSemana = Number(resumoAluno?.semana?.media_acerto || 0)
        const sessoesSemana = Number(resumoAluno?.semana?.sessoes || 0)

        const base = [
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
        ]

        if (churn >= 70) {
            base.unshift({
                id: 'anti-churn',
                titulo: 'Missão de Resgate 🚨',
                dica: 'Estude hoje para quebrar o ciclo de inatividade.',
                progresso: 20,
                icon: 'solar:shield-warning-bold-duotone'
            })
        }

        // Converter missões globais (Admin) para o formato do plano
        const globaisFormatadas = missoesGlobais.map(g => ({
            id: `global_${g.id}`,
            titulo: g.titulo,
            dica: g.dica,
            progresso: 0,
            icon: g.icon || 'solar:target-bold',
            isGlobal: true
        }))

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
        <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', padding: '32px 16px 48px', fontFamily: "'Nunito', sans-serif" }}>
            <div style={{ maxWidth: 960, margin: '0 auto' }}>

                {/* HEADER PREMIUM */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
                    <div className="d-flex justify-content-between align-items-end">
                        <div>
                            <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Estratégia de Aprendizado</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                                Meu Risco + Plano 🛡️
                            </div>
                            <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
                                Analisamos seus dados para criar o caminho mais seguro até a aprovação.
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
                <CRow className="g-4 mb-4">
                    <CCol xs={12} md={4}>
                        <SCard padding="24px" style={{ borderLeft: `4px solid ${riscoCor}` }}>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <div style={{ color: riscoCor }}><Icon icon="solar:fire-bold-duotone" width="32" /></div>
                                <CBadge style={{ background: `${riscoCor}15`, color: riscoCor, borderRadius: 6 }}>{riscoStatus}</CBadge>
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 800 }}>{churn.toFixed(1)}%</div>
                            <div style={{ fontSize: 12, color: tokens.foggy, fontWeight: 700 }}>RISCO DE EVASÃO</div>
                            <p className="text-muted small mt-2 mb-0">
                                {churn >= 70 ? 'Ação imediata necessária!' : 'Seu ritmo está sob controle.'}
                            </p>
                        </SCard>
                    </CCol>
                    <CCol xs={12} md={4}>
                        <SCard padding="24px">
                            <div style={{ color: tokens.babu, marginBottom: 8 }}><Icon icon="solar:graph-up-bold-duotone" width="32" /></div>
                            <div style={{ fontSize: 28, fontWeight: 800 }}>{Number(dados?.retencao_30d_percentual || 0).toFixed(1)}%</div>
                            <div style={{ fontSize: 12, color: tokens.foggy, fontWeight: 700 }}>RETENÇÃO 30 DIAS</div>
                            <p className="text-muted small mt-2 mb-0">Consistência no último mês.</p>
                        </SCard>
                    </CCol>
                    <CCol xs={12} md={4}>
                        <SCard padding="24px">
                            <div style={{ color: tokens.arches, marginBottom: 8 }}><Icon icon="solar:check-circle-bold-duotone" width="32" /></div>
                            <div style={{ fontSize: 28, fontWeight: 800 }}>{Number(dados?.conclusao_simulado_percentual || 0).toFixed(1)}%</div>
                            <div style={{ fontSize: 12, color: tokens.foggy, fontWeight: 700 }}>CONCLUSÃO DE ETAPAS</div>
                            <p className="text-muted small mt-2 mb-0">Foco em finalizar o que começa.</p>
                        </SCard>
                    </CCol>
                </CRow>

                {/* MISSÕES SEMANAIS */}
                <SCard title="🎯 Planejamento de Missões" icon={<Icon icon="solar:target-bold" width="18" />}>
                    
                    {/* INPUT NOVA MISSÃO */}
                    <div className="d-flex gap-2 mb-4">
                        <CFormInput 
                            placeholder="Crie sua própria missão (ex: Estudar 2h de Contabilidade)" 
                            value={novaMissao}
                            onChange={e => setNovaMissao(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleAddMissao()}
                            className="border-0 bg-body-tertiary rounded-3 shadow-none px-3 py-2"
                            style={{ fontSize: 14 }}
                        />
                        <CButton 
                            onClick={handleAddMissao}
                            style={{ background: tokens.babu, color: '#fff', borderRadius: 12, border: 'none' }}
                            className="px-3"
                        >
                            <Icon icon="solar:add-circle-bold" width="20" />
                        </CButton>
                    </div>

                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold small text-muted">PROGRESSO DO PLANO</span>
                            <span className="fw-bold" style={{ color: tokens.babu }}>{progressoGeral}%</span>
                        </div>
                        <CProgress value={progressoGeral} color="success" height={10} className="rounded-pill" />
                    </div>

                    <div className="d-flex flex-column gap-3">
                        {plano.map((m, i) => {
                            const done = missoesConcluidas.includes(m.id)
                            return (
                                <motion.div 
                                    key={m.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    style={{ 
                                        background: 'var(--color-bg-tertiary)', 
                                        borderRadius: 16, 
                                        padding: '16px',
                                        border: done ? `1.5px solid ${tokens.babu}40` : '1.5px solid transparent',
                                        transition: '0.3s'
                                    }}
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div className="d-flex align-items-center gap-3">
                                            <div style={{ 
                                                width: 40, height: 40, 
                                                background: done ? tokens.babu : 'var(--color-bg-elevated)', 
                                                borderRadius: 12, 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: done ? '#fff' : tokens.foggy,
                                                transition: '0.3s'
                                            }}>
                                                <Icon icon={m.icon} width="24" />
                                            </div>
                                            <div>
                                                <div className="fw-bold" style={{ fontSize: 15, textDecoration: done ? 'line-through' : 'none', color: done ? tokens.foggy : 'var(--color-text-primary)' }}>
                                                    {m.titulo}
                                                </div>
                                                <div className="small text-muted">{m.dica}</div>
                                            </div>
                                        </div>
                                        <div className="d-flex gap-1">
                                            {m.isPersonal && (
                                                <CButton size="sm" variant="ghost" onClick={() => handleDeleteMissao(m.id)} style={{ color: tokens.rausch }}>
                                                    <Icon icon="solar:trash-bin-trash-bold" width="20" />
                                                </CButton>
                                            )}
                                            <CButton 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={() => toggleMissao(m.id)}
                                                style={{ color: done ? tokens.babu : tokens.foggy }}
                                            >
                                                <Icon icon={done ? "solar:check-square-bold" : "solar:square-academic-cap-bold"} width="24" />
                                            </CButton>
                                        </div>
                                    </div>
                                    <CProgress value={m.progresso} height={4} className="mt-2" color={done ? 'success' : 'info'} />
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
