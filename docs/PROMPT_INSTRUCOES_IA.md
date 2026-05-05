# PROMPT MESTRE DO PROJETO - CONTABILIDADE FÁCIL
**Instrução para a IA:** *Ao iniciar qualquer assistência técnica ou desenvolvimento nesta base de código, leia este documento COMPLETO antes de escrever qualquer linha de código. Ele contém armadilhas reais que já quebraram a aplicação em sessões anteriores.*

---

## 🏗️ 1. Arquitetura e Visão Global

O projeto é um **Ambiente Virtual de Aprendizagem (AVA)** completo, dividido em:

- **Backend (Python + FastAPI):** Arquitetura 100% modular, orquestrada pelo `main.py` e fatiada na pasta `routes/`:
  - `auth.py` — login e autenticação
  - `dashboard.py` — métricas globais agregadas (visão geral, séries temporais)
  - `metricas_estudantes.py` — tabela paginada de desempenho por estudante (admin/professor)
  - `relatorios.py` — relatório mensal de estudo (separado do dashboard, com filtros)
  - `questoes.py` — CRUD de questões
  - `sessoes.py` — submissão e histórico de quizzes
  - `admin.py` — gestão de usuários e matérias
  - `aluno.py` — dados individuais/autosserviço do aluno (histórico, ranking, etc.)
  - `progresso.py` — progresso do aluno no edital (% de questões respondidas)

- **Banco de Dados (PostgreSQL):** Regras estruturadas no `init.sql`. Interação via **psycopg v3** com **pool de conexões** (`psycopg_pool`). O arquivo `database.py` gerencia o pool — não use `psycopg2` puro nem abra conexões avulsas.

- **Frontend (React + Vite + CoreUI 5):** Interface segmentada entre "Aluno" e "Administrador/Gestor". Usa `sessionStorage` para guardar o contexto de segurança.

---

## 👥 2. Hierarquia de Papéis (Roles)

Campo `papel` na tabela `usuarios`:

1. **admin (id=1):** Acesso universal. Vê todos os módulos e todos os alunos. **Não pode ser deletado — bloqueio hardcoded.**
2. **professor:** Visão restrita. A armadilha crítica é a tabela pivot `professores_materias` (N:N). Um professor **só** acessa dados de alunos que responderam questões vinculadas às **suas matérias**. O filtro é feito via `EXISTS` + `sessoes_questoes` + `questoes.criado_por` — nunca por string de assunto.
3. **aluno:** Faz quizzes e consulta o próprio histórico.

> [!NOTE] **Terminologia Estudante vs Aluno**
> O nome `aluno` ainda é usado internamente no banco (`papel = 'aluno'`), mas a API e a documentação adotam `estudante` para clareza no produto.

---

## 🪤 3. Armadilhas Conhecidas — Leia antes de mexer

### A. Login e Proteção Contínua (Session Storage)

- **Chaves imutáveis do sessionStorage.** O sistema depende EXATAMENTE destas quatro chaves, definidas no login:
  1. `userId`
  2. `papel`
  3. `nome`
  4. `matricula`
  Qualquer alteração nos nomes quebra o roteamento inteiro.

- **`_nav.jsx` exporta uma FUNÇÃO, não um array.** A função `getNavItens()` lê o `sessionStorage` no momento em que é chamada (após o login). **Nunca transforme de volta em array estático.**

- **Logout precisa de reload forçado.** Use `sessionStorage.clear()` seguido de `window.location.href = '#/login'`. Usar apenas o `navigate` do React-Router não mata a re-renderização memoizada do painel lateral.

### B. Gestão de Matérias vs Assuntos Livres

- O campo `questoes.assunto` era texto livre no passado. **Hoje as questões são multivinculadas** via tabela N:N `questoes_materias`.
- Nunca submeta `assunto` vazio. A tela `GestaoQuestoes.jsx` usa checkboxes com `materia_ids`. A inserção passa por `routes/questoes.py` que grava em `questoes_materias`.

### C. Dashboard com Dupla Visão

- `routes/dashboard.py` tem ramificação crítica por `?usuario_id=XX`:
  - **Admin ou sem ID:** `COUNT()` geral de todas as sessões.
  - **Professor:** injeta `EXISTS` filtrando por `sessoes_questoes → questoes.criado_por`.
- O filtro `eh_teste_professor IS NOT TRUE` é **obrigatório** em todas as queries do dashboard para que sessões de teste não contaminem as estatísticas da turma.
- A rota `/api/relatorios/estudo` foi **separada para `routes/relatorios.py`**. Não a recoloque no `dashboard.py` — causaria rota duplicada e conflito de router.
- O dashboard consome `/api/dashboard/visao-geral` (últimas atividades e progresso da turma). Não sobrecarregue a rota principal.
- **Métricas de Estudantes:** O desempenho detalhado (tabela paginada) foi movido para `routes/metricas_estudantes.py`. A rota principal é `GET /api/metricas-estudantes/desempenho`.

### D. Paginação e Limites de Performance

- **`GET /api/metricas-estudantes/desempenho`** usa `por_pagina` com teto máximo de 100 (`le=100`).
- Requisições com `por_pagina > 100` retornam `422 Unprocessable Entity`. O frontend deve implementar paginação respeitando esse limite.
- Parâmetros da rota: `pagina` (padrão 1), `por_pagina` (padrão 10, max 100).
- Retorno padrão: `{ estudantes: [], total, pagina, por_pagina, total_paginas }`.

### E. Feedbacks e Painel Admin

- Tickets de alunos ("Dúvida" / "Confuso") usam **Status de Resolução** (`resolvido`, `resolvido_em`) — nunca deletar o registro direto.
- **Badge Dinâmico na Sidebar:** `AppSidebar.jsx` consulta `/api/feedbacks_questoes/contagem` a cada 60s. Não adicione badges estáticos no `_nav.jsx` para itens que já têm contagem dinâmica — eles vão conflitar.
- Se houver >= 5 reclamações não resolvidas por questão, a linha ganha destaque vermelho (coluna `impacto`).
- Enviar `resposta_professor` marca o feedback como `resolvido` automaticamente.
- **No `Quiz.jsx`:** os states `isConfusing` e `commentStatus` devem ser resetados ao trocar de questão. Não altere o fluxo sem garantir esse reset.

### F. Behavioral Design & Comunidade

- Feedbacks aprovados pelo professor (`publico = TRUE`) são anexados via `COALESCE(json_agg(...))` na rota `GET /api/questoes`. Cuidado extremo ao alterar esse SQL — as agregações de JSON são frágeis.
- A tabela `questoes` tem contadores globais (`tentativas`, `acertos`) atualizados em loop via `lista_detalhes` na submissão de sessão. Não quebre a passagem desse campo na API.
- **Simulado Rápido:** injeta valores literais (10 min / 10 questões globais) sem passar pelas configs normais de matéria/tempo.

### G. Pool de Conexões (database.py) — NOVO

- O projeto **migrou de `psycopg2` puro para `psycopg` v3 com pool** (`psycopg_pool`).
- Sempre use o context manager: `with get_conexao() as conn:` — nunca abra conexão avulsa.
- O `database.py` cria a tabela `sessoes_questoes` e seus índices de forma defensiva na inicialização, apenas se as tabelas-base já estiverem presentes.
- **Não coloque credenciais como fallback hardcoded** no `DB_CONFIG`. Use `""` como padrão para forçar erro claro se o `.env` não existir.
- O pool sobe junto com o FastAPI via `lifespan`. O `iniciar_pool()` tem retentativa automática (10x com espera de 2s) para ambientes Docker.

### H. Ordem de Inicialização do main.py — NOVO

- **ARMADILHA CRÍTICA:** O `app.include_router()` deve vir DEPOIS de `app = FastAPI(...)`. Colocar qualquer `include_router` antes da criação do `app` causa `NameError: name 'app' is not defined` e derruba o servidor.
- Ordem correta no `main.py`:
  1. Imports
  2. Definição do `lifespan`
  3. `app = FastAPI(..., lifespan=lifespan)`
  4. `app.add_middleware(...)`
  5. Todos os `app.include_router(...)`
  6. Rotas avulsas (`@app.get`)

### I. Agregações SQL no PostgreSQL — NOVO

- **PostgreSQL não aceita agregações aninhadas** (ex: `SUM()` dentro de `SUM()`). Isso causa o erro: `aggregate function calls cannot be nested`.
- A solução é sempre usar **CTEs encadeadas**: uma CTE calcula os valores base, a próxima agrega em cima do resultado já calculado.
- Padrão obrigatório para queries complexas no dashboard:
  ```sql
  WITH dados_base AS (
      SELECT ... FROM ... GROUP BY ...  -- primeira agregação
  ),
  agregado_final AS (
      SELECT jsonb_object_agg(...) FROM dados_base GROUP BY ...  -- segunda agregação
  )
  SELECT ... FROM agregado_final;
  ```

### J. Favoritos do Aluno (`routes/favoritos.py`) — NOVO

- A rota `POST /api/favoritos/adicionar` recebe **body JSON** via **modelo Pydantic** (`FavoritoRequest`), NÃO `Query(...)`.
- A tabela `favoritos_aluno` usa coluna `matricula_aluno` (VARCHAR 20, FK para `usuarios.matricula`) — **não** `matricula`.
- UNIQUE em `(matricula_aluno, questao_id)` impede duplicatas.
- A rota `DELETE /api/favoritos/remover/{questao_id}` recebe `matricula` como **query param**.
- **Nunca use `except:` genérico** — sempre `except Exception as e:` para não engolir `MemoryError` e afins.

### K. Proteção e Escalabilidade — NOVO

- **CORS:** Origens reais definidas em `main.py` (localhost:5173, 3000, 8000). **Nunca use `"*"` em produção.**
- **Pool:** `max_size=20` em `database.py`. Credenciais vêm exclusivamente do `.env` — fallback é string vazia para forçar erro claro.
- **Limites de query:** `GET /api/questoes` aceita `?limit=N` (max 500). `GET /api/sessoes/{m}` tem LIMIT 200. O frontend Quiz usa `limit` e `materia_id` como query params para não baixar todo o banco.
- **Estudantes (Métricas):** O teto de `por_pagina=100` em `metricas_estudantes.py` é uma trava de segurança. Nunca remova esse `le=100` do Pydantic/FastAPI.
- **Não use `::VARCHAR`** em colunas que já são VARCHAR — impede o PostgreSQL de usar índices UNIQUE, causando full scan.
- **Rota duplicada:** A rota `GET /api/aluno/progresso/{matricula}` existe APENAS em `routes/progresso.py`. A cópia que existia em `routes/aluno.py` foi removida — nunca recrie.