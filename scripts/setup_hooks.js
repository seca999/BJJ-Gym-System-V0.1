import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const gitDir = path.join(rootDir, '.git');
const gitHooksDir = path.join(gitDir, 'hooks');

if (fs.existsSync(gitDir)) {
  try {
    if (!fs.existsSync(gitHooksDir)) {
      fs.mkdirSync(gitHooksDir, { recursive: true });
    }

    const preCommitHook = path.join(gitHooksDir, 'pre-commit');
    const hookContent = `#!/bin/sh
# Automatically bump unique version code before every commit
echo "[Hook] Auto-incrementing unique Version Code..."
node scripts/bump_version.js --from-hook
git add version/version.json package.json
`;

    fs.writeFileSync(preCommitHook, hookContent, { mode: 0o755 });
    console.log('[setup_hooks] Installed pre-commit hook in .git/hooks/pre-commit');
  } catch (err) {
    console.warn('[setup_hooks] Could not install git hook:', err.message);
  }
} else {
  // Not a git repository yet; hooks will be installed when git is initialized
}
