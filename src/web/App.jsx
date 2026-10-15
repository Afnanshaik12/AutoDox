import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AuthView from './components/AuthView';
import ProtectedDashboard from './components/ProtectedDashboard';
import { useAuth } from './context/AuthContext';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    token, 
    loginWithToken, 
    exchangeOAuthCode, 
    exchangeHandoffCode 
  } = useAuth();

  const [activeView, setActiveView] = useState('main'); // 'main' | 'auth'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [recoveryToken, setRecoveryToken] = useState(null);
  const [externalError, setExternalError] = useState(null);

  const handleOpenAuth = (mode = 'login') => {
    setAuthMode(mode);
    setExternalError(null);
    const targetHash = mode === 'register' ? 'register' : mode === 'forgot' ? 'forgot-password' : mode === 'reset' ? 'reset-password' : 'login';
    window.location.hash = targetHash;
    setActiveView('auth');
  };

  useEffect(() => {
    let isSubscribed = true;

    // Helper to robustly extract parameters from search, hash, or nested fragments
    const extractAuthParams = () => {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const params = new URLSearchParams();

      if (search) {
        new URLSearchParams(search.replace(/^\?/, '')).forEach((v, k) => params.set(k, v));
      }

      if (hash) {
        const rawHash = hash.replace(/^#/, '');
        // Split on '#' in case of multiple hash segments (e.g. #/vault#access_token=...)
        const segments = rawHash.split('#');
        for (const segment of segments) {
          if (segment.includes('=')) {
            const queryPart = segment.includes('?') ? segment.split('?')[1] : segment;
            new URLSearchParams(queryPart).forEach((v, k) => params.set(k, v));
          } else if (segment.includes('?')) {
            const queryPart = segment.split('?')[1];
            new URLSearchParams(queryPart).forEach((v, k) => params.set(k, v));
          }
        }
      }

      return params;
    };

    const checkHashAndParams = async () => {
      const hash = window.location.hash || '';
      const allParams = extractAuthParams();

      // 1. Check for OAuth errors (e.g. #error=... or ?error=...)
      const error = allParams.get('error');
      const errorDesc = allParams.get('error_description');
      if (error) {
        if (!isSubscribed) return;
        setExternalError(decodeURIComponent(errorDesc || error));
        window.history.replaceState(null, '', window.location.pathname + '#login');
        setAuthMode('login');
        setActiveView('auth');
        return;
      }

      // 2. Check for Extension-to-Website Handoff Authorization Code (Task 2)
      const handoffCode = allParams.get('handoff') || allParams.get('auth_handoff');
      if (handoffCode) {
        // Clean address bar immediately to prevent token/code leakage during async roundtrip
        window.history.replaceState(null, '', window.location.pathname + '#/vault');
        const result = await exchangeHandoffCode(handoffCode);
        if (!isSubscribed) return;

        if (result.success) {
          setActiveView('dashboard');
        } else {
          window.history.replaceState(null, '', window.location.pathname + '#login');
          setExternalError(result.message || 'Extension session handoff authorization code has expired or is invalid.');
          setAuthMode('login');
          setActiveView('auth');
        }
        return;
      }

      // 3. Check for Supabase Google OAuth access_token (Implicit Flow in Hash)
      const accessToken = allParams.get('access_token');
      const type = allParams.get('type');

      if (accessToken && type !== 'recovery') {
        // Clean access token from URL immediately for security before network validation
        window.history.replaceState(null, '', window.location.pathname + '#/vault');
        const result = await loginWithToken(accessToken);
        if (!isSubscribed) return;

        if (result.success) {
          setActiveView('dashboard');
        } else {
          window.history.replaceState(null, '', window.location.pathname + '#login');
          setExternalError(result.message || 'Could not verify session from Google OAuth.');
          setAuthMode('login');
          setActiveView('auth');
        }
        return;
      }

      // 4. Check for Supabase OAuth PKCE authorization code (?code=... or #code=...)
      const oauthCode = allParams.get('code');
      if (oauthCode && type !== 'recovery') {
        // Clean authorization code from URL immediately before network validation
        window.history.replaceState(null, '', window.location.pathname + '#/vault');
        const result = await exchangeOAuthCode(oauthCode);
        if (!isSubscribed) return;

        if (result.success) {
          setActiveView('dashboard');
        } else {
          window.history.replaceState(null, '', window.location.pathname + '#login');
          setExternalError(result.message || 'Failed to exchange Google OAuth authorization code.');
          setAuthMode('login');
          setActiveView('auth');
        }
        return;
      }

      // 5. Check for Password Recovery Token
      const tokenVal = allParams.get('token');
      const cleanHash = hash.replace(/^#/, '');
      if (cleanHash.startsWith('reset-password') || type === 'recovery' || ((tokenVal || accessToken) && (cleanHash.includes('recovery') || window.location.search.includes('recovery')))) {
        if (!isSubscribed) return;
        if (tokenVal || accessToken) {
          setRecoveryToken(tokenVal || accessToken);
          // Sanitize URL address bar immediately to prevent recovery token leakage
          window.history.replaceState(null, '', window.location.pathname + '#reset-password');
        }
        setAuthMode('reset');
        setActiveView('auth');
        return;
      }

      // 6. Navigation Routes based on hash (Preserves normal website login)
      const firstSegment = (cleanHash.split('#')[0] || '').split('?')[0].replace(/^\/+/, '');
      if (firstSegment === 'vault') {
        if (!isSubscribed) return;
        const storedToken = token || localStorage.getItem('autodox_auth_token');
        if (isAuthenticated || storedToken) {
          setActiveView('dashboard');
        } else {
          setAuthMode('login');
          setActiveView('auth');
        }
      } else if (firstSegment === 'login') {
        if (!isSubscribed) return;
        setAuthMode('login');
        setActiveView('auth');
      } else if (firstSegment === 'register') {
        if (!isSubscribed) return;
        setAuthMode('register');
        setActiveView('auth');
      } else if (firstSegment === 'forgot-password' || firstSegment === 'forgot') {
        if (!isSubscribed) return;
        setAuthMode('forgot');
        setActiveView('auth');
      }
    };

    checkHashAndParams();
    window.addEventListener('hashchange', checkHashAndParams);
    return () => {
      isSubscribed = false;
      window.removeEventListener('hashchange', checkHashAndParams);
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="web-app-loading-screen">
        <div className="loading-card">
          <ShieldCheck size={32} className="loading-shield-spin" />
          <p className="loading-text">Initializing AutoDox AI Portal...</p>
        </div>
      </div>
    );
  }

  const storedToken = token || (typeof window !== 'undefined' && localStorage.getItem('autodox_auth_token'));

  return (
    <div className="web-app-wrapper">
      <Navbar 
        onOpenAuth={handleOpenAuth} 
        activeView={isAuthenticated ? 'dashboard' : activeView}
        setActiveView={setActiveView}
      />

      <main className="web-content-area">
        {isAuthenticated ? (
          <ProtectedDashboard key={user?.id || token || 'dashboard'} />
        ) : activeView === 'dashboard' && storedToken ? (
          <div className="web-app-loading-screen">
            <div className="loading-card">
              <ShieldCheck size={32} className="loading-shield-spin" />
              <p className="loading-text">Loading your secure vault...</p>
            </div>
          </div>
        ) : activeView === 'auth' || activeView === 'dashboard' ? (
          <AuthView 
            initialMode={authMode} 
            initialToken={recoveryToken}
            initialGeneralError={externalError}
            onSuccess={() => setActiveView('dashboard')} 
            onSwitchMode={(mode) => {
              setAuthMode(mode);
              setExternalError(null);
            }}
          />
        ) : (
          <Hero onOpenAuth={handleOpenAuth} />
        )}
      </main>

      <footer className="web-footer">
        <div className="footer-container">
          <div className="footer-left">
            <span className="footer-brand">AutoDox AI</span>
            <span className="footer-copy">© 2026. Secure Document Intelligence & Form Companion.</span>
          </div>
          <div className="footer-right">
            <span className="footer-tag">Supabase Auth & PostgreSQL • Row Level Security (RLS) • Manifest V3</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
