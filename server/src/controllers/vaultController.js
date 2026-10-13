import { 
  createProfileSchema, 
  updateProfileSchema, 
  createAttributeSchema, 
  updateAttributeSchema, 
  formatZodErrors 
} from '../validators/vault.js';
import { getSupabaseClient, getSupabaseAdminClient, getSupabaseStatus } from '../config/supabase.js';

// Fallback in-memory store for automated testing/offline
const memoryProfiles = new Map(); // id -> profile
const memoryAttributes = new Map(); // id -> attribute

function normalizeKey(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeSearchText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[\s\-_.,/\\():;'"!@#$%^&*+=<>?[\]{}|~`]+/g, ' ')
    .trim();
}

export function stripSearchPunctuation(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function matchesSearch(target, rawQuery, normQuery, strippedQuery) {
  if (!target || !rawQuery) return false;
  const targetStr = String(target);
  const targetLower = targetStr.toLowerCase();
  if (targetLower.includes(rawQuery.toLowerCase())) return true;
  
  if (normQuery) {
    const targetNorm = normalizeSearchText(targetStr);
    if (targetNorm.includes(normQuery)) return true;
  }
  
  if (strippedQuery && strippedQuery.length >= 2) {
    const targetStripped = stripSearchPunctuation(targetStr);
    if (targetStripped.includes(strippedQuery)) return true;
  }
  
  return false;
}

/**
 * List all vault profiles for the authenticated user
 */
export async function listProfiles(req, res) {
  try {
    const userId = req.user.id;
    const { isConfigured } = getSupabaseStatus();
    const client = req.supabase || getSupabaseAdminClient();

    if (isConfigured && client) {
      const { data: profiles, error } = await client
        .from('vault_profiles')
        .select('*, vault_attributes(count)')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[AutoDox Vault] Error fetching profiles:', error.message);
        return res.status(500).json({ status: 'error', message: 'Failed to retrieve profiles' });
      }

      const formatted = (profiles || []).map(p => ({
        id: p.id,
        name: p.name,
        type: p.type || 'custom',
        description: p.description || '',
        is_default: Boolean(p.is_default),
        createdAt: p.created_at,
        attributeCount: p.vault_attributes?.[0]?.count || 0
      }));

      return res.status(200).json({ status: 'success', profiles: formatted });
    }

    // In-memory test store
    const userProfiles = Array.from(memoryProfiles.values())
      .filter(p => p.user_id === userId)
      .map(p => {
        const count = Array.from(memoryAttributes.values()).filter(a => a.profile_id === p.id).length;
        return { ...p, attributeCount: count };
      });

    return res.status(200).json({ status: 'success', profiles: userProfiles });
  } catch (err) {
    console.error('[AutoDox Vault] listProfiles error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Create a new vault profile
 */
export async function createProfile(req, res) {
  try {
    const parseResult = createProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: formatZodErrors(parseResult.error)
      });
    }

    const { name, type, description, is_default } = parseResult.data;
    const userId = req.user.id;
    const { isConfigured } = getSupabaseStatus();
    const client = req.supabase || getSupabaseAdminClient();

    if (isConfigured && client) {
      // If this is default, clear previous defaults for this user
      if (is_default) {
        await client.from('vault_profiles').update({ is_default: false }).eq('user_id', userId);
      }

      const { data, error } = await client
        .from('vault_profiles')
        .insert({
          user_id: userId,
          name,
          type,
          description: description || '',
          is_default: Boolean(is_default)
        })
        .select()
        .single();

      if (error) {
        console.error('[AutoDox Vault] Error creating profile:', error.message);
        return res.status(500).json({ status: 'error', message: error.message });
      }

      return res.status(201).json({
        status: 'success',
        message: 'Profile created successfully',
        profile: { ...data, attributeCount: 0 }
      });
    }

    // In-memory test store
    const id = `prof_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newProf = {
      id,
      user_id: userId,
      name,
      type,
      description: description || '',
      is_default: Boolean(is_default),
      createdAt: new Date().toISOString(),
      attributeCount: 0
    };
    memoryProfiles.set(id, newProf);

    return res.status(201).json({
      status: 'success',
      message: 'Profile created successfully',
      profile: newProf
    });
  } catch (err) {
    console.error('[AutoDox Vault] createProfile error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Update an existing vault profile
 */
export async function updateProfile(req, res) {
  try {
    const profileId = req.params.id;
    const userId = req.user.id;

    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: formatZodErrors(parseResult.error)
      });
    }

    const updates = parseResult.data;
    const { isConfigured } = getSupabaseStatus();
    const client = req.supabase || getSupabaseAdminClient();

    if (isConfigured && client) {
      // Verify profile belongs to user
      const { data: existing } = await client
        .from('vault_profiles')
        .select('id')
        .eq('id', profileId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        return res.status(404).json({ status: 'error', message: 'Profile not found or access denied' });
      }

      if (updates.is_default) {
        await client.from('vault_profiles').update({ is_default: false }).eq('user_id', userId);
      }

      const { data, error } = await client
        .from('vault_profiles')
        .update({ ...updates, updated_at: new Date() })
        .eq('id', profileId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ status: 'error', message: error.message });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        profile: data
      });
    }

    // In-memory test store
    const existing = memoryProfiles.get(profileId);
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ status: 'error', message: 'Profile not found or access denied' });
    }

    const updated = { ...existing, ...updates };
    memoryProfiles.set(profileId, updated);
    return res.status(200).json({ status: 'success', profile: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Delete a vault profile and cascade its attributes
 */
export async function deleteProfile(req, res) {
  try {
    const profileId = req.params.id;
    const userId = req.user.id;
    const { isConfigured } = getSupabaseStatus();
    const client = req.supabase || getSupabaseAdminClient();

    if (isConfigured && client) {
      const { data: existing } = await client
        .from('vault_profiles')
        .select('id')
        .eq('id', profileId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        return res.status(404).json({ status: 'error', message: 'Profile not found or access denied' });
      }

      const { error } = await client
        .from('vault_profiles')
        .delete()
        .eq('id', profileId)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({ status: 'error', message: error.message });
      }

      return res.status(200).json({ status: 'success', message: 'Profile deleted successfully' });
    }

    // In-memory test store
    const existing = memoryProfiles.get(profileId);
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ status: 'error', message: 'Profile not found or access denied' });
    }

    memoryProfiles.delete(profileId);
    // Delete associated attributes
    for (const [attrId, attr] of memoryAttributes.entries()) {
      if (attr.profile_id === profileId) {
        memoryAttributes.delete(attrId);
      }
    }

    return res.status(200).json({ status: 'success', message: 'Profile deleted successfully' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * List attributes for a specific profile or across all user profiles
 */
export async function listAttributes(req, res) {
  try {
    const userId = req.user.id;
    const profileId = req.query.profileId;
    const { isConfigured } = getSupabaseStatus();
    const client = req.supabase || getSupabaseAdminClient();

    if (isConfigured && client) {
      let query = client
        .from('vault_attributes')
        .select('*')
        .eq('user_id', userId);

      if (profileId) {
        query = query.eq('profile_id', profileId);
      }

      const { data: attributes, error } = await query.order('created_at', { ascending: true });

      if (error) {
        return res.status(500).json({ status: 'error', message: error.message });
      }

      const formatted = (attributes || []).map(a => ({
        id: a.id,
        profileId: a.profile_id,
        label: a.label,
        key: a.key,
        value: a.value,
        category: a.category || 'Personal',
        createdAt: a.created_at
      }));

      return res.status(200).json({ status: 'success', attributes: formatted });
    }

    // In-memory test store
    let attrs = Array.from(memoryAttributes.values()).filter(a => a.user_id === userId);
    if (profileId) {
      attrs = attrs.filter(a => a.profile_id === profileId);
    }

    return res.status(200).json({ status: 'success', attributes: attrs });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Add a new attribute to a profile
 */
export async function createAttribute(req, res) {
  try {
    const parseResult = createAttributeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: formatZodErrors(parseResult.error)
      });
    }

    const { profileId, label, value, category } = parseResult.data;
    const key = parseResult.data.key?.trim() || normalizeKey(label);
    const userId = req.user.id;
    const { isConfigured } = getSupabaseStatus();
    const client = req.supabase || getSupabaseAdminClient();

    if (isConfigured && client) {
      // Security Check: Verify profile belongs to this user!
      const { data: prof, error: profErr } = await client
        .from('vault_profiles')
        .select('id')
        .eq('id', profileId)
        .eq('user_id', userId)
        .maybeSingle();

      if (profErr || !prof) {
        return res.status(404).json({ status: 'error', message: 'Target profile not found or access denied' });
      }

      const { data, error } = await client
        .from('vault_attributes')
        .insert({
          user_id: userId,
          profile_id: profileId,
          label,
          key,
          value,
          category: category || 'Personal'
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ status: 'error', message: error.message });
      }

      return res.status(201).json({
        status: 'success',
        message: 'Attribute saved successfully',
        attribute: {
          id: data.id,
          profileId: data.profile_id,
          label: data.label,
          key: data.key,
          value: data.value,
          category: data.category,
          createdAt: data.created_at
        }
      });
    }

    // In-memory test store
    const prof = memoryProfiles.get(profileId);
    if (!prof || prof.user_id !== userId) {
      return res.status(404).json({ status: 'error', message: 'Target profile not found or access denied' });
    }

    const attrId = `attr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newAttr = {
      id: attrId,
      user_id: userId,
      profile_id: profileId,
      profileId,
      label,
      key,
      value,
      category: category || 'Personal',
      createdAt: new Date().toISOString()
    };
    memoryAttributes.set(attrId, newAttr);

    return res.status(201).json({
      status: 'success',
      message: 'Attribute saved successfully',
      attribute: newAttr
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Update an existing attribute
 */
export async function updateAttribute(req, res) {
  try {
    const attrId = req.params.id;
    const userId = req.user.id;

    const parseResult = updateAttributeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: formatZodErrors(parseResult.error)
      });
    }

    const updates = parseResult.data;
    if (updates.label && !updates.key) {
      updates.key = normalizeKey(updates.label);
    }

    const { isConfigured } = getSupabaseStatus();
    const client = req.supabase || getSupabaseAdminClient();

    if (isConfigured && client) {
      const { data: existing } = await client
        .from('vault_attributes')
        .select('id')
        .eq('id', attrId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        return res.status(404).json({ status: 'error', message: 'Attribute not found or access denied' });
      }

      const { data, error } = await client
        .from('vault_attributes')
        .update({ ...updates, updated_at: new Date() })
        .eq('id', attrId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ status: 'error', message: error.message });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Attribute updated successfully',
        attribute: {
          id: data.id,
          profileId: data.profile_id,
          label: data.label,
          key: data.key,
          value: data.value,
          category: data.category,
          createdAt: data.created_at
        }
      });
    }

    // In-memory test store
    const existing = memoryAttributes.get(attrId);
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ status: 'error', message: 'Attribute not found or access denied' });
    }

    const updated = { ...existing, ...updates };
    memoryAttributes.set(attrId, updated);
    return res.status(200).json({ status: 'success', attribute: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Delete an attribute
 */
export async function deleteAttribute(req, res) {
  try {
    const attrId = req.params.id;
    const userId = req.user.id;
    const { isConfigured } = getSupabaseStatus();
    const client = req.supabase || getSupabaseAdminClient();

    if (isConfigured && client) {
      const { data: existing } = await client
        .from('vault_attributes')
        .select('id')
        .eq('id', attrId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        return res.status(404).json({ status: 'error', message: 'Attribute not found or access denied' });
      }

      const { error } = await client
        .from('vault_attributes')
        .delete()
        .eq('id', attrId)
        .eq('user_id', userId);

      if (error) {
        return res.status(500).json({ status: 'error', message: error.message });
      }

      return res.status(200).json({ status: 'success', message: 'Attribute deleted successfully' });
    }

    // In-memory test store
    const existing = memoryAttributes.get(attrId);
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ status: 'error', message: 'Attribute not found or access denied' });
    }

    memoryAttributes.delete(attrId);
    return res.status(200).json({ status: 'success', message: 'Attribute deleted successfully' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Seed standard starter profiles for an authenticated user
 */
export async function seedDefaultProfiles(req, res) {
  try {
    const userId = req.user.id;
    const { isConfigured } = getSupabaseStatus();
    const client = req.supabase || getSupabaseAdminClient();

    if (isConfigured && client) {
      const { data: existing } = await client
        .from('vault_profiles')
        .select('id')
        .eq('user_id', userId);

      if (existing && existing.length > 0) {
        return res.status(200).json({ status: 'success', message: 'Profiles already initialized', seededCount: 0 });
      }

      const defaults = [
        { user_id: userId, name: 'My Information', type: 'my_info', is_default: true, description: 'Personal identity, contact, and core credentials' },
        { user_id: userId, name: "Father's Information", type: 'father_info', is_default: false, description: "Parent and guardian details for identity & family verification" },
        { user_id: userId, name: 'Academic Information', type: 'academic', is_default: false, description: 'Degrees, GPA, institutions, and educational history' },
        { user_id: userId, name: 'Professional Information', type: 'professional', is_default: false, description: 'Employment, job titles, companies, and career records' }
      ];

      const { data: seeded, error: seedError } = await client
        .from('vault_profiles')
        .insert(defaults)
        .select();

      if (seedError) {
        return res.status(500).json({ status: 'error', message: seedError.message });
      }

      return res.status(201).json({
        status: 'success',
        message: 'Default profiles initialized successfully',
        profiles: (seeded || []).map(p => ({ ...p, attributeCount: 0 }))
      });
    }

    return res.status(200).json({ status: 'success', profiles: [] });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Live search vault profiles (folders), attribute names, and values
 * Scoped strictly to the authenticated user (user_id = req.user.id).
 */
export async function searchVault(req, res) {
  try {
    const userId = req.user.id;
    const q = (req.query.q || '').trim();

    if (!q) {
      return res.status(200).json({
        status: 'success',
        query: '',
        folders: [],
        attributes: [],
        totalMatches: 0
      });
    }

    const normQuery = normalizeSearchText(q);
    const strippedQuery = stripSearchPunctuation(q);

    const { isConfigured } = getSupabaseStatus();
    const client = req.supabase || getSupabaseAdminClient();

    let allProfiles = [];
    let allAttributes = [];

    if (isConfigured && client) {
      // Fetch only authenticated user's profiles
      const { data: profiles, error: pErr } = await client
        .from('vault_profiles')
        .select('id, name, type, description, is_default, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (pErr) {
        return res.status(500).json({ status: 'error', message: pErr.message });
      }

      // Fetch only authenticated user's attributes
      const { data: attributes, error: aErr } = await client
        .from('vault_attributes')
        .select('id, profile_id, label, key, value, category, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (aErr) {
        return res.status(500).json({ status: 'error', message: aErr.message });
      }

      allProfiles = profiles || [];
      allAttributes = attributes || [];
    } else {
      // In-memory test store fallback
      allProfiles = Array.from(memoryProfiles.values()).filter(p => p.user_id === userId);
      allAttributes = Array.from(memoryAttributes.values()).filter(a => a.user_id === userId);
    }

    // Build map of profileId -> profileName for fast lookup
    const profileMap = new Map();
    const profileCountMap = new Map();

    for (const p of allProfiles) {
      profileMap.set(p.id, p);
      profileCountMap.set(p.id, 0);
    }

    for (const a of allAttributes) {
      const pId = a.profile_id || a.profileId;
      profileCountMap.set(pId, (profileCountMap.get(pId) || 0) + 1);
    }

    // 1. Match Folders / Profiles
    const matchedFolders = [];
    for (const p of allProfiles) {
      const matchName = matchesSearch(p.name, q, normQuery, strippedQuery);
      const matchDesc = matchesSearch(p.description, q, normQuery, strippedQuery);
      const matchType = matchesSearch(p.type, q, normQuery, strippedQuery);

      if (matchName || matchDesc || matchType) {
        matchedFolders.push({
          id: p.id,
          type: 'folder',
          name: p.name,
          profileType: p.type || 'custom',
          description: p.description || '',
          attributeCount: profileCountMap.get(p.id) || 0,
          matchedOn: matchName ? 'name' : matchDesc ? 'description' : 'type'
        });
      }
    }

    // 2. Match Attributes and Values
    const matchedAttributes = [];
    for (const a of allAttributes) {
      const pId = a.profile_id || a.profileId;
      const parentProfile = profileMap.get(pId);
      const profileName = parentProfile ? parentProfile.name : 'Folder';

      const matchLabel = matchesSearch(a.label, q, normQuery, strippedQuery);
      const matchKey = matchesSearch(a.key, q, normQuery, strippedQuery);
      const matchValue = matchesSearch(a.value, q, normQuery, strippedQuery);
      const matchCategory = matchesSearch(a.category, q, normQuery, strippedQuery);
      
      // Also match combination of folder name + attribute label (e.g. "father phone")
      const combined = `${profileName} ${a.label}`;
      const matchCombined = matchesSearch(combined, q, normQuery, strippedQuery);

      if (matchLabel || matchKey || matchValue || matchCategory || matchCombined) {
        // Build preview snippet of value
        let valuePreview = String(a.value || '');
        if (valuePreview.length > 60) {
          valuePreview = valuePreview.substring(0, 57) + '...';
        }

        matchedAttributes.push({
          id: a.id,
          type: 'attribute',
          profileId: pId,
          profileName,
          label: a.label,
          key: a.key,
          value: a.value,
          valuePreview,
          category: a.category || 'Personal',
          matchedOn: matchValue ? 'value' : matchLabel ? 'label' : matchCombined ? 'context' : 'key'
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      query: q,
      totalMatches: matchedFolders.length + matchedAttributes.length,
      folders: matchedFolders,
      attributes: matchedAttributes
    });
  } catch (err) {
    console.error('[AutoDox Vault] Search error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Reset memory store for automated tests
 */
export function _resetVaultMemory() {
  memoryProfiles.clear();
  memoryAttributes.clear();
}

