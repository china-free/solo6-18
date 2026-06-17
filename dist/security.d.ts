import { ProjectInfo, SecurityVulnerability, DependencyType } from './types.js';
export interface VulnerabilityDBEntry {
    name: string;
    severity: 'low' | 'moderate' | 'high' | 'critical';
    title: string;
    vulnerableRange: string;
    patchedVersions: string;
    advisoryUrl?: string;
}
export declare class SecurityChecker {
    private vulnerabilityDB;
    constructor(customVulnerabilities?: VulnerabilityDBEntry[]);
    loadVulnerabilitiesFromFile(filePath: string): void;
    checkVulnerabilities(projects: ProjectInfo[], depTypes: DependencyType[]): SecurityVulnerability[];
    private extractVersion;
    private isVulnerable;
    getVulnerabilityCountBySeverity(vulns: SecurityVulnerability[]): Record<string, number>;
}
