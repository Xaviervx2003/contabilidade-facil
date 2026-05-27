import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { tokens } from '../../../tokens'

const QuestoesFiltro = (props) => {
    const {
        activeDropdown, setActiveDropdown,
        dropdownStatusRef, dropdownMateriaRef,
        obterRotuloStatus, obterRotuloMateria,
        filtroAcerto, setFiltroAcerto,
        filtroMateria, setFiltroMateria,
        buscaMateria, setBuscaMateria,
        materiasFiltradas, setPagina
    } = props

    return (
        <div style={{ position: 'relative', zIndex: 10 }}>
            <div className="d-flex flex-column flex-md-row gap-3 align-items-center mb-4">
                
                {/* Segmento 1: Status de Acertos */}
                <div 
                    ref={dropdownStatusRef}
                    style={{ flex: 1, width: '100%', position: 'relative' }}
                >
                    <div 
                        onClick={(e) => {
                            e.stopPropagation()
                            setActiveDropdown(activeDropdown === 'status' ? null : 'status')
                        }}
                        style={{
                            background: tokens.bg,
                            border: `1px solid ${activeDropdown === 'status' ? tokens.rausch : tokens.border}`,
                            borderRadius: 20,
                            padding: '12px 20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.02)'
                        }}
                    >
                        <div>
                            <div style={{ fontSize: 9, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status da Resolução</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 2 }}>
                                {obterRotuloStatus()}
                            </div>
                        </div>
                        <Icon 
                            icon="solar:alt-arrow-down-bold" 
                            style={{ color: tokens.foggy, transition: 'transform 0.2s', transform: activeDropdown === 'status' ? 'rotate(180deg)' : 'none' }} 
                            width="14"
                        />
                    </div>

                    <AnimatePresence>
                        {activeDropdown === 'status' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    position: 'absolute',
                                    top: '108%',
                                    left: 0,
                                    width: '100%',
                                    background: tokens.bg,
                                    border: `1px solid ${tokens.border}`,
                                    borderRadius: 18,
                                    boxShadow: '0 12px 36px rgba(0,0,0,0.1)',
                                    padding: 10,
                                    zIndex: 99,
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div 
                                        onClick={() => { setFiltroAcerto(''); setPagina(1); setActiveDropdown(null) }}
                                        style={{
                                            padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            background: filtroAcerto === '' ? 'var(--color-bg-tertiary)' : 'transparent',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <Icon icon="solar:checklist-bold-duotone" style={{ color: tokens.foggy }} width="18" />
                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Todas as resoluções</span>
                                    </div>

                                    <div 
                                        onClick={() => { setFiltroAcerto('acerto'); setPagina(1); setActiveDropdown(null) }}
                                        style={{
                                            padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            background: filtroAcerto === 'acerto' ? 'var(--color-bg-tertiary)' : 'transparent',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <Icon icon="solar:check-circle-bold-duotone" style={{ color: tokens.babu }} width="18" />
                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Apenas Acertos</span>
                                    </div>

                                    <div 
                                        onClick={() => { setFiltroAcerto('erro'); setPagina(1); setActiveDropdown(null) }}
                                        style={{
                                            padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            background: filtroAcerto === 'erro' ? 'var(--color-bg-tertiary)' : 'transparent',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <Icon icon="solar:bill-cross-bold-duotone" style={{ color: tokens.rausch }} width="18" />
                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Apenas Erros</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Segmento 2: Matéria Relacionada */}
                <div 
                    ref={dropdownMateriaRef}
                    style={{ flex: 1, width: '100%', position: 'relative' }}
                >
                    <div 
                        onClick={(e) => {
                            e.stopPropagation()
                            setActiveDropdown(activeDropdown === 'materia' ? null : 'materia')
                        }}
                        style={{
                            background: tokens.bg,
                            border: `1px solid ${activeDropdown === 'materia' ? tokens.rausch : tokens.border}`,
                            borderRadius: 20,
                            padding: '12px 20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.02)'
                        }}
                    >
                        <div>
                            <div style={{ fontSize: 9, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Matéria Relacionada</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 280 }}>
                                {obterRotuloMateria()}
                            </div>
                        </div>
                        <Icon 
                            icon="solar:alt-arrow-down-bold" 
                            style={{ color: tokens.foggy, transition: 'transform 0.2s', transform: activeDropdown === 'materia' ? 'rotate(180deg)' : 'none' }} 
                            width="14"
                        />
                    </div>

                    <AnimatePresence>
                        {activeDropdown === 'materia' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    position: 'absolute',
                                    top: '108%',
                                    right: 0,
                                    width: '100%',
                                    minWidth: 280,
                                    background: tokens.bg,
                                    border: `1px solid ${tokens.border}`,
                                    borderRadius: 18,
                                    boxShadow: '0 12px 36px rgba(0,0,0,0.1)',
                                    padding: 14,
                                    zIndex: 99,
                                }}
                            >
                                <div style={{ position: 'relative', marginBottom: 12 }}>
                                    <input
                                        type="text"
                                        placeholder="Buscar matéria..."
                                        value={buscaMateria}
                                        onChange={e => setBuscaMateria(e.target.value)}
                                        onClick={e => e.stopPropagation()} 
                                        style={{
                                            width: '100%',
                                            padding: '10px 14px 10px 36px',
                                            borderRadius: 12,
                                            border: `1px solid ${tokens.border}`,
                                            background: tokens.bgSub,
                                            color: 'var(--color-text-primary)',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            outline: 'none'
                                        }}
                                    />
                                    <Icon 
                                        icon="solar:magnifer-linear" 
                                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: tokens.foggy }} 
                                        width="16"
                                    />
                                </div>

                                <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
                                    <div 
                                        onClick={() => { setFiltroMateria(''); setPagina(1); setActiveDropdown(null); setBuscaMateria('') }}
                                        style={{
                                            padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            background: filtroMateria === '' ? 'var(--color-bg-tertiary)' : 'transparent',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <Icon icon="solar:book-bookmark-bold-duotone" style={{ color: tokens.foggy }} width="16" />
                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Todas as matérias</span>
                                    </div>

                                    {materiasFiltradas.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: tokens.foggy, fontSize: 11, padding: '10px 0' }}>
                                            Nenhuma matéria encontrada.
                                        </div>
                                    ) : (
                                        materiasFiltradas.map(m => {
                                            const isSelected = String(filtroMateria) === String(m.id)
                                            return (
                                                <div 
                                                    key={m.id}
                                                    onClick={() => { setFiltroMateria(String(m.id)); setPagina(1); setActiveDropdown(null); setBuscaMateria('') }}
                                                    style={{
                                                        padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                        background: isSelected ? 'var(--color-bg-tertiary)' : 'transparent',
                                                        transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <Icon icon="solar:notebook-bold-duotone" style={{ color: isSelected ? tokens.rausch : tokens.foggy }} width="16" />
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? tokens.rausch : 'var(--color-text-primary)' }}>
                                                        {m.nome}
                                                    </span>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

export default QuestoesFiltro
