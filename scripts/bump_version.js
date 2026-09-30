/**
 * Automated Version Code Generator and Bumper
 * Generates unique monotonic version codes, build numbers, and commit metadata
 * for seamless current vs remote version comparisons.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const versionJsonPath = path.join(rootDir, 'version', 'version.json');
const packageJsonPath = path.join(rootDir, 'package.json');

function getGitCommitSha() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    if (sha && sha.length >= 4) return sha;
  } catch {
    // ignore
  }
  // Fallback unique 7-character hash based on timestamp
  return Math.random().toString(36).substring(2, 9);
}

function getGitCommitCount() {
  try {
    const count = execSync('git rev-list --count HEAD', { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const parsed = parseInt(count, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  } catch {
    // ignore
  }
  return 0;
}

function bumpVersion(changelogEntry) {
  let versionData = {
    version: '1.2.0',
    versionCode: 102,
    buildNumber: '2026.09.24.102',
    buildTimestamp: new Date().toISOString(),
    commitHash: '',
    gitTracked: true,
    gitBranch: 'main',
    databaseSeedVersion: 'v7_ravens_canonical',
    releaseName: 'Ravens BJJ Academy — GitHub Portable Release',
    changelog: [],
  };

  if (fs.existsSync(versionJsonPath)) {
    try {
      const raw = fs.readFileSync(versionJsonPath, 'utf8');
      versionData = { ...versionData, ...JSON.parse(raw) };
    } catch (e) {
      console.warn('Could not parse existing version.json, initializing defaults:', e.message);
    }
  }

  // Calculate new monotonic unique version code
  const currentCode = typeof versionData.versionCode === 'number' ? versionData.versionCode : 102;
  const commitCount = getGitCommitCount();
  const nextCode = Math.max(currentCode + 1, commitCount > 0 ? commitCount + 100 : 0);

  // Build semantic version: 1.2.<nextCode - 100>
  const patchNum = Math.max(1, nextCode - 101);
  const nextSemver = `1.2.${patchNum}`;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const nextBuildNumber = `${yyyy}.${mm}.${dd}.${nextCode}`;
  const commitSha = getGitCommitSha();

  versionData.version = nextSemver;
  versionData.versionCode = nextCode;
  versionData.buildNumber = nextBuildNumber;
  versionData.buildTimestamp = today.toISOString();
  versionData.commitHash = commitSha;
  versionData.releaseName = `Ravens BJJ Academy v${nextSemver} (Build ${nextCode})`;

  if (changelogEntry && typeof changelogEntry === 'string' && changelogEntry.trim()) {
    if (!Array.isArray(versionData.changelog)) {
      versionData.changelog = [];
    }
    versionData.changelog.unshift(changelogEntry.trim());
  }

  // Ensure version directory exists
  const versionDir = path.dirname(versionJsonPath);
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }

  // Write updated version.json
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n', 'utf8');

  // Also sync package.json version
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      pkg.version = nextSemver;
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    } catch {
      // ignore
    }
  }

  console.log(`\x1b[32m✔ Version Code Bumped Successfully!\x1b[0m`);
  console.log(`  • Version:      v${versionData.version}`);
  console.log(`  • Version Code: ${versionData.versionCode} (previous: ${currentCode})`);
  console.log(`  • Build Number: ${versionData.buildNumber}`);
  console.log(`  • Timestamp:    ${versionData.buildTimestamp}`);
  console.log(`  • Commit SHA:   ${versionData.commitHash}`);

  return versionData;
}

const args = process.argv.slice(2);
const changelogArg = args.find((a) => a.startsWith('--message='))?.split('=')[1] || args[0];
bumpVersion(changelogArg);
