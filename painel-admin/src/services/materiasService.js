import api from './api'

const BASE = '/api/admin/materias'

export const materiasService = {
  listarTodas:              ()              => api.get(BASE).then(r => r.data),
  listarArvore:             (esconder = false) => api.get(`${BASE}/arvore?esconder_vazias=${esconder}`).then(r => r.data),
  listarFilhos:             (id, esconder = false) => api.get(`${BASE}/${id}/filhos?esconder_vazias=${esconder}`).then(r => r.data),
  criar:                    (dados)         => api.post(BASE, dados).then(r => r.data),
  editar:                   (id, dados)     => api.put(`${BASE}/${id}`, dados).then(r => r.data),
  deletar:                  (id)            => api.delete(`${BASE}/${id}`).then(r => r.data),
  limparVazias:             ()              => api.delete(`${BASE}/limpar-vazias`).then(r => r.data),
  solicitarMover:           (dados)         => api.post(`${BASE}/solicitar-mover`, dados).then(r => r.data),
  listarSolicitacoes:       ()              => api.get(`${BASE}/solicitacoes-pendentes`).then(r => r.data),
  processarSolicitacao:     (id, dados)     => api.post(`${BASE}/processar-solicitacao/${id}`, dados).then(r => r.data),
}
