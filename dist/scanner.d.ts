import { ProjectInfo } from './types.js';
export declare class ProjectScanner {
    private ignorePatterns;
    constructor(ignorePatterns?: string[]);
    scan(rootPath: string): Promise<ProjectInfo[]>;
    private findPackageJsonFiles;
    private shouldIgnore;
    private parsePackageJson;
}
