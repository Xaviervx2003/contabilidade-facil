import api from './api';

export const authService = {
  login: async (credenciais) => {
    const response = await api.post('/api/login', credenciais);
    return response.data;
  },

  register: async (dados) => {
    // Se o backend espera Form (para suportar arquivo opcional de avatar),
    // vamos transformar em FormData.
    const formData = new FormData();
    formData.append('nome', dados.nome);
    formData.append('matricula', dados.matricula);
    formData.append('senha', dados.senha);
    if (dados.avatar) {
      formData.append('avatar', dados.avatar);
    }

    const response = await api.post('/api/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  verificarIdentidade: async (dados) => {
    const response = await api.post('/api/verificar-identidade', dados);
    return response.data;
  },

  redefinirSenha: async (dados) => {
    const response = await api.post('/api/redefinir-senha', dados);
    return response.data;
  },
};
