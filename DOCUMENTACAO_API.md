# 🚀 DOCUMENTAÇÃO DA API — Contabilidade Fácil

Este documento contém os detalhes técnicos para integração com o backend do sistema.

## 🔗 Endereços Oficiais

- **URL Base (Produção)**: `https://contabilidade-facil.onrender.com`
- **Documentação Automática (Swagger)**: `https://contabilidade-facil.onrender.com/docs`
- **Documentação Alternativa (Redoc)**: `https://contabilidade-facil.onrender.com/redoc`

---

## 🔑 Autenticação

A maioria das rotas do sistema utiliza autenticação baseada em sessão (salva no frontend).

- **Login**: `POST /api/login`
  - Payload: `{ "matricula": "XXX", "senha": "YYY" }`
  - Retorno: `{ "id": 1, "nome": "Nome", "papel": "admin" }`

---

## 📂 Principais Endpoints

### 1. Administração
- `GET /api/admin/usuarios`: Lista todos os usuários.
- `GET /api/admin/materias`: Lista a árvore de matérias.
- `DELETE /api/admin/materias/vazias`: (Em breve) Limpa matérias sem questões.

### 2. Quizzes e Questões
- `GET /api/questoes`: Busca questões filtradas por matéria.
- `POST /api/sessoes`: Salva o resultado de um quiz feito pelo aluno.
- `GET /api/favoritos/{matricula}`: Lista questões marcadas como favoritas.

### 3. Dashboard e Desempenho
- `GET /api/dashboard/visao-geral`: Métricas para professores e admins.
- `GET /api/aluno/progresso/{matricula}`: Percentual de conclusão do edital.

---

## 🛠️ Desenvolvimento Local

Ao rodar o backend localmente, a API ficará disponível em `http://localhost:8000`.
A documentação local pode ser vista em `http://localhost:8000/docs`.

> [!NOTE]
> Lembre-se que o backend local agora se conecta ao banco de dados **Neon** na nuvem se o arquivo `.env` estiver configurado corretamente.
