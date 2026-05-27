/**
 * tokens.js — Design Tokens Centralizados (Multi-Paleta)
 *
 * Importar em todos os componentes:
 *   import { tokens } from '../../tokens'
 *   import { COLOR_PALETTES, DEFAULT_PALETTE } from '../../tokens'
 *
 * A paleta ativa é controlada pelo ThemeContext (accentPalette).
 * Os tokens exportados aqui refletem a paleta padrão (rausch/Airbnb).
 * Componentes que precisam da cor dinâmica devem usar:
 *   const { currentPalette } = useTheme()
 */

// ── Paletas de Destaque disponíveis ──────────────────────────────────────────
export const COLOR_PALETTES = {
  rausch: {
    id: 'rausch',
    label: 'Coral',
    emoji: '🔴',
    primary:   '#FF385C',
    secondary: '#00A699',
    accent:    '#FC642D',
    foggy:     '#767676',
    swiss:     '#B0B0B0',
    // Para CSS variables
    cssVars: {
      '--accent-primary':       '#FF385C',
      '--accent-primary-rgb':   '255, 56, 92',
      '--accent-secondary':     '#00A699',
      '--accent-secondary-rgb': '0, 166, 153',
      '--accent-tertiary':      '#FC642D',
    }
  },
  ocean: {
    id: 'ocean',
    label: 'Oceano',
    emoji: '🔵',
    primary:   '#0EA5E9',
    secondary: '#06B6D4',
    accent:    '#3B82F6',
    foggy:     '#64748B',
    swiss:     '#94A3B8',
    cssVars: {
      '--accent-primary':       '#0EA5E9',
      '--accent-primary-rgb':   '14, 165, 233',
      '--accent-secondary':     '#06B6D4',
      '--accent-secondary-rgb': '6, 182, 212',
      '--accent-tertiary':      '#3B82F6',
    }
  },
  violet: {
    id: 'violet',
    label: 'Violeta',
    emoji: '🟣',
    primary:   '#8B5CF6',
    secondary: '#A78BFA',
    accent:    '#EC4899',
    foggy:     '#6D28D9',
    swiss:     '#C4B5FD',
    cssVars: {
      '--accent-primary':       '#8B5CF6',
      '--accent-primary-rgb':   '139, 92, 246',
      '--accent-secondary':     '#A78BFA',
      '--accent-secondary-rgb': '167, 139, 250',
      '--accent-tertiary':      '#EC4899',
    }
  },
  emerald: {
    id: 'emerald',
    label: 'Esmeralda',
    emoji: '🟢',
    primary:   '#10B981',
    secondary: '#34D399',
    accent:    '#059669',
    foggy:     '#065F46',
    swiss:     '#6EE7B7',
    cssVars: {
      '--accent-primary':       '#10B981',
      '--accent-primary-rgb':   '16, 185, 129',
      '--accent-secondary':     '#34D399',
      '--accent-secondary-rgb': '52, 211, 153',
      '--accent-tertiary':      '#059669',
    }
  },
  amber: {
    id: 'amber',
    label: 'Âmbar',
    emoji: '🟠',
    primary:   '#F59E0B',
    secondary: '#FBBF24',
    accent:    '#D97706',
    foggy:     '#92400E',
    swiss:     '#FCD34D',
    cssVars: {
      '--accent-primary':       '#F59E0B',
      '--accent-primary-rgb':   '245, 158, 11',
      '--accent-secondary':     '#FBBF24',
      '--accent-secondary-rgb': '251, 191, 36',
      '--accent-tertiary':      '#D97706',
    }
  },
  slate: {
    id: 'slate',
    label: 'Ardósia',
    emoji: '🩵',
    primary:   '#475569',
    secondary: '#64748B',
    accent:    '#334155',
    foggy:     '#94A3B8',
    swiss:     '#CBD5E1',
    cssVars: {
      '--accent-primary':       '#475569',
      '--accent-primary-rgb':   '71, 85, 105',
      '--accent-secondary':     '#64748B',
      '--accent-secondary-rgb': '100, 116, 139',
      '--accent-tertiary':      '#334155',
    }
  },
  rose: {
    id: 'rose',
    label: 'Rosa',
    emoji: '🌹',
    primary:   '#E11D48',
    secondary: '#F43F5E',
    accent:    '#BE123C',
    foggy:     '#881337',
    swiss:     '#FDA4AF',
    cssVars: {
      '--accent-primary':       '#E11D48',
      '--accent-primary-rgb':   '225, 29, 72',
      '--accent-secondary':     '#F43F5E',
      '--accent-secondary-rgb': '244, 63, 94',
      '--accent-tertiary':      '#BE123C',
    }
  },
  indigo: {
    id: 'indigo',
    label: 'Índigo',
    emoji: '🌌',
    primary:   '#4F46E5',
    secondary: '#6366F1',
    accent:    '#4338CA',
    foggy:     '#312E81',
    swiss:     '#A5B4FC',
    cssVars: {
      '--accent-primary':       '#4F46E5',
      '--accent-primary-rgb':   '79, 70, 229',
      '--accent-secondary':     '#6366F1',
      '--accent-secondary-rgb': '99, 102, 241',
      '--accent-tertiary':      '#4338CA',
    }
  },
  teal: {
    id: 'teal',
    label: 'Turquesa',
    emoji: '🌊',
    primary:   '#0D9488',
    secondary: '#14B8A6',
    accent:    '#0F766E',
    foggy:     '#115E59',
    swiss:     '#5EEAD4',
    cssVars: {
      '--accent-primary':       '#0D9488',
      '--accent-primary-rgb':   '13, 148, 136',
      '--accent-secondary':     '#14B8A6',
      '--accent-secondary-rgb': '20, 184, 166',
      '--accent-tertiary':      '#0F766E',
    }
  },
}

export const DEFAULT_PALETTE = 'rausch'

// ── Tokens estáticos (paleta padrão Airbnb — retrocompatível) ────────────────
// Estes valores são fixos. Para cores dinâmicas baseadas na paleta ativa,
// use: const { currentPalette } = useTheme()
export const tokens = {
  rausch:  '#FF385C',   // Coral principal (Airbnb red)
  babu:    '#00A699',   // Teal/Verde
  arches:  '#FC642D',   // Laranja
  hof:     '#484848',   // Texto escuro
  foggy:   '#767676',   // Cinza muted
  swiss:   '#B0B0B0',   // Borda/muted
  border:  'var(--color-border)',
  bg:      'var(--color-bg-elevated)',
  bgSub:   'var(--color-bg-tertiary)',
  text:    'var(--color-text-primary)',
}

// ── Helper para construir tokens dinamicamente a partir de uma paleta ─────────
// Uso: const tk = buildTokens(currentPalette)
export const buildTokens = (palette = COLOR_PALETTES[DEFAULT_PALETTE]) => ({
  rausch:  palette.primary,
  babu:    palette.secondary,
  arches:  palette.accent,
  hof:     '#484848',
  foggy:   'var(--color-text-muted, #767676)',
  swiss:   '#B0B0B0',
  border:  'var(--color-border)',
  bg:      'var(--color-bg-elevated)',
  bgSub:   'var(--color-bg-tertiary)',
  text:    'var(--color-text-primary)',
})

// ── Helper alpha (converte hex para rgba) ─────────────────────────────────────
export const alpha = (hex, opacity) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export default tokens
