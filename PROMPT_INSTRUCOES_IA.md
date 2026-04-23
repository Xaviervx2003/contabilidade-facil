# PROMPT MESTRE DO PROJETO - CONTABILIDADE FÁCIL
**Instrução para a IA:** *Ao iniciar qualquer assistência técnica ou desenvolvimento nesta base de código, leia este documento primeiro para entender a estrutura, regras de negócios e "armadilhas" ocultas que podem quebrar a aplicação.*

---

## 🏗️ 1. Arquitetura e Visão Global
O projeto é um **Ambiente Virtual de Aprendizagem (AVA)** completo, dividido em:
*   **Backend (Python + FastAPI):** Arquitetura 100% modular, enxuta, orquestrada pelo arquivo `main.py` e fatiada na pasta `routes/` (admin, auth, dashboard, questoes, sessoes). 
*   **Banco de Dados (PostgreSQL):** Utiliza regras rígidas estruturadas no arquivo mestre `init.sql`. Interação via pacote `psycopg2` puro.
*   **Frontend (React + Vite + CoreUI 5):** Interface segmentada entre a visão do "Aluno" e o "Administrador / Gestor". Usa `sessionStorage` para guardar o contexto de segurança.

## 👥 2. Hierarquia de Papéis (Roles)
Um grande "detalhe oculto" arquitetural é o campo `papel` na tabela `usuarios`.
1.  **admin (id=1):** Tem acesso universal. Vê todos os módulos, avalia todos alunos e não pode ser deletado de maneira nenhuma (hardcoded alert!).
2.  **professor:** Tem visão restrita. A grande armadilha é a tabela pivot `professores_materias` (relação N:N). Um professor **só** acessa o dashboard e dados dos alunos que responderam questões vinculadas às **matérias** atreladas ao professor.
3.  **aluno:** Faz quizzes e checa o próprio histórico.

## 🪤 3. Armadilhas e Como Funciona Por Trás dos Panos
Se for mexer no código, **cuidado extremo com os seguintes detalhes**:

### A. Login e Proteção Contínua (Session Storage)
*   **O Código de Honra do Storage:** Nunca introduza ou altere os nomes das chaves de sessão. O sistema DEPENDE EXATAMENTE destas quatro chaves cravadas no momento do login: 
    1. **`userId`** 
    2. **`papel`** 
    3. **`nome`** 
    4. **`matricula`**
   Qualquer devio aqui desmorona o roteamento inteiro por causa dos Hooks de checagem.
*   **A Rota Dinâmica (`_nav.js` / `_nav.jsx`):** Diferente da maioria dos templates de painel que exportam um `array` simples, aqui o `_nav` exporta uma **função estrita** (`getNavItens()`). Essa proteção garante que o React recarregue os botões perfeitamente baseado no `papel` da memória. Nunca transforme ele de volta em um array.
*   **O Logout com Reload:** A função de Sair limpa a sessão absoluta atraves de `sessionStorage.clear()` e PRECISA usar `window.location.href = '#/login'` para matar a re-renderização memoizada do painel lateral (não tente usar apenas o roteador `navigate` do React-Router!).

### B. Gestão de Matérias Vs Assuntos Livres nas Questões
*   **Antes:** O assunto da questão (`questoes.assunto`) era um texto aberto digitado na unha (ex: "Balanço DRE"). 
*   **Agora:** As questões são multivinculadas. Não mexa no backend submetendo `assunto` vazio. A aba `GestaoQuestoes.jsx` exibe Checkboxes (`materia_ids`). O banco requer que a relação "questão-matéria" passe pelo router Python na submissão (`routes/questoes.py`) inserindo na tabela N:N `questoes_materias`.

### C. O Dashboard com Dupla Visão
O arquivo `routes/dashboard.py` esconde uma ramificação crítica baseada no query param `?usuario_id=XX`. 
*   **Se for omitido ou Admin:** Puxa o `COUNT()` geral do banco.
*   **Se for Professor:** Ele injeta o `EXISTS` em queries complexas. As consultas exigem a garantia do WHERE validando `eh_teste_professor IS NOT TRUE` (Para que sessões feitas pelo próprio logado não contaminem o gráfico da turma).

### D. Tratamento de Feedbacks e Painel Admin
*   O Quiz possui um sistema onde alunos abrem tickets ("Dúvida" ou "Confuso"). O Painel (`FeedbacksQuestoes.jsx`) agora usa o conceito de **Status de Resolução** (Pendente vs Resolvido) no banco (`resolvido`, `resolvido_em`) em vez de deletar o ticket direto.
*   **Badge Dinâmico na Sidebar:** O menu lateral (`AppSidebar.jsx`) consulta autonomamente a rota `/api/feedbacks_questoes/contagem` a cada 60s. Não manipule `AppSidebarNav.jsx` sem considerar que a prop `items` agora vem em *real-time state* via React.
*   **Aviso no Frontend:** Não altere o fluxo do Quiz (`Quiz.jsx`) sem garantir que os states `isConfusing` e `commentStatus` sejam resetados ao trocar de questão.

### E. Behavioral Design & Comunidade
*   **Comentários da Comunidade:** Feedbacks podem ser aprovados pelo Professor (coluna `publico = TRUE`). A rota `GET /api/questoes` anexa esses feedbacks via agregação relacional (`COALESCE(json_agg(...))`). Se alterar o SQL central de `/api/questoes`, tenha cuidado absoluto com as agregações de JSON.
*   **Validação Social:** A tabela `questoes` possui contadores globais (`tentativas` e `acertos`). A rota de submissão de sessão faz um *loop* (via `lista_detalhes`) atualizando o banco a cada quiz finalizado. Não quebre a passagem do `lista_detalhes` na API, caso contrário a porcentagem de alunos que acertou a questão (Mostrada no Alert Verde) vai parar de funcionar.
*   **Simulado Rápido:** O botão na home não passa pelas configs de matéria/tempo tradicionais. Ele intercepta as validações injetando valores literais (10 min / 10 questões globais).

---

## 🛠️ Como dar manutenção no Código
Para rodar ou modificar sem quebrar a pipeline de rotas:

1.  **Frontend:** Dentro de `painel-admin/`, sempre utilize comandos do Vite. Lembre que o botão "Sair" fica escondido na engrenagem superior (avatar).
2.  **Backend:** Qualquer reestruturação no FastAPI deve reiniciar o servidor Uvicorn manual caso modifique `models.py` (A hot-reload padrão às vezes engasga no Windows por file lock).
3.  **Variáveis:** Não mexer no `database.py` para injetar credenciais limpas (clear-text); o sistema é estritamente dependente do local `.env` da raiz.

*Criado em resposta à auditoria de sistema para garantir uma trilha documentada para as IAs mantenedoras do projeto Contabilidade Fácil.*
