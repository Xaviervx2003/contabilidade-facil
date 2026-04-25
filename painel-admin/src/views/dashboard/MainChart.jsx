import React, { useEffect, useRef } from 'react'
import { CChartLine } from '@coreui/react-chartjs'
import { CSpinner } from '@coreui/react'
import { getStyle } from '@coreui/utils'

const MESES_FALLBACK = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul']

const MainChart = ({ data = null, loading = false }) => {
  const chartRef = useRef(null)

  // Sincroniza cores com o tema (claro/escuro)
  useEffect(() => {
    const update = () => {
      if (!chartRef.current) return
      setTimeout(() => {
        const chart = chartRef.current
        if (!chart.options?.scales) return
        const border = getStyle('--cui-border-color-translucent')
        const text = getStyle('--cui-body-color')
        const scales = chart.options.scales
          ;['x', 'y', 'y1'].forEach(axis => {
            if (scales[axis]) {
              if (scales[axis].grid) {
                scales[axis].grid.borderColor = border
                scales[axis].grid.color = border
              }
              if (scales[axis].ticks) scales[axis].ticks.color = text
            }
          })
        chart.update()
      })
    }
    document.documentElement.addEventListener('ColorSchemeChange', update)
    return () => document.documentElement.removeEventListener('ColorSchemeChange', update)
  }, [])

  // ── Estado de loading ──────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: 320 }}>
        <CSpinner color="primary" size="sm" />
        <small className="text-muted mt-2">Carregando gráfico...</small>
      </div>
    )
  }

  // ── Dados reais ou fallback ────────────────────────────
  const labels = data?.map(d => d.mes) ?? MESES_FALLBACK
  const sessoes = data?.map(d => d.sessoes) ?? []
  const medias = data?.map(d => d.media_acerto) ?? []

  // ── Estado vazio ───────────────────────────────────────
  if (labels.length === 0 || (sessoes.length === 0 && medias.length === 0)) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center text-muted" style={{ height: 280 }}>
        <span style={{ fontSize: '2rem' }}>📊</span>
        <small>Dados insuficientes para exibir o gráfico.</small>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: 320, marginTop: 16 }}>
      <CChartLine
        ref={chartRef}
        style={{ height: '100%' }}
        data={{
          labels,
          datasets: [
            {
              label: 'Sessões no mês',
              backgroundColor: `rgba(${getStyle('--cui-info-rgb')}, .15)`,
              borderColor: getStyle('--cui-info'),
              borderWidth: 2,
              pointBackgroundColor: getStyle('--cui-info'),
              pointHoverBackgroundColor: '#fff',
              pointBorderWidth: 2,
              pointHoverBorderWidth: 3,
              tension: 0.4,
              fill: true,
              yAxisID: 'y',
              data: sessoes,
            },
            {
              label: 'Média de acerto (%)',
              backgroundColor: 'transparent',
              borderColor: getStyle('--cui-success'),
              borderWidth: 2,
              pointBackgroundColor: getStyle('--cui-success'),
              pointHoverBackgroundColor: '#fff',
              pointBorderWidth: 2,
              pointHoverBorderWidth: 3,
              tension: 0.4,
              yAxisID: 'y1',
              data: medias,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: getStyle('--cui-body-color'),
                usePointStyle: true,
                padding: 20,
              },
            },
            tooltip: {
              backgroundColor: '#1e2a38',
              titleColor: '#7eb8f7',
              bodyColor: '#e0e8f0',
              borderColor: '#2d3f52',
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: false,
            },
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
              position: 'left',
              grid: { color: getStyle('--cui-border-color-translucent') },
              title: {
                display: true,
                text: 'Sessões',
                color: getStyle('--cui-body-color'),
              },
              ticks: {
                color: getStyle('--cui-body-color'),
                maxTicksLimit: 5,
                stepSize: 1,
              },
            },
            y1: {
              beginAtZero: true,
              max: 100,
              position: 'right',
              grid: { drawOnChartArea: false },
              title: {
                display: true,
                text: 'Acerto (%)',
                color: getStyle('--cui-body-color'),
              },
              ticks: {
                color: getStyle('--cui-body-color'),
                maxTicksLimit: 5,
                callback: (v) => `${v}%`,
              },
            },
          },
          elements: {
            point: {
              radius: 3,
              hitRadius: 10,
              hoverRadius: 5,
              hoverBorderWidth: 3,
            },
          },
        }}
      />
    </div>
  )
}

export default MainChart