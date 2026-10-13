import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Key, 
  ShieldCheck, 
  Database, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  Layers, 
  Terminal, 
  Zap,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import VaultManager from './VaultManager';

export default function ProtectedDashboard() {
  const { user, token, logout, testProtectedEndpoint } = useAuth();
  const [activeTab, setActiveTab] = useState('vault'); // 'vault' | 'account'
  const [probeResult, setProbeResult] = useState(null);
  const [isProbing, setIsProbing] = useState(false);
  const [dbHealth, setDbHealth] = useState(null);

  // Fetch backend health & database status
  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setDbHealth(data);
        }
      } catch (e) {
        // backend might not be running
      }
    }
    fetchHealth();
  }, []);

  const handleRunProbe = async () => {
    setIsProbing(true);
    setProbeResult(null);
    try {
      const result = await testProtectedEndpoint();
      setProbeResult(result);
    } catch (e) {
      setProbeResult({ status: 'error', error: e.message });
    } finally {
      setIsProbing(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <div className="dashboard-banner">
        <div className="banner-badge-row">
          <span className="live-status-pill">
            <span className="pulse-dot" /> Authenticated Session
          </span>
          <span className="db-badge">
            <Database size={13} />
            {dbHealth?.database?.isConfigured 
              ? 'Supabase PostgreSQL' 
              : 'Local Dev Mode (Ready for Supabase)'}
          </span>
        </div>
        <h1 className="banner-heading">
          Welcome back, <span className="highlight-name">{user?.name}</span>
        </h1>
        <p className="banner-subtext">
          Your AutoDox AI account is securely authenticated. Personal attributes and profiles you create will synchronize seamlessly with the Chrome extension.
        </p>
      </div>

      {/* Dashboard Sub-navigation Tabs */}
      <div className="dashboard-subnav">
        <button 
          className={`subnav-tab-btn ${activeTab === 'vault' ? 'active' : ''}`}
          onClick={() => setActiveTab('vault')}
        >
          <Layers size={16} />
          <span>Personal Information Vault</span>
        </button>
        <button 
          className={`subnav-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <User size={16} />
          <span>Account & API Diagnostics</span>
        </button>
      </div>

      {activeTab === 'vault' ? (
        <VaultManager />
      ) : (
        /* Grid of account details & probe */
        <div className="dashboard-grid">
          {/* Account Details Card */}
          <div className="dash-card">
            <div className="card-header-row">
              <div className="card-icon-wrap blue">
              <User size={18} />
            </div>
            <div>
              <h3 className="card-title">Account Profile</h3>
              <p className="card-desc">Identity & security configuration</p>
            </div>
          </div>

          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Full Name</span>
              <span className="info-value-bold">{user?.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email Address</span>
              <span className="info-value">{user?.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Account ID</span>
              <span className="info-value-mono">{user?.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Registered At</span>
              <span className="info-value">
                {user?.createdAt ? new Date(user.createdAt).toLocaleString() : 'Just now'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Password Storage</span>
              <span className="info-value-security">
                <ShieldCheck size={14} className="green-shield" />
                Supabase Auth Managed Encryption
              </span>
            </div>
          </div>
        </div>

        {/* Protected Route Verification Card */}
        <div className="dash-card">
          <div className="card-header-row">
            <div className="card-icon-wrap indigo">
              <Terminal size={18} />
            </div>
            <div>
              <h3 className="card-title">Protected API Probe</h3>
              <p className="card-desc">Verify JWT route authentication</p>
            </div>
          </div>

          <p className="probe-explainer">
            Click below to execute an authenticated <code>GET /api/auth/me</code> request transmitting your JWT Bearer token to test backend route guards.
          </p>

          <button 
            className="btn-probe-action"
            onClick={handleRunProbe}
            disabled={isProbing}
          >
            {isProbing ? (
              <>
                <RefreshCw size={15} className="spin" />
                <span>Validating with backend...</span>
              </>
            ) : (
              <>
                <Zap size={15} />
                <span>Probe /api/auth/me</span>
              </>
            )}
          </button>

          {probeResult && (
            <div className="probe-result-box">
              <div className="probe-result-header">
                <span className="result-status-tag">
                  HTTP {probeResult.status} OK
                </span>
                <span className="result-latency">
                  Latency: {probeResult.duration}ms
                </span>
              </div>
              <pre className="probe-code-block">
                {JSON.stringify(probeResult.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Extension Shared Vault Notice */}
      <div className="sync-preview-card">
        <div className="sync-preview-left">
          <div className="sync-icon-circle">
            <Layers size={22} className="sync-icon" />
          </div>
          <div className="sync-text-block">
            <h4 className="sync-title">Chrome Extension Ready for Linking</h4>
            <p className="sync-desc">
              Your account is registered in the shared backend. In the upcoming phase, you can switch between profiles (Personal, Work, Job Applications) and autofill forms directly inside Chrome!
            </p>
          </div>
        </div>
        <div className="sync-preview-actions">
          <a href="/popup.html" target="_blank" rel="noopener noreferrer" className="btn-preview-ext">
            <span>Preview Extension</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
