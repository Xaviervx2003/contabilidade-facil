import React, { useState, useEffect, useCallback } from 'react'
import {
  CBadge,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CDropdownHeader,
  CSpinner
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell, cilEnvelopeOpen, cilStar, cilInfo } from '@coreui/icons'
import { API_URL } from '../../config'
import { getMatricula } from '../../utils/auth'

const AppHeaderNotifications = () => {
  const [notificacoes, setNotificacoes] = useState([])
  const [loading, setLoading] = useState(false)
  const matricula = getMatricula()

  const carregarNotificacoes = useCallback(async () => {
    if (!matricula) return
    try {
      const res = await fetch(`${API_URL}/api/trilhas/notificacoes/${matricula}`)
      const data = await res.json()
      setNotificacoes(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Erro ao carregar notificações:', e)
    }
  }, [matricula])

  useEffect(() => {
    carregarNotificacoes()
    // Polling a cada 2 minutos
    const interval = setInterval(carregarNotificacoes, 120000)
    return () => clearInterval(interval)
  }, [carregarNotificacoes])

  const marcarLida = async (id) => {
    try {
      await fetch(`${API_URL}/api/trilhas/notificacoes/${id}/lida`, { method: 'PUT' })
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    } catch (e) {
      console.error(e)
    }
  }

  const pendentes = notificacoes.filter(n => !n.lida).length

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <div className="position-relative p-2">
          <CIcon icon={cilBell} size="lg" />
          {pendentes > 0 && (
            <CBadge color="danger" position="top-end" shape="rounded-pill" style={{ fontSize: '9px', padding: '3px 5px' }}>
              {pendentes}
            </CBadge>
          )}
        </div>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end" style={{ width: '300px', maxHeight: '400px', overflowY: 'auto' }}>
        <CDropdownHeader className="bg-body-tertiary fw-semibold py-2">
          Notificações
        </CDropdownHeader>
        
        {loading ? (
          <div className="text-center py-3"><CSpinner size="sm" /></div>
        ) : notificacoes.length === 0 ? (
          <div className="text-center py-3 text-body-secondary small">Nenhuma notificação encontrada.</div>
        ) : (
          notificacoes.map((n) => (
            <CDropdownItem
              key={n.id}
              href={`#${n.link || '/dashboard'}`}
              onClick={() => marcarLida(n.id)}
              className={`d-flex flex-column p-3 border-bottom ${!n.lida ? 'bg-body-tertiary fw-bold' : ''}`}
              style={{ whiteSpace: 'normal' }}
            >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small">{n.titulo}</span>
                <span className="text-body-secondary" style={{ fontSize: '10px' }}>
                  {new Date(n.data_criacao).toLocaleDateString()}
                </span>
              </div>
              <div className="small text-body-secondary" style={{ lineHeight: '1.2' }}>
                {n.mensagem}
              </div>
            </CDropdownItem>
          ))
        )}
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderNotifications
