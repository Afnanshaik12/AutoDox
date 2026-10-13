import React from 'react';
import { ShieldCheck, LogOut, ExternalLink, User, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenAuth, activeView, setActiveView }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="web-navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <div className="brand-group" onClick={() => setActiveView(isAuthenticated ? 'dashboard' : 'welcome')} role="button" tabIndex={0}>
          <div className="brand-logo-icon">
            <ShieldCheck size={22} className="shield-icon" />
          </div>
          <div className="brand-text-block">
            <div className="brand-title-row">
              <span className="brand-name">AutoDox</span>
              <span className="brand-badge-ai">AI</span>
            </div>
            <span className="brand-tagline">Web Portal & Vault Sync</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="navbar-links">
          {isAuthenticated && (
            <button 
              className={`nav-link-btn ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveView('dashboard')}
            >
              Dashboard
            </button>
          )}

          <a 
            href="/popup.html" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="nav-link-btn external"
            title="Open Extension Popup in a new tab"
          >
            <span>Extension Popup</span>
            <ExternalLink size={13} />
          </a>

          <a 
            href="/demo-form.html" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="nav-link-btn external"
            title="Open Testbed KYC & Job Form"
          >
            <span>Demo Form</span>
            <ExternalLink size={13} />
          </a>
        </nav>

        {/* Auth Actions */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="user-profile-widget">
              <div className="user-avatar-badge">
                <User size={15} />
              </div>
              <div className="user-info-text">
                <span className="user-name">{user?.name}</span>
                <span className="user-status-online">● Authenticated</span>
              </div>
              <button 
                className="btn-logout" 
                onClick={logout} 
                title="Sign out of your account"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="auth-buttons-group">
              <button 
                className="btn-signin"
                onClick={() => onOpenAuth('login')}
              >
                Sign In
              </button>
              <button 
                className="btn-register-primary"
                onClick={() => onOpenAuth('register')}
              >
                <Sparkles size={14} />
                <span>Create Account</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
