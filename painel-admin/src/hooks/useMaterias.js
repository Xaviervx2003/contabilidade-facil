import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { materiasService } from '../services/materiasService'

const KEYS = {
  todas: ['materias', 'todas'],
  solicitacoes: ['materias', 'solicitacoes'],
}

const CACHE = { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 }

// ── Queries ────────────────────────────────────────────────────

/** Busca a lista flat de todas as matérias (usada na árvore do componente) */
export const useMaterias = () =>
  useQuery({ queryKey: KEYS.todas, queryFn: materiasService.listarTodas, ...CACHE })

/** Busca solicitações pendentes de professores */
export const useSolicitacoesPendentes = () =>
  useQuery({ queryKey: KEYS.solicitacoes, queryFn: materiasService.listarSolicitacoes, ...CACHE })

// ── Mutações ───────────────────────────────────────────────────

/** Cria uma nova matéria e invalida o cache */
export const useCriarMateria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados) => materiasService.criar(dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.todas }),
  })
}

/** Edita nome/índice/parent de uma matéria e invalida o cache */
export const useEditarMateria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dados }) => materiasService.editar(id, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.todas }),
  })
}

/** Move uma matéria na hierarquia (Drag & Drop) — mutação separada para invalidação cirúrgica */
export const useMoverMateria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nome, novoParentId, indice }) =>
      materiasService.editar(id, { nome, parent_id: novoParentId, indice }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.todas }),
  })
}

/** Deleta uma matéria e invalida o cache */
export const useDeletarMateria = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => materiasService.deletar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.todas }),
  })
}

/** Faxina: remove matérias vazias e invalida o cache */
export const useLimparMaterias = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => materiasService.limparVazias(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.todas }),
  })
}

/** Solicitar movimento de hierarquia (professores) */
export const useSolicitarMover = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados) => materiasService.solicitarMover(dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.solicitacoes }),
  })
}

/** Processar solicitação (admin aprova/rejeita) */
export const useProcessarSolicitacao = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dados }) => materiasService.processarSolicitacao(id, dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.todas })
      qc.invalidateQueries({ queryKey: KEYS.solicitacoes })
    },
  })
}
