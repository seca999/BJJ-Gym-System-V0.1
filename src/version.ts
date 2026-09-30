import versionData from '../version/version.json';

export interface VersionInfo {
  version: string;
  versionCode?: number;
  buildNumber: string;
  buildTimestamp: string;
  commitHash?: string;
  gitTracked: boolean;
  gitBranch: string;
  databaseSeedVersion: string;
  releaseName: string;
  changelog: string[];
}

export const APP_VERSION_INFO: VersionInfo = versionData as VersionInfo;

export function getFormattedVersionTag(): string {
  const code = APP_VERSION_INFO.versionCode ? ` • Code ${APP_VERSION_INFO.versionCode}` : '';
  return `v${APP_VERSION_INFO.version} (Build ${APP_VERSION_INFO.buildNumber}${code})`;
}
