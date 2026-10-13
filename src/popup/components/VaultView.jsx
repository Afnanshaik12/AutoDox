import React, { useState } from 'react';
import { 
  Search, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Plus, 
  Tag, 
  Database,
  Trash2,
  Lock
} from 'lucide-react';

export default function VaultView({ 
  vaultDocuments = [], 
  onAddField,
  connectedAccount = null,
  profiles = [],
  profileAttributes = []
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [copiedKey, setCopiedKey] = useState(null);
  const [revealedKeys, setRevealedKeys] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);

  // New field form state
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState('Personal');

  // Flatten local fields across documents
  const localFields = vaultDocuments.flatMap((doc) => 
    (doc.fields || []).map((field, idx) => ({
      ...field,
      docName: doc.name,
      uniqueId: `${doc.id}_${field.key || idx}`
    }))
  );

  // Flatten active cloud profile attributes
  const cloudFields = (profileAttributes || []).map((attr, idx) => ({
    label: attr.label,
    key: attr.key,
    value: attr.value,
    category: attr.category || 'Personal',
    docName: profiles.find((p) => p.id === attr.profileId)?.name || 'Cloud Profile',
    uniqueId: `cloud_${attr.id || idx}`
  }));

  const allFields = [...cloudFields, ...localFields];


  // Filter fields
  const filteredFields = allFields.filter((f) => {
    const matchesSearch = 
      f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['ALL', 'Personal', 'Identity', 'Professional', 'Contact'];

  const handleCopy = (val, key) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleReveal = (key) => {
    setRevealedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveCustomField = (e) => {
    e.preventDefault();
    if (!newLabel || !newValue) return;

    onAddField({
      label: newLabel,
      key: newLabel.toLowerCase().replace(/\s+/g, '_'),
      value: newValue,
      category: newCategory
    });

    setNewLabel('');
    setNewValue('');
    setShowAddModal(false);
  };

  return (
    <div className="view-container vault-view">
      {/* Search and Action Toolbar */}
      <div className="vault-toolbar">
        <div className="search-bar-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search vault attributes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          className="add-field-btn"
          onClick={() => setShowAddModal(!showAddModal)}
          title="Add Custom Attribute"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Add Field Inline Box */}
      {showAddModal && (
        <form className="add-field-card" onSubmit={handleSaveCustomField}>
          <div className="card-header-compact">
            <span className="card-subtitle-bold">Add Custom Attribute</span>
            <button 
              type="button" 
              className="text-btn-close" 
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </button>
          </div>
          <div className="form-row">
            <input 
              type="text" 
              className="text-input" 
              placeholder="Field Label (e.g. Passport ID)" 
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              required
            />
            <select 
              className="select-input compact"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              <option value="Personal">Personal</option>
              <option value="Identity">Identity</option>
              <option value="Professional">Professional</option>
              <option value="Contact">Contact</option>
            </select>
          </div>
          <div className="form-row">
            <input 
              type="text" 
              className="text-input" 
              placeholder="Attribute Value" 
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              required
            />
            <button type="submit" className="save-btn-primary">
              Save
            </button>
          </div>
        </form>
      )}

      {/* Category Pills */}
      <div className="category-pills">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Fields List */}
      <div className="vault-attributes-list">
        {filteredFields.length === 0 ? (
          <div className="empty-state">
            <Database size={24} className="empty-icon" />
            <p className="empty-title">No attributes found</p>
            <p className="empty-desc">Upload documents or click + to add custom attributes.</p>
          </div>
        ) : (
          filteredFields.map((field) => {
            const isRevealed = revealedKeys[field.uniqueId];
            const isCopied = copiedKey === field.uniqueId;
            const displayVal = isRevealed ? field.value : '••••••••••••';

            return (
              <div key={field.uniqueId} className="vault-field-card">
                <div className="field-info-col">
                  <div className="field-name-row">
                    <span className="field-label-text">{field.label}</span>
                    <span className="field-cat-tag">{field.category || 'General'}</span>
                  </div>
                  <div className="field-value-row">
                    <span className="field-value-text">{displayVal}</span>
                    <span className="field-source-tag">Source: {field.docName}</span>
                  </div>
                </div>

                <div className="field-actions-col">
                  <button 
                    className="icon-action-btn"
                    onClick={() => toggleReveal(field.uniqueId)}
                    title={isRevealed ? 'Mask value' : 'Reveal value'}
                  >
                    {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button 
                    className={`icon-action-btn ${isCopied ? 'copied' : ''}`}
                    onClick={() => handleCopy(field.value, field.uniqueId)}
                    title="Copy to clipboard"
                  >
                    {isCopied ? <Check size={14} className="copy-check" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
