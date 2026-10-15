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
    setActiveView('auth');
  };

  useEffect(() => {
    let isSubscribed = true;

    const checkHashAndParams = async () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';

      // Parse hash fragments and search params
      const cleanHash = hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(cleanHash.includes('?') ? cleanHash.split('?')[1] : cleanHash);
      const searchParams = new URLSearchParams(search.replace(/^\?/, ''));

      // 1. Check for OAuth errors (e.g. #error=... or ?error=...)
      const error = hashParams.get('error') || searchParams.get('error');
      const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');
      if (error) {
        if (!isSubscribed) return;
        setExternalError(decodeURIComponent(errorDesc || error));
        window.history.replaceState(null, '', window.location.pathname + '#login');
        setAuthMode('login');
        setActiveView('auth');
        return;
      }

      // 2. Check for Extension-to-Website Handoff Authorization Code (Task 2)
      const handoffCode = hashParams.get('handoff') || searchParams.get('handoff') || hashParams.get('auth_handoff') || searchParams.get('auth_handoff');
      if (handoffCode) {
        const result = await exchangeHandoffCode(handoffCode);
        if (!isSubscribed) return;

        // Clean the browser address bar to maintain the canonical URL: https://auto-dox.vercel.app/#/vault
        window.history.replaceState(null, '', window.location.pathname + '#/vault');

        if (result.success) {
          setActiveView('dashboard');
        } else {
          setExternalError(result.message || 'Extension session handoff authorization code has expired or is invalid.');
          setAuthMode('login');
          setActiveView('auth');
        }
        return;
      }

      // 3. Check for Supabase Google OAuth access_token (Implicit Flow in Hash)
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type') || searchParams.get('type');

      if (accessToken && type !== 'recovery') {
        const result = await loginWithToken(accessToken);
        if (!isSubscribed) return;

        // Clean access token from URL fragment immediately for security
        window.history.replaceState(null, '', window.location.pathname + '#/vault');

        if (result.success) {
          setActiveView('dashboard');
        } else {
          setExternalError(result.message || 'Could not verify session from Google OAuth.');
          setAuthMode('login');
          setActiveView('auth');
        }
        return;
      }

      // 4. Check for Supabase OAuth PKCE authorization code (?code=... or #code=...)
      const oauthCode = searchParams.get('code') || hashParams.get('code');
      if (oauthCode && type !== 'recovery') {
        const result = await exchangeOAuthCode(oauthCode);
        if (!isSubscribed) return;

        // Clean authorization code from URL
        window.history.replaceState(null, '', window.location.pathname + '#/vault');

        if (result.success) {
          setActiveView('dashboard');
        } else {
          setExternalError(result.message || 'Failed to exchange Google OAuth authorization code.');
          setAuthMode('login');
          setActiveView('auth');
        }
        return;
      }

      // 5. Check for Password Recovery Token
      const tokenVal = hashParams.get('token') || searchParams.get('token');
      if (cleanHash.startsWith('reset-password') || cleanHash.startsWith('forgot-password') || type === 'recovery' || ((tokenVal || accessToken) && (cleanHash.includes('recovery') || search.includes('recovery')))) {
        if (!isSubscribed) return;
        if (tokenVal || accessToken) {
          setRecoveryToken(tokenVal || accessToken);
        }
        setAuthMode('reset');
        setActiveView('auth');
        return;
      }

      // 6. Navigation Routes based on hash (Preserves normal website login)
      const cleanPath = cleanHash.split('?')[0].replace(/^\/+/, '');
      if (cleanPath === 'vault') {
        if (!isSubscribed) return;
        if (!isAuthenticated) {
          setAuthMode('login');
          setActiveView('auth');
        } else {
          setActiveView('dashboard');
        }
      } else if (cleanPath === 'login') {
        if (!isSubscribed) return;
        setAuthMode('login');
        setActiveView('auth');
      } else if (cleanPath === 'register') {
        if (!isSubscribed) return;
        setAuthMode('register');
        setActiveView('auth');
      } else if (cleanPath === 'forgot-password' || cleanPath === 'forgot') {
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
        ) : activeView === 'auth' ? (
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
