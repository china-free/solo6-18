import semver from 'semver';
import { ProjectInfo, OutdatedDependency, DependencyType } from './types.js';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org';

interface PackageRegistryInfo {
  'dist-tags': {
    latest: string;
    [key: string]: string;
  };
  versions: string[];
  time?: Record<string, string>;
}

export class OutdatedChecker {
  private cache: Map<string, string> = new Map();
  private concurrency: number = 10;

  constructor(concurrency: number = 10) {
    this.concurrency = concurrency;
  }

  async checkOutdated(projects: ProjectInfo[], depTypes: DependencyType[]): Promise<OutdatedDependency[]> {
    const outdated: OutdatedDependency[] = [];
    const allPackages = new Set<string>();

    for (const project of projects) {
      for (const type of depTypes) {
        const deps = project.dependencies[type] || {};
        for (const name of Object.keys(deps)) {
          allPackages.add(name);
        }
      }
    }

    await this.fetchLatestVersions(Array.from(allPackages));

    for (const project of projects) {
      for (const type of depTypes) {
        const deps = project.dependencies[type] || {};
        for (const [name, versionRange] of Object.entries(deps)) {
          const latestVersion = this.cache.get(name);
          if (!latestVersion) continue;

          const currentVersion = this.extractVersion(versionRange);
          if (!currentVersion) continue;

          if (semver.lt(currentVersion, latestVersion)) {
            const level = this.getOutdatedLevel(currentVersion, latestVersion);
            outdated.push({
              name,
              currentVersion,
              latestVersion,
              type,
              projectName: project.name,
              projectPath: project.path,
              level
            });
          }
        }
      }
    }

    return outdated.sort((a, b) => {
      const levelOrder = { major: 0, minor: 1, patch: 2, unknown: 3 };
      const levelDiff = levelOrder[a.level] - levelOrder[b.level];
      if (levelDiff !== 0) return levelDiff;
      return a.name.localeCompare(b.name);
    });
  }

  private async fetchLatestVersions(packageNames: string[]): Promise<void> {
    const packagesToFetch = packageNames.filter(name => !this.cache.has(name));
    
    if (packagesToFetch.length === 0) return;

    const chunks: string[][] = [];
    for (let i = 0; i < packagesToFetch.length; i += this.concurrency) {
      chunks.push(packagesToFetch.slice(i, i + this.concurrency));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(pkg => this.fetchPackageInfo(pkg));
      await Promise.allSettled(promises);
    }
  }

  private async fetchPackageInfo(packageName: string): Promise<void> {
    try {
      const response = await fetch(`${NPM_REGISTRY_URL}/${encodeURIComponent(packageName)}`, {
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json() as PackageRegistryInfo;
      const latest = data['dist-tags']?.latest;
      
      if (latest) {
        this.cache.set(packageName, latest);
      }
    } catch {
      // Silently fail for network errors
    }
  }

  private extractVersion(versionRange: string): string | null {
    const cleaned = versionRange.trim();
    
    if (cleaned === '*' || cleaned === 'latest') {
      return null;
    }

    if (cleaned.startsWith('workspace:') || 
        cleaned.startsWith('file:') || 
        cleaned.startsWith('link:') ||
        cleaned.startsWith('npm:')) {
      return null;
    }

    if (cleaned.startsWith('git+') || cleaned.startsWith('git://') || cleaned.startsWith('http')) {
      return null;
    }

    const coerced = semver.coerce(cleaned);
    return coerced ? coerced.version : null;
  }

  private getOutdatedLevel(current: string, latest: string): 'patch' | 'minor' | 'major' | 'unknown' {
    try {
      const currentSemver = semver.parse(current);
      const latestSemver = semver.parse(latest);
      
      if (!currentSemver || !latestSemver) return 'unknown';

      if (latestSemver.major > currentSemver.major) return 'major';
      if (latestSemver.minor > currentSemver.minor) return 'minor';
      if (latestSemver.patch > currentSemver.patch) return 'patch';
      
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}
