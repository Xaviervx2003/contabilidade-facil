import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUsuarios, useCriarUsuario, useAtualizarUsuario, useDeletarUsuario } from '../../hooks/useUsuarios'
import { useMaterias } from '../../hooks/useMaterias'
import { usuariosService } from '../../services/usuariosService'
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
    status_aluno?: string
    celular?: string
    periodo?: number
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
    status_aluno: string
    celular: string
    periodo: number | ''
}

interface FormErrors {
    nome?: string
    matricula?: string
    email?: string
    senha?: string
    materia_ids?: string
}

const FORM_INICIAL: FormData = {
    nome: '', matricula: '', email: '', senha: '', papel: 'aluno', materia_ids: [],
    status_aluno: 'ativo', celular: '', periodo: ''
}

const PAPEL_BADGE: Record<Papel, { color: string; label: string }> = {
    admin: { color: 'danger', label: 'Admin' },
    professor: { color: 'warning', label: 'Professor' },
    aluno: { color: 'info', label: 'Aluno' },
}

const STATUS_BADGE: Record<string, { color: string; label: string }> = {
    ativo: { color: 'success', label: 'Ativo' },
    trancado: { color: 'warning', label: 'Trancado' },
    formado: { color: 'primary', label: 'Formado' },
    suspenso: { color: 'danger', label: 'Suspenso' },
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

    // Queries
    const { data: usuarios = [], isLoading: loadingUsuarios, error: erroUsuarios } = useUsuarios()
    const { data: materias = [] } = useMaterias()

    // Mutations
    const { mutateAsync: criarUsuario, isPending: salvandoCriacao } = useCriarUsuario()
    const { mutateAsync: atualizarUsuario, isPending: salvandoAtualizacao } = useAtualizarUsuario()
    const { mutateAsync: removerUsuario } = useDeletarUsuario()

    const salvando = salvandoCriacao || salvandoAtualizacao
    const loading = loadingUsuarios
    const erroGeral = erroUsuarios ? 'Falha ao carregar usuários' : null

    // Estados Locais da UI
    const [erro, setErro] = useState<string | null>(null)
    const [sucesso, setSucesso] = useState<string | null>(null)
    const [modalAberto, setModalAberto] = useState(false)
    const [modoEdicao, setModoEdicao] = useState(false)
    const [formData, setFormData] = useState<FormData>(FORM_INICIAL)
    const [formErrors, setFormErrors] = useState<FormErrors>({})

    const [busca, setBusca] = useState('')
    const [paginaAtual, setPaginaAtual] = useState(1)
    const [itensPorPagina] = useState(10)

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
            // Em React Query, se precisássemos forçar o refresh do detalhe poderiamos usar useQuery com id, 
            // mas como é uma ação pontual, podemos chamar o service direto:
            const dados = await usuariosService.getUsuarioPorId(u.id)

            setFormData({
                id: dados.id,
                nome: dados.nome,
                matricula: dados.matricula,
                email: dados.email || '',
                senha: '',
                papel: dados.papel,
                status_aluno: dados.status_aluno || 'ativo',
                celular: dados.celular || '',
                periodo: dados.periodo || '',
                materia_ids: dados.materia_ids || []
            })
            setModoEdicao(true)
            setModalAberto(true)
        } catch (e: any) {
            setErro(e.response?.data?.detail || e.message)
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

        setErro(null)
        try {
            const payload = {
                nome: formData.nome,
                matricula: formData.matricula,
                email: formData.email,
                papel: formData.papel,
                status_aluno: formData.status_aluno,
                celular: formData.celular,
                periodo: formData.periodo === '' ? null : Number(formData.periodo),
                materia_ids: formData.materia_ids,
                ...(modoEdicao ? (formData.senha ? { senha: formData.senha } : {}) : { senha: formData.senha })
            }

            if (modoEdicao) {
                await atualizarUsuario({ id: formData.id as number, dados: payload })
            } else {
                await criarUsuario(payload)
            }

            setSucesso(modoEdicao ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!')
            fecharModal()
            setTimeout(() => setSucesso(null), 3000)
        } catch (e: any) {
            setErro(e.response?.data?.detail || e.message)
        }
    }, [formData, modoEdicao, fecharModal, atualizarUsuario, criarUsuario])

    // ── 🗑️ Deletar ──────────────────────────────────────────────
    const deletar = useCallback(async (id: number, nome: string) => {
        if (!window.confirm(`Remover "${nome}"? Esta ação não pode ser desfeita.`)) return
        try {
            await removerUsuario(id)
            setSucesso('Usuário removido!')
            setTimeout(() => setSucesso(null), 3000)
        } catch (e: any) {
            setErro(e.response?.data?.detail || e.message)
        }
    }, [removerUsuario])

    // ── 🎨 Render ───────────────────────────────────────────────
    return (
        <>
            {sucesso && <CAlert color="success" dismissible onClose={() => setSucesso(null)}>{sucesso}</CAlert>}
            {(erro || erroGeral) && <CAlert color="danger" dismissible onClose={() => setErro(null)}>{erro || erroGeral}</CAlert>}

            <CCard className="mb-4 border-0 shadow-sm">
                <CCardHeader className="bg-body border-0 pb-0">
                    <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
                        <div>
                            <div className="text-uppercase text-body-secondary small fw-semibold" style={{ letterSpacing: '0.05em' }}>Controle de Acesso</div>
                            <h3 className="mb-1 fw-bold">Gestão de Usuários</h3>
                            <div className="text-body-secondary small">
                                Gerencie permissões e perfis de acesso ao sistema.
                            </div>
                        </div>
                        <div className="d-flex gap-2 align-items-start">
                            <CFormInput
                                placeholder="Buscar nome ou matrícula..."
                                size="sm"
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                style={{ maxWidth: '250px' }}
                                className="rounded-pill px-3"
                                aria-label="Campo de busca"
                            />
                            <CButton color="primary" size="sm" onClick={abrirCriar} className="rounded-pill px-3 text-nowrap">
                                <CIcon icon={cilUserPlus} className="me-1" /> Novo Usuário
                            </CButton>
                        </div>
                    </div>
                </CCardHeader>

                <CCardBody>
                    {loading ? (
                        <div className="text-center py-5"><CSpinner /></div>
                    ) : (
                        <>
                            <CTable align="middle" hover responsive className="mb-0">
                                <CTableHead className="bg-body-tertiary">
                                    <CTableRow>
                                        <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold ps-4">#</CTableHeaderCell>
                                        <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold">Nome</CTableHeaderCell>
                                        <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold">Matrícula</CTableHeaderCell>
                                        <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold">E-mail</CTableHeaderCell>
                                        <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold text-center">Papel</CTableHeaderCell>
                                        <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold text-center">Status</CTableHeaderCell>
                                        <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold">Celular</CTableHeaderCell>
                                        <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold">Matérias</CTableHeaderCell>
                                        <CTableHeaderCell className="border-0 text-uppercase small text-body-secondary fw-bold text-center pe-4">Ações</CTableHeaderCell>
                                    </CTableRow>
                                </CTableHead>

                                <CTableBody>
                                    {dadosPaginados.length === 0 ? (
                                        <CTableRow>
                                            <CTableDataCell colSpan={9} className="text-center py-4 text-body-secondary">
                                                {busca ? 'Nenhum usuário corresponde à busca.' : 'Nenhum usuário encontrado.'}
                                            </CTableDataCell>
                                        </CTableRow>
                                    ) : dadosPaginados.map((u, idx) => {
                                        const badge = PAPEL_BADGE[u.papel] || { color: 'secondary', label: u.papel }
                                        return (
                                            <CTableRow key={u.id}>
                                                <CTableDataCell className="text-body-secondary ps-4 tabular-nums">{(paginaAtual - 1) * itensPorPagina + idx + 1}</CTableDataCell>
                                                <CTableDataCell><div className="fw-bold text-reading">{u.nome}</div></CTableDataCell>
                                                <CTableDataCell><code className="text-primary">{u.matricula}</code></CTableDataCell>
                                                <CTableDataCell className="small">{u.email || <span className="text-body-secondary">—</span>}</CTableDataCell>
                                                <CTableDataCell className="text-center">
                                                    <CBadge color={badge.color} className="rounded-pill px-3 py-2" style={{ fontSize: 10 }}>{badge.label}</CBadge>
                                                </CTableDataCell>
                                                <CTableDataCell className="text-center">
                                                    {u.status_aluno ? (
                                                        <CBadge color={STATUS_BADGE[u.status_aluno]?.color || 'secondary'} className="rounded-pill px-3 py-2" style={{ fontSize: 10 }}>
                                                            {STATUS_BADGE[u.status_aluno]?.label || u.status_aluno}
                                                        </CBadge>
                                                    ) : <span className="text-body-secondary">—</span>}
                                                </CTableDataCell>
                                                <CTableDataCell className="small">{u.celular || <span className="text-body-secondary">—</span>}</CTableDataCell>
                                                <CTableDataCell className="small">
                                                    {u.papel === 'professor'
                                                        ? Array.isArray(u.materias_ensinadas) ? u.materias_ensinadas.join(', ') : u.materias_ensinadas
                                                        : <span className="text-body-secondary">—</span>}
                                                </CTableDataCell>
                                                <CTableDataCell className="pe-4">
                                                    <div className="d-flex flex-wrap justify-content-center gap-1">
                                                        <CButton
                                                            color="info" variant="ghost" size="sm" className="rounded-circle"
                                                            title="Ver Histórico/Progresso"
                                                            aria-label="Ver histórico"
                                                            onClick={() => navigate(`/aluno/historico?matricula=${encodeURIComponent(u.matricula)}`)}
                                                        >
                                                            <CIcon icon={cilChartLine} />
                                                        </CButton>
                                                        <CButton
                                                            color="warning" variant="ghost" size="sm" className="rounded-circle"
                                                            onClick={() => abrirEditar(u)}
                                                            title="Editar"
                                                            aria-label="Editar usuário"
                                                        >
                                                            <CIcon icon={cilPencil} />
                                                        </CButton>
                                                        <CButton
                                                            color="danger" variant="ghost" size="sm" className="rounded-circle"
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
                                <CFormLabel>E-mail <span className="text-body-secondary">(opcional)</span></CFormLabel>
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
                            <CCol md={4}>
                                <CFormLabel>Papel</CFormLabel>
                                <CFormSelect
                                    value={formData.papel}
                                    onChange={e => handleChange('papel', e.target.value as Papel)}
                                >
                                    <option value="aluno">Aluno</option>
                                    <option value="professor">Professor</option>
                                    <option value="admin">Admin</option>
                                </CFormSelect>
                            </CCol>
                            <CCol md={4}>
                                <CFormLabel>Status do Aluno</CFormLabel>
                                <CFormSelect
                                    value={formData.status_aluno}
                                    onChange={e => handleChange('status_aluno', e.target.value)}
                                >
                                    <option value="ativo">Ativo</option>
                                    <option value="trancado">Trancado</option>
                                    <option value="formado">Formado</option>
                                    <option value="suspenso">Suspenso</option>
                                </CFormSelect>
                            </CCol>
                            <CCol md={4}>
                                <CFormLabel>Celular</CFormLabel>
                                <CFormInput
                                    value={formData.celular}
                                    onChange={e => handleChange('celular', e.target.value)}
                                    placeholder="Ex.: (99) 99999-9999"
                                />
                            </CCol>
                        </CRow>
                        <CRow className="mb-3">
                            <CCol md={4}>
                                <CFormLabel>Período <span className="text-body-secondary">(opcional)</span></CFormLabel>
                                <CFormSelect
                                    value={formData.periodo}
                                    onChange={e => handleChange('periodo', e.target.value)}
                                >
                                    <option value="">Não informado</option>
                                    {[1,2,3,4,5,6,7,8].map(p => (
                                        <option key={p} value={p}>{p}º Período</option>
                                    ))}
                                </CFormSelect>
                            </CCol>
                        </CRow>

                        {formData.papel === 'professor' && (
                            <CRow className="mb-2">
                                <CCol>
                                    <CFormLabel>Matérias que este professor ensina <span className="text-danger">*</span></CFormLabel>
                                    <div className="d-flex flex-wrap gap-2 mt-1">
                                        {materias.length === 0 ? (
                                            <span className="text-body-secondary">Nenhuma matéria cadastrada.</span>
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