import React, { useState, useEffect } from 'react';
import { ShieldCheck, HardDrive, Key, Trash2, Save, Check } from 'lucide-react';
import { storage } from '../utils/storage';
import './Options.css';

export default function Options() {
  const [settings, setSettings] = useState({
    localStorageOnly: true,
    requireConfirmation: true,
    preventUnsolicitedScans: true,
    autoHighlightInputs: true,
    privacyLevel: 'strict'
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await storage.get(['autodox_settings']);
      if (res.autodox_settings) {
        setSettings(res.autodox_settings);
      }
    }
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await storage.set({ autodox_settings: settings });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="options-container">
      <header className="options-header">
        <div className="options-brand">
          <div className="brand-logo">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1>AutoDox AI Settings</h1>
            <p>Configure local document intelligence, security policies, and autofill behavior.</p>
          </div>
        </div>
      </header>

      <main className="options-main">
        <form onSubmit={handleSave} className="options-form">
          <section className="options-section">
            <h2>Data Storage & Privacy</h2>
            <div className="form-group-checkbox">
              <input
                type="checkbox"
                id="localStorageOnly"
                checked={settings.localStorageOnly}
                onChange={(e) => setSettings({ ...settings, localStorageOnly: e.target.checked })}
              />
              <label htmlFor="localStorageOnly">
                <strong>Enforce Local-Only Storage</strong>
                <p>Prevent any cloud sync or external API transmission of parsed document contents.</p>
              </label>
            </div>

            <div className="form-group-checkbox">
              <input
                type="checkbox"
                id="preventUnsolicitedScans"
                checked={settings.preventUnsolicitedScans}
                onChange={(e) => setSettings({ ...settings, preventUnsolicitedScans: e.target.checked })}
              />
              <label htmlFor="preventUnsolicitedScans">
                <strong>Block Unsolicited Webpage Scanning</strong>
                <p>Keep content script passive and idle until explicitly activated from the popup menu.</p>
              </label>
            </div>
          </section>

          <section className="options-section">
            <h2>Autofill Assistant Policies</h2>
            <div className="form-group-checkbox">
              <input
                type="checkbox"
                id="requireConfirmation"
                checked={settings.requireConfirmation}
                onChange={(e) => setSettings({ ...settings, requireConfirmation: e.target.checked })}
              />
              <label htmlFor="requireConfirmation">
                <strong>Require Confirmation Before Autofill</strong>
                <p>Present a verification popup showing exact field mappings before writing into forms.</p>
              </label>
            </div>

            <div className="form-group-checkbox">
              <input
                type="checkbox"
                id="autoHighlightInputs"
                checked={settings.autoHighlightInputs}
                onChange={(e) => setSettings({ ...settings, autoHighlightInputs: e.target.checked })}
              />
              <label htmlFor="autoHighlightInputs">
                <strong>Highlight Detected Form Inputs</strong>
                <p>Display subtle blue indicators on webpage fields that match your Vault attributes.</p>
              </label>
            </div>
          </section>

          <div className="form-actions">
            <button type="submit" className="save-btn">
              {saved ? <Check size={16} /> : <Save size={16} />}
              <span>{saved ? 'Saved Successfully' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
