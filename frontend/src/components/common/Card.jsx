import React from 'react';
import clsx from 'clsx';

export const Card = ({ children, className, title, icon, actions, ...props }) => {
  return (
    <div className={clsx('glass-card', className)} {...props}>
      {(title || icon || actions) && (
        <div className="glass-card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icon}
            <span>{title}</span>
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export const StatCard = ({ icon, iconColor = 'primary', title, value, subtitle, trend }) => {
  return (
    <div className="stat-card">
      <div className={`stat-icon-wrapper ${iconColor}`}>
        {icon}
      </div>
      <div className="stat-info">
        <h4>{title}</h4>
        <p>{value}</p>
        {subtitle && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {subtitle}
          </div>
        )}
        {trend && (
          <div style={{ 
            fontSize: '11px', 
            color: trend > 0 ? 'var(--success)' : 'var(--danger)',
            marginTop: '4px' 
          }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
};
