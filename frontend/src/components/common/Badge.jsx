import React from 'react';
import clsx from 'clsx';

export const Badge = ({ children, variant, className }) => {
  return (
    <span className={clsx('badge', variant && `badge-${variant}`, className)}>
      {children}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const statusMap = {
    // Tender statuses
    draft: { label: 'Draft', variant: 'secondary' },
    published: { label: 'Published', variant: 'primary' },
    closed: { label: 'Closed', variant: 'secondary' },
    awarded: { label: 'Awarded', variant: 'success' },
    
    // Bid statuses
    submitted: { label: 'Submitted', variant: 'primary' },
    under_review: { label: 'Under Review', variant: 'warning' },
    accepted: { label: 'Accepted', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'danger' },
    
    // Contractor statuses
    pending: { label: 'Pending', variant: 'warning' },
    verified: { label: 'Verified', variant: 'success' },
    
    // Project statuses
    planning: { label: 'Planning', variant: 'primary' },
    foundation: { label: 'Foundation', variant: 'warning' },
    construction: { label: 'Construction', variant: 'warning' },
    finishing: { label: 'Finishing', variant: 'info' },
    inspection: { label: 'Inspection', variant: 'warning' },
    completed: { label: 'Completed', variant: 'success' },
    on_hold: { label: 'On Hold', variant: 'danger' },
    cancelled: { label: 'Cancelled', variant: 'secondary' },

    // Payment statuses
    requested: { label: 'Requested', variant: 'primary' },
    engineer_approved: { label: 'Engineer Approved', variant: 'warning' },
    finance_approved: { label: 'Finance Approved', variant: 'info' },
    released: { label: 'Released', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'danger' },

    // Inspection statuses
    passed: { label: 'Passed', variant: 'success' },
    failed: { label: 'Failed', variant: 'danger' },
    needs_review: { label: 'Needs Review', variant: 'warning' },

    // Payment types
    advance: { label: 'Advance', variant: 'info' },
    milestone: { label: 'Milestone', variant: 'primary' },
    final: { label: 'Final', variant: 'success' },
    penalty: { label: 'Penalty', variant: 'danger' },
  };

  const config = statusMap[status] || { label: status, variant: 'secondary' };
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};
