import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');

export function deduplicateEnvFile() {
  if (!fs.existsSync(envPath)) return { changed: false, count: 0 };

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  const keyMap = new Map(); // key -> { lineIndex, value, rawLine }
  let duplicatesRemoved = 0;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=');
      const key = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();

      if (keyMap.has(key)) {
        duplicatesRemoved++;
        const existing = keyMap.get(key);
        // If current has a value and existing was empty, replace with current
        if (value.length > 0 && existing.value.length === 0) {
          keyMap.set(key, { lineIndex: existing.lineIndex, value, rawLine: line });
        }
      } else {
        keyMap.set(key, { lineIndex: idx, value, rawLine: line });
      }
    }
  });

  if (duplicatesRemoved > 0) {
    // Reconstruct deduplicated file
    const outputLines = [];
    const writtenKeys = new Set();

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        outputLines.push(line);
      } else {
        const key = trimmed.split('=')[0].trim();
        if (!writtenKeys.has(key)) {
          const entry = keyMap.get(key);
          outputLines.push(entry.rawLine);
          writtenKeys.add(key);
        }
      }
    });

    fs.writeFileSync(envPath, outputLines.join('\n'));
    console.log(`[clean-env] Removed ${duplicatesRemoved} duplicate variable definition(s).`);
    return { changed: true, count: duplicatesRemoved };
  }

  return { changed: false, count: 0 };
}

deduplicateEnvFile();
