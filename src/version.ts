import versionData from '../version/version.json';

export interface VersionInfo {
  version: string;
  buildNumber: string;
  buildTimestamp: string;
  gitTracked: boolean;
  gitBranch: string;
  databaseSeedVersion: string;
  releaseName: string;
  changelog: string[];
}

export const APP_VERSION_INFO: VersionInfo = versionData as VersionInfo;

export function getFormattedVersionTag(): string {
  return `v${APP_VERSION_INFO.version} (Build ${APP_VERSION_INFO.buildNumber})`;
}
