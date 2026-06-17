import { ProjectInfo, VersionConflict, DependencyType } from './types.js';
export declare class ConflictDetector {
    detectConflicts(projects: ProjectInfo[], depTypes: DependencyType[]): VersionConflict[];
    private normalizeVersion;
    getConflictStats(conflicts: VersionConflict[]): {
        totalConflicts: number;
        totalPackages: number;
        avgVersionsPerPackage: number;
    };
}
