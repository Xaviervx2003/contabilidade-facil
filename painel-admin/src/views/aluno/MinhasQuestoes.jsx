import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

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
    CFormTextarea,
    CFormCheck,
    CFormLabel,
    CFormSelect,
} from '@coreui/react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { API_URL } from '../../config'
import api from '../../services/api'
import { getAlunoMatricula } from '../../utils/auth'
import { tokens } from '../../tokens'
import useAuthSession from '../../hooks/useAuthSession'

import QuestoesFiltro from './components/QuestoesFiltro';
import QuestoesLista from './components/QuestoesLista';
import QuestoesFeedbacks from './components/QuestoesFeedbacks';
import useMinhasQuestoesLogic from './hooks/useMinhasQuestoesLogic';

const MinhasQuestoes = () => {
    const logicProps = useMinhasQuestoesLogic();
    const {
        loadingMetrics,
        metrics,
        dados,
        activeTab,
        setActiveTab,
        selectedQuestaoId,
        questaoDetail,
        loadingDetail,
        errorDetail,
        modalOpen,
        setModalOpen,
        duvidaModalOpen,
        setDuvidaModalOpen,
        textoDuvida,
        setTextoDuvida,
        marcadaConfusa,
        setMarcadaConfusa,
        submittingDuvida,
        duvidaMessage,
        setDuvidaMessage,
        formModalOpen,
        setFormModalOpen,
        selectedQuestaoParaDuvida,
        setSelectedQuestaoParaDuvida,
        questoesResolvidas,
        handleSubmitNovaPergunta,
        handleSubmitDuvida,
        debugLogs,
        setDebugLogs,
        showDebugPanel,
        setShowDebugPanel
    } = logicProps;
    return (
        <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
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

{activeTab === 'historico' && (
                        <>
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
                                                {loadingMetrics ? <CSpinner size="sm" color="danger" /> : (metrics?.questoes ?? dados?.total ?? 0)}
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

                            <QuestoesFiltro {...logicProps} />
                            <QuestoesLista {...logicProps} />
                        </>
                    )}

                    {activeTab === 'feedbacks' && (
                        <QuestoesFeedbacks {...logicProps} />
                    )}

                </div>
            </CContainer>

            
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

            {/* MODAL DE REVISÃO DETALHADA */}
            <CModal 
                visible={modalOpen} 
                onClose={() => setModalOpen(false)} 
                size="lg"
                backdrop="static"
            >
                <div style={{ fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
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
                <CModalFooter style={{ borderTop: `1px solid ${tokens.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <CButton
                        onClick={() => {
                            setDuvidaMessage(null)
                            setTextoDuvida('')
                            setMarcadaConfusa(false)
                            setDuvidaModalOpen(true)
                        }}
                        style={{
                            background: tokens.rausch,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            padding: '8px 16px',
                            fontWeight: 700,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 4px 10px rgba(255, 56, 92, 0.15)',
                            fontFamily: "'Circular Std', 'Nunito', sans-serif"
                        }}
                    >
                        <Icon icon="solar:chat-round-plus-bold" width="16" /> Mande sua Dúvida
                    </CButton>
                    <CButton 
                        color="secondary" 
                        onClick={() => setModalOpen(false)}
                        style={{ borderRadius: 10, fontWeight: 700, fontSize: 12, fontFamily: "'Circular Std', 'Nunito', sans-serif" }}
                    >
                        Fechar Revisão
                    </CButton>
                </CModalFooter>
                </div>
            </CModal>

            {/* MODAL DE SUBMISSÃO DE DÚVIDA INTEGRADA (HELPDESK) */}
            <CModal
                visible={duvidaModalOpen}
                onClose={() => setDuvidaModalOpen(false)}
                size="md"
                backdrop="static"
            >
                <div style={{ fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
                    <CModalHeader closeButton style={{ borderBottom: `1px solid ${tokens.border}` }}>
                        <CModalTitle style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                            Mande sua Dúvida — Questão #{selectedQuestaoId}
                        </CModalTitle>
                    </CModalHeader>
                    <form onSubmit={handleSubmitDuvida}>
                    <CModalBody style={{ background: 'var(--color-bg-primary)' }}>
                        {duvidaMessage && (
                            <CAlert color={duvidaMessage.tipo} className="mb-4" style={{ borderRadius: 12, fontSize: 12, fontWeight: 650 }}>
                                {duvidaMessage.texto}
                            </CAlert>
                        )}

                        <div className="mb-4">
                            <CFormLabel style={{ fontSize: 12, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase' }}>
                                Explique o que não ficou claro ou qual a sua dúvida:
                            </CFormLabel>
                            <CFormTextarea
                                rows={4}
                                placeholder="Digite aqui sua dúvida com riqueza de detalhes..."
                                value={textoDuvida}
                                onChange={e => setTextoDuvida(e.target.value)}
                                required
                                style={{
                                    borderRadius: 14,
                                    border: `1px solid ${tokens.border}`,
                                    background: tokens.bg,
                                    color: 'var(--color-text-primary)',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    padding: '12px 14px',
                                    outline: 'none',
                                    fontFamily: "'Circular Std', 'Nunito', sans-serif"
                                }}
                            />
                        </div>

                        <div style={{
                            background: `${tokens.rausch}05`,
                            border: `1px dashed ${tokens.rausch}30`,
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 4
                        }}>
                            <CFormCheck
                                id="marcadaConfusa"
                                label="Marcar esta questão como CONFUSA"
                                checked={marcadaConfusa}
                                onChange={e => setMarcadaConfusa(e.target.checked)}
                                style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)', cursor: 'pointer' }}
                            />
                            <div style={{ fontSize: 11, color: tokens.foggy, marginTop: 4, marginLeft: 24 }}>
                                Se você acha que o enunciado, gabarito ou as alternativas estão incorretos ou confusos.
                            </div>
                        </div>
                    </CModalBody>
                    <CModalFooter style={{ borderTop: `1px solid ${tokens.border}` }}>
                        <CButton
                            color="secondary"
                            onClick={() => setDuvidaModalOpen(false)}
                            style={{ borderRadius: 10, fontWeight: 700, fontSize: 12, fontFamily: "'Circular Std', 'Nunito', sans-serif" }}
                            disabled={submittingDuvida}
                        >
                            Cancelar
                        </CButton>
                        <CButton
                            type="submit"
                            style={{
                                background: tokens.rausch, color: '#fff', border: 'none',
                                borderRadius: 10, fontWeight: 700, fontSize: 12,
                                display: 'flex', alignItems: 'center', gap: 6,
                                fontFamily: "'Circular Std', 'Nunito', sans-serif"
                            }}
                            disabled={submittingDuvida}
                        >
                            {submittingDuvida ? <CSpinner size="sm" /> : 'Enviar Pergunta 🚀'}
                        </CButton>
                    </CModalFooter>
                </form>
                </div>
            </CModal>

            {/* PAINEL DE DIAGNÓSTICO — apenas em desenvolvimento */}
            {import.meta.env.DEV && (
            <div style={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 99999,
                fontFamily: "'Circular Std', 'Nunito', sans-serif"
            }}>
                <CButton
                    color="dark"
                    size="sm"
                    onClick={() => setShowDebugPanel(!showDebugPanel)}
                    style={{
                        borderRadius: 30,
                        padding: '10px 18px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontWeight: 700,
                        fontSize: 12,
                        background: '#1e293b',
                        color: '#fff',
                        border: 'none'
                    }}
                >
                    <Icon 
                        icon="solar:shield-warning-bold" 
                        width="16" 
                        style={{ color: debugLogs.some(l => l.type === 'error') ? tokens.rausch : '#10b981' }} 
                    />
                    Console de Diagnóstico {debugLogs.filter(l => l.type === 'error').length > 0 && `(${debugLogs.filter(l => l.type === 'error').length} 🚨)`}
                </CButton>

                {showDebugPanel && (
                    <div style={{
                        position: 'absolute',
                        bottom: 54,
                        right: 0,
                        width: 350,
                        maxHeight: 450,
                        background: 'var(--color-bg-elevated)',
                        border: `1px solid ${tokens.border}`,
                        borderRadius: 20,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '14px 18px',
                            borderBottom: `1px solid ${tokens.border}`,
                            fontWeight: 850,
                            fontSize: 13,
                            background: 'rgba(255, 56, 92, 0.08)',
                            color: tokens.rausch,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Icon icon="solar:bug-bold" /> PAINEL DE DIAGNÓSTICO
                            </span>
                            <CButton 
                                size="sm" 
                                color="link" 
                                onClick={() => setDebugLogs([])} 
                                style={{ fontSize: 11, padding: 0, color: tokens.foggy, textDecoration: 'none', fontWeight: 700 }}
                            >
                                Limpar
                            </CButton>
                        </div>
                        <div style={{ 
                            padding: 16, 
                            overflowY: 'auto', 
                            flex: 1, 
                            fontSize: 12, 
                            background: 'var(--color-bg-primary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                        }}>
                            {debugLogs.length === 0 ? (
                                <div style={{ color: tokens.foggy, textAlign: 'center', padding: '32px 16px', fontWeight: 600 }}>
                                    Nenhum log registrado ainda.<br/>Abra a revisão e clique no botão de dúvida para testar.
                                </div>
                            ) : (
                                debugLogs.map((log, i) => (
                                    <div key={i} style={{
                                        borderBottom: `1px solid ${tokens.border}`,
                                        paddingBottom: 8,
                                        color: log.type === 'error' ? tokens.rausch : log.type === 'success' ? '#10b981' : log.type === 'warning' ? 'var(--color-warning, #f59e0b)' : 'var(--color-text-primary)'
                                    }}>
                                        <div style={{ fontSize: 10, opacity: 0.6, fontWeight: 700, marginBottom: 2 }}>[{log.time}]</div>
                                        <div style={{ fontWeight: 650, lineHeight: 1.4 }}>{log.msg}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            )}
        </div>
    )
}

export default MinhasQuestoes