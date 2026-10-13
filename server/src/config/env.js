import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust path resolution regardless of current working directory
const serverEnvPath = path.resolve(__dirname, '../../../server/.env');
const localServerEnvPath = path.resolve(__dirname, '../../.env');
const cwdServerEnvPath = path.resolve(process.cwd(), 'server/.env');
const cwdRootEnvPath = path.resolve(process.cwd(), '.env');

const candidatePaths = [
  localServerEnvPath,
  serverEnvPath,
  cwdServerEnvPath,
  cwdRootEnvPath
];

let activeEnvPath = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    activeEnvPath = p;
    break;
  }
}

if (activeEnvPath) {
  dotenv.config({ path: activeEnvPath, override: true });
} else {
  dotenv.config({ override: true });
}

export function getActiveEnvPath() {
  return activeEnvPath;
}

export function getCleanEnvConfig() {
  return {
    PORT: process.env.PORT || '5001',
    NODE_ENV: process.env.NODE_ENV || 'development',
    SUPABASE_URL: process.env.SUPABASE_URL?.trim() || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.trim() || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || '',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
    APP_URL: process.env.APP_URL || 'http://localhost:5173'
  };
}
