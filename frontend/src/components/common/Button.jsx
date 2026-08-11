import React from 'react';
import clsx from 'clsx';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  className,
  ...props 
}) => {
  return (
    <button
      className={clsx(
        'btn',
        `btn-${variant}`,
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        fullWidth && 'btn-full-width',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="spinner" />}
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  );
};
