# 🎨 DESIGN SYSTEM — Contabilidade Fácil

> **Objetivo:** Servir como referência única de estilo e layout para qualquer pessoa (ou IA) que for desenvolver novas telas ou componentes no projeto.
> **Atualizado em:** 27/04/2026

---

## 1. 🌓 TEMAS (CLARO / ESCURO)

O sistema acompanha automaticamente o tema definido pelo CoreUI (atributo `data-coreui-theme` no `<html>`).

**Regra nº 1:** Nunca use cores fixas (ex.: `#111b27` ou `#ffffff`) sem antes verificar o tema atual.  
**Regra nº 2:** Sempre use o hook de detecção de tema ou o helper `getTokens(isDark)`.

### Como detectar o tema

```jsx
import { useEffect, useState } from 'react'

const [isDark, setIsDark] = useState(false)

useEffect(() => {
  const check = () => setIsDark(document.documentElement.getAttribute('data-coreui-theme') === 'dark')
  check()
  const obs = new MutationObserver(check)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-coreui-theme'] })
  return () => obs.disconnect()
}, [])