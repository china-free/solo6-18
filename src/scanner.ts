import * as fs from 'fs';
import * as path from 'path';
import { ProjectInfo, PackageJson, DependencyType } from './types.js';

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
  private ignorePatterns: string[];

  constructor(ignorePatterns: string[] = []) {
    this.ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...ignorePatterns];
  }

  async scan(rootPath: string): Promise<ProjectInfo[]> {
    const absoluteRoot = path.resolve(rootPath);
    
    if (!fs.existsSync(absoluteRoot)) {
      throw new Error(`路径不存在: ${absoluteRoot}`);
    }

    const packageJsonPaths = await this.findPackageJsonFiles(absoluteRoot);
    const projects: ProjectInfo[] = [];

    for (const pkgPath of packageJsonPaths) {
      const project = await this.parsePackageJson(pkgPath);
      if (project) {
        projects.push(project);
      }
    }

    return projects.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async findPackageJsonFiles(rootPath: string): Promise<string[]> {
    const results: string[] = [];

    const walk = (dir: string): void => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (this.shouldIgnore(entry.name, fullPath, rootPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && entry.name === 'package.json') {
          results.push(fullPath);
        }
      }
    };

    walk(rootPath);
    return results;
  }

  private shouldIgnore(name: string, fullPath: string, rootPath: string): boolean {
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

  private async parsePackageJson(pkgPath: string): Promise<ProjectInfo | null> {
    try {
      const content = fs.readFileSync(pkgPath, 'utf-8');
      const pkg: PackageJson = JSON.parse(content);

      if (!pkg.name) {
        return null;
      }

      const depTypes: DependencyType[] = [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies'
      ];

      const dependencies: ProjectInfo['dependencies'] = {
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
    } catch {
      return null;
    }
  }
}
