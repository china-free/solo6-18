import semver from 'semver';
export class ConflictDetector {
    detectConflicts(projects, depTypes) {
        const packageMap = new Map();
        for (const project of projects) {
            for (const type of depTypes) {
                const deps = project.dependencies[type] || {};
                for (const [name, versionRange] of Object.entries(deps)) {
                    const normalizedVersion = this.normalizeVersion(versionRange);
                    if (!normalizedVersion)
                        continue;
                    if (!packageMap.has(name)) {
                        packageMap.set(name, new Map());
                    }
                    const versionMap = packageMap.get(name);
                    if (!versionMap.has(normalizedVersion)) {
                        versionMap.set(normalizedVersion, []);
                    }
                    versionMap.get(normalizedVersion).push({
                        projectName: project.name,
                        projectPath: project.path,
                        type
                    });
                }
            }
        }
        const conflicts = [];
        for (const [packageName, versionMap] of packageMap) {
            if (versionMap.size > 1) {
                const versions = Array.from(versionMap.entries())
                    .map(([version, usages]) => usages.map(u => ({
                    version,
                    projectName: u.projectName,
                    projectPath: u.projectPath,
                    type: u.type
                })))
                    .flat()
                    .sort((a, b) => {
                    const va = semver.coerce(a.version);
                    const vb = semver.coerce(b.version);
                    if (va && vb) {
                        return semver.rcompare(va.version, vb.version);
                    }
                    return a.version.localeCompare(b.version);
                });
                conflicts.push({
                    packageName,
                    versions
                });
            }
        }
        return conflicts.sort((a, b) => {
            const uniqueVersionsA = new Set(a.versions.map(v => v.version)).size;
            const uniqueVersionsB = new Set(b.versions.map(v => v.version)).size;
            if (uniqueVersionsB !== uniqueVersionsA) {
                return uniqueVersionsB - uniqueVersionsA;
            }
            return a.packageName.localeCompare(b.packageName);
        });
    }
    normalizeVersion(versionRange) {
        const cleaned = versionRange.trim();
        if (cleaned.startsWith('workspace:') ||
            cleaned.startsWith('file:') ||
            cleaned.startsWith('link:') ||
            cleaned.startsWith('npm:')) {
            return null;
        }
        if (cleaned.startsWith('git+') || cleaned.startsWith('git://') || cleaned.startsWith('http')) {
            return null;
        }
        if (cleaned === '*' || cleaned === 'latest') {
            return null;
        }
        const coerced = semver.coerce(cleaned);
        return coerced ? coerced.version : null;
    }
    getConflictStats(conflicts) {
        const totalPackages = conflicts.length;
        let totalVersions = 0;
        for (const conflict of conflicts) {
            totalVersions += new Set(conflict.versions.map(v => v.version)).size;
        }
        return {
            totalConflicts: conflicts.length,
            totalPackages,
            avgVersionsPerPackage: totalPackages > 0 ? totalVersions / totalPackages : 0
        };
    }
}
//# sourceMappingURL=conflicts.js.map