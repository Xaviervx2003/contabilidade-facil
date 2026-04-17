import React, { useEffect, useState } from 'react'
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
    CButton
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'
import { API_URL } from '../../config'

const FeedbacksQuestoes = () => {
    // 1. Estados sempre dentro do componente
    const [feedbacks, setFeedbacks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // 2. Função de busca (única)
    const fetchFeedbacks = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`${API_URL}/api/feedbacks_questoes`)
            if (!res.ok) throw new Error('Falha ao carregar os feedbacks')

            const data = await res.json()
            console.log("Dados recebidos:", data)
            setFeedbacks(data)

        } catch (err) {
            setError('Não foi possível conectar ao servidor para buscar os feedbacks.')
        } finally {
            setLoading(false)
        }
    }

    // 3. Função de Deletar/Resolver Feedback
    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja apagar este feedback?')) return

        try {
            const res = await fetch(`${API_URL}/api/feedbacks_questoes/${id}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Erro ao deletar')

            // Remove o item da tela instantaneamente
            setFeedbacks(feedbacks.filter(item => item.id !== id))
        } catch (err) {
            alert('Não foi possível apagar o feedback. Tente novamente.')
        }
    }

    // 4. Executa na primeira carga da página
    useEffect(() => {
        fetchFeedbacks()
    }, [])

    return (
        <CContainer fluid>
            <CRow>
                <CCol xs={12}>
                    <CCard className="mb-4">
                        <CCardHeader className="d-flex justify-content-between align-items-center">
                            <strong>Caixa de Entrada — Feedbacks dos Alunos</strong>
                            <CButton color="primary" size="sm" variant="outline" onClick={fetchFeedbacks}>
                                🔄 Atualizar
                            </CButton>
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
                                    <h5>Nenhum feedback recebido ainda! 🎉</h5>
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
                                            <CTableHeaderCell className="text-center">Status</CTableHeaderCell>
                                            <CTableHeaderCell className="text-center">Ações</CTableHeaderCell>
                                        </CTableRow>
                                    </CTableHead>
                                    <CTableBody>
                                        {feedbacks.map((item) => (
                                            <CTableRow key={item.id}>
                                                {/* Coluna 1: Data */}
                                                <CTableDataCell className="small text-muted" style={{ whiteSpace: 'nowrap' }}>
                                                    {item.data_criacao}
                                                </CTableDataCell>

                                                {/* Coluna 2: Aluno (Destacado) */}
                                                <CTableDataCell>
                                                    <div className="fw-bold text-primary">
                                                        {item.nome_aluno ? item.nome_aluno.toUpperCase() : "ALUNO NÃO IDENTIFICADO"}
                                                    </div>
                                                </CTableDataCell>

                                                {/* Coluna 3: Questão (ID no Badge, Texto visível inteiro) */}
                                                <CTableDataCell style={{ minWidth: '300px' }}>
                                                    <div className="d-flex flex-column gap-2">
                                                        <div>
                                                            <CBadge color="dark" shape="rounded-pill">
                                                                ID #{item.questao_id}
                                                            </CBadge>
                                                        </div>
                                                        <div className="small text-muted" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                            {item.enunciado_questao ? item.enunciado_questao : <span className="text-danger">Enunciado indisponível</span>}
                                                        </div>
                                                    </div>
                                                </CTableDataCell>

                                                {/* Coluna 4: Comentário */}
                                                <CTableDataCell>
                                                    {item.texto ? (
                                                        <span className="fst-italic">"{item.texto}"</span>
                                                    ) : (
                                                        <span className="text-muted fst-italic small">Sem comentário em texto</span>
                                                    )}
                                                </CTableDataCell>

                                                {/* Coluna 5: Status */}
                                                <CTableDataCell className="text-center">
                                                    {item.marcada_confusa ? (
                                                        <CBadge color="warning" shape="rounded-pill">⚠️ Confusa</CBadge>
                                                    ) : (
                                                        <CBadge color="info" shape="rounded-pill">💬 Dúvida</CBadge>
                                                    )}
                                                </CTableDataCell>

                                                {/* Coluna 6: Botão Deletar */}
                                                <CTableDataCell className="text-center">
                                                    <CButton
                                                        color="danger"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(item.id)}
                                                        title="Excluir/Resolver"
                                                    >
                                                        <CIcon icon={cilTrash} />
                                                    </CButton>
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