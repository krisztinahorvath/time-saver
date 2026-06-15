import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import './NotificationBell.css';

const POLL_INTERVAL_MS = 30_000;

const NotificationBell: React.FC = () => {
  const [count, setCount]   = useState(0);
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = async () => {
    try {
      const res = await api.get<{ count: number }>('/Notifications/unread-count');
      setCount(res.data.count);
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <Link to="/notifications" className="nb-bell" aria-label="Notificari">
      🔔
      {count > 0 && (
        <span className="nb-badge">{count > 99 ? '99+' : count}</span>
      )}
    </Link>
  );
};

export default NotificationBell;
