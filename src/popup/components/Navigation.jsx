import React from 'react';
import { LayoutDashboard, FileUp, Database, Wand2, Lock } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab, docCount = 0, fieldCount = 0 }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload', icon: FileUp, badge: null },
    { id: 'vault', label: 'Vault', icon: Database, badge: fieldCount },
    { id: 'autofill', label: 'Autofill', icon: Wand2 },
    { id: 'privacy', label: 'Privacy', icon: Lock }
  ];

  return (
    <nav className="popup-navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`nav-tab-button ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <div className="nav-icon-container">
              <Icon size={16} />
              {tab.badge !== null && tab.badge > 0 && (
                <span className="nav-badge">{tab.badge}</span>
              )}
            </div>
            <span className="nav-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
