import React from 'react';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import { formatDate, formatRelativeTime } from '../../utils/formatters';

export const UpcomingDeadlines = ({ deadlines }) => {
  // Mock deadlines if none provided
  const items = deadlines || [
    {
      id: 1,
      title: 'Bridge Construction Tender',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 days
      category: 'Infrastructure',
      urgent: true,
    },
    {
      id: 2,
      title: 'School Building Project',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5), // 5 days
      category: 'Civil Works',
      urgent: false,
    },
    {
      id: 3,
      title: 'Water Treatment Plant',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
      category: 'Environmental',
      urgent: false,
    },
  ];

  return (
    <div className="deadline-list">
      {items.map((item) => (
        <div key={item.id} className="deadline-card">
          <div className="deadline-header">
            <div className="deadline-title">{item.title}</div>
            {item.urgent && (
              <div className="deadline-urgent">
                <AlertTriangle size={14} />
                Urgent
              </div>
            )}
          </div>
          <div className="deadline-category">{item.category}</div>
          <div className="deadline-date">
            <Calendar size={14} />
            {formatDate(item.deadline)}
          </div>
          <div className="deadline-time">
            <Clock size={14} />
            {formatRelativeTime(item.deadline)}
          </div>
        </div>
      ))}
    </div>
  );
};
