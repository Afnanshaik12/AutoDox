import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AuthView from './components/AuthView';
import ProtectedDashboard from './components/ProtectedDashboard';
import { useAuth } from './context/AuthContext';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeView, setActiveView] = useState('main'); // 'main' | 'auth'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [recoveryToken, setRecoveryToken] = useState(null);

  const handleOpenAuth = (mode = 'login') => {
    setAuthMode(mode);
    setActiveView('auth');
  };

  useEffect(() => {
    const checkHashAndParams = () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';

      // Parse hash fragments (e.g. #access_token=...&type=recovery or #reset-password)
      const cleanHash = hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(cleanHash.includes('?') ? cleanHash.split('?')[1] : cleanHash);
      const searchParams = new URLSearchParams(search.replace(/^\?/, ''));

      const token = hashParams.get('access_token') || 
                    hashParams.get('token') || 
                    searchParams.get('token') || 
                    searchParams.get('code');
      const type = hashParams.get('type') || searchParams.get('type');

      if (cleanHash.startsWith('reset-password') || cleanHash.startsWith('forgot-password') || type === 'recovery' || (token && (cleanHash.includes('recovery') || search.includes('recovery')))) {
        if (token) {
          setRecoveryToken(token);
        }
        setAuthMode('reset');
        setActiveView('auth');
      }
    };

    checkHashAndParams();
    window.addEventListener('hashchange', checkHashAndParams);
    return () => window.removeEventListener('hashchange', checkHashAndParams);
  }, []);

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
          <ProtectedDashboard />
        ) : activeView === 'auth' ? (
          <AuthView 
            initialMode={authMode} 
            initialToken={recoveryToken}
            onSuccess={() => setActiveView('dashboard')} 
            onSwitchMode={(mode) => setAuthMode(mode)}
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
