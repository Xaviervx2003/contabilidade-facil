# 🗺️ Guia Mestre de Desenvolvimento - Contabilidade Fácil

Este é o resumo central de todas as diretrizes do projeto. Se você está começando uma nova tarefa, este é o seu mapa.

---

## 1. 🎨 Identidade Visual (O "Look & Feel")
*Documento completo: [IMPLEMENTATION_GUIDE.md](painel-admin/IMPLEMENTATION_GUIDE.md)*

- **Estética Premium**: Não use cores básicas. Use gradientes, sombras suaves e o efeito **Glassmorphism** (fundo translúcido com desfoque).
- **Tema Light/Dark**: Todo componente deve funcionar nos dois temas. Use as variáveis CSS `var(--color-*)`.
- **Micro-interações**: Elementos devem "ganhar vida" com animações suaves e efeitos de hover (passar o mouse).

---

## 2. 💻 Padrões de Código (A "Bíblia" JS)
*Documento completo: [javascript-style-guide.md](docs/best-practices/javascript-style-guide.md)*

- **Imutabilidade**: Use `const` por padrão. Só use `let` se o valor realmente mudar. Nunca use `var`.
- **Ponto e Vírgula**: Sempre use `;` ao final de cada instrução.
- **Strings**: Use **aspas simples** (`'texto'`). Use **Template Literals** (crases) para interpolação: `` `Olá, ${nome}` ``.
- **Objetos e Arrays**: Use sempre a sintaxe literal `{}` e `[]`. Use o **Spread Operator** `...` para cópias e merges.
- **Desestruturação**: Use `const { nome } = usuario;` para manter o código limpo.
- **Funções Modernas**: 
  - Prefira **Arrow Functions** `() => { ... }` para callbacks.
  - Evite loops `for`. Use `.map()`, `.filter()` e `.reduce()`.
- **Hoisting**: Defina suas variáveis e funções **antes** de tentar usá-las no código.
- **Nomeação**: 
  - `camelCase` para variáveis e funções.
  - `PascalCase` para Componentes React e Classes.

---

## 3. 🌳 Estrutura de Dados (Matérias e Assuntos)
- **Hierarquia**: Organizamos matérias em árvore (Pai e Filho).
- **Índices**: Mantemos a numeração original do Gran Cursos (ex: 3.1, 3.1.2) para garantir sincronia.
- **Banco de Dados**: Colunas `id_externo` e `parent_id` são obrigatórias na tabela `materias`.

---

## 4. 🛠️ Ferramentas e Comandos Úteis
- **Scraper**: `npx tsx scrapers/extrair-lista-gran.ts` (Captura novos dados).
- **Importador**: `npx tsx scrapers/importar-arvore.ts` (Leva os dados para o banco).
- **Painel Admin**: `npm start` dentro da pasta `painel-admin`.

---

> [!TIP]
> **Dica de Ouro**: Antes de criar algo novo, pergunte: "Isso parece Premium?" e "Isso segue o padrão Airbnb?". Se a resposta for sim, você está no caminho certo!
