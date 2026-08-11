import React from 'react';

export const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      color: 'var(--text-muted)'
    }}>
      {icon && (
        <div style={{ marginBottom: '16px', opacity: 0.5 }}>
          {icon}
        </div>
      )}
      {title && (
        <h4 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>
          {title}
        </h4>
      )}
      {description && (
        <p style={{ margin: '0 0 16px', fontSize: '14px' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
};
