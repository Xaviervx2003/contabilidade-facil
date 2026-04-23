import React, { useEffect, useState, useMemo } from 'react'
import {
    CCard,
    CCardBody,
    CCardHeader,
    CCol,
    CContainer,
    CRow,
    CTable,
    CTableBody,
    CTableDataCell,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
    CBadge,
    CSpinner,
    CAlert,
    CButton,
    CFormInput,
    CButtonGroup,
    CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash, cilCheckCircle, cilSearch, cilPencil, cilBullhorn } from '@coreui/icons'
import { API_URL } from '../../config'
import { useNavigate } from 'react-router-dom'

const FeedbacksQuestoes = () => {
    const [feedbacks, setFeedbacks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [filtroStatus, setFiltroStatus] = useState('pendente')
    const [busca, setBusca] = useState('')
    const navigate = useNavigate()

    // Contagem de pendentes para o badge
    const pendentes = useMemo(() => feedbacks.filter(f => !f.resolvido).length, [feedbacks])
    const resolvidos = useMemo(() => feedbacks.filter(f => f.resolvido).length, [feedbacks])

    const fetchFeedbacks = async (status, textoBusca) => {
        setLoading(true)
        setError('')
        try {
            const params = new URLSearchParams()
            if (status && status !== 'todos') params.set('status', status)
            if (textoBusca) params.set('busca', textoBusca)
            const qs = params.toString() ? `?${params.toString()}` : ''

            const res = await fetch(`${API_URL}/api/feedbacks_questoes${qs}`)
            if (!res.ok) throw new Error('Falha ao carregar os feedbacks')
            const data = await res.json()
            setFeedbacks(data)
        } catch (err) {
            setError('Não foi possível conectar ao servidor para buscar os feedbacks.')
        } finally {
            setLoading(false)
        }
    }

    // Marcar como resolvido (sem deletar!)
    const handleResolver = async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/feedbacks_questoes/${id}/resolver`, {
                method: 'PATCH',
            })
            if (!res.ok) throw new Error('Erro ao resolver')
            // Atualiza localmente
            setFeedbacks(prev =>
                prev.map(item =>
                    item.id === id
                        ? { ...item, resolvido: true, resolvido_em: new Date().toLocaleString('pt-BR') }
                        : item
                )
            )
        } catch (err) {
            alert('Não foi possível marcar como resolvido. Tente novamente.')
        }
    }

    // Deletar permanentemente
    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja APAGAR permanentemente este feedback?')) return
        try {
            const res = await fetch(`${API_URL}/api/feedbacks_questoes/${id}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Erro ao deletar')
            setFeedbacks(prev => prev.filter(item => item.id !== id))
        } catch (err) {
            alert('Não foi possível apagar o feedback. Tente novamente.')
        }
    }

    // Tornar Público ou Privado
    const handlePublicar = async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/feedbacks_questoes/${id}/publicar`, {
                method: 'PATCH',
            })
            if (!res.ok) throw new Error('Erro ao alternar publicação')
            const data = await res.json()
            setFeedbacks(prev =>
                prev.map(item =>
                    item.id === id ? { ...item, publico: data.publico } : item
                )
            )
        } catch (err) {
            alert('Não foi possível alterar a publicação do feedback. Tente novamente.')
        }
    }

    // Exportar feedbacks como CSV
    const handleExportCSV = () => {
        if (feedbacks.length === 0) return
        const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`
        const header = 'Data,Aluno,Questao ID,Enunciado,Comentario,Status,Tipo'
        const rows = feedbacks.map(f =>
            [
                escape(f.data_criacao),
                escape(f.nome_aluno),
                f.questao_id,
                escape(f.enunciado_questao),
                escape(f.texto),
                f.resolvido ? 'Resolvido' : 'Pendente',
                f.marcada_confusa ? 'Confusa' : 'Duvida',
            ].join(',')
        )
        const csv = '\uFEFF' + header + '\n' + rows.join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `feedbacks_${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    useEffect(() => {
        fetchFeedbacks(filtroStatus, busca)
    }, [filtroStatus])

    // Debounce na busca
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchFeedbacks(filtroStatus, busca)
        }, 400)
        return () => clearTimeout(timer)
    }, [busca])

    return (
        <CContainer fluid>
            <CRow>
                <CCol xs={12}>
                    <CCard className="mb-4">
                        <CCardHeader>
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div className="d-flex align-items-center gap-2">
                                    <strong>Caixa de Entrada — Feedbacks dos Alunos</strong>
                                    {pendentes > 0 && (
                                        <CBadge color="danger" shape="rounded-pill">
                                            {pendentes} pendente{pendentes > 1 ? 's' : ''}
                                        </CBadge>
                                    )}
                                </div>
                                <div className="d-flex gap-2 flex-wrap">
                                    <CButton
                                        color="success"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleExportCSV}
                                        disabled={feedbacks.length === 0}
                                    >
                                        📥 Exportar CSV
                                    </CButton>
                                    <CButton
                                        color="primary"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => fetchFeedbacks(filtroStatus, busca)}
                                    >
                                        🔄 Atualizar
                                    </CButton>
                                </div>
                            </div>

                            {/* Barra de filtros */}
                            <div className="d-flex justify-content-between align-items-center mt-3 gap-3 flex-wrap">
                                <CButtonGroup size="sm">
                                    <CButton
                                        color={filtroStatus === 'pendente' ? 'warning' : 'light'}
                                        onClick={() => setFiltroStatus('pendente')}
                                    >
                                        🔴 Pendentes
                                    </CButton>
                                    <CButton
                                        color={filtroStatus === 'resolvido' ? 'success' : 'light'}
                                        onClick={() => setFiltroStatus('resolvido')}
                                    >
                                        ✅ Resolvidos
                                    </CButton>
                                    <CButton
                                        color={filtroStatus === 'todos' ? 'primary' : 'light'}
                                        onClick={() => setFiltroStatus('todos')}
                                    >
                                        📋 Todos
                                    </CButton>
                                </CButtonGroup>

                                <div className="position-relative" style={{ minWidth: '250px', maxWidth: '350px', flex: 1 }}>
                                    <CFormInput
                                        type="text"
                                        size="sm"
                                        placeholder="Buscar por aluno, comentário ou enunciado..."
                                        value={busca}
                                        onChange={(e) => setBusca(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CCardHeader>

                        <CCardBody>
                            {error && <CAlert color="danger">{error}</CAlert>}

                            {loading ? (
                                <div className="text-center py-5">
                                    <CSpinner color="primary" />
                                    <p className="mt-2 text-muted">Carregando mensagens...</p>
                                </div>
                            ) : feedbacks.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <h5>
                                        {filtroStatus === 'pendente'
                                            ? 'Nenhum feedback pendente! 🎉'
                                            : filtroStatus === 'resolvido'
                                                ? 'Nenhum feedback resolvido encontrado.'
                                                : 'Nenhum feedback recebido ainda!'}
                                    </h5>
                                    <p>As mensagens e dúvidas dos alunos aparecerão aqui.</p>
                                </div>
                            ) : (
                                <CTable hover responsive align="middle" className="border">
                                    <CTableHead color="light">
                                        <CTableRow>
                                            <CTableHeaderCell>Data</CTableHeaderCell>
                                            <CTableHeaderCell>Aluno</CTableHeaderCell>
                                            <CTableHeaderCell>Questão Relacionada</CTableHeaderCell>
                                            <CTableHeaderCell>Comentário</CTableHeaderCell>
                                            <CTableHeaderCell className="text-center">Tipo</CTableHeaderCell>
                                            <CTableHeaderCell className="text-center">Status</CTableHeaderCell>
                                            <CTableHeaderCell className="text-center">Ações</CTableHeaderCell>
                                        </CTableRow>
                                    </CTableHead>
                                    <CTableBody>
                                        {feedbacks.map((item) => (
                                            <CTableRow
                                                key={item.id}
                                                style={item.resolvido ? { opacity: 0.6 } : {}}
                                            >
                                                {/* Data */}
                                                <CTableDataCell className="small text-muted" style={{ whiteSpace: 'nowrap' }}>
                                                    {item.data_criacao}
                                                </CTableDataCell>

                                                {/* Aluno */}
                                                <CTableDataCell>
                                                    <div className="fw-bold text-primary">
                                                        {item.nome_aluno ? item.nome_aluno.toUpperCase() : "ALUNO NÃO IDENTIFICADO"}
                                                    </div>
                                                </CTableDataCell>

                                                {/* Questão */}
                                                <CTableDataCell style={{ minWidth: '280px' }}>
                                                    <div className="d-flex flex-column gap-1">
                                                        <CBadge color="dark" shape="rounded-pill" className="align-self-start">
                                                            ID #{item.questao_id}
                                                        </CBadge>
                                                        <div className="small text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                            {item.enunciado_questao
                                                                ? (item.enunciado_questao.length > 120
                                                                    ? item.enunciado_questao.substring(0, 120) + '...'
                                                                    : item.enunciado_questao)
                                                                : <span className="text-danger">Enunciado indisponível</span>}
                                                        </div>
                                                    </div>
                                                </CTableDataCell>

                                                {/* Comentário */}
                                                <CTableDataCell>
                                                    {item.texto ? (
                                                        <span className="fst-italic">"{item.texto}"</span>
                                                    ) : (
                                                        <span className="text-muted fst-italic small">Sem comentário em texto</span>
                                                    )}
                                                </CTableDataCell>

                                                {/* Tipo */}
                                                <CTableDataCell className="text-center">
                                                    {item.marcada_confusa ? (
                                                        <CBadge color="warning" shape="rounded-pill">⚠️ Confusa</CBadge>
                                                    ) : (
                                                        <CBadge color="info" shape="rounded-pill">💬 Dúvida</CBadge>
                                                    )}
                                                </CTableDataCell>

                                                {/* Status */}
                                                <CTableDataCell className="text-center">
                                                    {item.resolvido ? (
                                                        <CTooltip content={`Resolvido em ${item.resolvido_em || '—'}`}>
                                                            <CBadge color="success" shape="rounded-pill">✅ Resolvido</CBadge>
                                                        </CTooltip>
                                                    ) : (
                                                        <CBadge color="danger" shape="rounded-pill">🔴 Pendente</CBadge>
                                                    )}
                                                </CTableDataCell>

                                                {/* Ações */}
                                                <CTableDataCell className="text-center">
                                                    <div className="d-flex justify-content-center gap-1">
                                                        {!item.resolvido && (
                                                            <CTooltip content="Marcar como resolvido">
                                                                <CButton
                                                                    color="success"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleResolver(item.id)}
                                                                >
                                                                    <CIcon icon={cilCheckCircle} />
                                                                </CButton>
                                                            </CTooltip>
                                                        )}
                                                        <CTooltip content="Editar Questão">
                                                            <CButton
                                                                color="info"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => navigate(`/questoes?busca=${item.questao_id}`)}
                                                            >
                                                                <CIcon icon={cilPencil} />
                                                            </CButton>
                                                        </CTooltip>
                                                        <CTooltip content={item.publico ? "Ocultar da Comunidade" : "Tornar Público (Comunidade)"}>
                                                            <CButton
                                                                color={item.publico ? "success" : "warning"}
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handlePublicar(item.id)}
                                                            >
                                                                <CIcon icon={cilBullhorn} />
                                                            </CButton>
                                                        </CTooltip>
                                                        <CTooltip content="Excluir permanentemente">
                                                            <CButton
                                                                color="danger"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(item.id)}
                                                            >
                                                                <CIcon icon={cilTrash} />
                                                            </CButton>
                                                        </CTooltip>
                                                    </div>
                                                </CTableDataCell>
                                            </CTableRow>
                                        ))}
                                    </CTableBody>
                                </CTable>
                            )}
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>
        </CContainer>
    )
}

export default FeedbacksQuestoes