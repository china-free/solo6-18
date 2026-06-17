import { ScanReport, ScanBaselineDiff } from './types.js';
export declare class ReportGenerator {
    toJson(report: ScanReport): string;
    toMarkdown(report: ScanReport): string;
    toConsole(report: ScanReport): string;
    diffToJson(diff: ScanBaselineDiff): string;
    diffToMarkdown(diff: ScanBaselineDiff): string;
    private renderOutdatedDiffMarkdown;
    private renderVulnDiffMarkdown;
    private renderConflictDiffMarkdown;
    diffToConsole(diff: ScanBaselineDiff): string;
}
