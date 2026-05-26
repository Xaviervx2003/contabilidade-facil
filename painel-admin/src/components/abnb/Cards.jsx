/**
 * Componentes de Card reutilizáveis — Modo Airbnb
 * Dependências: framer-motion, @iconify/react
 */
import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@iconify/react'
import { tokens, alpha } from './Tokens'

/* ── Barra de progresso animada ─────────────────────── */
export const AirbnbProgress = ({ value, color = tokens.rausch }) => (
  <div style={{ height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 99, overflow: 'hidden' }}>
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
      style={{ height: '100%', background: color, borderRadius: 99 }}
    />
  </div>
)

/* ── Card-seção genérico ─────────────────────────────── */
export const SCard = ({ children, style = {}, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
    style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 20,
      padding: '24px',
      height: '100%',
      ...style,
    }}
  >
    {children}
  </motion.div>
)

/* ── Stat Card ───────────────────────────────────────── */
export const StatCard = ({ icon, label, value, sub, accent = tokens.rausch, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    whileHover={{ y: -3, transition: { duration: 0.18 } }}
    style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      padding: '20px',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'default',
    }}
  >
    <div style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 3, borderRadius: '0 0 4px 4px', background: accent, opacity: 0.7 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: alpha(accent, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
        <Icon icon={icon} width="20" />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: tokens.foggy, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </span>
    </div>
    <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1, letterSpacing: '-0.5px' }}>
      {value ?? '—'}
    </div>
    {sub && <div style={{ fontSize: 12, color: tokens.foggy, marginTop: 6 }}>{sub}</div>}
  </motion.div>
)

/* ── Linha de matéria com barra ──────────────────────── */
export const MateriaRow = ({ m, color }) => (
  <div style={{ paddingBottom: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
        {m.materia}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{m.media_acerto ?? m.precisao}%</span>
    </div>
    <AirbnbProgress value={m.media_acerto ?? m.precisao} color={color} />
    {m.questoes !== undefined && (
      <div style={{ fontSize: 11, color: tokens.foggy, marginTop: 4 }}>{m.questoes} questões respondidas</div>
    )}
  </div>
)

/* ── Divisor ─────────────────────────────────────────── */
export const Divider = () => (
  <div style={{ height: 1, background: 'var(--color-border)', margin: '12px 0' }} />
)

/* ── Skeleton block ──────────────────────────────────── */
export const SkeletonBlock = ({ h = 20, w = '100%', r = 12 }) => (
  <div
    className="skshimmer"
    style={{ height: h, width: w, borderRadius: r }}
  />
)
