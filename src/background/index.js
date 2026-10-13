/**
 * AutoDox AI - Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 * - Initialize default extension preferences on install
 * - Provide safe message routing
 * - Maintain isolated execution context without background web interception
 */

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[AutoDox AI] Service worker initialized. Reason:', details.reason);

  // Initialize initial privacy & settings defaults if not set
  chrome.storage.local.get(['autodox_settings', 'autodox_vault'], (res) => {
    if (!res.autodox_settings) {
      chrome.storage.local.set({
        autodox_settings: {
          localStorageOnly: true,
          requireConfirmation: true,
          preventUnsolicitedScans: true,
          autoHighlightInputs: true,
          privacyLevel: 'strict',
          lastInitialized: new Date().toISOString()
        }
      });
    }

    if (!res.autodox_vault) {
      chrome.storage.local.set({
        autodox_vault: [
          {
            id: 'doc-sample-1',
            name: 'Passport_Scan.pdf',
            category: 'Identity',
            uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            size: '1.4 MB',
            status: 'Verified (Local)',
            fields: [
              { label: 'Full Legal Name', key: 'fullName', value: 'Alex Morgan', category: 'Personal' },
              { label: 'Nationality', key: 'nationality', value: 'United States', category: 'Personal' },
              { label: 'Document Number', key: 'docNumber', value: 'P98421094', category: 'Identity' }
            ]
          },
          {
            id: 'doc-sample-2',
            name: 'W2_Tax_Summary_2025.pdf',
            category: 'Tax & Employment',
            uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            size: '840 KB',
            status: 'Verified (Local)',
            fields: [
              { label: 'Employer Name', key: 'employer', value: 'Acme Technologies Inc.', category: 'Professional' },
              { label: 'Postal Address', key: 'address', value: '742 Evergreen Terrace, Springfield, OR', category: 'Contact' },
              { label: 'Phone Number', key: 'phone', value: '+1 (555) 019-2834', category: 'Contact' }
            ]
          }
        ]
      });
    }
  });
});

// Safe message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({
      status: 'ok',
      serviceWorkerActive: true,
      timestamp: Date.now()
    });
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['autodox_settings'], (result) => {
      sendResponse({ settings: result.autodox_settings });
    });
    return true; // Keep channel open for async response
  }
});
