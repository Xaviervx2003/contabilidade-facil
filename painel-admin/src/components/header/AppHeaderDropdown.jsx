import React from 'react'
import {
  CAvatar,
  CBadge,
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import {
  cilBell,
  cilEnvelopeOpen,
  cilTask,
  cilCommentSquare,
  cilSettings,
  cilCreditCard,
  cilFile,
  cilLockLocked,
  cilUser,
  cilHistory,
  cilAccountLogout,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useNavigate } from 'react-router-dom'

import avatar8 from './../../assets/images/avatars/8.jpg'

const AppHeaderDropdown = () => {
  const navigate = useNavigate()
  const userName = sessionStorage.getItem('nome') || 'Usuário'
  const papel = sessionStorage.getItem('papel') || 'aluno'

  const handleLogout = () => {
    sessionStorage.clear()
    window.location.href = '#/login'
  }

  // Estilo padrão para itens ainda não implementados
  const emBreve = {
    opacity: 0.45,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  }

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <CAvatar src={avatar8} size="md" />
      </CDropdownToggle>

      <CDropdownMenu className="pt-0" placement="bottom-end">

        {/* Saudação */}
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">
          Olá, {userName}!
          <div className="small text-muted text-capitalize">{papel}</div>
        </CDropdownHeader>

        {/* ── Funcionalidades ativas ── */}
        <CDropdownItem onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
          <CIcon icon={cilUser} className="me-2" />
          Minha Conta
        </CDropdownItem>

        <CDropdownItem onClick={() => navigate('/historico')} style={{ cursor: 'pointer' }}>
          <CIcon icon={cilHistory} className="me-2" />
          Meu Histórico
        </CDropdownItem>

        {/* ── Funcionalidades futuras ── */}
        <CDropdownHeader className="bg-body-secondary fw-semibold my-2">
          Em breve
        </CDropdownHeader>

        <CDropdownItem style={emBreve}>
          <CIcon icon={cilBell} className="me-2" />
          Notificações
          <CBadge color="secondary" className="ms-2">em breve</CBadge>
        </CDropdownItem>

        <CDropdownItem style={emBreve}>
          <CIcon icon={cilEnvelopeOpen} className="me-2" />
          Mensagens
          <CBadge color="secondary" className="ms-2">em breve</CBadge>
        </CDropdownItem>

        <CDropdownItem style={emBreve}>
          <CIcon icon={cilTask} className="me-2" />
          Tarefas
          <CBadge color="secondary" className="ms-2">em breve</CBadge>
        </CDropdownItem>

        <CDropdownItem style={emBreve}>
          <CIcon icon={cilCommentSquare} className="me-2" />
          Comentários
          <CBadge color="secondary" className="ms-2">em breve</CBadge>
        </CDropdownItem>

        <CDropdownHeader className="bg-body-secondary fw-semibold my-2">
          Configurações
        </CDropdownHeader>

        <CDropdownItem style={emBreve}>
          <CIcon icon={cilSettings} className="me-2" />
          Preferências
          <CBadge color="secondary" className="ms-2">em breve</CBadge>
        </CDropdownItem>

        <CDropdownItem style={emBreve}>
          <CIcon icon={cilCreditCard} className="me-2" />
          Pagamentos
          <CBadge color="secondary" className="ms-2">em breve</CBadge>
        </CDropdownItem>

        <CDropdownItem style={emBreve}>
          <CIcon icon={cilFile} className="me-2" />
          Projetos
          <CBadge color="secondary" className="ms-2">em breve</CBadge>
        </CDropdownItem>

        <CDropdownItem style={emBreve}>
          <CIcon icon={cilLockLocked} className="me-2" />
          Bloquear Conta
          <CBadge color="secondary" className="ms-2">em breve</CBadge>
        </CDropdownItem>

        <CDropdownDivider />

        {/* Logout */}
        <CDropdownItem
          onClick={handleLogout}
          style={{ cursor: 'pointer', color: 'var(--cui-danger)' }}
        >
          <CIcon icon={cilAccountLogout} className="me-2" />
          Sair do Sistema
        </CDropdownItem>

      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown