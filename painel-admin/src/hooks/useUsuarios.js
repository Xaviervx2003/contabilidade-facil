import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usuariosService } from '../services/usuariosService';

// Chave base para o cache do React Query
const USUARIOS_KEYS = {
  all: ['usuarios'],
  detail: (id) => ['usuarios', id],
};

/**
 * Hook para buscar a lista de todos os usuários.
 */
export const useUsuarios = () => {
  return useQuery({
    queryKey: USUARIOS_KEYS.all,
    queryFn: usuariosService.getUsuarios,
    staleTime: 5 * 60 * 1000, // Cache válido por 5 minutos
  });
};

/**
 * Hook para criar um novo usuário.
 */
export const useCriarUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usuariosService.criarUsuario,
    onSuccess: () => {
      // Invalida o cache da lista para forçar recarregamento na próxima renderização
      queryClient.invalidateQueries({ queryKey: USUARIOS_KEYS.all });
    },
  });
};

/**
 * Hook para atualizar um usuário existente.
 */
export const useAtualizarUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }) => usuariosService.atualizarUsuario(id, dados),
    onSuccess: (data, variables) => {
      // Atualiza a lista geral e o detalhe (se estiver em cache)
      queryClient.invalidateQueries({ queryKey: USUARIOS_KEYS.all });
      queryClient.invalidateQueries({ queryKey: USUARIOS_KEYS.detail(variables.id) });
    },
  });
};

/**
 * Hook para deletar um usuário.
 */
export const useDeletarUsuario = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usuariosService.deletarUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USUARIOS_KEYS.all });
    },
  });
};
