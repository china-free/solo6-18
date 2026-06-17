import * as fs from 'fs';
import * as path from 'path';
export class BaselineManager {
    saveBaseline(report, filePath) {
        const absolutePath = path.resolve(filePath);
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(absolutePath, JSON.stringify(report, null, 2), 'utf-8');
    }
    loadBaseline(filePath) {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`基线文件不存在: ${absolutePath}`);
        }
        const content = fs.readFileSync(absolutePath, 'utf-8');
        try {
            return JSON.parse(content);
        }
        catch {
            throw new Error(`基线文件格式无效: ${absolutePath}`);
        }
    }
    diff(baseline, current) {
        const outdatedDiff = this.diffOutdated(baseline.outdated, current.outdated);
        const vulnDiff = this.diffVulnerabilities(baseline.vulnerabilities, current.vulnerabilities);
        const conflictDiff = this.diffConflicts(baseline.conflicts, current.conflicts);
        const totalAdded = outdatedDiff.added.length + vulnDiff.added.length + conflictDiff.added.length;
        const totalRemoved = outdatedDiff.removed.length + vulnDiff.removed.length + conflictDiff.removed.length;
        let trend;
        if (totalAdded === 0 && totalRemoved === 0) {
            trend = 'stable';
        }
        else if (totalRemoved > totalAdded) {
            trend = 'improving';
        }
        else if (totalAdded > totalRemoved) {
            trend = 'regressing';
        }
        else {
            trend = 'mixed';
        }
        return {
            baselineDate: baseline.scanDate,
            currentDate: current.scanDate,
            outdated: outdatedDiff,
            vulnerabilities: vulnDiff,
            conflicts: conflictDiff,
            summary: {
                outdatedAdded: outdatedDiff.added.length,
                outdatedRemoved: outdatedDiff.removed.length,
                outdatedUnchanged: outdatedDiff.unchanged.length,
                vulnAdded: vulnDiff.added.length,
                vulnRemoved: vulnDiff.removed.length,
                vulnUnchanged: vulnDiff.unchanged.length,
                conflictAdded: conflictDiff.added.length,
                conflictRemoved: conflictDiff.removed.length,
                conflictUnchanged: conflictDiff.unchanged.length,
                trend
            }
        };
    }
    diffOutdated(baseline, current) {
        const baselineKeys = new Map();
        const currentKeys = new Map();
        for (const item of baseline) {
            baselineKeys.set(this.outdatedKey(item), item);
        }
        for (const item of current) {
            currentKeys.set(this.outdatedKey(item), item);
        }
        return this.computeDiff(baselineKeys, currentKeys);
    }
    diffVulnerabilities(baseline, current) {
        const baselineKeys = new Map();
        const currentKeys = new Map();
        for (const item of baseline) {
            baselineKeys.set(this.vulnKey(item), item);
        }
        for (const item of current) {
            currentKeys.set(this.vulnKey(item), item);
        }
        return this.computeDiff(baselineKeys, currentKeys);
    }
    diffConflicts(baseline, current) {
        const baselineKeys = new Map();
        const currentKeys = new Map();
        for (const item of baseline) {
            baselineKeys.set(this.conflictKey(item), item);
        }
        for (const item of current) {
            currentKeys.set(this.conflictKey(item), item);
        }
        return this.computeDiff(baselineKeys, currentKeys);
    }
    computeDiff(baselineMap, currentMap) {
        const added = [];
        const removed = [];
        const unchanged = [];
        for (const [key, item] of currentMap) {
            if (!baselineMap.has(key)) {
                added.push(item);
            }
            else {
                unchanged.push(item);
            }
        }
        for (const [key, item] of baselineMap) {
            if (!currentMap.has(key)) {
                removed.push(item);
            }
        }
        return { added, removed, unchanged };
    }
    outdatedKey(dep) {
        return `${dep.projectName}::${dep.name}::${dep.type}`;
    }
    vulnKey(vuln) {
        return `${vuln.projectName}::${vuln.name}::${vuln.title}`;
    }
    conflictKey(conflict) {
        const versionSig = conflict.versions
            .map(v => `${v.version}@${v.projectName}`)
            .sort()
            .join(',');
        return `${conflict.packageName}::${versionSig}`;
    }
}
//# sourceMappingURL=baseline.js.map