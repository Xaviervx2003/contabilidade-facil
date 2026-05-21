import { useQuery } from '@tanstack/react-query';
import { materiasService } from '../services/materiasService';

export const useMaterias = () => {
  return useQuery({
    queryKey: ['materias'],
    queryFn: materiasService.getMaterias,
    staleTime: 5 * 60 * 1000,
  });
};
