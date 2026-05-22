/**
 * abnb/Tokens.js — Re-exporta tokens centralizados de src/tokens.js
 *
 * Mantido por compatibilidade com componentes que importam daqui.
 * Fonte da verdade: src/tokens.js
 */
export { tokens, alpha } from '../../tokens'

/** Retorna a cor de acerto: verde ≥70, laranja ≥40, vermelho <40 */
import { tokens } from '../../tokens'
export const acertoColor = (pct) =>
  pct >= 70 ? tokens.babu : pct >= 40 ? tokens.arches : tokens.rausch
