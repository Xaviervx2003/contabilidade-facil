import React from 'react'
import { Icon } from '@iconify/react'
import { CButton } from '@coreui/react'
import { buildTokens } from '../../../tokens'
import { useTheme } from '../../../context/themeContext'
import { StatCard, FeedbackSkeleton, FAQItem } from './MinhasQuestoesComponents'

const QuestoesFeedbacks = (props) => {
    const { currentPalette } = useTheme()
    const tk = buildTokens(currentPalette)
    const { 
        stats, 
        searchFeedbacks, setSearchFeedbacks, 
        abrirNovaPergunta, 
        loadingFeedbacks, 
        filteredFeedbacks, 
        expandedId, setExpandedId, 
        abrirRevisao 
    } = props

    return (
        <div className="fade-in">
            <div className="mb-4 d-flex flex-column lg:flex-row justify-content-between gap-4">
                <div className="d-flex flex-wrap gap-3 w-100 lg:w-auto">
                    <StatCard icon="solar:document-text-linear" label="Total" value={stats?.total || 0} color={tk.rausch} />
                    <StatCard icon="solar:check-circle-linear" label="Respondidos" value={stats?.resolvidos || 0} color={tk.babu} />
                    <StatCard icon="solar:clock-circle-linear" label="Em Aberto" value={stats?.pendentes || 0} color={tk.arches} />
                </div>
            </div>

            <div className="d-flex flex-column flex-md-row gap-3 align-items-center mb-4">
                <div style={{ position: 'relative', flex: 1, width: '100%' }}>
                    <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: tk.foggy }}>
                        <Icon icon="solar:magnifer-linear" width="20" />
                    </div>
                    <input
                        type="text"
                        placeholder="Pesquisar dúvidas..."
                        className="w-100"
                        style={{
                            background: tk.bg, border: `1px solid ${tk.border}`,
                            borderRadius: 16, padding: '14px 16px 14px 44px',
                            fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', outline: 'none'
                        }}
                        value={searchFeedbacks || ''}
                        onChange={(e) => setSearchFeedbacks(e.target.value)}
                    />
                </div>
                <CButton
                    onClick={abrirNovaPergunta}
                    style={{
                        background: tk.rausch, color: '#fff', border: 'none',
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
            ) : filteredFeedbacks?.length === 0 ? (
                <div style={{ background: tk.bg, border: `1px solid ${tk.border}`, borderRadius: 24, padding: '50px 20px', textAlign: 'center' }}>
                    Nenhum feedback encontrado.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {filteredFeedbacks?.map((item, idx) => (
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
    )
}

export default QuestoesFeedbacks
