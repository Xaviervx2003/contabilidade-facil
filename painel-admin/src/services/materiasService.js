import api from './api';

export const materiasService = {
  getMaterias: async () => {
    const response = await api.get('/api/admin/materias');
    return response.data;
  }
};
