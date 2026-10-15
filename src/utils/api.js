/**
 * AutoDox AI - Extension API Client
 *
 * Securely communicates with the shared AutoDox Express backend and Supabase Auth.
 * NEVER stores or exposes Supabase secret keys in the Chrome extension.
 */

import { storage } from './storage';

const DEFAULT_SERVER_URL = 'https://autodox-backend.onrender.com';

/**
 * Resolves the backend server endpoint
 */
export async function getApiBaseUrl() {
  const res = await storage.get(['autodox_server_url']);
  return res.autodox_server_url || DEFAULT_SERVER_URL;
}

/**
 * Authenticates user credentials via native Supabase Auth
 */
export async function loginAccount({ email, password }) {
  const baseUrl = await getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: data.message || 'Login failed. Please check your credentials.'
      };
    }

    const accountData = {
      token: data.token,
      user: data.user,
      connectedAt: new Date().toISOString()
    };

    await storage.set({ autodox_account: accountData });
    return {
      success: true,
      account: accountData
    };
  } catch (err) {
    return {
      success: false,
      message: 'Could not connect to AutoDox AI backend. Please verify your connection or ensure the server is online.'
    };
  }
}

/**
 * Verifies stored session token and fetches fresh user profile
 */
export async function getConnectedAccount() {
  const res = await storage.get(['autodox_account']);
  const account = res.autodox_account;
  if (!account || !account.token) {
    return null;
  }

  // Validate session against backend
  const baseUrl = await getApiBaseUrl();
  try {
    const checkRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${account.token}` }
    });

    if (checkRes.ok) {
      const data = await checkRes.json();
      return {
        ...account,
        user: data.user
      };
    } else {
      // Session expired or invalid
      await disconnectAccount();
      return null;
    }
  } catch (e) {
    // If backend offline, return cached account session
    return account;
  }
}

/**
 * Retrieves authenticated user's profiles from Supabase PostgreSQL
 */
export async function fetchUserProfiles(token) {
  if (!token) return [];
  const baseUrl = await getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/vault/profiles`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.profiles || [];
  } catch (e) {
    console.error('[AutoDox API] Error fetching profiles:', e);
    return [];
  }
}

/**
 * Retrieves attributes for a specific profile or all user attributes
 */
export async function fetchProfileAttributes(token, profileId = null) {
  if (!token) return [];
  const baseUrl = await getApiBaseUrl();
  try {
    const url = profileId 
      ? `${baseUrl}/api/vault/attributes?profileId=${encodeURIComponent(profileId)}`
      : `${baseUrl}/api/vault/attributes`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.attributes || [];
  } catch (e) {
    console.error('[AutoDox API] Error fetching attributes:', e);
    return [];
  }
}

/**
 * Disconnects the connected AutoDox AI account from the extension
 */
export async function disconnectAccount() {
  const res = await storage.get(['autodox_account']);
  const account = res.autodox_account;

  if (account?.token) {
    const baseUrl = await getApiBaseUrl();
    try {
      await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${account.token}` }
      });
    } catch (e) {
      // Ignore network errors on logout
    }
  }

  await storage.remove(['autodox_account', 'autodox_active_profile_id']);
  return true;
}

/**
 * Gets the currently selected active profile ID for autofill
 */
export async function getActiveProfileId() {
  const res = await storage.get(['autodox_active_profile_id']);
  return res.autodox_active_profile_id || null;
}

/**
 * Persists the currently selected active profile ID
 */
export async function setActiveProfileId(profileId) {
  await storage.set({ autodox_active_profile_id: profileId });
  return profileId;
}

/**
 * Creates a secure single-use authorization code to hand off the authenticated
 * session from the Chrome extension to the AutoDox website portal.
 * NEVER puts tokens, passwords, or keys in URL parameters.
 */
export async function createAuthHandoff(tokenOverride = null) {
  let token = tokenOverride;
  if (!token) {
    const res = await storage.get(['autodox_account']);
    token = res.autodox_account?.token;
  }
  if (!token) return null;

  const baseUrl = await getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/auth/handoff/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ targetUrl: '/#/vault' })
    });

    if (!res.ok) {
      console.warn('[AutoDox API] Handoff creation responded with HTTP', res.status);
      return null;
    }

    const data = await res.json();
    return data.code || null;
  } catch (err) {
    console.error('[AutoDox API] Error generating handoff code:', err);
    return null;
  }
}
