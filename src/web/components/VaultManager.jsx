import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Users, 
  GraduationCap, 
  Briefcase, 
  Sparkles, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Layers, 
  Tag, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  FolderPlus,
  Star,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../config/api';
import VaultLiveSearch from './VaultLiveSearch';

// Profile type visual mapping
const PROFILE_TYPE_META = {
  my_info: {
    label: 'My Information',
    icon: User,
    colorClass: 'type-blue',
    description: 'Personal identity, credentials, contact, and core data'
  },
  father_info: {
    label: "Father's Information",
    icon: Users,
    colorClass: 'type-purple',
    description: 'Parent identity, occupation, family credentials, and contact details'
  },
  academic: {
    label: 'Academic Information',
    icon: GraduationCap,
    colorClass: 'type-emerald',
    description: 'Degrees, GPA, institutions, graduation dates, and transcripts'
  },
  professional: {
    label: 'Professional Information',
    icon: Briefcase,
    colorClass: 'type-amber',
    description: 'Job titles, employers, work experience, and technical skills'
  },
  custom: {
    label: 'Custom Profile',
    icon: Sparkles,
    colorClass: 'type-cyan',
    description: 'Specialized profile for portfolios, licenses, or custom applications'
  }
};

const CATEGORIES = [
  'All',
  'Personal',
  'Family',
  'Academic',
  'Professional',
  'Contact',
  'Identity',
  'Financial',
  'Other'
];

// Quick suggestion presets based on active profile type
const QUICK_PRESETS = {
  my_info: [
    { label: 'Full Legal Name', category: 'Personal' },
    { label: 'Primary Email', category: 'Contact' },
    { label: 'Phone Number', category: 'Contact' },
    { label: 'Date of Birth', category: 'Identity' },
    { label: 'Home Address', category: 'Contact' },
    { label: 'Nationality', category: 'Identity' }
  ],
  father_info: [
    { label: "Father's Full Name", category: 'Family' },
    { label: "Father's Occupation", category: 'Family' },
    { label: "Father's Phone Number", category: 'Contact' },
    { label: "Father's Email", category: 'Contact' },
    { label: 'Employer / Business Name', category: 'Professional' }
  ],
  academic: [
    { label: 'University / College', category: 'Academic' },
    { label: 'Degree / Program', category: 'Academic' },
    { label: 'Major / Field of Study', category: 'Academic' },
    { label: 'Cumulative GPA', category: 'Academic' },
    { label: 'Graduation Year', category: 'Academic' },
    { label: 'Roll / Registration Number', category: 'Academic' }
  ],
  professional: [
    { label: 'Current Job Title', category: 'Professional' },
    { label: 'Current Employer', category: 'Professional' },
    { label: 'Total Years Experience', category: 'Professional' },
    { label: 'Core Technical Skills', category: 'Professional' },
    { label: 'LinkedIn Profile URL', category: 'Contact' },
    { label: 'GitHub Portfolio', category: 'Professional' }
  ],
  custom: [
    { label: 'Title / Subject', category: 'Other' },
    { label: 'Identifier Code', category: 'Identity' },
    { label: 'Key Details', category: 'Other' }
  ]
};

export default function VaultManager() {
  const { token, user } = useAuth();

  // Profiles State
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Attributes State
  const [attributes, setAttributes] = useState([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modals & UI State
  const [activeModal, setActiveModal] = useState(null); // 'create_profile' | 'edit_profile' | 'delete_profile' | 'create_attr' | 'edit_attr' | 'delete_attr'
  const [modalTarget, setModalTarget] = useState(null);
  const [modalForm, setModalForm] = useState({});
  const [modalError, setModalError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Value visibility & Copy state
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);
  const [highlightedAttrId, setHighlightedAttrId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSelectFolderFromSearch = (folderId) => {
    if (folderId) {
      setActiveProfileId(folderId);
    }
  };

  const handleSelectAttributeFromSearch = (folderId, attrId) => {
    if (folderId) {
      setActiveProfileId(folderId);
    }
    if (attrId) {
      setHighlightedAttrId(attrId);
      setTimeout(() => {
        setHighlightedAttrId(prev => (prev === attrId ? null : prev));
      }, 4500);

      setTimeout(() => {
        const el = document.getElementById(`attr-item-${attrId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    }
  };

  // Fetch all profiles for current user
  const fetchProfiles = async (selectId = null) => {
    if (!token) return;
    setLoadingProfiles(true);
    try {
      const res = await fetch(apiUrl('/api/vault/profiles'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const list = data.profiles || [];
        setProfiles(list);
        if (list.length > 0) {
          if (selectId && list.some(p => p.id === selectId)) {
            setActiveProfileId(selectId);
          } else if (!activeProfileId || !list.some(p => p.id === activeProfileId)) {
            const defaultP = list.find(p => p.is_default) || list[0];
            setActiveProfileId(defaultP.id);
          }
        } else {
          setActiveProfileId(null);
          setAttributes([]);
        }
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
      showToast('Error loading profiles from database', 'error');
    } finally {
      setLoadingProfiles(false);
    }
  };

  // Fetch attributes for active profile
  const fetchAttributes = async (profileId) => {
    if (!token || !profileId) return;
    setLoadingAttributes(true);
    try {
      const res = await fetch(apiUrl(`/api/vault/attributes?profileId=${profileId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setAttributes(data.attributes || []);
      }
    } catch (err) {
      console.error('Failed to load attributes:', err);
    } finally {
      setLoadingAttributes(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [token]);

  useEffect(() => {
    if (activeProfileId) {
      fetchAttributes(activeProfileId);
    }
  }, [activeProfileId, token]);

  const activeProfile = useMemo(() => {
    return profiles.find(p => p.id === activeProfileId) || null;
  }, [profiles, activeProfileId]);

  // Filtered attributes
  const filteredAttributes = useMemo(() => {
    return attributes.filter(attr => {
      const matchesCategory = selectedCategory === 'All' || attr.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        attr.label.toLowerCase().includes(q) || 
        attr.key.toLowerCase().includes(q) || 
        attr.value.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [attributes, selectedCategory, searchQuery]);

  // Seed default starter profiles
  const handleSeedProfiles = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/vault/profiles/seed'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Standard profile set initialized successfully!');
        await fetchProfiles();
      } else {
        showToast(data.message || 'Could not initialize profiles', 'error');
      }
    } catch (e) {
      showToast('Network error initializing profiles', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Profile Modal Handlers
  const openCreateProfileModal = () => {
    setModalForm({
      name: '',
      type: 'custom',
      description: '',
      is_default: false
    });
    setModalError(null);
    setActiveModal('create_profile');
  };

  const openEditProfileModal = (profile) => {
    setModalTarget(profile);
    setModalForm({
      name: profile.name,
      type: profile.type || 'custom',
      description: profile.description || '',
      is_default: Boolean(profile.is_default)
    });
    setModalError(null);
    setActiveModal('edit_profile');
  };

  const openDeleteProfileModal = (profile) => {
    setModalTarget(profile);
    setModalError(null);
    setActiveModal('delete_profile');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    const isEditing = activeModal === 'edit_profile';
    const endpoint = isEditing ? `/api/vault/profiles/${modalTarget.id}` : '/api/vault/profiles';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(apiUrl(endpoint), {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(modalForm)
      });
      const data = await res.json();

      if (!res.ok) {
        setModalError(data.message || 'Failed to save profile');
        return;
      }

      showToast(isEditing ? 'Profile updated successfully' : 'Profile created successfully');
      setActiveModal(null);
      await fetchProfiles(data.profile?.id);
    } catch (err) {
      setModalError('Network error connecting to database');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!modalTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/api/vault/profiles/${modalTarget.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Profile deleted');
        setActiveModal(null);
        await fetchProfiles();
      } else {
        const data = await res.json();
        setModalError(data.message || 'Could not delete profile');
      }
    } catch (e) {
      setModalError('Network error connecting to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Attribute Modal Handlers
  const openCreateAttributeModal = (preset = null) => {
    setModalForm({
      profileId: activeProfileId,
      label: preset?.label || '',
      key: '',
      value: '',
      category: preset?.category || (activeProfile?.type === 'academic' ? 'Academic' : activeProfile?.type === 'professional' ? 'Professional' : 'Personal')
    });
    setModalError(null);
    setActiveModal('create_attr');
  };

  const openEditAttributeModal = (attr) => {
    setModalTarget(attr);
    setModalForm({
      label: attr.label,
      key: attr.key,
      value: attr.value,
      category: attr.category || 'Personal'
    });
    setModalError(null);
    setActiveModal('edit_attr');
  };

  const openDeleteAttributeModal = (attr) => {
    setModalTarget(attr);
    setModalError(null);
    setActiveModal('delete_attr');
  };

  const handleSaveAttribute = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    const isEditing = activeModal === 'edit_attr';
    const endpoint = isEditing ? `/api/vault/attributes/${modalTarget.id}` : '/api/vault/attributes';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(apiUrl(endpoint), {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(modalForm)
      });
      const data = await res.json();

      if (!res.ok) {
        setModalError(data.message || 'Failed to save attribute');
        return;
      }

      showToast(isEditing ? 'Attribute updated' : 'Attribute added to profile');
      setActiveModal(null);
      await fetchAttributes(activeProfileId);
      // update profile count in list
      setProfiles(prev => prev.map(p => {
        if (p.id === activeProfileId) {
          return { ...p, attributeCount: isEditing ? p.attributeCount : (p.attributeCount || 0) + 1 };
        }
        return p;
      }));
    } catch (err) {
      setModalError('Network error connecting to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAttribute = async () => {
    if (!modalTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/api/vault/attributes/${modalTarget.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Attribute deleted');
        setActiveModal(null);
        await fetchAttributes(activeProfileId);
        setProfiles(prev => prev.map(p => {
          if (p.id === activeProfileId) {
            return { ...p, attributeCount: Math.max(0, (p.attributeCount || 1) - 1) };
          }
          return p;
        }));
      } else {
        const data = await res.json();
        setModalError(data.message || 'Could not delete attribute');
      }
    } catch (e) {
      setModalError('Network error connecting to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clipboard & Visibility toggles
  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleReveal = (id) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentPresets = activeProfile ? (QUICK_PRESETS[activeProfile.type] || QUICK_PRESETS.custom) : [];

  return (
    <div className="vault-manager-root">
      {/* Toast Notification */}
      {toast && (
        <div className={`vault-toast toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Vault Header Bar */}
      <div className="vault-header">
        <div className="vault-title-group">
          <div className="vault-icon-badge">
            <ShieldCheck size={20} className="vault-badge-icon" />
          </div>
          <div>
            <h2 className="vault-title">Personal Information Vault</h2>
            <p className="vault-subtitle">
              Encrypted, user-isolated profiles stored in Supabase PostgreSQL with Row Level Security.
            </p>
          </div>
        </div>

        <div className="vault-actions-group">
          {profiles.length < 4 && (
            <button 
              className="btn-vault-outline"
              onClick={handleSeedProfiles}
              disabled={isSubmitting}
              title="Create standard profiles: My Info, Father's Info, Academic, and Professional"
            >
              <FolderPlus size={15} />
              <span>Initialize Standard Profiles</span>
            </button>
          )}
          <button 
            className="btn-vault-primary"
            onClick={openCreateProfileModal}
          >
            <Plus size={16} />
            <span>New Profile</span>
          </button>
        </div>
      </div>

      {/* YouTube-Style Live Vault Search Bar */}
      <VaultLiveSearch 
        token={token}
        onSelectFolder={handleSelectFolderFromSearch}
        onSelectAttribute={handleSelectAttributeFromSearch}
      />

      {/* Main Grid: Profiles Sidebar + Active Profile Attributes */}
      <div className="vault-layout-grid">
        {/* Left Column: Profiles Nav / Cards */}
        <div className="vault-profiles-sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">Your Profiles ({profiles.length})</span>
            <span className="rls-pill">
              <span className="dot-green" /> RLS Isolated
            </span>
          </div>

          {loadingProfiles ? (
            <div className="vault-loading-box">
              <RefreshCw size={18} className="spin" />
              <span>Loading profiles...</span>
            </div>
          ) : profiles.length === 0 ? (
            <div className="vault-empty-box">
              <Layers size={28} className="empty-icon" />
              <p className="empty-text">No profiles created yet.</p>
              <button className="btn-vault-sm" onClick={handleSeedProfiles}>
                Create Standard Profiles
              </button>
            </div>
          ) : (
            <div className="profile-tabs-list">
              {profiles.map((p) => {
                const meta = PROFILE_TYPE_META[p.type] || PROFILE_TYPE_META.custom;
                const IconComponent = meta.icon;
                const isActive = p.id === activeProfileId;

                return (
                  <div 
                    key={p.id}
                    className={`profile-card-tab ${isActive ? 'active' : ''} ${meta.colorClass}`}
                    onClick={() => setActiveProfileId(p.id)}
                  >
                    <div className="profile-tab-header">
                      <div className="profile-tab-icon-wrap">
                        <IconComponent size={16} />
                      </div>
                      <div className="profile-tab-info">
                        <div className="profile-name-row">
                          <span className="profile-tab-name">{p.name}</span>
                          {p.is_default && (
                            <span className="badge-default-star" title="Default Profile">
                              <Star size={10} fill="#f59e0b" color="#f59e0b" />
                            </span>
                          )}
                        </div>
                        <span className="profile-tab-type">{meta.label}</span>
                      </div>
                    </div>

                    <div className="profile-tab-footer">
                      <span className="profile-attr-count">
                        {p.attributeCount || 0} {p.attributeCount === 1 ? 'attribute' : 'attributes'}
                      </span>
                      <div className="profile-tab-actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="tab-action-btn"
                          title="Edit Profile"
                          onClick={() => openEditProfileModal(p)}
                        >
                          <Edit2 size={13} />
                        </button>
                        {profiles.length > 1 && (
                          <button 
                            className="tab-action-btn danger"
                            title="Delete Profile"
                            onClick={() => openDeleteProfileModal(p)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Profile Attribute Vault */}
        <div className="vault-attributes-main">
          {activeProfile ? (
            <div className="active-profile-card">
              {/* Profile Top Banner */}
              <div className="profile-banner-row">
                <div className="profile-banner-left">
                  <div className={`profile-big-icon ${PROFILE_TYPE_META[activeProfile.type]?.colorClass || 'type-cyan'}`}>
                    {React.createElement(PROFILE_TYPE_META[activeProfile.type]?.icon || Sparkles, { size: 22 })}
                  </div>
                  <div>
                    <div className="profile-heading-row">
                      <h3 className="profile-heading">{activeProfile.name}</h3>
                      <span className="profile-type-badge">
                        {PROFILE_TYPE_META[activeProfile.type]?.label || 'Custom'}
                      </span>
                      {activeProfile.is_default && (
                        <span className="profile-default-pill">Default Profile</span>
                      )}
                    </div>
                    <p className="profile-description">
                      {activeProfile.description || PROFILE_TYPE_META[activeProfile.type]?.description || 'Manage fields and values for this profile.'}
                    </p>
                  </div>
                </div>

                <div className="profile-banner-right">
                  <button 
                    className="btn-add-attr-action"
                    onClick={() => openCreateAttributeModal()}
                  >
                    <Plus size={15} />
                    <span>Add Attribute</span>
                  </button>
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div className="preset-suggestions-bar">
                <span className="preset-label">Quick Fields:</span>
                <div className="preset-chips-scroll">
                  {currentPresets.map((preset, idx) => (
                    <button 
                      key={idx}
                      className="preset-chip"
                      onClick={() => openCreateAttributeModal(preset)}
                    >
                      <Plus size={11} />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search & Category Filter Toolbar */}
              <div className="vault-toolbar">
                <div className="search-input-wrap">
                  <Search size={15} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search attributes by label, key, or value..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="vault-search-input"
                  />
                  {searchQuery && (
                    <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="category-filter-chips">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attributes Grid / List */}
              {loadingAttributes ? (
                <div className="vault-loading-box">
                  <RefreshCw size={20} className="spin" />
                  <span>Loading attributes from Supabase...</span>
                </div>
              ) : filteredAttributes.length === 0 ? (
                <div className="attributes-empty-state">
                  <Tag size={32} className="empty-tag-icon" />
                  <h4 className="empty-title">
                    {attributes.length === 0 
                      ? 'No attributes added yet' 
                      : 'No attributes match your filter'}
                  </h4>
                  <p className="empty-subtext">
                    {attributes.length === 0 
                      ? 'Click "Add Attribute" or select one of the Quick Fields above to store personal data.' 
                      : 'Try resetting the search bar or choosing another category.'}
                  </p>
                  {attributes.length === 0 && (
                    <button 
                      className="btn-vault-primary"
                      onClick={() => openCreateAttributeModal()}
                    >
                      <Plus size={15} />
                      <span>Add First Attribute</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="attributes-grid">
                  {filteredAttributes.map((attr) => {
                    const isRevealed = revealedIds.has(attr.id);
                    const isCopied = copiedId === attr.id;
                    const isSensitive = attr.key.includes('password') || attr.key.includes('secret') || attr.key.includes('ssn') || attr.key.includes('pin');

                    return (
                      <div 
                        key={attr.id} 
                        id={`attr-item-${attr.id}`}
                        className={`attribute-card ${highlightedAttrId === attr.id ? 'search-match-highlight' : ''}`}
                      >
                        <div className="attr-card-header">
                          <div className="attr-label-group">
                            <span className="attr-label">{attr.label}</span>
                            <span className="attr-key-badge">{attr.key}</span>
                          </div>
                          <span className={`attr-cat-tag cat-${attr.category?.toLowerCase() || 'personal'}`}>
                            {attr.category || 'Personal'}
                          </span>
                        </div>

                        <div className="attr-card-body">
                          <div className="attr-value-container">
                            <span className="attr-value-text">
                              {isSensitive && !isRevealed ? '••••••••••••••••' : attr.value}
                            </span>
                          </div>
                        </div>

                        <div className="attr-card-footer">
                          <div className="attr-footer-actions-left">
                            {isSensitive && (
                              <button 
                                className="attr-action-btn"
                                onClick={() => toggleReveal(attr.id)}
                                title={isRevealed ? 'Mask value' : 'Reveal value'}
                              >
                                {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            )}
                            <button 
                              className={`attr-action-btn ${isCopied ? 'copied' : ''}`}
                              onClick={() => handleCopy(attr.id, attr.value)}
                              title="Copy value to clipboard"
                            >
                              {isCopied ? <Check size={13} className="text-green" /> : <Copy size={13} />}
                            </button>
                          </div>

                          <div className="attr-footer-actions-right">
                            <button 
                              className="attr-action-btn"
                              onClick={() => openEditAttributeModal(attr)}
                              title="Edit attribute"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              className="attr-action-btn danger"
                              onClick={() => openDeleteAttributeModal(attr)}
                              title="Delete attribute"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="no-profile-selected-state">
              <Layers size={36} className="text-dim" />
              <p>Select a profile from the left sidebar to manage attributes.</p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODALS */}
      {/* ============================================================== */}

      {/* 1. Create / Edit Profile Modal */}
      {(activeModal === 'create_profile' || activeModal === 'edit_profile') && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {activeModal === 'create_profile' ? 'Create New Profile' : 'Edit Profile'}
              </h3>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="modal-form">
              {modalError && (
                <div className="modal-error-box">
                  <AlertTriangle size={15} />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Profile Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. My Information, Academic Records, Custom"
                  value={modalForm.name || ''}
                  onChange={(e) => setModalForm(prev => ({ ...prev, name: e.target.value }))}
                  className="vault-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Profile Type</label>
                <select
                  value={modalForm.type || 'custom'}
                  onChange={(e) => setModalForm(prev => ({ ...prev, type: e.target.value }))}
                  className="vault-select"
                >
                  <option value="my_info">My Information (Core Identity)</option>
                  <option value="father_info">Father's Information (Parent / Family)</option>
                  <option value="academic">Academic Information (Education / GPA)</option>
                  <option value="professional">Professional Information (Work / Skills)</option>
                  <option value="custom">Custom Profile (Specialized / Portfolio)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input 
                  type="text"
                  placeholder="Brief note about this profile's purpose"
                  value={modalForm.description || ''}
                  onChange={(e) => setModalForm(prev => ({ ...prev, description: e.target.value }))}
                  className="vault-input"
                />
              </div>

              <div className="form-checkbox-row">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={Boolean(modalForm.is_default)}
                    onChange={(e) => setModalForm(prev => ({ ...prev, is_default: e.target.checked }))}
                    className="vault-checkbox"
                  />
                  <span>Set as default autofill profile</span>
                </label>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-modal-cancel"
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{activeModal === 'create_profile' ? 'Create Profile' : 'Save Changes'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Delete Profile Confirmation Modal */}
      {activeModal === 'delete_profile' && modalTarget && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card modal-delete" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title text-red">Delete Profile</h3>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-delete-body">
              <p>
                Are you sure you want to delete profile <strong>"{modalTarget.name}"</strong>?
              </p>
              <p className="delete-warning">
                All associated attributes stored under this profile will be permanently deleted from Supabase PostgreSQL.
              </p>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-modal-cancel"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-modal-danger"
                onClick={handleDeleteProfile}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Create / Edit Attribute Modal */}
      {(activeModal === 'create_attr' || activeModal === 'edit_attr') && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {activeModal === 'create_attr' ? 'Add Personal Attribute' : 'Edit Attribute'}
              </h3>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAttribute} className="modal-form">
              {modalError && (
                <div className="modal-error-box">
                  <AlertTriangle size={15} />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Field Label</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Full Legal Name, GPA, Technical Skills"
                  value={modalForm.label || ''}
                  onChange={(e) => setModalForm(prev => ({ ...prev, label: e.target.value }))}
                  className="vault-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Attribute Key <span className="label-hint">(Auto-normalized for autofill mapping)</span>
                </label>
                <input 
                  type="text"
                  placeholder="e.g. full_legal_name (leave blank to auto-generate)"
                  value={modalForm.key || ''}
                  onChange={(e) => setModalForm(prev => ({ ...prev, key: e.target.value }))}
                  className="vault-input font-mono"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Field Value</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Enter the exact value to save in the vault..."
                  value={modalForm.value || ''}
                  onChange={(e) => setModalForm(prev => ({ ...prev, value: e.target.value }))}
                  className="vault-textarea"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={modalForm.category || 'Personal'}
                  onChange={(e) => setModalForm(prev => ({ ...prev, category: e.target.value }))}
                  className="vault-select"
                >
                  <option value="Personal">Personal</option>
                  <option value="Family">Family</option>
                  <option value="Academic">Academic</option>
                  <option value="Professional">Professional</option>
                  <option value="Contact">Contact</option>
                  <option value="Identity">Identity</option>
                  <option value="Financial">Financial</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-modal-cancel"
                  onClick={() => setActiveModal(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Saving to Supabase...</span>
                    </>
                  ) : (
                    <span>{activeModal === 'create_attr' ? 'Save Attribute' : 'Save Changes'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Delete Attribute Confirmation Modal */}
      {activeModal === 'delete_attr' && modalTarget && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-card modal-delete" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title text-red">Delete Attribute</h3>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-delete-body">
              <p>
                Are you sure you want to delete <strong>"{modalTarget.label}"</strong>?
              </p>
              <p className="delete-warning">
                This field will be removed from your profile and will no longer autofill forms in the Chrome extension.
              </p>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-modal-cancel"
                onClick={() => setActiveModal(null)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-modal-danger"
                onClick={handleDeleteAttribute}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
