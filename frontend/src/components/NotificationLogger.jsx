import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../utils/config';

export default function NotificationLogger({ token }) {
  const [logs, setLogs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchLogs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setLogs(data);
        }
      } catch (err) {
        console.error('Error fetching notifications logs:', err);
      }
    };

    fetchLogs();
    
    // Poll logs every 4 seconds to catch new dispatches in real-time
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, [token]);

  if (!token) return null;

  return (
    <div className={`notification-log-panel ${isOpen ? 'open' : ''}`}>
      <div className="notification-panel-header" onClick={() => setIsOpen(!isOpen)}>
        <h4>
          <span>🔔</span>
          System Notification Logger ({logs.length})
        </h4>
        <span style={{ fontSize: '12px' }}>{isOpen ? '▼ Collapse' : '▲ Expand Log Stream'}</span>
      </div>
      <div className="notification-panel-body">
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', fontSize: '13px' }}>
            No emails or SMS alerts triggered yet. Actions (like registering, bidding, or awarding) will log dispatches here.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="log-item">
              <div className="log-header">
                <span className={`log-channel ${log.channel}`}>
                  {log.channel}
                </span>
                <span style={{ fontSize: '10px' }}>
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="log-recipient">To: {log.recipient}</div>
              {log.subject && <div className="log-subject">{log.subject}</div>}
              <div className="log-body">{log.body}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
