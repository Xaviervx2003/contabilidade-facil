# Plano de Implementação Completo: Behavioral Design & Upgrades

Este documento mapeia as estratégias baseadas em Behavioral Design e os upgrades previstos para a plataforma Contabilidade Fácil.

## 1. Upgrades Imediatos Selecionados

### 1.1 Efeito Padrão (Simulado Rápido na Home)
- **Objetivo:** Reduzir o atrito cognitivo. O aluno loga e um grande botão o induz a começar sem pensar.
- **Mudanças Previstas:**
  - `Quiz.jsx`: Adicionar bloco visual enorme com botão: `▶️ Começar Simulado Rápido (10 Aleatórias)`.
  - Ignorar o preenchimento de filtros (Assunto/Quantidade) disparando a consulta na API imediatamente gerando 10 questões globais aleatórias.

### 1.2 Validação Social (Ações e Resoluções)
- **Objetivo:** Trazer o instinto de competição e pertencimento pela exibição de métricas dos colegas de turma ao final de cada questão respondida.
- **Mudanças Previstas:**
  - `init.sql` / BD: Adicionar `tentativas INT DEFAULT 0` e `acertos INT DEFAULT 0` na tabela de `questoes`.
  - `models.py` / API: Permitir que via payload a rota `/api/sessoes` receba os "detalhes por questão" que foram certos e errados.
  - Backend Atualização: Fazer update (incremento) dessas estatísticas no PostgreSQL ao concluir as sessões.
  - `Quiz.jsx`: Ao exibir o balão verde ou vermelho, exibir o texto: *"👥 Validação Social: 45% dos alunos também acertaram essa questão"*.

## 2. Upgrades Futuros e Validados (Backlog)

### 2.1 Vídeo-Aulas nas Questões (Hospedagem Externa)
- Adição da coluna `link_video` na tabela `questoes`.
- Embutir frames `<iframe>` do YouTube / Vimeo no modal de "Ver Explicações", aproveitando as vantagens da velocidade de servidores alheios.

### 2.2 Recompensas (Ofensivas)
- Adicionar no histórico rastreiros para exibir um fogo (🔥) avisando os dias sequenciais de estudo que o estudante teve, usando "Aversão à Perda".

### 2.3 Exibição por Dificuldade (Taxonomia das Questões)
- Uma tag extra `(Fácil, Médio, Difícil)` definida na edição do Administrador e podendo ser escolhida nos filtros do quiz.
