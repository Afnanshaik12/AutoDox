import assert from 'assert';
import app from '../src/index.js';
import { getSupabaseAdminClient } from '../src/config/supabase.js';

process.env.NODE_ENV = 'test';

const PORT = 5097;
const BASE_URL = `http://localhost:${PORT}/api`;

let server;

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`\n🧪 Vault Test Server started on port ${PORT}`);
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log(`🧪 Vault Test Server stopped.\n`);
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function runTests() {
  await startServer();

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAILED: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  console.log('\n--- Running AutoDox AI Personal Vault & User Isolation Test Suite ---');

  const runId = Date.now();
  let userAId = null;
  let userBId = null;
  let userAToken = null;
  let userBToken = null;

  // Step 1: Provision Real Test Users via Supabase Auth
  await test('Provision User A in Supabase Auth (201)', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Johnson',
        email: `alice_${runId}@example.com`,
        password: 'SecurePassword123!'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.token, 'User A token must exist');
    userAToken = data.token;
    userAId = data.user.id;
  });

  await test('Provision User B in Supabase Auth (201)', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Smith',
        email: `bob_${runId}@example.com`,
        password: 'SecurePassword123!'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.token, 'User B token must exist');
    userBToken = data.token;
    userBId = data.user.id;
  });

  // Test 1: Unauthenticated request rejected
  await test('GET /api/vault/profiles rejects unauthenticated request (401)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles`);
    assert.strictEqual(res.status, 401);
  });

  // Test 2: User A lists initial profile(s)
  let userAProfileId = null;
  let academicProfileId = null;
  let professionalProfileId = null;

  await test('User A retrieves profile list (200)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles`, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.ok(Array.isArray(data.profiles));
    // The handle_new_user trigger creates initial "My Information" profile
    const defaultProf = data.profiles.find(p => p.type === 'my_info' || p.name.includes('My Information'));
    if (defaultProf) {
      userAProfileId = defaultProf.id;
    }
  });

  // If initial profile wasn't auto-created by trigger, User A creates it
  if (!userAProfileId) {
    await test('User A creates "My Information" profile (201)', async () => {
      const res = await fetch(`${BASE_URL}/vault/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`
        },
        body: JSON.stringify({
          name: 'My Information',
          type: 'my_info',
          description: 'Core personal identity & contact data',
          is_default: true
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.status, 'success');
      assert.strictEqual(data.profile.name, 'My Information');
      assert.strictEqual(data.profile.type, 'my_info');
      userAProfileId = data.profile.id;
    });
  }

  // Test 3: User A creates the 4 remaining required profile types
  await test('User A creates Father, Academic, Professional, and Custom profiles (201)', async () => {
    // 1. Father's Information
    const resFather = await fetch(`${BASE_URL}/vault/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        name: "Father's Information",
        type: 'father_info',
        description: 'Parent identity and contact details'
      })
    });
    const dataFather = await resFather.json();
    assert.strictEqual(resFather.status, 201);
    assert.strictEqual(dataFather.profile.type, 'father_info');

    // 2. Academic Information
    const resAcad = await fetch(`${BASE_URL}/vault/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        name: 'Academic Information',
        type: 'academic',
        description: 'Universities, degrees, and academic performance'
      })
    });
    const dataAcad = await resAcad.json();
    assert.strictEqual(resAcad.status, 201);
    assert.strictEqual(dataAcad.profile.type, 'academic');
    academicProfileId = dataAcad.profile.id;

    // 3. Professional Information
    const resProf = await fetch(`${BASE_URL}/vault/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        name: 'Professional Information',
        type: 'professional',
        description: 'Employment, past experience, and technical skills'
      })
    });
    const dataProf = await resProf.json();
    assert.strictEqual(resProf.status, 201);
    assert.strictEqual(dataProf.profile.type, 'professional');
    professionalProfileId = dataProf.profile.id;

    // 4. Custom Profile
    const resCustom = await fetch(`${BASE_URL}/vault/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        name: 'Scholarship Applications',
        type: 'custom',
        description: 'Profile for scholarship submissions'
      })
    });
    const dataCustom = await resCustom.json();
    assert.strictEqual(resCustom.status, 201);
    assert.strictEqual(dataCustom.profile.type, 'custom');
  });

  // Test 4: User A adds individual attributes (Name, Email, Phone, Address, Education, Skills)
  let userAAttrId = null;

  await test('User A adds personal attributes (Name, Phone, Address) (201)', async () => {
    // Full Name
    const resName = await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        profileId: userAProfileId,
        label: 'Full Legal Name',
        value: 'Alice Marie Johnson',
        category: 'Personal'
      })
    });
    const dataName = await resName.json();
    assert.strictEqual(resName.status, 201);
    assert.strictEqual(dataName.attribute.label, 'Full Legal Name');
    assert.strictEqual(dataName.attribute.value, 'Alice Marie Johnson');
    assert.strictEqual(dataName.attribute.key, 'full_legal_name');
    userAAttrId = dataName.attribute.id;

    // Phone
    const resPhone = await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        profileId: userAProfileId,
        label: 'Primary Phone Number',
        value: '+1 (555) 234-5678',
        category: 'Contact'
      })
    });
    assert.strictEqual(resPhone.status, 201);

    // Address
    const resAddr = await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        profileId: userAProfileId,
        label: 'Home Address',
        value: '123 Innovation Way, Suite 400, San Jose, CA',
        category: 'Contact'
      })
    });
    assert.strictEqual(resAddr.status, 201);
  });

  await test('User A adds academic and professional attributes (201)', async () => {
    // Education (University Degree)
    const resEdu = await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        profileId: academicProfileId,
        label: 'University Degree',
        value: 'B.S. in Computer Science, GPA 3.9',
        category: 'Academic'
      })
    });
    assert.strictEqual(resEdu.status, 201);

    // Skills
    const resSkill = await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        profileId: professionalProfileId,
        label: 'Technical Skills',
        value: 'React, Node.js, PostgreSQL, TypeScript, Python',
        category: 'Professional'
      })
    });
    assert.strictEqual(resSkill.status, 201);
  });

  // Test 5: User A updates an attribute
  await test('User A updates their own attribute (200)', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes/${userAAttrId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        value: 'Dr. Alice Marie Johnson'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.attribute.value, 'Dr. Alice Marie Johnson');
  });

  // Test 6: User A updates a profile
  await test('User A updates their own profile description (200)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles/${userAProfileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userAToken}` },
      body: JSON.stringify({
        description: 'Updated primary personal identity with doctorate title'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.profile.description, 'Updated primary personal identity with doctorate title');
  });

  // ==============================================================
  // USER ISOLATION & ROW LEVEL SECURITY ENFORCEMENT VERIFICATION
  // ==============================================================

  await test('ISOLATION: User B listing profiles does NOT see User A profiles', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles`, {
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    // User B must never see User A's profile IDs
    const containsUserA = data.profiles.some(p => p.id === userAProfileId || p.id === academicProfileId);
    assert.strictEqual(containsUserA, false, 'User B must not see any User A profiles');
  });

  await test('ISOLATION: User B listing attributes cannot retrieve User A attributes', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes?profileId=${userAProfileId}`, {
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.attributes.length, 0, 'User B must retrieve 0 attributes from User A profile');
  });

  await test('ISOLATION: User B cannot add attribute to User A profile (404/Access Denied)', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userBToken}` },
      body: JSON.stringify({
        profileId: userAProfileId, // Targeting User A's profile!
        label: 'Injected Malicious Key',
        value: 'Attacker Payload',
        category: 'Personal'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 404);
    assert.match(data.message, /not found or access denied/i);
  });

  await test('ISOLATION: User B cannot update User A attribute (404/Access Denied)', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes/${userAAttrId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userBToken}` },
      body: JSON.stringify({
        value: 'Malicious Tampering Attempt'
      })
    });
    assert.strictEqual(res.status, 404);
  });

  await test('ISOLATION: User B cannot delete User A attribute (404/Access Denied)', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes/${userAAttrId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    assert.strictEqual(res.status, 404);
  });

  await test('ISOLATION: User B cannot delete User A profile (404/Access Denied)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles/${userAProfileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    assert.strictEqual(res.status, 404);
  });

  // Test 6.5: Live Vault Search (Feature 1)
  await test('SEARCH: User A searches custom folder name (e.g. "Scholarship")', async () => {
    const res = await fetch(`${BASE_URL}/vault/search?q=Scholarship`, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.ok(data.folders.some(f => f.name.includes('Scholarship Applications')));
  });

  await test('SEARCH: User A searches attribute values case-insensitively (e.g. "alice")', async () => {
    const res = await fetch(`${BASE_URL}/vault/search?q=alice`, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.ok(data.attributes.some(a => a.value.toLowerCase().includes('alice marie johnson')));
  });

  await test('SEARCH: User A searches with normalized punctuation and whitespace', async () => {
    const res = await fetch(`${BASE_URL}/vault/search?q=555+234`, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.ok(data.attributes.length > 0, 'Must match phone number despite formatting differences');
  });

  await test('SEARCH: Empty or whitespace query returns zero matches safely', async () => {
    const res = await fetch(`${BASE_URL}/vault/search?q=   `, {
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.totalMatches, 0);
  });

  await test('SEARCH ISOLATION: User B searching "Alice" or "Scholarship" NEVER sees User A data', async () => {
    const res = await fetch(`${BASE_URL}/vault/search?q=Alice`, {
      headers: { Authorization: `Bearer ${userBToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.totalMatches, 0, 'User B must never see User A data in search results');
    assert.strictEqual(data.folders.length, 0);
    assert.strictEqual(data.attributes.length, 0);
  });


  // Test 7: User A deletes own attribute and profile successfully
  await test('User A deletes own attribute (200)', async () => {
    const res = await fetch(`${BASE_URL}/vault/attributes/${userAAttrId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
  });

  await test('User A deletes own profile (200)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles/${academicProfileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userAToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
  });

  // Cleanup: Delete test users from Supabase Auth
  const admin = getSupabaseAdminClient();
  if (admin?.auth?.admin?.deleteUser) {
    if (userAId) await admin.auth.admin.deleteUser(userAId).catch(() => {});
    if (userBId) await admin.auth.admin.deleteUser(userBId).catch(() => {});
  }

  console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---\n`);

  await stopServer();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(async (e) => {
  console.error('Test execution error:', e);
  await stopServer();
  process.exit(1);
});
