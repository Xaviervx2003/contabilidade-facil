# 🎨 Sistema de Design e Guia de Implementação (Premium UI)

Este documento define o padrão visual e técnico para todas as funcionalidades do projeto **Contabilidade Fácil**. Siga estas diretrizes para garantir uma experiência de usuário consistente, moderna e acessível.

---

## 📋 Pilares do Design System

✅ **Tema Nativo (Light/Dark)**: Suporte total via CSS Variables (`var(--color-*)`).
✅ **Estética Premium**: Uso de glassmorphism, sombras suaves e gradientes sutis.
✅ **Micro-interações**: Animações de entrada e feedbacks visuais ao interagir (hover/click).
✅ **Acessibilidade**: Contraste garantido em ambos os temas, especialmente em elementos de progresso.

---

## 🚀 Padrões de Componentes (Novas Regras)

### 1. **Estatísticas (Stats Boxes)**
As estatísticas não devem ser apenas textos ou listas simples. Devem seguir o modelo de "Cards de Desempenho":
- **Estrutura**: Símbolo (Emoji/Ícone) + Valor (Destaque) + Legenda (Semântica).
- **Estilo**: Box com fundo translúcido, borda arredondada (`12px`) e efeito de elevação no hover.
- **Uso**: Dashboards, Históricos e Perfil.

### 2. **Barras de Progresso (Premium Bars)**
Para evitar que as barras fiquem "apagadas" em temas claros:
- **Trilha (Track)**: Deve ter alto contraste (`#e9ecef` no light mode) e sombra interna.
- **Preenchimento (Fill)**: Gradiente vibrante (`secondary` para `primary`) com 100% de preenchimento da altura da trilha.
- **Bordas**: Sempre arredondadas (`pill` style).

### 3. **Grids de Cards (Medalhas/Itens)**
Evite listas verticais longas. Use o layout "Lado a Lado":
- **Grid Automático**: `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`.
- **Adaptação**: Reduzir `minmax` para `160px` em dispositivos móveis.

---

## 🎬 Guia de Animações

Toda nova funcionalidade deve ser introduzida com suavidade:
1. **fadeInUp**: Para cards e seções ao carregar dados.
2. **Pulse**: Para indicadores de status ativo (ex: Streaks).
3. **Glow (Hover)**: Um brilho sutil ao interagir com itens desbloqueados ou importantes.

---

## 🔧 Guia de Desenvolvimento

### Cores Semânticas
Use sempre as variáveis centralizadas no `ThemeContext`:
- `var(--color-primary)`: Cor principal (Azul / Bege).
- `var(--color-secondary)`: Cor de destaque (Azul Claro).
- `var(--color-bg-elevated)`: Fundo para cards e boxes.
- `var(--color-border-light)`: Bordas sutis.

### Checklist de Implementação
- [ ] O componente respeita o Dark Mode?
- [ ] Os elementos de progresso estão legíveis no tema claro?
- [ ] Foi adicionada animação de entrada (`animate-in`)?
- [ ] O layout é responsivo (Grelha automática em vez de lista)?

---
*Atualizado em: 06/05/2026 | Foco: UI Premium e Gamificação.*
