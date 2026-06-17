import semver from 'semver';
const NPM_REGISTRY_URL = 'https://registry.npmjs.org';
export class OutdatedChecker {
    cache = new Map();
    concurrency = 10;
    constructor(concurrency = 10) {
        this.concurrency = concurrency;
    }
    async checkOutdated(projects, depTypes) {
        const outdated = [];
        const allPackages = new Set();
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
                    if (!latestVersion)
                        continue;
                    const currentVersion = this.extractVersion(versionRange);
                    if (!currentVersion)
                        continue;
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
            if (levelDiff !== 0)
                return levelDiff;
            return a.name.localeCompare(b.name);
        });
    }
    async fetchLatestVersions(packageNames) {
        const packagesToFetch = packageNames.filter(name => !this.cache.has(name));
        if (packagesToFetch.length === 0)
            return;
        const chunks = [];
        for (let i = 0; i < packagesToFetch.length; i += this.concurrency) {
            chunks.push(packagesToFetch.slice(i, i + this.concurrency));
        }
        for (const chunk of chunks) {
            const promises = chunk.map(pkg => this.fetchPackageInfo(pkg));
            await Promise.allSettled(promises);
        }
    }
    async fetchPackageInfo(packageName) {
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
            const data = await response.json();
            const latest = data['dist-tags']?.latest;
            if (latest) {
                this.cache.set(packageName, latest);
            }
        }
        catch {
            // Silently fail for network errors
        }
    }
    extractVersion(versionRange) {
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
    getOutdatedLevel(current, latest) {
        try {
            const currentSemver = semver.parse(current);
            const latestSemver = semver.parse(latest);
            if (!currentSemver || !latestSemver)
                return 'unknown';
            if (latestSemver.major > currentSemver.major)
                return 'major';
            if (latestSemver.minor > currentSemver.minor)
                return 'minor';
            if (latestSemver.patch > currentSemver.patch)
                return 'patch';
            return 'unknown';
        }
        catch {
            return 'unknown';
        }
    }
    clearCache() {
        this.cache.clear();
    }
}
//# sourceMappingURL=outdated.js.map