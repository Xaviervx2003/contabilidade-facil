# 🎨 Design Tokens & Theme System — Contabilidade Fácil

> **Fonte da verdade:** `painel-admin/src/tokens.js`
> **Atualizado em:** 2026-05-22

---

## ⚠️ REGRA #1 — Nunca defina tokens localmente

```js
// ❌ PROIBIDO em qualquer .jsx do projeto:
const tokens = {
  rausch: '#FF385C',
  babu: '#00A699',
  arches: '#FC642D',
  ...
}
```

**Motivo:** O sistema suporta troca dinâmica de paleta de cores (ver seção 4). Se cada arquivo tiver sua própria cópia das cores, a troca de paleta não terá efeito naquele arquivo.

---

## 1. Importações Disponíveis

### 1.1 Tokens estáticos (uso geral)

```js
import { tokens } from '../../tokens'

// Aliases usados em arquivos admin:
import { tokens as tk } from '../../tokens'
```

### 1.2 Sistema de paletas completo

```js
import { COLOR_PALETTES, DEFAULT_PALETTE } from '../../tokens'

// COLOR_PALETTES é um objeto com 6 paletas:
// rausch | ocean | violet | emerald | amber | slate
```

### 1.3 Tokens dinâmicos (respondem à paleta ativa do usuário)

```js
import { buildTokens } from '../../tokens'
import { useTheme } from '../../context/themeContext'

const MinhaView = () => {
  const { currentPalette } = useTheme()
  const tk = buildTokens(currentPalette) // muda com a paleta!
  // ...
}
```

### 1.4 Helper alpha (hex → rgba)

```js
import { alpha } from '../../tokens'
// ou:
import { tokens, alpha } from '../../tokens'

// Uso:
alpha(tokens.rausch, 0.15)  // → "rgba(255, 56, 92, 0.15)"
```

---

## 2. Referência Completa dos Tokens Estáticos

| Token | Valor | Uso recomendado |
|---|---|---|
| `tokens.rausch` | `#FF385C` | Cor de destaque principal — botões primários, badges, headers |
| `tokens.babu` | `#00A699` | Cor de sucesso/confirmação — checkmarks, progresso |
| `tokens.arches` | `#FC642D` | Cor de aviso/laranja — alertas moderados, labels |
| `tokens.hof` | `#484848` | Texto escuro — títulos em modo claro |
| `tokens.foggy` | `#767676` | Texto secundário / muted — labels, datas, subtítulos |
| `tokens.swiss` | `#B0B0B0` | Bordas muted — separadores, ícones inativos |
| `tokens.border` | `var(--color-border)` | Bordas de cards e inputs (tema-aware automático) |
| `tokens.bg` | `var(--color-bg-elevated)` | Fundo de cards elevados (tema-aware automático) |
| `tokens.bgSub` | `var(--color-bg-tertiary)` | Fundo de subtítulos/seções (tema-aware automático) |
| `tokens.text` | `var(--color-text-primary)` | Texto principal (tema-aware automático) |

---

## 3. CSS Variables Globais (Tema Light/Dark)

Essas variáveis são definidas em `style.scss` e mudam automaticamente com o tema:

| Variável CSS | Light | Dark |
|---|---|---|
| `--color-bg-primary` | `#F7F7F7` | `#0F1117` |
| `--color-bg-elevated` | `#FFFFFF` | `#1A1D27` |
| `--color-bg-tertiary` | `#F0F0F0` | `#252836` |
| `--color-text-primary` | `#111827` | `#F1F5F9` |
| `--color-text-muted` | `#767676` | `#94A3B8` |
| `--color-border` | `#E5E7EB` | `#2D3148` |

---

## 4. Sistema de Paletas de Cores (Theme Picker)

O usuário pode trocar a paleta de destaque em **Perfil → Aparência** ou pelo botão 🎨 no header.  
A escolha é salva no `localStorage` via `ThemeContext`.

### Paletas disponíveis

| ID | Emoji | Label | Primary | Secondary | Accent |
|---|---|---|---|---|---|
| `rausch` | 🔴 | Coral *(padrão)* | `#FF385C` | `#00A699` | `#FC642D` |
| `ocean` | 🔵 | Oceano | `#0EA5E9` | `#06B6D4` | `#3B82F6` |
| `violet` | 🟣 | Violeta | `#8B5CF6` | `#A78BFA` | `#EC4899` |
| `emerald` | 🟢 | Esmeralda | `#10B981` | `#34D399` | `#059669` |
| `amber` | 🟠 | Âmbar | `#F59E0B` | `#FBBF24` | `#D97706` |
| `slate` | 🩵 | Ardósia | `#475569` | `#64748B` | `#334155` |

### CSS Variables de acento (injetadas dinamicamente pelo ThemeContext)

```css
--accent-primary        /* Cor principal da paleta ativa */
--accent-primary-rgb    /* RGB da cor principal (para transparências) */
--accent-secondary      /* Cor secundária da paleta */
--accent-secondary-rgb  /* RGB da secundária */
--accent-tertiary       /* Cor de acento/detalhe */
```

**Como usar em CSS/inline styles:**
```css
/* Em .scss ou style={{ }} */
color: var(--accent-primary);
background: var(--accent-primary);
border-color: var(--accent-primary);
box-shadow: 0 4px 12px rgba(var(--accent-primary-rgb), 0.3);
```

---

## 5. Casos especiais (extensão de tokens)

Quando um arquivo precisar de cores **adicionais** que não existem nos tokens base, extenda em vez de redefinir:

```js
// ✅ CORRETO — extensão dos tokens base
import { tokens as baseTokens } from '../../tokens'

const tokens = {
  ...baseTokens,
  gold: '#FFD700',      // cor extra específica deste arquivo
  silver: '#C0C0C0',
  bronze: '#CD7F32',
}
```

**Exemplo real:** `Conquistas.jsx` usa essa abordagem para as cores de medalhas.

---

## 6. Template mínimo de nova view

```jsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { tokens } from '../../tokens'             // ← SEMPRE
import { useTheme } from '../../context/themeContext'

const FONT = "'Nunito', 'Circular Std', sans-serif"

const MinhaNovaView = () => {
  const { isDark } = useTheme()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      padding: '32px 16px 60px',
      fontFamily: FONT
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>

        {/* HEADER PREMIUM — copie este padrão */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{
            color: tokens.rausch,
            fontWeight: 800,
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: 4,
          }}>
            Seção / Módulo
          </div>
          <div style={{
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.5px',
            lineHeight: 1.2,
          }}>
            Título da Página 📊
          </div>
          <div style={{ fontSize: 14, color: tokens.foggy, marginTop: 6 }}>
            Descrição curta e objetiva da tela.
          </div>
        </motion.div>

        {/* CONTEÚDO PRINCIPAL */}

      </div>
    </div>
  )
}

export default MinhaNovaView
```

---

## 7. Checklist ao criar nova view

- [ ] Importa `tokens` de `../../tokens` (nunca define local)
- [ ] Usa `var(--color-bg-primary)` como fundo raiz
- [ ] Usa `var(--color-text-primary)` para texto principal
- [ ] Usa `var(--color-border)` para bordas de cards
- [ ] Anima a entrada com `framer-motion` (`initial/animate`)
- [ ] Header segue o padrão: supertítulo muted + título grande + subtítulo
- [ ] Botões primários usam `tokens.rausch` ou `var(--accent-primary)`
