import React from 'react';

export const Loading = ({ text = 'Loading...' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
      color: 'var(--text-muted)'
    }}>
      <div className="spinner" style={{ marginBottom: '16px' }} />
      <p>{text}</p>
    </div>
  );
};

export const Skeleton = ({ width = '100%', height = '20px', style }) => {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        background: 'linear-gradient(90deg, rgba(253,241,225,0.05) 25%, rgba(253,241,225,0.1) 50%, rgba(253,241,225,0.05) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '4px',
        ...style
      }}
    />
  );
};
