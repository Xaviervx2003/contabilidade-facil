import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { CRow, CCol, CSpinner, CButton, CPagination, CPaginationItem } from '@coreui/react'
import { buildTokens } from '../../../tokens'
import { useTheme } from '../../../context/themeContext'

const QuestoesLista = (props) => {
    const { currentPalette } = useTheme()
    const tk = buildTokens(currentPalette)
    const { loading, dados, abrirRevisao, pagina, setPagina, porPagina } = props
    
    // Fallbacks essenciais
    const questoes = dados?.questoes || dados?.data || []
    const total = dados?.total || 0
    const total_paginas = dados?.total_paginas || Math.ceil(total / porPagina) || 1

    if (loading) {
        return (
            <div className="text-center py-5">
                <CSpinner color="danger" />
                <p className="mt-3 text-body-secondary" style={{ fontWeight: 600 }}>Carregando suas resoluções...</p>
            </div>
        )
    }

    if (questoes.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    background: tk.bg,
                    border: `1px solid ${tk.border}`,
                    borderRadius: 24,
                    padding: '50px 20px',
                    textAlign: 'center'
                }}
            >
                <Icon icon="solar:document-bold-duotone" width="48" style={{ color: tk.foggy, marginBottom: 16 }} />
                <h5 style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>Nenhuma questão resolvida encontrada</h5>
                <p style={{ color: tk.foggy, fontSize: 13, maxWidth: 400, margin: '8px auto 0' }}>
                    Tente alterar os filtros ou comece a praticar resolvendo quizes do sistema!
                </p>
            </motion.div>
        )
    }

    return (
        <>
            <CRow className="g-3">
                <AnimatePresence mode="popLayout">
                    {questoes.map((item, idx) => {
                        const statusCor = item.acertou ? tk.babu : tk.rausch
                        const statusBg = item.acertou ? `${tk.babu}15` : `${tk.rausch}15`
                        return (
                            <CCol xs={12} md={6} key={item.questao_id || idx}>
                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    whileHover={{ y: -2 }}
                                    style={{
                                        background: tk.bg,
                                        border: `1px solid ${tk.border}`,
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <span style={{ fontSize: 10, color: tk.foggy, fontWeight: 800 }}>
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

                                        <div className="d-flex flex-wrap gap-1 mt-2">
                                            <span style={{ 
                                                background: `${tk.rausch}12`, 
                                                color: tk.rausch, 
                                                border: `1px solid ${tk.rausch}25`,
                                                padding: '4px 8px', 
                                                borderRadius: 8, 
                                                fontSize: 10, 
                                                fontWeight: 800, 
                                                textTransform: 'capitalize' 
                                            }}>
                                                {item.materias}
                                            </span>
                                            {item.assunto && item.assunto !== 'Sem assunto' && (
                                                <span style={{ 
                                                    background: `${tk.babu}12`, 
                                                    color: tk.babu, 
                                                    border: `1px solid ${tk.babu}25`,
                                                    padding: '4px 8px', 
                                                    borderRadius: 8, 
                                                    fontSize: 10, 
                                                    fontWeight: 800 
                                                }}>
                                                    {item.assunto}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${tk.border}`, paddingTop: 12, marginTop: 4 }}>
                                        <span style={{ fontSize: 11, color: tk.foggy, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Icon icon="solar:calendar-linear" />
                                            {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : 'Sem data'}
                                        </span>

                                        <CButton
                                            onClick={() => abrirRevisao(item.questao_id)}
                                            style={{
                                                background: `${tk.babu}15`, color: tk.babu, border: 'none',
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

            {/* PAGINAÇÃO */}
            {total_paginas > 1 && (
                <div className="d-flex justify-content-center mt-5">
                    <CPagination style={{ gap: 4 }}>
                        <CPaginationItem 
                            disabled={pagina === 1} 
                            onClick={() => setPagina(p => Math.max(1, p - 1))}
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
                                        background: isActive ? tk.rausch : 'transparent',
                                        borderColor: isActive ? tk.rausch : 'var(--color-border)',
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
                            onClick={() => setPagina(p => Math.min(total_paginas, p + 1))}
                            style={{ cursor: pagina === total_paginas ? 'not-allowed' : 'pointer' }}
                        >
                            Próxima
                        </CPaginationItem>
                    </CPagination>
                </div>
            )}
        </>
    )
}

export default QuestoesLista
