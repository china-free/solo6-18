import { ScanReport } from './types.js';
export declare class ReportGenerator {
    toJson(report: ScanReport): string;
    toMarkdown(report: ScanReport): string;
    toConsole(report: ScanReport): string;
}
