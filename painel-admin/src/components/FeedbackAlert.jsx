import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilWarning, cilInfo, cilXCircle } from '@coreui/icons'
import { useTheme } from '../context/themeContext'

const typeConfig = {
  success: {
    icon: cilCheckCircle,
    colorVar: '--color-success',
    bgVar: '--color-successBg',
  },
  error: {
    icon: cilXCircle,
    colorVar: '--color-error',
    bgVar: '--color-errorBg',
  },
  warning: {
    icon: cilWarning,
    colorVar: '--color-warning',
    bgVar: '--color-warningBg',
  },
  info: {
    icon: cilInfo,
    colorVar: '--color-info',
    bgVar: '--color-infoBg',
  },
}

const FeedbackAlert = ({ type = 'info', children, className = '' }) => {
  const { isDark } = useTheme()
  const config = typeConfig[type] || typeConfig.info

  return (
    <div
      className={`d-flex align-items-center gap-3 rounded-3 p-3 mb-3 transition-colors ${className}`}
      style={{
        backgroundColor: `var(${config.bgVar})`,
        color: `var(${config.colorVar})`,
        border: `1px solid var(${config.colorVar})`,
        borderLeft: `4px solid var(${config.colorVar})`,
      }}
      role="alert"
    >
      <div className="flex-shrink-0">
        <CIcon icon={config.icon} size="xl" />
      </div>
      <div className="flex-grow-1" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
        {children}
      </div>
    </div>
  )
}

export default FeedbackAlert
