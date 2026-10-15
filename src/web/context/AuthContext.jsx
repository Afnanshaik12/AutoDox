import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../config/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'autodox_auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Validate session on load
  useEffect(() => {
    let isCancelled = false;
    async function verifyExistingToken() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      // If user is already set (e.g. from immediate login/register response), avoid redundant /me network roundtrip
      if (user) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(apiUrl('/api/auth/me'), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (isCancelled) return;

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token expired or invalid
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Session verification network error:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    verifyExistingToken();
    return () => { isCancelled = true; };
  }, [token]);

  // Register new user
  const register = async ({ name, email, password, confirmPassword }) => {
    setAuthError(null);
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, confirmPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorObj = {
          message: data.message || "We couldn't complete registration. If you already have an account, try signing in or resetting your password.",
          errors: data.errors || {},
          existingAccount: Boolean(data.existingAccount)
        };
        setAuthError(errorObj);
        return { success: false, ...errorObj };
      }

      if (data.requiresVerification || !data.token) {
        return {
          success: true,
          requiresVerification: true,
          message: data.message || 'Account created! Please check your email inbox to verify your account before signing in.',
          user: data.user
        };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const networkError = {
        message: 'Could not connect to server. Ensure the backend is running.',
        errors: {}
      };
      setAuthError(networkError);
      return { success: false, ...networkError };
    }
  };

  // Login existing user
  const login = async ({ email, password }) => {
    setAuthError(null);
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorObj = {
          message: data.message || 'Invalid email or password',
          errors: data.errors || {}
        };
        setAuthError(errorObj);
        return { success: false, ...errorObj };
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const networkError = {
        message: 'Could not connect to server. Ensure the backend is running.',
        errors: {}
      };
      setAuthError(networkError);
      return { success: false, ...networkError };
    }
  };

  // Logout
  const logout = async () => {
    try {
      if (token) {
        await fetch(apiUrl('/api/auth/logout'), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch (e) {
      // ignore logout network errors
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setAuthError(null);
    }
  };

  // Inspect protected session endpoint for verification
  const testProtectedEndpoint = async () => {
    if (!token) {
      return { status: 401, error: 'No token stored' };
    }

    const start = performance.now();
    const res = await fetch(apiUrl('/api/auth/me'), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const duration = Math.round(performance.now() - start);
    const data = await res.json();
    return {
      status: res.status,
      duration,
      data
    };
  };

  // Request password reset email
  const forgotPassword = async ({ email }) => {
    setAuthError(null);
    try {
      const redirectTo = `${window.location.origin}/#reset-password`;
      const res = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, redirectTo })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorObj = {
          message: data.message || 'Failed to send reset email',
          errors: data.errors || {}
        };
        setAuthError(errorObj);
        return { success: false, ...errorObj };
      }

      return { success: true, message: data.message };
    } catch (err) {
      const networkError = {
        message: 'Could not connect to server. Ensure the backend is running.',
        errors: {}
      };
      setAuthError(networkError);
      return { success: false, ...networkError };
    }
  };

  // Reset password with recovery token or code
  const resetPassword = async ({ password, token, email, code }) => {
    setAuthError(null);
    try {
      const res = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ password, token, email, code })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorObj = {
          message: data.message || 'Failed to reset password',
          errors: data.errors || {}
        };
        setAuthError(errorObj);
        return { success: false, ...errorObj };
      }

      return { success: true, message: data.message };
    } catch (err) {
      const networkError = {
        message: 'Could not connect to server. Ensure the backend is running.',
        errors: {}
      };
      setAuthError(networkError);
      return { success: false, ...networkError };
    }
  };

  // Verify recovery token
  const verifyRecoveryToken = async (tokenToVerify) => {
    try {
      const res = await fetch(apiUrl('/api/auth/verify-recovery'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: tokenToVerify })
      });
      const data = await res.json();
      return { success: res.ok, valid: Boolean(data.valid), ...data };
    } catch (err) {
      return { success: false, valid: false, message: 'Could not connect to server to verify token.' };
    }
  };

  // Login directly with a validated session (used for handoff and OAuth)
  const loginWithSession = ({ token: newToken, user: newUser }) => {
    // Clear any previous user data completely to prevent account switching leaks
    localStorage.removeItem(TOKEN_KEY);
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    }
    setToken(newToken);
    setUser(newUser);
    setAuthError(null);
  };

  // Establish session with an existing Bearer token and fetch fresh profile
  const loginWithToken = async (newToken) => {
    setAuthError(null);
    try {
      // Clear old session
      localStorage.removeItem(TOKEN_KEY);

      const res = await fetch(apiUrl('/api/auth/me'), {
        headers: {
          Authorization: `Bearer ${newToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        return { success: false, message: 'Invalid or expired session token.' };
      }
    } catch (err) {
      console.error('Session establishment network error:', err);
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      return { success: false, message: 'Could not connect to server to verify session.' };
    }
  };

  // Exchange extension handoff code for authenticated website session
  const exchangeHandoffCode = async (code, expectedUserId = null) => {
    setAuthError(null);
    try {
      const res = await fetch(apiUrl('/api/auth/handoff/exchange'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, expectedUserId })
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.message || 'Extension session handoff failed.';
        setAuthError({ message: errorMsg });
        return { success: false, message: errorMsg };
      }

      // Establish fresh session, wiping previous user session
      loginWithSession({ token: data.token, user: data.user });
      return { success: true, token: data.token, user: data.user, targetUrl: data.targetUrl };
    } catch (err) {
      const networkError = 'Could not connect to server to complete session handoff.';
      setAuthError({ message: networkError });
      return { success: false, message: networkError };
    }
  };

  // Initiate Supabase Google OAuth sign-in flow
  const signInWithGoogle = async (redirectTo = null) => {
    setAuthError(null);
    try {
      const appBaseUrl = window.location.origin;
      // Use clean origin URL to prevent RFC 6749 double-hash collision (#/vault#access_token=...)
      const targetRedirect = redirectTo || appBaseUrl;

      let oauthUrl = null;

      // 1. Attempt initiation via backend endpoint
      try {
        const res = await fetch(apiUrl(`/api/auth/oauth/google?redirectTo=${encodeURIComponent(targetRedirect)}&format=json`));
        if (res.ok) {
          const data = await res.json();
          if (data?.url) {
            oauthUrl = data.url;
          }
        }
      } catch (backendErr) {
        console.warn('Backend OAuth initiation notice, falling back to direct Supabase authorization:', backendErr);
      }

      // 2. Direct Supabase authorization fallback if backend endpoint is unavailable or redeploy is pending
      if (!oauthUrl) {
        const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL)
          ? import.meta.env.VITE_SUPABASE_URL
          : 'https://czsbddgvmoguuntzxuhq.supabase.co';
        oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(targetRedirect)}&prompt=select_account&access_type=offline`;
      }

      // Redirect browser to Supabase Google OAuth endpoint
      window.location.href = oauthUrl;
      return { success: true, url: oauthUrl };
    } catch (err) {
      const networkError = 'Could not connect to server to initiate Google sign-in.';
      setAuthError({ message: networkError });
      return { success: false, message: networkError };
    }
  };

  // Exchange PKCE OAuth authorization code
  const exchangeOAuthCode = async (code) => {
    setAuthError(null);
    try {
      const res = await fetch(apiUrl('/api/auth/oauth/exchange-code'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.message || 'Failed to complete OAuth sign-in.';
        setAuthError({ message: errorMsg });
        return { success: false, message: errorMsg };
      }

      loginWithSession({ token: data.token, user: data.user });
      return { success: true, token: data.token, user: data.user };
    } catch (err) {
      const networkError = 'Could not connect to server to exchange OAuth code.';
      setAuthError({ message: networkError });
      return { success: false, message: networkError };
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    authError,
    setAuthError,
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    verifyRecoveryToken,
    testProtectedEndpoint,
    loginWithSession,
    loginWithToken,
    exchangeHandoffCode,
    signInWithGoogle,
    exchangeOAuthCode
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
