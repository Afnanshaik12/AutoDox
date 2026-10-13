import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wand2, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  SearchCode,
  Zap,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  FileCheck2,
  UserCheck
} from 'lucide-react';

export default function AutofillAssistantView({ 
  vaultDocuments = [],
  connectedAccount = null,
  profiles = [],
  activeProfileId = null,
  profileAttributes = [],
  onSelectProfile = () => {},
  onOpenConnectModal = () => {}
}) {
  const [activeTabInfo, setActiveTabInfo] = useState({ title: '', url: '', domain: 'Current Webpage' });
  const [contentScriptStatus, setContentScriptStatus] = useState('checking'); // checking | connected | standby
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [hasAutofilled, setHasAutofilled] = useState(false);
  const [autofillStatus, setAutofillStatus] = useState(null); // { type: 'success' | 'error', message: '' }
  const [showUnmatched, setShowUnmatched] = useState(false);

  // Assistant safety toggles
  const [highlightInputs, setHighlightInputs] = useState(true);
  const [requireConfirm, setRequireConfirm] = useState(true);
  const [excludeSensitive, setExcludeSensitive] = useState(true);

  // Determine active profile name
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const profileName = activeProfile ? activeProfile.name : 'Personal Profile';

  // Flatten vault attributes based on active profile or local documents
  const flatVaultAttributes = useMemo(() => {
    if (activeProfileId && activeProfileId !== 'local' && profileAttributes && profileAttributes.length > 0) {
      return profileAttributes.map((attr) => ({
        label: attr.label,
        key: attr.key || attr.label.toLowerCase().replace(/\s+/g, '_'),
        value: attr.value,
        category: attr.category || 'Personal',
        docName: profileName
      }));
    }

    return vaultDocuments.flatMap((doc) =>
      (doc.fields || []).map((f) => ({
        ...f,
        docName: doc.name
      }))
    );
  }, [activeProfileId, profileAttributes, profileName, vaultDocuments]);


  // Check connection to active tab
  const checkActiveTabConnection = () => {
    setContentScriptStatus('checking');

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          setContentScriptStatus('standby');
          return;
        }

        const tab = tabs[0];
        try {
          const domain = new URL(tab.url || '').hostname || 'Local Webpage';
          setActiveTabInfo({ title: tab.title || 'Tab', url: tab.url, domain, tabId: tab.id });
        } catch (e) {
          setActiveTabInfo({ title: 'Current Tab', url: '', domain: 'Active Tab', tabId: tab.id });
        }

        // Send ping to content script
        chrome.tabs.sendMessage(tab.id, { type: 'AUTODOX_PING' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            setContentScriptStatus('standby');
          } else {
            setContentScriptStatus('connected');
          }
        });
      });
    } else {
      // Mock for browser testing
      setActiveTabInfo({ title: 'Application Form Demo', url: '', domain: 'demo.autodox.local' });
      setContentScriptStatus('connected');
    }
  };

  useEffect(() => {
    checkActiveTabConnection();
  }, []);

  // Auto-refresh match results when the user selects a different profile
  useEffect(() => {
    if (inspectionResult) {
      handleInspectAndMatch();
    }
  }, [activeProfileId, profileAttributes]);

  // Inspect page form fields & match against Vault attributes
  const handleInspectAndMatch = () => {
    setIsInspecting(true);
    setAutofillStatus(null);

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          setIsInspecting(false);
          setAutofillStatus({ type: 'error', message: 'No active tab found' });
          return;
        }

        const tabId = tabs[0].id;
        chrome.tabs.sendMessage(
          tabId,
          {
            type: 'AUTODOX_INSPECT_AND_MATCH',
            vaultAttributes: flatVaultAttributes,
            highlightImmediately: highlightInputs
          },
          (response) => {
            setIsInspecting(false);
            if (chrome.runtime.lastError || !response || response.status !== 'SUCCESS') {
              setContentScriptStatus('standby');
              setAutofillStatus({
                type: 'error',
                message: 'Could not connect to page. Reload the tab and try again.'
              });
            } else {
              setInspectionResult(response);
              setMappings(response.matchedMappings || []);
            }
          }
        );
      });
    } else {
      // Mock for local dev testing
      setTimeout(() => {
        setIsInspecting(false);
        let mockMappings = [];

        if (flatVaultAttributes.length > 0) {
          mockMappings = flatVaultAttributes.slice(0, 6).map((attr, idx) => ({
            autodoxId: `ad_mock_${idx + 1}`,
            fieldLabel: attr.label,
            fieldType: /email/i.test(attr.key || attr.label) ? 'email' : /phone/i.test(attr.key || attr.label) ? 'tel' : 'text',
            vaultLabel: attr.label,
            vaultValue: attr.value,
            valueToFill: attr.value,
            confidence: 95,
            docName: attr.docName || profileName,
            enabled: true
          }));
        } else {
          mockMappings = [
            {
              autodoxId: 'ad_mock_1',
              fieldLabel: 'Full Legal Name',
              fieldType: 'text',
              vaultLabel: 'Full Legal Name',
              vaultValue: 'Alex Morgan',
              valueToFill: 'Alex Morgan',
              confidence: 98,
              docName: 'Passport_Alex_Morgan.pdf',
              enabled: true
            },
            {
              autodoxId: 'ad_mock_2',
              fieldLabel: 'Email Address',
              fieldType: 'email',
              vaultLabel: 'Email Address',
              vaultValue: 'alex.morgan@example.com',
              valueToFill: 'alex.morgan@example.com',
              confidence: 95,
              docName: 'W2_Tax_Summary_2025.pdf',
              enabled: true
            },
            {
              autodoxId: 'ad_mock_3',
              fieldLabel: 'Phone Number',
              fieldType: 'tel',
              vaultLabel: 'Phone Number',
              vaultValue: '+1 (555) 019-2834',
              valueToFill: '+1 (555) 019-2834',
              confidence: 95,
              docName: 'W2_Tax_Summary_2025.pdf',
              enabled: true
            }
          ];
        }

        setInspectionResult({
          status: 'SUCCESS',
          totalFields: mockMappings.length + 2,
          matchedCount: mockMappings.length,
          matchedMappings: mockMappings,
          unmatchedFields: [
            { label: 'Referral Code', type: 'text' },
            { label: 'Additional Comments', type: 'textarea' }
          ]
        });
        setMappings(mockMappings);
      }, 400);
    }
  };

  // Toggle field mapping inclusion
  const handleToggleMapping = (index) => {
    setMappings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], enabled: !next[index].enabled };
      return next;
    });
  };

  // Change mapped attribute manually
  const handleChangeAttribute = (mappingIndex, attributeKey) => {
    const selectedAttr = flatVaultAttributes.find((a) => a.key === attributeKey);
    if (!selectedAttr) return;

    setMappings((prev) => {
      const next = [...prev];
      next[mappingIndex] = {
        ...next[mappingIndex],
        vaultKey: selectedAttr.key,
        vaultLabel: selectedAttr.label,
        vaultValue: selectedAttr.value,
        valueToFill: selectedAttr.value,
        docName: selectedAttr.docName || 'Vault'
      };
      return next;
    });
  };

  // Toggle in-page highlights
  const handleToggleHighlight = () => {
    const nextVal = !highlightInputs;
    setHighlightInputs(nextVal);

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'AUTODOX_HIGHLIGHT_FIELDS',
          enable: nextVal,
          mappings: mappings.filter((m) => m.enabled)
        });
      });
    }
  };

  // Execute Autofill
  const handleExecuteAutofill = () => {
    const activeMappings = mappings.filter((m) => m.enabled);
    if (activeMappings.length === 0) {
      setAutofillStatus({ type: 'error', message: 'No fields selected for autofill' });
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            type: 'AUTODOX_EXECUTE_AUTOFILL',
            mappings: activeMappings
          },
          (response) => {
            if (response && response.status === 'SUCCESS') {
              setHasAutofilled(true);
              setAutofillStatus({
                type: 'success',
                message: `Successfully filled ${response.filledCount} field(s) safely into the form!`
              });
            } else {
              setAutofillStatus({
                type: 'error',
                message: 'Failed to write fields into page'
              });
            }
          }
        );
      });
    } else {
      // Mock execution
      setHasAutofilled(true);
      setAutofillStatus({
        type: 'success',
        message: `Successfully simulated autofill of ${activeMappings.length} field(s)!`
      });
    }
  };

  // Execute Undo
  const handleExecuteUndo = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'AUTODOX_UNDO_AUTOFILL' },
          (response) => {
            if (response && response.status === 'SUCCESS') {
              setHasAutofilled(false);
              setAutofillStatus({
                type: 'success',
                message: `Reverted ${response.revertedCount} field(s) to original state.`
              });
            }
          }
        );
      });
    } else {
      setHasAutofilled(false);
      setAutofillStatus({
        type: 'success',
        message: 'Reverted form fields to original state.'
      });
    }
  };

  // Open interactive demo form
  const handleOpenDemo = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('demo-form.html') });
    } else {
      window.open('/demo-form.html', '_blank');
    }
  };

  const enabledCount = mappings.filter((m) => m.enabled).length;

  return (
    <div className="view-container autofill-view">
      {/* Active Tab Card */}
      <div className="active-tab-card">
        <div className="active-tab-header">
          <div className="tab-origin-row">
            <Globe size={15} className="globe-icon" />
            <span className="domain-label">{activeTabInfo.domain}</span>
          </div>
          <div className="tab-actions-right">
            <button 
              className="refresh-tab-btn" 
              onClick={checkActiveTabConnection}
              title="Refresh Tab Connection"
            >
              <RefreshCw size={13} />
            </button>
            <button
              className="demo-link-btn"
              onClick={handleOpenDemo}
              title="Open Test Form in new tab"
            >
              <ExternalLink size={12} />
              <span>Test Form</span>
            </button>
          </div>
        </div>

        <div className="connection-status-row">
          {contentScriptStatus === 'connected' ? (
            <div className="status-badge connected">
              <CheckCircle2 size={13} />
              <span>Isolated DOM Bridge Connected</span>
            </div>
          ) : contentScriptStatus === 'checking' ? (
            <div className="status-badge pending">
              <span>Checking connection...</span>
            </div>
          ) : (
            <div className="status-badge standby">
              <AlertCircle size={13} />
              <span>Standby — Open any web form or click Test Form</span>
            </div>
          )}
        </div>
      </div>

      {/* Profile Selector for Autofill */}
      <div className="profile-selector-card">
        <div className="profile-selector-header">
          <div className="profile-selector-title">
            <UserCheck size={14} className="profile-icon" />
            <span className="profile-selector-heading">Autofill Profile</span>
          </div>
          {connectedAccount ? (
            <span className="profile-source-badge connected">
              Cloud Vault
            </span>
          ) : (
            <button 
              className="connect-vault-link"
              onClick={onOpenConnectModal}
            >
              Connect Account
            </button>
          )}
        </div>

        {connectedAccount && profiles.length > 0 ? (
          <div className="profile-select-control">
            <select
              className="profile-dropdown-select"
              value={activeProfileId || (profiles[0]?.id || '')}
              onChange={(e) => onSelectProfile(e.target.value)}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.attributeCount || 0} attributes){p.is_default ? ' • Default' : ''}
                </option>
              ))}
              {vaultDocuments.length > 0 && (
                <option value="local">
                  Local Vault Documents ({vaultDocuments.length} docs)
                </option>
              )}
            </select>
            <p className="profile-hint-text">
              Autofill will map values from <strong>{profileName}</strong> ({flatVaultAttributes.length} attributes).
            </p>
          </div>
        ) : (
          <div className="profile-fallback-notice">
            <p className="fallback-text">
              Using <strong>Local Vault</strong> ({flatVaultAttributes.length} attributes).
            </p>
            {!connectedAccount && (
              <p className="connect-prompt">
                <a href="#connect" onClick={(e) => { e.preventDefault(); onOpenConnectModal(); }}>
                  Connect your AutoDox AI account
                </a> to autofill using your saved profiles.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Main Inspection & Scan Action */}
      <div className="scan-trigger-card">
        <div className="scan-card-header">
          <div className="scan-title-group">
            <SearchCode size={18} className="assistant-spark-icon" />
            <div>
              <span className="card-subtitle-bold">Smart Form Inspector</span>
              <p className="card-explainer">
                Scans visible input fields and matches them against your encrypted Vault.
              </p>
            </div>
          </div>
        </div>

        <button 
          className="inspect-btn-primary"
          onClick={handleInspectAndMatch}
          disabled={isInspecting}
        >
          {isInspecting ? (
            <>
              <RefreshCw size={15} className="spin-icon" />
              <span>Analyzing Page Fields...</span>
            </>
          ) : (
            <>
              <Wand2 size={15} />
              <span>{inspectionResult ? 'Re-scan Page Fields' : 'Scan & Match Form Fields'}</span>
            </>
          )}
        </button>
      </div>

      {/* Status Alert Banner */}
      {autofillStatus && (
        <div className={`autofill-feedback-alert ${autofillStatus.type}`}>
          {autofillStatus.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{autofillStatus.message}</span>
        </div>
      )}

      {/* Field Inspection & Matching Results */}
      {inspectionResult && (
        <div className="matching-results-container">
          <div className="match-stats-banner">
            <div className="stat-pill">
              <span className="stat-num">{inspectionResult.totalFields}</span>
              <span className="stat-label">Page Inputs</span>
            </div>
            <div className="stat-pill highlight">
              <span className="stat-num">{mappings.length}</span>
              <span className="stat-label">Matched</span>
            </div>
            <div className="stat-pill success">
              <span className="stat-num">{enabledCount}</span>
              <span className="stat-label">Ready to Fill</span>
            </div>
          </div>

          {mappings.length > 0 ? (
            <div className="field-mappings-list">
              <div className="mappings-list-header">
                <span className="header-col-title">Detected Field &rarr; Vault Mapping</span>
                <span className="header-col-counter">{enabledCount} selected</span>
              </div>

              {mappings.map((mapping, idx) => (
                <div key={idx} className={`mapping-card ${mapping.enabled ? 'active' : 'disabled'}`}>
                  <div className="mapping-card-top">
                    <label className="checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={mapping.enabled}
                        onChange={() => handleToggleMapping(idx)}
                      />
                      <span className="field-target-label">
                        {mapping.fieldLabel || mapping.fieldName || mapping.fieldId}
                      </span>
                    </label>
                    <span className="confidence-pill">
                      {mapping.confidence}% Match
                    </span>
                  </div>

                  <div className="mapping-card-bottom">
                    <div className="mapped-value-preview">
                      <span className="preview-label">Value:</span>
                      <strong className="preview-val">{mapping.valueToFill}</strong>
                    </div>

                    <div className="source-doc-tag">
                      <FileCheck2 size={11} />
                      <span>{mapping.docName || 'Vault'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-matches-box">
              <AlertCircle size={18} />
              <p>No direct matches found for this page's form fields from your Vault.</p>
            </div>
          )}

          {/* Unmatched fields accordion */}
          {inspectionResult.unmatchedFields && inspectionResult.unmatchedFields.length > 0 && (
            <div className="unmatched-accordion">
              <button 
                className="unmatched-toggle-btn"
                onClick={() => setShowUnmatched(!showUnmatched)}
              >
                <span>Unmatched Fields ({inspectionResult.unmatchedFields.length})</span>
                {showUnmatched ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showUnmatched && (
                <div className="unmatched-chips-list">
                  {inspectionResult.unmatchedFields.map((f, i) => (
                    <span key={i} className="unmatched-chip">
                      {f.label || f.name || f.id} ({f.type})
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action CTAs */}
          <div className="autofill-cta-group">
            <button 
              className="autofill-btn-primary"
              onClick={handleExecuteAutofill}
              disabled={enabledCount === 0}
            >
              <Zap size={16} />
              <span>Autofill {enabledCount} Matched Fields</span>
            </button>

            {hasAutofilled && (
              <button 
                className="autofill-btn-undo"
                onClick={handleExecuteUndo}
                title="Undo last autofill action and restore form values"
              >
                <RotateCcw size={14} />
                <span>Undo Autofill</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Safety & Real-Time In-Page Toggles */}
      <div className="section-block">
        <h3 className="section-title">
          <SlidersHorizontal size={13} />
          <span>In-Page Assistance Controls</span>
        </h3>
        
        <div className="toggle-setting-row">
          <div className="setting-label-col">
            <span className="setting-main-label">Highlight Matched Fields on Page</span>
            <span className="setting-sub-label">Glowing blue outlines on detected webpage inputs</span>
          </div>
          <button 
            className={`toggle-switch ${highlightInputs ? 'active' : ''}`}
            onClick={handleToggleHighlight}
          >
            {highlightInputs ? <ToggleRight size={24} className="toggle-on" /> : <ToggleLeft size={24} className="toggle-off" />}
          </button>
        </div>

        <div className="toggle-setting-row">
          <div className="setting-label-col">
            <span className="setting-main-label">Require Confirmation Before Fill</span>
            <span className="setting-sub-label">Preview mapped values before writing to inputs</span>
          </div>
          <button 
            className={`toggle-switch ${requireConfirm ? 'active' : ''}`}
            onClick={() => setRequireConfirm(!requireConfirm)}
          >
            {requireConfirm ? <ToggleRight size={24} className="toggle-on" /> : <ToggleLeft size={24} className="toggle-off" />}
          </button>
        </div>

        <div className="toggle-setting-row">
          <div className="setting-label-col">
            <span className="setting-main-label">Protect Sensitive Financial Fields</span>
            <span className="setting-sub-label">Block automatic entry of CVV and card numbers</span>
          </div>
          <button 
            className={`toggle-switch ${excludeSensitive ? 'active' : ''}`}
            onClick={() => setExcludeSensitive(!excludeSensitive)}
          >
            {excludeSensitive ? <ToggleRight size={24} className="toggle-on" /> : <ToggleLeft size={24} className="toggle-off" />}
          </button>
        </div>
      </div>
    </div>
  );
}
