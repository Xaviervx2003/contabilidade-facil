import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
    CCard, CCardBody, CCardHeader, CCol, CRow, CAlert, CBadge,
    CSpinner, CButton, CProgress, CTable, CTableBody, CTableDataCell,
    CTableHead, CTableHeaderCell, CTableRow, CFormInput, CFormLabel, CFormSelect,
    CModal, CModalBody, CModalHeader, CModalTitle,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
    cilCalendar, cilClock, cilLibrary, cilChartLine, cilShare,
    cilStar, cilPlus, cilMinus, cilFilter, cilX, cilDataTransferDown,
    cilWarning, cilHistory,
} from '@coreui/icons'
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { API_URL } from '../../config'
import { useTheme } from '../../context/themeContext'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'

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

const CACHE_TTL = 5 * 60 * 1000
const cacheGet = (key) => {
    try {
        const raw = sessionStorage.getItem(`cache:${key}`)
        if (!raw) return null
        const { ts, data } = JSON.parse(raw)
        if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(`cache:${key}`); return null }
        return data
    } catch { return null }
}
const cacheSet = (key, data) => {
    try { sessionStorage.setItem(`cache:${key}`, JSON.stringify({ ts: Date.now(), data })) } catch { }
}
const cacheClear = (key) => {
    try { sessionStorage.removeItem(`cache:${key}`) } catch { }
}

const exportarCSV = (dados, nomeArquivo = 'historico.csv') => {
    if (!dados || !dados.length) return
    const headers = Object.keys(dados[0]).join(',')
    const linhas = dados.map(row =>
        Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    )
    const csv = [headers, ...linhas].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = nomeArquivo; a.click()
    URL.revokeObjectURL(url)
}

const Toast = ({ mensagem, tipo = 'success', onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 4000)
        return () => clearTimeout(t)
    }, [onClose])
    const cor = tipo === 'success' ? '#2eb85c' : tipo === 'warning' ? '#f9b115' : '#e55353'
    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
            borderLeft: `4px solid ${cor}`,
            borderRadius: 12, padding: '16px 20px', maxWidth: 350,
            boxShadow: 'var(--color-shadow-lg)', display: 'flex',
            alignItems: 'center', gap: 12, fontSize: 14,
            backdropFilter: 'blur(12px)',
        }}>
            <span style={{ fontSize: 18 }}>{tipo === 'success' ? '🎉' : tipo === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span className="fw-medium">{mensagem}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', marginLeft: 'auto', fontSize: 18 }}>×</button>
        </div>
    )
}

const Skeleton = ({ h = 20, w = '100%', radius = 6, style = {} }) => (
    <div style={{
        height: h, width: w, borderRadius: radius,
        background: 'var(--color-skeleton-bg)',
        backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
        ...style
    }} />
)
const SkeletonCard = () => {
    return (
        <CCard style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 10, height: 120 }}>
            <CCardBody>
                <Skeleton h={12} w="60%" style={{ marginBottom: 10 }} />
                <Skeleton h={28} w="40%" style={{ marginBottom: 8 }} />
                <Skeleton h={10} w="80%" />
            </CCardBody>
        </CCard>
    )
}

/* ─── Heatmap de Contribuição (ocupa 100% da largura) ─── */
const Heatmap = ({ data }) => {
    const { isDark } = useTheme()
    const [tooltip, setTooltip] = useState(null)
    const containerRef = useRef(null)

    const CELL_SIZE = 14
    const CELL_GAP = 3
    const TOTAL_WEEKS = 16 // Diminuído de 20 para 16 para ocupar menos espaço

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
        if (qtd === 0) return 'var(--color-heatmap-0)'
        if (qtd <= 5) return 'var(--color-heatmap-1)'
        if (qtd <= 15) return 'var(--color-heatmap-2)'
        if (qtd <= 30) return 'var(--color-heatmap-3)'
        return 'var(--color-heatmap-4)'
    }

    const handleMouseEnter = (e, dia, qtd) => {
        const rect = e.target.getBoundingClientRect()
        setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, dia, qtd })
    }

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    return (
        <div ref={containerRef} style={{ width: '100%', overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: CELL_GAP, marginBottom: 6, paddingLeft: 32 }}>
                {diasSemana.map((d, i) => (
                    <div key={i} style={{
                        width: CELL_SIZE, height: CELL_SIZE, fontSize: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-text-tertiary)',
                    }}>
                        {i % 2 === 0 ? d.charAt(0) : ''}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: CELL_GAP }}>
                {[0, 1, 2, 3, 4, 5, 6].map(linha => (
                    <div key={linha} style={{ display: 'flex', flexDirection: 'column', gap: CELL_GAP }}>
                        {grid.map((week, wi) => {
                            const cell = week[linha]
                            if (!cell) return <div key={wi} style={{ width: CELL_SIZE, height: CELL_SIZE, borderRadius: 4 }} />
                            return (
                                <div
                                    key={wi}
                                    title={`${cell.dia}: ${cell.questoes} questões`}
                                    style={{
                                        width: CELL_SIZE, height: CELL_SIZE, borderRadius: 4,
                                        background: getColor(cell.questoes),
                                        border: `1px solid var(--color-border-subtle)`,
                                        cursor: 'pointer', transition: 'background .2s',
                                    }}
                                    onMouseEnter={e => handleMouseEnter(e, cell.dia, cell.questoes)}
                                    onMouseLeave={() => setTooltip(null)}
                                />
                            )
                        })}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: CELL_GAP, marginTop: 8, alignItems: 'center', justifyContent: 'flex-end', paddingRight: 16 }}>
                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginRight: 4 }}>Menos</span>
                {[0, 5, 15, 30, 50].map((nivel, i) => (
                    <div key={i} style={{ width: CELL_SIZE, height: CELL_SIZE, borderRadius: 4, background: getColor(nivel + 1) }} />
                ))}
                <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>Mais</span>
            </div>
            {tooltip && (
                <div style={{
                    position: 'fixed', left: tooltip.x, top: tooltip.y,
                    transform: 'translate(-50%, -100%)',
                    background: 'var(--color-bg-elevated)',
                    border: `1px solid var(--color-border)`,
                    borderRadius: 6, padding: '4px 10px', fontSize: 12,
                    color: 'var(--color-text-primary)',
                    pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 1060,
                    boxShadow: 'var(--color-shadow-md)',
                }}>
                    {tooltip.dia} — <strong>{tooltip.qtd} questões</strong>
                </div>
            )}
        </div>
    )
}

/* ─── Tooltip customizado ─── */
const TooltipCustom = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div style={{
            background: 'var(--color-bg-elevated)',
            border: `1px solid var(--color-border)`,
            borderRadius: 8, padding: '10px 14px',
            color: 'var(--color-text-primary)',
            fontSize: 13,
            boxShadow: 'var(--color-shadow-md)',
            backdropFilter: 'blur(8px)',
        }}>
            <p style={{ margin: 0, fontWeight: 700, marginBottom: 4 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ margin: 0, color: p.color }}>
                    {p.name}: <strong>{p.value}{p.name.includes('%') ? '%' : ''}</strong>
                </p>
            ))}
        </div>
    )
}

/* ─── StatCard ─── */
const StatCard = ({ icon, titulo, valor, sub, cor = 'primary', children, loading }) => {
    if (loading) return <SkeletonCard />
    return (
        <div className="stat-box h-100 fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className={`stat-icon-wrapper ${cor}`}>
                <CIcon icon={icon} size="lg" />
            </div>
            <div className="stat-info flex-grow-1">
                <div className="stat-value">{valor}</div>
                <div className="stat-desc">{titulo}</div>
                {sub && <div className="text-body-tertiary small mt-1">{sub}</div>}
            </div>
            {children}
        </div>
    )
}

/* ─── Modal de Sessões ─── */
const ModalSessoes = ({ matricula, onClose }) => {
    const { isDark } = useTheme()
    const [sessoes, setSessoes] = useState([])
    const [loading, setLoading] = useState(true)
    const [pagina, setPagina] = useState(1)
    const POR_PAGINA = 10

    useEffect(() => {
        fetchJSON(`${API_URL}/api/aluno/sessoes/${matricula}`)
            .then(d => { setSessoes(Array.isArray(d) ? d : []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [matricula])

    const total = Math.ceil(sessoes.length / POR_PAGINA)
    const paginas = sessoes.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
    const bg = isDark ? '#1a2535' : '#ffffff'

    return (
        <CModal visible size="lg" onClose={onClose} scrollable>
            <CModalHeader style={{ background: 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                <CModalTitle style={{ color: 'var(--color-primary)' }}>
                    <CIcon icon={cilHistory} className="me-2" />Histórico de Sessões
                </CModalTitle>
            </CModalHeader>
            <CModalBody style={{ background: 'var(--color-bg-elevated)' }}>
                {loading ? (
                    <div className="text-center py-4"><CSpinner color="primary" /></div>
                ) : sessoes.length === 0 ? (
                    <CAlert color="secondary">Nenhuma sessão encontrada.</CAlert>
                ) : (
                    <>
                        <CTable responsive hover>
                            <CTableHead>
                                <CTableRow>
                                    <CTableHeaderCell>Data</CTableHeaderCell>
                                    <CTableHeaderCell>Matéria</CTableHeaderCell>
                                    <CTableHeaderCell className="text-center">Questões</CTableHeaderCell>
                                    <CTableHeaderCell className="text-center">Acerto</CTableHeaderCell>
                                    <CTableHeaderCell className="text-center">Tempo</CTableHeaderCell>
                                </CTableRow>
                            </CTableHead>
                            <CTableBody>
                                {paginas.map((s, i) => (
                                    <CTableRow key={i}>
                                        <CTableDataCell style={{ fontSize: 13 }}>
                                            {s.criado_em ? new Date(s.criado_em).toLocaleDateString('pt-BR') : '—'}
                                        </CTableDataCell>
                                        <CTableDataCell style={{ fontSize: 13 }}>{s.materia_nome || s.modo || '—'}</CTableDataCell>
                                        <CTableDataCell className="text-center">{s.total_questoes ?? '—'}</CTableDataCell>
                                        <CTableDataCell className="text-center">
                                            <CBadge color={
                                                (s.percentual_acerto ?? 0) >= 80 ? 'success' :
                                                    (s.percentual_acerto ?? 0) >= 60 ? 'warning' : 'danger'
                                            }>
                                                {s.percentual_acerto ?? 0}%
                                            </CBadge>
                                        </CTableDataCell>
                                        <CTableDataCell className="text-center" style={{ fontSize: 13 }}>
                                            {formatarTempo(s.tempo_seg)}
                                        </CTableDataCell>
                                    </CTableRow>
                                ))}
                            </CTableBody>
                        </CTable>
                        {total > 1 && (
                            <div className="d-flex justify-content-center gap-2 mt-3">
                                <CButton size="sm" color="secondary" variant="outline" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>‹</CButton>
                                <span style={{ fontSize: 13, padding: '4px 8px' }}>Página {pagina} de {total}</span>
                                <CButton size="sm" color="secondary" variant="outline" disabled={pagina === total} onClick={() => setPagina(p => p + 1)}>›</CButton>
                            </div>
                        )}
                    </>
                )}
            </CModalBody>
        </CModal>
    )
}

/* ─── Componente Principal ─── */
const HistoricoAluno = () => {
    const [dados, setDados] = useState(null)
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState(null)
    const [toast, setToast] = useState(null)
    const [modalSessoes, setModalSessoes] = useState(false)
    const metaJaCelebrada = useRef(false)
    const { isDark } = useTheme()

    const getParamURL = (key) => new URLSearchParams(window.location.hash.split('?')[1] || '').get(key) || ''
    const [dataInicio, setDataInicio] = useState(getParamURL('data_inicio'))
    const [dataFim, setDataFim] = useState(getParamURL('data_fim'))
    const [filtroMateria, setFiltroMateria] = useState(getParamURL('materia_id'))
    const [filtroAcerto, setFiltroAcerto] = useState(getParamURL('acerto'))
    const [materias, setMaterias] = useState([])

    const matriculaUrl = getParamURL('matricula')
    const matricula = matriculaUrl || sessionStorage.getItem('matricula')
    const nome = matriculaUrl ? `Aluno (${matriculaUrl})` : (sessionStorage.getItem('nome') || 'Aluno')

    const [progressoGeral, setProgressoGeral] = useState(null)
    const [ranking, setRanking] = useState(null)
    const [metaSemanal, setMetaSemanal] = useState(100)
    const [metaDiaria, setMetaDiaria] = useState(20)
    const [mostrarFinalizados, setMostrarFinalizados] = useState(false)

    // Sincronizar filtros com URL
    useEffect(() => {
        const params = new URLSearchParams()
        if (dataInicio) params.set('data_inicio', dataInicio)
        if (dataFim) params.set('data_fim', dataFim)
        if (filtroMateria) params.set('materia_id', filtroMateria)
        if (filtroAcerto) params.set('acerto', filtroAcerto)
        const qs = params.toString()
        const base = window.location.hash.split('?')[0]
        const novaHash = qs ? `${base}?${qs}` : base
        window.history.replaceState(null, '', novaHash)
    }, [dataInicio, dataFim, filtroMateria, filtroAcerto])

    // Detecção de tema - removida pois agora usamos useTheme() no topo do componente

    // Carregar matérias
    useEffect(() => {
        fetchJSON(`${API_URL}/api/admin/materias`)
            .then(d => setMaterias(Array.isArray(d) ? d : []))
            .catch(() => { })
    }, [])

    // Carregar ranking
    useEffect(() => {
        if (!matricula) return
        fetchJSON(`${API_URL}/api/aluno/ranking/${matricula}`)
            .then(d => setRanking(d))
            .catch(() => { })
    }, [matricula])

    const temFiltros = useMemo(
        () => !!(dataInicio || dataFim || filtroMateria || filtroAcerto),
        [dataInicio, dataFim, filtroMateria, filtroAcerto]
    )

    const buscarDados = useCallback((forcarAtualizacao = false) => {
        if (!matricula) {
            setErro('Matrícula não encontrada.')
            setLoading(false)
            return
        }
        setLoading(true)

        if (temFiltros) {
            const params = new URLSearchParams()
            if (dataInicio) params.set('data_inicio', dataInicio)
            if (dataFim) params.set('data_fim', dataFim)
            if (filtroMateria) params.set('materia_id', filtroMateria)
            if (filtroAcerto) params.set('acerto', filtroAcerto)
            const qs = params.toString() ? `?${params.toString()}` : ''

            Promise.all([
                fetchJSON(`${API_URL}/api/aluno/historico-filtrado/${matricula}${qs}`),
                fetchJSON(`${API_URL}/api/aluno/progresso/${matricula}${qs}`) // Agora passa os filtros para o progresso também
            ])
                .then(([filtrado, progresso]) => {
                    setDados(filtrado)
                    setProgressoGeral(progresso)
                    setLoading(false)
                })
                .catch(err => {
                    setErro(`Erro ao carregar histórico: ${err.message}`)
                    setLoading(false)
                })
        } else {
            const cacheKey = `historico:${matricula}`
            if (!forcarAtualizacao) {
                const cached = cacheGet(cacheKey)
                if (cached) {
                    setDados(cached.dados)
                    setProgressoGeral(cached.progresso)
                    setLoading(false)
                    return
                }
            }

            Promise.all([
                fetchJSON(`${API_URL}/api/aluno/historico-grafico/${matricula}`),
                fetchJSON(`${API_URL}/api/aluno/historico-diario/${matricula}`),
                fetchJSON(`${API_URL}/api/aluno/progresso/${matricula}`)
            ])
                .then(([mensal, diario, progresso]) => {
                    const dadosCompletos = { ...mensal, por_dia: diario.serie_diaria }
                    cacheSet(`historico:${matricula}`, { dados: dadosCompletos, progresso })
                    setDados(dadosCompletos)
                    setProgressoGeral(progresso)
                    setLoading(false)
                })
                .catch(err => {
                    setErro(`Erro ao carregar histórico: ${err.message}`)
                    setLoading(false)
                })
        }
    }, [matricula, temFiltros, dataInicio, dataFim, filtroMateria, filtroAcerto])

    useEffect(() => { buscarDados() }, [buscarDados])

    useEffect(() => {
        const handler = () => { cacheClear(`historico:${matricula}`); buscarDados(true) }
        window.addEventListener('focus', handler)
        return () => window.removeEventListener('focus', handler)
    }, [buscarDados, matricula])

    useEffect(() => {
        const s = localStorage.getItem('metaSemanal')
        if (s) setMetaSemanal(Number(s))
        const d = localStorage.getItem('metaDiaria')
        if (d) setMetaDiaria(Number(d))
    }, [])
    useEffect(() => { localStorage.setItem('metaSemanal', metaSemanal) }, [metaSemanal])
    useEffect(() => { localStorage.setItem('metaDiaria', metaDiaria) }, [metaDiaria])

    const limparFiltros = useCallback(() => {
        setDataInicio('')
        setDataFim('')
        setFiltroMateria('')
        setFiltroAcerto('')
    }, [])

    /* ─── Hooks calculados ─── */
    const constancia = useMemo(() => {
        if (!dados?.por_dia?.length) return { dias: 0, recorde: 0 }
        const dias = dados.por_dia.map(d => d.dia).sort().reverse()
        let consecutivos = 0, recorde = 0, atual = 0
        const hoje = dataLocalHoje()
        let dataRef = new Date(hoje + 'T12:00:00')
        for (let i = 0; i < 365; i++) {
            const dataStr = dataRef.toLocaleDateString('sv')
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

    const questoesHoje = useMemo(() => {
        if (!dados?.por_dia) return 0
        const hoje = dataLocalHoje()
        const diaHoje = dados.por_dia.find(d => d.dia === hoje)
        return diaHoje ? diaHoje.questoes : 0
    }, [dados])

    const ultimos7Dias = useMemo(() => {
        if (!dados?.por_dia) return []
        const hoje = new Date(dataLocalHoje() + 'T12:00:00')
        const dias = []
        for (let i = 6; i >= 0; i--) {
            const data = new Date(hoje)
            data.setDate(data.getDate() - i)
            const diaStr = data.toLocaleDateString('sv')
            const diaObj = dados.por_dia.find(d => d.dia === diaStr)
            dias.push({
                dia: data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
                questoes: diaObj ? diaObj.questoes : 0,
            })
        }
        return dias
    }, [dados])

    const progressoMeta = Math.min((questoesHoje / metaDiaria) * 100, 100)
    const questoesSemana = ultimos7Dias.reduce((acc, d) => acc + d.questoes, 0)
    const progressoSemanal = Math.min((questoesSemana / metaSemanal) * 100, 100)

    useEffect(() => {
        if (progressoMeta >= 100 && !metaJaCelebrada.current && !loading) {
            metaJaCelebrada.current = true
            setToast({ mensagem: `Meta diária atingida! ${questoesHoje} questões hoje! 🎯`, tipo: 'success' })
        }
    }, [progressoMeta, loading, questoesHoje])

    const dadosGraficoEvolucao = useMemo(() => {
        if (!dados?.por_dia) return []
        return dados.por_dia.map(d => ({
            ...d,
            label: new Date(d.dia + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        }))
    }, [dados])

    const assuntosReforcar = useMemo(() => {
        if (!dados?.por_assunto) return []
        // Se houver filtro de matéria, priorizamos esse assunto se ele estiver ruim
        let lista = dados.por_assunto
        if (filtroMateria) {
            const mNome = materias.find(m => m.id === parseInt(filtroMateria))?.nome
            if (mNome) {
                lista = lista.filter(a => a.assunto.toLowerCase().includes(mNome.toLowerCase()))
            }
        }
        return lista.filter(a => a.media_acerto < 60).slice(0, 5)
    }, [dados, filtroMateria, materias])

    const handleExportarCSV = () => {
        if (!dados) return
        const linhas = []
        if (dados.por_assunto?.length) {
            dados.por_assunto.forEach(a => linhas.push({ tipo: 'assunto', nome: a.assunto, questoes: a.questoes, media_acerto: a.media_acerto }))
        }
        if (dados.por_dia?.length) {
            dados.por_dia.forEach(d => linhas.push({ tipo: 'dia', nome: d.dia, questoes: d.questoes, media_acerto: d.media_acerto ?? '' }))
        }
        exportarCSV(linhas, `historico_${matricula}_${dataLocalHoje()}.csv`)
    }

    const handleShare = async () => {
        const texto = `📚 Meu progresso no Contabilidade Fácil:\n✅ ${dados?.resumo?.total_questoes ?? 0} questões\n🎯 Média: ${dados?.resumo?.media_geral}%\n🔥 Constância: ${constancia.dias} dias\n🏆 Recorde: ${constancia.recorde} dias\n📅 Última sessão: ${dados?.resumo?.ultima_sessao ? new Date(dados.resumo.ultima_sessao).toLocaleDateString('pt-BR') : '—'}\n\nVem estudar comigo!`
        if (navigator.share) {
            try { await navigator.share({ title: 'Meu progresso', text: texto, url: window.location.origin }) } catch { }
        } else {
            try { await navigator.clipboard.writeText(texto); setToast({ mensagem: '✅ Texto copiado para a área de transferência!', tipo: 'success' }) } catch { alert('Compartilhamento não suportado.') }
        }
    }

    const cardStyle = {
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        boxShadow: 'var(--color-shadow-sm)'
    }

    /* ─── Retornos condicionais ─── */
    if (erro) return <CAlert color="danger">{erro}</CAlert>

    const { resumo, por_dia, por_assunto } = dados || {}
    const ultima = resumo?.ultima_sessao ? new Date(resumo.ultima_sessao).toLocaleDateString('pt-BR') : '—'

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary font-sans p-4 md:p-8">
            <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

            {toast && <Toast mensagem={toast.mensagem} tipo={toast.tipo} onClose={() => setToast(null)} />}
            {modalSessoes && <ModalSessoes matricula={matricula} onClose={() => setModalSessoes(false)} />}

            <div className="max-w-5xl mx-auto">
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex-1"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest mb-3">
                            <Icon icon="solar:history-bold" width="14" />
                            Evolução Contínua
                        </div>
                        <h2 className="text-text-primary text-3xl md:text-5xl font-normal tracking-tight mb-2">
                            Meu Histórico <span className="font-serif italic text-primary">de Aprendizado</span>
                        </h2>
                        <p className="text-text-secondary font-medium text-sm md:text-base opacity-70">
                            Acompanhe sua evolução, analise seus pontos fortes e descubra onde focar seus estudos.
                        </p>
                    </motion.div>
                    <div className="d-flex gap-2 flex-wrap" style={{ alignSelf: 'flex-start' }}>
                        <CButton color="secondary" variant="outline" size="sm" className="premium-card py-2" onClick={() => setModalSessoes(true)}>
                            <CIcon icon={cilHistory} className="me-1" /> Sessões
                        </CButton>
                        <CButton color="success" variant="outline" size="sm" className="premium-card py-2" onClick={handleExportarCSV} disabled={!dados}>
                            <CIcon icon={cilDataTransferDown} className="me-1" /> CSV
                        </CButton>
                        <CButton color="primary" variant="outline" size="sm" className="premium-card py-2" onClick={handleShare}>
                            <CIcon icon={cilShare} className="me-1" /> Compartilhar
                        </CButton>
                    </div>
                </div>

                {/* Filtros */}
                <CCard className="mb-4" style={cardStyle}>
                    <CCardHeader style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 700 }}>
                        <CIcon icon={cilFilter} className="me-2" /> Filtros
                        {temFiltros && <CBadge color="primary" className="ms-2">Ativos</CBadge>}
                    </CCardHeader>
                    <CCardBody>
                        <CRow className="g-3 align-items-end">
                            <CCol xs={6} md={2}>
                                <CFormLabel>Data Início</CFormLabel>
                                <CFormInput type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                            </CCol>
                            <CCol xs={6} md={2}>
                                <CFormLabel>Data Fim</CFormLabel>
                                <CFormInput type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                            </CCol>
                            <CCol xs={6} md={3}>
                                <CFormLabel>Matéria</CFormLabel>
                                <CFormSelect value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)}>
                                    <option value="">Todas</option>
                                    {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                                </CFormSelect>
                            </CCol>
                            <CCol xs={6} md={3}>
                                <CFormLabel>Resultado</CFormLabel>
                                <CFormSelect value={filtroAcerto} onChange={e => setFiltroAcerto(e.target.value)}>
                                    <option value="">Todos</option>
                                    <option value="acerto">Acertos</option>
                                    <option value="erro">Erros</option>
                                </CFormSelect>
                            </CCol>
                            <CCol xs={12} md={2} className="d-flex align-items-end gap-2">
                                <CButton color="secondary" variant="outline" size="sm" onClick={limparFiltros} disabled={!temFiltros}>
                                    <CIcon icon={cilX} className="me-1" /> Limpar
                                </CButton>
                            </CCol>
                        </CRow>
                    </CCardBody>
                </CCard>

                {/* Ranking da Turma */}
                {ranking && !loading && (
                    <div className="stat-box mb-4 fade-in-up" style={{ animationDelay: '0.15s', borderLeft: '4px solid #f9b115' }}>
                        <div className="stat-icon-wrapper warning">
                            <CIcon icon={cilStar} />
                        </div>
                        <div className="stat-info flex-grow-1">
                            <div className="stat-desc">Seu Ranking na Turma</div>
                            <div className="stat-value">
                                {ranking.posicao}º lugar <small className="fw-normal text-body-tertiary">de {ranking.total_alunos} alunos</small>
                            </div>
                            <CProgress value={100 - ((ranking.posicao - 1) / ranking.total_alunos * 100)} color="warning" className="mt-2" />
                        </div>
                        <CBadge color={ranking.percentil >= 80 ? 'success' : ranking.percentil >= 50 ? 'warning' : 'danger'} shape="rounded-pill" className="fs-6 px-3 py-2 ms-auto">
                            Top {100 - ranking.percentil}%
                        </CBadge>
                    </div>
                )}

                {/* Progresso Geral */}
                <div className="premium-card mb-4 fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <div className="d-flex align-items-center gap-3">
                        {loading ? <Skeleton h={40} /> : (
                            <>
                                <div className="flex-grow-1">
                                    <h5 className="mb-2">📊 Progresso no Edital</h5>
                                    <CProgress value={progressoGeral?.percentual || 0} color="success" />
                                    <div className="d-flex justify-content-between mt-2">
                                        <small className="text-body-tertiary">{progressoGeral?.respondidas || 0} de {progressoGeral?.total || 0} questões</small>
                                        <span className="fw-bold text-success">{progressoGeral?.percentual || 0}%</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Mapa de Calor (Heatmap) */}
                <CCard className="mb-4" style={cardStyle}>
                    <CCardHeader style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 700 }}>
                        🔥 Mapa de Contribuição de Estudos
                    </CCardHeader>
                    <CCardBody style={{ overflowX: 'auto', padding: '16px 24px' }}>
                        {loading ? <Skeleton h={160} /> : <Heatmap data={dados?.por_dia} />}
                    </CCardBody>
                </CCard>

                {/* Cards principais */}
                <CRow className="g-3 mb-4">
                    <CCol xs={6} md={4} lg={3}>
                        <StatCard loading={loading} icon={cilChartLine} titulo="Constância nos Estudos" valor={`${constancia.dias} dias`} sub={`Recorde: ${constancia.recorde} dias`} cor="#2eb85c">
                            <CBadge color="success" shape="rounded-pill">{constancia.dias >= 7 ? '🔥 Excelente!' : '💪 Continue!'}</CBadge>
                        </StatCard>
                    </CCol>
                    <CCol xs={6} md={4} lg={3}>
                        <StatCard loading={loading} icon={cilCalendar} titulo="Estudo do Dia" valor={`${questoesHoje} questões`} sub={`Meta: ${metaDiaria} questões/dia`} cor="#7eb8f7">
                            <div className="d-flex align-items-center gap-2 mt-2">
                                <CButton color="link" size="sm" className="p-0 text-decoration-none fw-bold" onClick={() => setMostrarFinalizados(!mostrarFinalizados)}>
                                    {mostrarFinalizados ? 'OCULTAR' : 'MOSTRAR'}
                                </CButton>
                                {mostrarFinalizados && (
                                    <div style={{ flex: 1 }}>
                                        <CProgress value={progressoMeta} color={progressoMeta >= 100 ? 'success' : progressoMeta >= 50 ? 'warning' : 'danger'} height={8} className="mt-1" />
                                        <small className="text-body-secondary">{questoesHoje} de {metaDiaria} questões</small>
                                    </div>
                                )}
                            </div>
                        </StatCard>
                    </CCol>
                    <CCol xs={6} md={4} lg={3}>
                        <StatCard loading={loading} icon={cilClock} titulo="Tempo de Estudo" valor={formatarTempo((resumo?.tempo_medio_seg || 0) * (resumo?.total_sessoes || 0))} sub={`Média por sessão: ${formatarTempo(resumo?.tempo_medio_seg || 0)}`} cor="#f9b115" />
                    </CCol>
                    <CCol xs={6} md={4} lg={3}>
                        <StatCard loading={loading} icon={cilLibrary} titulo="Questões Respondidas" valor={resumo?.total_questoes || 0} sub={`Média: ${resumo?.media_geral || 0}%`} cor="#9d7ef7">
                            <span style={{ fontSize: 20 }}>{medalha(resumo?.media_geral || 0)}</span>
                        </StatCard>
                    </CCol>
                </CRow>

                {/* Assuntos para Reforçar */}
                {!loading && assuntosReforcar.length > 0 && (
                    <CCard className="mb-4" style={{ ...cardStyle, borderLeft: '4px solid #e55353' }}>
                        <CCardHeader style={{ background: 'transparent', border: 'none', color: '#e55353', fontWeight: 700 }}>
                            <CIcon icon={cilWarning} className="me-2" /> Estudar Hoje — Assuntos para Reforçar
                        </CCardHeader>
                        <CCardBody>
                            <CRow className="g-2">
                                {assuntosReforcar.map((a, i) => (
                                    <CCol key={i} xs={12} md={6}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: 'var(--color-bg-tertiary)',
                                            border: `1px solid var(--color-border)`,
                                            borderRadius: 8, padding: '10px 14px', gap: 10
                                        }}>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{a.assunto}</div>
                                                <CBadge color="danger" variant="outline">{a.media_acerto}% de acerto</CBadge>
                                            </div>
                                            <CButton color="danger" size="sm" variant="outline" onClick={() => window.location.href = `/#/quiz?assunto=${encodeURIComponent(a.assunto)}`}>Praticar</CButton>
                                        </div>
                                    </CCol>
                                ))}
                            </CRow>
                        </CCardBody>
                    </CCard>
                )}

                {/* Planejamento + Meta Semanal */}
                <CRow className="g-3 mb-4">
                    <CCol md={6}>
                        <CCard style={cardStyle}>
                            <CCardHeader style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 700 }}>📋 Planejamento do Dia</CCardHeader>
                            <CCardBody>
                                <div className="d-flex align-items-center gap-3 mb-3">
                                    <CFormLabel style={{ minWidth: 80 }}>Meta diária</CFormLabel>
                                    <CFormInput type="number" value={metaDiaria} onChange={e => setMetaDiaria(Number(e.target.value))} style={{ width: 80 }} />
                                    <CButton color="primary" variant="outline" size="sm" onClick={() => setMetaDiaria(v => v + 5)}><CIcon icon={cilPlus} /></CButton>
                                    <CButton color="primary" variant="outline" size="sm" onClick={() => setMetaDiaria(v => v - 5)} disabled={metaDiaria <= 5}><CIcon icon={cilMinus} /></CButton>
                                </div>
                                <CProgress value={progressoMeta} color={progressoMeta >= 100 ? 'success' : progressoMeta >= 50 ? 'warning' : 'danger'} height={24} className="rounded-pill">
                                    {questoesHoje} de {metaDiaria}
                                </CProgress>
                                <div className="text-end mt-2">
                                    <CButton color="primary" size="sm" onClick={() => window.location.href = '/#/quiz'}>🎯 Fazer Quiz</CButton>
                                </div>
                            </CCardBody>
                        </CCard>
                    </CCol>
                    <CCol md={6}>
                        <CCard style={cardStyle}>
                            <CCardHeader style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 700 }}>🎯 Meta Semanal</CCardHeader>
                            <CCardBody>
                                <div className="d-flex align-items-center gap-3 mb-3">
                                    <CFormLabel style={{ minWidth: 80 }}>Meta semanal</CFormLabel>
                                    <CFormInput type="number" value={metaSemanal} onChange={e => setMetaSemanal(Number(e.target.value))} style={{ width: 80 }} />
                                </div>
                                <CProgress value={progressoSemanal} color={progressoSemanal >= 100 ? 'success' : progressoSemanal >= 50 ? 'warning' : 'danger'} height={24} className="rounded-pill">
                                    {questoesSemana} de {metaSemanal}
                                </CProgress>
                            </CCardBody>
                        </CCard>
                    </CCol>
                </CRow>

                {/* Estudo Semanal */}
                <CCard className="mb-4" style={cardStyle}>
                    <CCardHeader style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 700 }}>📅 Estudo Semanal</CCardHeader>
                    <CCardBody>
                        {loading ? <Skeleton h={200} /> : ultimos7Dias.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={ultimos7Dias}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                    <XAxis dataKey="dia" stroke="var(--color-text-tertiary)" tick={{ fontSize: 12 }} />
                                    <YAxis stroke="var(--color-text-tertiary)" tick={{ fontSize: 12 }} />
                                    <Tooltip content={<TooltipCustom />} />
                                    <Bar dataKey="questoes" name="Questões" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-body-secondary">Sem dados no período.</p>
                        )}
                    </CCardBody>
                </CCard>

                {/* Gráfico de evolução */}
                {!loading && dadosGraficoEvolucao.length > 0 && (
                    <CCard className="mb-4" style={cardStyle}>
                        <CCardHeader style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 700 }}>📈 Evolução da Taxa de Acerto</CCardHeader>
                        <CCardBody>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={dadosGraficoEvolucao}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                    <XAxis dataKey="label" stroke="var(--color-text-tertiary)" tick={{ fontSize: 12 }} />
                                    <YAxis domain={[0, 100]} stroke="var(--color-text-tertiary)" tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                                    <Tooltip content={<TooltipCustom />} />
                                    <Line type="monotone" dataKey="media_acerto" name="Acerto (%)" stroke="#2eb85c" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CCardBody>
                    </CCard>
                )}

                {/* Tabela Desempenho por Assunto */}
                {!loading && por_assunto && por_assunto.length > 0 && (
                    <CCard style={cardStyle}>
                        <CCardHeader style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>📚 Desempenho por Assunto</span>
                            <CBadge color="secondary">{por_assunto.length} assuntos</CBadge>
                        </CCardHeader>
                        <CCardBody>
                            <CTable responsive hover>
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
                                        <CTableRow key={i} style={a.media_acerto < 60 ? { background: 'var(--color-bg-danger-subtle)' } : {}}>
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
                )}

                {loading && dados && (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                        <CSpinner color="primary" size="sm" /> <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Atualizando...</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default HistoricoAluno