import assert from 'assert';
import app from '../src/index.js';
import { getSupabaseAdminClient, getSupabaseStatus } from '../src/config/supabase.js';

const PORT = 5096;
const BASE_URL = `http://localhost:${PORT}/api`;

let server;

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

async function runComprehensiveVerification() {
  console.log('================================================================');
  console.log('🛡️ AutoDox AI: Personal Information Vault Verification Audit');
  console.log('================================================================\n');

  await startServer();

  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;

  async function check(desc, fn) {
    totalChecks++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${desc}`);
      passedChecks++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${desc}`);
      console.error(`     Error: ${err.message}`);
      failedChecks++;
    }
  }

  const runId = Date.now();
  let userA = null;
  let userB = null;

  // 1. User Setup
  console.log('--- 1. Native Supabase Authentication & Session Tokens ---');
  await check('Register User A in Supabase Auth', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User A',
        email: `usera_audit_${runId}@example.com`,
        password: 'PassSecure123!'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.token, 'Must return JWT token');
    assert.ok(data.user.id, 'Must return user ID');
    userA = { token: data.token, id: data.user.id, email: `usera_audit_${runId}@example.com` };
  });

  await check('Register User B in Supabase Auth', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User B',
        email: `userb_audit_${runId}@example.com`,
        password: 'PassSecure123!'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.token, 'Must return JWT token');
    assert.ok(data.user.id, 'Must return user ID');
    userB = { token: data.token, id: data.user.id, email: `userb_audit_${runId}@example.com` };
  });

  // 2. Profile CRUD
  console.log('\n--- 2. Profile CRUD Operations & Profile Types ---');
  let myInfoProfileId = null;
  let fatherProfileId = null;
  let academicProfileId = null;
  let professionalProfileId = null;
  let customProfileId = null;

  await check('Verify User A can view initial profile list', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.profiles));
    // Trigger handle_new_user creates default My Information
    const existing = data.profiles.find(p => p.type === 'my_info');
    if (existing) myInfoProfileId = existing.id;
  });

  if (!myInfoProfileId) {
    await check('Create profile type: "my_info" (My Information)', async () => {
      const res = await fetch(`${BASE_URL}/vault/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
        body: JSON.stringify({
          name: 'My Information',
          type: 'my_info',
          description: 'Core personal identity & contact data',
          is_default: true
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      myInfoProfileId = data.profile.id;
    });
  }

  await check('Create profile type: "father_info" (Father\'s Information)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        name: "Father's Information",
        type: 'father_info',
        description: 'Parent details for family verification'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.profile.type, 'father_info');
    fatherProfileId = data.profile.id;
  });

  await check('Create profile type: "academic" (Academic Information)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        name: 'Academic Information',
        type: 'academic',
        description: 'Higher education and degree records'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.profile.type, 'academic');
    academicProfileId = data.profile.id;
  });

  await check('Create profile type: "professional" (Professional Information)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        name: 'Professional Information',
        type: 'professional',
        description: 'Work history and skills'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.profile.type, 'professional');
    professionalProfileId = data.profile.id;
  });

  await check('Create profile type: "custom" (Custom Profile)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        name: 'Scholarship Portfolio',
        type: 'custom',
        description: 'Special application records'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.profile.type, 'custom');
    customProfileId = data.profile.id;
  });

  await check('Edit existing profile (PUT /api/vault/profiles/:id)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles/${customProfileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        name: 'Updated Scholarship Portfolio',
        description: 'Updated description for scholarship profile'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.profile.name, 'Updated Scholarship Portfolio');
  });

  // 3. Attribute CRUD
  console.log('\n--- 3. Attribute CRUD Operations (Name, Email, Phone, Address, Education, Skills) ---');
  let nameAttrId = null;
  let eduAttrId = null;
  let skillAttrId = null;

  await check('Add personal attributes (Name, Phone, Address)', async () => {
    // Name
    const resName = await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        profileId: myInfoProfileId,
        label: 'Full Legal Name',
        value: 'Alexander Morgan',
        category: 'Personal'
      })
    });
    const dataName = await resName.json();
    assert.strictEqual(resName.status, 201);
    assert.strictEqual(dataName.attribute.key, 'full_legal_name');
    nameAttrId = dataName.attribute.id;

    // Phone
    const resPhone = await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        profileId: myInfoProfileId,
        label: 'Mobile Phone',
        value: '+1 (555) 019-2834',
        category: 'Contact'
      })
    });
    assert.strictEqual(resPhone.status, 201);

    // Address
    const resAddr = await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        profileId: myInfoProfileId,
        label: 'Residential Address',
        value: '742 Evergreen Terrace, Springfield, OR',
        category: 'Contact'
      })
    });
    assert.strictEqual(resAddr.status, 201);
  });

  await check('Add academic attributes (University, Degree, GPA)', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        profileId: academicProfileId,
        label: 'University Degree',
        value: 'B.S. in Computer Science, GPA: 3.92',
        category: 'Academic'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.attribute.key, 'university_degree');
    eduAttrId = data.attribute.id;
  });

  await check('Add professional attributes (Technical Skills, Job Title)', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        profileId: professionalProfileId,
        label: 'Technical Skills',
        value: 'React, Node.js, Express, PostgreSQL, Supabase, TypeScript',
        category: 'Professional'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.attribute.key, 'technical_skills');
    skillAttrId = data.attribute.id;
  });

  await check('View attributes for active profile (GET /api/vault/attributes?profileId=...) ', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes?profileId=${myInfoProfileId}`, {
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.attributes.length >= 3);
  });

  await check('Edit existing attribute (PUT /api/vault/attributes/:id)', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes/${nameAttrId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        value: 'Alexander Hamilton Morgan'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.attribute.value, 'Alexander Hamilton Morgan');
  });

  // 4. Persistence in Supabase PostgreSQL
  console.log('\n--- 4. Direct Supabase PostgreSQL Persistence Verification ---');
  await check('Verify profile records exist in Supabase database', async () => {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from('vault_profiles')
      .select('id, name, type, user_id')
      .eq('user_id', userA.id);

    assert.ifError(error);
    assert.ok(data && data.length >= 4, 'User A must have at least 4 profiles stored in database');
    const types = data.map(p => p.type);
    assert.ok(types.includes('father_info'), 'father_info must be in DB');
    assert.ok(types.includes('academic'), 'academic must be in DB');
    assert.ok(types.includes('professional'), 'professional must be in DB');
  });

  await check('Verify attribute records exist in Supabase database', async () => {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from('vault_attributes')
      .select('id, label, value, key, user_id')
      .eq('user_id', userA.id);

    assert.ifError(error);
    assert.ok(data && data.length >= 4, 'User A must have at least 4 attributes stored in database');
    const keys = data.map(a => a.key);
    assert.ok(keys.includes('full_legal_name'));
    assert.ok(keys.includes('university_degree'));
    assert.ok(keys.includes('technical_skills'));
  });

  // 5. Cross-User Isolation & RLS Enforcement
  console.log('\n--- 5. User Ownership & Row Level Security Isolation ---');

  await check('ISOLATION: User B listing profiles CANNOT see User A profiles', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    const leakedUserAProfiles = data.profiles.filter(p => p.id === myInfoProfileId || p.id === academicProfileId);
    assert.strictEqual(leakedUserAProfiles.length, 0, 'No User A profiles must be visible to User B');
  });

  await check('ISOLATION: User B querying User A profile attributes returns empty list', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes?profileId=${myInfoProfileId}`, {
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.attributes.length, 0, 'User B must retrieve 0 attributes belonging to User A');
  });

  await check('ISOLATION: User B cannot add attribute to User A profile (404/Access Denied)', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
      body: JSON.stringify({
        profileId: myInfoProfileId, // Targeting User A
        label: 'Injected Malicious Field',
        value: 'Hacked Value',
        category: 'Personal'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 404);
    assert.match(data.message, /not found or access denied/i);
  });

  await check('ISOLATION: User B cannot update User A attribute (404/Access Denied)', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes/${nameAttrId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
      body: JSON.stringify({ value: 'Compromised Name' })
    });
    assert.strictEqual(res.status, 404);
  });

  await check('ISOLATION: User B cannot delete User A attribute (404/Access Denied)', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes/${nameAttrId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    assert.strictEqual(res.status, 404);
  });

  await check('ISOLATION: User B cannot delete User A profile (404/Access Denied)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles/${myInfoProfileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userB.token}` }
    });
    assert.strictEqual(res.status, 404);
  });

  await check('ISOLATION: Bidirectional - User A cannot update User B data', async () => {
    // Create a profile for User B first
    const resBProf = await fetch(`${BASE_URL}/vault/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
      body: JSON.stringify({ name: "User B Secret Profile", type: "custom" })
    });
    const dataBProf = await resBProf.json();
    assert.strictEqual(resBProf.status, 201);
    const userBProfId = dataBProf.profile.id;

    // User A tries to delete User B's profile
    const resAttack = await fetch(`${BASE_URL}/vault/profiles/${userBProfId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    assert.strictEqual(resAttack.status, 404);
  });

  // 6. Delete Operations
  console.log('\n--- 6. Delete Operations by Owner ---');
  await check('User A deletes own attribute (DELETE /api/vault/attributes/:id)', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes/${nameAttrId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
  });

  await check('User A deletes own profile (DELETE /api/vault/profiles/:id)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles/${customProfileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
  });

  // 7. Cleanup
  console.log('\n--- 7. Test Data Cleanup ---');
  await check('Purge test users from Supabase Auth', async () => {
    const admin = getSupabaseAdminClient();
    if (admin?.auth?.admin?.deleteUser) {
      if (userA?.id) await admin.auth.admin.deleteUser(userA.id);
      if (userB?.id) await admin.auth.admin.deleteUser(userB.id);
    }
  });

  console.log('\n================================================================');
  console.log(`Audit Summary: ${passedChecks}/${totalChecks} checks passed, ${failedChecks} failed.`);
  console.log('================================================================\n');

  await stopServer();

  if (failedChecks > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runComprehensiveVerification().catch(async (e) => {
  console.error('Audit execution error:', e);
  await stopServer();
  process.exit(1);
});
