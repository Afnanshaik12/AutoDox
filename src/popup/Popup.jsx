import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Zap, 
  ExternalLink, 
  FolderOpen, 
  RefreshCw, 
  Copy, 
  Check, 
  LogIn, 
  LogOut, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Mail, 
  Lock,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { 
  getConnectedAccount, 
  loginAccount, 
  disconnectAccount, 
  fetchUserProfiles, 
  fetchProfileAttributes, 
  getActiveProfileId, 
  setActiveProfileId 
} from '../utils/api';
import './Popup.css';

const WEBSITE_BASE_URL = 'http://localhost:5173';

export default function Popup() {
  const [loading, setLoading] = useState(true);
  const [connectedAccount, setConnectedAccount] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileIdState] = useState(null);
  const [profileAttributes, setProfileAttributes] = useState([]);
  const [copiedFieldId, setCopiedFieldId] = useState(null);

  // Autofill execution status & proposed matches for user approval
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillMessage, setAutofillMessage] = useState(null); // { type: 'success' | 'error' | 'info', text: '' }
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [proposedMatches, setProposedMatches] = useState(null);
  const [activeTabId, setActiveTabId] = useState(null);

  // Sign In Form state (when disconnected)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Helper to load profiles and attributes for an authenticated token
  const loadUserData = async (token, preferredProfileId = null) => {
    try {
      const userProfiles = await fetchUserProfiles(token);
      setProfiles(userProfiles || []);

      let targetId = preferredProfileId;
      if (!targetId || !userProfiles.some((p) => p.id === targetId)) {
        const defaultProfile = userProfiles.find((p) => p.is_default) || userProfiles[0];
        targetId = defaultProfile ? defaultProfile.id : null;
      }

      if (targetId) {
        setActiveProfileIdState(targetId);
        await setActiveProfileId(targetId);
        const attrs = await fetchProfileAttributes(token, targetId);
        setProfileAttributes(attrs || []);
      } else {
        setActiveProfileIdState(null);
        setProfileAttributes([]);
      }
    } catch (err) {
      console.error('[AutoDox Popup] Error loading vault data:', err);
    }
  };

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const account = await getConnectedAccount();
        if (account && account.token) {
          setConnectedAccount(account);
          const savedActiveId = await getActiveProfileId();
          await loadUserData(account.token, savedActiveId);
        } else {
          setConnectedAccount(null);
          setProfiles([]);
          setProfileAttributes([]);
        }
      } catch (err) {
        console.error('[AutoDox Popup] Init error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Handle switching active profile
  const handleSelectProfile = async (profileId) => {
    setActiveProfileIdState(profileId);
    setProposedMatches(null);
    await setActiveProfileId(profileId);
    if (connectedAccount && connectedAccount.token) {
      setLoading(true);
      const attrs = await fetchProfileAttributes(connectedAccount.token, profileId);
      setProfileAttributes(attrs || []);
      setLoading(false);
    }
  };

  // Refresh user vault data
  const handleRefresh = async () => {
    if (!connectedAccount?.token) return;
    setIsRefreshing(true);
    setAutofillMessage(null);
    setProposedMatches(null);
    try {
      await loadUserData(connectedAccount.token, activeProfileId);
      setAutofillMessage({ type: 'success', text: 'Vault information refreshed from Supabase.' });
      setTimeout(() => setAutofillMessage(null), 3000);
    } catch (e) {
      setAutofillMessage({ type: 'error', text: 'Failed to refresh vault.' });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Copy attribute value to clipboard
  const handleCopyValue = async (fieldId, value) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedFieldId(fieldId);
      setTimeout(() => setCopiedFieldId(null), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Toggle selection for a proposed field match
  const toggleMatchEnabled = (index) => {
    setProposedMatches((prev) => {
      if (!prev) return prev;
      const updated = [...prev];
      updated[index] = { ...updated[index], enabled: !updated[index].enabled };
      return updated;
    });
  };

  // Select a specific candidate attribute when a match is ambiguous
  const handleCandidateSelect = (index, chosenId) => {
    setProposedMatches((prev) => {
      if (!prev) return prev;
      const updated = [...prev];
      const match = updated[index];
      const selected = (match.candidateAttributes || []).find((c) => String(c.id) === String(chosenId));
      if (selected) {
        updated[index] = {
          ...match,
          selectedCandidateId: selected.id,
          vaultLabel: selected.label,
          vaultValue: selected.value,
          valueToFill: selected.value
        };
      }
      return updated;
    });
  };

  // Trigger inspect and match on active tab (supports Google Forms & web forms)
  const handleAutofill = () => {
    if (!profileAttributes || profileAttributes.length === 0) {
      setAutofillMessage({ 
        type: 'error', 
        text: 'No saved vault attributes to fill. Please add attributes in Manage My Vault.' 
      });
      return;
    }

    setIsAutofilling(true);
    setAutofillMessage(null);
    setProposedMatches(null);

    // Format attributes for content script matcher using actual Field Label
    const activeProfile = profiles.find((p) => p.id === activeProfileId);
    const profileName = activeProfile ? activeProfile.name : 'Personal Vault';
    const vaultAttrs = profileAttributes.map((attr) => ({
      id: attr.id,
      label: attr.label,
      key: attr.key || attr.label.toLowerCase().replace(/\s+/g, '_'),
      value: attr.value,
      category: attr.category || 'Personal',
      docName: profileName
    }));

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          setIsAutofilling(false);
          setAutofillMessage({ type: 'error', text: 'No active browser tab found.' });
          return;
        }

        const tabId = tabs[0].id;
        setActiveTabId(tabId);

        // Send inspection and matching request
        chrome.tabs.sendMessage(
          tabId,
          {
            type: 'AUTODOX_INSPECT_AND_MATCH',
            vaultAttributes: vaultAttrs,
            highlightImmediately: true
          },
          (inspectResponse) => {
            setIsAutofilling(false);
            if (chrome.runtime.lastError || !inspectResponse) {
              setAutofillMessage({ 
                type: 'error', 
                text: 'Cannot connect to this webpage. Try reloading the web page tab.' 
              });
              return;
            }

            if (inspectResponse.matchedMappings && inspectResponse.matchedMappings.length > 0) {
              // Present proposed matches to user for approval and candidate selection
              setProposedMatches(inspectResponse.matchedMappings);
              setAutofillMessage({
                type: 'info',
                text: `Found ${inspectResponse.matchedMappings.length} field match(es). Review and approve below.`
              });
            } else {
              setProposedMatches(null);
              setAutofillMessage({
                type: 'info',
                text: `Scanned ${inspectResponse.totalFields || 0} fields: no matching fields for ${profileName}. AutoDox does not guess missing data.`
              });
            }
          }
        );
      });
    } else {
      setIsAutofilling(false);
      setAutofillMessage({ type: 'info', text: 'Autofill active (mock environment).' });
    }
  };

  // Execute autofill strictly with user-approved mappings
  const handleApproveAndFill = () => {
    if (!proposedMatches || proposedMatches.length === 0) return;
    const approved = proposedMatches.filter((m) => m.enabled);
    if (approved.length === 0) {
      setAutofillMessage({ type: 'error', text: 'No fields selected. Please select at least one field to fill.' });
      return;
    }

    setIsAutofilling(true);
    setAutofillMessage(null);

    const targetTabId = activeTabId;
    if (typeof chrome !== 'undefined' && chrome.tabs && targetTabId) {
      chrome.tabs.sendMessage(
        targetTabId,
        {
          type: 'AUTODOX_EXECUTE_AUTOFILL',
          mappings: approved
        },
        (fillResponse) => {
          setIsAutofilling(false);
          if (fillResponse?.status === 'SUCCESS') {
            setAutofillMessage({
              type: 'success',
              text: `Filled ${fillResponse.filledCount || approved.length} field(s) safely with user approval! Form was NOT submitted automatically.`
            });
            setProposedMatches(null);
          } else {
            setAutofillMessage({
              type: 'error',
              text: fillResponse?.message || 'Autofill encountered an error.'
            });
          }
        }
      );
    } else {
      setIsAutofilling(false);
      setAutofillMessage({ type: 'info', text: 'Autofill approved (mock environment).' });
      setProposedMatches(null);
    }
  };

  // Cancel approval and clear highlights
  const handleCancelApproval = () => {
    setProposedMatches(null);
    if (typeof chrome !== 'undefined' && chrome.tabs && activeTabId) {
      chrome.tabs.sendMessage(activeTabId, {
        type: 'AUTODOX_HIGHLIGHT_FIELDS',
        enable: false
      });
    }
  };

  // Sign in to Supabase account in extension
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Please enter your email and password');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    const result = await loginAccount({ email: loginEmail.trim(), password: loginPassword });
    setIsLoggingIn(false);

    if (result.success) {
      setConnectedAccount(result.account);
      setLoginPassword('');
      await loadUserData(result.account.token);
    } else {
      setLoginError(result.message);
    }
  };

  // Disconnect / Sign Out and clear stale data
  const handleDisconnect = async () => {
    await disconnectAccount();
    setConnectedAccount(null);
    setProfiles([]);
    setActiveProfileIdState(null);
    setProfileAttributes([]);
    setAutofillMessage(null);
    setProposedMatches(null);
  };

  // Open external website URLs
  const openUrl = (path = '') => {
    const targetUrl = `${WEBSITE_BASE_URL}${path}`;
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  return (
    <div className="popup-app-wrapper">
      {/* 1. AutoDox AI Branding Header */}
      <header className="popup-header-minimal">
        <div className="brand-group">
          <div className="brand-icon-wrapper">
            <ShieldCheck size={20} color="#ffffff" />
            <span className="brand-sparkle-dot" />
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <span className="brand-title">AutoDox AI</span>
              <span className="brand-badge">PRO</span>
            </div>
            <span className="brand-subtitle">Vault & Autofill Companion</span>
          </div>
        </div>

        {connectedAccount && (
          <button 
            type="button" 
            className="btn-header-refresh"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh Information"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
          </button>
        )}
      </header>

      {/* 2. Current Account Status Bar */}
      <div className="account-status-bar">
        <div className="account-status-info">
          <span className={`status-pill ${connectedAccount ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            {connectedAccount ? 'Connected' : 'Not Connected'}
          </span>
          <span className="account-email-label" title={connectedAccount?.user?.email || ''}>
            {connectedAccount?.user?.email || 'Sign in to access your vault'}
          </span>
        </div>

        {connectedAccount ? (
          <button 
            type="button" 
            className="btn-status-disconnect"
            onClick={handleDisconnect}
            title="Sign out of AutoDox AI"
          >
            <LogOut size={12} />
            <span>Sign Out</span>
          </button>
        ) : null}
      </div>

      {/* Status Feedback Banner */}
      {autofillMessage && (
        <div className={`autofill-alert-banner ${autofillMessage.type}`}>
          {autofillMessage.type === 'success' && <CheckCircle2 size={14} />}
          {autofillMessage.type === 'error' && <AlertCircle size={14} />}
          {autofillMessage.type === 'info' && <Sparkles size={14} />}
          <span>{autofillMessage.text}</span>
        </div>
      )}

      {/* Main Body */}
      <main className="popup-main-content">
        {loading ? (
          <div className="popup-loading-state">
            <RefreshCw size={24} className="spin-icon text-cyan" />
            <span>Loading your vault...</span>
          </div>
        ) : connectedAccount ? (
          /* CONNECTED VIEW: Vault Information & Autofill */
          <div className="vault-content-section">
            {proposedMatches ? (
              /* PROPOSED MATCHES APPROVAL CARD */
              <div className="proposed-approval-card">
                <div className="proposed-approval-header">
                  <div className="proposed-title-group">
                    <span className="section-label">Review Proposed Matches</span>
                    <span className="attribute-count-badge">
                      {proposedMatches.filter((m) => m.enabled).length} of {proposedMatches.length} selected
                    </span>
                  </div>
                  <p className="proposed-instruction-text">
                    Review detected questions below. Select which fields to fill. Form will not be submitted automatically.
                  </p>
                </div>

                <div className="proposed-matches-list">
                  {proposedMatches.map((item, index) => (
                    <div 
                      key={item.autodoxId || index} 
                      className={`proposed-match-row ${item.enabled ? 'active' : 'inactive'}`}
                    >
                      <div className="proposed-match-main">
                        <label className="proposed-field-check">
                          <input
                            type="checkbox"
                            checked={!!item.enabled}
                            onChange={() => toggleMatchEnabled(index)}
                            className="proposed-checkbox-input"
                          />
                          <span className="proposed-field-title" title={item.fieldLabel}>
                            {item.fieldLabel}
                          </span>
                        </label>
                        <span className={`confidence-pill ${item.isAmbiguous ? 'ambiguous' : 'matched'}`}>
                          {item.isAmbiguous ? 'Choice Needed' : `${item.confidence}% Match`}
                        </span>
                      </div>

                      {item.isAmbiguous ? (
                        <div className="ambiguous-choice-container">
                          <span className="ambiguous-prompt-label">Multiple attributes match. Please choose:</span>
                          <div className="ambiguous-select-wrap">
                            <select
                              className="ambiguous-select-dropdown"
                              value={item.selectedCandidateId || item.candidateAttributes[0]?.id || ''}
                              onChange={(e) => handleCandidateSelect(index, e.target.value)}
                              disabled={!item.enabled}
                            >
                              {item.candidateAttributes.map((cand) => (
                                <option key={cand.id} value={cand.id}>
                                  {cand.label}: {cand.value}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="dropdown-arrow-icon" />
                          </div>
                        </div>
                      ) : (
                        <div className="proposed-match-detail">
                          <span className="proposed-target-label">Matches: <strong>{item.vaultLabel}</strong></span>
                          <span className="proposed-preview-val" title={item.valueToFill}>"{item.valueToFill}"</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="proposed-action-buttons">
                  <button
                    type="button"
                    className="btn-approve-fill"
                    onClick={handleApproveAndFill}
                    disabled={isAutofilling || proposedMatches.filter((m) => m.enabled).length === 0}
                  >
                    <Zap size={14} />
                    <span>Approve & Fill ({proposedMatches.filter((m) => m.enabled).length}) Field{proposedMatches.filter((m) => m.enabled).length === 1 ? '' : 's'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-cancel-fill"
                    onClick={handleCancelApproval}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Autofill This Form Button */}
                <div className="autofill-action-card">
                  <button 
                    type="button" 
                    className="btn-autofill-primary"
                    onClick={handleAutofill}
                    disabled={isAutofilling || profileAttributes.length === 0}
                  >
                    {isAutofilling ? (
                      <>
                        <RefreshCw size={16} className="spin-icon" />
                        <span>Scanning Form Fields...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        <span>Autofill This Form</span>
                      </>
                    )}
                  </button>
                  <span className="autofill-hint-text">
                    Safe real-time fill with user approval for Google Forms & web portals.
                  </span>
                </div>

                {/* Folder / Profile Selector */}
                <div className="profile-selector-wrap">
                  <div className="profile-selector-header">
                    <span className="section-label">Active Vault Profile</span>
                    <span className="attribute-count-badge">
                      {profileAttributes.length} field{profileAttributes.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {profiles.length > 0 && (
                    <div className="profile-select-custom">
                      <select 
                        value={activeProfileId || ''} 
                        onChange={(e) => handleSelectProfile(e.target.value)}
                        className="select-profile-dropdown"
                      >
                        {profiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.is_default ? '(Default)' : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="dropdown-arrow-icon" />
                    </div>
                  )}
                </div>

                {/* Saved Vault Attributes List */}
                <div className="saved-attributes-container">
              <span className="section-sub-label">Saved Information</span>

              {profileAttributes.length === 0 ? (
                <div className="empty-attributes-box">
                  <FolderOpen size={24} className="empty-icon" />
                  <p className="empty-text">No fields saved in this profile.</p>
                  <button 
                    type="button" 
                    className="btn-empty-manage"
                    onClick={() => openUrl('/#vault')}
                  >
                    Add fields in Manage Vault
                  </button>
                </div>
              ) : (
                <div className="attributes-scroll-list">
                  {profileAttributes.map((attr) => {
                    const isCopied = copiedFieldId === attr.id;
                    return (
                      <div key={attr.id} className="vault-attribute-card">
                        <div className="attribute-info">
                          <span className="attribute-label">{attr.label}</span>
                          <span className="attribute-value" title={attr.value}>
                            {attr.value}
                          </span>
                        </div>
                        <button 
                          type="button" 
                          className={`btn-copy-field ${isCopied ? 'copied' : ''}`}
                          onClick={() => handleCopyValue(attr.id, attr.value)}
                          title="Copy to clipboard"
                        >
                          {isCopied ? (
                            <>
                              <Check size={12} />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            </>
            )}
          </div>
        ) : (
          /* NOT CONNECTED: Quick Sign In */
          <div className="connect-account-card">
            <div className="connect-header">
              <div className="connect-icon-circle">
                <LogIn size={20} color="#2563eb" />
              </div>
              <h3 className="connect-title">Sign In to AutoDox AI</h3>
              <p className="connect-sub">
                Connect your account to access your personal vault and enable 1-click form autofill.
              </p>
            </div>

            {loginError && (
              <div className="modal-error-box">
                <AlertCircle size={14} />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="connect-form" noValidate>
              <div className="popup-form-group">
                <label className="popup-form-label">Email Address</label>
                <div className="popup-input-wrap">
                  <Mail size={14} className="popup-input-icon" />
                  <input 
                    type="email" 
                    className="popup-form-input"
                    placeholder="user@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="popup-form-group">
                <label className="popup-form-label">Password</label>
                <div className="popup-input-wrap">
                  <Lock size={14} className="popup-input-icon" />
                  <input 
                    type="password" 
                    className="popup-form-input"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-connect-submit"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw size={14} className="spin-icon" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={14} />
                    <span>Connect Account</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* 3. Bottom Website Navigation Buttons */}
      <footer className="popup-bottom-actions">
        <button 
          type="button" 
          className="btn-bottom-nav"
          onClick={() => openUrl('')}
          title="Open AutoDox AI Website"
        >
          <ExternalLink size={14} />
          <span>Open AutoDox Website</span>
        </button>

        <button 
          type="button" 
          className="btn-bottom-nav primary"
          onClick={() => openUrl('/#vault')}
          title="Manage My Vault"
        >
          <FolderOpen size={14} />
          <span>Manage My Vault</span>
        </button>
      </footer>
    </div>
  );
}
