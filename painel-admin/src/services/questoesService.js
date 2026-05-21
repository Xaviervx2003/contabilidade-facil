import api from './api';

export const questoesService = {
  listarFiltros: async () => {
    const { data } = await api.get('/api/filtros/questoes');
    return data;
  },

  listarQuestoes: async (filtros) => {
    // Converte { banca: 'FGV', page: 1 } em "?banca=FGV&page=1"
    const params = new URLSearchParams();
    if (filtros) {
      Object.keys(filtros).forEach((key) => {
        if (filtros[key] !== undefined && filtros[key] !== null && filtros[key] !== '') {
          // Se for array (ex: materia_id), anexa múltiplos parametros
          if (Array.isArray(filtros[key])) {
            filtros[key].forEach(val => params.append(key, val));
          } else {
            params.append(key, filtros[key]);
          }
        }
      });
    }
    const { data } = await api.get(`/api/questoes?${params.toString()}`);
    return data;
  },

  criarQuestao: async (dados) => {
    const { data } = await api.post('/api/questoes', dados);
    return data;
  },

  editarQuestao: async ({ id, dados }) => {
    const { data } = await api.put(`/api/questoes/${id}`, dados);
    return data;
  },

  deletarQuestao: async (id) => {
    const { data } = await api.delete(`/api/questoes/${id}`);
    return data;
  },

  importarCSV: async (file) => {
    const formData = new FormData();
    formData.append('arquivo', file);
    const { data } = await api.post('/api/questoes/importar-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  
  listarFeedbacks: async (filtros) => {
    const params = new URLSearchParams();
    if (filtros) {
      Object.keys(filtros).forEach((key) => {
        if (filtros[key] !== undefined && filtros[key] !== null && filtros[key] !== '') {
          params.append(key, filtros[key]);
        }
      });
    }
    const { data } = await api.get(`/api/feedbacks_questoes?${params.toString()}`);
    return data;
  },

  resolverFeedback: async (id) => {
    const { data } = await api.patch(`/api/feedbacks_questoes/${id}/resolver`);
    return data;
  },

  deletarFeedback: async (id) => {
    const { data } = await api.delete(`/api/feedbacks_questoes/${id}`);
    return data;
  },

  responderFeedback: async ({ id, resposta }) => {
    const { data } = await api.patch(`/api/feedbacks_questoes/${id}/responder`, { resposta_professor: resposta });
    return data;
  },

  alternarPublicacaoFeedback: async (id) => {
    const { data } = await api.patch(`/api/feedbacks_questoes/${id}/publicar`);
    return data;
  },
};
