/**
 * Storage utility wrapper for AutoDox AI
 * Uses chrome.storage.local when in extension context,
 * with standard localStorage fallback for dev environments.
 */

const isChromeStorage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

export const storage = {
  async get(keys) {
    if (isChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.get(keys, (res) => resolve(res || {}));
      });
    }

    // LocalStorage fallback
    const result = {};
    const keyArray = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(keys || {});
    keyArray.forEach((k) => {
      try {
        const val = localStorage.getItem(`autodox_${k}`);
        if (val !== null) result[k] = JSON.parse(val);
      } catch (e) {
        // ignore parse error
      }
    });
    return result;
  },

  async set(items) {
    if (isChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.set(items, () => resolve(true));
      });
    }

    // LocalStorage fallback
    Object.entries(items).forEach(([k, v]) => {
      try {
        localStorage.setItem(`autodox_${k}`, JSON.stringify(v));
      } catch (e) {
        // ignore write error
      }
    });
    return true;
  },

  async remove(keys) {
    if (isChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(keys, () => resolve(true));
      });
    }

    const keyArray = Array.isArray(keys) ? keys : [keys];
    keyArray.forEach((k) => localStorage.removeItem(`autodox_${k}`));
    return true;
  },
};
