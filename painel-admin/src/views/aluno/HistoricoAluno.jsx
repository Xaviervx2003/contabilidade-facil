import React, { useEffect, useState, useMemo } from 'react'
import {
    CCol, CRow, CBadge, CSpinner, CButton, CProgress, CTable, CTableBody, CTableDataCell,
    CTableHead, CTableHeaderCell, CTableRow, CFormInput, CFormLabel, CFormSelect,
    CModal, CModalBody, CModalHeader, CModalTitle,
} from '@coreui/react'
import {
    BarChart, Bar, Tooltip, ResponsiveContainer,
} from 'recharts'
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
    swiss: '#B0B0B0',
}

/* ─── Helpers ─── */
const formatarTempo = (seg) => {
    if (!seg) return '0m'
    const m = Math.floor(seg / 60)
    const h = Math.floor(m / 60)
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}

const medalha = (v) => {
    if (v >= 90) return '🥇'
    if (v >= 70) return '🥈'
    if (v >= 50) return '🥉'
    return '📚'
}

const dataLocalHoje = () => new Date().toLocaleDateString('sv')

const fetchJSON = async (url) => {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`)
    return r.json()
}

/* ─── Heatmap de Contribuição ─── */
const Heatmap = ({ data }) => {
    const CELL_SIZE = 12
    const CELL_GAP = 4
    const TOTAL_WEEKS = 18

    const grid = useMemo(() => {
        if (!data || data.length === 0) return []
        const hoje = new Date()
        const totalDias = TOTAL_WEEKS * 7
        const start = new Date(hoje)
        start.setDate(hoje.getDate() - totalDias + 1)
        const mapa = new Map(data.map(d => [d.dia, d.questoes || 0]))
        const semanas = []
        let cursor = new Date(start)
        let semana = []
        while (cursor <= hoje) {
            const diaStr = cursor.toISOString().split('T')[0]
            const qtd = mapa.get(diaStr) || 0
            semana.push({ dia: diaStr, questoes: qtd, data: new Date(cursor) })
            if (cursor.getDay() === 6) {
                semanas.push(semana)
                semana = []
            }
            cursor.setDate(cursor.getDate() + 1)
        }
        if (semana.length > 0) semanas.push(semana)
        return semanas
    }, [data])

    const getColor = (qtd) => {
        if (qtd === 0) return 'var(--color-bg-tertiary)'
        if (qtd <= 5) return `${tokens.rausch}20`
        if (qtd <= 15) return `${tokens.rausch}60`
        if (qtd <= 30) return `${tokens.rausch}90`
        return tokens.rausch
    }

    return (
        <div style={{ width: '100%', overflowX: 'auto', padding: '10px 0' }}>
            <div style={{ display: 'flex', gap: CELL_GAP }}>
                {grid.map((week, wi) => (
                    <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: CELL_GAP }}>
                        {week.map((cell, di) => (
                            <div
                                key={di}
                                title={`${cell.dia}: ${cell.questoes} questões`}
                                style={{
                                    width: CELL_SIZE, height: CELL_SIZE, borderRadius: 3,
                                    background: getColor(cell.questoes),
                                    transition: '0.2s'
                                }}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div className="d-flex justify-content-end align-items-center mt-3 gap-2">
                <span style={{ fontSize: 10, color: tokens.foggy, fontWeight: 700 }}>MENOS</span>
                {[0, 5, 15, 30, 50].map(n => <div key={n} style={{ width: 10, height: 10, borderRadius: 2, background: getColor(n+1) }} />)}
                <span style={{ fontSize: 10, color: tokens.foggy, fontWeight: 700 }}>MAIS</span>
            </div>
        </div>
    )
}

/* ─── Modal de Sessões ─── */
const ModalSessoes = ({ matricula, onClose }) => {
    const [sessoes, setSessoes] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchJSON(`${API_URL}/api/aluno/sessoes/${matricula}`)
            .then(d => { setSessoes(Array.isArray(d) ? d : []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [matricula])

    return (
        <CModal visible size="lg" onClose={onClose} scrollable alignment="center">
            <CModalHeader className="border-0 pb-0">
                <CModalTitle style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
                    Histórico de Sessões ⏳
                </CModalTitle>
            </CModalHeader>
            <CModalBody className="p-4">
                {loading ? (
                    <div className="text-center py-5"><CSpinner color="primary" /></div>
                ) : (
                    <CTable responsive hover align="middle" className="border-top">
                        <CTableHead>
                            <CTableRow>
                                <CTableHeaderCell className="border-0 text-muted small">DATA</CTableHeaderCell>
                                <CTableHeaderCell className="border-0 text-muted small">MATÉRIA</CTableHeaderCell>
                                <CTableHeaderCell className="border-0 text-muted small text-center">ACERTO</CTableHeaderCell>
                                <CTableHeaderCell className="border-0 text-muted small text-center">TEMPO</CTableHeaderCell>
                            </CTableRow>
                        </CTableHead>
                        <CTableBody>
                            {sessoes.map((s, i) => (
                                <CTableRow key={i}>
                                    <CTableDataCell className="fw-bold">{new Date(s.criado_em).toLocaleDateString('pt-BR')}</CTableDataCell>
                                    <CTableDataCell>{s.materia_nome || 'Geral'}</CTableDataCell>
                                    <CTableDataCell className="text-center">
                                        <CBadge style={{ background: s.percentual_acerto >= 70 ? tokens.babu : tokens.rausch }}>{s.percentual_acerto}%</CBadge>
                                    </CTableDataCell>
                                    <CTableDataCell className="text-center text-muted small">{formatarTempo(s.tempo_seg)}</CTableDataCell>
                                </CTableRow>
                            ))}
                        </CTableBody>
                    </CTable>
                )}
                <div className="d-flex justify-content-end mt-3">
                    <CButton onClick={onClose} style={{ background: tokens.rausch, color: '#fff', borderRadius: 12, fontWeight: 800, border: 'none' }}>Fechar</CButton>
                </div>
            </CModalBody>
        </CModal>
    )
}

const HistoricoAluno = () => {
    const [dados, setDados] = useState(null)
    const [loading, setLoading] = useState(true)
    const [modalSessoes, setModalSessoes] = useState(false)
    const [materias, setMaterias] = useState([])
    const [filtroMateria, setFiltroMateria] = useState('')
    const [dataInicio, setDataInicio] = useState('')
    const [dataFim, setDataFim] = useState('')
    const [filtroResultado, setFiltroResultado] = useState('')
    const [progressoGeral, setProgressoGeral] = useState(null)
    const [ranking, setRanking] = useState(null)
    const matricula = sessionStorage.getItem('matricula')

    const buscarDados = useCallback(async () => {
        if (!matricula) return
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filtroMateria) params.set('materia_id', filtroMateria)
            if (dataInicio) params.set('data_inicio', dataInicio)
            if (dataFim) params.set('data_fim', dataFim)
            if (filtroResultado) params.set('acerto', filtroResultado)
            const qs = params.toString() ? `?${params.toString()}` : ''

            const [mats, mensal, diario, prog, rank] = await Promise.all([
                fetchJSON(`${API_URL}/api/admin/materias`),
                fetchJSON(`${API_URL}/api/aluno/historico-grafico/${matricula}${qs}`),
                fetchJSON(`${API_URL}/api/aluno/historico-diario/${matricula}${qs}`),
                fetchJSON(`${API_URL}/api/aluno/progresso/${matricula}${qs}`),
                fetchJSON(`${API_URL}/api/aluno/ranking/${matricula}`).catch(() => null)
            ])
            setMaterias(mats)
            setDados({ ...mensal, por_dia: diario.serie_diaria })
            setProgressoGeral(prog)
            setRanking(rank)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }, [matricula, filtroMateria, dataInicio, dataFim, filtroResultado])

    useEffect(() => { buscarDados() }, [buscarDados])

    const limparFiltros = () => {
        setFiltroMateria('')
        setDataInicio('')
        setDataFim('')
        setFiltroResultado('')
    }

    const constancia = useMemo(() => {
        if (!dados?.por_dia?.length) return { dias: 0, recorde: 0, tendencia: 'estavel' }
        const dias = dados.por_dia.map(d => d.dia).sort().reverse()
        let atual = 0, recorde = 0
        const hoje = dataLocalHoje()
        let dataRef = new Date(hoje + 'T12:00:00')
        for (let i = 0; i < 365; i++) {
            if (dias.includes(dataRef.toLocaleDateString('sv'))) {
                atual++
                if (atual > recorde) recorde = atual
            } else if (i > 0) break
            dataRef.setDate(dataRef.getDate() - 1)
        }
        return { dias: atual, recorde, tendencia: atual > 3 ? 'up' : 'estavel' }
    }, [dados])

    const handleShare = () => {
        const texto = `🚀 Meu progresso no Contabilidade Fácil:\n✅ ${dados?.resumo?.total_questoes ?? 0} questões\n🎯 Média: ${dados?.resumo?.media_geral}%\n🔥 Constância: ${constancia.dias} dias!`
        navigator.clipboard.writeText(texto)
        toast.success('Resumo copiado! Compartilhe com seus amigos. 🎉')
    }

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100" style={{ background: 'var(--color-bg-primary)' }}>
            <CSpinner style={{ color: tokens.rausch }} />
        </div>
    )

    return (
        <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', padding: '32px 16px 48px', fontFamily: "'Nunito', sans-serif" }}>
            <div style={{ maxWidth: 960, margin: '0 auto' }}>
                
                {modalSessoes && <ModalSessoes matricula={matricula} onClose={() => setModalSessoes(false)} />}

                {/* HEADER PREMIUM */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
                    <div className="d-flex justify-content-between align-items-end">
                        <div>
                            <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Sua Jornada</div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                                Meu Histórico 📊
                            </div>
                            <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
                                Acompanhe seu desempenho e identifique onde você pode brilhar.
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                            <CButton 
                                onClick={() => setModalSessoes(true)}
                                variant="ghost" className="fw-bold d-flex align-items-center gap-2"
                                style={{ color: tokens.hof, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 12 }}
                            >
                                <Icon icon="solar:history-bold-duotone" width="20" />
                                Sessões
                            </CButton>
                            <CButton 
                                onClick={handleShare}
                                style={{ background: tokens.rausch, color: '#fff', borderRadius: 12, fontWeight: 800, border: 'none' }}
                                className="px-4 d-flex align-items-center gap-2"
                            >
                                <Icon icon="solar:share-bold-duotone" width="20" />
                                Compartilhar
                            </CButton>
                        </div>
                    </div>
                </motion.div>

                {/* FILTROS RÁPIDOS AVANÇADOS */}
                <SCard className="mb-4" padding="16px">
                    <CRow className="g-3 align-items-end">
                        <CCol md={3}>
                            <CFormLabel className="small fw-bold text-muted">MATÉRIA</CFormLabel>
                            <CFormSelect 
                                value={filtroMateria} 
                                onChange={e => setFiltroMateria(e.target.value)}
                                className="border-0 bg-body-tertiary rounded-3 shadow-none"
                            >
                                <option value="">Todas as Matérias</option>
                                {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                            </CFormSelect>
                        </CCol>
                        <CCol md={2}>
                            <CFormLabel className="small fw-bold text-muted">RESULTADO</CFormLabel>
                            <CFormSelect 
                                value={filtroResultado} 
                                onChange={e => setFiltroResultado(e.target.value)}
                                className="border-0 bg-body-tertiary rounded-3 shadow-none"
                            >
                                <option value="">Todos</option>
                                <option value="acerto">Acertos</option>
                                <option value="erro">Erros</option>
                            </CFormSelect>
                        </CCol>
                        <CCol md={2}>
                            <CFormLabel className="small fw-bold text-muted">INÍCIO</CFormLabel>
                            <CFormInput type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="border-0 bg-body-tertiary rounded-3 shadow-none" />
                        </CCol>
                        <CCol md={2}>
                            <CFormLabel className="small fw-bold text-muted">FIM</CFormLabel>
                            <CFormInput type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="border-0 bg-body-tertiary rounded-3 shadow-none" />
                        </CCol>
                        <CCol md={3} className="d-flex gap-2">
                            <CButton 
                                onClick={limparFiltros}
                                variant="ghost" 
                                className="flex-grow-1 fw-bold" 
                                style={{ color: tokens.foggy, borderRadius: 12 }}
                            >
                                Limpar
                            </CButton>
                            <CButton 
                                onClick={buscarDados}
                                className="flex-grow-1 fw-bold" 
                                style={{ background: tokens.hof, color: '#fff', borderRadius: 12, border: 'none' }}
                            >
                                Filtrar
                            </CButton>
                        </CCol>
                    </CRow>
                </SCard>

                {/* CARDS DE STATS */}
                <CRow className="g-4 mb-4">
                    <CCol xs={6} md={3}>
                        <SCard padding="20px">
                            <div style={{ color: tokens.rausch, marginBottom: 8 }}><Icon icon="solar:fire-bold-duotone" width="32" /></div>
                            <div style={{ fontSize: 24, fontWeight: 800 }}>{constancia.dias} dias</div>
                            <div style={{ fontSize: 12, color: tokens.foggy, fontWeight: 700 }}>CONSTÂNCIA ATUAL</div>
                            {constancia.tendencia === 'up' && <div className="text-success small fw-bold mt-1">📈 Subindo!</div>}
                        </SCard>
                    </CCol>
                    <CCol xs={6} md={3}>
                        <SCard padding="20px">
                            <div style={{ color: tokens.babu, marginBottom: 8 }}><Icon icon="solar:medal-ribbon-star-bold-duotone" width="32" /></div>
                            <div style={{ fontSize: 24, fontWeight: 800 }}>{dados?.resumo?.media_geral}%</div>
                            <div style={{ fontSize: 12, color: tokens.foggy, fontWeight: 700 }}>MÉDIA DE ACERTOS</div>
                            <div className="text-muted small mt-1">{medalha(dados?.resumo?.media_geral)} Nível Pro</div>
                        </SCard>
                    </CCol>
                    <CCol xs={6} md={3}>
                        <SCard padding="20px">
                            <div style={{ color: tokens.arches, marginBottom: 8 }}><Icon icon="solar:checklist-bold-duotone" width="32" /></div>
                            <div style={{ fontSize: 24, fontWeight: 800 }}>{dados?.resumo?.total_questoes}</div>
                            <div style={{ fontSize: 12, color: tokens.foggy, fontWeight: 700 }}>QUESTÕES FEITAS</div>
                            <div className="text-muted small mt-1">Total no sistema</div>
                        </SCard>
                    </CCol>
                    <CCol xs={6} md={3}>
                        <SCard padding="20px">
                            <div style={{ color: '#9d7ef7', marginBottom: 8 }}><Icon icon="solar:ranking-bold-duotone" width="32" /></div>
                            <div style={{ fontSize: 24, fontWeight: 800 }}>{ranking?.posicao || '—'}º</div>
                            <div style={{ fontSize: 12, color: tokens.foggy, fontWeight: 700 }}>RANKING TURMA</div>
                            <div className="text-muted small mt-1">Top {100 - (ranking?.percentil || 0)}% da classe</div>
                        </SCard>
                    </CCol>
                </CRow>

                {/* PROGRESSO NO EDITAL DE DESTAQUE */}
                <SCard className="mb-4" padding="20px">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-2">
                            <Icon icon="solar:chart-square-bold-duotone" width="24" style={{ color: tokens.babu }} />
                            <span style={{ fontWeight: 800, fontSize: 16 }}>Progresso no Edital</span>
                        </div>
                        <span style={{ fontWeight: 800, color: tokens.babu }}>{progressoGeral?.percentual || 0}%</span>
                    </div>
                    <CProgress value={progressoGeral?.percentual || 0} color="success" height={12} className="rounded-pill" />
                    <div className="mt-2 small text-muted fw-bold">
                        {progressoGeral?.respondidas || 0} QUESTÕES RESOLVIDAS DE {progressoGeral?.total || 0} NO TOTAL
                    </div>
                </SCard>

                {/* HEATMAP E GRÁFICOS */}
                <CRow className="g-4 mb-4">
                    <CCol lg={7}>
                        <SCard title="🔥 Mapa de Calor de Estudos" icon={<Icon icon="solar:fire-bold" width="18" />}>
                            <Heatmap data={dados?.por_dia} />
                        </SCard>
                    </CCol>
                    <CCol lg={5}>
                        <SCard title="📈 Engajamento Semanal" icon={<Icon icon="solar:chart-square-bold" width="18" />}>
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={dados?.por_dia?.slice(-7)}>
                                    <Bar dataKey="questoes" fill={tokens.rausch} radius={[4, 4, 0, 0]} />
                                    <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return <div className="p-2 rounded-3 bg-dark text-white small" style={{ fontSize: 10 }}>{payload[0].value} questões</div>
                                        }
                                        return null
                                    }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </SCard>
                    </CCol>
                </CRow>

                {/* DESEMPENHO POR ASSUNTO */}
                <SCard title="📚 Desempenho por Disciplina" icon={<Icon icon="solar:notebook-bold" width="18" />}>
                    <CTable responsive hover align="middle" className="border-0 mb-0">
                        <CTableHead>
                            <CTableRow>
                                <CTableHeaderCell className="border-0 text-muted small px-0">ASSUNTO</CTableHeaderCell>
                                <CTableHeaderCell className="border-0 text-muted small text-center">QUESTÕES</CTableHeaderCell>
                                <CTableHeaderCell className="border-0 text-muted small text-center">ACERTO</CTableHeaderCell>
                                <CTableHeaderCell className="border-0 text-muted small text-end px-0">STATUS</CTableHeaderCell>
                            </CTableRow>
                        </CTableHead>
                        <CTableBody>
                            {dados?.por_assunto?.map((a, i) => (
                                <CTableRow key={i}>
                                    <CTableDataCell className="fw-bold px-0" style={{ fontSize: 14 }}>{a.assunto}</CTableDataCell>
                                    <CTableDataCell className="text-center text-muted small">{a.questoes}</CTableDataCell>
                                    <CTableDataCell className="text-center">
                                        <div className="d-flex align-items-center justify-content-center gap-2">
                                            <div style={{ width: 40, height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 10, overflow: 'hidden' }}>
                                                <div style={{ width: `${a.media_acerto}%`, height: '100%', background: a.media_acerto >= 70 ? tokens.babu : tokens.rausch }} />
                                            </div>
                                            <span className="fw-bold" style={{ fontSize: 11 }}>{a.media_acerto}%</span>
                                        </div>
                                    </CTableDataCell>
                                    <CTableDataCell className="text-end px-0">
                                        <CBadge 
                                            style={{ 
                                                background: a.media_acerto >= 70 ? `${tokens.babu}15` : `${tokens.rausch}15`,
                                                color: a.media_acerto >= 70 ? tokens.babu : tokens.rausch,
                                                borderRadius: 8, padding: '6px 10px', fontSize: 10
                                            }}
                                        >
                                            {a.media_acerto >= 70 ? 'DOMINADO' : 'REFORÇAR'}
                                        </CBadge>
                                    </CTableDataCell>
                                </CTableRow>
                            ))}
                        </CTableBody>
                    </CTable>
                </SCard>

            </div>
        </div>
    )
}

export default HistoricoAluno