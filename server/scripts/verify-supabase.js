import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { deduplicateEnvFile } from './clean-env.js';
import '../src/config/env.js';
import { getActiveEnvPath, getCleanEnvConfig } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runVerification() {
  console.log('======================================================');
  console.log('🔍 AutoDox AI: Supabase Configuration Audit');
  console.log('======================================================\n');

  // 1. Deduplicate entries if any exist
  const dedupResult = deduplicateEnvFile();
  if (dedupResult.changed) {
    console.log(`ℹ️ Cleaned ${dedupResult.count} duplicate environment variable definition(s).\n`);
  }

  // 2. Report Dotenv Loading Path
  const activePath = getActiveEnvPath();
  console.log('1. Dotenv Path Resolution:');
  if (activePath) {
    console.log(`   ✅ Target .env file resolved at: ${activePath}`);
  } else {
    console.log(`   ❌ No .env file found in server/ or workspace root.`);
  }

  // 3. Inspect Variables (Validating presence and format without printing secrets)
  const env = getCleanEnvConfig();
  console.log('\n2. Required Environment Variables Validation:');

  let allValid = true;

  // SUPABASE_URL
  const hasUrl = Boolean(env.SUPABASE_URL);
  const isUrlValid = hasUrl && env.SUPABASE_URL.startsWith('https://') && env.SUPABASE_URL.includes('.supabase.co');
  if (isUrlValid) {
    console.log('   ✅ SUPABASE_URL: Present (Valid HTTPS Supabase endpoint)');
  } else if (hasUrl) {
    console.log('   ⚠️ SUPABASE_URL: Present but invalid format (must start with https:// and end with .supabase.co)');
    allValid = false;
  } else {
    console.log('   ❌ SUPABASE_URL: Missing or empty');
    allValid = false;
  }

  // SUPABASE_ANON_KEY
  const hasAnon = Boolean(env.SUPABASE_ANON_KEY);
  const isAnonPlaceholder = hasAnon && (env.SUPABASE_ANON_KEY.includes('your_supabase') || env.SUPABASE_ANON_KEY.includes('your-supabase'));
  const isAnonValid = hasAnon && !isAnonPlaceholder && env.SUPABASE_ANON_KEY.startsWith('ey') && env.SUPABASE_ANON_KEY.length > 30;

  if (isAnonValid) {
    console.log(`   ✅ SUPABASE_ANON_KEY: Present (Valid JWT format, length: ${env.SUPABASE_ANON_KEY.length})`);
  } else if (isAnonPlaceholder) {
    console.log('   ⚠️ SUPABASE_ANON_KEY: Placeholder detected (replace with actual key from Supabase Dashboard)');
    allValid = false;
  } else if (hasAnon) {
    console.log(`   ⚠️ SUPABASE_ANON_KEY: Unexpected format (length: ${env.SUPABASE_ANON_KEY.length})`);
    allValid = false;
  } else {
    console.log('   ❌ SUPABASE_ANON_KEY: Missing or empty');
    allValid = false;
  }

  // SUPABASE_SERVICE_ROLE_KEY
  const hasService = Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
  const isServicePlaceholder = hasService && (env.SUPABASE_SERVICE_ROLE_KEY.includes('your_supabase') || env.SUPABASE_SERVICE_ROLE_KEY.includes('your-supabase'));
  const isServiceValid = hasService && !isServicePlaceholder && env.SUPABASE_SERVICE_ROLE_KEY.startsWith('ey') && env.SUPABASE_SERVICE_ROLE_KEY.length > 30;

  if (isServiceValid) {
    console.log(`   ✅ SUPABASE_SERVICE_ROLE_KEY: Present (Valid JWT format, length: ${env.SUPABASE_SERVICE_ROLE_KEY.length})`);
  } else if (isServicePlaceholder) {
    console.log('   ⚠️ SUPABASE_SERVICE_ROLE_KEY: Placeholder detected (replace with actual key from Supabase Dashboard)');
  } else if (hasService) {
    console.log(`   ⚠️ SUPABASE_SERVICE_ROLE_KEY: Unexpected format (length: ${env.SUPABASE_SERVICE_ROLE_KEY.length})`);
  } else {
    console.log('   ℹ️ SUPABASE_SERVICE_ROLE_KEY: Not set (optional for client-only, required for admin operations)');
  }

  if (!isUrlValid || (!isAnonValid && !isServiceValid)) {
    console.log('\n❌ Verification Result: Supabase variables are missing, empty, or placeholders.');
    console.log('   Please ensure server/.env is saved with your actual project URL and API keys.');
    return { success: false, reason: 'INVALID_CREDENTIALS' };
  }

  // 4. Test Live Connection to Supabase Cloud
  console.log('\n3. Testing Live Connection to Supabase:');
  const activeKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  try {
    const supabase = createClient(env.SUPABASE_URL, activeKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { error: pingError } = await supabase.auth.getSession();
    if (pingError) {
      console.log(`   ⚠️ Supabase Auth ping notice: ${pingError.message}`);
    } else {
      console.log('   ✅ Successfully connected to Supabase Auth service.');
    }

    // 5. Test Database Tables & RLS Policies
    console.log('\n4. Checking Database Tables & Row Level Security:');
    const tables = ['profiles', 'vault_profiles', 'vault_attributes'];
    for (const table of tables) {
      const { error, status } = await supabase.from(table).select('*').limit(1);
      if (error) {
        if (error.code === '42P01') {
          console.log(`   ⚠️ Table "public.${table}" does not exist yet. (Run server/schema.sql in Supabase SQL editor)`);
        } else if (status === 401 || status === 403 || error.message.includes('permission denied')) {
          console.log(`   ✅ Table "public.${table}" exists and RLS policy is ACTIVE.`);
        } else {
          console.log(`   ℹ️ Table "public.${table}": ${error.message}`);
        }
      } else {
        console.log(`   ✅ Table "public.${table}" exists and is accessible.`);
      }
    }

    console.log('\n======================================================');
    console.log('✅ Supabase Verification Complete: Connection Live');
    console.log('======================================================\n');
    return { success: true };
  } catch (netErr) {
    console.log(`   ❌ Failed to connect to Supabase: ${netErr.message}`);
    return { success: false, reason: 'NETWORK_FAILURE' };
  }
}

runVerification().then((res) => {
  process.exit(res.success ? 0 : 1);
}).catch((err) => {
  console.error('Unexpected error during verification:', err.message);
  process.exit(1);
});
