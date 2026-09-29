import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, execSync } from 'child_process';
import { getRepoDatabasePaths } from './localDbService';

export interface DeployRequest {
  repo: string;
  ref: string;
  versionName?: string;
  downloadUrl?: string;
}

export interface DeployResult {
  success: boolean;
  message: string;
  backupPath?: string;
  updatedFilesCount?: number;
  error?: string;
}

/**
 * Hardcoded canonical repository for Ravens BJJ Academy
 */
export const HARDCODED_REPO = 'seca999/BJJ-Gym-System-V0.1';
export const HARDCODED_BRANCH = 'main';

/**
 * Perform server-side deployment of code updates from GitHub
 */
export async function deployUpdateOnServer(req: DeployRequest): Promise<DeployResult> {
  const rootDir = process.cwd();
  const repo = (req.repo || HARDCODED_REPO).replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').trim();
  const ref = req.ref || HARDCODED_BRANCH;

  console.log(`[UpdateService] Starting deployment for ${repo} at ref ${ref}...`);

  // 1. Create Pre-Update Safety Backup
  let backupPath = '';
  try {
    const backupDir = path.join(rootDir, 'database', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    backupPath = path.join(backupDir, `bjj_backup_${timestamp}`);
    fs.mkdirSync(backupPath, { recursive: true });

    // Copy live database and json data
    const repoPaths = getRepoDatabasePaths();
    if (fs.existsSync(repoPaths.dbSqlite)) {
      fs.copyFileSync(repoPaths.dbSqlite, path.join(backupPath, 'bjj_master.db'));
    }
    if (fs.existsSync(repoPaths.srcJson)) {
      fs.copyFileSync(repoPaths.srcJson, path.join(backupPath, 'academy_database.json'));
    }
    console.log(`[UpdateService] Created safety backup at ${backupPath}`);
  } catch (err: any) {
    console.warn(`[UpdateService] Safety backup notice:`, err.message);
  }

  // 2. Download ZIP from GitHub
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bjj-deploy-'));
  const zipFilePath = path.join(tempDir, 'update.zip');
  const extractDirPath = path.join(tempDir, 'extracted');
  fs.mkdirSync(extractDirPath, { recursive: true });

  const downloadUrls = [
    req.downloadUrl,
    `https://codeload.github.com/${repo}/zip/${ref}`,
    `https://github.com/${repo}/archive/${ref}.zip`,
    `https://github.com/${repo}/archive/refs/heads/${ref}.zip`,
  ].filter(Boolean) as string[];

  let downloadSuccess = false;
  for (const url of downloadUrls) {
    try {
      console.log(`[UpdateService] Trying to download from: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Ravens-BJJ-Academy-AutoDeployer',
          Accept: 'application/vnd.github.v3+json, application/zip, */*',
        },
      });

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > 1000) {
          fs.writeFileSync(zipFilePath, Buffer.from(buffer));
          console.log(`[UpdateService] Successfully downloaded ${buffer.byteLength} bytes.`);
          downloadSuccess = true;
          break;
        }
      }
    } catch (e: any) {
      console.warn(`[UpdateService] Download failed from ${url}:`, e.message);
    }
  }

  if (!downloadSuccess || !fs.existsSync(zipFilePath)) {
    return {
      success: false,
      message: `Failed to download update package from GitHub for ${repo} (${ref}). Please check network connectivity.`,
      backupPath,
    };
  }

  // 3. Extract the ZIP archive
  let extractSuccess = false;
  const isWindows = process.platform === 'win32';

  try {
    if (isWindows) {
      try {
        execSync(`tar -xf "${zipFilePath}" -C "${extractDirPath}"`, { stdio: 'ignore' });
        extractSuccess = true;
      } catch {
        execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '${zipFilePath}' -DestinationPath '${extractDirPath}' -Force"`, { stdio: 'ignore' });
        extractSuccess = true;
      }
    } else {
      try {
        execSync(`unzip -q -o "${zipFilePath}" -d "${extractDirPath}"`, { stdio: 'ignore' });
        extractSuccess = true;
      } catch {
        execSync(`tar -xf "${zipFilePath}" -C "${extractDirPath}"`, { stdio: 'ignore' });
        extractSuccess = true;
      }
    }
  } catch (extractErr: any) {
    console.error(`[UpdateService] Extraction failed:`, extractErr.message);
    return {
      success: false,
      message: `Failed to extract update package: ${extractErr.message}`,
      backupPath,
    };
  }

  // Find inner extracted folder
  const innerItems = fs.readdirSync(extractDirPath);
  let sourceDir = extractDirPath;
  if (innerItems.length === 1) {
    const singleChild = path.join(extractDirPath, innerItems[0]);
    if (fs.statSync(singleChild).isDirectory()) {
      sourceDir = singleChild;
    }
  }

  // 4. Copy updated files into project root (preserving .git, node_modules, database live data, .env)
  let updatedFilesCount = 0;
  const protectedPaths = new Set([
    '.git',
    'node_modules',
    'database/bjj_master.db',
    'database/bjj_master.sqlite',
    'database/bjj_master.json',
    'start_app.bat',
    'stop_app.bat',
    '.env',
  ]);

  function copyRecursive(src: string, dest: string, relPath: string = '') {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcItem = path.join(src, entry.name);
      const currentRel = relPath ? `${relPath}/${entry.name}` : entry.name;
      const destItem = path.join(dest, entry.name);

      if (protectedPaths.has(currentRel) || currentRel.startsWith('.git/') || currentRel.startsWith('node_modules/')) {
        continue;
      }

      if (entry.isDirectory()) {
        if (!fs.existsSync(destItem)) {
          fs.mkdirSync(destItem, { recursive: true });
        }
        copyRecursive(srcItem, destItem, currentRel);
      } else if (entry.isFile()) {
        // Never overwrite live user SQLite database if it already exists
        if (currentRel.endsWith('.db') && fs.existsSync(destItem)) {
          continue;
        }
        fs.copyFileSync(srcItem, destItem);
        updatedFilesCount++;
      }
    }
  }

  try {
    copyRecursive(sourceDir, rootDir);
    console.log(`[UpdateService] Successfully updated ${updatedFilesCount} files.`);
  } catch (copyErr: any) {
    return {
      success: false,
      message: `Failed to copy updated files: ${copyErr.message}`,
      backupPath,
    };
  }

  // Clean temp folder
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}

  // 5. Update version.json with the deployed commit details
  try {
    const versionJsonPath = path.join(rootDir, 'version', 'version.json');
    let currentVersionData: any = {};
    if (fs.existsSync(versionJsonPath)) {
      try {
        currentVersionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
      } catch {}
    }
    const shortRef = ref.length > 12 ? ref.substring(0, 7) : ref;
    currentVersionData.buildNumber = `git-${shortRef}`;
    currentVersionData.buildTimestamp = new Date().toISOString();
    currentVersionData.releaseName = req.versionName || `GitHub Update (${shortRef})`;
    currentVersionData.gitBranch = HARDCODED_BRANCH;
    fs.writeFileSync(versionJsonPath, JSON.stringify(currentVersionData, null, 2), 'utf8');
  } catch (err: any) {
    console.warn(`[UpdateService] Failed to update version.json:`, err.message);
  }

  // 6. Run npm install if package.json exists to ensure new packages are installed
  try {
    console.log(`[UpdateService] Triggering npm install to verify dependencies...`);
    const npmCmd = isWindows ? 'npm.cmd install --no-audit --no-fund' : 'npm install --no-audit --no-fund';
    exec(npmCmd, { cwd: rootDir }, (err, stdout, stderr) => {
      if (err) {
        console.warn(`[UpdateService] npm install warning:`, err.message);
      } else {
        console.log(`[UpdateService] npm install finished successfully.`);
      }
    });
  } catch (npmErr: any) {
    console.warn(`[UpdateService] npm install trigger notice:`, npmErr.message);
  }

  return {
    success: true,
    message: `Version ${ref.substring(0, 7)} successfully deployed! Updated ${updatedFilesCount} files.`,
    backupPath,
    updatedFilesCount,
  };
}
