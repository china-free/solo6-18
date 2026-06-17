export type DependencyType = 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';

export interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export interface ProjectInfo {
  name: string;
  path: string;
  packageJsonPath: string;
  version: string;
  dependencies: Record<DependencyType, Record<string, string>>;
}

export interface OutdatedDependency {
  name: string;
  currentVersion: string;
  latestVersion: string;
  type: DependencyType;
  projectName: string;
  projectPath: string;
  level: 'patch' | 'minor' | 'major' | 'unknown';
}

export interface SecurityVulnerability {
  name: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  vulnerableVersions: string;
  patchedVersions: string;
  projectName: string;
  projectPath: string;
  currentVersion: string;
}

export interface VersionConflict {
  packageName: string;
  versions: Array<{
    version: string;
    projectName: string;
    projectPath: string;
    type: DependencyType;
  }>;
}

export type FetchFailureReason =
  | 'network_error'
  | 'timeout'
  | 'http_error'
  | 'no_latest_version'
  | 'invalid_response';

export interface FetchFailure {
  packageName: string;
  reason: FetchFailureReason;
  detail: string;
}

export interface ScanReport {
  scanDate: string;
  scanPath: string;
  totalProjects: number;
  projects: ProjectInfo[];
  outdated: OutdatedDependency[];
  vulnerabilities: SecurityVulnerability[];
  conflicts: VersionConflict[];
  fetchFailures: FetchFailure[];
  summary: {
    totalDependencies: number;
    outdatedCount: number;
    vulnerabilityCount: number;
    conflictCount: number;
    fetchFailureCount: number;
    bySeverity: Record<string, number>;
    byDepType: Record<string, number>;
  };
}

export interface ScanOptions {
  path: string;
  ignorePatterns: string[];
  depTypes: DependencyType[];
  includeVulnerabilities: boolean;
  includeOutdated: boolean;
  includeConflicts: boolean;
  projectFilter?: string;
  packageFilter?: string;
}

export type OutputFormat = 'json' | 'markdown' | 'console';
