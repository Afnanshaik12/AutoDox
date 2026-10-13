import { getSupabaseClient, createScopedUserClient, getSupabaseStatus } from '../config/supabase.js';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access denied. No authentication token provided.'
    });
  }

  // Fast-path for automated test suite when running with test tokens
  if (process.env.NODE_ENV === 'test' && token.startsWith('test_token_')) {
    const email = token.replace('test_token_', '');
    const testUser = global.__testUsers && global.__testUsers.get(email);
    req.user = {
      id: `usr_${Buffer.from(email).toString('hex').slice(0, 12)}`,
      name: testUser ? testUser.name : email.split('@')[0],
      email: email,
      createdAt: new Date().toISOString()
    };
    req.token = token;
    return next();
  }

  const { isConfigured } = getSupabaseStatus();
  const supabase = getSupabaseClient();

  if (isConfigured && supabase) {
    try {
      // Validate token natively against Supabase Auth
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data?.user) {
        return res.status(401).json({
          status: 'error',
          message: error?.message || 'Invalid or expired session. Please sign in again.'
        });
      }

      const user = data.user;
      req.user = {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        email: user.email,
        createdAt: user.created_at
      };
      req.token = token;
      // Scoped client for Row Level Security enforcement
      req.supabase = createScopedUserClient(token);
      return next();
    } catch (err) {
      console.error('[AutoDox Auth] Supabase token verification failed:', err.message);
      return res.status(401).json({
        status: 'error',
        message: 'Authentication failed. Invalid session token.'
      });
    }
  }

  // Fallback for automated test harness or offline sandbox when keys not configured
  if (process.env.NODE_ENV === 'test') {
    if (token.startsWith('test_token_')) {
      const email = token.replace('test_token_', '');
      const testUser = global.__testUsers && global.__testUsers.get(email);
      req.user = {
        id: `usr_${Buffer.from(email).toString('hex').slice(0, 12)}`,
        name: testUser ? testUser.name : email.split('@')[0],
        email: email,
        createdAt: new Date().toISOString()
      };
      req.token = token;
      return next();
    }

    return res.status(401).json({
      status: 'error',
      message: 'Invalid or tampered authentication token.'
    });
  }

  return res.status(503).json({
    status: 'error',
    message: 'Supabase Auth is not configured. Please supply SUPABASE_URL and SUPABASE_ANON_KEY in server/.env'
  });
}
