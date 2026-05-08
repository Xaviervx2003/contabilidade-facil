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
import './Conquistas.scss'
import { getMatricula } from '../../utils/auth'
import { API_URL } from '../../config'

const Conquistas = () => {
    const [conquistas, setConquistas] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [animateCards, setAnimateCards] = useState(false)

    useEffect(() => {
        const carregarConquistas = async () => {
            try {
                // Obter matrícula usando o utilitário padrão
                const matricula = getMatricula()

                if (!matricula) {
                    setError('❌ Matrícula não encontrada. Faça login novamente.')
                    setLoading(false)
                    return
                }

                console.log('✅ Matrícula carregada:', matricula)

                const url = `${API_URL}/api/aluno/conquistas/${matricula}`

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
                // Trigger animações após dados chegarem
                setTimeout(() => setAnimateCards(true), 100)
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
            <CContainer className="d-flex justify-content-center align-items-center conquistas-loading" style={{ minHeight: '100vh' }}>
                <div className="text-center">
                    <CSpinner color="primary" />
                    <p className="mt-3 text-body-secondary">Carregando suas conquistas...</p>
                </div>
            </CContainer>
        )
    }

    if (error) {
        return (
            <CContainer className="conquistas-container my-4">
                <CAlert color="danger" className="d-flex align-items-center gap-2">
                    <span className="fs-5">⚠️</span>
                    <span>{error}</span>
                </CAlert>
                <CAlert color="info">
                    <strong>💡 Dica:</strong> Verifique se:
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
            <CContainer className="conquistas-container my-4">
                <CAlert color="warning" className="d-flex align-items-center gap-2">
                    <span className="fs-5">⚡</span>
                    <span>Nenhuma conquista encontrada.</span>
                </CAlert>
            </CContainer>
        )
    }

    const { streak, medalhas, total_questoes_respondidas, total_sessoes, tempo_estudo_total_minutos } = conquistas

    return (
        <CContainer className="conquistas-container">
            {/* Header com Gradient */}
            <div className={`conquistas-header ${animateCards ? 'animate-in' : ''}`}>
                <h1 className="conquistas-title">🏆 Minhas Conquistas</h1>
                <p className="conquistas-subtitle">Acompanhe seu progresso e desbloqueie novas medalhas</p>
            </div>

            {/* Streak e Estatísticas */}
            <CRow className="mb-4">
                {/* Streak Card */}
                <CCol md={6} className={`mb-3 ${animateCards ? 'fade-in-up' : ''}`} style={{ animationDelay: '0.1s' }}>
                    <div className="streak-card custom-card">
                        <div className="streak-glow"></div>
                        <div className="streak-header">
                            <span className="streak-icon">🔥</span>
                            <h2 className="streak-label">Seu Streak Atual</h2>
                        </div>

                        <div className="streak-content">
                            <div className="streak-number-container">
                                <h3 className="streak-number">
                                    {streak?.dias_atuais || 0}
                                </h3>
                                <p className="streak-unit">dias consecutivos</p>
                            </div>

                            {streak?.dias_maximo && (
                                <div className="streak-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Máximo pessoal:</span>
                                        <span className="stat-value">{streak.dias_maximo} dias</span>
                                    </div>
                                </div>
                            )}

                            {streak?.proxima_data_para_manter && (
                                <div className="streak-alert">
                                    <span className="alert-icon">📌</span>
                                    <div>
                                        <p className="alert-title">Próxima data para manter o streak:</p>
                                        <p className="alert-date">
                                            {new Date(streak.proxima_data_para_manter).toLocaleDateString('pt-BR', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CCol>

                {/* Estatísticas Card */}
                <CCol md={6} className={`mb-3 ${animateCards ? 'fade-in-up' : ''}`} style={{ animationDelay: '0.2s' }}>
                    <div className="stats-card custom-card">
                        <div className="stats-header">
                            <span className="stats-icon">📈</span>
                            <h2 className="stats-label">Seu Desempenho</h2>
                        </div>

                        <div className="stats-grid-compact">
                            <div className="stat-box">
                                <div className="stat-icon-wrapper questions">
                                    <span>❓</span>
                                </div>
                                <div className="stat-info">
                                    <span className="stat-value">{total_questoes_respondidas || 0}</span>
                                    <span className="stat-desc">Questões</span>
                                </div>
                            </div>

                            <div className="stat-box">
                                <div className="stat-icon-wrapper sessions">
                                    <span>📚</span>
                                </div>
                                <div className="stat-info">
                                    <span className="stat-value">{total_sessoes || 0}</span>
                                    <span className="stat-desc">Sessões</span>
                                </div>
                            </div>

                            <div className="stat-box">
                                <div className="stat-icon-wrapper time">
                                    <span>⏱️</span>
                                </div>
                                <div className="stat-info">
                                    <span className="stat-value">
                                        {tempo_estudo_total_minutos ? `${tempo_estudo_total_minutos}m` : '0m'}
                                    </span>
                                    <span className="stat-desc">Estudo</span>
                                </div>
                            </div>
                        </div>

                        {tempo_estudo_total_minutos > 0 && (
                            <div className="stats-footer-info">
                                <span className="text-body-tertiary">
                                    Total convertido: <strong>{Math.floor(tempo_estudo_total_minutos / 60)}h {tempo_estudo_total_minutos % 60}m</strong>
                                </span>
                            </div>
                        )}
                    </div>
                </CCol>
            </CRow>

            {/* Medalhas e Badges */}
            <div className={`medals-section ${animateCards ? 'fade-in-up' : ''}`} style={{ animationDelay: '0.3s' }}>
                <div className="medals-header">
                    <h2 className="medals-title">🥇 Medalhas e Badges</h2>
                    <p className="medals-subtitle">
                        {medalhas?.filter(m => m.desbloqueada).length || 0} de {medalhas?.length || 0} desbloqueadas
                    </p>
                </div>

                {medalhas && medalhas.length > 0 ? (
                    <div className="medals-grid">
                        {medalhas.map((medalha, idx) => (
                            <div
                                key={idx}
                                className={`medal-card ${medalha.desbloqueada ? 'unlocked' : 'locked'}`}
                                style={{ animationDelay: `${0.1 + idx * 0.05}s` }}
                            >
                                <div className="medal-glow" style={{ opacity: medalha.desbloqueada ? 1 : 0 }}></div>

                                <div className="medal-icon-container">
                                    <span className="medal-emoji">
                                        {medalha.tipo === 'bronze' && '🥉'}
                                        {medalha.tipo === 'prata' && '🥈'}
                                        {medalha.tipo === 'ouro' && '🥇'}
                                        {medalha.tipo === 'platina' && '💎'}
                                        {!['bronze', 'prata', 'ouro', 'platina'].includes(medalha.tipo) && '⭐'}
                                    </span>
                                </div>

                                <div className="medal-content">
                                    <h5 className="medal-name">{medalha.nome}</h5>
                                    <p className="medal-description">{medalha.descricao}</p>

                                    {!medalha.desbloqueada && medalha.progresso !== undefined && (
                                        <div className="medal-progress">
                                            <CProgress value={medalha.progresso} color="primary" className="progress-bar" />
                                            <small className="progress-text">
                                                {Math.round(medalha.progresso)}% completo
                                            </small>
                                        </div>
                                    )}

                                    {medalha.desbloqueada && (
                                        <div className="medal-badge">
                                            <span className="badge-text">✅ Desbloqueada</span>
                                        </div>
                                    )}

                                    {medalha.data_desbloqueio && (
                                        <p className="medal-date">
                                            {new Date(medalha.data_desbloqueio).toLocaleDateString('pt-BR')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <CAlert color="info" className="empty-state">
                        <span className="alert-icon">🚀</span>
                        <span>Nenhuma medalha desbloqueada ainda. Continue estudando para alcançar seus primeiros badges!</span>
                    </CAlert>
                )}
            </div>

            {/* Ranking (Futuro) */}
            <div className={`ranking-section mt-5 ${animateCards ? 'fade-in-up' : ''}`} style={{ animationDelay: '0.4s' }}>
                <div className="ranking-card custom-card">
                    <div className="ranking-header">
                        <h2 className="ranking-title">🔥 Top Streaks da Turma</h2>
                    </div>
                    <div className="ranking-body">
                        <p className="ranking-placeholder">
                            ⏳ Em breve: ranking dos maiores streaks da sua turma!
                        </p>
                        <p className="ranking-hint">Quando lançado, você poderá competir com seus colegas e ver quem tem o maior streak.</p>
                    </div>
                </div>
            </div>
        </CContainer>
    )
}

export default Conquistas