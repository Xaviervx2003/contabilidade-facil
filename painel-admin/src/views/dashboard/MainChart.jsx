/**
 * MainChart.jsx – FIX #4
 * Recebe `data` e `loading` via props vindos do hook useChartData() no Dashboard.
 * Exibe sessões por mês e média de acerto – dados reais do backend.
 */

import React, { useEffect, useRef } from 'react'
import { CChartLine } from '@coreui/react-chartjs'
import { CSpinner } from '@coreui/react'
import { getStyle } from '@coreui/utils'

const MESES_FALLBACK = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul']

const MainChart = ({ data = null, loading = false }) => {
  const chartRef = useRef(null)

  // Atualiza cores ao trocar tema claro/escuro
  useEffect(() => {
    const update = () => {
      if (!chartRef.current) return
      setTimeout(() => {
        const c = chartRef.current
        const borderColor = getStyle('--cui-border-color-translucent')
        const bodyColor = getStyle('--cui-body-color')
        c.options.scales.x.grid.borderColor = borderColor
        c.options.scales.x.grid.color = borderColor
        c.options.scales.x.ticks.color = bodyColor
        c.options.scales.y.grid.borderColor = borderColor
        c.options.scales.y.grid.color = borderColor
        c.options.scales.y.ticks.color = bodyColor
        c.update()
      })
    }
    document.documentElement.addEventListener('ColorSchemeChange', update)
    return () => document.documentElement.removeEventListener('ColorSchemeChange', update)
  }, [])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: 300 }}>
        <CSpinner color="info" />
      </div>
    )
  }

  // Monta labels e datasets a partir dos dados do backend
  const labels = data?.map(d => d.mes) ?? MESES_FALLBACK
  const sessoes = data?.map(d => d.sessoes) ?? []
  const medias = data?.map(d => d.media_acerto) ?? []

  return (
    <CChartLine
      ref={chartRef}
      style={{ height: '300px', marginTop: '40px' }}
      data={{
        labels,
        datasets: [
          {
            label: 'Sessões no mês',
            backgroundColor: `rgba(${getStyle('--cui-info-rgb')}, .1)`,
            borderColor: getStyle('--cui-info'),
            pointHoverBackgroundColor: getStyle('--cui-info'),
            borderWidth: 2,
            data: sessoes,
            fill: true,
            yAxisID: 'y',
          },
          {
            label: 'Média de acerto (%)',
            backgroundColor: 'transparent',
            borderColor: getStyle('--cui-success'),
            pointHoverBackgroundColor: getStyle('--cui-success'),
            borderWidth: 2,
            data: medias,
            yAxisID: 'y1',
          },
        ],
      }}
      options={{
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: { enabled: true },
        },
        scales: {
          x: {
            grid: {
              color: getStyle('--cui-border-color-translucent'),
              drawOnChartArea: false,
            },
            ticks: { color: getStyle('--cui-body-color') },
          },
          y: {
            beginAtZero: true,
            border: { color: getStyle('--cui-border-color-translucent') },
            grid: { color: getStyle('--cui-border-color-translucent') },
            title: { display: true, text: 'Sessões' },
            ticks: { color: getStyle('--cui-body-color'), maxTicksLimit: 5 },
          },
          y1: {
            beginAtZero: true,
            max: 100,
            position: 'right',
            border: { color: getStyle('--cui-border-color-translucent') },
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Acerto (%)' },
            ticks: { color: getStyle('--cui-body-color'), maxTicksLimit: 5 },
          },
        },
        elements: {
          line: { tension: 0.4 },
          point: { radius: 3, hitRadius: 10, hoverRadius: 5, hoverBorderWidth: 3 },
        },
      }}
    />
  )
}

export default MainChart

