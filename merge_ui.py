import os

file_minhas = r'painel-admin\src\views\aluno\MinhasQuestoes.jsx'
file_feedbacks = r'painel-admin\src\views\aluno\MeusFeedbacks.jsx'

with open(file_minhas, 'r', encoding='utf-8') as f:
    mq = f.read()

with open(file_feedbacks, 'r', encoding='utf-8') as f:
    mf = f.read()

# 1. Imports
mq = mq.replace("import React, { useState, useEffect, useCallback, useRef } from 'react'", 
                "import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'\nimport { useQuery, useQueryClient } from '@tanstack/react-query'\nimport { useReducedMotion } from 'framer-motion'\nimport { CFormSelect } from '@coreui/react'")

# 2. Components from MeusFeedbacks
# Extract Skeleton, FeedbackSkeleton, StatCard, FAQItem
start_idx = mf.find("// ── Skeleton Loader ─────────────────────────────────────────────")
end_idx = mf.find("const MeusFeedbacks = () => {")

components_code = mf[start_idx:end_idx]
# Insert components before MinhasQuestoes
mq = mq.replace("const MinhasQuestoes = () => {", components_code + "\nconst MinhasQuestoes = () => {")

# 3. Add states and logic to MinhasQuestoes
logic_insertion = """
    // ==== TABS ====
    const [activeTab, setActiveTab] = useState('historico') // 'historico' | 'feedbacks'
    const queryClient = useQueryClient()
    const shouldReduceMotion = useReducedMotion()

    // ==== FEEDBACKS LOGIC ====
    const [searchFeedbacks, setSearchFeedbacks] = useState('')
    
    const { data: feedbacks = [], isLoading: loadingFeedbacks } = useQuery({
        queryKey: ['meusFeedbacks', matricula],
        queryFn: async () => {
            addDebugLog(`Carregando feedbacks para matrícula: ${matricula}...`, 'info')
            const res = await fetch(`${API_URL}/api/aluno/meus-feedbacks-v2?por_pagina=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
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
    
    const { data: questoesResolvidas = [], isLoading: loadingQuestoes } = useQuery({
        queryKey: ['questoes-resolvidas-form', matricula],
        queryFn: async () => {
            const res = await fetch(
                `${API_URL}/api/aluno/questoes-respondidas?matricula=${matricula}&por_pagina=30`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            )
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
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
        fetch(`${API_URL}/api/feedbacks_questoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                questao_id: selectedQuestaoParaDuvida || null,
                nome_aluno: nome || 'Aluno',
                texto: textoDuvida,
                marcada_confusa: marcadaConfusa
            })
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
        })
        .then(resData => {
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

"""
mq = mq.replace("const nome = sessionStorage.getItem('nome')", logic_insertion + "const nome = sessionStorage.getItem('nome')")

# 4. Inject Tabs UI and conditional rendering
tabs_ui = """
                    {/* TABS DE NAVEGAÇÃO */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: `1px solid ${tokens.border}`, paddingBottom: 16 }}>
                        <div 
                            onClick={() => setActiveTab('historico')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: 20,
                                cursor: 'pointer',
                                fontWeight: 800,
                                fontSize: 14,
                                background: activeTab === 'historico' ? 'var(--color-text-primary)' : 'transparent',
                                color: activeTab === 'historico' ? 'var(--color-bg-primary)' : tokens.foggy,
                                transition: 'all 0.2s'
                            }}
                        >
                            📝 Histórico de Resoluções
                        </div>
                        <div 
                            onClick={() => setActiveTab('feedbacks')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: 20,
                                cursor: 'pointer',
                                fontWeight: 800,
                                fontSize: 14,
                                background: activeTab === 'feedbacks' ? 'var(--color-text-primary)' : 'transparent',
                                color: activeTab === 'feedbacks' ? 'var(--color-bg-primary)' : tokens.foggy,
                                transition: 'all 0.2s'
                            }}
                        >
                            💬 Meus Feedbacks
                        </div>
                    </div>

"""

# Wrap the metrics and feed
# First find the start of KPIs
mq = mq.replace("{/* CARDS DE METRICAS (KPIs) */}", tabs_ui + "{activeTab === 'historico' && (\n                        <>\n                            {/* CARDS DE METRICAS (KPIs) */}")
# Then find the end of Pagination
mq = mq.replace("</CPagination>\n                                </div>\n                            )}\n                        </>\n                    )}", "</CPagination>\n                                </div>\n                            )}\n                        </>\n                    )}\n                        </>\n                    )}")

# 5. Add Feedbacks UI block
feedbacks_ui = """
                    {activeTab === 'feedbacks' && (
                        <div className="fade-in">
                            <div className="mb-4 d-flex flex-column lg:flex-row justify-content-between gap-4">
                                <div className="d-flex flex-wrap gap-3 w-100 lg:w-auto">
                                    <StatCard icon="solar:document-text-linear" label="Total" value={stats.total} color={tokens.rausch} />
                                    <StatCard icon="solar:check-circle-linear" label="Respondidos" value={stats.resolvidos} color={tokens.babu} />
                                    <StatCard icon="solar:clock-circle-linear" label="Em Aberto" value={stats.pendentes} color={tokens.arches} />
                                </div>
                            </div>

                            <div className="d-flex flex-column flex-md-row gap-3 align-items-center mb-4">
                                <div style={{ position: 'relative', flex: 1, width: '100%' }}>
                                    <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: tokens.foggy }}>
                                        <Icon icon="solar:magnifer-linear" width="20" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar dúvidas..."
                                        className="w-100"
                                        style={{
                                            background: tokens.bg, border: `1px solid ${tokens.border}`,
                                            borderRadius: 16, padding: '14px 16px 14px 44px',
                                            fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', outline: 'none'
                                        }}
                                        value={searchFeedbacks}
                                        onChange={(e) => setSearchFeedbacks(e.target.value)}
                                    />
                                </div>
                                <CButton
                                    onClick={abrirNovaPergunta}
                                    style={{
                                        background: tokens.rausch, color: '#fff', border: 'none',
                                        borderRadius: 16, padding: '14px 24px', fontWeight: 800, fontSize: 13,
                                        display: 'flex', alignItems: 'center', gap: 8
                                    }}
                                >
                                    <Icon icon="solar:chat-round-plus-bold" width="20" /> Mande sua Dúvida
                                </CButton>
                            </div>

                            {loadingFeedbacks ? (
                                <div className="grid grid-cols-1 gap-1">
                                    {[...Array(3)].map((_, i) => <FeedbackSkeleton key={i} />)}
                                </div>
                            ) : filteredFeedbacks.length === 0 ? (
                                <div style={{ background: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: 24, padding: '50px 20px', textAlign: 'center' }}>
                                    Nenhum feedback encontrado.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {filteredFeedbacks.map((item, idx) => (
                                        <FAQItem
                                            key={item.id} item={item} index={idx}
                                            isOpen={expandedId === item.id}
                                            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                            onRevisarQuestao={abrirRevisao}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
"""

# Insert right after the end of historico wrapping block
mq = mq.replace("</>\n                    )}\n                        </>\n                    )}", "</>\n                    )}\n                        </>\n                    )}\n" + feedbacks_ui)

# 6. Append the Nova Pergunta Form Modal
nova_pergunta_modal = """
            <CModal visible={formModalOpen} onClose={() => setFormModalOpen(false)} size="md" backdrop="static">
                <div style={{ fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
                    <CModalHeader closeButton style={{ borderBottom: `1px solid ${tokens.border}` }}>
                        <CModalTitle style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>Mande sua Dúvida</CModalTitle>
                    </CModalHeader>
                    <form onSubmit={handleSubmitNovaPergunta}>
                        <CModalBody>
                            {duvidaMessage && <CAlert color={duvidaMessage.tipo} className="mb-3">{duvidaMessage.texto}</CAlert>}
                            <div className="mb-3">
                                <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tokens.foggy }}>Sobre qual questão é sua dúvida? (Opcional)</CFormLabel>
                                <CFormSelect
                                    value={selectedQuestaoParaDuvida}
                                    onChange={e => setSelectedQuestaoParaDuvida(e.target.value)}
                                    style={{ borderRadius: 12, background: tokens.bg, color: 'var(--color-text-primary)' }}
                                >
                                    <option value="">Geral / Outro Assunto</option>
                                    {questoesResolvidas.map(q => (
                                        <option key={q.questao_id} value={q.questao_id}>Questão #{q.questao_id} — {q.materia}</option>
                                    ))}
                                </CFormSelect>
                            </div>
                            <div className="mb-3">
                                <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tokens.foggy }}>Dúvida/Sugestão</CFormLabel>
                                <CFormTextarea rows={4} value={textoDuvida} onChange={e => setTextoDuvida(e.target.value)} required />
                            </div>
                            <div style={{ background: `${tokens.rausch}05`, border: `1px dashed ${tokens.rausch}30`, borderRadius: 16, padding: 16 }}>
                                <CFormCheck id="marcadaConfusaGeral" label="Marcar como CONFUSA (Possível erro no gabarito)" checked={marcadaConfusa} onChange={e => setMarcadaConfusa(e.target.checked)} />
                            </div>
                        </CModalBody>
                        <CModalFooter>
                            <CButton color="secondary" onClick={() => setFormModalOpen(false)}>Cancelar</CButton>
                            <CButton type="submit" style={{ background: tokens.rausch, color: '#fff', border: 'none' }} disabled={submittingDuvida}>
                                {submittingDuvida ? <CSpinner size="sm" /> : 'Enviar Pergunta'}
                            </CButton>
                        </CModalFooter>
                    </form>
                </div>
            </CModal>
"""

mq = mq.replace("{/* MODAL DE REVISÃO DETALHADA */}", nova_pergunta_modal + "\n            {/* MODAL DE REVISÃO DETALHADA */}")

with open(file_minhas, 'w', encoding='utf-8') as f:
    f.write(mq)

print("Merge concluído!")
