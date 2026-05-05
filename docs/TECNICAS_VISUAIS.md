markdown
# 🎨 GUIA DE ESTILO VISUAL — VideoGallery.jsx

> Técnicas que transformam componentes CoreUI comuns em interfaces com
> personalidade forte e efeito halo positivo.

---

## 1. 🧱 Estrutura baseada em `div`s, não em componentes CoreUI

- **NÃO** usa `<CCard>`, `<CCardBody>`, `<CCardHeader>`.
- Cada bloco é construído com `<div>` + estilos `inline` ou `style` props.
- Isso dá controle total sobre bordas, sombras, `border-radius`, animações e
  espaçamentos, sem herdar os estilos padrão do framework.

---

## 2. 🌓 Sistema de cores dinâmico com `isDark`

- Todas as cores são definidas manualmente com ternários:

  ```js
  const bgCard = isDark ? '#1a2535' : '#ffffff'
  const borderCard = isDark ? '#2d3f52' : '#e2e8f0'
Garante funcionamento perfeito nos temas claro e escuro, sem depender das
variáveis CSS do CoreUI (que às vezes falham no modo escuro).

3. 💀 Skeleton Loading com shimmer animado
Em vez de um spinner genérico, são usados esqueletos visuais (<div>) que
piscam com animação CSS shimmer.

Benefícios:

Sensação de velocidade e profissionalismo.

Mantém o layout estável durante o carregamento.

Evita saltos de conteúdo (Cumulative Layout Shift).

4. 🎬 Thumbnails de YouTube com lazy loading
Extrai o ID do vídeo com regex e monta URL de thumbnail estática:
https://img.youtube.com/vi/{id}/hqdefault.jpg.

O iframe só é ativado quando o usuário clica no play, economizando banda e
melhorando a performance.

5. 👀 IntersectionObserver para performance
Usa IntersectionObserver para detectar quando o card entra na viewport.

O iframe não carrega automaticamente — apenas "pré-aquece" com a
thumbnail.

6. 📋 Modo Lista e Modo Grade com toggle visual
Implementa dois layouts completamente diferentes:

Lista: horizontal, com thumbnail à esquerda e conteúdo à direita.

Grade: cards em grid com thumbnail no topo.

Toggle visual com botões de ícone (cilGrid / cilList).

7. ▶️ Modo Playlist
Player sequencial que navega entre vídeos com botões Anterior / Próximo,
barra de progresso e destaque visual.

Totalmente customizado, sem dependência de bibliotecas externas.

8. 📝 Anotações pessoais por vídeo com localStorage
Cada card tem um sistema de anotações:

Textarea expansível.

Salva no localStorage com chave nota:{id}.

Botões "Salvar" / "Cancelar" / "Editar nota".

9. 🎯 Recomendações baseadas em desempenho
Busca o histórico de desempenho do aluno (/api/aluno/historico-grafico).

Destaca os vídeos de assuntos onde o aluno foi mal (acerto < 60%).

Exibe um painel chamativo com borda vermelha e botão "Ver vídeo".

10. ✨ Microinterações e feedback visual
Hover nos cards: transform: translateY(-3px) + box-shadow.

Bordas coloridas para itens assistidos (verde).

Badges customizados com cores fortes.

Botões com variantes ghost e outline combinados com cores manuais.

11. 🔍 Busca textual + filtro por matéria + ordenação
Barra de busca com ícone de lupa e botão "X" para limpar.

Dropdown de matéria com contador de vídeos por matéria.

Ordenação: "não assistidos primeiro", "assistidos primeiro", "A → Z".

12. 📊 Progresso geral da galeria
Barra de progresso personalizada com <CProgress> do CoreUI.

Mostra % de vídeos assistidos com contador numérico.

13. 🛠️ Utilitários próprios
fetchJSON(url): fetch com verificação de r.ok.

extrairYouTubeId(url): regex para extrair ID de vários formatos.

extrairVimeoId(url): suporte a Vimeo.

obterLinkEmbed(url): gera URL de embed limpa.

obterThumbnail(url): gera URL de thumbnail do YouTube.

ls.get(key, def) / ls.set(key, val): localStorage com fallback
silencioso.

🚀 Como replicar em outros componentes
Substitua <CCard> por <div> com estilos inline.

Defina cores dinâmicas com isDark.

Use fetchJSON em vez de fetch puro.

Adicione skeleton loading durante carregamentos.

Implemente filtros, busca e ordenação com useMemo.

Adicione microinterações com :hover e transições CSS.

Persista preferências no localStorage com o helper ls.

