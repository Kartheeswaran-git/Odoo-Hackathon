import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, getToken, setSession } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configurationError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function sync() {
      if (!getToken()) { if (mounted) { setAuthUser(null); setProfile(null); setPermissions([]); setLoading(false); } return; }
      try {
        const data = await api.me();
        if (mounted) { setAuthUser({ id: data.profile.id }); setProfile(data.profile); setPermissions(data.permissions ?? []); setLoading(false); }
      } catch { clearSession(); if (mounted) { setAuthUser(null); setProfile(null); setPermissions([]); setLoading(false); } }
    }
    void sync();
    return () => { mounted = false; };
  }, []);

  const value = useMemo(() => ({
    authUser,
    profile,
    permissions,
    loading,
    configurationError,
    login: async (email, password) => {
      const data = await api.login(email, password); setSession(data.session);
      const me = await api.me(); setAuthUser({ id: me.profile.id }); setProfile(me.profile); setPermissions(me.permissions ?? []);
    },
    signup: (name, email, password) => api.signup(name, email, password),
    logout: async () => { clearSession(); setAuthUser(null); setProfile(null); setPermissions([]); },
  }), [authUser, configurationError, loading, permissions, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
