import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    CCard, CCardBody, CCardHeader,
    CTable, CTableHead, CTableBody, CTableRow,
    CTableHeaderCell, CTableDataCell,
    CButton, CBadge, CSpinner, CAlert,
    CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
    CForm, CFormLabel, CFormInput, CFormSelect,
    CRow, CCol,
    CPagination, CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash, cilUserPlus, cilChartLine, cilArrowLeft, cilArrowRight } from '@coreui/icons'
import { API_URL } from '../../config'

// ── 📘 Tipos & Interfaces ──────────────────────────────────────
type Papel = 'admin' | 'professor' | 'aluno'

interface Usuario {
    id: number
    nome: string
    matricula: string
    email?: string
    papel: Papel
    materia_ids: number[]
    materias_ensinadas?: string[] // Usado apenas para exibição na tabela
}

interface Materia {
    id: number
    nome: string
}

interface FormData {
    id?: number
    nome: string
    matricula: string
    email: string
    senha: string
    papel: Papel
    materia_ids: number[]
}

interface FormErrors {
    nome?: string
    matricula?: string
    email?: string
    senha?: string
    materia_ids?: string
}

const FORM_INICIAL: FormData = {
    nome: '', matricula: '', email: '', senha: '', papel: 'aluno', materia_ids: []
}

const PAPEL_BADGE: Record<Papel, { color: string; label: string }> = {
    admin: { color: 'danger', label: 'Admin' },
    professor: { color: 'warning', label: 'Professor' },
    aluno: { color: 'info', label: 'Aluno' },
}

// ── 🔍 Validação ───────────────────────────────────────────────
const validarFormulario = (data: FormData, isEdit: boolean): FormErrors => {
    const errors: FormErrors = {}
    if (!data.nome.trim()) errors.nome = 'Nome é obrigatório'
    if (!data.matricula.trim()) errors.matricula = 'Matrícula é obrigatória'
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Formato de e-mail inválido'
    if (!isEdit && !data.senha) errors.senha = 'Senha é obrigatória para novo usuário'
    if (data.papel === 'professor' && data.materia_ids.length === 0) errors.materia_ids = 'Selecione ao menos uma matéria'
    return errors
}

// ── 🧩 Componente Principal ────────────────────────────────────
const GestaoUsuarios = () => {
    const navigate = useNavigate()
    const abortRef = useRef<AbortController | null>(null)

    // Estados
    const [usuarios, setUsuarios] = useState<Usuario[]>([])
    const [materias, setMaterias] = useState<Materia[]>([])
    const [loading, setLoading] = useState(true)
    const [erro, setErro] = useState<string | null>(null)
    const [sucesso, setSucesso] = useState<string | null>(null)

    const [modalAberto, setModalAberto] = useState(false)
    const [modoEdicao, setModoEdicao] = useState(false)
    const [formData, setFormData] = useState<FormData>(FORM_INICIAL)
    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [salvando, setSalvando] = useState(false)

    const [busca, setBusca] = useState('')
    const [paginaAtual, setPaginaAtual] = useState(1)
    const [itensPorPagina] = useState(10)

    // ── 📡 Fetch com AbortController ─────────────────────────────
    const carregarDados = useCallback(async () => {
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        setLoading(true)
        setErro(null)

        try {
            const [resUsuarios, resMaterias] = await Promise.all([
                fetch(`${API_URL}/api/admin/usuarios`, { signal: controller.signal }),
                fetch(`${API_URL}/api/admin/materias`, { signal: controller.signal })
            ])

            if (!resUsuarios.ok) throw new Error('Falha ao carregar usuários')
            setUsuarios(await resUsuarios.json())

            if (resMaterias.ok) setMaterias(await resMaterias.json())
            else setMaterias([])
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setErro('Não foi possível conectar ao servidor. Verifique o backend.')
            }
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        carregarDados()
        return () => abortRef.current?.abort()
    }, [carregarDados])

    // ── 🔎 Filtragem & Paginação ────────────────────────────────
    const usuariosFiltrados = useMemo(() => {
        const termo = busca.toLowerCase()
        return usuarios.filter(u =>
            u.nome.toLowerCase().includes(termo) ||
            u.matricula.toLowerCase().includes(termo)
        )
    }, [usuarios, busca])

    useEffect(() => { setPaginaAtual(1) }, [busca, usuarios])

    const dadosPaginados = useMemo(() => {
        const inicio = (paginaAtual - 1) * itensPorPagina
        return usuariosFiltrados.slice(inicio, inicio + itensPorPagina)
    }, [usuariosFiltrados, paginaAtual, itensPorPagina])

    const totalPaginas = Math.ceil(usuariosFiltrados.length / itensPorPagina)

    // ── 📝 Modal Handlers ───────────────────────────────────────
    const resetForm = useCallback(() => {
        setFormData(FORM_INICIAL)
        setFormErrors({})
        setModoEdicao(false)
    }, [])

    const abrirCriar = useCallback(() => {
        resetForm()
        setModalAberto(true)
    }, [resetForm])

    const abrirEditar = useCallback(async (u: Usuario) => {
        setErro(null)
        try {
            const res = await fetch(`${API_URL}/api/admin/usuarios/${u.id}`)
            if (!res.ok) throw new Error('Falha ao buscar detalhes do usuário.')
            const dados = await res.json()

            setFormData({
                id: dados.id,
                nome: dados.nome,
                matricula: dados.matricula,
                email: dados.email || '',
                senha: '',
                papel: dados.papel,
                materia_ids: dados.materia_ids || []
            })
            setModoEdicao(true)
            setModalAberto(true)
        } catch (e: any) {
            setErro(e.message)
        }
    }, [])

    const fecharModal = useCallback(() => {
        setModalAberto(false)
        resetForm()
    }, [resetForm])

    const handleChange = useCallback((field: keyof FormData, value: string | number | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }, [])

    const toggleMateria = useCallback((id: number) => {
        setFormData(prev => {
            const ids = prev.materia_ids.includes(id)
                ? prev.materia_ids.filter(x => x !== id)
                : [...prev.materia_ids, id]
            return { ...prev, materia_ids: ids }
        })
        setFormErrors(prev => ({ ...prev, materia_ids: undefined }))
    }, [])

    // ── 💾 Salvar ───────────────────────────────────────────────
    const salvar = useCallback(async () => {
        const errors = validarFormulario(formData, modoEdicao)
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors)
            return
        }

        setSalvando(true)
        setErro(null)
        try {
            // Payload condicional: não envia senha se vazia na edição
            const payload = {
                nome: formData.nome,
                matricula: formData.matricula,
                email: formData.email,
                papel: formData.papel,
                materia_ids: formData.materia_ids,
                ...(modoEdicao ? (formData.senha ? { senha: formData.senha } : {}) : { senha: formData.senha })
            }

            const res = await fetch(
                modoEdicao ? `${API_URL}/api/admin/usuarios/${formData.id}` : `${API_URL}/api/admin/usuarios`,
                {
                    method: modoEdicao ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }
            )

            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Erro ao salvar no servidor')

            setSucesso(modoEdicao ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!')
            fecharModal()
            carregarDados()
            setTimeout(() => setSucesso(null), 3000)
        } catch (e: any) {
            setErro(e.message)
        } finally {
            setSalvando(false)
        }
    }, [formData, modoEdicao, fecharModal, carregarDados])

    // ── 🗑️ Deletar ──────────────────────────────────────────────
    const deletar = useCallback(async (id: number, nome: string) => {
        if (!window.confirm(`Remover "${nome}"? Esta ação não pode ser desfeita.`)) return
        try {
            const res = await fetch(`${API_URL}/api/admin/usuarios/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Erro ao deletar')
            setSucesso('Usuário removido!')
            carregarDados()
            setTimeout(() => setSucesso(null), 3000)
        } catch (e: any) {
            setErro(e.message)
        }
    }, [carregarDados])

    // ── 🎨 Render ───────────────────────────────────────────────
    return (
        <>
            {sucesso && <CAlert color="success" dismissible onClose={() => setSucesso(null)}>{sucesso}</CAlert>}
            {erro && <CAlert color="danger" dismissible onClose={() => setErro(null)}>{erro}</CAlert>}

            <CCard className="mb-4">
                <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div className="d-flex align-items-center gap-2">
                        <strong>Gestão de Usuários</strong>
                        <CBadge color="secondary">{usuariosFiltrados.length}</CBadge>
                    </div>

                    <div className="d-flex flex-grow-1 flex-md-grow-0 gap-2">
                        <CFormInput
                            placeholder="Buscar nome ou matrícula..."
                            size="sm"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            style={{ maxWidth: '250px' }}
                            aria-label="Campo de busca"
                        />
                        <CButton color="primary" size="sm" onClick={abrirCriar} className="text-nowrap">
                            <CIcon icon={cilUserPlus} className="me-1" /> Novo
                        </CButton>
                    </div>
                </CCardHeader>

                <CCardBody>
                    {loading ? (
                        <div className="text-center py-5"><CSpinner /></div>
                    ) : (
                        <>
                            <CTable align="middle" hover responsive bordered className="mb-0">
                                <CTableHead className="table-light">
                                    <CTableRow>
                                        <CTableHeaderCell>#</CTableHeaderCell>
                                        <CTableHeaderCell>Nome</CTableHeaderCell>
                                        <CTableHeaderCell>Matrícula</CTableHeaderCell>
                                        <CTableHeaderCell>E-mail</CTableHeaderCell>
                                        <CTableHeaderCell className="text-center">Papel</CTableHeaderCell>
                                        <CTableHeaderCell>Matérias</CTableHeaderCell>
                                        <CTableHeaderCell className="text-center">Ações</CTableHeaderCell>
                                    </CTableRow>
                                </CTableHead>

                                <CTableBody>
                                    {dadosPaginados.length === 0 ? (
                                        <CTableRow>
                                            <CTableDataCell colSpan={7} className="text-center py-4 text-muted">
                                                {busca ? 'Nenhum usuário corresponde à busca.' : 'Nenhum usuário encontrado.'}
                                            </CTableDataCell>
                                        </CTableRow>
                                    ) : dadosPaginados.map((u, idx) => {
                                        const badge = PAPEL_BADGE[u.papel] || { color: 'secondary', label: u.papel }
                                        return (
                                            <CTableRow key={u.id}>
                                                <CTableDataCell className="text-muted">{(paginaAtual - 1) * itensPorPagina + idx + 1}</CTableDataCell>
                                                <CTableDataCell><strong>{u.nome}</strong></CTableDataCell>
                                                <CTableDataCell><code>{u.matricula}</code></CTableDataCell>
                                                <CTableDataCell>{u.email || <span className="text-muted">—</span>}</CTableDataCell>
                                                <CTableDataCell className="text-center">
                                                    <CBadge color={badge.color}>{badge.label}</CBadge>
                                                </CTableDataCell>
                                                <CTableDataCell>
                                                    {u.papel === 'professor'
                                                        ? Array.isArray(u.materias_ensinadas) ? u.materias_ensinadas.join(', ') : u.materias_ensinadas
                                                        : <span className="text-muted">—</span>}
                                                </CTableDataCell>
                                                <CTableDataCell>
                                                    <div className="d-flex flex-wrap justify-content-center gap-1">
                                                        <CButton
                                                            color="info" variant="outline" size="sm"
                                                            title="Ver Histórico/Progresso"
                                                            aria-label="Ver histórico"
                                                            onClick={() => navigate(`/aluno/historico?matricula=${encodeURIComponent(u.matricula)}`)}
                                                        >
                                                            <CIcon icon={cilChartLine} />
                                                        </CButton>
                                                        <CButton
                                                            color="warning" variant="outline" size="sm"
                                                            onClick={() => abrirEditar(u)}
                                                            title="Editar"
                                                            aria-label="Editar usuário"
                                                        >
                                                            <CIcon icon={cilPencil} />
                                                        </CButton>
                                                        <CButton
                                                            color="danger" variant="outline" size="sm"
                                                            onClick={() => deletar(u.id, u.nome)}
                                                            disabled={u.id === 1}
                                                            title={u.id === 1 ? 'Admin principal não pode ser removido' : 'Remover usuário'}
                                                            aria-label="Remover usuário"
                                                        >
                                                            <CIcon icon={cilTrash} />
                                                        </CButton>
                                                    </div>
                                                </CTableDataCell>
                                            </CTableRow>
                                        )
                                    })}
                                </CTableBody>
                            </CTable>

                            {/* Paginação */}
                            {totalPaginas > 1 && (
                                <div className="d-flex justify-content-center mt-3">
                                    <CPagination aria-label="Paginação de usuários">
                                        <CPaginationItem
                                            disabled={paginaAtual === 1}
                                            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                                        >
                                            <CIcon icon={cilArrowLeft} />
                                        </CPaginationItem>
                                        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(page => (
                                            <CPaginationItem
                                                key={page}
                                                active={page === paginaAtual}
                                                onClick={() => setPaginaAtual(page)}
                                            >
                                                {page}
                                            </CPaginationItem>
                                        ))}
                                        <CPaginationItem
                                            disabled={paginaAtual === totalPaginas}
                                            onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                                        >
                                            <CIcon icon={cilArrowRight} />
                                        </CPaginationItem>
                                    </CPagination>
                                </div>
                            )}
                        </>
                    )}
                </CCardBody>
            </CCard>

            {/* ── Modal Formulário ──────────────────────────────────── */}
            <CModal visible={modalAberto} onClose={fecharModal} size="lg" backdrop="static">
                <CModalHeader>
                    <CModalTitle>{modoEdicao ? 'Editar Usuário' : 'Novo Usuário'}</CModalTitle>
                </CModalHeader>

                <CModalBody>
                    <CForm>
                        <CRow className="mb-3">
                            <CCol md={6}>
                                <CFormLabel>Nome completo <span className="text-danger">*</span></CFormLabel>
                                <CFormInput
                                    value={formData.nome}
                                    onChange={e => handleChange('nome', e.target.value)}
                                    placeholder="Ex.: João Silva"
                                    className={formErrors.nome ? 'is-invalid' : ''}
                                />
                                {formErrors.nome && <div className="invalid-feedback d-block">{formErrors.nome}</div>}
                            </CCol>
                            <CCol md={6}>
                                <CFormLabel>Matrícula <span className="text-danger">*</span></CFormLabel>
                                <CFormInput
                                    value={formData.matricula}
                                    onChange={e => handleChange('matricula', e.target.value)}
                                    placeholder="Ex.: 2024001"
                                    disabled={modoEdicao}
                                    className={formErrors.matricula ? 'is-invalid' : ''}
                                />
                                {formErrors.matricula && <div className="invalid-feedback d-block">{formErrors.matricula}</div>}
                            </CCol>
                        </CRow>

                        <CRow className="mb-3">
                            <CCol md={6}>
                                <CFormLabel>E-mail <span className="text-muted">(opcional)</span></CFormLabel>
                                <CFormInput
                                    type="email"
                                    value={formData.email}
                                    onChange={e => handleChange('email', e.target.value)}
                                    placeholder="Ex.: joao@email.com"
                                    className={formErrors.email ? 'is-invalid' : ''}
                                />
                                {formErrors.email && <div className="invalid-feedback d-block">{formErrors.email}</div>}
                            </CCol>
                            <CCol md={6}>
                                <CFormLabel>
                                    {modoEdicao ? 'Nova senha (deixe vazio para não alterar)' : 'Senha <span className="text-danger">*</span>'}
                                </CFormLabel>
                                <CFormInput
                                    type="password"
                                    value={formData.senha}
                                    onChange={e => handleChange('senha', e.target.value)}
                                    placeholder="••••••••"
                                    className={formErrors.senha ? 'is-invalid' : ''}
                                />
                                {formErrors.senha && <div className="invalid-feedback d-block">{formErrors.senha}</div>}
                            </CCol>
                        </CRow>

                        <CRow className="mb-3">
                            <CCol md={6}>
                                <CFormLabel>Papel</CFormLabel>
                                <CFormSelect
                                    value={formData.papel}
                                    onChange={e => handleChange('papel', e.target.value)}
                                >
                                    <option value="aluno">Aluno</option>
                                    <option value="professor">Professor</option>
                                    <option value="admin">Admin</option>
                                </CFormSelect>
                            </CCol>
                        </CRow>

                        {formData.papel === 'professor' && (
                            <CRow className="mb-2">
                                <CCol>
                                    <CFormLabel>Matérias que este professor ensina <span className="text-danger">*</span></CFormLabel>
                                    <div className="d-flex flex-wrap gap-2 mt-1">
                                        {materias.length === 0 ? (
                                            <span className="text-muted">Nenhuma matéria cadastrada.</span>
                                        ) : materias.map(m => {
                                            const selecionado = formData.materia_ids.includes(m.id)
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
                                    {formErrors.materia_ids && <div className="invalid-feedback d-block mt-1">{formErrors.materia_ids}</div>}
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