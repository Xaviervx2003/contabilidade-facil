# 🎨 Design Tokens & Theme System

Este documento detalha o sistema de tokens de design utilizado no projeto Contabilidade Fácil.
Os tokens são injetados globalmente como Variáveis CSS (Custom Properties) e integrados nativamente com o Tailwind CSS (v4).

---

## 1. Cores Semânticas (Semantic Colors)

Evite o uso de cores fixas (ex: `bg-blue-500` ou `text-red-500`) em alertas e feedbacks visuais. Utilize as cores semânticas que se adaptam perfeitamente tanto ao modo Claro quanto ao Escuro.

| Variável CSS | Classe Tailwind | Uso |
| --- | --- | --- |
| `--color-success` | `text-success` | Textos, ícones e bordas de sucesso. |
| `--color-successBg` | `bg-successBg` | Fundos suaves para alertas e badges de sucesso. |
| `--color-error` | `text-error` | Textos, ícones e bordas de erros/falhas. |
| `--color-errorBg` | `bg-errorBg` | Fundos suaves para alertas e badges de erro. |
| `--color-warning` | `text-warning` | Textos, ícones e bordas de aviso/atenção. |
| `--color-warningBg`| `bg-warningBg` | Fundos suaves para alertas e badges de aviso. |
| `--color-info` | `text-info` | Textos, ícones e bordas de informação/dica. |
| `--color-infoBg` | `bg-infoBg` | Fundos suaves para dicas e painéis informativos. |

💡 **Dica:** Ao criar alertas de erro, utilize o componente reutilizável `<FeedbackAlert type="error">Erro!</FeedbackAlert>`.

---

## 2. Tipografia Fluida (Fluid Typography)

O tamanho das fontes dos títulos principais (h1 a h4) é calculado usando `clamp()` para que se ajuste suavemente do mobile para o desktop, sem a necessidade de media queries explícitas (`md:text-2xl`, etc).

| Token CSS | Classe Tailwind | Tamanho |
| --- | --- | --- |
| `--text-fluid-h1` | `text-h1` | 32px (mobile) a 56px (desktop) |
| `--text-fluid-h2` | `text-h2` | 28px (mobile) a 40px (desktop) |
| `--text-fluid-h3` | `text-h3` | 24px (mobile) a 32px (desktop) |
| `--text-fluid-h4` | `text-h4` | 20px (mobile) a 24px (desktop) |

Além disso, adicionamos utilitários para otimizar leitura:
*   **`.text-reading`**: Aumenta o `line-height` para 1.7 (Ideal para enunciados de questões longos).
*   **`.tabular-nums`**: Alinha números tabularmente (Ideal para timers, dashboards de estatísticas e tabelas de notas).
*   **`.text-balance`**: Equilibra quebras de linhas de títulos para evitar palavras isoladas.

---

## 3. Acessibilidade & Movimento Reduzido (Reduced Motion)

O sistema respeita a configuração do Sistema Operacional do usuário (`prefers-reduced-motion`). Se o usuário optar por reduzir o movimento:
1. Animações e transições globais são forçadas a `0.01ms`.
2. Em animações customizadas (como `framer-motion`), você deve importar `useReducedMotion`:
   ```javascript
   import { useReducedMotion } from 'framer-motion';
   
   const Component = () => {
       const shouldReduceMotion = useReducedMotion();
       return <motion.div initial={{ y: shouldReduceMotion ? 0 : 20 }} ... />
   }
   ```

---

## 4. Container Queries vs Media Queries

Para tornar componentes isolados mais inteligentes em layouts complexos (ex: cards que se comportam diferente dependendo do tamanho da coluna em que estão, e não do tamanho da tela inteira), foi adicionada a classe de utility `.card-container`.

Para aplicar:
```html
<!-- O card define seu próprio container de largura -->
<div className="card-container">
  <!-- Agora os filhos respondem ao container (@md) e não à viewport (md) -->
  <div className="@md:flex-row flex-col">...</div>
</div>
```
