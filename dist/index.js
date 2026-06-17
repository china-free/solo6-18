#!/usr/bin/env node
import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectScanner } from './scanner.js';
import { OutdatedChecker } from './outdated.js';
import { SecurityChecker } from './security.js';
import { ConflictDetector } from './conflicts.js';
import { ReportGenerator } from './reporter.js';
import { BaselineManager } from './baseline.js';
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
    .option('--save-baseline <file>', '将本次扫描结果保存为基线文件')
    .option('--baseline <file>', '与指定基线文件对比，展示差异')
    .option('--baseline-exit-on-regress', '当基线对比结果为恶化时以非零退出码退出')
    .action(async (scanPath, options) => {
    try {
        await runScan(scanPath, options);
    }
    catch (error) {
        console.error('扫描失败:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
async function runScan(scanPath, options) {
    const absolutePath = path.resolve(scanPath);
    const depTypes = options.depTypes
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    const ignorePatterns = options.ignore
        ? options.ignore.split(',').map((p) => p.trim()).filter(Boolean)
        : [];
    const scanOptions = {
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
    const outputFormat = options.output;
    const generator = new ReportGenerator();
    let output;
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
    }
    else {
        console.log(output);
    }
    if (report.fetchFailures.length > 0) {
        console.error(`\n⚠️  警告: ${report.fetchFailures.length} 个依赖的版本查询失败，过时检查结果不完整:`);
        for (const failure of report.fetchFailures) {
            console.error(`  - ${failure.packageName}: [${failure.reason}] ${failure.detail}`);
        }
    }
    const baselineManager = new BaselineManager();
    if (options.saveBaseline) {
        const baselinePath = path.resolve(options.saveBaseline);
        baselineManager.saveBaseline(report, baselinePath);
        console.log(`\n✅ 基线已保存: ${baselinePath}`);
    }
    if (options.baseline) {
        try {
            const baselineReport = baselineManager.loadBaseline(options.baseline);
            const diff = baselineManager.diff(baselineReport, report);
            const diffOutput = renderDiff(diff, outputFormat, generator);
            if (options.outputFile) {
                const diffPath = path.resolve(options.outputFile).replace(/(\.\w+)$/, '.diff$1');
                fs.writeFileSync(diffPath, diffOutput, 'utf-8');
                console.log(`\n对比报告已写入: ${diffPath}`);
            }
            else {
                console.log(diffOutput);
            }
            const exitOnRegress = options.baselineExitOnRegress;
            if (exitOnRegress && diff.summary.trend === 'regressing') {
                console.error('\n❌ 依赖状况相比基线恶化，流程中止');
                process.exit(1);
            }
        }
        catch (error) {
            console.error(`\n基线对比失败: ${error instanceof Error ? error.message : error}`);
        }
    }
}
async function generateReport(projects, options, cliOptions) {
    const outdatedChecker = new OutdatedChecker(parseInt(cliOptions.concurrency));
    const securityChecker = new SecurityChecker();
    const conflictDetector = new ConflictDetector();
    if (cliOptions.vulnDb) {
        securityChecker.loadVulnerabilitiesFromFile(path.resolve(cliOptions.vulnDb));
    }
    let outdated = [];
    let fetchFailures = [];
    if (options.includeOutdated) {
        const result = await outdatedChecker.checkOutdated(projects, options.depTypes);
        outdated = result.outdated;
        fetchFailures = result.fetchFailures;
    }
    let vulnerabilities = options.includeVulnerabilities
        ? securityChecker.checkVulnerabilities(projects, options.depTypes)
        : [];
    let conflicts = options.includeConflicts
        ? conflictDetector.detectConflicts(projects, options.depTypes)
        : [];
    if (options.packageFilter) {
        const filter = options.packageFilter.toLowerCase();
        outdated = outdated.filter((d) => d.name.toLowerCase().includes(filter));
        vulnerabilities = vulnerabilities.filter(v => v.name.toLowerCase().includes(filter));
        conflicts = conflicts.filter(c => c.packageName.toLowerCase().includes(filter));
        fetchFailures = fetchFailures.filter((f) => f.packageName.toLowerCase().includes(filter));
    }
    const bySeverity = {};
    for (const vuln of vulnerabilities) {
        bySeverity[vuln.severity] = (bySeverity[vuln.severity] || 0) + 1;
    }
    const byDepType = {};
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
        fetchFailures,
        summary: {
            totalDependencies: totalDeps,
            outdatedCount: outdated.length,
            vulnerabilityCount: vulnerabilities.length,
            conflictCount: conflicts.length,
            fetchFailureCount: fetchFailures.length,
            bySeverity,
            byDepType
        }
    };
}
function renderDiff(diff, format, generator) {
    switch (format) {
        case 'json':
            return generator.diffToJson(diff);
        case 'markdown':
            return generator.diffToMarkdown(diff);
        case 'console':
        default:
            return generator.diffToConsole(diff);
    }
}
program.parseAsync(process.argv);
//# sourceMappingURL=index.js.map