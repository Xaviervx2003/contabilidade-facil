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
import CIcon from '@coreui/icons-react'
import * as icon from '@coreui/icons'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { getAlunoMatricula } from '../../utils/auth'
import { API_URL } from '../../config'
import { formatIsoToDateString, formatIsoToShortDate } from '../../utils/formatDate'

const Conquistas = ({ isTab = false }) => {
    const [conquistas, setConquistas] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [animateCards, setAnimateCards] = useState(false)

    useEffect(() => {
        const carregarConquistas = async () => {
            try {
                const matricula = getAlunoMatricula()

                if (!matricula) {
                    setError('Esta area e exclusiva para alunos com matricula ativa.')
                    setLoading(false)
                    return
                }

                console.log('✅ Matrícula carregada:', matricula)

                const url = `${API_URL}/api/aluno/conquistas/${matricula}`
                const token = sessionStorage.getItem('token')

                console.log('📍 Buscando de:', url)

                const res = await fetch(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
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

    const renderAlert = (color, icon, title, desc) => (
        <div className={`my-4 ${isTab ? '' : 'conquistas-container'}`}>
            <CAlert color={color} className="d-flex align-items-center gap-2">
                <span className="fs-5">{icon}</span>
                <span>{title}</span>
            </CAlert>
            {desc && <CAlert color="info">{desc}</CAlert>}
        </div>
    )

    if (error) return renderAlert('danger', '⚠️', error, 
        <>
            <strong>💡 Dica:</strong> Verifique se:
            <ul className="mt-2 mb-0">
                <li>Você está logado</li>
                <li>Sua matrícula está armazenada</li>
                <li>A API está ativa e acessível</li>
            </ul>
        </>
    )

    if (!conquistas) return renderAlert('warning', '⚡', 'Nenhuma conquista encontrada.')

    const { streak, medalhas, total_questoes_respondidas, total_sessoes, tempo_estudo_total_minutos } = conquistas

    const innerContent = (
        <div className={!isTab ? "conquistas-container" : ""}>
            {/* Header com Gradient */}
            {!isTab && (
                <div className={`conquistas-header ${animateCards ? 'animate-in' : ''}`}>
                    <h1 className="conquistas-title">🏆 Minhas Conquistas</h1>
                    <p className="conquistas-subtitle">Acompanhe seu progresso e desbloqueie novas medalhas</p>
                </div>
            )}

            {/* Streak e Estatísticas */}
            <CRow className="mb-4">
                {/* Streak Card */}
                <CCol md={6} className={`mb-3 ${animateCards ? 'fade-in-up' : ''}`} style={{ animationDelay: '0.1s' }}>
                    <div className="streak-card custom-card">
                        <div className="streak-glow"></div>
                        <div className="streak-header">
                            <span className="streak-icon" style={{ width: 80, height: 80, display: 'inline-block' }}>
                                <DotLottieReact
                                    src="https://lottie.host/80e9a7e6-fcb4-4b55-b0bd-c1fc3c220f83/Vp2W1zU8wV.lottie"
                                    loop
                                    autoplay
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </span>
                            <h2 className="streak-label mt-2">Seu Streak Atual</h2>
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
                                            {formatIsoToShortDate(streak.proxima_data_para_manter)}
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

                                <div className="medal-icon-container" style={{ position: 'relative', width: 80, height: 80, margin: '0 auto' }}>
                                    {medalha.desbloqueada ? (
                                        <DotLottieReact
                                            src="https://lottie.host/289659b8-07cb-4b3d-b2a1-ccbb7c3b9429/bBIfP41K2Q.lottie"
                                            loop
                                            autoplay
                                            style={{ width: '100%', height: '100%' }}
                                        />
                                    ) : (
                                        <span className="medal-emoji" style={{ filter: 'grayscale(100%)', opacity: 0.5, fontSize: 48, lineHeight: '80px' }}>
                                            {medalha.tipo === 'bronze' && '🥉'}
                                            {medalha.tipo === 'prata' && '🥈'}
                                            {medalha.tipo === 'ouro' && '🥇'}
                                            {medalha.tipo === 'platina' && '💎'}
                                            {!['bronze', 'prata', 'ouro', 'platina'].includes(medalha.tipo) && '⭐'}
                                        </span>
                                    )}
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
                                            {formatIsoToDateString(medalha.data_desbloqueio)}
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
        </div>
    )

    if (isTab) return innerContent

    return (
        <CContainer className="conquistas-container">
            {innerContent}
        </CContainer>
    )
}

export default Conquistas
