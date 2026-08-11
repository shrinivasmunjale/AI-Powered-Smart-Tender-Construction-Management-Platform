import { format, formatDistance, formatRelative } from 'date-fns';

/**
 * Format currency values
 */
export const formatCurrency = (value, currency = 'USD') => {
  if (value === null || value === undefined) return '-';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format date to readable string
 */
export const formatDate = (date, formatString = 'MMM dd, yyyy') => {
  if (!date) return '-';
  return format(new Date(date), formatString);
};

/**
 * Format datetime to readable string
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date) => {
  if (!date) return '-';
  return formatDistance(new Date(date), new Date(), { addSuffix: true });
};

/**
 * Format relative date (e.g., "Today at 3:45 PM")
 */
export const formatRelativeDate = (date) => {
  if (!date) return '-';
  return formatRelative(new Date(date), new Date());
};

/**
 * Format percentage
 */
export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format number with commas
 */
export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Get status color
 */
export const getStatusColor = (status) => {
  const colors = {
    // Tender statuses
    draft: 'var(--text-muted)',
    published: 'var(--primary)',
    closed: 'var(--text-muted)',
    awarded: 'var(--success)',
    
    // Bid statuses
    submitted: 'var(--primary)',
    under_review: 'var(--warning)',
    accepted: 'var(--success)',
    rejected: 'var(--danger)',
    
    // Contractor statuses
    pending: 'var(--warning)',
    verified: 'var(--success)',
    
    // Project statuses
    planning: 'var(--primary)',
    foundation: 'var(--warning)',
    construction: 'var(--warning)',
    finishing: 'var(--info)',
    completed: 'var(--success)',
    on_hold: 'var(--danger)',
    
    // Payment statuses
    requested: 'var(--primary)',
    engineer_approved: 'var(--warning)',
    finance_approved: 'var(--success)',
    invoice_generated: 'var(--success)',
    
    // Inspection statuses
    pass: 'var(--success)',
    fail: 'var(--danger)',
    pending_review: 'var(--warning)',
  };
  
  return colors[status] || 'var(--text-muted)';
};

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};
