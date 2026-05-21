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
import { API_URL } from '../../config'
import { getAlunoMatricula } from '../../utils/auth'

/* ── Tokens de Design (Premium Airbnb Style) ────────────── */
const tokens = {
  rausch: '#FF385C',  // Coral principal
  babu: '#00A699',    // Teal/Verde
  arches: '#FC642D',  // Laranja
  hof: '#484848',
  foggy: '#767676',   // Cinza Muted
  border: 'var(--color-border)',
  bg: 'var(--color-bg-elevated)',
  bgSub: 'var(--color-bg-tertiary)',
  text: 'var(--color-text-primary)',
}

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
  const nomeUsuario = sessionStorage.getItem('nome') || ''
  const matricula = getAlunoMatricula() || sessionStorage.getItem('matricula')
  const token = sessionStorage.getItem('token')

  const [activeTab, setActiveTab] = useState('dados') // 'dados' | 'seguranca'
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

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
      const res = await fetch(`${API_URL}/api/perfil/${matricula}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data.sucesso) throw new Error(data.mensagem || 'Erro ao carregar')
      return data.dados
    },
    enabled: !!matricula && !!token,
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
      const res = await fetch(`${API_URL}/api/perfil/${matricula}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
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
      const res = await fetch(`${API_URL}/api/perfil/upload-avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      })
      const data = await res.json()
      if (data.sucesso) {
        // Enviar o novo avatar_url via PUT para o backend (API atualizar_perfil)
        await fetch(`${API_URL}/api/perfil/${matricula}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ avatar_url: data.dados.url })
        })
        queryClient.invalidateQueries(['perfil', matricula])
      } else {
        alert(data.mensagem)
      }
    } catch {
      alert('Erro ao enviar foto.')
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
      const res = await fetch(`${API_URL}/api/alterar-senha`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          matricula,
          senha_atual: senhaAtual,
          nova_senha: novaSenha,
        }),
      })
      const data = await res.json()
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
          <p style={{ fontSize: 14, color: tokens.foggy, fontWeight: 600, margin: 0 }}>
            Gerencie seus dados pessoais, configurações e credenciais de segurança.
          </p>
        </div>

        {/* TABS DE NAVEGAÇÃO */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: `1px solid ${tokens.border}`, paddingBottom: 16 }}>
            <div 
                onClick={() => setActiveTab('dados')}
                style={{
                    padding: '10px 20px',
                    borderRadius: 20,
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: 14,
                    background: activeTab === 'dados' ? 'var(--color-text-primary)' : 'transparent',
                    color: activeTab === 'dados' ? 'var(--color-bg-primary)' : tokens.foggy,
                    transition: 'all 0.2s'
                }}
            >
                👤 Informações Pessoais
            </div>
            <div 
                onClick={() => setActiveTab('seguranca')}
                style={{
                    padding: '10px 20px',
                    borderRadius: 20,
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: 14,
                    background: activeTab === 'seguranca' ? 'var(--color-text-primary)' : 'transparent',
                    color: activeTab === 'seguranca' ? 'var(--color-bg-primary)' : tokens.foggy,
                    transition: 'all 0.2s'
                }}
            >
                🔒 Segurança da Conta
            </div>
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
                background: tokens.bg,
                border: `1px solid ${tokens.border}`,
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
                <Icon icon="solar:user-circle-bold-duotone" width="32" style={{ color: tokens.babu }} />
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
                        boxShadow: `0 8px 20px ${tokens.rausch}40`, border: `2px solid ${tokens.rausch}`
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${tokens.rausch}, ${tokens.arches})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 32, fontWeight: 800,
                      boxShadow: `0 8px 20px ${tokens.rausch}40`
                    }}>
                      {initials}
                    </div>
                  )}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: 'absolute', bottom: -5, right: -5, 
                      background: tokens.bg, border: `1px solid ${tokens.border}`,
                      borderRadius: '50%', width: 32, height: 32,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}
                    title="Alterar Foto"
                  >
                    {uploading ? <CSpinner size="sm" /> : <Icon icon="solar:camera-bold-duotone" width="18" style={{ color: tokens.rausch }} />}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    ref={fileInputRef} 
                    onChange={handleUploadAvatar} 
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    Nome Completo
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {perfil.nome}
                  </div>
                </div>
              </div>

              {/* Detalhes (Matrícula, Acesso, Data) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: tokens.bgSub, borderRadius: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${tokens.babu}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.babu }}>
                    <Icon icon="solar:id-card-bold-duotone" width="24" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase' }}>Matrícula</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{perfil.matricula}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: tokens.bgSub, borderRadius: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${tokens.arches}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.arches }}>
                    <Icon icon="solar:shield-keyhole-bold-duotone" width="24" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase' }}>Tipo de Acesso</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                      {perfil.papel === 'aluno' ? 'Estudante' : perfil.papel}
                    </div>
                  </div>
                </div>

                {perfil.criado_em && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', border: `1px dashed ${tokens.border}`, borderRadius: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.foggy }}>
                      <Icon icon="solar:calendar-date-bold-duotone" width="24" />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: tokens.foggy, fontWeight: 800, textTransform: 'uppercase' }}>Membro desde</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatarData(perfil.criado_em)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Formulário de Dados Complementares */}
              <div style={{ borderTop: `1px solid ${tokens.border}`, paddingTop: 32 }}>
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
                      <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tokens.foggy, textTransform: 'uppercase' }}>Celular</CFormLabel>
                      <CFormInput
                        value={formData.celular}
                        onChange={(e) => setFormData(prev => ({ ...prev, celular: e.target.value }))}
                        placeholder="(99) 99999-9999"
                        style={{ background: tokens.bgSub, border: 'none', borderRadius: 14, padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}
                      />
                    </CCol>
                    <CCol xs={12} md={6}>
                      <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tokens.foggy, textTransform: 'uppercase' }}>Data de Nascimento</CFormLabel>
                      <CFormInput
                        type="date"
                        value={formData.data_nascimento}
                        onChange={(e) => setFormData(prev => ({ ...prev, data_nascimento: e.target.value }))}
                        style={{ background: tokens.bgSub, border: 'none', borderRadius: 14, padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}
                      />
                    </CCol>
                    <CCol xs={12} md={6}>
                      <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tokens.foggy, textTransform: 'uppercase' }}>Período do Curso</CFormLabel>
                      <select 
                        className="form-select"
                        value={formData.periodo}
                        onChange={(e) => setFormData(prev => ({ ...prev, periodo: e.target.value }))}
                        style={{ background: tokens.bgSub, border: 'none', borderRadius: 14, padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}
                      >
                        <option value="">Não informado</option>
                        {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>{p}º Período</option>)}
                      </select>
                    </CCol>
                    <CCol xs={12} md={6}>
                      <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tokens.foggy, textTransform: 'uppercase' }}>Objetivo</CFormLabel>
                      <select 
                        className="form-select"
                        value={formData.objetivo}
                        onChange={(e) => setFormData(prev => ({ ...prev, objetivo: e.target.value }))}
                        style={{ background: tokens.bgSub, border: 'none', borderRadius: 14, padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}
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
                      background: tokens.babu, color: '#fff', border: 'none', borderRadius: 16,
                      padding: '16px 24px', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
                      boxShadow: `0 8px 24px ${tokens.babu}30`, transition: 'all 0.2s', width: '100%', justifyContent: 'center'
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
                background: tokens.bg,
                border: `1px solid ${tokens.border}`,
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
                <Icon icon="solar:lock-password-bold-duotone" width="32" style={{ color: tokens.rausch }} />
              </div>

              <div style={{ fontSize: 13, color: tokens.foggy, fontWeight: 600, marginBottom: 24, lineHeight: 1.5 }}>
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
                    <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tokens.foggy, textTransform: 'uppercase' }}>Senha Atual</CFormLabel>
                    <CFormInput
                      type="password"
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      placeholder="Digite sua senha atual"
                      required
                      style={{
                        background: tokens.bgSub, border: 'none', borderRadius: 14,
                        padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', outline: 'none'
                      }}
                    />
                  </div>

                  <div className="mb-4">
                    <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tokens.foggy, textTransform: 'uppercase' }}>Nova Senha</CFormLabel>
                    <CFormInput
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      required
                      style={{
                        background: tokens.bgSub, border: 'none', borderRadius: 14,
                        padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', outline: 'none'
                      }}
                    />
                  </div>

                  <div className="mb-5">
                    <CFormLabel style={{ fontSize: 12, fontWeight: 800, color: tokens.foggy, textTransform: 'uppercase' }}>Confirmar Nova Senha</CFormLabel>
                    <CFormInput
                      type="password"
                      value={confirmaSenha}
                      onChange={(e) => setConfirmaSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      required
                      style={{
                        background: tokens.bgSub, border: 'none', borderRadius: 14,
                        padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <CButton 
                  type="submit" 
                  disabled={saving}
                  style={{
                    background: tokens.rausch,
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
                    boxShadow: `0 8px 24px ${tokens.rausch}30`,
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

        </div>
      </div>
    </CContainer>
  )
}

export default Perfil
