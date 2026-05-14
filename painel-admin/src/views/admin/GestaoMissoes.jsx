import React, { useState, useEffect } from 'react'
import {
    CCard, CCardBody, CTable, CTableHead, CTableRow, CTableHeaderCell, 
    CTableBody, CTableDataCell, CButton, CFormInput, CRow, CCol, CBadge
} from '@coreui/react'
import { Icon } from '@iconify/react'
import toast from 'react-hot-toast'
import SCard from '../../components/premium/SCard'

const tokens = {
    rausch: '#FF385C',
    babu: '#00A699',
    arches: '#FC642D',
    hof: '#484848',
}

const GestaoMissoes = () => {
    const [missoes, setMissoes] = useState([])
    const [novoTitulo, setNovoTitulo] = useState('')
    const [novaDica, setNovaDica] = useState('')
    const [loading, setLoading] = useState(true)

    const buscarMissoes = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/api/missoes/globais`)
            const data = await res.json()
            setMissoes(data)
        } catch (e) {
            toast.error('Erro ao buscar missões')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { buscarMissoes() }, [])

    const handleAdd = async () => {
        if (!novoTitulo || !novaDica) {
            toast.error('Preencha todos os campos!')
            return
        }
        try {
            const res = await fetch(`${API_URL}/api/admin/missoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo: novoTitulo, dica: novaDica, icon: 'solar:ranking-bold' })
            })
            if (res.ok) {
                toast.success('Desafio lançado para os alunos! 🚀')
                setNovoTitulo('')
                setNovaDica('')
                buscarMissoes()
            }
        } catch (e) {
            toast.error('Erro ao salvar missão')
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Deseja remover este desafio?')) return
        try {
            const res = await fetch(`${API_URL}/api/admin/missoes/${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.error('Missão removida.')
                buscarMissoes()
            }
        } catch (e) {
            toast.error('Erro ao deletar')
        }
    }

    return (
        <div className="fade-in pb-5" style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', padding: '32px 16px 48px', fontFamily: "'Nunito', sans-serif" }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                
                {/* HEADER */}
                <div className="mb-5">
                    <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>ADMINISTRAÇÃO</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                        Gestão de Missões e Desafios 🏆
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--color-text-tertiary)', marginTop: 6 }}>
                        Crie desafios globais para motivar seus alunos e aumentar a retenção.
                    </div>
                </div>

                <CRow className="g-4">
                    {/* FORMULÁRIO DE CRIAÇÃO */}
                    <CCol lg={4}>
                        <SCard title="Lançar Novo Desafio" icon={<Icon icon="solar:ranking-bold" width="18" />}>
                            <div className="mb-3">
                                <label className="small fw-bold text-muted mb-1">TÍTULO DO DESAFIO</label>
                                <CFormInput 
                                    placeholder="Ex: Maratonista de Questões" 
                                    value={novoTitulo}
                                    onChange={e => setNovoTitulo(e.target.value)}
                                    className="border-0 bg-body-tertiary rounded-3 shadow-none"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="small fw-bold text-muted mb-1">DESCRIÇÃO / DICA</label>
                                <CFormInput 
                                    placeholder="Ex: Resolva 50 questões esta semana." 
                                    value={novaDica}
                                    onChange={e => setNovaDica(e.target.value)}
                                    className="border-0 bg-body-tertiary rounded-3 shadow-none"
                                />
                            </div>
                            <CButton 
                                onClick={handleAdd}
                                className="w-100 fw-bold py-2"
                                style={{ background: tokens.rausch, color: '#fff', borderRadius: 12, border: 'none' }}
                            >
                                <Icon icon="solar:paper-plane-bold" className="me-2" />
                                Publicar Desafio
                            </CButton>
                        </SCard>
                    </CCol>

                    {/* LISTA DE MISSÕES */}
                    <CCol lg={8}>
                        <SCard title="Missões Ativas no Portal" icon={<Icon icon="solar:list-bold" width="18" />}>
                            <CTable responsive align="middle" className="border-0">
                                <CTableHead>
                                    <CTableRow>
                                        <CTableHeaderCell className="border-0 text-muted small px-0">MISSÃO</CTableHeaderCell>
                                        <CTableHeaderCell className="border-0 text-muted small">TIPO</CTableHeaderCell>
                                        <CTableHeaderCell className="border-0 text-muted small text-end px-0">AÇÕES</CTableHeaderCell>
                                    </CTableRow>
                                </CTableHead>
                                <CTableBody>
                                    {missoes.map((m) => (
                                        <CTableRow key={m.id}>
                                            <CTableDataCell className="px-0">
                                                <div className="fw-bold" style={{ fontSize: 15 }}>{m.titulo}</div>
                                                <div className="small text-muted">{m.dica}</div>
                                            </CTableDataCell>
                                            <CTableDataCell>
                                                <CBadge style={{ background: m.tipo === 'Sistema' ? tokens.hof : tokens.babu }}>
                                                    {m.tipo.toUpperCase()}
                                                </CBadge>
                                            </CTableDataCell>
                                            <CTableDataCell className="text-end px-0">
                                                <CButton 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    onClick={() => handleDelete(m.id)}
                                                    style={{ color: tokens.rausch }}
                                                    disabled={m.tipo === 'Sistema'}
                                                >
                                                    <Icon icon="solar:trash-bin-trash-bold" width="20" />
                                                </CButton>
                                            </CTableDataCell>
                                        </CTableRow>
                                    ))}
                                </CTableBody>
                            </CTable>
                        </SCard>
                    </CCol>
                </CRow>

            </div>
        </div>
    )
}

export default GestaoMissoes
