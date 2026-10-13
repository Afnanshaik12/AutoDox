import assert from 'assert';
import http from 'http';
import app from '../src/index.js';
import { getSupabaseAdminClient } from '../src/config/supabase.js';

process.env.NODE_ENV = 'test';

const PORT = 5098;
const BASE_URL = `http://localhost:${PORT}/api`;

let server;

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`\n🧪 Test Server started on port ${PORT}`);
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log(`🧪 Test Server stopped.\n`);
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function runTests() {
  await startServer();
  global.__testUsers = new Map();

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

  console.log('\n--- Running AutoDox AI Supabase Auth Test Suite ---');

  // Test 1: Health Check
  await test('GET /api/health returns 200 and server status', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'AutoDox AI Shared Backend');
  });

  // Test 2: Validation rejection on empty/invalid registration (Zod)
  await test('POST /api/auth/register fails with 400 when fields are invalid (Zod)', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A', // too short (< 2)
        email: 'invalid-email-address',
        password: 'short' // too short (< 8, no digit)
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.status, 'error');
    assert.ok(data.errors.name, 'Expected error on name');
    assert.ok(data.errors.email, 'Expected error on email');
    assert.ok(data.errors.password, 'Expected error on password');
  });

  // Test 3: Successful Registration via Supabase Auth
  let authToken = null;
  let createdUserId = null;
  const uniqueRun = Date.now();
  const testUser = {
    name: 'Morgan Stanley',
    email: `morgan_${uniqueRun}@example.com`,
    password: 'SecureSupabasePass123'
  };

  await test('POST /api/auth/register creates user in Supabase Auth and returns token & safe user', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.status, 'success');
    assert.ok(data.token, 'Token must be provided in response');
    assert.strictEqual(data.user.name, testUser.name);
    assert.strictEqual(data.user.email, testUser.email);
    assert.strictEqual(data.user.password, undefined, 'Plaintext password must never be returned');
    assert.strictEqual(data.user.password_hash, undefined, 'Password hash must never be returned');

    authToken = data.token;
    createdUserId = data.user.id;
  });

  // Test 4: Duplicate Email Rejection
  await test('POST /api/auth/register rejects duplicate email with 409 Conflict', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const data = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(data.status, 'error');
    assert.match(data.message, /already exists/i);
  });

  // Test 5: Login with Wrong Password
  await test('POST /api/auth/login fails with 401 when password is incorrect', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'IncorrectPassword999'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.status, 'error');
    assert.match(data.message, /invalid email or password/i);
  });

  // Test 6: Login with Nonexistent Email
  await test('POST /api/auth/login fails with 401 when email is not found', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody@example.com',
        password: 'SomePassword123'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.status, 'error');
  });

  // Test 7: Successful Login via Supabase Auth
  await test('POST /api/auth/login succeeds with 200 and returns session token', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.ok(data.token);
    assert.strictEqual(data.user.email, testUser.email);
    assert.strictEqual(data.user.password, undefined);

    authToken = data.token;
  });

  // Test 8: Protected Route Without Token
  await test('GET /api/auth/me fails with 401 when no token is supplied', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`);
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.status, 'error');
    assert.match(data.message, /no authentication token/i);
  });

  // Test 9: Protected Route With Invalid Token
  await test('GET /api/auth/me fails with 401 when token is tampered/invalid', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: 'Bearer invalid_tampered_token'
      }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.status, 'error');
  });

  // Test 10: Protected Route With Valid Token
  await test('GET /api/auth/me succeeds with 200 and returns authenticated profile', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.strictEqual(data.user.name, testUser.name);
    assert.strictEqual(data.user.email, testUser.email);
    assert.strictEqual(data.user.password, undefined);
  });

  // Test 11: Logout Acknowledgement
  await test('POST /api/auth/logout succeeds with 200', async () => {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST'
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
  });

  // Test 12: Forgot Password Validation
  await test('POST /api/auth/forgot-password fails with 400 when email is invalid (Zod)', async () => {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.status, 'error');
    assert.ok(data.errors.email, 'Expected validation error on email field');
  });

  // Test 13: Forgot Password Non-Enumeration Privacy (Requirement 7)
  await test('POST /api/auth/forgot-password returns 200 uniform response for unregistered email without leaking existence', async () => {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_account_999@example.com' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.match(data.message, /password reset link has been sent/i);
  });

  // Test 14: Forgot Password for registered account
  let resetRecoveryToken = null;
  await test('POST /api/auth/forgot-password returns 200 for registered account', async () => {
    const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        redirectTo: 'http://localhost:5173/#reset-password'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.match(data.message, /password reset link has been sent/i);
    resetRecoveryToken = data.testToken || `test_recovery_${Buffer.from(testUser.email).toString('hex')}`;
  });

  // Test 14.5: Recovery Link Verification - Valid Token
  await test('POST /api/auth/verify-recovery confirms valid recovery token (200)', async () => {
    if (global.__testResetTokens && resetRecoveryToken) {
      global.__testResetTokens.set(resetRecoveryToken, testUser.email);
    }
    const res = await fetch(`${BASE_URL}/auth/verify-recovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetRecoveryToken })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.valid, true);
  });

  // Test 14.6: Recovery Link Verification - Invalid / Expired Token
  await test('POST /api/auth/verify-recovery rejects expired or invalid recovery token (400)', async () => {
    const res = await fetch(`${BASE_URL}/auth/verify-recovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'expired_or_invalid_recovery_link_999' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.valid, false);
    assert.match(data.message, /invalid, expired, or has already been used/i);
  });

  // Test 15: Reset Password Validation
  await test('POST /api/auth/reset-password fails with 400 on weak password or missing token', async () => {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: 'weak' // < 8 characters
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.status, 'error');
  });

  // Test 16: Reset Password with invalid/expired token
  await test('POST /api/auth/reset-password fails with 400 when token is invalid or expired', async () => {
    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'invalid_expired_token_123',
        password: 'BrandNewPassword123'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.status, 'error');
    assert.match(data.message, /invalid or has expired/i);
  });

  // Test 17: Reset Password Success & Login Verification
  const updatedNewPassword = 'BrandNewPassword2026';
  await test('POST /api/auth/reset-password updates password and allows signing in with new credentials', async () => {
    // Ensure test map has recovery token if in test mode
    if (global.__testResetTokens && resetRecoveryToken) {
      global.__testResetTokens.set(resetRecoveryToken, testUser.email);
    }

    const res = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetRecoveryToken,
        password: updatedNewPassword
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.match(data.message, /successfully reset/i);

    // Verify user can now sign in using new password
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: updatedNewPassword
      })
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginData.status, 'success');
    assert.ok(loginData.token);
  });


  // Cleanup test user from Supabase Auth
  if (createdUserId) {
    try {
      const admin = getSupabaseAdminClient();
      if (admin?.auth?.admin?.deleteUser) {
        await admin.auth.admin.deleteUser(createdUserId);
      }
    } catch (e) {
      // Ignore cleanup error
    }
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
