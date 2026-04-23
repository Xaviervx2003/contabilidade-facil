import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { AppSidebarNav } from './AppSidebarNav'

import { logo } from 'src/assets/brand/logo'
import { sygnet } from 'src/assets/brand/sygnet'

// ✅ getNavItens é uma função — chamamos com () para obter o array já filtrado por papel
import getNavItens from '../_nav'

import { API_URL } from '../config'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)

  const [pendentes, setPendentes] = React.useState(0)
  const [navItensState, setNavItensState] = React.useState([])

  React.useEffect(() => {
    const fetchContagem = async () => {
      try {
        const papel = sessionStorage.getItem('papel') || 'aluno'
        if (papel !== 'admin' && papel !== 'professor') return
        
        const res = await fetch(`${API_URL}/api/feedbacks_questoes/contagem`)
        if (res.ok) {
          const data = await res.json()
          setPendentes(data.pendentes || 0)
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchContagem()
    // Atualiza a cada 60 segundos
    const interval = setInterval(fetchContagem, 60000)
    return () => clearInterval(interval)
  }, [])

  React.useEffect(() => {
    const baseItens = getNavItens()
    
    // Injeta o badge no item "Feedbacks" dinamicamente
    const newItens = baseItens.map(item => {
      if (item.name === 'Feedbacks') {
        return {
          ...item,
          badge: pendentes > 0 ? { color: 'danger', text: pendentes.toString() } : null
        }
      }
      return item
    })
    
    setNavItensState(newItens)
  }, [pendentes])

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/" style={{ textDecoration: 'none' }}>
          <h5 className="sidebar-brand-full m-0 fw-bold text-white">Contabilidade Fácil</h5>
          <h5 className="sidebar-brand-narrow m-0 fw-bold text-white">CF</h5>
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>

      {/* ✅ Passa o array direto — o filtro por papel já foi feito dentro de getNavItens() */}
      <AppSidebarNav items={navItensState} />

      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)