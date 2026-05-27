import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useReducedMotion } from 'framer-motion'
import api from '../../../services/api'
import { getAlunoMatricula } from '../../../utils/auth'
import useAuthSession from '../../../hooks/useAuthSession'

export const useMinhasQuestoesLogic = () => {
    const { nome, matricula: matriculaSessao, token } = useAuthSession()
    const matricula = getAlunoMatricula() || matriculaSessao

    // Estados principais de listagem
    const [dados, setDados] = useState({ questoes: [], total: 0, total_paginas: 1 })
    const [loading, setLoading] = useState(true)
    const [pagina, setPagina] = useState(1)
    const [filtroAcerto, setFiltroAcerto] = useState('')
    const [filtroMateria, setFiltroMateria] = useState('')
    const [materias, setMaterias] = useState([])
    const porPagina = 12

    // Estados de Métricas
    const { data: metrics, isLoading: loadingMetrics } = useQuery({
        queryKey: ['metricas-estudante', matricula],
        queryFn: async () => {
            if (!matricula) throw new Error('Matrícula não encontrada')
            const res = await api.get(`/api/metricas-estudantes/desempenho/${matricula}`)
            return res.data
        },
        enabled: !!matricula && !!token,
        staleTime: 1000 * 60 * 5, // 5 minutos de cache
    })

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

    // Estados do Modal de Dúvida Integrada (Helpdesk)
    const [duvidaModalOpen, setDuvidaModalOpen] = useState(false)
    const [textoDuvida, setTextoDuvida] = useState('')
    const [marcadaConfusa, setMarcadaConfusa] = useState(false)
    const [submittingDuvida, setSubmittingDuvida] = useState(false)
    const [duvidaMessage, setDuvidaMessage] = useState(null)

    
    // ==== TABS ====
    const [activeTab, setActiveTab] = useState('historico') // 'historico' | 'feedbacks'
    const queryClient = useQueryClient()
    const shouldReduceMotion = useReducedMotion()

    // ==== FEEDBACKS LOGIC ====
    const [searchFeedbacks, setSearchFeedbacks] = useState('')
    const [expandedId, setExpandedId] = useState(null)
    
    const { data: feedbacks = [], isLoading: loadingFeedbacks } = useQuery({
        queryKey: ['meusFeedbacks', matricula],
        queryFn: async () => {
            addDebugLog(`Carregando feedbacks para matrícula: ${matricula}...`, 'info')
            const { data } = await api.get(`/api/aluno/meus-feedbacks-v2?por_pagina=50`)
            return data.feedbacks || []
        },
        enabled: !!matricula && !!token && activeTab === 'feedbacks',
        staleTime: 1000 * 60 * 2,
    })

    const stats = useMemo(() => {
        const total = feedbacks.length
        const resolvidos = feedbacks.filter(f => f.resolvido).length
        const pendentes = total - resolvidos
        return { total, resolvidos, pendentes }
    }, [feedbacks])

    const filteredFeedbacks = useMemo(() => {
        if (!searchFeedbacks) return feedbacks
        const s = searchFeedbacks.toLowerCase()
        return feedbacks.filter(f => 
            (f.enunciado && f.enunciado.toLowerCase().includes(s)) || 
            (f.texto && f.texto.toLowerCase().includes(s)) ||
            String(f.questao_id).includes(s)
        )
    }, [searchFeedbacks, feedbacks])

    // Nova Pergunta Independente
    const [formModalOpen, setFormModalOpen] = useState(false)
    const [selectedQuestaoParaDuvida, setSelectedQuestaoParaDuvida] = useState('')
    
    const { data: questoesResolvidas = [] } = useQuery({
        queryKey: ['questoes-resolvidas-form', matricula],
        queryFn: async () => {
            const { data } = await api.get(
                `/api/aluno/questoes-respondidas?matricula=${matricula}&por_pagina=30`
            )
            return data.questoes || []
        },
        enabled: formModalOpen && !!matricula && !!token,
        staleTime: 1000 * 60 * 5,
    })

    const abrirNovaPergunta = () => {
        setDuvidaMessage(null)
        setTextoDuvida('')
        setMarcadaConfusa(false)
        setSelectedQuestaoParaDuvida('')
        setFormModalOpen(true)
    }

    const handleSubmitNovaPergunta = (e) => {
        e.preventDefault()
        if (!textoDuvida.trim()) {
            setDuvidaMessage({ tipo: 'danger', texto: 'Escreva sua dúvida.' })
            return
        }
        setSubmittingDuvida(true)
        api.post(`/api/feedbacks_questoes`, {
            questao_id: selectedQuestaoParaDuvida || null,
            nome_aluno: nome || 'Aluno',
            texto: textoDuvida,
            marcada_confusa: marcadaConfusa
        })
        .then(res => {
            const resData = res.data
            setSubmittingDuvida(false)
            if (resData.sucesso || resData.id) {
                setDuvidaMessage({ tipo: 'success', texto: 'Dúvida enviada com sucesso!' })
                queryClient.invalidateQueries(['meusFeedbacks', matricula])
                closeTimerRef.current = setTimeout(() => {
                    setFormModalOpen(false)
                    setTextoDuvida('')
                    setDuvidaMessage(null)
                    setActiveTab('feedbacks')
                }, 1500)
            } else {
                setDuvidaMessage({ tipo: 'danger', texto: resData.mensagem || 'Erro ao enviar.' })
            }
        }).catch(err => {
            setSubmittingDuvida(false)
            setDuvidaMessage({ tipo: 'danger', texto: 'Erro de conexão.' })
        })
    }


    // ── Diagnóstico (apenas em desenvolvimento) ────────────────────────
    const [debugLogs, setDebugLogs] = useState([])
    const [showDebugPanel, setShowDebugPanel] = useState(false)
    // useCallback: função estável — não recriada em cada render
    const addDebugLog = useCallback((msg, type = 'info') => {
        setDebugLogs(prev => [...prev.slice(-49), { time: new Date().toLocaleTimeString(), msg, type }])
        if (import.meta.env.DEV) console.log(`[Diagnostic] [${type}] ${msg}`)
    }, [])

    // ── Ref para cleanup do setTimeout (evita setState em componente desmontado) ──
    const closeTimerRef = useRef(null)

    // Submissão de dúvida integrada
    const handleSubmitDuvida = (e) => {
        e.preventDefault()
        if (!textoDuvida.trim()) {
            setDuvidaMessage({ tipo: 'danger', texto: 'Escreva a sua dúvida ou sugestão.' })
            return
        }

        addDebugLog(`Iniciando submissão de dúvida para questão #${selectedQuestaoId}...`, 'info')
        setSubmittingDuvida(true)
        setDuvidaMessage(null)

        api.post(`/api/feedbacks_questoes`, {
            questao_id: selectedQuestaoId,
            nome_aluno: nome || 'Aluno Anônimo',
            texto: textoDuvida,
            marcada_confusa: marcadaConfusa
        })
        .then(res => {
            addDebugLog(`API respondeu com sucesso`, 'success')
            const resData = res.data
            setSubmittingDuvida(false)
            if (resData.sucesso || resData.id) {
                addDebugLog('Dúvida enviada com sucesso ao banco de dados!', 'success')
                setDuvidaMessage({ tipo: 'success', texto: 'Dúvida enviada com sucesso ao professor!' })
                // Salvar ref do timer para cleanup seguro
                closeTimerRef.current = setTimeout(() => {
                    setDuvidaModalOpen(false)
                    setTextoDuvida('')
                    setMarcadaConfusa(false)
                    setDuvidaMessage(null)
                }, 1800)
            } else {
                addDebugLog(`API retornou falha lógica: ${resData.mensagem}`, 'error')
                setDuvidaMessage({ tipo: 'danger', texto: resData.mensagem || 'Erro ao enviar dúvida.' })
            }
        })
        .catch(err => {
            addDebugLog(`Erro na requisição: ${err.message}`, 'error')
            setSubmittingDuvida(false)
            setDuvidaMessage({ tipo: 'danger', texto: 'Erro de conexão ao enviar.' })
        })
    }

    // Limpar timer ao desmontar o componente
    useEffect(() => {
        return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current) }
    }, [])

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
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [activeDropdown])

    useEffect(() => {
        api.get(`/api/admin/materias`)
            .then(res => setMaterias(Array.isArray(res.data) ? res.data : []))
            .catch(() => { })
    }, [])

    // Carregar métricas removido (agora gerenciado pelo useQuery lá no topo)

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

        api.get(`/api/aluno/questoes-respondidas?${params.toString()}`)
            .then(res => res.data)
            .then(data => {
                setDados(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [matricula, pagina, filtroAcerto, filtroMateria, token])

    useEffect(() => {
        carregarQuestoes()
    }, [carregarQuestoes])

    // Carregar detalhes completos de uma questão ao abrir o modal
    useEffect(() => {
        if (!selectedQuestaoId) return
        setLoadingDetail(true)
        setErrorDetail(null)

        api.get(`/api/questoes?ids=${selectedQuestaoId}`)
            .then(res => res.data)
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
                if (import.meta.env.DEV) console.error('[MinhasQuestoes] Erro ao carregar detalhe:', err)
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

  return {
    matricula,
    dados,
    setDados,
    loading,
    setLoading,
    pagina,
    setPagina,
    filtroAcerto,
    setFiltroAcerto,
    filtroMateria,
    setFiltroMateria,
    materias,
    setMaterias,
    porPagina,
    metrics,
    loadingMetrics,
    activeDropdown,
    setActiveDropdown,
    buscaMateria,
    setBuscaMateria,
    dropdownStatusRef,
    dropdownMateriaRef,
    selectedQuestaoId,
    setSelectedQuestaoId,
    questaoDetail,
    setQuestaoDetail,
    loadingDetail,
    setLoadingDetail,
    modalOpen,
    setModalOpen,
    errorDetail,
    setErrorDetail,
    duvidaModalOpen,
    setDuvidaModalOpen,
    textoDuvida,
    setTextoDuvida,
    marcadaConfusa,
    setMarcadaConfusa,
    submittingDuvida,
    setSubmittingDuvida,
    duvidaMessage,
    setDuvidaMessage,
    activeTab,
    setActiveTab,
    queryClient,
    shouldReduceMotion,
    searchFeedbacks,
    setSearchFeedbacks,
    expandedId,
    setExpandedId,
    stats,
    filteredFeedbacks,
    formModalOpen,
    setFormModalOpen,
    selectedQuestaoParaDuvida,
    setSelectedQuestaoParaDuvida,
    questoesResolvidas,
    abrirNovaPergunta,
    handleSubmitNovaPergunta,
    debugLogs,
    setDebugLogs,
    showDebugPanel,
    setShowDebugPanel,
    addDebugLog,
    closeTimerRef,
    handleSubmitDuvida,
        carregarQuestoes,
    abrirRevisao,
    obterRotuloStatus,
    obterRotuloMateria,
    materiasFiltradas
  }
}

export default useMinhasQuestoesLogic
