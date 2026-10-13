import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Download, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  Info,
  ToggleLeft,
  ToggleRight,
  Database
} from 'lucide-react';

export default function PrivacySettingsView({ vaultDocuments = [], onResetVault }) {
  const [localStorageOnly, setLocalStorageOnly] = useState(true);
  const [preventUnsolicited, setPreventUnsolicited] = useState(true);
  const [clearOnExit, setClearOnExit] = useState(false);
  const [requirePin, setRequirePin] = useState(false);
  const [actionNotice, setActionNotice] = useState('');

  const handleExportVault = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vaultDocuments, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `autodox_vault_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setActionNotice('Vault backup exported successfully.');
    setTimeout(() => setActionNotice(''), 3000);
  };

  const handleConfirmReset = () => {
    if (window.confirm('Are you sure you want to clear all documents and attributes in your local vault? This action cannot be undone.')) {
      onResetVault();
      setActionNotice('Local vault has been reset.');
      setTimeout(() => setActionNotice(''), 3000);
    }
  };

  return (
    <div className="view-container privacy-view">
      {/* Privacy Pledge Card */}
      <div className="privacy-pledge-card">
        <div className="pledge-header">
          <ShieldCheck size={20} className="pledge-shield-icon" />
          <h3 className="pledge-title">Privacy Architecture</h3>
        </div>
        <p className="pledge-body">
          AutoDox AI operates strictly on-device. No telemetry, no external server relays, and no unprompted DOM access.
        </p>
      </div>

      {actionNotice && (
        <div className="alert-box info">
          <Info size={14} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Permission Transparency */}
      <div className="section-block">
        <h3 className="section-title">Manifest Permissions Transparency</h3>
        <div className="permission-card">
          <div className="permission-row">
            <span className="perm-code">storage</span>
            <span className="perm-desc">Stores vault documents and preferences locally in your browser.</span>
          </div>
          <div className="permission-row">
            <span className="perm-code">activeTab</span>
            <span className="perm-desc">Allows interaction with the current tab only when you click the extension.</span>
          </div>
        </div>
      </div>

      {/* Policy Toggles */}
      <div className="section-block">
        <h3 className="section-title">Security & Storage Toggles</h3>

        <div className="toggle-setting-row">
          <div className="setting-label-col">
            <span className="setting-main-label">Strict Local-Only Storage</span>
            <span className="setting-sub-label">Disables any remote synchronization</span>
          </div>
          <button 
            className="toggle-switch active"
            onClick={() => setLocalStorageOnly(!localStorageOnly)}
          >
            {localStorageOnly ? <ToggleRight size={24} className="toggle-on" /> : <ToggleLeft size={24} className="toggle-off" />}
          </button>
        </div>

        <div className="toggle-setting-row">
          <div className="setting-label-col">
            <span className="setting-main-label">Prevent Unsolicited Web Scans</span>
            <span className="setting-sub-label">Never analyze page unless user opens extension</span>
          </div>
          <button 
            className="toggle-switch active"
            onClick={() => setPreventUnsolicited(!preventUnsolicited)}
          >
            {preventUnsolicited ? <ToggleRight size={24} className="toggle-on" /> : <ToggleLeft size={24} className="toggle-off" />}
          </button>
        </div>

        <div className="toggle-setting-row">
          <div className="setting-label-col">
            <span className="setting-main-label">Clear Vault on Browser Exit</span>
            <span className="setting-sub-label">Ephemeral storage mode for shared computers</span>
          </div>
          <button 
            className={`toggle-switch ${clearOnExit ? 'active' : ''}`}
            onClick={() => setClearOnExit(!clearOnExit)}
          >
            {clearOnExit ? <ToggleRight size={24} className="toggle-on" /> : <ToggleLeft size={24} className="toggle-off" />}
          </button>
        </div>
      </div>

      {/* Data Management Actions */}
      <div className="section-block">
        <h3 className="section-title">Data Management</h3>
        <div className="data-actions-row">
          <button className="secondary-action-btn" onClick={handleExportVault}>
            <Download size={14} />
            <span>Export Vault JSON</span>
          </button>

          <button className="danger-action-btn" onClick={handleConfirmReset}>
            <Trash2 size={14} />
            <span>Reset Local Vault</span>
          </button>
        </div>
      </div>
    </div>
  );
}
