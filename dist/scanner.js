import * as fs from 'fs';
import * as path from 'path';
const DEFAULT_IGNORE_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.nuxt',
    '.cache',
    '.turbo',
    'coverage',
    '.vscode',
    '.idea'
];
export class ProjectScanner {
    ignorePatterns;
    constructor(ignorePatterns = []) {
        this.ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...ignorePatterns];
    }
    async scan(rootPath) {
        const absoluteRoot = path.resolve(rootPath);
        if (!fs.existsSync(absoluteRoot)) {
            throw new Error(`路径不存在: ${absoluteRoot}`);
        }
        const packageJsonPaths = await this.findPackageJsonFiles(absoluteRoot);
        const projects = [];
        for (const pkgPath of packageJsonPaths) {
            const project = await this.parsePackageJson(pkgPath);
            if (project) {
                projects.push(project);
            }
        }
        return projects.sort((a, b) => a.name.localeCompare(b.name));
    }
    async findPackageJsonFiles(rootPath) {
        const results = [];
        const walk = (dir) => {
            let entries;
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (this.shouldIgnore(entry.name, fullPath, rootPath)) {
                    continue;
                }
                if (entry.isDirectory()) {
                    walk(fullPath);
                }
                else if (entry.isFile() && entry.name === 'package.json') {
                    results.push(fullPath);
                }
            }
        };
        walk(rootPath);
        return results;
    }
    shouldIgnore(name, fullPath, rootPath) {
        if (name.startsWith('.')) {
            return true;
        }
        for (const pattern of this.ignorePatterns) {
            if (name === pattern) {
                return true;
            }
            const relativePath = path.relative(rootPath, fullPath);
            if (relativePath.includes(pattern)) {
                return true;
            }
        }
        return false;
    }
    async parsePackageJson(pkgPath) {
        try {
            const content = fs.readFileSync(pkgPath, 'utf-8');
            const pkg = JSON.parse(content);
            if (!pkg.name) {
                return null;
            }
            const depTypes = [
                'dependencies',
                'devDependencies',
                'peerDependencies',
                'optionalDependencies'
            ];
            const dependencies = {
                dependencies: {},
                devDependencies: {},
                peerDependencies: {},
                optionalDependencies: {}
            };
            for (const type of depTypes) {
                if (pkg[type]) {
                    dependencies[type] = { ...pkg[type] };
                }
            }
            return {
                name: pkg.name,
                path: path.dirname(pkgPath),
                packageJsonPath: pkgPath,
                version: pkg.version || '0.0.0',
                dependencies
            };
        }
        catch {
            return null;
        }
    }
}
//# sourceMappingURL=scanner.js.map