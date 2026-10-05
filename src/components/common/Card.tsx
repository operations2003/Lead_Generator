import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`card ${interactive ? 'card-interactive' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number; // e.g. +12.5 or -3.2
    label?: string;
  };
  subtitle?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle,
}) => {
  return (
    <Card className="metric-card">
      <div className="metric-header">
        <span>{title}</span>
        {icon && <div style={{ color: 'var(--text-muted)' }}>{icon}</div>}
      </div>
      <div className="metric-value">{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
        {trend && (
          <div className={`metric-trend ${trend.value >= 0 ? 'up' : 'down'}`}>
            {trend.value >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trend.value >= 0 ? `+${trend.value}%` : `${trend.value}%`}</span>
            {trend.label && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>{trend.label}</span>}
          </div>
        )}
        {subtitle && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</span>}
      </div>
    </Card>
  );
};
