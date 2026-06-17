import { ProjectInfo, OutdatedDependency, DependencyType, FetchFailure } from './types.js';
export interface OutdatedResult {
    outdated: OutdatedDependency[];
    fetchFailures: FetchFailure[];
}
export declare class OutdatedChecker {
    private cache;
    private failures;
    private concurrency;
    constructor(concurrency?: number);
    checkOutdated(projects: ProjectInfo[], depTypes: DependencyType[]): Promise<OutdatedResult>;
    private fetchLatestVersions;
    private fetchPackageInfo;
    private recordFailure;
    private extractVersion;
    private getOutdatedLevel;
    clearCache(): void;
}
