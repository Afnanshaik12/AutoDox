import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  Layers, 
  Tag, 
  Folder, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  ArrowRight, 
  CornerDownLeft,
  SearchX
} from 'lucide-react';
import { apiUrl } from '../config/api';

/**
 * Normalizes text by removing extra spaces and harmless punctuation
 */
function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[\s\-_.,/\\():;'"!@#$%^&*+=<>?[\]{}|~`]+/g, ' ')
    .trim();
}

/**
 * Text highlighter component for live search previews
 */
function HighlightedSnippet({ text, query }) {
  if (!text) return null;
  const str = String(text);
  if (!query || !query.trim()) return <span>{str}</span>;

  const rawQ = query.trim().toLowerCase();
  const lowerStr = str.toLowerCase();
  const matchIndex = lowerStr.indexOf(rawQ);

  if (matchIndex === -1) {
    return <span>{str}</span>;
  }

  const before = str.substring(0, matchIndex);
  const match = str.substring(matchIndex, matchIndex + rawQ.length);
  const after = str.substring(matchIndex + rawQ.length);

  return (
    <span>
      {before}
      <mark className="search-highlight-mark">{match}</mark>
      {after}
    </span>
  );
}

export default function VaultLiveSearch({ token, onSelectFolder, onSelectAttribute }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [folders, setFolders] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Flatten suggestions for keyboard arrow navigation
  const flatSuggestions = useMemo(() => {
    const list = [];
    folders.forEach(f => list.push({ ...f, itemType: 'folder' }));
    attributes.forEach(a => list.push({ ...a, itemType: 'attribute' }));
    return list;
  }, [folders, attributes]);

  // Debounced search effect
  useEffect(() => {
    const cleanQ = query.trim();
    if (!cleanQ) {
      setFolders([]);
      setAttributes([]);
      setError(null);
      setIsSearching(false);
      setActiveIndex(-1);
      return;
    }

    setIsSearching(true);
    setError(null);
    setActiveIndex(-1);

    // Cancel prior inflight search request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/vault/search?q=${encodeURIComponent(cleanQ)}`), {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            setFolders(data.folders || []);
            setAttributes(data.attributes || []);
            setIsOpen(true);
          } else {
            setError(data.message || 'Search failed');
          }
        } else {
          setError('Search request encountered an error.');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Could not connect to search service.');
        }
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, token]);

  // Dismiss dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery('');
    setFolders([]);
    setAttributes([]);
    setError(null);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleSelect = (item) => {
    if (!item) return;

    if (item.itemType === 'folder') {
      onSelectFolder(item.id);
    } else if (item.itemType === 'attribute') {
      onSelectAttribute(item.profileId, item.id);
    }

    setIsOpen(false);
    setQuery('');
  };

  // Keyboard navigation: Arrow Down, Arrow Up, Enter, Escape
  const handleKeyDown = (e) => {
    if (!isOpen || flatSuggestions.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % flatSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev <= 0 ? flatSuggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < flatSuggestions.length) {
        handleSelect(flatSuggestions[activeIndex]);
      } else if (flatSuggestions.length > 0) {
        handleSelect(flatSuggestions[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const hasResults = folders.length > 0 || attributes.length > 0;
  const isQueryActive = query.trim().length > 0;

  return (
    <div className="vault-live-search-container" ref={containerRef}>
      {/* Search Input Bar (YouTube Style) */}
      <div className={`vault-search-box-wrap ${isOpen && isQueryActive ? 'dropdown-active' : ''}`}>
        <div className="search-box-icon">
          <Search size={18} className="search-icon-svg" />
        </div>
        
        <input 
          ref={inputRef}
          type="text"
          className="vault-live-search-input"
          placeholder="Search attributes, values, or folders (e.g. 'passport', 'phone', 'academic')..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (isQueryActive) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
        />

        <div className="search-box-end-actions">
          {isSearching && (
            <div className="search-spinner-wrap" title="Searching vault...">
              <RefreshCw size={15} className="spin-icon" />
            </div>
          )}

          {isQueryActive && (
            <button 
              type="button" 
              className="btn-clear-search" 
              onClick={handleClear}
              title="Clear search query"
            >
              <X size={16} />
            </button>
          )}

          <div className="search-keyboard-hint">
            <span className="kbd-pill">ESC</span>
          </div>
        </div>
      </div>

      {/* Floating Suggestions Dropdown (YouTube Predictions Style) */}
      {isOpen && isQueryActive && (
        <div className="vault-search-dropdown" role="listbox">
          {isSearching && flatSuggestions.length === 0 ? (
            <div className="search-loading-state">
              <RefreshCw size={16} className="spin-icon text-cyan" />
              <span>Scanning vault attributes and folders...</span>
            </div>
          ) : error ? (
            <div className="search-error-state">
              <AlertTriangle size={16} className="text-red" />
              <span>{error}</span>
            </div>
          ) : !hasResults && !isSearching ? (
            <div className="search-empty-state">
              <SearchX size={24} className="empty-search-icon" />
              <div className="empty-search-text">
                <span className="empty-search-title">No matching attributes or folders found</span>
                <span className="empty-search-sub">
                  We couldn't find anything matching "{query}". Check spelling or try a broader keyword.
                </span>
              </div>
            </div>
          ) : (
            <div className="search-results-list">
              {/* Folder Suggestions Section */}
              {folders.length > 0 && (
                <div className="suggestion-section">
                  <div className="suggestion-section-title">
                    <Folder size={13} />
                    <span>Folders & Profiles ({folders.length})</span>
                  </div>
                  {folders.map((folder) => {
                    const idx = flatSuggestions.findIndex(item => item.itemType === 'folder' && item.id === folder.id);
                    const isFocused = idx === activeIndex;

                    return (
                      <div 
                        key={`folder-${folder.id}`}
                        className={`vault-suggestion-row folder-row ${isFocused ? 'active' : ''}`}
                        onClick={() => handleSelect({ ...folder, itemType: 'folder' })}
                        onMouseEnter={() => setActiveIndex(idx)}
                        role="option"
                        aria-selected={isFocused}
                      >
                        <div className="suggestion-icon-wrap folder-icon">
                          <Layers size={16} />
                        </div>
                        <div className="suggestion-content">
                          <div className="suggestion-main-line">
                            <span className="suggestion-title">
                              <HighlightedSnippet text={folder.name} query={query} />
                            </span>
                            <span className="suggestion-folder-badge">Folder</span>
                          </div>
                          <span className="suggestion-meta">
                            {folder.attributeCount} {folder.attributeCount === 1 ? 'attribute' : 'attributes'} • Open folder
                          </span>
                        </div>
                        <div className="suggestion-arrow">
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Attributes & Values Suggestions Section */}
              {attributes.length > 0 && (
                <div className="suggestion-section">
                  <div className="suggestion-section-title">
                    <Tag size={13} />
                    <span>Attributes & Saved Values ({attributes.length})</span>
                  </div>
                  {attributes.map((attr) => {
                    const idx = flatSuggestions.findIndex(item => item.itemType === 'attribute' && item.id === attr.id);
                    const isFocused = idx === activeIndex;

                    return (
                      <div 
                        key={`attr-${attr.id}`}
                        className={`vault-suggestion-row attribute-row ${isFocused ? 'active' : ''}`}
                        onClick={() => handleSelect({ ...attr, itemType: 'attribute' })}
                        onMouseEnter={() => setActiveIndex(idx)}
                        role="option"
                        aria-selected={isFocused}
                      >
                        <div className="suggestion-icon-wrap attr-icon">
                          <Tag size={16} />
                        </div>
                        <div className="suggestion-content">
                          <div className="suggestion-main-line">
                            <span className="suggestion-title">
                              <HighlightedSnippet text={attr.label} query={query} />
                            </span>
                            <span className="suggestion-in-folder">
                              in {attr.profileName}
                            </span>
                            <span className="suggestion-category-tag">{attr.category}</span>
                          </div>
                          <div className="suggestion-preview-line">
                            <span className="preview-label">Value:</span>
                            <span className="preview-val">
                              <HighlightedSnippet text={attr.valuePreview} query={query} />
                            </span>
                          </div>
                        </div>
                        <div className="suggestion-action-hint">
                          <CornerDownLeft size={13} />
                          <span>View</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Navigation Legend */}
              <div className="suggestion-footer-legend">
                <span className="legend-item">
                  <span className="kbd-pill">↑</span>
                  <span className="kbd-pill">↓</span> Navigate
                </span>
                <span className="legend-item">
                  <span className="kbd-pill">↵</span> Select
                </span>
                <span className="legend-item">
                  <span className="kbd-pill">ESC</span> Close
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
