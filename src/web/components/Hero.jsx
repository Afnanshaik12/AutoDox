import React from 'react';
import { ShieldCheck, Sparkles, Layers, Zap, Lock, ArrowRight, CheckCircle2, Database } from 'lucide-react';

export default function Hero({ onOpenAuth }) {
  return (
    <div className="hero-section">
      <div className="hero-content">
        <div className="hero-pill-badge">
          <Sparkles size={14} className="sparkle-icon" />
          <span>AutoDox AI Web Platform & Extension Sync</span>
        </div>

        <h1 className="hero-headline">
          Intelligent Document Intelligence & <span className="text-gradient">Real-Time Form Autofill</span>
        </h1>

        <p className="hero-subheadline">
          Securely manage your personal information, document attributes, and profiles in one central portal. Share your credentials and vault seamlessly with the AutoDox AI Chrome Extension.
        </p>

        <div className="hero-cta-group">
          <button className="hero-primary-btn" onClick={() => onOpenAuth('register')}>
            <span>Create Account</span>
            <ArrowRight size={16} />
          </button>
          <button className="hero-secondary-btn" onClick={() => onOpenAuth('login')}>
            <span>Sign In to Portal</span>
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon-box">
              <Lock size={18} />
            </div>
            <h4 className="feature-title">Supabase Auth & RLS</h4>
            <p className="feature-desc">
              Native authentication with session management, Zod request validation, and PostgreSQL Row Level Security.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">
              <Database size={18} />
            </div>
            <h4 className="feature-title">Supabase PostgreSQL</h4>
            <p className="feature-desc">
              Enterprise PostgreSQL backend with unified user accounts shared across web and extension.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">
              <Layers size={18} />
            </div>
            <h4 className="feature-title">Multi-Profile Vault</h4>
            <p className="feature-desc">
              Switch between Personal, Job Application, and KYC profiles with targeted autofill mappings.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-box">
              <Zap size={18} />
            </div>
            <h4 className="feature-title">Chrome Extension Companion</h4>
            <p className="feature-desc">
              Autofills complex single-page apps (React/Vue/Angular) with zero telemetry and client-side heuristics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
