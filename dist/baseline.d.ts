import { ScanReport, ScanBaselineDiff } from './types.js';
export declare class BaselineManager {
    saveBaseline(report: ScanReport, filePath: string): void;
    loadBaseline(filePath: string): ScanReport;
    diff(baseline: ScanReport, current: ScanReport): ScanBaselineDiff;
    private diffOutdated;
    private diffVulnerabilities;
    private diffConflicts;
    private computeDiff;
    private outdatedKey;
    private vulnKey;
    private conflictKey;
}
