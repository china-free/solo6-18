#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectScanner } from './scanner.js';
import { OutdatedChecker } from './outdated.js';
import { SecurityChecker } from './security.js';
import { ConflictDetector } from './conflicts.js';
import { ReportGenerator } from './reporter.js';
import { 
  ScanReport, 
  ScanOptions, 
  DependencyType, 
  OutputFormat,
  ProjectInfo 
} from './types.js';

const program = new Command();

program
  .name('dep-scanner')
  .description('仓库依赖批量分析工具 - 扫描多项目依赖状况')
  .version('1.0.0');

program
  .argument('[path]', '扫描的根目录路径', '.')
  .option('-o, --output <format>', '输出格式: json | markdown | console', 'console')
  .option('-f, --output-file <file>', '输出文件路径（可选）')
  .option('-t, --dep-types <types>', '依赖类型，逗号分隔: dependencies,devDependencies,peerDependencies,optionalDependencies', 'dependencies,devDependencies')
  .option('-i, --ignore <patterns>', '忽略的目录模式，逗号分隔', '')
  .option('--no-outdated', '跳过过时依赖检查')
  .option('--no-security', '跳过安全告警检查')
  .option('--no-conflicts', '跳过版本冲突检查')
  .option('-p, --project <name>', '按项目名过滤（支持模糊匹配）')
  .option('--package <name>', '按包名过滤（支持模糊匹配）')
  .option('--vuln-db <file>', '自定义漏洞数据库 JSON 文件路径')
  .option('-c, --concurrency <number>', '网络请求并发数', '10')
  .action(async (scanPath: string, options) => {
    try {
      await runScan(scanPath, options);
    } catch (error) {
      console.error('扫描失败:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

async function runScan(scanPath: string, options: any): Promise<void> {
  const absolutePath = path.resolve(scanPath);
  
  const depTypes: DependencyType[] = options.depTypes
    .split(',')
    .map((t: string) => t.trim())
    .filter(Boolean) as DependencyType[];

  const ignorePatterns: string[] = options.ignore
    ? options.ignore.split(',').map((p: string) => p.trim()).filter(Boolean)
    : [];

  const scanOptions: ScanOptions = {
    path: absolutePath,
    ignorePatterns,
    depTypes,
    includeVulnerabilities: options.security !== false,
    includeOutdated: options.outdated !== false,
    includeConflicts: options.conflicts !== false,
    projectFilter: options.project,
    packageFilter: options.package
  };

  console.log(`正在扫描: ${absolutePath}`);
  
  const scanner = new ProjectScanner(ignorePatterns);
  let projects = await scanner.scan(absolutePath);
  
  console.log(`找到 ${projects.length} 个项目`);

  if (scanOptions.projectFilter) {
    const filter = scanOptions.projectFilter.toLowerCase();
    projects = projects.filter(p => p.name.toLowerCase().includes(filter));
    console.log(`过滤后: ${projects.length} 个项目`);
  }

  if (projects.length === 0) {
    console.log('没有找到任何项目');
    return;
  }

  const report = await generateReport(projects, scanOptions, options);
  const outputFormat = options.output as OutputFormat;
  const generator = new ReportGenerator();

  let output: string;
  
  switch (outputFormat) {
    case 'json':
      output = generator.toJson(report);
      break;
    case 'markdown':
      output = generator.toMarkdown(report);
      break;
    case 'console':
    default:
      output = generator.toConsole(report);
      break;
  }

  if (options.outputFile) {
    const outputPath = path.resolve(options.outputFile);
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`\n报告已写入: ${outputPath}`);
  } else {
    console.log(output);
  }
}

async function generateReport(
  projects: ProjectInfo[],
  options: ScanOptions,
  cliOptions: any
): Promise<ScanReport> {
  const outdatedChecker = new OutdatedChecker(parseInt(cliOptions.concurrency));
  const securityChecker = new SecurityChecker();
  const conflictDetector = new ConflictDetector();

  if (cliOptions.vulnDb) {
    securityChecker.loadVulnerabilitiesFromFile(path.resolve(cliOptions.vulnDb));
  }

  let outdated = options.includeOutdated 
    ? await outdatedChecker.checkOutdated(projects, options.depTypes)
    : [];

  let vulnerabilities = options.includeVulnerabilities
    ? securityChecker.checkVulnerabilities(projects, options.depTypes)
    : [];

  let conflicts = options.includeConflicts
    ? conflictDetector.detectConflicts(projects, options.depTypes)
    : [];

  if (options.packageFilter) {
    const filter = options.packageFilter.toLowerCase();
    outdated = outdated.filter(d => d.name.toLowerCase().includes(filter));
    vulnerabilities = vulnerabilities.filter(v => v.name.toLowerCase().includes(filter));
    conflicts = conflicts.filter(c => c.packageName.toLowerCase().includes(filter));
  }

  const bySeverity: Record<string, number> = {};
  for (const vuln of vulnerabilities) {
    bySeverity[vuln.severity] = (bySeverity[vuln.severity] || 0) + 1;
  }

  const byDepType: Record<string, number> = {};
  let totalDeps = 0;
  for (const project of projects) {
    for (const type of options.depTypes) {
      const deps = project.dependencies[type] || {};
      const count = Object.keys(deps).length;
      byDepType[type] = (byDepType[type] || 0) + count;
      totalDeps += count;
    }
  }

  return {
    scanDate: new Date().toISOString(),
    scanPath: options.path,
    totalProjects: projects.length,
    projects,
    outdated,
    vulnerabilities,
    conflicts,
    summary: {
      totalDependencies: totalDeps,
      outdatedCount: outdated.length,
      vulnerabilityCount: vulnerabilities.length,
      conflictCount: conflicts.length,
      bySeverity,
      byDepType
    }
  };
}

program.parseAsync(process.argv);
