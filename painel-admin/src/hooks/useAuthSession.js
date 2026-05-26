/**
 * useAuthSession — Hook centralizado para dados de sessão do usuário.
 * Substitui sessionStorage.getItem() espalhado em 10+ componentes.
 *
 * Uso: const { matricula, userId, papel, nome, token, isLogado, isAdmin, isProfessor, isAluno } = useAuthSession()
 */
import { useMemo } from 'react'

const get = (key) => sessionStorage.getItem(key) || localStorage.getItem(key) || ''

const useAuthSession = () => {
  return useMemo(() => {
    const matricula = get('matricula')
    const userId = get('userId')
    const papel = get('papel') || 'aluno'
    const nome = get('nome')
    const token = get('token')

    return {
      matricula,
      userId: userId ? parseInt(userId, 10) : null,
      papel,
      nome,
      token,
      isLogado: !!papel && papel !== '',
      isAdmin: papel === 'admin',
      isProfessor: papel === 'professor',
      isAluno: papel === 'aluno',
    }
  }, [])
}

export default useAuthSession
