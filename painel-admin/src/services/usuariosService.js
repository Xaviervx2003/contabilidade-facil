import api from './api';

/**
 * Serviço que interage com os endpoints de usuários do backend.
 * Abstrai as URLs e métodos HTTP dos componentes.
 */
export const usuariosService = {
  getUsuarios: async () => {
    const response = await api.get('/api/admin/usuarios');
    return response.data;
  },

  getUsuarioPorId: async (id) => {
    const response = await api.get(`/api/admin/usuarios/${id}`);
    return response.data;
  },

  criarUsuario: async (dados) => {
    const response = await api.post('/api/admin/usuarios', dados);
    return response.data;
  },

  atualizarUsuario: async (id, dados) => {
    const response = await api.put(`/api/admin/usuarios/${id}`, dados);
    return response.data;
  },

  deletarUsuario: async (id) => {
    const response = await api.delete(`/api/admin/usuarios/${id}`);
    return response.data;
  },
};
