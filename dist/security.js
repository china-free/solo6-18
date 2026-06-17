import * as fs from 'fs';
import semver from 'semver';
const BUILTIN_VULNERABILITIES = [
    {
        name: 'lodash',
        severity: 'high',
        title: 'Prototype Pollution in lodash',
        vulnerableRange: '<4.17.21',
        patchedVersions: '>=4.17.21'
    },
    {
        name: 'minimist',
        severity: 'moderate',
        title: 'Prototype Pollution in minimist',
        vulnerableRange: '<1.2.6',
        patchedVersions: '>=1.2.6'
    },
    {
        name: 'json-schema',
        severity: 'high',
        title: 'Prototype Pollution in json-schema',
        vulnerableRange: '<0.4.0',
        patchedVersions: '>=0.4.0'
    },
    {
        name: 'glob-parent',
        severity: 'moderate',
        title: 'Regular Expression Denial of Service in glob-parent',
        vulnerableRange: '<5.1.2',
        patchedVersions: '>=5.1.2'
    },
    {
        name: 'path-parse',
        severity: 'moderate',
        title: 'Regular Expression Denial of Service in path-parse',
        vulnerableRange: '<1.0.7',
        patchedVersions: '>=1.0.7'
    },
    {
        name: 'ansi-regex',
        severity: 'moderate',
        title: 'Regular Expression Denial of Service in ansi-regex',
        vulnerableRange: '<5.0.1',
        patchedVersions: '>=5.0.1'
    },
    {
        name: 'yargs-parser',
        severity: 'moderate',
        title: 'Prototype Pollution in yargs-parser',
        vulnerableRange: '<13.1.2',
        patchedVersions: '>=13.1.2'
    },
    {
        name: 'dot-prop',
        severity: 'high',
        title: 'Prototype Pollution in dot-prop',
        vulnerableRange: '<5.1.1',
        patchedVersions: '>=5.1.1'
    },
    {
        name: 'set-value',
        severity: 'high',
        title: 'Prototype Pollution in set-value',
        vulnerableRange: '<2.0.1',
        patchedVersions: '>=2.0.1'
    },
    {
        name: 'mixin-deep',
        severity: 'critical',
        title: 'Prototype Pollution in mixin-deep',
        vulnerableRange: '<2.0.1',
        patchedVersions: '>=2.0.1'
    }
];
export class SecurityChecker {
    vulnerabilityDB;
    constructor(customVulnerabilities = []) {
        this.vulnerabilityDB = [...BUILTIN_VULNERABILITIES, ...customVulnerabilities];
    }
    loadVulnerabilitiesFromFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const vulns = JSON.parse(content);
            this.vulnerabilityDB = [...this.vulnerabilityDB, ...vulns];
        }
        catch (error) {
            console.warn(`无法加载漏洞数据库文件: ${filePath}`);
        }
    }
    checkVulnerabilities(projects, depTypes) {
        const vulnerabilities = [];
        for (const project of projects) {
            for (const type of depTypes) {
                const deps = project.dependencies[type] || {};
                for (const [name, versionRange] of Object.entries(deps)) {
                    const vulnEntries = this.vulnerabilityDB.filter(v => v.name === name);
                    if (vulnEntries.length === 0)
                        continue;
                    const currentVersion = this.extractVersion(versionRange);
                    if (!currentVersion)
                        continue;
                    for (const vulnEntry of vulnEntries) {
                        if (this.isVulnerable(currentVersion, vulnEntry.vulnerableRange)) {
                            vulnerabilities.push({
                                name,
                                severity: vulnEntry.severity,
                                title: vulnEntry.title,
                                vulnerableVersions: vulnEntry.vulnerableRange,
                                patchedVersions: vulnEntry.patchedVersions,
                                projectName: project.name,
                                projectPath: project.path,
                                currentVersion
                            });
                        }
                    }
                }
            }
        }
        const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
        return vulnerabilities.sort((a, b) => {
            const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (sevDiff !== 0)
                return sevDiff;
            return a.name.localeCompare(b.name);
        });
    }
    extractVersion(versionRange) {
        const cleaned = versionRange.trim();
        if (cleaned.startsWith('workspace:') ||
            cleaned.startsWith('file:') ||
            cleaned.startsWith('link:')) {
            return null;
        }
        const coerced = semver.coerce(cleaned);
        return coerced ? coerced.version : null;
    }
    isVulnerable(version, vulnerableRange) {
        try {
            return semver.satisfies(version, vulnerableRange);
        }
        catch {
            return false;
        }
    }
    getVulnerabilityCountBySeverity(vulns) {
        return vulns.reduce((acc, vuln) => {
            acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
            return acc;
        }, {});
    }
}
//# sourceMappingURL=security.js.map