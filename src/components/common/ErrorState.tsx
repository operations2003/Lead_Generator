import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  fullCard?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message = 'An error occurred while fetching information from the server.',
  onRetry,
  fullCard = true,
}) => {
  const content = (
    <div className="state-container">
      <div className="state-icon" style={{ backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error-text)' }}>
        <AlertTriangle size={28} />
      </div>
      <h3 className="state-title">{title}</h3>
      <p className="state-description">{message}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          <RefreshCw size={16} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );

  if (fullCard) {
    return <div className="card" style={{ borderColor: 'var(--status-error-border)' }}>{content}</div>;
  }

  return content;
};
