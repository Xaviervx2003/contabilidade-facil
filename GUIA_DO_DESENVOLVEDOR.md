# 🧭 GUIA DO DESENVOLVEDOR — Contabilidade Fácil

> **Objetivo deste guia:** Explicar, de forma clara e direta, como cada parte do sistema funciona.
> Sempre que bater a dúvida _"onde mexo para alterar X?"_, consulte este mapa.

---

## 1. 🧠 VISÃO GERAL

O **Contabilidade Fácil** é um Ambiente Virtual de Aprendizagem (AVA) completo, onde:

- **Alunos** respondem quizzes de Contabilidade e acompanham seu próprio desempenho.
- **Professores** gerenciam questões vinculadas às suas matérias e visualizam o desempenho dos alunos.
- **Administradores** têm acesso total: gerenciam usuários, matérias e questões.

Tudo funciona no navegador, com backend em Python (FastAPI) e frontend em React (Vite + CoreUI 5).

---

## 2. 📁 ESTRUTURA DE PASTAS

| Pasta / Arquivo                   | Para que serve                                                          |
| --------------------------------- | ----------------------------------------------------------------------- |
| `main.py`                         | Orquestrador do backend. Inclui os routers e sobe o servidor.           |
| `database.py`                     | Pool de conexões PostgreSQL (psycopg v3). **Nunca use conexão avulsa.** |
| `models.py`                       | Modelos de dados e definições Pydantic.                                 |
| `routes/`                         | Módulos de rotas da API.                                                |
| `routes/auth.py`                  | Login e autenticação.                                                   |
| `routes/dashboard.py`             | Métricas e desempenho dos alunos.                                       |
| `routes/relatorios.py`            | Relatório mensal de estudo.                                             |
| `routes/questoes.py`              | CRUD de questões.                                                       |
| `routes/sessoes.py`               | Submissão e histórico de quizzes.                                       |
| `routes/admin.py`                 | Gestão de usuários e matérias.                                          |
| `init.sql`                        | Script de criação do banco (tabelas, índices, dados iniciais).          |
| `painel-admin/`                   | Frontend React + Vite.                                                  |
| `painel-admin/src/`               | Código-fonte do React.                                                  |
| `painel-admin/src/components/`    | Componentes reutilizáveis.                                              |
| `painel-admin/src/views/`         | Páginas do sistema.                                                     |
| `painel-admin/src/_nav.jsx`       | **Função** que gera o menu lateral conforme o papel do usuário.         |
| `painel-admin/src/AppSidebar.jsx` | Sidebar com badge dinâmico de feedbacks.                                |
| `dados_banco/`                    | (Backup antigo) Arquivos físicos do PostgreSQL — não use diretamente.   |
| `docker-compose.yml`              | Sobe todos os serviços (banco, API, adminer).                           |
| `Dockerfile`                      | Constrói a imagem do backend.                                           |
| `.env`                            | Variáveis de ambiente (credenciais do banco).                           |

---

## 3. 🔄 FLUXO DO SISTEMA

### 3.1 Login

1. O frontend envia `POST /api/login` com `matricula` e `senha`.
2. O backend valida e retorna: `{ id, nome, matricula, papel }`.
3. O frontend salva **4 chaves** no `sessionStorage`: `userId`, `papel`, `nome`, `matricula`.
4. A função `getNavItens()` lê esses dados e monta o menu correspondente.

### 3.2 Aluno fazendo um quiz

1. Escolhe matéria e número de questões.
2. O frontend busca `GET /api/questoes?materia_id=X`.
3. O aluno responde e o frontend monta o payload com `sessao` + `detalhes`.
4. Envia `POST /api/sessoes` para gravar tudo.
5. O backend atualiza `sessoes_estudo` e `sessoes_questoes`, além dos contadores de `questoes`.

### 3.3 Professor vendo dashboard

1. Acessa `/dashboard` ou `/alunos/desempenho?usuario_id=X`.
2. O backend (`routes/dashboard.py`) injeta `EXISTS` para filtrar só alunos que responderam questões **criadas por ele**.
3. Sempre descarta sessões de teste (`eh_teste_professor IS NOT TRUE`).

---

## 4. 🗄️ BANCO DE DADOS (PostgreSQL)

| Tabela                 | O que armazena                                                       |
| ---------------------- | -------------------------------------------------------------------- |
| `usuarios`             | Administradores, professores e alunos. Campo `papel` define o nível. |
| `materias`             | Matérias cadastradas (ex.: Contabilidade Básica).                    |
| `professores_materias` | Tabela N:N — vincula professores às suas matérias.                   |
| `questoes`             | Questões de múltipla escolha.                                        |
| `questoes_materias`    | Tabela N:N — vincula questões às matérias.                           |
| `sessoes_estudo`       | Cada sessão de quiz (aluno, matéria, tempo, taxa de acerto).         |
| `sessoes_questoes`     | Detalhes por questão em cada sessão (acertou ou não).                |
| `feedbacks_questoes`   | Feedback do aluno (dúvida, confusa) e resposta do professor.         |

**Admin padrão:** `matricula = admin`, `senha = admin123` (id=1, não pode ser deletado).

---

## 5. 🌐 ROTAS DA API

| Rota                             | Método       | Descrição                                         |
| -------------------------------- | ------------ | ------------------------------------------------- |
| `/api/login`                     | POST         | Autentica o usuário.                              |
| `/api/dashboard`                 | GET          | Estatísticas gerais (admin/professor).            |
| `/api/dashboard/sessoes-por-mes` | GET          | Dados para gráficos mensais.                      |
| `/api/alunos/desempenho`         | GET          | Desempenho detalhado de cada aluno.               |
| `/api/relatorios/estudo`         | GET          | Relatório mensal de estudo.                       |
| `/api/questoes`                  | GET / POST   | Lista e cria questões.                            |
| `/api/questoes/{id}`             | PUT / DELETE | Atualiza ou remove questão.                       |
| `/api/sessoes`                   | POST         | Submete uma sessão de quiz.                       |
| `/api/historico`                 | GET          | Histórico de sessões do aluno.                    |
| `/api/usuarios`                  | GET / POST   | Lista e cria usuários.                            |
| `/api/usuarios/{id}`             | PUT / DELETE | Atualiza ou remove usuário (admin id=1 não pode). |
| `/api/materias`                  | GET / POST   | Lista e cria matérias.                            |

Para testar: acesse `http://localhost:8000/docs` (Swagger).

---

## 6. 🖥️ FRONTEND (React + CoreUI 5)

| Tela                | Arquivo principal                       |
| ------------------- | --------------------------------------- |
| Login               | `src/views/pages/login/Login.jsx`       |
| Dashboard           | `src/views/dashboard/Dashboard.jsx`     |
| Gestão de Questões  | `src/views/questoes/GestaoQuestoes.jsx` |
| Quiz do Aluno       | `src/views/quiz/Quiz.jsx`               |
| Histórico do Aluno  | `src/views/historico/Historico.jsx`     |
| Gestão de Usuários  | `src/views/admin/Usuarios.jsx`          |
| Gestão de Matérias  | `src/views/admin/Materias.jsx`          |
| Feedbacks / Dúvidas | `src/views/feedbacks/Feedbacks.jsx`     |
| Relatórios          | `src/views/relatorios/Relatorios.jsx`   |

### Menu lateral

- Definido pela **função** `getNavItens()` em `src/_nav.jsx`.
- **Não modifique para array estático.**
- Badges dinâmicos (ex.: feedbacks pendentes) vêm do `AppSidebar.jsx`.

---

## 7. 🔧 COMO FAZER ALTERAÇÕES COMUNS

### Adicionar uma nova questão

- Acesse `GestaoQuestoes.jsx` no frontend ou use `POST /api/questoes`.
- Vincule a questão a pelo menos uma matéria (`questoes_materias`).

### Criar um novo usuário professor

- `POST /api/usuarios` com `papel: "professor"`.
- Associe matérias a ele via `professores_materias`.

### Mudar a sidebar

- Edite `_nav.jsx`, **mantendo a função** e as chaves do `sessionStorage`.

### Adicionar uma nova rota no backend

1. Crie o arquivo em `routes/`.
2. Adicione `app.include_router(...)` no `main.py` **após** `app = FastAPI(...)`.

### Exportar / importar banco

- Use os comandos Docker:
  ```bash
  docker exec postgres_joao pg_dump -U joao_xavier plataforma_questoes > backup.sql
  docker exec -i postgres_joao psql -U joao_xavier plataforma_questoes < backup.sql
  ```
