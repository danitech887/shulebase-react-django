import { createContext, useState, useEffect, useCallback } from 'react';

import students from '../api/api';
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        // Set default header for students
        students.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        console.error('Error parsing stored user:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await students.post('auth/login/', {
        username,
        password,
      });

      const { access, refresh, user: userData } = response.data;

      // Store tokens
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(userData));

      // Set axios default header
      students.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (err) {
      console.error('AuthContext.login error:', err);
      const errorMessage = err?.response?.data?.error || err?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      // Return null to allow callers to handle failure without needing try/catch
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username, password, email, schoolId, role = 'teacher') => {
    setLoading(true);
    setError(null);
    try {
      const response = await students.post('auth/register/', {
        username,
        password,
        email,
        school_id: schoolId,
        role,
      });

      const { access, refresh, user: userData } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(userData));

      students.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Registration failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          await students.post('auth/logout/', { refresh: refreshToken });
        } catch (err) {
          console.error('Logout error:', err);
        }
      }
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      delete students.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
