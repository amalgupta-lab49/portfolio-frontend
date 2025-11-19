/**
 * Reusable Metric Display Card
 */
import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  change,
  changePercent,
  trend,
  className = '',
  icon,
  onClick,
}: MetricCardProps) {
  const trendClass = trend || (change !== undefined ? (change >= 0 ? 'up' : 'down') : 'neutral');

  return (
    <div
      className={`metric-card ${trendClass} ${className} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      {icon && <div className="metric-icon">{icon}</div>}
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
        {(change !== undefined || changePercent !== undefined) && (
          <div className={`metric-change ${trendClass}`}>
            {change !== undefined && (
              <span className="change-amount">
                {change >= 0 ? '+' : ''}
                {change}
              </span>
            )}
            {changePercent !== undefined && (
              <span className="change-percent">
                ({changePercent >= 0 ? '+' : ''}
                {changePercent}%)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

