import { ProjectInfo, OutdatedDependency, DependencyType } from './types.js';
export declare class OutdatedChecker {
    private cache;
    private concurrency;
    constructor(concurrency?: number);
    checkOutdated(projects: ProjectInfo[], depTypes: DependencyType[]): Promise<OutdatedDependency[]>;
    private fetchLatestVersions;
    private fetchPackageInfo;
    private extractVersion;
    private getOutdatedLevel;
    clearCache(): void;
}
