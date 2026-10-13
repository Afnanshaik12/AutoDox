/**
 * AutoDox AI - Content Script (DOM Intelligence & Real-Time Autofill Engine)
 *
 * Privacy Guarantees:
 * 1. Strictly isolated execution.
 * 2. Does NOT harvest, upload, or transmit webpage contents.
 * 3. Only inspects or modifies DOM when explicitly commanded by user action.
 */

import { matchFieldToVault, detectFieldConcept, isSensitiveField } from '../utils/fieldMatcher';

(function () {
  console.log('[AutoDox AI] Content script active (Privacy-First Standby Mode)');

  // In-memory undo history for the active session
  let undoHistory = [];
  let isHighlighted = false;
  let activeFloatingBadge = null;

  // Active preferences loaded from chrome.storage.local
  let activeSettings = {
    localStorageOnly: true,
    requireConfirmation: true,
    preventUnsolicitedScans: true,
    autoHighlightInputs: true,
    privacyLevel: 'strict'
  };

  function loadSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['autodox_settings'], (res) => {
        if (res && res.autodox_settings) {
          activeSettings = { ...activeSettings, ...res.autodox_settings };
        }
      });
    }
  }

  loadSettings();

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.autodox_settings) {
        activeSettings = { ...activeSettings, ...changes.autodox_settings.newValue };
        if (!activeSettings.autoHighlightInputs) {
          removeFieldHighlights();
        }
      }
    });
  }

  /**
   * Cleans Google Forms and HTML question labels by stripping required asterisks,
   * aria announcements, and trailing punctuation.
   */
  function cleanQuestionLabel(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\*?\s*Required question\b/gi, '')
      .replace(/[\s*:]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Discovers clean text label for an input element using multiple semantic strategies,
   * with dedicated support for Google Forms question elements and ARIA references.
   */
  function resolveFieldLabel(el) {
    if (!el) return '';

    // Helper to safely extract and clean text from an element using textContent or innerText
    const getElementText = (node) => {
      if (!node) return '';
      return cleanQuestionLabel(node.textContent || node.innerText || '');
    };

    // 1. Google Forms Question Container (.Qr7Oae, [role="listitem"], .geS5n)
    const gContainer = el.closest('.Qr7Oae, [role="listitem"], .geS5n');
    if (gContainer) {
      // Prioritize the dedicated Google Forms question text span (.M7eMe)
      const m7eMe = gContainer.querySelector('.M7eMe');
      if (m7eMe) {
        const cleaned = getElementText(m7eMe);
        if (cleaned) return cleaned;
      }

      // Check heading role elements or other Google Forms question headers
      const gHeading = gContainer.querySelector('[role="heading"], .HoMgR, .F9vfv, .D1wxyf');
      if (gHeading) {
        const cleaned = getElementText(gHeading);
        if (cleaned) return cleaned;
      }
    }

    // 2. aria-labelledby (handles space-separated ID references common in Google Forms like "i1 i4")
    const labeledBy = el.getAttribute('aria-labelledby');
    if (labeledBy) {
      const ids = labeledBy.trim().split(/\s+/);
      for (const id of ids) {
        const labeledEl = document.getElementById(id);
        if (labeledEl) {
          // If the labeled element contains .M7eMe or [role="heading"], extract that
          const innerSpan = labeledEl.querySelector ? labeledEl.querySelector('.M7eMe, [role="heading"]') : null;
          const raw = innerSpan ? getElementText(innerSpan) : getElementText(labeledEl);
          if (raw) return raw;
        }
      }
    }

    // 3. aria-label
    if (el.getAttribute('aria-label')) {
      const cleaned = cleanQuestionLabel(el.getAttribute('aria-label'));
      if (cleaned) return cleaned;
    }

    // 4. Explicit <label for="id">
    if (el.id) {
      try {
        const explicitLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (explicitLabel) {
          const cleaned = getElementText(explicitLabel);
          if (cleaned) return cleaned;
        }
      } catch (e) {
        // Fallback if selector escape fails
      }
    }

    // 5. Parent / wrapping <label>
    const parentLabel = el.closest('label');
    if (parentLabel) {
      const cleaned = getElementText(parentLabel);
      if (cleaned) return cleaned;
    }

    // 6. Preceding sibling label or container label
    const container = el.closest('.form-group, .form-row, .field, .input-group, div, p');
    if (container) {
      const labelInContainer = container.querySelector('label, .label, span.form-label, p.label');
      if (labelInContainer) {
        const cleaned = getElementText(labelInContainer);
        if (cleaned) return cleaned;
      }
    }

    // 7. Placeholder
    if (el.placeholder && el.placeholder.trim()) {
      const cleaned = cleanQuestionLabel(el.placeholder);
      if (cleaned) return cleaned;
    }

    // 8. Name or ID formatted nicely
    // CRITICAL: Ignore Google Forms internal parameters (e.g. entry.402888219), jsname, and generated autodox IDs
    const rawFallback = (el.name || el.id || '').trim();
    if (rawFallback && !/^entry[\._]\d+/i.test(rawFallback) && !/^(ad_field_|__)/i.test(rawFallback) && !/^(YPqjbf|whsOnd)/i.test(rawFallback)) {
      return rawFallback.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    return '';
  }

  /**
   * Discovers all eligible interactive form fields on the active page
   */
  function discoverFormFields() {
    const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"]):not([type="file"]), textarea, select';
    const rawElements = Array.from(document.querySelectorAll(selector));

    const fields = [];
    rawElements.forEach((el, index) => {
      // Ignore hidden or non-interactive elements
      const isVisible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      if (!isVisible) return;
      if (el.disabled || el.readOnly) return;

      // Assign stable data identifier for targeting
      const autodoxId = el.getAttribute('data-autodox-id') || `ad_field_${index}_${Date.now().toString(36)}`;
      el.setAttribute('data-autodox-id', autodoxId);

      const fieldMeta = {
        autodoxId,
        id: el.id || '',
        name: el.name || '',
        placeholder: el.placeholder || '',
        label: resolveFieldLabel(el),
        ariaLabel: el.getAttribute('aria-label') || '',
        autocomplete: el.getAttribute('autocomplete') || '',
        type: el.tagName.toLowerCase() === 'select' ? 'select' : (el.type || el.tagName.toLowerCase()),
        tagName: el.tagName.toLowerCase(),
        currentValue: el.value || '',
        selector: `[data-autodox-id="${autodoxId}"]`
      };

      // Strict security: Never detect or process sensitive fields (passwords, OTPs, card details)
      if (isSensitiveField(fieldMeta)) {
        return;
      }

      fields.push(fieldMeta);
    });

    return fields;
  }

  /**
   * Safely updates an input or textarea element's value ensuring React and Vue detect the change
   */
  function setNativeValue(element, value) {
    if (!element) return;

    if (element.tagName.toLowerCase() === 'select') {
      let matched = false;
      const lowerVal = String(value).toLowerCase().trim();

      // Try matching by option value or option text
      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        if (opt.value.toLowerCase() === lowerVal || opt.text.toLowerCase() === lowerVal || opt.text.toLowerCase().includes(lowerVal)) {
          element.selectedIndex = i;
          matched = true;
          break;
        }
      }

      if (!matched && element.options.length > 0) {
        element.value = value;
      }

      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // Input or Textarea
    const isTextArea = element instanceof HTMLTextAreaElement;
    const prototype = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const nativeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (nativeValueSetter) {
      nativeValueSetter.call(element, value);
    } else {
      element.value = value;
    }

    // Dispatch full sequence of synthetic events
    element.dispatchEvent(new Event('focus', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * Removes all in-page visual highlights
   */
  function removeFieldHighlights() {
    const highlightedElements = document.querySelectorAll('[data-autodox-highlighted="true"]');
    highlightedElements.forEach((el) => {
      el.removeAttribute('data-autodox-highlighted');
      el.style.outline = '';
      el.style.boxShadow = '';
      el.style.borderColor = '';
    });

    const badges = document.querySelectorAll('.autodox-field-badge');
    badges.forEach((b) => b.remove());
    isHighlighted = false;
  }

  /**
   * Highlights matched fields on the webpage with a modern AutoDox blue glow
   */
  function highlightMatchedFields(matchedMappings = []) {
    removeFieldHighlights();

    // Respect user privacy settings: do not highlight if disabled
    if (!activeSettings.autoHighlightInputs) {
      return;
    }

    matchedMappings.forEach((mapping) => {
      const el = document.querySelector(`[data-autodox-id="${mapping.autodoxId}"]`);
      if (!el) return;

      el.setAttribute('data-autodox-highlighted', 'true');
      el.style.outline = '2px solid #2563eb';
      el.style.outlineOffset = '1px';
      el.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.18)';
      el.style.transition = 'box-shadow 0.25s ease, outline 0.25s ease, border-color 0.25s ease';
    });

    isHighlighted = true;
  }

  /**
   * Shows a brief, beautiful in-page toast notification
   */
  function showInPageToast(message, type = 'info') {
    const existing = document.getElementById('autodox-toast-container');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'autodox-toast-container';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 10px;
      animation: autodox-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    const iconColor = type === 'success' ? '#10b981' : '#38bdf8';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }

  /**
   * Executes autofill for the provided mapping list
   */
  function executeAutofill(mappings = []) {
    if (!Array.isArray(mappings) || mappings.length === 0) {
      return { status: 'ERROR', message: 'No valid field mappings provided' };
    }

    const currentSnapshot = [];
    let filledCount = 0;

    mappings.forEach((item) => {
      const el = document.querySelector(`[data-autodox-id="${item.autodoxId}"]`);
      if (!el) return;

      // Hard safety check: ensure element is not a sensitive input
      const checkMeta = {
        id: el.id || '',
        name: el.name || '',
        placeholder: el.placeholder || '',
        label: resolveFieldLabel(el),
        ariaLabel: el.getAttribute('aria-label') || '',
        autocomplete: el.getAttribute('autocomplete') || '',
        type: el.tagName.toLowerCase() === 'select' ? 'select' : (el.type || el.tagName.toLowerCase())
      };
      if (isSensitiveField(checkMeta)) {
        console.warn('[AutoDox AI] Safeguard prevented autofill on sensitive field:', el.name || el.id);
        return;
      }

      // Save previous value for Undo capability
      currentSnapshot.push({
        autodoxId: item.autodoxId,
        previousValue: el.value || ''
      });

      // Write value with synthetic event dispatch
      // STRICT POLICY: Never automatically submit forms or trigger submit buttons/events
      setNativeValue(el, item.valueToFill);
      filledCount++;

      // Flash success animation (emerald green glow)
      el.style.borderColor = '#10b981';
      el.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.28)';
      setTimeout(() => {
        el.style.boxShadow = '';
        el.style.borderColor = '';
      }, 1500);
    });

    // Push snapshot to undo history
    if (currentSnapshot.length > 0) {
      undoHistory.push(currentSnapshot);
    }

    showInPageToast(`AutoDox AI filled ${filledCount} field(s) safely`, 'success');

    return {
      status: 'SUCCESS',
      filledCount,
      timestamp: Date.now()
    };
  }

  /**
   * Undoes the most recent autofill action
   */
  function executeUndo() {
    if (undoHistory.length === 0) {
      return { status: 'ERROR', message: 'No previous autofill actions to undo' };
    }

    const lastSnapshot = undoHistory.pop();
    let revertedCount = 0;

    lastSnapshot.forEach((item) => {
      const el = document.querySelector(`[data-autodox-id="${item.autodoxId}"]`);
      if (!el) return;
      setNativeValue(el, item.previousValue);
      revertedCount++;
    });

    showInPageToast(`Reverted ${revertedCount} field(s) to previous state`, 'info');

    return {
      status: 'SUCCESS',
      revertedCount
    };
  }

  // Chrome Runtime Message Listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. Connection Ping
    if (request.type === 'AUTODOX_PING') {
      sendResponse({
        status: 'READY',
        pageTitle: document.title || 'Untitled Page',
        origin: window.location.origin,
        url: window.location.href,
        isolated: true,
        privacyMode: 'STRICT_STANDBY',
        settings: activeSettings
      });
      return true;
    }

    // 2. Form Inspection & Real-Time Vault Matching
    if (request.type === 'AUTODOX_INSPECT_AND_MATCH') {
      try {
        const detectedFields = discoverFormFields();
        const vaultAttributes = request.vaultAttributes || [];

        console.log(`[AutoDox AI Content] Discovered ${detectedFields.length} interactive form field(s). Comparing against ${vaultAttributes.length} saved vault attributes.`);

        const matchedMappings = [];
        const unmatchedFields = [];

        detectedFields.forEach((field) => {
          const matchResult = matchFieldToVault(field, vaultAttributes);
          if (matchResult) {
            matchedMappings.push({
              ...matchResult,
              autodoxId: field.autodoxId,
              currentValue: field.currentValue,
              enabled: true
            });
            console.log(`[AutoDox AI Content] Matched field "${field.label}" -> "${matchResult.vaultLabel}" (confidence: ${matchResult.confidence}${matchResult.isAmbiguous ? ', AMBIGUOUS' : ''})`);
          } else {
            unmatchedFields.push(field);
            console.log(`[AutoDox AI Content] Unmatched field "${field.label || field.name || field.id}" (no reliable match)`);
          }
        });

        // If requested to highlight immediately and enabled in preferences
        if (request.highlightImmediately && matchedMappings.length > 0 && activeSettings.autoHighlightInputs) {
          highlightMatchedFields(matchedMappings);
        }

        sendResponse({
          status: 'SUCCESS',
          totalFields: detectedFields.length,
          matchedCount: matchedMappings.length,
          matchedMappings,
          unmatchedFields: unmatchedFields.slice(0, 15)
        });
      } catch (err) {
        console.error('[AutoDox AI] Form inspection error:', err);
        sendResponse({ status: 'ERROR', message: err.message });
      }
      return true;
    }

    // 3. Highlight Matched Fields on Webpage
    if (request.type === 'AUTODOX_HIGHLIGHT_FIELDS') {
      if (request.enable && activeSettings.autoHighlightInputs) {
        highlightMatchedFields(request.mappings || []);
      } else {
        removeFieldHighlights();
      }
      sendResponse({ status: 'SUCCESS', isHighlighted: request.enable && activeSettings.autoHighlightInputs });
      return true;
    }

    // 4. Execute Autofill
    if (request.type === 'AUTODOX_EXECUTE_AUTOFILL') {
      const result = executeAutofill(request.mappings || []);
      sendResponse(result);
      return true;
    }

    // 5. Undo Autofill
    if (request.type === 'AUTODOX_UNDO_AUTOFILL') {
      const result = executeUndo();
      sendResponse(result);
      return true;
    }

    // 6. Basic Inspection (fallback)
    if (request.type === 'AUTODOX_INSPECT_FORM_FIELDS') {
      const fields = discoverFormFields();
      sendResponse({
        status: 'SUCCESS',
        count: fields.length,
        fieldsSummary: fields.slice(0, 10)
      });
      return true;
    }

    // 7. Get Content Script Settings
    if (request.type === 'AUTODOX_GET_SETTINGS') {
      sendResponse({ status: 'SUCCESS', settings: activeSettings });
      return true;
    }

    return false;
  });
})();
