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

| Pasta / Arquivo                   | Para que serve                                                           |
| --------------------------------- | ------------------------------------------------------------------------ |
| `main.py`                         | Orquestrador do backend. Inclui os routers e sobe o servidor.            |
| `database.py`                     | Pool de conexões PostgreSQL (psycopg v3). **Nunca use conexão avulsa.**  |
| `models.py`                       | Modelos de dados e definições Pydantic.                                  |
| `routes/`                         | Módulos de rotas da API.                                                 |
| `routes/auth.py`                  | Login e autenticação.                                                    |
| `routes/dashboard.py`             | Métricas e desempenho dos alunos.                                        |
| `routes/relatorios.py`            | Relatório mensal de estudo.                                              |
| `routes/questoes.py`              | CRUD de questões.                                                        |
| `routes/sessoes.py`               | Submissão e histórico de quizzes.                                        |
| `routes/admin.py`                 | Gestão de usuários e matérias.                                           |
| `routes/aluno.py`                 | Dados do aluno: gráficos, histórico, ranking, sessões.                   |
| `routes/progresso.py`             | Progresso do aluno no edital (% de questões respondidas).                |
| `routes/favoritos.py`             | Gestão de questões favoritas do aluno (marcar/desmarcar).                |
| `routes/trilhas.py`               | **NOVO** — Trilhas de aprendizagem: criar, editar, acompanhar progresso. |
| `init.sql`                        | Script de criação do banco (tabelas, índices, dados iniciais).           |
| `painel-admin/`                   | Frontend React + Vite.                                                   |
| `painel-admin/src/`               | Código-fonte do React.                                                   |
| `painel-admin/src/components/`    | Componentes reutilizáveis.                                               |
| `painel-admin/src/views/`         | Páginas do sistema.                                                      |
| `painel-admin/src/_nav.jsx`       | **Função** que gera o menu lateral conforme o papel do usuário.          |
| `painel-admin/src/AppSidebar.jsx` | Sidebar com badge dinâmico de feedbacks.                                 |
| `dados_banco/`                    | (Backup antigo) Arquivos físicos do PostgreSQL — não use diretamente.    |
| `docker-compose.yml`              | Sobe todos os serviços (banco, API, adminer).                            |
| `Dockerfile`                      | Constrói a imagem do backend.                                            |
| `.env`                            | Variáveis de ambiente (credenciais do banco).                            |

---

## 3. 🔄 FLUXO DO SISTEMA

### 3.1 Login

1. O frontend envia `POST /api/login` com `matricula` e `senha`.
2. O backend valida e retorna: `{ id, nome, matricula, papel }`.
3. O frontend salva **4 chaves** no `sessionStorage`: `userId`, `papel`, `nome`, `matricula`.
4. A função `getNavItens()` lê esses dados e monta o menu correspondente.

### 3.2 Aluno fazendo um quiz

1. Escolhe matéria e número de questões.
2. O frontend busca `GET /api/questoes?materia_id=X&limit=N` (filtragem e limite server-side).
3. O aluno responde e o frontend monta o payload com `sessao` + `detalhes`.
4. Envia `POST /api/sessoes` para gravar tudo.
5. O backend atualiza `sessoes_estudo` e `sessoes_questoes`, além dos contadores de `questoes`.

### 3.3 Professor vendo dashboard

1. Acessa `/dashboard` ou `/alunos/desempenho?usuario_id=X`.
2. O backend (`routes/dashboard.py`) injeta `EXISTS` para filtrar só alunos que responderam questões **criadas por ele**.
3. Sempre descarta sessões de teste (`eh_teste_professor IS NOT TRUE`).

### 3.4 Favoritos do aluno

1. No quiz, o aluno clica na ⭐ ao lado do enunciado.
2. Frontend chama `POST /api/favoritos/adicionar` com body JSON `{ matricula, questao_id }`.
3. Para remover: `DELETE /api/favoritos/remover/{questao_id}?matricula=XXX`.
4. **Tabela:** `favoritos_aluno` com coluna `matricula_aluno` (FK para `usuarios.matricula`).

### 3.5 Trilhas de Aprendizagem (NOVO)

1. **Professor/Admin** cria uma trilha: `POST /api/trilhas` com nome, descricao, capa_url, nivel.
2. Adiciona **módulos** à trilha: cada módulo pode ter vídeo, texto teórico e/ou quiz vinculado.
3. Define o status como `'publicado'` para que fique visível aos alunos.
4. **Aluno** acessa `GET /api/trilhas/aluno/{matricula}` e vê:
   - Lista de trilhas disponíveis (status = 'publicado')
   - Módulos de cada trilha com progresso de conclusão
   - Média de acertos (calculada a partir de `sessoes_estudo`)
5. Ao acessar um módulo:
   - Se tem vídeo ou texto → abre modal "Cinema" (aula)
   - Se tem quiz → vai direto para o quiz
6. Ao concluir um módulo: `POST /api/trilhas/progresso/{modulo_id}`

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
| `favoritos_aluno`      | Questões marcadas como favoritas pelo aluno para revisão.            |
| `trilhas`              | **NOVO** — Trilhas de aprendizagem (nome, descricao, status, nivel). |
| `modulos`              | **NOVO** — Módulos dentro de trilhas (vídeo, texto, quiz).           |
| `progresso_trilhas`    | **NOVO** — Progresso do aluno em cada módulo (concluido, data).      |

**Admin padrão:** `matricula = admin`, `senha = admin123` (id=1, não pode ser deletado).

---

## 5. 🌐 ROTAS DA API

| Rota                                  | Método       | Descrição                                           |
| ------------------------------------- | ------------ | --------------------------------------------------- |
| `/api/login`                          | POST         | Autentica o usuário.                                |
| `/api/dashboard`                      | GET          | Estatísticas gerais (admin/professor).              |
| `/api/dashboard/sessoes-por-mes`      | GET          | Dados para gráficos mensais.                        |
| `/api/dashboard/visao-geral`          | GET          | Últimas atividades e progresso da turma.            |
| `/api/alunos/desempenho`              | GET          | Desempenho detalhado de cada aluno.                 |
| `/api/relatorios/estudo`              | GET          | Relatório mensal de estudo.                         |
| `/api/questoes`                       | GET / POST   | Lista (com `limit` e `materia_id`) e cria questões. |
| `/api/questoes/{id}`                  | PUT / DELETE | Atualiza ou remove questão.                         |
| `/api/questoes/importar-csv`          | POST         | Importação em massa via CSV.                        |
| `/api/sessoes`                        | POST / GET   | Submete sessão / histórico do aluno (LIMIT 200).    |
| `/api/feedbacks_questoes`             | GET / POST   | Lista e cria feedbacks de questões.                 |
| `/api/feedbacks_questoes/contagem`    | GET          | Contagem de feedbacks pendentes (badge sidebar).    |
| `/api/feedbacks_questoes/{id}/...`    | PATCH        | Resolver, responder, publicar feedback.             |
| `/api/admin/usuarios`                 | GET / POST   | Lista e cria usuários.                              |
| `/api/admin/usuarios/{id}`            | PUT / DELETE | Atualiza ou remove usuário (admin id=1 protegido).  |
| `/api/admin/materias`                 | GET / POST   | Lista e cria matérias.                              |
| `/api/admin/materias/{id}`            | PUT / DELETE | Atualiza ou remove matéria.                         |
| `/api/aluno/progresso/{matricula}`    | GET          | Progresso do aluno no edital.                       |
| `/api/aluno/historico-grafico/...`    | GET          | Dados agregados por mês para gráficos.              |
| `/api/aluno/historico-diario/...`     | GET          | Série diária de questões respondidas.               |
| `/api/aluno/historico-filtrado/...`   | GET          | Dados filtrados por período/matéria/acerto.         |
| `/api/aluno/questoes-respondidas`     | GET          | Histórico detalhado com paginação.                  |
| `/api/aluno/meus-feedbacks/{nome}`    | GET          | Feedbacks do aluno com paginação.                   |
| `/api/aluno/ranking/{matricula}`      | GET          | Posição do aluno no ranking geral.                  |
| `/api/aluno/sessoes/{matricula}`      | GET          | Histórico de sessões (LIMIT 100).                   |
| `/api/favoritos/{matricula}`          | GET          | Lista questões favoritadas pelo aluno.              |
| `/api/favoritos/adicionar`            | POST         | Adiciona favorito (body JSON com Pydantic).         |
| `/api/favoritos/remover/{questao_id}` | DELETE       | Remove favorito (query param `matricula`).          |
| `/api/trilhas`                        | GET / POST   | Lista todas as trilhas ou cria nova.                |
| `/api/trilhas/{trilha_id}`            | PUT / DELETE | Atualiza ou deleta trilha.                          |
| `/api/trilhas/aluno/{matricula}`      | GET          | **NOVO** — Trilhas publicadas para o aluno.         |
| `/api/trilhas/progresso/{modulo_id}`  | POST         | **NOVO** — Marca módulo como concluído.             |
| `/api/trilhas/{trilha_id}/modulos`    | POST         | **NOVO** — Adiciona módulo à trilha.                |
| `/api/trilhas/modulos/{modulo_id}`    | PUT / DELETE | **NOVO** — Atualiza ou deleta módulo.               |
| `/api/trilhas/{trilha_id}/duplicar`   | POST         | **NOVO** — Duplica trilha com todos os módulos.     |

Para testar: acesse `http://localhost:8000/docs` (Swagger).

---

## 7. 🖥️ FRONTEND (React + CoreUI 5)

| Tela                    | Arquivo principal                            |
| ----------------------- | -------------------------------------------- |
| Login                   | `src/views/pages/login/Login.jsx`            |
| Dashboard               | `src/views/dashboard/Dashboard.jsx`          |
| Gestão de Questões      | `src/views/questoes/GestaoQuestoes.jsx`      |
| Quiz do Aluno           | `src/views/quiz/Quiz.jsx`                    |
| Histórico do Aluno      | `src/views/historico/Historico.jsx`          |
| Gestão de Usuários      | `src/views/admin/Usuarios.jsx`               |
| Gestão de Matérias      | `src/views/admin/Materias.jsx`               |
| Feedbacks / Dúvidas     | `src/views/feedbacks/Feedbacks.jsx`          |
| Relatórios              | `src/views/relatorios/Relatorios.jsx`        |
| **NOVO** Trilhas        | `src/views/aluno/MinhasTrilhas.jsx`          |
| **NOVO** Editar Trilhas | `src/views/professor/GerenciadorTrilhas.jsx` |

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

- `POST /api/admin/usuarios` com `papel: "professor"`.
- Associe matérias a ele via `professores_materias`.

### Mudar a sidebar

- Edite `_nav.jsx`, **mantendo a função** e as chaves do `sessionStorage`.

### Adicionar uma nova rota no backend

1. Crie o arquivo em `routes/`.
2. Adicione `app.include_router(...)` no `main.py` **após** `app = FastAPI(...)`.
3. Se a rota usa dados de body (POST/PUT), crie um **modelo Pydantic** em `models.py`.

### Exportar / importar banco

- Use os comandos Docker:
  ```bash
  docker exec postgres_joao pg_dump -U joao_xavier plataforma_questoes > backup.sql
  docker exec -i postgres_joao psql -U joao_xavier plataforma_questoes < backup.sql
  ```

---

## 8. 🛡️ PROTEÇÕES E ESCALABILIDADE

### 8.1 Pool de Conexões

- **Max size = 20**, min size = 2. Configurado em `database.py`.
- Credenciais vêm **exclusivamente** do `.env` — sem fallback hardcoded.
- Sempre use `with get_conexao() as conn:` — nunca abra conexão avulsa.

### 8.2 CORS

- Origens permitidas definidas explicitamente em `main.py` (localhost:5173, 3000, 8000).
- **Nunca use `allow_origins=["*"]`** em produção.

### 8.3 Limites nas Queries

- `GET /api/questoes` aceita `?limit=N` (max 500) para evitar transferir todo o banco.
- `GET /api/sessoes/{matricula}` tem **LIMIT 200** para evitar respostas gigantes.
- `GET /api/aluno/sessoes/{matricula}` tem **LIMIT 100**.
- Rotas de aluno com paginação usam `por_pagina` com teto (le=100).

### 8.4 Regras de Integridade

- **Não use `::VARCHAR`** em colunas que já são VARCHAR — impede uso de índices.
- **Nunca duplique rotas** — se um path já existe em outro módulo, remova a cópia.
- Use `except Exception as e:` com tipo, **nunca** `except:` genérico (engole MemoryError, etc).
- Em rotas POST com body JSON, use **modelos Pydantic** (não `Query(...)`).

### 8.5 Tabela `favoritos_aluno`

- Coluna chave: `matricula_aluno` (VARCHAR 20, FK para `usuarios.matricula`).
- UNIQUE em `(matricula_aluno, questao_id)` — impede duplicatas.
- Índice `idx_fav_matricula` para busca rápida por aluno.

---

## 9. ☁️ INFRAESTRUTURA EM NUVEM (PRODUÇÃO)

O sistema foi migrado para uma arquitetura totalmente em nuvem para garantir disponibilidade e escalabilidade.

| Componente          | Plataforma                     | URL Oficial / Detalhes                       |
| ------------------- | ------------------------------ | -------------------------------------------- |
| **Banco de Dados**  | [Neon.tech](https://neon.tech) | PostgreSQL Serverless (AWS sa-east-1).       |
| **Backend (API)**   | [Render](https://render.com)   | `https://contabilidade-facil.onrender.com`   |
| **Frontend (Site)** | [Vercel](https://vercel.com)   | `https://contabilidade-facil-chi.vercel.app` |

### 9.1 Sincronização Local vs Produção

Para que as alterações feitas no seu computador (localhost) apareçam no site ao vivo:

1. O arquivo `.env` local deve conter a `DATABASE_URL` do Neon.
2. Ao fazer `git push`, a Vercel e o Render detectam a mudança e fazem o redeploy automático.

### 9.2 Monitoramento

- **API Logs**: Verifique no painel do Render se o serviço está "Live".
- **Frontend Logs**: Verifique no painel da Vercel se o "Build" passou com sucesso.
- **Database**: Use o console da Neon para rodar queries SQL rápidas.

---

## 10. 📝 HISTÓRICO DE MUDANÇAS RECENTES (FIXES CRÍTICOS)

| Problema Original                           | Solução Aplicada                                       | Motivo Técnico                                                    |
| :------------------------------------------ | :----------------------------------------------------- | :---------------------------------------------------------------- |
| `column s.usuario_id does not exist`        | Trocado por `s.matricula_aluno = u.matricula`          | O banco usa `matricula` como chave estrangeira, não `usuario_id`. |
| `column s.data_criacao does not exist`      | Trocado por `s.criado_em`                              | Alinhamento com o nome real da coluna de timestamp.               |
| `aggregate function calls cannot be nested` | Dividido em 2 CTEs: `erros_base` → `erros_por_assunto` | PostgreSQL não permite `SUM()` dentro de `jsonb_object_agg()`.    |
| Inconsistência de identificadores           | Padronizado tudo para `matricula`                      | Alinha com favoritos, sessões e rotas de aluno.                   |
| Assuntos vazios gerando chaves NULL         | `COALESCE(NULLIF(TRIM(assunto), ''), 'Sem assunto')`   | Garante chaves JSON válidas para o frontend.                      |

---

## 11. 📊 PERFORMANCE: MATERIALIZED VIEW `mv_metricas_estudantes`

Para dashboards administrativos com muitos dados, utilizamos uma **Materialized View** para pré-calcular o desempenho dos alunos e evitar lentidão.

### 🎯 Objetivo

Pré-calcular métricas (média, total de questões, erros por matéria) uma vez e servir o dashboard instantaneamente.

### ⚡ Manutenção

- **Atualização**: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_metricas_estudantes;`
- **Requisito**: Índice único em `matricula` para permitir atualização concorrente (sem travar a leitura).

### 🐛 Erros Comuns & Soluções

- **`column does not exist`**: Sempre verifique se está usando `matricula_aluno` e `criado_em`.
- **`null value not allowed for key`**: Acontece se o `assunto_estudado` estiver vazio. Use o `COALESCE` conforme seção 10.

---

## 12. 🔒 PREVENÇÃO A IDOR E SEGURANÇA

Ataques de **IDOR** (Insecure Direct Object Reference) ocorrem quando uma API confia na entrada do usuário (como uma matrícula ou ID na URL) sem verificar se o usuário autenticado realmente tem permissão para acessar aquele dado.

### 🚫 O Erro Comum (NÃO FAÇA ISSO)
```python
# Qualquer aluno logado (ou não) poderia enviar ?matricula=outrapessoa e roubar dados!
@router.get("/api/aluno/progresso/{matricula}")
def progresso_aluno(matricula: str):
    # busca no banco pela matricula da URL
```

### ✅ A Solução Obrigatória
Qualquer rota que lide com dados específicos de um usuário **DEVE** utilizar os middlewares de autenticação fornecidos em `utils.jwt_auth`.

```python
from fastapi import Depends
from utils.jwt_auth import verificar_proprio_ou_admin, usuario_autenticado

# 1. Se a rota tem {matricula} na URL e precisa garantir que o usuário é o dono (ou admin):
@router.get("/api/aluno/progresso/{matricula}")
def progresso_aluno(matricula: str, token: dict = Depends(verificar_proprio_ou_admin)):
    # O middleware já aborta com 403 se a matrícula da URL for diferente do token (e não for admin)
    
# 2. Se a rota usa POST/PUT com payload JSON contendo a matrícula:
@router.post("/api/favoritos/adicionar")
def adicionar_favorito(dados: FavoritoRequest, token: dict = Depends(usuario_autenticado)):
    if dados.matricula != token.get("sub") and token.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Não autorizado")
```

Sempre confronte a propriedade requisitada com a chave de segurança extraída do token JWT (`token["sub"]` contém a matrícula validada)!
