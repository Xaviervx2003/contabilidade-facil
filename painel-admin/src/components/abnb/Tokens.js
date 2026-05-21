/**
 * Design tokens — Airbnb palette
 * Use estes tokens em todas as views para manter consistência visual.
 */
export const tokens = {
  rausch:  '#FF385C',   // vermelho/coral
  babu:    '#00A699',   // teal
  arches:  '#FC642D',   // laranja
  hof:     '#484848',   // texto escuro
  foggy:   '#767676',   // texto secundário
  swiss:   '#B0B0B0',   // borda/muted
}

export const alpha = (hex, a) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

/** Retorna a cor de acerto: verde ≥70, laranja ≥40, vermelho <40 */
export const acertoColor = (pct) =>
  pct >= 70 ? tokens.babu : pct >= 40 ? tokens.arches : tokens.rausch
