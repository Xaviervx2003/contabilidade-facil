import React, { useEffect, useState } from 'react'
import {
    CCard, CCardBody, CCardHeader,
    CTable, CTableHead, CTableBody, CTableRow,
    CTableHeaderCell, CTableDataCell,
    CButton, CBadge, CSpinner, CAlert,
    CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
    CForm, CFormLabel, CFormInput, CFormSelect,
    CRow, CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash, cilUserPlus } from '@coreui/icons'
import { API_URL } from '../../config'

// ── helpers ──────────────────────────────────────────────────
const PAPEL_BADGE = {
    admin: { color: 'danger', label: 'Admin' },
    professor: { color: 'warning', label: 'Professor' },
    aluno: { color: 'info', label: 'Aluno' },
}

const usuarioVazio = { nome: '', matricula: '', email: '', senha: '', papel: 'aluno', materia_ids: [] }

// ── componente principal ──────────────────────────────────────
const GestaoUsuarios = () => {
    const [usuarios, setUsuarios] = useState([])
    const [materias, setMaterias] = useState([])
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState(null)
    const [sucesso, setSucesso] = useState(null)

    // modal
    const [modalAberto, setModalAberto] = useState(false)
    const [modoEdicao, setModoEdicao] = useState(false)
    const [usuarioAtual, setUsuarioAtual] = useState(usuarioVazio)
    const [salvando, setSalvando] = useState(false) // Trava o botão enquanto salva

    // ── fetch ───────────────────────────────────────────────────
    const carregarUsuarios = async () => {
        setLoading(true)
        setErro(null)
        try {
            const res = await fetch(`${API_URL}/api/admin/usuarios`)
            if (!res.ok) throw new Error('Falha ao carregar usuários')
            setUsuarios(await res.json())
        } catch (e) {
            setErro('Não foi possível conectar ao servidor. Verifique o backend.')
        } finally {
            setLoading(false)
        }
    }

    const carregarMaterias = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/materias`)
            if (res.ok) setMaterias(await res.json())
        } catch { /* silencioso */ }
    }

    useEffect(() => {
        carregarUsuarios()
        carregarMaterias()
    }, [])

    // ── modal helpers ───────────────────────────────────────────
    const abrirCriar = () => {
        setUsuarioAtual(usuarioVazio)
        setModoEdicao(false)
        setErro(null)
        setModalAberto(true)
    }

    // CORREÇÃO: Busca os dados completos do usuário (incluindo as IDs das matérias) antes de editar
    const abrirEditar = async (u) => {
        setErro(null)
        try {
            const res = await fetch(`${API_URL}/api/admin/usuarios/${u.id}`)
            if (!res.ok) throw new Error('Falha ao buscar detalhes do usuário.')
            const dadosCompletos = await res.json()

            setUsuarioAtual({
                id: dadosCompletos.id,
                nome: dadosCompletos.nome,
                matricula: dadosCompletos.matricula,
                email: dadosCompletos.email || '',
                senha: '', // Não traz a senha do banco, deixa em branco
                papel: dadosCompletos.papel,
                materia_ids: dadosCompletos.materia_ids || [],
            })
            setModoEdicao(true)
            setModalAberto(true)
        } catch (e) {
            setErro(e.message)
        }
    }

    const fecharModal = () => {
        setModalAberto(false)
        setUsuarioAtual(usuarioVazio)
        setErro(null)
    }

    // ── salvar (criar ou editar) ────────────────────────────────
    const salvar = async () => {
        setErro(null)

        // CORREÇÃO: Impede o erro 500 garantindo que a senha seja enviada na criação
        if (!modoEdicao && !usuarioAtual.senha) {
            setErro("A senha é obrigatória para criar um novo usuário.")
            return
        }
        if (!usuarioAtual.nome || !usuarioAtual.matricula) {
            setErro("Nome e Matrícula são obrigatórios.")
            return
        }

        setSalvando(true)
        try {
            const url = modoEdicao
                ? `${API_URL}/api/admin/usuarios/${usuarioAtual.id}`
                : `${API_URL}/api/admin/usuarios`
            const method = modoEdicao ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usuarioAtual),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Erro ao salvar no servidor (Erro 500)')

            setSucesso(modoEdicao ? 'Usuário atualizado!' : 'Usuário criado!')
            fecharModal()
            carregarUsuarios()
            setTimeout(() => setSucesso(null), 3000)
        } catch (e) {
            setErro(e.message)
        } finally {
            setSalvando(false)
        }
    }

    // ── deletar ─────────────────────────────────────────────────
    const deletar = async (id, nome) => {
        if (!window.confirm(`Remover "${nome}"? Esta ação não pode ser desfeita.`)) return
        try {
            const res = await fetch(`${API_URL}/api/admin/usuarios/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Erro ao deletar')
            setSucesso('Usuário removido!')
            carregarUsuarios()
            setTimeout(() => setSucesso(null), 3000)
        } catch (e) {
            setErro(e.message)
        }
    }

    // ── toggle matéria ──────────────────────────────────────────
    const toggleMateria = (id) => {
        setUsuarioAtual(prev => {
            const ids = prev.materia_ids.includes(id)
                ? prev.materia_ids.filter(x => x !== id)
                : [...prev.materia_ids, id]
            return { ...prev, materia_ids: ids }
        })
    }

    // ── render ──────────────────────────────────────────────────
    return (
        <>
            {sucesso && <CAlert color="success" dismissible onClose={() => setSucesso(null)}>{sucesso}</CAlert>}
            {erro && <CAlert color="danger" dismissible onClose={() => setErro(null)}>{erro}</CAlert>}

            <CCard className="mb-4">
                <CCardHeader className="d-flex justify-content-between align-items-center">
                    <strong>Gestão de Usuários</strong>
                    <CButton color="primary" size="sm" onClick={abrirCriar}>
                        <CIcon icon={cilUserPlus} className="me-1" /> Novo Usuário
                    </CButton>
                </CCardHeader>

                <CCardBody>
                    {loading ? (
                        <div className="text-center py-5"><CSpinner /></div>
                    ) : (
                        <CTable align="middle" hover responsive bordered className="mb-0">
                            <CTableHead className="table-light">
                                <CTableRow>
                                    <CTableHeaderCell>#</CTableHeaderCell>
                                    <CTableHeaderCell>Nome</CTableHeaderCell>
                                    <CTableHeaderCell>Matrícula</CTableHeaderCell>
                                    <CTableHeaderCell>E-mail</CTableHeaderCell>
                                    <CTableHeaderCell className="text-center">Papel</CTableHeaderCell>
                                    <CTableHeaderCell>Matérias (Professor)</CTableHeaderCell>
                                    <CTableHeaderCell className="text-center">Ações</CTableHeaderCell>
                                </CTableRow>
                            </CTableHead>

                            <CTableBody>
                                {usuarios.length === 0 ? (
                                    <CTableRow>
                                        <CTableDataCell colSpan={7} className="text-center py-4 text-muted">
                                            Nenhum usuário encontrado.
                                        </CTableDataCell>
                                    </CTableRow>
                                ) : usuarios.map((u, idx) => {
                                    const badge = PAPEL_BADGE[u.papel] || { color: 'secondary', label: u.papel }
                                    return (
                                        <CTableRow key={u.id}>
                                            <CTableDataCell className="text-muted">{idx + 1}</CTableDataCell>
                                            <CTableDataCell><strong>{u.nome}</strong></CTableDataCell>
                                            <CTableDataCell><code>{u.matricula}</code></CTableDataCell>
                                            <CTableDataCell>{u.email || <span className="text-muted">—</span>}</CTableDataCell>
                                            <CTableDataCell className="text-center">
                                                <CBadge color={badge.color}>{badge.label}</CBadge>
                                            </CTableDataCell>
                                            <CTableDataCell>
                                                {u.papel === 'professor'
                                                    ? u.materias_ensinadas
                                                    : <span className="text-muted">—</span>}
                                            </CTableDataCell>
                                            <CTableDataCell className="text-center">
                                                <CButton
                                                    color="warning" variant="outline" size="sm"
                                                    className="me-2" onClick={() => abrirEditar(u)}
                                                >
                                                    <CIcon icon={cilPencil} />
                                                </CButton>
                                                <CButton
                                                    color="danger" variant="outline" size="sm"
                                                    onClick={() => deletar(u.id, u.nome)}
                                                    disabled={u.id === 1}
                                                    title={u.id === 1 ? 'Admin principal não pode ser removido' : ''}
                                                >
                                                    <CIcon icon={cilTrash} />
                                                </CButton>
                                            </CTableDataCell>
                                        </CTableRow>
                                    )
                                })}
                            </CTableBody>
                        </CTable>
                    )}
                </CCardBody>
            </CCard>

            {/* ── Modal Criar / Editar ─────────────────────────────── */}
            <CModal visible={modalAberto} onClose={fecharModal} size="lg" backdrop="static">
                <CModalHeader>
                    <CModalTitle>{modoEdicao ? 'Editar Usuário' : 'Novo Usuário'}</CModalTitle>
                </CModalHeader>

                <CModalBody>
                    <CForm>
                        <CRow className="mb-3">
                            <CCol md={6}>
                                <CFormLabel>Nome completo</CFormLabel>
                                <CFormInput
                                    value={usuarioAtual.nome}
                                    onChange={e => setUsuarioAtual(p => ({ ...p, nome: e.target.value }))}
                                    placeholder="Ex.: João Silva"
                                />
                            </CCol>
                            <CCol md={6}>
                                <CFormLabel>Matrícula</CFormLabel>
                                <CFormInput
                                    value={usuarioAtual.matricula}
                                    onChange={e => setUsuarioAtual(p => ({ ...p, matricula: e.target.value }))}
                                    placeholder="Ex.: 2024001"
                                    disabled={modoEdicao}  // matrícula não pode ser alterada depois
                                />
                            </CCol>
                        </CRow>

                        <CRow className="mb-3">
                            <CCol md={6}>
                                <CFormLabel>E-mail <span className="text-muted">(opcional)</span></CFormLabel>
                                <CFormInput
                                    type="email"
                                    value={usuarioAtual.email}
                                    onChange={e => setUsuarioAtual(p => ({ ...p, email: e.target.value }))}
                                    placeholder="Ex.: joao@email.com"
                                />
                            </CCol>
                            <CCol md={6}>
                                <CFormLabel>
                                    {modoEdicao ? 'Nova senha (deixe vazio para não alterar)' : 'Senha'}
                                </CFormLabel>
                                <CFormInput
                                    type="password"
                                    value={usuarioAtual.senha}
                                    onChange={e => setUsuarioAtual(p => ({ ...p, senha: e.target.value }))}
                                    placeholder="••••••••"
                                />
                            </CCol>
                        </CRow>

                        <CRow className="mb-3">
                            <CCol md={6}>
                                <CFormLabel>Papel</CFormLabel>
                                <CFormSelect
                                    value={usuarioAtual.papel}
                                    onChange={e => setUsuarioAtual(p => ({ ...p, papel: e.target.value, materia_ids: [] }))}
                                >
                                    <option value="aluno">Aluno</option>
                                    <option value="professor">Professor</option>
                                    <option value="admin">Admin</option>
                                </CFormSelect>
                            </CCol>
                        </CRow>

                        {/* Matérias — aparece só se for professor */}
                        {usuarioAtual.papel === 'professor' && (
                            <CRow className="mb-2">
                                <CCol>
                                    <CFormLabel>Matérias que este professor ensina</CFormLabel>
                                    <div className="d-flex flex-wrap gap-2 mt-1">
                                        {materias.length === 0 ? (
                                            <span className="text-muted">Nenhuma matéria cadastrada.</span>
                                        ) : materias.map(m => {
                                            const selecionado = usuarioAtual.materia_ids.includes(m.id)
                                            return (
                                                <CButton
                                                    key={m.id}
                                                    color={selecionado ? 'primary' : 'secondary'}
                                                    variant={selecionado ? undefined : 'outline'}
                                                    size="sm"
                                                    onClick={() => toggleMateria(m.id)}
                                                >
                                                    {m.nome}
                                                </CButton>
                                            )
                                        })}
                                    </div>
                                </CCol>
                            </CRow>
                        )}
                    </CForm>
                </CModalBody>

                <CModalFooter>
                    <CButton color="secondary" onClick={fecharModal} disabled={salvando}>Cancelar</CButton>
                    <CButton color="primary" onClick={salvar} disabled={salvando}>
                        {salvando ? <CSpinner size="sm" /> : (modoEdicao ? 'Salvar Alterações' : 'Criar Usuário')}
                    </CButton>
                </CModalFooter>
            </CModal>
        </>
    )
}

export default GestaoUsuarios