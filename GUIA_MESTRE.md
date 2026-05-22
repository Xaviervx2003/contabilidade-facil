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

## 3. 🎨 Design Tokens — REGRA OBRIGATÓRIA

> **Esta é a regra mais importante ao criar qualquer nova tela ou componente.**

**❌ NUNCA** crie um objeto local de tokens. Isso está **banido** do projeto:
```js
// ❌ PROIBIDO
const tokens = { rausch: '#FF385C', babu: '#00A699', ... }
const tk = { rausch: '#FF385C', ... }
```

**✅ SEMPRE** importe do arquivo centralizado:
```js
// ✅ Para views de aluno e perfil:
import { tokens } from '../../tokens'

// ✅ Para views admin (alias tk):
import { tokens as tk } from '../../tokens'
```

**Por quê?** O arquivo `painel-admin/src/tokens.js` é a **fonte única da verdade**. Ele suporta o sistema de paletas de cores (o usuário pode trocar a cor de destaque do sistema inteiro em **Perfil → Aparência**). Se cada view tiver sua própria cópia, a troca de paleta não funcionará.

*Documentação completa: [docs/best-practices/design-tokens.md](docs/best-practices/design-tokens.md)*

---

## 4. 🌳 Estrutura de Dados (Matérias e Assuntos)
- **Hierarquia**: Organizamos matérias em árvore (Pai e Filho).
- **Índices**: Mantemos a numeração original do Gran Cursos (ex: 3.1, 3.1.2) para garantir sincronia.
- **Banco de Dados**: Colunas `id_externo` e `parent_id` são obrigatórias na tabela `materias`.

---

## 5. 🛠️ Ferramentas e Comandos Úteis
- **Scraper**: `npx tsx scrapers/extrair-lista-gran.ts` (Captura novos dados).
- **Importador**: `npx tsx scrapers/importar-arvore.ts` (Leva os dados para o banco).
- **Painel Admin**: `npm start` dentro da pasta `painel-admin`.

---

> [!TIP]
> **Dica de Ouro**: Antes de criar algo novo, pergunte: "Isso parece Premium?" e "Isso segue o padrão Airbnb?". Se a resposta for sim, você está no caminho certo!

> [!IMPORTANT]
> **Tokens**: Antes de criar uma nova view, verifique se você está importando `tokens` do arquivo central `painel-admin/src/tokens.js`. Nunca crie uma cópia local.
