import React, { useState, useEffect } from 'react'
import {
    CCard,
    CCardBody,
    CCardHeader,
    CContainer,
    CRow,
    CCol,
    CProgress,
    CAlert,
    CSpinner,
} from '@coreui/react'

const Conquistas = () => {
    const [conquistas, setConquistas] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const carregarConquistas = async () => {
            try {
                // Obter matrícula do sessionStorage ou localStorage
                const matricula = sessionStorage.getItem('matricula') || localStorage.getItem('matricula')

                if (!matricula) {
                    setError('❌ Matrícula não encontrada. Faça login novamente.')
                    setLoading(false)
                    return
                }

                console.log('✅ Matrícula carregada:', matricula)

                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
                const url = `${apiUrl}/api/aluno/conquistas/${matricula}`

                console.log('📍 Buscando de:', url)

                const res = await fetch(url, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })

                console.log('📊 Status HTTP:', res.status)

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
                }

                const data = await res.json()
                console.log('📦 Dados recebidos:', data)

                setConquistas(data)
                setError(null)
            } catch (err) {
                console.error('❌ Erro ao carregar conquistas:', err)
                setError(`Erro ao carregar conquistas: ${err.message}`)
            } finally {
                setLoading(false)
            }
        }

        carregarConquistas()
    }, [])

    if (loading) {
        return (
            <CContainer className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <div className="text-center">
                    <CSpinner color="primary" />
                    <p className="mt-3">Carregando suas conquistas...</p>
                </div>
            </CContainer>
        )
    }

    if (error) {
        return (
            <CContainer className="my-4">
                <CAlert color="danger" className="d-flex align-items-center">
                    <span>⚠️ {error}</span>
                </CAlert>
                <CAlert color="info">
                    <strong>Dica:</strong> Verifique se:
                    <ul className="mt-2 mb-0">
                        <li>Você está logado</li>
                        <li>Sua matrícula está armazenada</li>
                        <li>A API está ativa e acessível</li>
                    </ul>
                </CAlert>
            </CContainer>
        )
    }

    if (!conquistas) {
        return (
            <CContainer className="my-4">
                <CAlert color="warning">Nenhuma conquista encontrada.</CAlert>
            </CContainer>
        )
    }

    const { streak, medalhas, total_questoes_respondidas, total_sessoes, tempo_estudo_total_minutos } = conquistas

    return (
        <CContainer className="my-4">
            <h1 className="mb-4">🏆 Minhas Conquistas</h1>

            {/* Streak */}
            <CRow className="mb-4">
                <CCol md={6}>
                    <CCard className="mb-3">
                        <CCardHeader className="bg-warning text-dark fw-bold">
                            🔥 Seu Streak Atual
                        </CCardHeader>
                        <CCardBody>
                            <h2 style={{ fontSize: '48px', textAlign: 'center', marginBottom: '10px', fontWeight: 'bold' }}>
                                {streak?.dias_atuais || 0}
                            </h2>
                            <p style={{ textAlign: 'center', fontSize: '16px' }}>
                                dias de estudo consecutivo
                            </p>
                            {streak?.dias_maximo && (
                                <p className="text-muted" style={{ textAlign: 'center' }}>
                                    Máximo: {streak.dias_maximo} dias
                                </p>
                            )}
                            {streak?.proxima_data_para_manter && (
                                <CAlert color="info" className="mt-3 mb-0">
                                    📌 Próxima data para manter o streak:{' '}
                                    {new Date(streak.proxima_data_para_manter).toLocaleDateString('pt-BR', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </CAlert>
                            )}
                        </CCardBody>
                    </CCard>
                </CCol>

                {/* Estatísticas */}
                <CCol md={6}>
                    <CCard className="mb-3">
                        <CCardHeader className="fw-bold">📊 Estatísticas Gerais</CCardHeader>
                        <CCardBody>
                            <div className="mb-3">
                                <strong>Questões respondidas:</strong>{' '}
                                <span style={{ fontSize: '18px', color: '#0d6efd' }}>
                                    {total_questoes_respondidas || 0}
                                </span>
                            </div>
                            <div className="mb-3">
                                <strong>Sessões de estudo:</strong>{' '}
                                <span style={{ fontSize: '18px', color: '#0d6efd' }}>
                                    {total_sessoes || 0}
                                </span>
                            </div>
                            <div>
                                <strong>Tempo total de estudo:</strong>{' '}
                                <span style={{ fontSize: '18px', color: '#0d6efd' }}>
                                    {tempo_estudo_total_minutos ? `${tempo_estudo_total_minutos} min` : '0 min'}
                                </span>
                                {tempo_estudo_total_minutos && (
                                    <span className="text-muted" style={{ marginLeft: '8px' }}>
                                        ({Math.floor(tempo_estudo_total_minutos / 60)}h {tempo_estudo_total_minutos % 60}m)
                                    </span>
                                )}
                            </div>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>

            {/* Medalhas */}
            <CRow>
                <CCol>
                    <CCard>
                        <CCardHeader className="fw-bold">🥇 Medalhas e Badges</CCardHeader>
                        <CCardBody>
                            {medalhas && medalhas.length > 0 ? (
                                <CRow>
                                    {medalhas.map((medalha, idx) => (
                                        <CCol md={6} lg={3} key={idx} className="mb-4">
                                            <div
                                                style={{
                                                    textAlign: 'center',
                                                    opacity: medalha.desbloqueada ? 1 : 0.6,
                                                    padding: '20px',
                                                    border: medalha.desbloqueada ? '3px solid #ffc107' : '2px solid #dee2e6',
                                                    borderRadius: '12px',
                                                    backgroundColor: medalha.desbloqueada ? '#fffacd' : '#f8f9fa',
                                                    transition: 'all 0.3s ease',
                                                    cursor: 'pointer',
                                                }}
                                                className="medal-card"
                                            >
                                                <div style={{ fontSize: '50px', marginBottom: '10px' }}>
                                                    {medalha.tipo === 'bronze' && '🥉'}
                                                    {medalha.tipo === 'prata' && '🥈'}
                                                    {medalha.tipo === 'ouro' && '🥇'}
                                                    {medalha.tipo === 'platina' && '💎'}
                                                    {!['bronze', 'prata', 'ouro', 'platina'].includes(medalha.tipo) && '⭐'}
                                                </div>
                                                <h5 className="fw-bold">{medalha.nome}</h5>
                                                <p className="text-muted small">{medalha.descricao}</p>

                                                {!medalha.desbloqueada && medalha.progresso !== undefined && (
                                                    <>
                                                        <CProgress value={medalha.progresso} className="mb-2" color="warning" />
                                                        <small className="text-muted">{Math.round(medalha.progresso)}% completo</small>
                                                    </>
                                                )}

                                                {medalha.desbloqueada && (
                                                    <span className="badge bg-success" style={{ fontSize: '12px' }}>
                                                        ✅ Desbloqueada
                                                    </span>
                                                )}

                                                {medalha.data_desbloqueio && (
                                                    <p className="text-muted mt-2 mb-0" style={{ fontSize: '12px' }}>
                                                        {new Date(medalha.data_desbloqueio).toLocaleDateString('pt-BR')}
                                                    </p>
                                                )}
                                            </div>
                                        </CCol>
                                    ))}
                                </CRow>
                            ) : (
                                <CAlert color="info">Nenhuma medalha desbloqueada ainda. Continue estudando!</CAlert>
                            )}
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>

            {/* Ranking (Futuro) */}
            <CRow className="mt-4 mb-4">
                <CCol>
                    <CCard>
                        <CCardHeader className="fw-bold">🔥 Top Streaks da Turma</CCardHeader>
                        <CCardBody>
                            <p className="text-muted">Em breve: ranking dos maiores streaks da sua turma!</p>
                        </CCardBody>
                    </CCard>
                </CCol>
            </CRow>
        </CContainer>
    )
}

export default Conquistas