/**
 * Configurable Action Button Component
 */
import React from 'react';

export interface ActionButtonProps {
  label: string;
  action: string;
  onClick: (action: string, payload?: any) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  payload?: any;
}

export function ActionButton({
  label,
  action,
  onClick,
  variant = 'primary',
  icon,
  disabled = false,
  className = '',
  payload,
}: ActionButtonProps) {
  const handleClick = () => {
    if (!disabled) {
      onClick(action, payload);
    }
  };

  return (
    <button
      className={`action-button ${variant} ${className} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {icon && <span className="button-icon">{icon}</span>}
      <span className="button-label">{label}</span>
    </button>
  );
}

