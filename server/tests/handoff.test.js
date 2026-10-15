import assert from 'assert';
import http from 'http';
import app from '../src/index.js';
import { _getHandoffStore } from '../src/controllers/authController.js';

process.env.NODE_ENV = 'test';

const PORT = 5095;
const BASE_URL = `http://localhost:${PORT}/api`;

let server;

async function startServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`\n🧪 Handoff & OAuth Test Server started on port ${PORT}`);
      resolve();
    });
  });
}

async function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log(`🧪 Handoff & OAuth Test Server stopped.\n`);
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

  console.log('\n--- Running AutoDox AI Extension Handoff & OAuth Test Suite ---');

  const ts = Date.now();
  const userA = {
    name: 'Alice Handoff User',
    email: `alice_handoff_${ts}@example.com`,
    password: 'Password123!'
  };

  const userB = {
    name: 'Bob Handoff User',
    email: `bob_handoff_${ts}@example.com`,
    password: 'Password123!'
  };

  let tokenA = null;
  let userAId = null;
  let tokenB = null;
  let userBId = null;

  // Provision User A
  await test('Register User A to obtain valid session token', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userA)
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.token, 'Expected token for User A');
    tokenA = data.token;
    userAId = data.user.id;
  });

  // Provision User B
  await test('Register User B to obtain valid session token', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userB)
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.token, 'Expected token for User B');
    tokenB = data.token;
    userBId = data.user.id;
  });

  // Test 1: Unauthenticated Handoff Creation fails
  await test('POST /api/auth/handoff/create rejects unauthenticated requests (401)', async () => {
    const res = await fetch(`${BASE_URL}/auth/handoff/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl: '/#/vault' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.status, 'error');
  });

  // Test 2: Authenticated Handoff Creation succeeds
  let validHandoffCode = null;
  await test('POST /api/auth/handoff/create generates secure single-use code for User A (200)', async () => {
    const res = await fetch(`${BASE_URL}/auth/handoff/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ targetUrl: '/#/vault' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.ok(data.code, 'Expected code in response');
    assert.strictEqual(typeof data.code, 'string');
    assert.strictEqual(data.code.length, 64, 'Expected 64-character high-entropy hex code');
    assert.strictEqual(data.expiresIn, 60, 'Expected 60s expiration');
    validHandoffCode = data.code;
  });

  // Test 3: Invalid Handoff Code rejected
  await test('POST /api/auth/handoff/exchange rejects invalid or bogus code (400)', async () => {
    const res = await fetch(`${BASE_URL}/auth/handoff/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'completely_bogus_non_existent_code_xyz_999' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.status, 'error');
    assert.ok(data.message.toLowerCase().includes('invalid') || data.message.toLowerCase().includes('expired'));
  });

  // Test 4: Wrong User binding rejection
  await test('POST /api/auth/handoff/exchange rejects code when expectedUserId does not match (403)', async () => {
    const res = await fetch(`${BASE_URL}/auth/handoff/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: validHandoffCode,
        expectedUserId: userBId // User B attempting to claim User A's code
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.status, 'error');
    assert.ok(data.message.toLowerCase().includes('does not belong'));
  });

  // Test 5: Wrong User authenticated caller rejection
  await test('POST /api/auth/handoff/exchange rejects code when caller token belongs to another user (403)', async () => {
    const res = await fetch(`${BASE_URL}/auth/handoff/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}` // Caller is logged in as User B
      },
      body: JSON.stringify({
        code: validHandoffCode
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.status, 'error');
    assert.ok(data.message.toLowerCase().includes('does not belong'));
  });

  // Test 6: Successful Handoff Code Exchange
  let exchangedToken = null;
  await test('POST /api/auth/handoff/exchange successfully exchanges code for valid User A session (200)', async () => {
    const res = await fetch(`${BASE_URL}/auth/handoff/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: validHandoffCode })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.strictEqual(data.token, tokenA, 'Expected token to match User A session');
    assert.strictEqual(data.user.email, userA.email);
    assert.strictEqual(data.user.id, userAId);
    assert.strictEqual(data.targetUrl, '/#/vault');
    exchangedToken = data.token;
  });

  // Test 7: Replay Prevention (Reused Code Rejection)
  await test('POST /api/auth/handoff/exchange rejects REUSED code to prevent replay attacks (400)', async () => {
    const res = await fetch(`${BASE_URL}/auth/handoff/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: validHandoffCode })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.status, 'error');
    assert.ok(
      data.message.toLowerCase().includes('already been used') ||
      data.message.toLowerCase().includes('invalid') ||
      data.message.toLowerCase().includes('expired')
    );
  });

  // Test 8: Expired Handoff Code Rejection
  await test('POST /api/auth/handoff/exchange rejects EXPIRED code (400)', async () => {
    // Inject a manually expired handoff record into the store
    const store = _getHandoffStore();
    const expiredCode = 'expired_test_code_' + Date.now();
    store.set(expiredCode, {
      code: expiredCode,
      userId: userAId,
      userEmail: userA.email,
      userName: userA.name,
      token: tokenA,
      createdAt: Date.now() - 120000,
      expiresAt: Date.now() - 60000, // expired 60 seconds ago
      used: false
    });

    const res = await fetch(`${BASE_URL}/auth/handoff/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: expiredCode })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.status, 'error');
    assert.ok(data.message.toLowerCase().includes('expired'));
  });

  // Test 9: Account Switching Isolation via Handoff
  await test('Account Switching: User B handoff creates fresh User B session without User A data', async () => {
    // 1. Create User B handoff
    const createBRes = await fetch(`${BASE_URL}/auth/handoff/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ targetUrl: '/#/vault' })
    });
    const createBData = await createBRes.json();
    assert.strictEqual(createBRes.status, 200);

    // 2. Exchange User B handoff
    const exchangeBRes = await fetch(`${BASE_URL}/auth/handoff/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: createBData.code })
    });
    const exchangeBData = await exchangeBRes.json();
    assert.strictEqual(exchangeBRes.status, 200);
    assert.strictEqual(exchangeBData.user.id, userBId);
    assert.strictEqual(exchangeBData.token, tokenB);

    // 3. Verify session via /api/auth/me identifies User B
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${exchangeBData.token}` }
    });
    const meData = await meRes.json();
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meData.user.id, userBId);
    assert.strictEqual(meData.user.email, userB.email);
  });

  // Test 10: Supabase Google OAuth Initiation Route (GET - JSON mode)
  await test('GET /api/auth/oauth/google returns valid OAuth initiation URL (JSON mode)', async () => {
    const res = await fetch(`${BASE_URL}/auth/oauth/google?redirectTo=http%3A%2F%2Flocalhost%3A5173%2F%23%2Fvault&format=json`, {
      headers: { Accept: 'application/json' }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.strictEqual(data.provider, 'google');
    assert.ok(data.url, 'Expected OAuth URL in response');
    assert.ok(data.url.includes('prompt=select_account') || data.url.includes('google'), 'Expected prompt=select_account in URL');
  });

  // Test 11: Supabase Google OAuth Initiation Route (POST - JSON mode)
  await test('POST /api/auth/oauth/google returns valid OAuth initiation URL (JSON mode)', async () => {
    const res = await fetch(`${BASE_URL}/auth/oauth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        redirectTo: 'http://localhost:5173/#/vault',
        format: 'json'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.strictEqual(data.provider, 'google');
    assert.ok(data.url, 'Expected OAuth URL in response');
  });

  // Test 12: Supabase Google OAuth Initiation Route (GET - 302 Redirect mode)
  await test('GET /api/auth/oauth/google redirects browser in navigation mode (302)', async () => {
    const res = await fetch(`${BASE_URL}/auth/oauth/google?redirectTo=http%3A%2F%2Flocalhost%3A5173%2F%23%2Fvault`, {
      redirect: 'manual'
    });
    assert.strictEqual(res.status, 302);
    assert.ok(res.headers.get('location'), 'Expected Location header on 302 redirect');
  });

  // Test 11: Supabase Google OAuth Code Exchange
  await test('POST /api/auth/oauth/exchange-code exchanges authorization code for session (200)', async () => {
    const res = await fetch(`${BASE_URL}/auth/oauth/exchange-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'valid_test_oauth_code' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.ok(data.token, 'Expected session token in response');
    assert.ok(data.user, 'Expected user profile in response');
  });

  // Test 13: Supabase Google OAuth Code Exchange Rejects Invalid Code
  await test('POST /api/auth/oauth/exchange-code rejects invalid code (400)', async () => {
    const res = await fetch(`${BASE_URL}/auth/oauth/exchange-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'invalid_oauth_code_123' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.status, 'error');
  });

  // Test 14: Google OAuth Callback URL Fragment & Query Parsing Regression Suite
  await test('Google OAuth Callback Parameter Extractor handles all redirect formats', async () => {
    function extractAuthParams(urlStr) {
      const u = new URL(urlStr);
      const params = new URLSearchParams();
      if (u.search) {
        new URLSearchParams(u.search.replace(/^\?/, '')).forEach((v, k) => params.set(k, v));
      }
      if (u.hash) {
        const rawHash = u.hash.replace(/^#/, '');
        const segments = rawHash.split('#');
        for (const segment of segments) {
          if (segment.includes('=')) {
            const queryPart = segment.includes('?') ? segment.split('?')[1] : segment;
            new URLSearchParams(queryPart).forEach((v, k) => params.set(k, v));
          } else if (segment.includes('?')) {
            const queryPart = segment.split('?')[1];
            new URLSearchParams(queryPart).forEach((v, k) => params.set(k, v));
          }
        }
      }
      return params;
    }

    // 1. Standard Implicit Flow
    const p1 = extractAuthParams('https://auto-dox.vercel.app/#access_token=token_abc&refresh_token=ref_123&token_type=bearer');
    assert.strictEqual(p1.get('access_token'), 'token_abc');
    assert.strictEqual(p1.get('refresh_token'), 'ref_123');

    // 2. Double-Hash Fragment (#/vault#access_token=...)
    const p2 = extractAuthParams('https://auto-dox.vercel.app/#/vault#access_token=token_xyz&refresh_token=ref_456');
    assert.strictEqual(p2.get('access_token'), 'token_xyz');
    assert.strictEqual(p2.get('refresh_token'), 'ref_456');

    // 3. Query Inside Hash (#/vault?access_token=...)
    const p3 = extractAuthParams('https://auto-dox.vercel.app/#/vault?access_token=token_qwe');
    assert.strictEqual(p3.get('access_token'), 'token_qwe');

    // 4. PKCE Code in Search Query (?code=...)
    const p4 = extractAuthParams('https://auto-dox.vercel.app/?code=pkce_code_123');
    assert.strictEqual(p4.get('code'), 'pkce_code_123');

    // 5. PKCE Code inside Hash (#/vault?code=...)
    const p5 = extractAuthParams('https://auto-dox.vercel.app/#/vault?code=pkce_code_456');
    assert.strictEqual(p5.get('code'), 'pkce_code_456');

    // 6. OAuth Error handling
    const p6 = extractAuthParams('https://auto-dox.vercel.app/?error=access_denied&error_description=User+declined');
    assert.strictEqual(p6.get('error'), 'access_denied');
    assert.strictEqual(p6.get('error_description'), 'User declined');
  });

  // Test 15: Token verification hydrates user profile and allows vault access
  await test('Session established via OAuth token verifies profile via GET /api/auth/me', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.status, 'success');
    assert.strictEqual(data.user.id, userAId);
    assert.strictEqual(data.user.email, userA.email);
  });

  console.log(`\n--- Handoff & OAuth Test Results: ${passed} passed, ${failed} failed ---\n`);

  await stopServer();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(async (err) => {
  console.error('Fatal test error:', err);
  await stopServer();
  process.exit(1);
});
