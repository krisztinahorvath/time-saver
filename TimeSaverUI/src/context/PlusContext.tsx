import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from './AuthContext';
import type { PlusStatus } from '../types';

interface PlusContextType {
  plusStatus: PlusStatus | null;
  isVerified: boolean;
  loading: boolean;
  refresh: () => void;
}

const PlusContext = createContext<PlusContextType | null>(null);

export const PlusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [plusStatus, setPlusStatus] = useState<PlusStatus | null>(null);
  const [loading, setLoading]       = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated) { setPlusStatus(null); return; }
    setLoading(true);
    try {
      const res = await api.get<PlusStatus>('/plus/status');
      setPlusStatus(res.data);
    } catch {
      setPlusStatus(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  return (
    <PlusContext.Provider value={{
      plusStatus,
      isVerified: plusStatus?.isVerified ?? false,
      loading,
      refresh: fetchStatus,
    }}>
      {children}
    </PlusContext.Provider>
  );
};

export const usePlus = (): PlusContextType => {
  const ctx = useContext(PlusContext);
  if (!ctx) throw new Error('usePlus must be used inside <PlusProvider>');
  return ctx;
};
