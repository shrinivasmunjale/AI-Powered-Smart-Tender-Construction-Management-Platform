import React from 'react';
import { FileText, Award, Users, DollarSign, Clock, Activity, HardHat, PackageCheck, ClipboardCheck } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';

const activityIcons = {
  tender: <FileText size={16} />,
  bid: <Award size={16} />,
  contractor: <Users size={16} />,
  payment: <DollarSign size={16} />,
  project: <HardHat size={16} />,
  inspection: <ClipboardCheck size={16} />,
  material: <PackageCheck size={16} />,
  general: <Activity size={16} />,
};

export const RecentActivity = ({ activities }) => {
  // Mock activities if none provided
  const items = activities || [
    {
      id: 1,
      type: 'tender',
      title: 'New tender published',
      description: 'Municipal Hospital Ventilation System',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    },
    {
      id: 2,
      type: 'bid',
      title: 'Bid submitted',
      description: 'BuildCorp Ltd placed a bid on Road Rehabilitation',
      timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    },
    {
      id: 3,
      type: 'contractor',
      title: 'Contractor verified',
      description: 'TechBuild Solutions has been verified',
      timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
    },
    {
      id: 4,
      type: 'payment',
      title: 'Payment approved',
      description: '$250,000 payment approved for Project Alpha',
      timestamp: new Date(Date.now() - 1000 * 60 * 240), // 4 hours ago
    },
  ];

  return (
    <div className="activity-feed">
      {items.map((activity) => (
        <div key={activity.id} className="activity-item">
          <div className="activity-icon">
            {activityIcons[activity.type] || <Activity size={16} />}
          </div>
          <div className="activity-content">
            <div className="activity-title">{activity.title}</div>
            <div className="activity-description">{activity.description}</div>
            <div className="activity-time">
              <Clock size={12} />
              {formatRelativeTime(activity.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
