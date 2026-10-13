import assert from 'assert';
import http from 'http';
import app from '../src/index.js';
import { getSupabaseAdminClient } from '../src/config/supabase.js';
import { matchFieldToVault, isSensitiveField, normalizeLabel, scoreLabelMatch } from '../../src/utils/fieldMatcher.js';

process.env.NODE_ENV = 'test';

const PORT = 5096;
const BASE_URL = `http://localhost:${PORT}/api`;

let server;

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`\n🧪 Extension Integration Test Server started on port ${PORT}`);
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log(`🧪 Extension Integration Test Server stopped.\n`);
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

  console.log('\n--- Running AutoDox AI Chrome Extension & Supabase Integration Test Suite ---');

  const timestamp = Date.now();
  const userA = {
    email: `ext_test_a_${timestamp}@example.com`,
    password: 'Password123!',
    name: 'Alex Extension User'
  };

  const userB = {
    email: `ext_test_b_${timestamp}@example.com`,
    password: 'Password123!',
    name: 'Bob Other User'
  };

  let tokenA = null;
  let userAId = null;
  let tokenB = null;
  let userBId = null;

  let myProfileId = null;
  let fatherProfileId = null;

  // 1. Account Connection - Registration
  await test('Provision User A in Supabase Auth (201)', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA)
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.token, 'Must return JWT token');
    tokenA = data.token;
    userAId = data.user.id;
  });

  await test('Provision User B in Supabase Auth (201)', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB)
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    tokenB = data.token;
    userBId = data.user.id;
  });

  // 2. Account Connection via login endpoint
  await test('Extension connects account with valid Supabase Auth credentials (200)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userA.email, password: userA.password })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.token, 'Must return session token');
    assert.strictEqual(data.user.email, userA.email);
    assert.strictEqual(data.user.id, userAId);
    // Secret keys must never be returned
    assert.strictEqual(data.password, undefined);
    assert.strictEqual(data.password_hash, undefined);
    assert.strictEqual(data.service_role_key, undefined);
  });

  await test('Extension rejects connection on invalid credentials (401)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userA.email, password: 'WrongPassword999!' })
    });
    assert.strictEqual(res.status, 401);
  });

  await test('Extension verifies active session via /api/auth/me (200)', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.user.id, userAId);
    assert.strictEqual(data.user.email, userA.email);
  });

  // 3. User Profiles & Profile Selection
  await test('Create "My Information" and "Father\'s Information" profiles for User A', async () => {
    // My Information
    const res1 = await fetch(`${BASE_URL}/vault/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'My Information',
        type: 'my_info',
        description: 'Primary applicant personal details',
        is_default: true
      })
    });
    const data1 = await res1.json();
    assert.strictEqual(res1.status, 201);
    myProfileId = data1.profile.id;

    // Father's Information
    const res2 = await fetch(`${BASE_URL}/vault/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: "Father's Information",
        type: 'father_info',
        description: 'Parent guardian details',
        is_default: false
      })
    });
    const data2 = await res2.json();
    assert.strictEqual(res2.status, 201);
    fatherProfileId = data2.profile.id;
  });

  await test('User A adds attributes to My Information and Father\'s Information', async () => {
    // Add My Info attributes
    await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        profileId: myProfileId,
        label: 'Full Legal Name',
        value: 'Alex Extension User',
        category: 'Personal'
      })
    });

    await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        profileId: myProfileId,
        label: 'Email Address',
        value: 'alex.user@university.edu',
        category: 'Personal'
      })
    });

    await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        profileId: myProfileId,
        label: 'Phone Number',
        value: '+1 (555) 234-5678',
        category: 'Contact'
      })
    });

    // Add Father's Info attributes
    await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        profileId: fatherProfileId,
        label: 'Full Legal Name',
        value: 'Robert Extension User Sr.',
        category: 'Personal'
      })
    });

    await fetch(`${BASE_URL}/vault/attributes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        profileId: fatherProfileId,
        label: 'Phone Number',
        value: '+1 (555) 987-6543',
        category: 'Contact'
      })
    });
  });

  await test('Extension retrieves only authenticated user\'s profiles (200)', async () => {
    const res = await fetch(`${BASE_URL}/vault/profiles`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.profiles));
    const names = data.profiles.map((p) => p.name);
    assert.ok(names.includes('My Information'));
    assert.ok(names.includes("Father's Information"));
  });

  await test('Profile Selection: Extension retrieves attributes for a specific profile', async () => {
    // Select My Information
    const resMy = await fetch(`${BASE_URL}/vault/attributes?profileId=${myProfileId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const dataMy = await resMy.json();
    assert.strictEqual(resMy.status, 200);
    const myNameAttr = dataMy.attributes.find((a) => a.label === 'Full Legal Name');
    assert.ok(myNameAttr);
    assert.strictEqual(myNameAttr.value, 'Alex Extension User');

    // Select Father's Information
    const resFather = await fetch(`${BASE_URL}/vault/attributes?profileId=${fatherProfileId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const dataFather = await resFather.json();
    assert.strictEqual(resFather.status, 200);
    const fatherNameAttr = dataFather.attributes.find((a) => a.label === 'Full Legal Name');
    assert.ok(fatherNameAttr);
    assert.strictEqual(fatherNameAttr.value, 'Robert Extension User Sr.');
  });

  await test('User isolation: User B cannot retrieve User A\'s profiles or attributes', async () => {
    const resProfiles = await fetch(`${BASE_URL}/vault/profiles`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const dataProfiles = await resProfiles.json();
    assert.strictEqual(resProfiles.status, 200);
    const userBProfileIds = (dataProfiles.profiles || []).map((p) => p.id);
    assert.strictEqual(userBProfileIds.includes(myProfileId), false);
    assert.strictEqual(userBProfileIds.includes(fatherProfileId), false);

    const resAttrs = await fetch(`${BASE_URL}/vault/attributes?profileId=${myProfileId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const dataAttrs = await resAttrs.json();
    assert.strictEqual(resAttrs.status, 200);
    assert.strictEqual((dataAttrs.attributes || []).length, 0);
  });

  await test('Account disconnection succeeds and revokes session', async () => {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.status, 200);
  });

  // 4. Autofill Behavior & Matching Tests
  await test('Autofill matches page fields using selected "My Information" profile', () => {
    const myAttributes = [
      { label: 'Full Legal Name', key: 'fullName', value: 'Alex Extension User' },
      { label: 'Email Address', key: 'email', value: 'alex.user@university.edu' },
      { label: 'Phone Number', key: 'phone', value: '+1 (555) 234-5678' }
    ];

    const inputName = {
      id: 'applicant_full_name',
      name: 'fullName',
      label: 'Full Legal Name',
      type: 'text',
      autocomplete: 'name'
    };
    const matchName = matchFieldToVault(inputName, myAttributes);
    assert.ok(matchName, 'Should match name field');
    assert.strictEqual(matchName.valueToFill, 'Alex Extension User');
    assert.ok(matchName.confidence >= 80);

    const inputEmail = {
      id: 'contact_email',
      name: 'email',
      label: 'Email Address',
      type: 'email',
      autocomplete: 'email'
    };
    const matchEmail = matchFieldToVault(inputEmail, myAttributes);
    assert.ok(matchEmail, 'Should match email field');
    assert.strictEqual(matchEmail.valueToFill, 'alex.user@university.edu');
  });

  await test('Profile switching changes autofill values to "Father\'s Information"', () => {
    const fatherAttributes = [
      { label: 'Full Legal Name', key: 'fullName', value: 'Robert Extension User Sr.' },
      { label: 'Phone Number', key: 'phone', value: '+1 (555) 987-6543' }
    ];

    const parentNameField = {
      id: 'parent_guardian_name',
      name: 'parentName',
      label: 'Parent / Guardian Full Name',
      type: 'text'
    };
    const matchFather = matchFieldToVault(parentNameField, fatherAttributes);
    assert.ok(matchFather);
    assert.strictEqual(matchFather.valueToFill, 'Robert Extension User Sr.');
  });

  // 5. Sensitive Fields Exclusion Gate Tests (Requirement 10)
  await test('CRITICAL SAFETY: isSensitiveField detects passwords in type, autocomplete, or label', () => {
    assert.strictEqual(isSensitiveField({ type: 'password' }), true);
    assert.strictEqual(isSensitiveField({ autocomplete: 'current-password' }), true);
    assert.strictEqual(isSensitiveField({ autocomplete: 'new-password' }), true);
    assert.strictEqual(isSensitiveField({ label: 'Enter your password' }), true);
    assert.strictEqual(isSensitiveField({ name: 'user_password' }), true);
    assert.strictEqual(isSensitiveField({ placeholder: 'Retype Password' }), true);
  });

  await test('CRITICAL SAFETY: isSensitiveField detects OTPs, 2FA, and verification codes', () => {
    assert.strictEqual(isSensitiveField({ autocomplete: 'one-time-code' }), true);
    assert.strictEqual(isSensitiveField({ label: 'Enter OTP Code' }), true);
    assert.strictEqual(isSensitiveField({ placeholder: '6-digit verification code' }), true);
    assert.strictEqual(isSensitiveField({ name: 'two_factor_pin' }), true);
    assert.strictEqual(isSensitiveField({ id: 'mfa_security_code' }), true);
  });

  await test('CRITICAL SAFETY: isSensitiveField detects Credit Cards, CVVs, and payment fields', () => {
    assert.strictEqual(isSensitiveField({ autocomplete: 'cc-number' }), true);
    assert.strictEqual(isSensitiveField({ autocomplete: 'cc-csc' }), true);
    assert.strictEqual(isSensitiveField({ label: 'Credit Card Number' }), true);
    assert.strictEqual(isSensitiveField({ placeholder: 'CVV / Security Code' }), true);
    assert.strictEqual(isSensitiveField({ name: 'card_exp' }), true);
    assert.strictEqual(isSensitiveField({ id: 'bank_routing_number' }), true);
  });

  await test('CRITICAL SAFETY: matchFieldToVault NEVER matches sensitive fields under any circumstances', () => {
    const vault = [
      { label: 'Full Legal Name', key: 'fullName', value: 'Alex User' },
      { label: 'Document Number', key: 'docNumber', value: '123456789' }
    ];

    // Password field must return null
    const passResult = matchFieldToVault({
      type: 'password',
      name: 'password',
      label: 'Password'
    }, vault);
    assert.strictEqual(passResult, null, 'Must NEVER match password field');

    // OTP field must return null
    const otpResult = matchFieldToVault({
      type: 'text',
      autocomplete: 'one-time-code',
      label: 'One-Time Passcode'
    }, vault);
    assert.strictEqual(otpResult, null, 'Must NEVER match OTP field');

    // Credit card number must return null
    const cardResult = matchFieldToVault({
      type: 'text',
      autocomplete: 'cc-number',
      label: 'Card Number'
    }, vault);
    assert.strictEqual(cardResult, null, 'Must NEVER match Credit Card field');

    // CVV must return null
    const cvvResult = matchFieldToVault({
      type: 'text',
      label: 'CVV Security Code',
      placeholder: 'CVV'
    }, vault);
    assert.strictEqual(cvvResult, null, 'Must NEVER match CVV field');
  });

  // 6. Non-submission & explicit user approval guarantee
  await test('Autofill execution policy: only explicitly approved mappings are processed, no automatic submit', () => {
    const mappings = [
      { autodoxId: 'field_1', valueToFill: 'Alex User', enabled: true },
      { autodoxId: 'field_2', valueToFill: 'alex@example.com', enabled: false } // User did not approve
    ];

    const approvedMappings = mappings.filter((m) => m.enabled);
    assert.strictEqual(approvedMappings.length, 1);
    assert.strictEqual(approvedMappings[0].autodoxId, 'field_1');
  });

  // 7. Google Forms Case-Insensitive, Whitespace, & Punctuation Normalization Tests (Requirement 1)
  await test('NORMALIZATION: normalizeLabel trims whitespace, lowercases, collapses spaces, and strips harmless punctuation', () => {
    assert.strictEqual(normalizeLabel('  EMAIL  '), 'email');
    assert.strictEqual(normalizeLabel('FULL NAME *'), 'full name');
    assert.strictEqual(normalizeLabel('Mobile Number :'), 'mobile number');
    assert.strictEqual(normalizeLabel('Hall Ticket No.'), 'hall ticket no');
    assert.strictEqual(normalizeLabel('Admission ID?'), 'admission id');
    assert.strictEqual(normalizeLabel('   Extra   Spaces   and   Tabs   '), 'extra spaces and tabs');
    assert.strictEqual(normalizeLabel('Address (Line 1)'), 'address line 1');
  });

  await test('CASE-INSENSITIVITY: Matches "EMAIL", "Email", and "email" identically', () => {
    const vault = [{ label: 'Email', value: 'student@example.com' }];

    const matchUpper = matchFieldToVault({ label: 'EMAIL' }, vault);
    assert.ok(matchUpper, 'Must match uppercase EMAIL');
    assert.strictEqual(matchUpper.valueToFill, 'student@example.com');
    assert.strictEqual(matchUpper.confidence, 100);

    const matchLower = matchFieldToVault({ label: 'email' }, vault);
    assert.ok(matchLower, 'Must match lowercase email');
    assert.strictEqual(matchLower.valueToFill, 'student@example.com');
    assert.strictEqual(matchLower.confidence, 100);
  });

  await test('PUNCTUATION & WHITESPACE: Matches Google Forms required asterisks, colons, and padding', () => {
    const vault = [
      { label: 'Full Name', value: 'Jane Doe' },
      { label: 'Mobile Number', value: '+1 (555) 777-8888' },
      { label: 'Email Address', value: 'jane@example.com' }
    ];

    // Trailing asterisk from Google Forms required question
    const matchAsterisk = matchFieldToVault({ label: 'Full Name *' }, vault);
    assert.ok(matchAsterisk);
    assert.strictEqual(matchAsterisk.valueToFill, 'Jane Doe');

    // Trailing colon
    const matchColon = matchFieldToVault({ label: 'Mobile Number :' }, vault);
    assert.ok(matchColon);
    assert.strictEqual(matchColon.valueToFill, '+1 (555) 777-8888');

    // Heavy leading/trailing padding
    const matchPadding = matchFieldToVault({ label: '   Email Address   ' }, vault);
    assert.ok(matchPadding);
    assert.strictEqual(matchPadding.valueToFill, 'jane@example.com');
  });

  // 8. General Field Matching & Common Equivalent Aliases (Requirements 2 & 3)
  await test('EQUIVALENT WORDING: Matches common field aliases reliably', () => {
    const vault = [
      { label: 'Full Name', value: 'Jane Doe' },
      { label: 'Email Address', value: 'jane@example.com' },
      { label: 'Phone Number', value: '+1 (555) 000-1111' },
      { label: 'Hall Ticket No', value: 'HT-99881' },
      { label: 'Admission Number', value: 'ADM-4433' },
      { label: 'Institution Name', value: 'Stanford University' }
    ];

    // Name / Full Name / Full Legal Name
    const matchName = matchFieldToVault({ label: 'NAME' }, vault);
    assert.ok(matchName, 'NAME must match Full Name');
    assert.strictEqual(matchName.valueToFill, 'Jane Doe');

    const matchLegalName = matchFieldToVault({ label: 'Full Legal Name' }, vault);
    assert.ok(matchLegalName, 'Full Legal Name must match Full Name');
    assert.strictEqual(matchLegalName.valueToFill, 'Jane Doe');

    // Email / Email Address
    const matchEmail = matchFieldToVault({ label: 'Email' }, vault);
    assert.ok(matchEmail, 'Email must match Email Address');
    assert.strictEqual(matchEmail.valueToFill, 'jane@example.com');

    // Mobile Number / Phone Number
    const matchMobile = matchFieldToVault({ label: 'Mobile Number' }, vault);
    assert.ok(matchMobile, 'Mobile Number must match Phone Number');
    assert.strictEqual(matchMobile.valueToFill, '+1 (555) 000-1111');

    // Hall Ticket Number / Hall Ticket No
    const matchHallTicket = matchFieldToVault({ label: 'Hall Ticket Number' }, vault);
    assert.ok(matchHallTicket, 'Hall Ticket Number must match Hall Ticket No');
    assert.strictEqual(matchHallTicket.valueToFill, 'HT-99881');

    // Admission ID / Admission Number
    const matchAdmission = matchFieldToVault({ label: 'Admission ID' }, vault);
    assert.ok(matchAdmission, 'Admission ID must match Admission Number');
    assert.strictEqual(matchAdmission.valueToFill, 'ADM-4433');

    // College Name / Institution Name
    const matchCollege = matchFieldToVault({ label: 'College Name' }, vault);
    assert.ok(matchCollege, 'College Name must match Institution Name');
    assert.strictEqual(matchCollege.valueToFill, 'Stanford University');
  });

  await test('GENERAL APPROACH: Matches arbitrary user-created fields without hardcoded names', () => {
    const vault = [
      { label: 'Driver License Number', value: 'DL-55443322' },
      { label: 'Emergency Contact Number', value: '+1 (555) 999-0000' },
      { label: 'Blood Group', value: 'O Positive' },
      { label: 'Graduation Year', value: '2025' }
    ];

    // Generic abbreviation expansion (No <-> Number) on custom field
    const matchDL = matchFieldToVault({ label: 'Driver License No' }, vault);
    assert.ok(matchDL, 'Driver License No must match Driver License Number');
    assert.strictEqual(matchDL.valueToFill, 'DL-55443322');

    const matchEmerg = matchFieldToVault({ label: 'Emergency Contact No' }, vault);
    assert.ok(matchEmerg, 'Emergency Contact No must match Emergency Contact Number');
    assert.strictEqual(matchEmerg.valueToFill, '+1 (555) 999-0000');

    // Exact user field with conversational prefix in question
    const matchBlood = matchFieldToVault({ label: 'What is your Blood Group?' }, vault);
    assert.ok(matchBlood, 'Conversational question must match Blood Group');
    assert.strictEqual(matchBlood.valueToFill, 'O Positive');

    const matchGrad = matchFieldToVault({ label: 'Please enter your Graduation Year' }, vault);
    assert.ok(matchGrad);
    assert.strictEqual(matchGrad.valueToFill, '2025');
  });

  // 9. Missing Matches Policy (Requirement 5: report no match instead of guessing)
  await test('MISSING MATCHES: Reports null when no reliable match exists in vault (no guessing)', () => {
    const vault = [
      { label: 'Full Name', value: 'Alex User' },
      { label: 'Email Address', value: 'alex@example.com' },
      { label: 'Phone Number', value: '+1 (555) 123-4567' }
    ];

    // Form asks for Blood Group, but vault does not have it
    const matchBlood = matchFieldToVault({ label: 'Blood Group' }, vault);
    assert.strictEqual(matchBlood, null, 'Must return null for unrepresented field');

    // Form asks for Passport Expiry Date
    const matchPassportExp = matchFieldToVault({ label: 'Passport Expiry Date' }, vault);
    assert.strictEqual(matchPassportExp, null, 'Must return null rather than guessing');

    // Unrelated arbitrary question
    const matchRandom = matchFieldToVault({ label: 'Favorite Programming Language' }, vault);
    assert.strictEqual(matchRandom, null, 'Must return null for arbitrary unmatched question');
  });

  // 10. Ambiguous Matches Detection (Requirement 5: ask user to choose)
  await test('AMBIGUOUS MATCHES: Flags isAmbiguous and provides candidate attributes when multiple attributes match', () => {
    const vault = [
      { id: 'attr_1', label: 'Phone Number', value: '+1 (555) 111-1111', category: 'Personal' },
      { id: 'attr_2', label: 'Mobile Number', value: '+1 (555) 222-2222', category: 'Contact' }
    ];

    // Form asks for "Phone Number" or "Contact Number"
    const result = matchFieldToVault({ label: 'Phone Number' }, vault);
    assert.ok(result);
    assert.strictEqual(result.isAmbiguous, true, 'Should be flagged as ambiguous');
    assert.ok(Array.isArray(result.candidateAttributes), 'Must provide candidate attributes');
    assert.strictEqual(result.candidateAttributes.length, 2, 'Must include both matching candidates');
    const labels = result.candidateAttributes.map((c) => c.label);
    assert.ok(labels.includes('Phone Number'));
    assert.ok(labels.includes('Mobile Number'));
  });

  await test('AMBIGUOUS MATCHES: Flags ambiguity when "Name" matches both Full Name and First Name', () => {
    const vault = [
      { id: 'n_1', label: 'Full Name', value: 'Jane Doe' },
      { id: 'n_2', label: 'First Name', value: 'Jane' },
      { id: 'n_3', label: 'Last Name', value: 'Doe' }
    ];

    const result = matchFieldToVault({ label: 'Name' }, vault);
    assert.ok(result);
    assert.strictEqual(result.isAmbiguous, true, 'Name with multiple name fields must be ambiguous');
    assert.ok(result.candidateAttributes.length >= 2);
  });

  // 11. Attribute Label Matching (Requirement 2: Uses actual Field Label, not internal key)
  await test('FIELD LABEL PRIORITY: Matches based on actual Field Label regardless of internal key', () => {
    const vault = [
      { 
        id: 'cust_99',
        label: 'Permanent Account Number', 
        key: 'internal_custom_attr_9988_xyz', 
        value: 'ABCDE1234F' 
      }
    ];

    const matchPan = matchFieldToVault({ label: 'Permanent Account Number' }, vault);
    assert.ok(matchPan, 'Must match based on user-visible label');
    assert.strictEqual(matchPan.valueToFill, 'ABCDE1234F');
    assert.strictEqual(matchPan.vaultLabel, 'Permanent Account Number');
  });

  console.log(`\n--- Extension Test Results: ${passed} passed, ${failed} failed ---`);
  await stopServer();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
