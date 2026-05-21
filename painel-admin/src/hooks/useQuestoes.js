import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questoesService } from '../services/questoesService';

// QUERY KEYS
const QUERY_KEYS = {
  filtros: ['filtros_questoes'],
  lista: (filtros) => ['questoes', filtros],
  feedbacks: (filtros) => ['feedbacks_questoes', filtros],
};

// ==============================
// HOOKS DE CONSULTA (QUERIES)
// ==============================

export const useFiltrosQuestoes = () => {
  return useQuery({
    queryKey: QUERY_KEYS.filtros,
    queryFn: async () => {
      const response = await questoesService.listarFiltros();
      return response.dados; // Supondo que retorne { bancas: [], orgaos: [] } no dados
    },
    staleTime: 1000 * 60 * 60, // Filtros mudam pouco (1 hora de cache)
  });
};

export const useQuestoes = (filtros) => {
  return useQuery({
    queryKey: QUERY_KEYS.lista(filtros),
    queryFn: async () => {
      const response = await questoesService.listarQuestoes(filtros);
      // Retorna a estrutura { data: [], total, page... } se for paginado, ou array puro dependendo da API
      return response.dados;
    },
    keepPreviousData: true, // Mantém a lista anterior na tela enquanto carrega a próxima página
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
};

export const useFeedbacksQuestoes = (filtros) => {
  return useQuery({
    queryKey: QUERY_KEYS.feedbacks(filtros),
    queryFn: async () => {
      const response = await questoesService.listarFeedbacks(filtros);
      return response.dados || response;
    },
    keepPreviousData: true,
    staleTime: 1000 * 60 * 1, // 1 minuto
  });
};


// ==============================
// HOOKS DE MODIFICAÇÃO (MUTATIONS)
// ==============================

export const useCriarQuestao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: questoesService.criarQuestao,
    onSuccess: () => {
      // Invalida cache de questões para recarregar a lista
      queryClient.invalidateQueries({ queryKey: ['questoes'] });
    },
  });
};

export const useEditarQuestao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: questoesService.editarQuestao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] });
    },
  });
};

export const useDeletarQuestao = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: questoesService.deletarQuestao,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] });
    },
  });
};

export const useImportarCSV = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: questoesService.importarCSV,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questoes'] });
      queryClient.invalidateQueries({ queryKey: ['filtros_questoes'] });
    },
  });
};

export const useDeletarFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: questoesService.deletarFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks_questoes'] });
    },
  });
};

export const useResolverFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: questoesService.resolverFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks_questoes'] });
    },
  });
};

export const useResponderFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: questoesService.responderFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks_questoes'] });
    },
  });
};

export const useAlternarPublicacaoFeedback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: questoesService.alternarPublicacaoFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks_questoes'] });
    },
  });
};
