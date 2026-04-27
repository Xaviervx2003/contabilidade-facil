import React, { useEffect, useState } from 'react'
import {
    CCard,
    CCardBody,
    CCardHeader,
    CCol,
    CRow,
    CTable,
    CTableBody,
    CTableDataCell,
    CTableHead,
    CTableHeaderCell,
    CTableRow,
    CPagination,
    CPaginationItem,
    CFormSelect,
    CFormLabel,
    CSpinner,
    CBadge,
} from '@coreui/react'
import { API_URL } from '../../config'

const MinhasQuestoes = () => {
    const [dados, setDados] = useState({ questoes: [], total: 0, total_paginas: 1 })
    const [loading, setLoading] = useState(true)
    const [pagina, setPagina] = useState(1)
    const [filtroAcerto, setFiltroAcerto] = useState('')
    const [filtroMateria, setFiltroMateria] = useState('')
    const [materias, setMaterias] = useState([])
    const porPagina = 20

    const matricula = sessionStorage.getItem('matricula')

    useEffect(() => {
        fetch(`${API_URL}/api/admin/materias`)
            .then(res => res.json())
            .then(data => setMaterias(Array.isArray(data) ? data : []))
            .catch(() => { })
    }, [])

    useEffect(() => {
        if (!matricula) return
        setLoading(true)
        const params = new URLSearchParams({
            matricula,
            pagina,
            por_pagina: porPagina,
        })
        if (filtroAcerto) params.set('acerto', filtroAcerto)
        if (filtroMateria) params.set('materia_id', filtroMateria)

        fetch(`${API_URL}/api/aluno/questoes-respondidas?${params.toString()}`)
            .then(res => {
                if (!res.ok) throw new Error('Erro na requisição')
                return res.json()
            })
            .then(data => {
                setDados(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [matricula, pagina, filtroAcerto, filtroMateria])

    const { questoes, total, total_paginas } = dados

    return (
        <div className="p-3 p-md-4">
            <h3 className="mb-4">📋 Minhas Questões Respondidas</h3>

            <CRow className="g-3 mb-4">
                <CCol xs={12} md={4}>
                    <CFormLabel>Status</CFormLabel>
                    <CFormSelect value={filtroAcerto} onChange={e => { setFiltroAcerto(e.target.value); setPagina(1) }}>
                        <option value="">Todas</option>
                        <option value="acerto">Acertos</option>
                        <option value="erro">Erros</option>
                    </CFormSelect>
                </CCol>
                <CCol xs={12} md={4}>
                    <CFormLabel>Matéria</CFormLabel>
                    <CFormSelect value={filtroMateria} onChange={e => { setFiltroMateria(e.target.value); setPagina(1) }}>
                        <option value="">Todas</option>
                        {materias.map(m => (
                            <option key={m.id} value={m.id}>{m.nome}</option>
                        ))}
                    </CFormSelect>
                </CCol>
            </CRow>

            <CCard>
                <CCardHeader className="d-flex justify-content-between align-items-center">
                    <strong>Total: {total} tentativas</strong>
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
                                            <CTableHeaderCell>Enunciado</CTableHeaderCell>
                                            <CTableHeaderCell>Matéria (Sessão)</CTableHeaderCell>
                                            <CTableHeaderCell className="text-center">Resultado</CTableHeaderCell>
                                            <CTableHeaderCell className="text-center">Data</CTableHeaderCell>
                                        </CTableRow>
                                    </CTableHead>
                                    <CTableBody>
                                        {questoes.length === 0 ? (
                                            <CTableRow>
                                                <CTableDataCell colSpan={5} className="text-center">Nenhuma tentativa encontrada.</CTableDataCell>
                                            </CTableRow>
                                        ) : (
                                            questoes.map((item, idx) => (
                                                <CTableRow key={idx}>
                                                    <CTableDataCell>{(pagina - 1) * porPagina + idx + 1}</CTableDataCell>
                                                    <CTableDataCell>
                                                        <div className="fw-medium">{item.enunciado}</div>
                                                        <small className="text-body-secondary">{item.materias}</small>
                                                    </CTableDataCell>
                                                    <CTableDataCell>{item.materia_sessao}</CTableDataCell>
                                                    <CTableDataCell className="text-center">
                                                        <CBadge color={item.acertou ? 'success' : 'danger'}>
                                                            {item.acertou ? 'Acerto' : 'Erro'}
                                                        </CBadge>
                                                    </CTableDataCell>
                                                    <CTableDataCell className="text-center">
                                                        {new Date(item.data).toLocaleDateString('pt-BR')}
                                                    </CTableDataCell>
                                                </CTableRow>
                                            ))
                                        )}
                                    </CTableBody>
                                </CTable>
                            </div>

                            {total_paginas > 1 && (
                                <div className="d-flex justify-content-center mt-3">
                                    <CPagination>
                                        <CPaginationItem disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</CPaginationItem>
                                        {[...Array(total_paginas)].map((_, i) => (
                                            <CPaginationItem key={i} active={pagina === i + 1} onClick={() => setPagina(i + 1)}>{i + 1}</CPaginationItem>
                                        ))}
                                        <CPaginationItem disabled={pagina === total_paginas} onClick={() => setPagina(p => p + 1)}>Próxima</CPaginationItem>
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

export default MinhasQuestoes