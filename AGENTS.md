<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

## Diretrizes de Seleção de Modelos e Controle de Custos

- **Não use Opus o tempo todo:** O Opus custa cerca de 5x mais por token do que o Sonnet. Mesma resposta, conta muito maior.
- **Use Sonnet para:** Escrever e editar código, análise de dados, perguntas gerais, resumos.
- **Use Opus para:** Decisões complexas de arquitetura, depuração profunda envolvendo múltiplos arquivos, redação de textos longos e sofisticados.
- **Use Haiku para:** Consultas rápidas, classificação de dados, formatação e tarefas simples em alto volume.

---

## 🎨 Sistema de Design Tokens (OBRIGATÓRIO para novas views)

> **REGRA CRÍTICA:** Nunca defina um objeto `tokens` ou `tk` local dentro de um arquivo `.jsx`.
> A fonte da verdade é **única**: `painel-admin/src/tokens.js`.

### Importação correta

```js
// ✅ CORRETO — Sempre use assim em qualquer view nova
import { tokens } from '../../tokens'

// ✅ Para views admin que usam alias 'tk':
import { tokens as tk } from '../../tokens'

// ✅ Para views que precisam das paletas de cores (ex: seletor de tema):
import { COLOR_PALETTES } from '../../tokens'

// ✅ Para cores dinâmicas que respondem à paleta ativa do usuário:
import { buildTokens } from '../../tokens'
import { useTheme } from '../../context/themeContext'
const { currentPalette } = useTheme()
const tk = buildTokens(currentPalette) // responde ao tema escolhido!
```

### ❌ Padrão PROIBIDO (nunca mais)

```js
// ❌ ERRADO — Nunca faça isso:
const tokens = {
  rausch: '#FF385C',
  babu: '#00A699',
  ...
}
```

### Referência dos tokens disponíveis

| Token | Valor padrão | Uso |
|---|---|---|
| `tokens.rausch` | `#FF385C` | Cor de destaque principal (botões, badges, destaques) |
| `tokens.babu` | `#00A699` | Cor secundária (sucesso, confirmação) |
| `tokens.arches` | `#FC642D` | Cor terciária (avisos, laranja) |
| `tokens.hof` | `#484848` | Texto escuro |
| `tokens.foggy` | `#767676` | Texto muted / secundário |
| `tokens.swiss` | `#B0B0B0` | Bordas muted |
| `tokens.border` | `var(--color-border)` | Bordas (tema-aware) |
| `tokens.bg` | `var(--color-bg-elevated)` | Fundo de cards (tema-aware) |
| `tokens.bgSub` | `var(--color-bg-tertiary)` | Fundo secundário (tema-aware) |
| `tokens.text` | `var(--color-text-primary)` | Texto principal (tema-aware) |

### Sistema de Paletas de Cores (Theme Picker)

O usuário pode trocar a paleta de destaque do sistema pela tela de **Perfil → Aparência** ou pelo botão 🎨 no header.

| ID | Emoji | Label | Primary |
|---|---|---|---|
| `rausch` | 🔴 | Coral (padrão) | `#FF385C` |
| `ocean` | 🔵 | Oceano | `#0EA5E9` |
| `violet` | 🟣 | Violeta | `#8B5CF6` |
| `emerald` | 🟢 | Esmeralda | `#10B981` |
| `amber` | 🟠 | Âmbar | `#F59E0B` |
| `slate` | 🩵 | Ardósia | `#475569` |

Para que um elemento **responda dinamicamente** à paleta ativa, use CSS variables:
```css
color: var(--accent-primary);
background: var(--accent-primary);
```

### Template de nova view (copie isso)

```jsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { tokens } from '../../tokens'          // ← OBRIGATÓRIO
import { useTheme } from '../../context/themeContext'

const FONT = "'Nunito', 'Circular Std', sans-serif"

const MinhaNovaView = () => {
  const { isDark } = useTheme()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', padding: '32px 16px', fontFamily: FONT }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>

        {/* HEADER PREMIUM */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <div style={{ color: tokens.rausch, fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            Seção
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.5px' }}>
            Título da Página
          </div>
          <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
            Descrição curta da tela.
          </div>
        </motion.div>

        {/* CONTEÚDO */}
      </div>
    </div>
  )
}

export default MinhaNovaView
```


## 🧩 Padrão de Refatoração e Componentização (Hooks e UI)

Para views e componentes complexos (ex: `Quiz.jsx`, `MinhasQuestoes.jsx`), siga estritamente o padrão de separação de responsabilidades:

1. **Lógica de Estado e Efeitos (Hooks Locais):**
   - Extraia a lógica pesada (useStates, useQuery, useMutation, timers) para um arquivo de hook customizado dentro da pasta `hooks/` local da view.
   - Exemplo: `src/views/quiz/hooks/useQuizLogic.js`.

2. **Componentes Visuais Menores:**
   - Extraia pequenos componentes reutilizáveis dentro da view para um arquivo na pasta `components/` local.
   - Exemplo: `src/views/quiz/components/QuizComponents.jsx`.

Essa prática evita arquivos gigantes, facilita manutenção, testes unitários, e melhora a velocidade do Hot Module Replacement (HMR) durante o desenvolvimento.
