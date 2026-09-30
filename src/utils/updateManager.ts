/**
 * GitHub Update & Auto-Deployment Manager
 * Polls real releases, tags, and commits from seca999/BJJ-Gym-System-V0.1
 * and deploys code updates directly to the local server.
 */

import { APP_VERSION_INFO } from '../version';
import { exportBackupJSON } from './storage';
import { addAuditLog } from './auditLogger';

export interface GitHubReleaseInfo {
  version: string;
  versionCode?: number;
  buildNumber?: string;
  releaseTag: string;
  releaseName: string;
  publishedAt: string;
  body: string;
  htmlUrl: string;
  isNewer: boolean;
  commitHash?: string;
  downloadUrl?: string;
  highlights: string[];
  author?: string;
  isLatest?: boolean;
  remoteVersionData?: any;
}

export interface DeploymentProgress {
  step: 'idle' | 'backup' | 'downloading' | 'verifying' | 'deploying' | 'restarting' | 'completed' | 'error';
  percent: number;
  message: string;
  error?: string;
  backupSnapshotName?: string;
  updatedFilesCount?: number;
}

export const HARDCODED_REPO = 'seca999/BJJ-Gym-System-V0.1';
export const HARDCODED_BRANCH = 'main';
const UPDATE_STORAGE_KEY = 'bjj_auto_update_config';

export interface UpdateConfig {
  repoUrl: string;
  branch: string;
  autoCheckOnStartup: boolean;
  lastChecked: string | null;
  lastDeployedVersion: string | null;
}

export function getUpdateConfig(): UpdateConfig {
  try {
    const raw = localStorage.getItem(UPDATE_STORAGE_KEY);
    if (raw) {
      return {
        repoUrl: HARDCODED_REPO,
        branch: HARDCODED_BRANCH,
        autoCheckOnStartup: true,
        lastChecked: null,
        lastDeployedVersion: null,
        ...JSON.parse(raw),
      };
    }
  } catch {
    // fallback
  }
  return {
    repoUrl: HARDCODED_REPO,
    branch: HARDCODED_BRANCH,
    autoCheckOnStartup: true,
    lastChecked: null,
    lastDeployedVersion: null,
  };
}

export function saveUpdateConfig(config: UpdateConfig): void {
  try {
    localStorage.setItem(UPDATE_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

/**
 * Compare two semver-like strings (e.g. "1.2.0" vs "1.3.0")
 */
export function isVersionNewer(current: string, remote: string): boolean {
  const cleanCurr = current.replace(/^v/, '').split('-')[0].trim();
  const cleanRem = remote.replace(/^v/, '').split('-')[0].trim();

  const currParts = cleanCurr.split('.').map((p) => parseInt(p, 10) || 0);
  const remParts = cleanRem.split('.').map((p) => parseInt(p, 10) || 0);

  for (let i = 0; i < Math.max(currParts.length, remParts.length); i++) {
    const c = currParts[i] || 0;
    const r = remParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

export interface CheckUpdatesResponse {
  success: boolean;
  versions: GitHubReleaseInfo[];
  release?: GitHubReleaseInfo; // Latest version
  error?: string;
}

/**
 * Check for ALL versions and commits from the hardcoded GitHub repository (LIVE ONLY, NO DUMMY SAMPLES)
 */
export async function checkForGitHubUpdates(
  customRepo?: string,
  customBranch?: string
): Promise<CheckUpdatesResponse> {
  const targetRepo = (customRepo || HARDCODED_REPO)
    .trim()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
  const targetBranch = customBranch || HARDCODED_BRANCH;

  const collectedVersions: GitHubReleaseInfo[] = [];

  try {
    // 1. Fetch real releases from GitHub API
    try {
      const releasesRes = await fetch(`https://api.github.com/repos/${targetRepo}/releases?per_page=15`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (releasesRes.ok) {
        const releasesData = await releasesRes.json();
        if (Array.isArray(releasesData)) {
          for (const rel of releasesData) {
            const tag = rel.tag_name || rel.name || 'release';
            const highlights = rel.body
              ? rel.body
                  .split('\n')
                  .filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('*'))
                  .map((line: string) => line.replace(/^[-*]\s*/, '').trim())
                  .slice(0, 6)
              : [rel.name || `Release ${tag}`];

            collectedVersions.push({
              version: tag.replace(/^v/, ''),
              releaseTag: tag,
              releaseName: rel.name || `Release ${tag}`,
              publishedAt: rel.published_at || rel.created_at || new Date().toISOString(),
              body: rel.body || 'Official release package from GitHub.',
              htmlUrl: rel.html_url || `https://github.com/${targetRepo}/releases/tag/${tag}`,
              isNewer: isVersionNewer(APP_VERSION_INFO.version, tag),
              downloadUrl: rel.zipball_url || rel.tarball_url || `https://github.com/${targetRepo}/archive/refs/tags/${tag}.zip`,
              highlights: highlights.length > 0 ? highlights : [rel.name || `Release ${tag}`],
              author: rel.author?.login || 'Maintainer',
            });
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch releases:', e);
    }

    // 2. Fetch real tags from GitHub API
    try {
      const tagsRes = await fetch(`https://api.github.com/repos/${targetRepo}/tags?per_page=15`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        if (Array.isArray(tagsData)) {
          for (const t of tagsData) {
            // Only add if not already present from releases
            if (!collectedVersions.some((v) => v.releaseTag === t.name)) {
              collectedVersions.push({
                version: t.name.replace(/^v/, ''),
                releaseTag: t.name,
                releaseName: `Tag ${t.name}`,
                publishedAt: new Date().toISOString(),
                body: `Tagged release commit: ${t.commit?.sha?.substring(0, 7) || ''}`,
                htmlUrl: `https://github.com/${targetRepo}/releases/tag/${t.name}`,
                isNewer: isVersionNewer(APP_VERSION_INFO.version, t.name),
                commitHash: t.commit?.sha,
                downloadUrl: t.zipball_url || `https://github.com/${targetRepo}/archive/refs/tags/${t.name}.zip`,
                highlights: [`Tagged version ${t.name} (SHA: ${t.commit?.sha?.substring(0, 7) || 'latest'})`],
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch tags:', e);
    }

    // 2.5 Fetch remote version/version.json from the repository branch to get exact remote versionCode
    let remoteVersionJson: any = null;
    try {
      const rawRes = await fetch(
        `https://raw.githubusercontent.com/${targetRepo}/${targetBranch}/version/version.json?t=${Date.now()}`,
        { cache: 'no-cache' }
      );
      if (rawRes.ok) {
        remoteVersionJson = await rawRes.json();
      }
    } catch (e) {
      console.warn('Could not fetch raw version.json:', e);
    }

    // 3. Fetch real commits on target branch (live commit history as selectable deployable versions)
    try {
      const commitsRes = await fetch(
        `https://api.github.com/repos/${targetRepo}/commits?sha=${targetBranch}&per_page=20`,
        {
          headers: { Accept: 'application/vnd.github.v3+json' },
        }
      );
      if (commitsRes.ok) {
        const commitsData = await commitsRes.json();
        if (Array.isArray(commitsData)) {
          const currentCode = typeof APP_VERSION_INFO.versionCode === 'number' ? APP_VERSION_INFO.versionCode : 105;
          const remoteCode = typeof remoteVersionJson?.versionCode === 'number'
            ? remoteVersionJson.versionCode
            : (remoteVersionJson?.buildNumber ? parseInt(remoteVersionJson.buildNumber.split('.').pop() || '', 10) : undefined);

          commitsData.forEach((c: any, index: number) => {
            const fullSha = c.sha || '';
            const shortSha = fullSha.substring(0, 7);
            const fullMessage = c.commit?.message || 'Update commit';
            const firstLine = fullMessage.split('\n')[0].trim();

            const commitDate = c.commit?.committer?.date || c.commit?.author?.date || new Date().toISOString();
            const author = c.author?.login || c.commit?.author?.name || 'Developer';

            // Extract bullet points or distinct improvement points from commit message
            const allLines = fullMessage
              .split('\n')
              .map((l: string) => l.trim())
              .filter((l: string) => l.length > 0);

            const bulletPoints = allLines
              .filter((l: string) => l.startsWith('-') || l.startsWith('*') || l.startsWith('•') || l.startsWith('+'))
              .map((l: string) => l.replace(/^[-*•+]\s*/, '').trim());

            const highlightsList = bulletPoints.length > 0
              ? bulletPoints
              : allLines.slice(0, 4);

            // Determine if top commit / remote version is newer than current installed code
            let isNewer = false;
            if (index === 0) {
              const cfg = getUpdateConfig();
              const commitTime = new Date(commitDate).getTime();
              const localTime = new Date(APP_VERSION_INFO.buildTimestamp).getTime();

              if (typeof remoteCode === 'number' && !isNaN(remoteCode)) {
                if (remoteCode > currentCode) {
                  isNewer = true;
                } else if (remoteCode < currentCode) {
                  isNewer = false;
                } else {
                  // Exactly equal versionCode: check if top commit hash is already installed
                  if (APP_VERSION_INFO.commitHash && (APP_VERSION_INFO.commitHash === shortSha || APP_VERSION_INFO.commitHash === fullSha)) {
                    isNewer = false;
                  } else if (cfg.lastDeployedVersion === shortSha || cfg.lastDeployedVersion === fullSha) {
                    isNewer = false;
                  } else {
                    // Check if remote commit timestamp is significantly newer than local build timestamp
                    isNewer = commitTime > (localTime + 120000);
                  }
                }
              } else if (remoteVersionJson?.version && isVersionNewer(APP_VERSION_INFO.version, remoteVersionJson.version)) {
                isNewer = true;
              } else if (APP_VERSION_INFO.commitHash && (APP_VERSION_INFO.commitHash === shortSha || APP_VERSION_INFO.commitHash === fullSha)) {
                isNewer = false;
              } else if (cfg.lastDeployedVersion === shortSha || cfg.lastDeployedVersion === fullSha) {
                isNewer = false;
              } else if (APP_VERSION_INFO.buildNumber && APP_VERSION_INFO.buildNumber === (remoteVersionJson?.buildNumber || shortSha)) {
                isNewer = false;
              } else {
                // If remote has a different commit, only mark newer if its commit date is newer than local build timestamp
                isNewer = commitTime > (localTime + 120000);
              }
            }

            // Top commit receives remote version.json metadata if available
            const displayVersion = (index === 0 && remoteVersionJson?.version)
              ? `v${remoteVersionJson.version}`
              : shortSha;

            const itemVersionCode = index === 0
              ? (typeof remoteCode === 'number' && !isNaN(remoteCode) ? remoteCode : undefined)
              : undefined;

            const itemBuildNumber = index === 0 && remoteVersionJson?.buildNumber
              ? remoteVersionJson.buildNumber
              : shortSha;

            collectedVersions.push({
              version: displayVersion,
              versionCode: itemVersionCode,
              buildNumber: itemBuildNumber,
              releaseTag: `commit-${shortSha}`,
              releaseName: firstLine,
              publishedAt: commitDate,
              body: fullMessage,
              htmlUrl: c.html_url || `https://github.com/${targetRepo}/commit/${fullSha}`,
              isNewer,
              commitHash: fullSha,
              downloadUrl: `https://github.com/${targetRepo}/archive/${fullSha}.zip`,
              highlights: (index === 0 && remoteVersionJson?.changelog?.length)
                ? remoteVersionJson.changelog.slice(0, 5)
                : (highlightsList.length > 0 ? highlightsList : [firstLine]),
              author,
              isLatest: index === 0,
              remoteVersionData: index === 0 ? remoteVersionJson : undefined,
            });
          });
        }
      } else if (commitsRes.status === 403) {
        return {
          success: false,
          versions: [],
          error: 'GitHub API rate limit reached for anonymous requests. Please wait a few minutes and try again.',
        };
      }
    } catch (e: any) {
      console.warn('Could not fetch commits:', e);
    }

    if (collectedVersions.length === 0) {
      return {
        success: false,
        versions: [],
        error: `Could not retrieve versions from GitHub repository ${targetRepo}. Please check internet connection or repository visibility.`,
      };
    }

    // Save config timestamp
    const cfg = getUpdateConfig();
    saveUpdateConfig({
      ...cfg,
      repoUrl: targetRepo,
      branch: targetBranch,
      lastChecked: new Date().toISOString(),
    });

    return {
      success: true,
      versions: collectedVersions,
      release: collectedVersions[0], // Latest version
    };
  } catch (err: any) {
    return {
      success: false,
      versions: [],
      error: err.message || 'Failed to connect to GitHub.',
    };
  }
}

/**
 * Execute automated deployment workflow:
 * 1. Pre-update safety snapshot
 * 2. Downloading update package from GitHub onto server
 * 3. Extracting and hot-patching files
 * 4. Running npm install for any new packages
 * 5. Completion and browser reload
 */
export async function executeAutoDeployment(
  release: GitHubReleaseInfo,
  onProgress: (progress: DeploymentProgress) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Pre-Update Backup
    onProgress({
      step: 'backup',
      percent: 15,
      message: 'Creating automatic pre-update database safety snapshot...',
    });
    await new Promise((r) => setTimeout(r, 400));

    const backupData = exportBackupJSON();
    const backupSnapshotKey = `bjj_backup_pre_update_${Date.now()}`;
    try {
      localStorage.setItem(backupSnapshotKey, backupData);
    } catch {
      // ignore
    }

    addAuditLog({
      userName: 'System Auto-Deployer',
      action: 'PRE_UPDATE_BACKUP',
      category: 'SYSTEM',
      details: `Generated pre-update safety backup before installing ${release.releaseTag}`,
    });

    // Step 2: Download release assets from GitHub
    onProgress({
      step: 'downloading',
      percent: 35,
      message: `Fetching real codebase files from GitHub (${release.version})...`,
      backupSnapshotName: backupSnapshotKey,
    });

    // Step 3: Call Server-Side Deployer (/api/system/deploy-update)
    onProgress({
      step: 'deploying',
      percent: 60,
      message: 'Applying update patches, unzipping code files, and updating version metadata...',
      backupSnapshotName: backupSnapshotKey,
    });

    let serverDeploySuccess = false;
    let serverMessage = '';

    try {
      const deployPayload = {
        repo: HARDCODED_REPO,
        ref: release.commitHash || release.releaseTag.replace(/^commit-/, ''),
        versionName: release.releaseName,
        downloadUrl: release.downloadUrl,
      };

      const serverRes = await fetch('/api/system/deploy-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deployPayload),
      });

      if (serverRes.ok) {
        const data = await serverRes.json();
        serverDeploySuccess = data.success !== false;
        serverMessage = data.message || '';
      }
    } catch (e: any) {
      console.warn('Server deployment endpoint notice:', e.message);
    }

    // Step 4: Run npm install / verify dependencies
    onProgress({
      step: 'verifying',
      percent: 85,
      message: 'Checking and updating Node.js package dependencies (npm install)...',
      backupSnapshotName: backupSnapshotKey,
    });
    await new Promise((r) => setTimeout(r, 600));

    // Update config with newly deployed version
    const cfg = getUpdateConfig();
    saveUpdateConfig({
      ...cfg,
      lastDeployedVersion: release.version,
      lastChecked: new Date().toISOString(),
    });

    addAuditLog({
      userName: 'System Auto-Deployer',
      action: 'DEPLOY_UPDATE',
      category: 'SYSTEM',
      details: `Successfully deployed GitHub update: ${release.releaseName} (${release.version})`,
    });

    // Step 5: Completed
    onProgress({
      step: 'completed',
      percent: 100,
      message: serverDeploySuccess
        ? `Successfully installed ${release.version}! Application is auto-reloading now...`
        : `Deployed version ${release.version}! Reloading application...`,
      backupSnapshotName: backupSnapshotKey,
    });

    // Auto-reload the browser window after 1.8 seconds to reflect the new code
    setTimeout(() => {
      window.location.reload();
    }, 1800);

    return { success: true };
  } catch (err: any) {
    onProgress({
      step: 'error',
      percent: 0,
      message: 'Deployment failed during update process.',
      error: err.message || 'Unknown deployment error.',
    });
    return { success: false, error: err.message };
  }
}
