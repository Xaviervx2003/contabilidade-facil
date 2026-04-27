import React, { useEffect, useState } from 'react'
import {
    CCard,
    CCardBody,
    CCardHeader,
    CTable,
    CTableBody,
    CTableDataCell,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
    CPagination,
    CPaginationItem,
    CSpinner,
    CBadge,
    CAlert,
} from '@coreui/react'
import { API_URL } from '../../config'

const MeusFeedbacks = () => {
    const [dados, setDados] = useState({ feedbacks: [], total: 0, total_paginas: 1 })
    const [loading, setLoading] = useState(true)
    const [pagina, setPagina] = useState(1)
    const [expandedId, setExpandedId] = useState(null)
    const porPagina = 10

    const nome = sessionStorage.getItem('nome')

    useEffect(() => {
        if (!nome) return
        setLoading(true)
        setExpandedId(null)
        fetch(`${API_URL}/api/aluno/meus-feedbacks/${encodeURIComponent(nome)}?pagina=${pagina}&por_pagina=${porPagina}`)
            .then(res => {
                if (!res.ok) throw new Error('Erro na requisição')
                return res.json()
            })
            .then(data => {
                setDados(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [nome, pagina])

    const { feedbacks, total, total_paginas } = dados

    const toggleExpand = (id) => {
        setExpandedId(prev => prev === id ? null : id)
    }

    if (!nome) {
        return <CAlert color="warning">Faça login para ver seus feedbacks.</CAlert>
    }

    return (
        <div className="p-3 p-md-4">
            <h3 className="mb-4">💬 Meus Feedbacks</h3>
            <p className="text-body-secondary mb-4">
                Aqui estão as dúvidas que você enviou durante os quizzes e as respostas dos professores.{' '}
                <strong>Clique em "Ver resposta" para expandir a mensagem completa.</strong>
            </p>

            <CCard>
                <CCardHeader className="d-flex justify-content-between align-items-center">
                    <strong>Total: {total} feedbacks</strong>
                </CCardHeader>
                <CCardBody>
                    {loading ? (
                        <div className="text-center py-5"><CSpinner color="primary" /></div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <CTable hover>
                                    <CTableHead>
                                        <CTableRow>
                                            <CTableHeaderCell>#</CTableHeaderCell>
                                            <CTableHeaderCell>Questão</CTableHeaderCell>
                                            <CTableHeaderCell>Minha Dúvida</CTableHeaderCell>
                                            <CTableHeaderCell className="text-center">Tipo</CTableHeaderCell>
                                            <CTableHeaderCell className="text-center">Status</CTableHeaderCell>
                                            <CTableHeaderCell className="text-center">Resposta do Professor</CTableHeaderCell>
                                            <CTableHeaderCell className="text-center">Data</CTableHeaderCell>
                                        </CTableRow>
                                    </CTableHead>
                                    <CTableBody>
                                        {feedbacks.length === 0 ? (
                                            <CTableRow>
                                                <CTableDataCell colSpan={7} className="text-center py-4 text-body-secondary">
                                                    Você ainda não enviou nenhuma dúvida.
                                                </CTableDataCell>
                                            </CTableRow>
                                        ) : (
                                            feedbacks.map((item, idx) => (
                                                <React.Fragment key={item.id}>

                                                    {/* ── linha principal ── */}
                                                    <CTableRow>
                                                        <CTableDataCell>
                                                            {(pagina - 1) * porPagina + idx + 1}
                                                        </CTableDataCell>

                                                        {/* questão — truncada com tooltip */}
                                                        <CTableDataCell>
                                                            <div
                                                                className="fw-medium"
                                                                title={item.enunciado}
                                                                style={{
                                                                    maxWidth: 250,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }}
                                                            >
                                                                {item.enunciado}
                                                            </div>
                                                        </CTableDataCell>

                                                        {/* dúvida — quebra palavra longa */}
                                                        <CTableDataCell>
                                                            <div style={{
                                                                maxWidth: 200,
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'break-word',
                                                            }}>
                                                                {item.texto || '—'}
                                                            </div>
                                                        </CTableDataCell>

                                                        <CTableDataCell className="text-center">
                                                            {item.marcada_confusa ? (
                                                                <CBadge color="warning">⚠️ Confusa</CBadge>
                                                            ) : (
                                                                <CBadge color="info">💬 Dúvida</CBadge>
                                                            )}
                                                        </CTableDataCell>

                                                        <CTableDataCell className="text-center">
                                                            {item.resolvido ? (
                                                                <CBadge color="success">✅ Resolvido</CBadge>
                                                            ) : (
                                                                <CBadge color="secondary">⏳ Pendente</CBadge>
                                                            )}
                                                        </CTableDataCell>

                                                        {/* botão expandir / texto sem resposta */}
                                                        <CTableDataCell className="text-center">
                                                            {item.resposta_professor ? (
                                                                <button
                                                                    onClick={() => toggleExpand(item.id)}
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    style={{ whiteSpace: 'nowrap' }}
                                                                >
                                                                    {expandedId === item.id ? '▲ Fechar' : '▼ Ver resposta'}
                                                                </button>
                                                            ) : (
                                                                <span className="text-body-secondary">—</span>
                                                            )}
                                                        </CTableDataCell>

                                                        <CTableDataCell className="text-center">
                                                            {new Date(item.data).toLocaleDateString('pt-BR')}
                                                        </CTableDataCell>
                                                    </CTableRow>

                                                    {/* ── linha expandida com resposta completa ── */}
                                                    {expandedId === item.id && item.resposta_professor && (
                                                        <CTableRow>
                                                            <CTableDataCell
                                                                colSpan={7}
                                                                style={{
                                                                    padding: '0 16px 16px 16px',
                                                                    background: 'var(--cui-tertiary-bg, rgba(0,0,0,0.02))',
                                                                }}
                                                            >
                                                                <div style={{ paddingTop: 14 }}>
                                                                    <div
                                                                        className="fw-semibold mb-2"
                                                                        style={{ fontSize: 13 }}
                                                                    >
                                                                        👨‍🏫 Resposta do Professor
                                                                    </div>
                                                                    <div
                                                                        style={{
                                                                            background: 'var(--cui-body-bg)',
                                                                            border: '1px solid var(--cui-border-color)',
                                                                            borderLeft: '3px solid var(--cui-primary)',
                                                                            borderRadius: '0 8px 8px 0',
                                                                            padding: '12px 16px',
                                                                            fontSize: 14,
                                                                            lineHeight: 1.65,
                                                                            /* fixes do overflow */
                                                                            whiteSpace: 'pre-wrap',
                                                                            wordBreak: 'break-word',
                                                                            overflowWrap: 'break-word',
                                                                        }}
                                                                    >
                                                                        {item.resposta_professor}
                                                                    </div>
                                                                </div>
                                                            </CTableDataCell>
                                                        </CTableRow>
                                                    )}

                                                </React.Fragment>
                                            ))
                                        )}
                                    </CTableBody>
                                </CTable>
                            </div>

                            {total_paginas > 1 && (
                                <div className="d-flex justify-content-center mt-3">
                                    <CPagination>
                                        <CPaginationItem
                                            disabled={pagina === 1}
                                            onClick={() => setPagina(p => p - 1)}
                                        >
                                            Anterior
                                        </CPaginationItem>
                                        {[...Array(total_paginas)].map((_, i) => (
                                            <CPaginationItem
                                                key={i}
                                                active={pagina === i + 1}
                                                onClick={() => setPagina(i + 1)}
                                            >
                                                {i + 1}
                                            </CPaginationItem>
                                        ))}
                                        <CPaginationItem
                                            disabled={pagina === total_paginas}
                                            onClick={() => setPagina(p => p + 1)}
                                        >
                                            Próxima
                                        </CPaginationItem>
                                    </CPagination>
                                </div>
                            )}
                        </>
                    )}
                </CCardBody>
            </CCard>
        </div>
    )
}

export default MeusFeedbacks