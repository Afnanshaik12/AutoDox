import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  Trash2, 
  AlertCircle, 
  Tag, 
  Layers, 
  Info,
  FileCheck
} from 'lucide-react';

export default function UploadView({ vaultDocuments = [], onAddDocument, onDeleteDocument }) {
  const [selectedCategory, setSelectedCategory] = useState('Identity & Passport');
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const categories = [
    'Identity & Passport',
    'Tax & Financial (W-2, 1099)',
    'Employment Verification',
    'Utility & Address Proof',
    'Custom Document'
  ];

  const handleSimulatedUpload = (fileName = 'National_ID_Card.pdf') => {
    setIsProcessing(true);
    setSuccessMessage('');

    setTimeout(() => {
      const newDoc = {
        id: `doc-${Date.now()}`,
        name: fileName,
        category: selectedCategory,
        uploadedAt: new Date().toISOString(),
        size: '1.2 MB',
        status: 'Processed (Local)',
        fields: [
          { label: 'Document Holder', key: 'docHolder', value: 'Alex Morgan', category: 'Personal' },
          { label: 'Issue Date', key: 'issueDate', value: '2023-05-12', category: 'Document' },
          { label: 'Document Category', key: 'docCategory', value: selectedCategory, category: 'Classification' }
        ]
      };

      onAddDocument(newDoc);
      setIsProcessing(false);
      setSuccessMessage(`"${fileName}" registered into Local Vault.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    }, 700);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSimulatedUpload(e.target.files[0].name);
    }
  };

  return (
    <div className="view-container upload-view">
      {/* Category selector */}
      <div className="upload-section">
        <label className="field-label">
          <Tag size={13} className="label-icon" /> Select Document Category:
        </label>
        <select 
          className="select-input"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Dropzone */}
      <div 
        className={`dropzone ${dragActive ? 'drag-active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleSimulatedUpload(e.dataTransfer.files[0].name);
          }
        }}
      >
        <input 
          type="file" 
          id="doc-file-input" 
          className="file-input-hidden" 
          accept=".pdf,.png,.jpg,.jpeg,.docx"
          onChange={handleFileChange}
        />
        <label htmlFor="doc-file-input" className="dropzone-label">
          <div className="dropzone-icon-circle">
            <UploadCloud size={28} className="upload-cloud-icon" />
          </div>
          <p className="dropzone-primary-text">
            {isProcessing ? 'Processing document locally...' : 'Drop document here or click to browse'}
          </p>
          <p className="dropzone-secondary-text">
            Supports PDF, JPG, PNG, DOCX (Max 25MB)
          </p>
        </label>
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <div className="alert-box success">
          <CheckCircle size={15} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Architecture Disclaimer */}
      <div className="architecture-note">
        <Info size={15} className="info-icon" />
        <p>
          <strong>Foundation Architecture:</strong> Documents are parsed in an isolated sandbox and encrypted locally. Document extraction pipelines will be hooked into the extraction worker.
        </p>
      </div>

      {/* Stored Documents List */}
      <div className="section-block">
        <div className="section-header-row">
          <h3 className="section-title">Stored Vault Documents</h3>
          <span className="section-counter">{vaultDocuments.length} total</span>
        </div>

        {vaultDocuments.length === 0 ? (
          <div className="empty-state">
            <FileText size={24} className="empty-icon" />
            <p className="empty-title">No documents uploaded yet</p>
            <p className="empty-desc">Upload a passport, tax form, or ID to populate your vault.</p>
          </div>
        ) : (
          <div className="document-list">
            {vaultDocuments.map((doc) => (
              <div key={doc.id} className="document-card">
                <div className="doc-icon-wrap">
                  <FileText size={18} />
                </div>
                <div className="doc-main-info">
                  <span className="doc-name">{doc.name}</span>
                  <div className="doc-meta-row">
                    <span className="doc-category-badge">{doc.category}</span>
                    <span className="doc-size">{doc.size || '1.1 MB'}</span>
                  </div>
                </div>
                <button 
                  className="doc-delete-btn"
                  onClick={() => onDeleteDocument(doc.id)}
                  title="Remove from Local Vault"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
