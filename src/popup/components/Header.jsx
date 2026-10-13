import React from 'react';
import { ShieldCheck, ExternalLink, LogIn, LogOut, UserCheck } from 'lucide-react';

export default function Header({ 
  onOpenOptions,
  connectedAccount = null,
  onOpenConnect = () => {},
  onDisconnect = () => {}
}) {
  const userName = connectedAccount?.user?.fullName || 
    (connectedAccount?.user?.email ? connectedAccount.user.email.split('@')[0] : 'User');

  return (
    <header className="popup-header">
      <div className="brand-group">
        <div className="brand-icon-wrapper">
          <ShieldCheck className="brand-shield-icon" size={20} />
          <span className="brand-sparkle-dot"></span>
        </div>
        <div className="brand-text">
          <div className="brand-title-row">
            <h1 className="brand-title">AutoDox AI</h1>
            <span className="brand-badge">FOUNDATION V1</span>
          </div>
          <p className="brand-subtitle">Document Processing & Autofill</p>
        </div>
      </div>

      <div className="header-actions">
        {connectedAccount ? (
          <div className="account-badge connected" title={`Connected to AutoDox AI (${connectedAccount.user?.email || 'Authenticated'})`}>
            <span className="status-dot green"></span>
            <span className="account-label">{userName}</span>
            <button 
              className="account-disconnect-btn" 
              onClick={onDisconnect}
              title="Disconnect account"
              aria-label="Disconnect account"
            >
              <LogOut size={12} />
            </button>
          </div>
        ) : (
          <button 
            className="connect-account-btn"
            onClick={onOpenConnect}
            title="Connect AutoDox AI Account"
          >
            <LogIn size={13} />
            <span>Connect</span>
          </button>
        )}

        {onOpenOptions && (
          <button 
            className="options-button" 
            onClick={onOpenOptions} 
            title="Open Extension Settings"
            aria-label="Settings"
          >
            <ExternalLink size={15} />
          </button>
        )}
      </div>
    </header>
  );
}

