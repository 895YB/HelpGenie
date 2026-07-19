import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import api, {
  setAccessToken,
  onTokenRefreshed,
  onSessionExpired,
} from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const didMount = useRef(false);

  // Register token-refresh side-effect so api.js can update our state
  useEffect(() => {
    onTokenRefreshed((token) => {
      setAccessToken(token);
    });

    onSessionExpired(() => {
      setUser(null);
      setAccessToken(null);
      queryClient.clear();
    });
  }, []);

  // Silent session restore on mount — hits /auth/refresh with the httpOnly cookie
  useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;

    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        const token = data.data?.accessToken;
        if (token) {
          setAccessToken(token);
          const me = await api.get('/auth/me');
          setUser(me.data.data);
        }
      } catch {
        // No valid session — user is logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { accessToken, user: userData } = data.data;
    setAccessToken(accessToken);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async ({ name, email, password, companyName }) => {
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password,
      companyName,
    });
    const { accessToken, user: userData } = data.data;
    setAccessToken(accessToken);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Always clear local state even if server call fails
    } finally {
      setAccessToken(null);
      setUser(null);
      queryClient.clear();
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.data);
    return data.data;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
