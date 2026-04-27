import React, { useEffect, useState, useMemo } from 'react'
import {
    CCard, CCardBody, CCardHeader, CCol, CRow, CAlert, CBadge,
    CSpinner, CButton, CProgress, CTable, CTableBody, CTableDataCell,
    CTableHead, CTableHeaderCell, CTableRow, CFormInput, CFormLabel,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
    cilCalendar, cilClock, cilLibrary, cilChartLine, cilShare, cilStar, cilPlus, cilMinus,
} from '@coreui/icons'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { API_URL } from '../../config'

/* ─── Helpers ──────────────────────────────────────────────────── */
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

/* ─── Tooltip ──────────────────────────────────────────────────── */
const TooltipCustom = ({ active, payload, label, isDark }) => {
    if (!active || !payload?.length) return null
    const bg = isDark ? '#1e2a38' : '#ffffff'
    const border = isDark ? '#2d3f52' : '#d1dbe8'
    const textColor = isDark ? '#e0e8f0' : '#1f2937'
    return (
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px', color: textColor, fontSize: 13 }}>
            <p style={{ margin: 0, fontWeight: 700, marginBottom: 4 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ margin: 0, color: p.color }}>
                    {p.name}: <strong>{p.value}{p.name.includes('%') ? '%' : ''}</strong>
                </p>
            ))}
        </div>
    )
}

/* ─── StatCard ──────────────────────────────────────────────────── */
const StatCard = ({ icon, titulo, valor, sub, cor = '#7eb8f7', isDark, children }) => {
    const bg = isDark ? '#1a2535' : '#f8fafc'
    const borderColor = isDark ? '#2d3f52' : '#e2e8f0'
    return (
        <CCard style={{ background: bg, border: `1px solid ${borderColor}`, borderLeft: `4px solid ${cor}`, borderRadius: 10, height: '100%' }}>
            <CCardBody className="d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                    <CIcon icon={icon} style={{ color: cor }} size="lg" />
                    {children}
                </div>
                <div style={{ color: isDark ? '#8a9bb0' : '#64748b', fontSize: 11, marginBottom: 2 }}>{titulo}</div>
                <div style={{ color: cor, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{valor}</div>
                {sub && <div style={{ color: isDark ? '#5d7290' : '#94a3b8', fontSize: 11, marginTop: 4 }}>{sub}</div>}
            </CCardBody>
        </CCard>
    )
}

/* ─── Componente Principal ─────────────────────────────────────── */
const HistoricoAluno = () => {
    const [dados, setDados] = useState(null)
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState(null)
    const [isDark, setIsDark] = useState(false)
    const [metaDiaria, setMetaDiaria] = useState(10)
    const [metaSemanal, setMetaSemanal] = useState(70) // nova: meta semanal
    const [mostrarFinalizados, setMostrarFinalizados] = useState(false)
    const [progressoGeral, setProgressoGeral] = useState({ respondidas: 0, total: 0, percentual: 0 })

    const matricula = sessionStorage.getItem('matricula')
    const nome = sessionStorage.getItem('nome') || 'Aluno'

    // Detecção de tema
    useEffect(() => {
        const check = () => setIsDark(document.documentElement.getAttribute('data-coreui-theme') === 'dark')
        check()
        const obs = new MutationObserver(check)
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-coreui-theme'] })
        return () => obs.disconnect()
    }, [])

    useEffect(() => {
        if (!matricula) {
            setErro('Matrícula não encontrada.')
            setLoading(false)
            return
        }
        fetch(`${API_URL}/api/aluno/historico-grafico/${matricula}`)
            .then(res => res.json())
            .then(data => {
                setDados(data)
                setLoading(false)
            })
            .catch(err => {
                setErro(`Erro ao carregar histórico: ${err.message}`)
                setLoading(false)
            })
    }, [matricula])

    // Buscar progresso geral
    useEffect(() => {
        if (!matricula) return
        fetch(`${API_URL}/api/aluno/progresso/${matricula}`)
            .then(res => res.json())
            .then(setProgressoGeral)
            .catch(() => { })
    }, [matricula])

    // Recuperar metas do localStorage
    useEffect(() => {
        const savedMetaSemanal = localStorage.getItem('metaSemanal')
        if (savedMetaSemanal) setMetaSemanal(Number(savedMetaSemanal))
        const savedMetaDiaria = localStorage.getItem('metaDiaria')
        if (savedMetaDiaria) setMetaDiaria(Number(savedMetaDiaria))
    }, [])

    // Salvar metas no localStorage
    useEffect(() => {
        localStorage.setItem('metaSemanal', metaSemanal)
    }, [metaSemanal])
    useEffect(() => {
        localStorage.setItem('metaDiaria', metaDiaria)
    }, [metaDiaria])

    // Constância
    const constancia = useMemo(() => {
        if (!dados?.por_dia) return { dias: 0, recorde: 0 }
        const dias = dados.por_dia.map(d => d.dia).sort().reverse()
        let consecutivos = 0, recorde = 0, atual = 0
        const hoje = new Date().toISOString().split('T')[0]
        let dataRef = new Date(hoje)

        for (let i = 0; i < 365; i++) {
            const dataStr = dataRef.toISOString().split('T')[0]
            if (dias.includes(dataStr)) {
                atual++
                if (atual > recorde) recorde = atual
            } else {
                if (i === 0) consecutivos = atual
                atual = 0
            }
            dataRef.setDate(dataRef.getDate() - 1)
        }
        if (consecutivos === 0) consecutivos = atual
        return { dias: consecutivos, recorde }
    }, [dados])

    // Questões hoje
    const questoesHoje = useMemo(() => {
        if (!dados?.por_dia) return 0
        const hoje = new Date().toISOString().split('T')[0]
        const diaHoje = dados.por_dia.find(d => d.dia === hoje)
        return diaHoje ? diaHoje.questoes : 0
    }, [dados])

    // Últimos 7 dias (Estudo Semanal)
    const ultimos7Dias = useMemo(() => {
        if (!dados?.por_dia) return []
        const hoje = new Date()
        const dias = []
        for (let i = 6; i >= 0; i--) {
            const data = new Date(hoje); data.setDate(data.getDate() - i)
            const diaStr = data.toISOString().split('T')[0]
            const diaObj = dados.por_dia.find(d => d.dia === diaStr)
            dias.push({
                dia: data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
                questoes: diaObj ? diaObj.questoes : 0,
            })
        }
        return dias
    }, [dados])

    // Progresso da meta diária
    const progressoMeta = Math.min((questoesHoje / metaDiaria) * 100, 100)

    // Meta semanal (questões nos últimos 7 dias)
    const questoesSemana = ultimos7Dias.reduce((acc, d) => acc + d.questoes, 0)
    const progressoSemanal = Math.min((questoesSemana / metaSemanal) * 100, 100)

    // Compartilhar
    const handleShare = async () => {
        const texto = `📚 Meu progresso no Contabilidade Fácil:\n✅ ${dados.resumo.total_questoes} questões\n🎯 Média: ${dados.resumo.media_geral}%\n🔥 Constância: ${constancia.dias} dias\n🏆 Recorde: ${constancia.recorde} dias\n📅 Última sessão: ${new Date(dados.resumo.ultima_sessao).toLocaleDateString('pt-BR')}\n\nVem estudar comigo!`
        if (navigator.share) {
            try { await navigator.share({ title: 'Meu progresso', text: texto, url: window.location.origin }) } catch { }
        } else {
            try { await navigator.clipboard.writeText(texto); alert('✅ Copiado!') } catch { alert('Compartilhamento não suportado.') }
        }
    }

    if (loading) return <div className="text-center py-5"><CSpinner color="primary" /><p className="mt-3">Carregando...</p></div>
    if (erro) return <CAlert color="danger">{erro}</CAlert>
    if (!dados || dados.resumo.total_sessoes === 0) return <CAlert color="secondary">Você ainda não completou nenhuma sessão de estudo. Faça seu primeiro quiz!</CAlert>

    const { resumo, por_mes, por_assunto } = dados
    const ultima = resumo.ultima_sessao ? new Date(resumo.ultima_sessao).toLocaleDateString('pt-BR') : '—'

    return (
        <div style={{ padding: '24px', background: isDark ? '#111b27' : '#f4f7fa', minHeight: '100vh' }}>
            {/* Cabeçalho */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 style={{ color: isDark ? '#7eb8f7' : '#1a6fb5', fontWeight: 800, margin: 0 }}>Meu Histórico de Aprendizado</h2>
                    <p style={{ color: isDark ? '#5d7290' : '#64748b', margin: '4px 0 0', fontSize: 13 }}>Última sessão: {ultima}</p>
                </div>
                <CButton color="primary" variant="outline" size="sm" onClick={handleShare}>
                    <CIcon icon={cilShare} className="me-1" /> COMPARTILHAR
                </CButton>
            </div>

            {/* Progresso Geral */}
            <CCard className="mb-4" style={{ background: isDark ? '#1a2535' : '#ffffff', border: `1px solid ${isDark ? '#2d3f52' : '#e2e8f0'}`, borderRadius: 10 }}>
                <CCardBody className="d-flex align-items-center gap-3">
                    <div style={{ flex: 1 }}>
                        <h5 style={{ color: isDark ? '#e0e8f0' : '#1f2937', marginBottom: 8 }}>📊 Progresso no Edital</h5>
                        <CProgress value={progressoGeral.percentual} color="success" height={24} className="rounded-pill">
                            {progressoGeral.percentual}% ({progressoGeral.respondidas} de {progressoGeral.total} questões)
                        </CProgress>
                    </div>
                    <CBadge color="success" shape="rounded-pill" className="fs-6 px-3 py-2">{progressoGeral.percentual}%</CBadge>
                </CCardBody>
            </CCard>

            {/* Cards principais */}
            <CRow className="g-3 mb-4">
                <CCol xs={6} md={4} lg={3}>
                    <StatCard icon={cilChartLine} titulo="Constância nos Estudos" valor={`${constancia.dias} dias`} sub={`Recorde: ${constancia.recorde} dias`} cor="#2eb85c" isDark={isDark}>
                        <CBadge color="success" shape="rounded-pill">{constancia.dias >= 7 ? '🔥 Excelente!' : '💪 Continue!'}</CBadge>
                    </StatCard>
                </CCol>
                <CCol xs={6} md={4} lg={3}>
                    <StatCard icon={cilCalendar} titulo="Estudo do Dia" valor={`${questoesHoje} questões`} sub={`Meta: ${metaDiaria} questões/dia`} cor="#7eb8f7" isDark={isDark}>
                        <CButton color="link" size="sm" className="p-0" onClick={() => setMostrarFinalizados(!mostrarFinalizados)}>{mostrarFinalizados ? 'OCULTAR' : 'MOSTRAR'}</CButton>
                    </StatCard>
                </CCol>
                <CCol xs={6} md={4} lg={3}>
                    <StatCard icon={cilClock} titulo="Tempo de Estudo" valor={formatarTempo(resumo.tempo_medio_seg * resumo.total_sessoes)} sub={`Média diária: ${formatarTempo(resumo.tempo_medio_seg)}`} cor="#f9b115" isDark={isDark} />
                </CCol>
                <CCol xs={6} md={4} lg={3}>
                    <StatCard icon={cilLibrary} titulo="Questões Respondidas" valor={resumo.total_questoes} sub={`Média: ${resumo.media_geral}%`} cor="#9d7ef7" isDark={isDark}>
                        <span style={{ fontSize: 20 }}>{medalha(resumo.media_geral)}</span>
                    </StatCard>
                </CCol>
            </CRow>

            {/* Planejamento do Dia + Meta Semanal */}
            <CRow className="g-3 mb-4">
                <CCol md={6}>
                    <CCard style={{ background: isDark ? '#1a2535' : '#ffffff', border: `1px solid ${isDark ? '#2d3f52' : '#e2e8f0'}`, borderRadius: 10 }}>
                        <CCardHeader style={{ background: 'transparent', border: 'none', color: isDark ? '#7eb8f7' : '#1a6fb5', fontWeight: 700 }}>📋 Planejamento do Dia</CCardHeader>
                        <CCardBody>
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <CFormLabel style={{ minWidth: 80, color: isDark ? '#8a9bb0' : '#64748b' }}>Meta diária</CFormLabel>
                                <CFormInput type="number" value={metaDiaria} onChange={e => setMetaDiaria(Number(e.target.value))} style={{ width: 80 }} />
                                <div className="d-flex gap-1">
                                    <CButton color="primary" variant="outline" size="sm" onClick={() => setMetaDiaria(metaDiaria + 5)}><CIcon icon={cilPlus} /></CButton>
                                    <CButton color="primary" variant="outline" size="sm" onClick={() => setMetaDiaria(metaDiaria - 5)} disabled={metaDiaria <= 5}><CIcon icon={cilMinus} /></CButton>
                                </div>
                            </div>
                            <CProgress value={progressoMeta} color={progressoMeta >= 100 ? 'success' : progressoMeta >= 50 ? 'warning' : 'danger'} height={24} className="rounded-pill">{questoesHoje} de {metaDiaria}</CProgress>
                            <div className="text-end mt-2">
                                <CButton color="primary" size="sm" onClick={() => window.location.href = '/#/quiz'}>🎯 Fazer Quiz</CButton>
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
                <CCol md={6}>
                    <CCard style={{ background: isDark ? '#1a2535' : '#ffffff', border: `1px solid ${isDark ? '#2d3f52' : '#e2e8f0'}`, borderRadius: 10 }}>
                        <CCardHeader style={{ background: 'transparent', border: 'none', color: isDark ? '#7eb8f7' : '#1a6fb5', fontWeight: 700 }}>🎯 Meta Semanal</CCardHeader>
                        <CCardBody>
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <CFormLabel style={{ minWidth: 80, color: isDark ? '#8a9bb0' : '#64748b' }}>Meta semanal</CFormLabel>
                                <CFormInput type="number" value={metaSemanal} onChange={e => setMetaSemanal(Number(e.target.value))} style={{ width: 80 }} />
                            </div>
                            <CProgress value={progressoSemanal} color={progressoSemanal >= 100 ? 'success' : progressoSemanal >= 50 ? 'warning' : 'danger'} height={24} className="rounded-pill">{questoesSemana} de {metaSemanal}</CProgress>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>

            {/* Estudo Semanal */}
            <CCard className="mb-4" style={{ background: isDark ? '#1a2535' : '#ffffff', border: `1px solid ${isDark ? '#2d3f52' : '#e2e8f0'}`, borderRadius: 10 }}>
                <CCardHeader style={{ background: 'transparent', border: 'none', color: isDark ? '#7eb8f7' : '#1a6fb5', fontWeight: 700 }}>📅 Estudo Semanal</CCardHeader>
                <CCardBody>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={ultimos7Dias}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2d3f52' : '#e2e8f0'} />
                            <XAxis dataKey="dia" stroke={isDark ? '#5d7290' : '#64748b'} tick={{ fontSize: 12 }} />
                            <YAxis stroke={isDark ? '#5d7290' : '#64748b'} tick={{ fontSize: 12 }} />
                            <Tooltip content={<TooltipCustom isDark={isDark} />} />
                            <Bar dataKey="questoes" name="Questões" fill="#7eb8f7" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CCardBody>
            </CCard>

            {/* Gráficos mensais */}
            {por_mes.length > 0 && (
                <CRow className="g-3 mb-4">
                    <CCol md={6}>
                        <CCard style={{ background: isDark ? '#1a2535' : '#ffffff', border: `1px solid ${isDark ? '#2d3f52' : '#e2e8f0'}`, borderRadius: 10 }}>
                            <CCardHeader style={{ background: 'transparent', border: 'none', color: isDark ? '#7eb8f7' : '#1a6fb5', fontWeight: 700 }}>📈 Evolução da Taxa de Acerto</CCardHeader>
                            <CCardBody>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={por_mes}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2d3f52' : '#e2e8f0'} />
                                        <XAxis dataKey="mes" stroke={isDark ? '#5d7290' : '#64748b'} tick={{ fontSize: 12 }} />
                                        <YAxis domain={[0, 100]} stroke={isDark ? '#5d7290' : '#64748b'} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                                        <Tooltip content={<TooltipCustom isDark={isDark} />} />
                                        <Line type="monotone" dataKey="media_acerto" name="Acerto (%)" stroke="#2eb85c" strokeWidth={2} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CCardBody>
                        </CCard>
                    </CCol>
                    <CCol md={6}>
                        <CCard style={{ background: isDark ? '#1a2535' : '#ffffff', border: `1px solid ${isDark ? '#2d3f52' : '#e2e8f0'}`, borderRadius: 10 }}>
                            <CCardHeader style={{ background: 'transparent', border: 'none', color: isDark ? '#7eb8f7' : '#1a6fb5', fontWeight: 700 }}>📊 Questões por Mês</CCardHeader>
                            <CCardBody>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={por_mes}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#2d3f52' : '#e2e8f0'} />
                                        <XAxis dataKey="mes" stroke={isDark ? '#5d7290' : '#64748b'} tick={{ fontSize: 12 }} />
                                        <YAxis stroke={isDark ? '#5d7290' : '#64748b'} tick={{ fontSize: 12 }} />
                                        <Tooltip content={<TooltipCustom isDark={isDark} />} />
                                        <Bar dataKey="questoes" name="Questões" fill="#7eb8f7" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CCardBody>
                        </CCard>
                    </CCol>
                </CRow>
            )}

            {/* Tabela de Desempenho por Assunto */}
            <CCard style={{ background: isDark ? '#1a2535' : '#ffffff', border: `1px solid ${isDark ? '#2d3f52' : '#e2e8f0'}`, borderRadius: 10 }}>
                <CCardHeader style={{ background: 'transparent', border: 'none', color: isDark ? '#7eb8f7' : '#1a6fb5', fontWeight: 700 }}>📚 Desempenho por Assunto</CCardHeader>
                <CCardBody>
                    <CTable responsive hover {...(isDark ? { color: 'dark' } : {})}>
                        <CTableHead>
                            <CTableRow>
                                <CTableHeaderCell>Assunto</CTableHeaderCell>
                                <CTableHeaderCell className="text-center">Questões</CTableHeaderCell>
                                <CTableHeaderCell className="text-center">Média (%)</CTableHeaderCell>
                                <CTableHeaderCell className="text-center">Status</CTableHeaderCell>
                            </CTableRow>
                        </CTableHead>
                        <CTableBody>
                            {por_assunto.map((a, i) => (
                                <CTableRow key={i}>
                                    <CTableDataCell>{a.assunto}</CTableDataCell>
                                    <CTableDataCell className="text-center">{a.questoes}</CTableDataCell>
                                    <CTableDataCell className="text-center">
                                        <CBadge color={a.media_acerto >= 80 ? 'success' : a.media_acerto >= 60 ? 'warning' : 'danger'}>
                                            {a.media_acerto}%
                                        </CBadge>
                                    </CTableDataCell>
                                    <CTableDataCell className="text-center">
                                        {a.media_acerto >= 80 ? '✅ Dominado' : a.media_acerto >= 60 ? '📘 Em progresso' : '⚠️ Reforçar'}
                                    </CTableDataCell>
                                </CTableRow>
                            ))}
                        </CTableBody>
                    </CTable>
                </CCardBody>
            </CCard>
        </div>
    )
}

export default HistoricoAluno