import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
    CContainer,
    CRow,
    CCol,
    CSpinner,
    CAlert,
    CButton,
    CPagination,
    CPaginationItem,
    CModal,
    CModalHeader,
    CModalTitle,
    CModalBody,
    CModalFooter,
    CBadge,
} from '@coreui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { API_URL } from '../../config'
import { getAlunoMatricula } from '../../utils/auth'

/* ── Tokens de Design (Premium Airbnb Style) ────────────── */
const tokens = {
    rausch: '#FF385C',  // Coral principal
    babu: '#00A699',    // Teal/Verde
    arches: '#FC642D',  // Laranja
    hof: '#484848',
    foggy: '#767676',   // Cinza Muted
    border: 'var(--color-border)',
    bg: 'var(--color-bg-elevated)',
    bgSub: 'var(--color-bg-tertiary)',
    text: 'var(--color-text-primary)',
}

const MinhasQuestoes = () => {
    // Estados principais de listagem
    const [dados, setDados] = useState({ questoes: [], total: 0, total_paginas: 1 })
    const [loading, setLoading] = useState(true)
    const [pagina, setPagina] = useState(1)
    const [filtroAcerto, setFiltroAcerto] = useState('')
    const [filtroMateria, setFiltroMateria] = useState('')
    const [materias, setMaterias] = useState([])
    const porPagina = 12

    // Estados de Métricas
    const [metrics, setMetrics] = useState(null)
    const [loadingMetrics, setLoadingMetrics] = useState(true)

    // Estados dos Custom Dropdowns (Airbnb Style)
    const [activeDropdown, setActiveDropdown] = useState(null) // 'status' ou 'materia' ou null
    const [buscaMateria, setBuscaMateria] = useState('')
    
    // Refs para fechar ao clicar fora
    const dropdownStatusRef = useRef(null)
    const dropdownMateriaRef = useRef(null)

    // Estados do Modal de Detalhes da Questão
    const [selectedQuestaoId, setSelectedQuestaoId] = useState(null)
    const [questaoDetail, setQuestaoDetail] = useState(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [errorDetail, setErrorDetail] = useState(null)

    const matricula = getAlunoMatricula() || sessionStorage.getItem('matricula')

    // Fechar dropdowns ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeDropdown === 'status' && dropdownStatusRef.current && !dropdownStatusRef.current.contains(event.target)) {
                setActiveDropdown(null)
            }
            if (activeDropdown === 'materia' && dropdownMateriaRef.current && !dropdownMateriaRef.current.contains(event.target)) {
                setActiveDropdown(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [activeDropdown])

    // Carregar matérias para os filtros
    useEffect(() => {
        fetch(`${API_URL}/api/admin/materias`)
            .then(res => res.json())
            .then(data => setMaterias(Array.isArray(data) ? data : []))
            .catch(() => { })
    }, [])

    // Carregar métricas de performance do estudante
    useEffect(() => {
        if (!matricula) return
        setLoadingMetrics(true)
        const token = sessionStorage.getItem('token')
        
        fetch(`${API_URL}/api/metricas-estudantes/desempenho/${matricula}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            setMetrics(data)
            setLoadingMetrics(false)
        })
        .catch(() => setLoadingMetrics(false))
    }, [matricula])

    // Carregar lista de questões respondidas com paginação e filtros
    const carregarQuestoes = useCallback(() => {
        if (!matricula) return
        setLoading(true)
        const params = new URLSearchParams({
            matricula,
            pagina,
            por_pagina: porPagina,
        })
        if (filtroAcerto) params.set('acerto', filtroAcerto)
        if (filtroMateria) params.set('materia_id', filtroMateria)

        fetch(`${API_URL}/api/aluno/questoes-respondidas?${params.toString()}`)
            .then(res => {
                if (!res.ok) throw new Error('Erro na requisição')
                return res.json()
            })
            .then(data => {
                setDados(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [matricula, pagina, filtroAcerto, filtroMateria])

    useEffect(() => {
        carregarQuestoes()
    }, [carregarQuestoes])

    // Carregar detalhes completos de uma questão ao abrir o modal
    useEffect(() => {
        if (!selectedQuestaoId) return
        setLoadingDetail(true)
        setErrorDetail(null)

        fetch(`${API_URL}/api/questoes?ids=${selectedQuestaoId}`)
            .then(res => {
                if (!res.ok) throw new Error('Erro ao carregar detalhes')
                return res.json()
            })
            .then(resData => {
                const questaoLista = resData.dados?.data || resData.dados || resData || []
                if (questaoLista.length > 0) {
                    setQuestaoDetail(questaoLista[0])
                } else {
                    setErrorDetail('Questão não encontrada.')
                }
                setLoadingDetail(false)
            })
            .catch(err => {
                console.error(err)
                setErrorDetail('Erro ao carregar detalhes da questão.')
                setLoadingDetail(false)
            })
    }, [selectedQuestaoId])

    const abrirRevisao = (id) => {
        setSelectedQuestaoId(id)
        setQuestaoDetail(null)
        setModalOpen(true)
    }

    const { questoes, total, total_paginas } = dados

    // Rótulo amigável do status de acerto
    const obterRotuloStatus = () => {
        if (filtroAcerto === 'acerto') return 'Apenas Acertos ✅'
        if (filtroAcerto === 'erro') return 'Apenas Erros ❌'
        return 'Todas as resoluções'
    }

    // Rótulo amigável da matéria selecionada
    const obterRotuloMateria = () => {
        if (!filtroMateria) return 'Todas as matérias'
        const mat = materias.find(m => String(m.id) === String(filtroMateria))
        return mat ? mat.nome : 'Todas as matérias'
    }

    // Filtrar matérias na busca interna do dropdown
    const materiasFiltradas = materias.filter(m => 
        m.nome.toLowerCase().includes(buscaMateria.toLowerCase())
    )

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
                        <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>Sua Performance</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>Minhas Questões 📝</div>
                        <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
                            Acompanhe seu histórico detalhado de resoluções e revise explicações com apoio em vídeo.
                        </div>
                    </motion.div>

                    {/* CARDS DE METRICAS (KPIs) */}
                    <CRow className="g-4 mb-4">
                        <CCol xs={12} sm={4}>
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                                style={{
                                    background: tokens.bg,
                                    border: `1px solid ${tokens.border}`,
                                    borderRadius: 20,
                                    padding: 20,
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16
                                }}
                            >
                                <div style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    background: `${tokens.rausch}15`, color: tokens.rausch,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon icon="solar:pen-bold-duotone" width="24" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: tokens.foggy, fontWeight: 700, textTransform: 'uppercase' }}>QUESTÕES RESOLVIDAS</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text-primary)', marginTop: 2 }}>
                                        {loadingMetrics ? <CSpinner size="sm" color="danger" /> : (metrics?.questoes ?? total)}
                                    </div>
                                </div>
                            </motion.div>
                        </CCol>

                        <CCol xs={12} sm={4}>
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                style={{
                                    background: tokens.bg,
                                    border: `1px solid ${tokens.border}`,
                                    borderRadius: 20,
                                    padding: 20,
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16
                                }}
                            >
                                <div style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    background: `${tokens.babu}15`, color: tokens.babu,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon icon="solar:target-bold-duotone" width="24" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: tokens.foggy, fontWeight: 700, textTransform: 'uppercase' }}>TAXA DE ACERTO MÉDIA</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text-primary)', marginTop: 2 }}>
                                        {loadingMetrics ? <CSpinner size="sm" color="success" /> : `${metrics?.media_numero ?? 0}%`}
                                    </div>
                                </div>
                            </motion.div>
                        </CCol>

                        <CCol xs={12} sm={4}>
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                style={{
                                    background: tokens.bg,
                                    border: `1px solid ${tokens.border}`,
                                    borderRadius: 20,
                                    padding: 20,
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16
                                }}
                            >
                                <div style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    background: `${tokens.arches}15`, color: tokens.arches,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon icon="solar:playback-speed-bold-duotone" width="24" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: tokens.foggy, fontWeight: 700, textTransform: 'uppercase' }}>SESSÕES DE ESTUDO</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text-primary)', marginTop: 2 }}>
                                        {loadingMetrics ? <CSpinner size="sm" color="warning" /> : (metrics?.sessoes ?? 0)}
                                    </div>
                                </div>
                            </motion.div>
                        </CCol>
                    </CRow>

                    {/* FILTROS EXCLUSIVOS AIRBNB STYLE */}
                    <div style={{ position: 'relative', zIndex: 10 }}>
                        <div className="d-flex flex-column flex-md-row gap-3 align-items-center mb-4">
                            
                            {/* Segmento 1: Status de Acertos */}
                            <div 
                                ref={dropdownStatusRef}
                                style={{ flex: 1, width: '100%', position: 'relative' }}
                            >
                                <div 
                                    onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                                    style={{
                                        background: tokens.bg,
                                        border: `1px solid ${activeDropdown === 'status' ? tokens.rausch : tokens.border}`,
                                        borderRadius: 20,
                                        padding: '12px 20px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: 9, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status da Resolução</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 2 }}>
                                            {obterRotuloStatus()}
                                        </div>
                                    </div>
                                    <Icon 
                                        icon="solar:alt-arrow-down-bold" 
                                        style={{ color: tokens.foggy, transition: 'transform 0.2s', transform: activeDropdown === 'status' ? 'rotate(180deg)' : 'none' }} 
                                        width="14"
                                    />
                                </div>

                                <AnimatePresence>
                                    {activeDropdown === 'status' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute',
                                                top: '108%',
                                                left: 0,
                                                width: '100%',
                                                background: tokens.bg,
                                                border: `1px solid ${tokens.border}`,
                                                borderRadius: 18,
                                                boxShadow: '0 12px 36px rgba(0,0,0,0.1)',
                                                padding: 10,
                                                zIndex: 99,
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {/* Option 1: Todas */}
                                                <div 
                                                    onClick={() => { setFiltroAcerto(''); setPagina(1); setActiveDropdown(null) }}
                                                    style={{
                                                        padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        background: filtroAcerto === '' ? 'var(--color-bg-tertiary)' : 'transparent',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <Icon icon="solar:checklist-bold-duotone" style={{ color: tokens.foggy }} width="18" />
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Todas as resoluções</span>
                                                </div>

                                                {/* Option 2: Acertos */}
                                                <div 
                                                    onClick={() => { setFiltroAcerto('acerto'); setPagina(1); setActiveDropdown(null) }}
                                                    style={{
                                                        padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        background: filtroAcerto === 'acerto' ? 'var(--color-bg-tertiary)' : 'transparent',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <Icon icon="solar:check-circle-bold-duotone" style={{ color: tokens.babu }} width="18" />
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Apenas Acertos</span>
                                                </div>

                                                {/* Option 3: Erros */}
                                                <div 
                                                    onClick={() => { setFiltroAcerto('erro'); setPagina(1); setActiveDropdown(null) }}
                                                    style={{
                                                        padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        background: filtroAcerto === 'erro' ? 'var(--color-bg-tertiary)' : 'transparent',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <Icon icon="solar:bill-cross-bold-duotone" style={{ color: tokens.rausch }} width="18" />
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Apenas Erros</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Segmento 2: Matéria Relacionada */}
                            <div 
                                ref={dropdownMateriaRef}
                                style={{ flex: 1, width: '100%', position: 'relative' }}
                            >
                                <div 
                                    onClick={() => setActiveDropdown(activeDropdown === 'materia' ? null : 'materia')}
                                    style={{
                                        background: tokens.bg,
                                        border: `1px solid ${activeDropdown === 'materia' ? tokens.rausch : tokens.border}`,
                                        borderRadius: 20,
                                        padding: '12px 20px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: 9, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Matéria Relacionada</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 280 }}>
                                            {obterRotuloMateria()}
                                        </div>
                                    </div>
                                    <Icon 
                                        icon="solar:alt-arrow-down-bold" 
                                        style={{ color: tokens.foggy, transition: 'transform 0.2s', transform: activeDropdown === 'materia' ? 'rotate(180deg)' : 'none' }} 
                                        width="14"
                                    />
                                </div>

                                <AnimatePresence>
                                    {activeDropdown === 'materia' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute',
                                                top: '108%',
                                                right: 0,
                                                width: '100%',
                                                minWidth: 280,
                                                background: tokens.bg,
                                                border: `1px solid ${tokens.border}`,
                                                borderRadius: 18,
                                                boxShadow: '0 12px 36px rgba(0,0,0,0.1)',
                                                padding: 14,
                                                zIndex: 99,
                                            }}
                                        >
                                            {/* Busca Interna estilo Airbnb */}
                                            <div style={{ position: 'relative', marginBottom: 12 }}>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar matéria..."
                                                    value={buscaMateria}
                                                    onChange={e => setBuscaMateria(e.target.value)}
                                                    onClick={e => e.stopPropagation()} // Impede fechar ao clicar na busca
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px 10px 36px',
                                                        borderRadius: 12,
                                                        border: `1px solid ${tokens.border}`,
                                                        background: tokens.bgSub,
                                                        color: 'var(--color-text-primary)',
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        outline: 'none'
                                                    }}
                                                />
                                                <Icon 
                                                    icon="solar:magnifer-linear" 
                                                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: tokens.foggy }} 
                                                    width="16"
                                                />
                                            </div>

                                            {/* Lista Scrollável */}
                                            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
                                                {/* Opção Todas */}
                                                <div 
                                                    onClick={() => { setFiltroMateria(''); setPagina(1); setActiveDropdown(null); setBuscaMateria('') }}
                                                    style={{
                                                        padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                        background: filtroMateria === '' ? 'var(--color-bg-tertiary)' : 'transparent',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <Icon icon="solar:book-bookmark-bold-duotone" style={{ color: tokens.foggy }} width="16" />
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Todas as matérias</span>
                                                </div>

                                                {/* Lista Filtrada */}
                                                {materiasFiltradas.length === 0 ? (
                                                    <div style={{ textAlign: 'center', color: tokens.foggy, fontSize: 11, padding: '10px 0' }}>
                                                        Nenhuma matéria encontrada.
                                                    </div>
                                                ) : (
                                                    materiasFiltradas.map(m => {
                                                        const isSelected = String(filtroMateria) === String(m.id)
                                                        return (
                                                            <div 
                                                                key={m.id}
                                                                onClick={() => { setFiltroMateria(String(m.id)); setPagina(1); setActiveDropdown(null); setBuscaMateria('') }}
                                                                style={{
                                                                    padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                                    background: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                                                                    transition: 'background 0.2s'
                                                                }}
                                                            >
                                                                <Icon icon="solar:notebook-bold-duotone" style={{ color: isSelected ? tokens.rausch : tokens.foggy }} width="16" />
                                                                <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? tokens.rausch : 'var(--color-text-primary)' }}>
                                                                    {m.nome}
                                                                </span>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {/* FEED DE QUESTÕES */}
                    {loading ? (
                        <div className="text-center py-5">
                            <CSpinner color="danger" />
                            <p className="mt-3 text-body-secondary" style={{ fontWeight: 600 }}>Carregando suas resoluções...</p>
                        </div>
                    ) : (
                        <>
                            {questoes.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{
                                        background: tokens.bg,
                                        border: `1px solid ${tokens.border}`,
                                        borderRadius: 24,
                                        padding: '50px 20px',
                                        textAlign: 'center'
                                    }}
                                >
                                    <Icon icon="solar:document-bold-duotone" width="48" style={{ color: tokens.foggy, marginBottom: 16 }} />
                                    <h5 style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>Nenhuma questão resolvida encontrada</h5>
                                    <p style={{ color: tokens.foggy, fontSize: 13, maxWidth: 400, margin: '8px auto 0' }}>
                                        Tente alterar os filtros ou comece a praticar resolvendo quizes do sistema!
                                    </p>
                                </motion.div>
                            ) : (
                                <CRow className="g-3">
                                    <AnimatePresence mode="popLayout">
                                        {questoes.map((item, idx) => {
                                            const statusCor = item.acertou ? tokens.babu : tokens.rausch
                                            const statusBg = item.acertou ? `${tokens.babu}15` : `${tokens.rausch}15`
                                            return (
                                                <CCol xs={12} md={6} key={item.questao_id || idx}>
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 12 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.2 }}
                                                        whileHover={{ y: -2 }}
                                                        style={{
                                                            background: tokens.bg,
                                                            border: `1px solid ${tokens.border}`,
                                                            borderRadius: 20,
                                                            padding: 20,
                                                            boxShadow: '0 4px 20px rgba(0,0,0,0.01)',
                                                            height: '100%',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            justifyContent: 'space-between',
                                                            gap: 16
                                                        }}
                                                    >
                                                        <div>
                                                            {/* Card Header Info */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                                <span style={{ fontSize: 10, color: tokens.foggy, fontWeight: 800 }}>
                                                                    ID: #{item.questao_id}
                                                                </span>
                                                                <span style={{
                                                                    fontSize: 11, fontWeight: 800,
                                                                    background: statusBg, color: statusCor,
                                                                    padding: '4px 10px', borderRadius: 99
                                                                }}>
                                                                    {item.acertou ? 'Acertou ✅' : 'Errou ❌'}
                                                                </span>
                                                            </div>

                                                            {/* Enunciado */}
                                                            <p style={{
                                                                fontSize: 14, fontWeight: 700,
                                                                color: 'var(--color-text-primary)',
                                                                lineHeight: 1.5,
                                                                marginBottom: 10,
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 3,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis'
                                                            }}>
                                                                {item.enunciado}
                                                            </p>

                                                            {/* Tags */}
                                                            <div className="d-flex flex-wrap gap-1 mt-2">
                                                                <span style={{ background: tokens.bgSub, color: tokens.foggy, padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>
                                                                    {item.materias}
                                                                </span>
                                                                {item.assunto && item.assunto !== 'Sem assunto' && (
                                                                    <span style={{ background: tokens.bgSub, color: tokens.foggy, padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                                                                        {item.assunto}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Footer Row */}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${tokens.border}`, paddingTop: 12, marginTop: 4 }}>
                                                            <span style={{ fontSize: 11, color: tokens.foggy, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <Icon icon="solar:calendar-linear" />
                                                                {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : 'Sem data'}
                                                            </span>

                                                            <CButton
                                                                onClick={() => abrirRevisao(item.questao_id)}
                                                                style={{
                                                                    background: `${tokens.babu}15`, color: tokens.babu, border: 'none',
                                                                    borderRadius: 10, padding: '6px 12px',
                                                                    fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <Icon icon="solar:eye-bold" /> Revisar
                                                            </CButton>
                                                        </div>
                                                    </motion.div>
                                                </CCol>
                                            )
                                        })}
                                    </AnimatePresence>
                                </CRow>
                            )}

                            {/* PAGINAÇÃO PREMIUM */}
                            {total_paginas > 1 && (
                                <div className="d-flex justify-content-center mt-5">
                                    <CPagination style={{ gap: 4 }}>
                                        <CPaginationItem 
                                            disabled={pagina === 1} 
                                            onClick={() => setPagina(p => p - 1)}
                                            style={{ cursor: pagina === 1 ? 'not-allowed' : 'pointer' }}
                                        >
                                            Anterior
                                        </CPaginationItem>
                                        {[...Array(total_paginas)].map((_, i) => {
                                            const isActive = pagina === i + 1
                                            return (
                                                <CPaginationItem 
                                                    key={i} 
                                                    active={isActive} 
                                                    onClick={() => setPagina(i + 1)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        background: isActive ? tokens.rausch : 'transparent',
                                                        borderColor: isActive ? tokens.rausch : 'var(--color-border)',
                                                        color: isActive ? '#fff' : 'var(--color-text-primary)',
                                                        fontWeight: 700,
                                                        borderRadius: 8
                                                    }}
                                                >
                                                    {i + 1}
                                                </CPaginationItem>
                                            )
                                        })}
                                        <CPaginationItem 
                                            disabled={pagina === total_paginas} 
                                            onClick={() => setPagina(p => p + 1)}
                                            style={{ cursor: pagina === total_paginas ? 'not-allowed' : 'pointer' }}
                                        >
                                            Próxima
                                        </CPaginationItem>
                                    </CPagination>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </CContainer>

            {/* MODAL DE REVISÃO DETALHADA */}
            <CModal 
                visible={modalOpen} 
                onClose={() => setModalOpen(false)} 
                size="lg"
                backdrop="static"
                style={{ fontFamily: "'Nunito', sans-serif" }}
            >
                <CModalHeader style={{ borderBottom: `1px solid ${tokens.border}` }}>
                    <CModalTitle style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon icon="solar:document-bold" style={{ color: tokens.rausch }} />
                        Detalhes da Questão #{selectedQuestaoId}
                    </CModalTitle>
                </CModalHeader>
                <CModalBody style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
                    {loadingDetail ? (
                        <div className="text-center py-5">
                            <CSpinner color="danger" />
                            <p className="mt-3 text-body-secondary" style={{ fontWeight: 600 }}>Carregando dados da questão...</p>
                        </div>
                    ) : errorDetail ? (
                        <CAlert color="danger" className="d-flex align-items-center gap-2">
                            <Icon icon="solar:danger-bold-duotone" width="20" />
                            <span>{errorDetail}</span>
                        </CAlert>
                    ) : questaoDetail ? (
                        <div>
                            {/* Tags da Questão */}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                                {questaoDetail.banca && (
                                    <CBadge color="light" className="text-dark" style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700 }}>
                                        Banca: {questaoDetail.banca}
                                    </CBadge>
                                )}
                                {questaoDetail.ano && (
                                    <CBadge color="light" className="text-dark" style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700 }}>
                                        Ano: {questaoDetail.ano}
                                    </CBadge>
                                )}
                                {questaoDetail.dificuldade && (
                                    <CBadge color="light" className="text-dark" style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700 }}>
                                        Dificuldade: {questaoDetail.dificuldade}
                                    </CBadge>
                                )}
                                {questaoDetail.assunto && (
                                    <CBadge color="danger" style={{ background: `${tokens.rausch}15`, color: tokens.rausch, padding: '6px 10px', fontSize: 10, fontWeight: 700 }}>
                                        {questaoDetail.assunto}
                                    </CBadge>
                                )}
                            </div>

                            {/* Enunciado Integral */}
                            <div style={{ background: tokens.bgSub, borderRadius: 16, padding: 20, border: `1px solid ${tokens.border}`, marginBottom: 24 }}>
                                <h6 style={{ fontWeight: 800, fontSize: 12, color: tokens.foggy, textTransform: 'uppercase', marginBottom: 8 }}>Enunciado da Questão</h6>
                                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {questaoDetail.question}
                                </p>
                            </div>

                            {/* Alternativas */}
                            <h6 style={{ fontWeight: 800, fontSize: 12, color: tokens.foggy, textTransform: 'uppercase', marginBottom: 12 }}>Alternativas Cadastradas</h6>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                                {questaoDetail.options?.map((opcao, idx) => {
                                    const letra = String.fromCharCode(65 + idx) // A, B, C, D, E
                                    const ehCorreta = letra === questaoDetail.answer?.toUpperCase()
                                    
                                    return (
                                        <div 
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 12,
                                                padding: '14px 16px',
                                                borderRadius: 14,
                                                background: ehCorreta ? `${tokens.babu}10` : 'transparent',
                                                border: `1px solid ${ehCorreta ? tokens.babu : tokens.border}`,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{
                                                width: 24, height: 24, borderRadius: '50%',
                                                background: ehCorreta ? tokens.babu : tokens.bgSub,
                                                color: ehCorreta ? '#fff' : tokens.foggy,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, fontWeight: 800, flexShrink: 0
                                            }}>
                                                {letra}
                                            </span>
                                            <div style={{ 
                                                fontSize: 13, 
                                                fontWeight: ehCorreta ? 700 : 600, 
                                                color: ehCorreta ? tokens.babu : 'var(--color-text-primary)',
                                                lineHeight: 1.4
                                            }}>
                                                {opcao}
                                            </div>
                                            {ehCorreta && (
                                                <Icon 
                                                    icon="solar:check-circle-bold" 
                                                    style={{ color: tokens.babu, marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 }} 
                                                    width="18" 
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Explicação Teórica do Professor */}
                            {questaoDetail.explicacao && (
                                <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 16, padding: 20, border: `1px solid ${tokens.border}`, marginBottom: 24 }}>
                                    <h6 style={{ fontWeight: 800, fontSize: 12, color: tokens.foggy, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Icon icon="solar:lightbulb-bold-duotone" style={{ color: tokens.arches }} />
                                        Explicação do Professor
                                    </h6>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                                        {questaoDetail.explicacao}
                                    </p>
                                </div>
                            )}

                            {/* Resolução em Vídeo */}
                            {questaoDetail.link_video && (
                                <div style={{ background: `${tokens.rausch}08`, borderRadius: 16, padding: 20, border: `1px dashed ${tokens.rausch}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                        <div>
                                            <h6 style={{ fontWeight: 800, fontSize: 13, color: tokens.rausch, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Icon icon="solar:videocamera-record-bold-duotone" />
                                                Resolução em Vídeo Disponível!
                                            </h6>
                                            <p style={{ fontSize: 11, color: tokens.foggy, margin: 0 }}>
                                                Assista à explicação detalhada desta questão explicada passo a passo.
                                            </p>
                                        </div>
                                        <CButton 
                                            href={questaoDetail.link_video}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                background: tokens.rausch, color: '#fff', border: 'none',
                                                borderRadius: 12, padding: '8px 16px',
                                                fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
                                                boxShadow: '0 4px 10px rgba(255, 56, 92, 0.15)'
                                            }}
                                        >
                                            <Icon icon="solar:play-bold" /> Assistir Resolução
                                        </CButton>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </CModalBody>
                <CModalFooter style={{ borderTop: `1px solid ${tokens.border}` }}>
                    <CButton 
                        color="secondary" 
                        onClick={() => setModalOpen(false)}
                        style={{ borderRadius: 10, fontWeight: 700, fontSize: 12 }}
                    >
                        Fechar Revisão
                    </CButton>
                </CModalFooter>
            </CModal>
        </div>
    )
}

export default MinhasQuestoes