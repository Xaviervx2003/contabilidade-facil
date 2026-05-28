import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CContainer,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
} from '@coreui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@iconify/react'
import { getAlunoMatricula } from '../../utils/auth'
import { buildTokens } from '../../tokens'
import { COLOR_PALETTES } from '../../tokens'
import { useTheme } from '../../context/themeContext'
import api from '../../services/api'
import { API_URL } from '../../config'
import useAuthSession from '../../hooks/useAuthSession'
import { toast } from 'react-hot-toast'

const getInitials = (name) => {
  if (!name) return '??'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── Skeleton Loader ─────────────────────────────────────────────
const Skeleton = ({ h = 20, w = '100%', radius = 12, className = '' }) => (
  <div 
      className={`placeholder-glow ${className}`} 
      style={{ 
          height: h, 
          width: w, 
          borderRadius: radius, 
          backgroundColor: 'var(--color-bg-tertiary)',
          opacity: 0.5 
      }} 
  />
)

const Perfil = () => {
  const { nome, matricula } = useAuthSession()
  const nomeUsuario = nome || ''

  const [activeTab, setActiveTab] = useState('dados') // 'dados' | 'seguranca' | 'aparencia'
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const { accentPalette, setAccentPalette, currentPalette } = useTheme()
  const tk = buildTokens(currentPalette)

  // Estados dos dados complementares
  const [formData, setFormData] = useState({
    celular: '',
    data_nascimento: '',
    periodo: '',
    objetivo: '',
  })
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [perfilFeedback, setPerfilFeedback] = useState({ tipo: '', msg: '' })

  // Estados do formulário de senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState({ tipo: '', msg: '' })

  // ── Carregar Perfil Autenticado via React Query ─────────
  const { data: perfil, isLoading, isError } = useQuery({
    queryKey: ['perfil', matricula],
    queryFn: async () => {
      const { data } = await api.get(`/api/perfil/${matricula}`)
      if (!data.sucesso) throw new Error(data.mensagem || 'Erro ao carregar')
      return data.dados
    },
    enabled: !!matricula,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  })

  useEffect(() => {
    if (perfil) {
      setFormData({
        celular: perfil.celular || '',
        data_nascimento: perfil.data_nascimento || '',
        periodo: perfil.periodo || '',
        objetivo: perfil.objetivo || '',
      })
    }
  }, [perfil])

  const handleSalvarPerfil = async (e) => {
    e.preventDefault()
    setPerfilFeedback({ tipo: '', msg: '' })
    setSalvandoPerfil(true)
    try {
      const { data } = await api.put(`/api/perfil/${matricula}`, formData)
      if (data.sucesso) {
        setPerfilFeedback({ tipo: 'success', msg: 'Perfil atualizado com sucesso!' })
        queryClient.invalidateQueries(['perfil', matricula])
      } else {
        setPerfilFeedback({ tipo: 'danger', msg: data.mensagem })
      }
    } catch {
      setPerfilFeedback({ tipo: 'danger', msg: 'Erro de conexão com o servidor.' })
    } finally {
      setSalvandoPerfil(false)
      setTimeout(() => setPerfilFeedback({ tipo: '', msg: '' }), 4000)
    }
  }

  const handleUploadAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)

    try {
      // Axios multipart: Content-Type é definido automaticamente com boundary
      const { data } = await api.post('/api/perfil/upload-avatar', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (data.sucesso) {
        // Salva o novo avatar_url no perfil
        await api.put(`/api/perfil/${matricula}`, { avatar_url: data.dados.url })
        queryClient.invalidateQueries(['perfil', matricula])
        toast.success('Avatar atualizado!')
      } else {
        toast.error(data.mensagem)
      }
    } catch {
      toast.error('Erro ao enviar foto.')
    } finally {
      setUploading(false)
    }
  }

  const handleAlterarSenha = async (e) => {
    e.preventDefault()
    setFeedback({ tipo: '', msg: '' })

    if (novaSenha.length < 6) {
      setFeedback({ tipo: 'warning', msg: 'A nova senha deve ter pelo menos 6 caracteres.' })
      return
    }
    if (novaSenha !== confirmaSenha) {
      setFeedback({ tipo: 'danger', msg: 'As senhas não coincidem.' })
      return
    }

    setSaving(true)
    try {
      const { data } = await api.post('/api/alterar-senha', {
        matricula,
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
      })
      if (data.sucesso) {
        setFeedback({ tipo: 'success', msg: data.mensagem })
        setSenhaAtual('')
        setNovaSenha('')
        setConfirmaSenha('')
      } else {
        setFeedback({ tipo: 'danger', msg: data.mensagem })
      }
    } catch {
      setFeedback({ tipo: 'danger', msg: 'Erro de conexão com o servidor.' })
    } finally {
      setSaving(false)
    }
  }

  const formatarData = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  if (isLoading) {
    return (
      <CContainer fluid className="py-4">
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Skeleton h={40} w="30%" className="mb-4" />
          <CRow className="g-4">
            <CCol xs={12} md={6}>
              <Skeleton h={300} w="100%" radius={24} />
            </CCol>
            <CCol xs={12} md={6}>
              <Skeleton h={350} w="100%" radius={24} />
            </CCol>
          </CRow>
        </div>
      </CContainer>
    )
  }

  if (isError || !perfil) {
    return (
      <CContainer fluid className="py-4 text-center">
        <CAlert color="danger" style={{ borderRadius: 16 }}>
          Não foi possível carregar seu perfil. Faça login novamente.
        </CAlert>
      </CContainer>
    )
  }

  const initials = getInitials(perfil.nome || nomeUsuario)

  return (
    <CContainer fluid className="py-4 px-0" style={{ fontFamily: "'Circular Std', 'Nunito', sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        
        {/* HEADER PREMIUM */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '-0.5px', marginBottom: 8 }}>
            Minha Conta
          </h2>
          <p style={{ fontSize: 14, color: tk.foggy, fontWeight: 600, margin: 0 }}>
            Gerencie seus dados pessoais, configurações e credenciais de segurança.
          </p>
        </div>

        {/* TABS DE NAVEGAÇÃO PREMIUM (Segmented Control) */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--color-bg-tertiary)',
          padding: 6,
          borderRadius: 20,
          border: '1px solid var(--color-border)',
          gap: 4,
          marginBottom: 32,
          position: 'relative',
          flexWrap: 'wrap'
        }}>
            {[
              { id: 'dados', label: 'Informações Pessoais', icon: 'solar:user-circle-bold-duotone' },
              { id: 'seguranca', label: 'Segurança da Conta', icon: 'solar:shield-keyhole-bold-duotone' },
              { id: 'aparencia', label: 'Aparência', icon: 'solar:palette-bold-duotone' },
            ].map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 16,
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: 14,
                    border: 'none',
                    background: 'transparent',
                    color: isActive ? 'var(--accent-primary, #FF385C)' /* fallback: tema não carregado */ : tk.foggy,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    zIndex: 1,
                    transition: 'color 0.2s'
                  }}
                >
                  <Icon icon={tab.icon} width="18" />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="perfil-tab-active-bg"
                      className="position-absolute top-0 start-0 end-0 bottom-0"
                      style={{
                        background: 'var(--color-bg-elevated)',
                        borderRadius: 12,
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        zIndex: -1
                      }}
                    />
                  )}
                </button>
              )
            })}
        </div>

        <div className="fade-in">
          
          {/* PAINEL DE INFORMAÇÕES PESSOAIS */}
          {activeTab === 'dados' && (
            <CCol xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                background: tk.bg,
                border: `1px solid ${tk.border}`,
                borderRadius: 24,
                padding: 32,
                boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                height: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  Informações Pessoais
                </h4>
                <Icon icon="solar:user-circle-bold-duotone" width="32" style={{ color: tk.babu }} />
              </div>

              {/* Avatar e Identificação */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
                <div style={{ position: 'relative' }}>
                  {perfil.avatar_url ? (
                    <img 
                      src={perfil.avatar_url.startsWith('http') ? perfil.avatar_url : `${API_URL}${perfil.avatar_url}`} 
                      alt="Avatar" 
                      style={{
                        width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                        boxShadow: `0 8px 20px ${tk.rausch}40`, border: `2px solid ${tk.rausch}`,
                        opacity: uploading ? 0.5 : 1
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${tk.rausch}, ${tk.arches})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 32, fontWeight: 800,
                      boxShadow: `0 8px 20px ${tk.rausch}40`,
                      opacity: uploading ? 0.5 : 1
                    }}>
                      {initials}
                    </div>
                  )}
                  {uploading && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.55)', borderRadius: '50%', color: '#fff', fontSize: 10, fontWeight: 700,
                      zIndex: 2
                    }}>
                      <CSpinner size="sm" className="mb-1" color="light" />
                      <span style={{ fontSize: 9 }}>Enviando...</span>
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: 'absolute', bottom: -5, right: -5, 
                      background: tk.bg, border: `1px solid ${tk.border}`,
                      borderRadius: '50%', width: 32, height: 32,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                      padding: 0, zIndex: 3
                    }}
                    title="Alterar Foto"
                    aria-label="Alterar Foto"
                    disabled={uploading}
                  >
                    {uploading ? <CSpinner size="sm" /> : <Icon icon="solar:camera-bold-duotone" width="18" style={{ color: tk.rausch }} />}
                  </button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    ref={fileInputRef} 
                    onChange={handleUploadAvatar} 
                    disabled={uploading}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: tk.foggy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    Nome Completo
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {perfil.nome}
                  </div>
                </div>
              </div>

              {/* Detalhes (Matrícula, Acesso, Data) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: tk.bgSub, borderRadius: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${tk.babu}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tk.babu }}>
                    <Icon icon="solar:id-card-bold-duotone" width="24" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: tk.foggy, fontWeight: 800, textTransform: 'uppercase' }}>Matrícula</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{perfil.matricula}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: tk.bgSub, borderRadius: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${tk.arches}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tk.arches }}>
                    <Icon icon="solar:shield-keyhole-bold-duotone" width="24" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: tk.foggy, fontWeight: 800, textTransform: 'uppercase' }}>Tipo de Acesso</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                      {perfil.papel === 'aluno' ? 'Estudante' : perfil.papel}
                    </div>
                  </div>
                </div>

                {perfil.criado_em && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', border: `1px dashed ${tk.border}`, borderRadius: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tk.foggy }}>
                      <Icon icon="solar:calendar-date-bold-duotone" width="24" />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: tk.foggy, fontWeight: 800, textTransform: 'uppercase' }}>Membro desde</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatarData(perfil.criado_em)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Formulário de Dados Complementares */}
              <div style={{ borderTop: `1px solid ${tk.border}`, paddingTop: 32 }}>
                <h5 style={{ fontSize: 16, fontWeight: 800, marginBottom: 24, color: 'var(--color-text-primary)' }}>Dados Complementares</h5>
                
                <AnimatePresence mode="wait">
                  {perfilFeedback.msg && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                      <CAlert color={perfilFeedback.tipo} style={{ borderRadius: 12, fontSize: 13, fontWeight: 600, margin: 0, border: 'none' }}>
                        {perfilFeedback.tipo === 'success' ? <Icon icon="solar:check-circle-bold" className="me-2" /> : <Icon icon="solar:danger-triangle-bold" className="me-2" />}
                        {perfilFeedback.msg}
                      </CAlert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <CForm onSubmit={handleSalvarPerfil}>
                  <CRow className="g-4 mb-4">
                    <CCol xs={12} md={6}>
                      <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tk.foggy, textTransform: 'uppercase' }}>Celular</CFormLabel>
                      <CFormInput
                        value={formData.celular}
                        onChange={(e) => setFormData(prev => ({ ...prev, celular: e.target.value }))}
                        placeholder="(99) 99999-9999"
                        style={{ background: tk.bgSub, border: 'none', borderRadius: 14, padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}
                      />
                    </CCol>
                    <CCol xs={12} md={6}>
                      <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tk.foggy, textTransform: 'uppercase' }}>Data de Nascimento</CFormLabel>
                      <CFormInput
                        type="date"
                        value={formData.data_nascimento}
                        onChange={(e) => setFormData(prev => ({ ...prev, data_nascimento: e.target.value }))}
                        style={{ background: tk.bgSub, border: 'none', borderRadius: 14, padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}
                      />
                    </CCol>
                    <CCol xs={12} md={6}>
                      <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tk.foggy, textTransform: 'uppercase' }}>Período do Curso</CFormLabel>
                      <select 
                        className="form-select"
                        value={formData.periodo}
                        onChange={(e) => setFormData(prev => ({ ...prev, periodo: e.target.value }))}
                        style={{ background: tk.bgSub, border: 'none', borderRadius: 14, padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}
                      >
                        <option value="">Não informado</option>
                        {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>{p}º Período</option>)}
                      </select>
                    </CCol>
                    <CCol xs={12} md={6}>
                      <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tk.foggy, textTransform: 'uppercase' }}>Objetivo</CFormLabel>
                      <select 
                        className="form-select"
                        value={formData.objetivo}
                        onChange={(e) => setFormData(prev => ({ ...prev, objetivo: e.target.value }))}
                        style={{ background: tk.bgSub, border: 'none', borderRadius: 14, padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}
                      >
                        <option value="">Não informado</option>
                        <option value="CFC">Exame de Suficiência (CFC)</option>
                        <option value="Concurso">Concursos Públicos</option>
                        <option value="Reforco">Reforço Universitário</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </CCol>
                  </CRow>
                  <CButton 
                    type="submit" 
                    disabled={salvandoPerfil}
                    style={{
                      background: tk.babu, color: '#fff', border: 'none', borderRadius: 16,
                      padding: '16px 24px', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
                      boxShadow: `0 8px 24px ${tk.babu}30`, transition: 'all 0.2s', width: '100%', justifyContent: 'center'
                    }}
                  >
                    {salvandoPerfil ? <><CSpinner size="sm" /> Salvando...</> : <><Icon icon="solar:diskette-bold" width="20" /> Salvar Alterações</>}
                  </CButton>
                </CForm>
              </div>
            </motion.div>
          </CCol>
          )}

          {/* PAINEL DE SEGURANÇA (ALTERAR SENHA) */}
          {activeTab === 'seguranca' && (
          <CCol xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              style={{
                background: tk.bg,
                border: `1px solid ${tk.border}`,
                borderRadius: 24,
                padding: 32,
                boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  Segurança da Conta
                </h4>
                <Icon icon="solar:lock-password-bold-duotone" width="32" style={{ color: tk.rausch }} />
              </div>

              <div style={{ fontSize: 13, color: tk.foggy, fontWeight: 600, marginBottom: 24, lineHeight: 1.5 }}>
                Para manter sua conta segura, utilize uma senha forte contendo letras, números e no mínimo 6 caracteres.
              </div>

              <AnimatePresence mode="wait">
                {feedback.msg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4"
                  >
                    <CAlert color={feedback.tipo} style={{ borderRadius: 12, fontSize: 13, fontWeight: 600, margin: 0, border: 'none' }}>
                      {feedback.tipo === 'success' ? <Icon icon="solar:check-circle-bold" className="me-2" /> : <Icon icon="solar:danger-triangle-bold" className="me-2" />}
                      {feedback.msg}
                    </CAlert>
                  </motion.div>
                )}
              </AnimatePresence>

              <CForm onSubmit={handleAlterarSenha} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                  <div className="mb-4">
                    <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tk.foggy, textTransform: 'uppercase' }}>Senha Atual</CFormLabel>
                    <CFormInput
                      type="password"
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      placeholder="Digite sua senha atual"
                      required
                      style={{
                        background: tk.bgSub, border: 'none', borderRadius: 14,
                        padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', outline: 'none'
                      }}
                    />
                  </div>

                  <div className="mb-4">
                    <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tk.foggy, textTransform: 'uppercase' }}>Nova Senha</CFormLabel>
                    <CFormInput
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      required
                      style={{
                        background: tk.bgSub, border: 'none', borderRadius: 14,
                        padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', outline: 'none'
                      }}
                    />
                  </div>

                  <div className="mb-5">
                    <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tk.foggy, textTransform: 'uppercase' }}>Confirmar Nova Senha</CFormLabel>
                    <CFormInput
                      type="password"
                      value={confirmaSenha}
                      onChange={(e) => setConfirmaSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      required
                      style={{
                        background: tk.bgSub, border: 'none', borderRadius: 14,
                        padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <CButton 
                  type="submit" 
                  disabled={saving}
                  style={{
                    background: tk.rausch,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 16,
                    padding: '16px',
                    fontWeight: 800,
                    fontSize: 14,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: `0 8px 24px ${tk.rausch}30`,
                    transition: 'all 0.2s',
                    marginTop: 'auto'
                  }}
                >
                  {saving ? (
                    <><CSpinner size="sm" /> Atualizando Senha...</>
                  ) : (
                    <><Icon icon="solar:shield-check-bold" width="20" /> Salvar Nova Senha</>
                  )}
                </CButton>
              </CForm>
            </motion.div>
          </CCol>
          )}
          {/* PAINEL DE APARÊNCIA */}
          {activeTab === 'aparencia' && (
            <CCol xs={12}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                style={{ background: tk.bg, border: `1px solid ${tk.border}`, borderRadius: 24, padding: 32, boxShadow: '0 8px 30px rgba(0,0,0,0.02)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>Paleta de Cores</h4>
                  <Icon icon="solar:palette-bold-duotone" width="32" style={{ color: tk.arches }} />
                </div>
                <p style={{ fontSize: 13, color: tk.foggy, marginBottom: 28 }}>
                  Escolha a cor de destaque da interface. Ela é aplicada em botões, barras de progresso, menu ativo e muito mais.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 }}>
                  {Object.values(COLOR_PALETTES).map((palette) => {
                    const isActive = accentPalette === palette.id
                    return (
                      <motion.button key={palette.id} whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.96 }}
                        type="button" onClick={() => setAccentPalette(palette.id)} aria-pressed={isActive}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                          padding: '18px 12px', borderRadius: 18,
                          border: isActive ? `2.5px solid ${palette.primary}` : `1.5px solid ${tk.border}`,
                          background: isActive ? `${palette.primary}10` : tk.bgSub,
                          cursor: 'pointer', transition: 'all 0.2s',
                          boxShadow: isActive ? `0 6px 20px ${palette.primary}25` : 'none',
                        }}
                      >
                        <div style={{
                          width: 52, height: 52, borderRadius: '50%',
                          background: `conic-gradient(${palette.primary} 0deg 120deg, ${palette.secondary} 120deg 240deg, ${palette.accent} 240deg 360deg)`,
                          boxShadow: isActive ? `0 6px 16px ${palette.primary}50` : '0 3px 8px rgba(0,0,0,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isActive && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                              style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon icon="solar:check-circle-bold" width="16" style={{ color: palette.primary }} />
                            </motion.div>
                          )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: isActive ? 800 : 600, color: isActive ? palette.primary : 'var(--color-text-primary)' }}>
                            {palette.emoji} {palette.label}
                          </div>
                          <div style={{ fontSize: 10, color: tk.foggy, marginTop: 2, fontFamily: 'monospace' }}>{palette.primary}</div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
                <div style={{ marginTop: 24, padding: '12px 16px', background: tk.bgSub, borderRadius: 12, fontSize: 12, color: tk.foggy, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon icon="solar:info-circle-linear" width="14" />
                  A sua preferência de cor é salva automaticamente no navegador.
                </div>
              </motion.div>
            </CCol>
          )}

        </div>
      </div>
    </CContainer>
  )
}

export default Perfil
