# Plano de Implementação: Behavioral Design & Upgrades (Fase 2)

Este plano detalha as modificações necessárias para implementar os itens pendentes do `UPGRADE_PLAN.md`.

## 1. Vídeo-Aulas nas Questões (2.1)
Permite que o administrador anexe um link de vídeo (YouTube/Vimeo) a cada questão para enriquecer a explicação.

### [Backend]
#### [MODIFY] [models.py](file:///c:/projetos/contabilidade%20facil/models.py)
- Adicionar `link_video: Optional[str] = None` ao modelo `QuestaoRequest`.

#### [MODIFY] [routes/questoes.py](file:///c:/projetos/contabilidade%20facil/routes/questoes.py)
- **`obter_questoes`**: Incluir a coluna `link_video` no SELECT e no mapeamento de retorno.
- **`criar_questao`**: Incluir `link_video` no INSERT.
- **`atualizar_questao`**: Incluir `link_video` no UPDATE.
- **`importar_csv`**: Adicionar suporte para a coluna `link_video` na importação em massa.

#### [SQL] Banco de Dados
- Comando sugerido: `ALTER TABLE questoes ADD COLUMN link_video TEXT;`

### [Frontend]
#### [MODIFY] [GestaoQuestoes.jsx](file:///c:/projetos/contabilidade%20facil/painel-admin/src/views/questoes/GestaoQuestoes.jsx)
- Adicionar um campo de input "Link do Vídeo (Opcional)" no formulário de criação/edição.

#### [MODIFY] [Quiz.jsx](file:///c:/projetos/contabilidade%20facil/painel-admin/src/views/quiz/Quiz.jsx)
- No modal de explicação, verificar se `questao.link_video` existe.
- Se existir, renderizar um componente `<iframe>` ou um botão que abra o vídeo.

---

## 2. Recompensas (Ofensivas / 🔥) (2.2)
Gera engajamento via "Aversão à Perda", rastreando quantos dias seguidos o aluno estuda.

### [Backend]
#### [SQL] Banco de Dados
- Comando sugerido: 
  ```sql
  ALTER TABLE usuarios ADD COLUMN streak_count INT DEFAULT 0;
  ALTER TABLE usuarios ADD COLUMN last_streak_date DATE;
  ```

#### [MODIFY] [routes/sessoes.py](file:///c:/projetos/contabilidade%20facil/routes/sessoes.py)
- Na rota `salvar_sessao`, após salvar os dados da sessão:
    - Obter `streak_count` e `last_streak_date` do usuário (via matrícula).
    - Lógica de atualização:
        - Se `last_streak_date` for ontem: `streak_count += 1`.
        - Se `last_streak_date` for antes de ontem: `streak_count = 1`.
        - Se `last_streak_date` for hoje: não faz nada.
    - Atualizar a tabela `usuarios`.

#### [MODIFY] [routes/auth.py](file:///c:/projetos/contabilidade%20facil/routes/auth.py)
- Retornar o `streak_count` no JSON de sucesso do login para que o frontend possa armazenar.

### [Frontend]
#### [MODIFY] [Login.jsx](file:///c:/projetos/contabilidade%20facil/painel-admin/src/views/pages/login/Login.jsx)
- Salvar `streak` no `sessionStorage`.

#### [MODIFY] [AppSidebar.jsx](file:///c:/projetos/contabilidade%20facil/painel-admin/src/components/AppSidebar.jsx)
- Exibir o ícone 🔥 ao lado do nome do usuário se `streak > 0`.

---

## 3. Exibição por Dificuldade (2.3)
Classifica as questões para permitir um estudo mais direcionado.

### [Backend]
#### [SQL] Banco de Dados
- Comando sugerido: `ALTER TABLE questoes ADD COLUMN dificuldade VARCHAR(20) DEFAULT 'Médio';`

#### [MODIFY] [models.py](file:///c:/projetos/contabilidade%20facil/models.py)
- Adicionar `dificuldade: Optional[str] = 'Médio'` ao modelo `QuestaoRequest`.

#### [MODIFY] [routes/questoes.py](file:///c:/projetos/contabilidade%20facil/routes/questoes.py)
- Adicionar filtro `dificuldade` na query param de `obter_questoes`.
- Atualizar INSERT/UPDATE para suportar o campo.

### [Frontend]
#### [MODIFY] [GestaoQuestoes.jsx](file:///c:/projetos/contabilidade%20facil/painel-admin/src/views/questoes/GestaoQuestoes.jsx)
- Adicionar um `<CFormSelect>` com as opções: Fácil, Médio, Difícil.

#### [MODIFY] [Quiz.jsx](file:///c:/projetos/contabilidade%20facil/painel-admin/src/views/quiz/Quiz.jsx)
- Adicionar o filtro de dificuldade na tela inicial de seleção.
- Exibir uma Badge colorida (Verde/Amarelo/Vermelho) em cada questão indicando o nível.

---

## Verificação

### Testes Manuais
- Criar uma questão com vídeo e verificar se ele aparece no Quiz.
- Responder um quiz e verificar se a "Ofensiva" incrementa no banco de dados.
- Filtrar questões por dificuldade e verificar se o retorno da API está correto.
