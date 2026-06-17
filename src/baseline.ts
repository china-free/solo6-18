import * as fs from 'fs';
import * as path from 'path';
import {
  ScanReport,
  ScanBaselineDiff,
  BaselineDiff,
  OutdatedDependency,
  SecurityVulnerability,
  VersionConflict
} from './types.js';

export class BaselineManager {
  saveBaseline(report: ScanReport, filePath: string): void {
    const absolutePath = path.resolve(filePath);
    const dir = path.dirname(absolutePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(absolutePath, JSON.stringify(report, null, 2), 'utf-8');
  }

  loadBaseline(filePath: string): ScanReport {
    const absolutePath = path.resolve(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`基线文件不存在: ${absolutePath}`);
    }
    
    const content = fs.readFileSync(absolutePath, 'utf-8');
    
    try {
      return JSON.parse(content) as ScanReport;
    } catch {
      throw new Error(`基线文件格式无效: ${absolutePath}`);
    }
  }

  diff(baseline: ScanReport, current: ScanReport): ScanBaselineDiff {
    const outdatedDiff = this.diffOutdated(baseline.outdated, current.outdated);
    const vulnDiff = this.diffVulnerabilities(baseline.vulnerabilities, current.vulnerabilities);
    const conflictDiff = this.diffConflicts(baseline.conflicts, current.conflicts);

    const totalAdded = outdatedDiff.added.length + vulnDiff.added.length + conflictDiff.added.length;
    const totalRemoved = outdatedDiff.removed.length + vulnDiff.removed.length + conflictDiff.removed.length;

    let trend: ScanBaselineDiff['summary']['trend'];
    if (totalAdded === 0 && totalRemoved === 0) {
      trend = 'stable';
    } else if (totalRemoved > totalAdded) {
      trend = 'improving';
    } else if (totalAdded > totalRemoved) {
      trend = 'regressing';
    } else {
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

  private diffOutdated(
    baseline: OutdatedDependency[],
    current: OutdatedDependency[]
  ): BaselineDiff<OutdatedDependency> {
    const baselineKeys = new Map<string, OutdatedDependency>();
    const currentKeys = new Map<string, OutdatedDependency>();

    for (const item of baseline) {
      baselineKeys.set(this.outdatedKey(item), item);
    }
    for (const item of current) {
      currentKeys.set(this.outdatedKey(item), item);
    }

    return this.computeDiff(baselineKeys, currentKeys);
  }

  private diffVulnerabilities(
    baseline: SecurityVulnerability[],
    current: SecurityVulnerability[]
  ): BaselineDiff<SecurityVulnerability> {
    const baselineKeys = new Map<string, SecurityVulnerability>();
    const currentKeys = new Map<string, SecurityVulnerability>();

    for (const item of baseline) {
      baselineKeys.set(this.vulnKey(item), item);
    }
    for (const item of current) {
      currentKeys.set(this.vulnKey(item), item);
    }

    return this.computeDiff(baselineKeys, currentKeys);
  }

  private diffConflicts(
    baseline: VersionConflict[],
    current: VersionConflict[]
  ): BaselineDiff<VersionConflict> {
    const baselineKeys = new Map<string, VersionConflict>();
    const currentKeys = new Map<string, VersionConflict>();

    for (const item of baseline) {
      baselineKeys.set(this.conflictKey(item), item);
    }
    for (const item of current) {
      currentKeys.set(this.conflictKey(item), item);
    }

    return this.computeDiff(baselineKeys, currentKeys);
  }

  private computeDiff<T>(
    baselineMap: Map<string, T>,
    currentMap: Map<string, T>
  ): BaselineDiff<T> {
    const added: T[] = [];
    const removed: T[] = [];
    const unchanged: T[] = [];

    for (const [key, item] of currentMap) {
      if (!baselineMap.has(key)) {
        added.push(item);
      } else {
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

  private outdatedKey(dep: OutdatedDependency): string {
    return `${dep.projectName}::${dep.name}::${dep.type}`;
  }

  private vulnKey(vuln: SecurityVulnerability): string {
    return `${vuln.projectName}::${vuln.name}::${vuln.title}`;
  }

  private conflictKey(conflict: VersionConflict): string {
    const versionSig = conflict.versions
      .map(v => `${v.version}@${v.projectName}`)
      .sort()
      .join(',');
    return `${conflict.packageName}::${versionSig}`;
  }
}
