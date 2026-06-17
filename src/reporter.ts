import chalk from 'chalk';
import Table from 'cli-table3';
import { ScanReport, OutdatedDependency, SecurityVulnerability, VersionConflict } from './types.js';

export class ReportGenerator {
  toJson(report: ScanReport): string {
    return JSON.stringify(report, null, 2);
  }

  toMarkdown(report: ScanReport): string {
    const lines: string[] = [];

    lines.push('# 仓库依赖分析报告');
    lines.push('');
    lines.push(`> 扫描时间: ${report.scanDate}`);
    lines.push(`> 扫描路径: \`${report.scanPath}\``);
    lines.push('');

    lines.push('## 📊 概览');
    lines.push('');
    lines.push('| 指标 | 数量 |');
    lines.push('|------|------|');
    lines.push(`| 项目总数 | ${report.totalProjects} |`);
    lines.push(`| 依赖总数 | ${report.summary.totalDependencies} |`);
    lines.push(`| 过时依赖 | ${report.summary.outdatedCount} |`);
    lines.push(`| 安全告警 | ${report.summary.vulnerabilityCount} |`);
    lines.push(`| 版本冲突 | ${report.summary.conflictCount} |`);
    if (report.fetchFailures.length > 0) {
      lines.push(`| ⚠️ 查询失败 | ${report.summary.fetchFailureCount} |`);
    }
    lines.push('');

    lines.push('### 按严重程度统计');
    lines.push('');
    lines.push('| 严重程度 | 数量 |');
    lines.push('|----------|------|');
    lines.push(`| 🔴 critical | ${report.summary.bySeverity.critical || 0} |`);
    lines.push(`| 🟠 high | ${report.summary.bySeverity.high || 0} |`);
    lines.push(`| 🟡 moderate | ${report.summary.bySeverity.moderate || 0} |`);
    lines.push(`| 🟢 low | ${report.summary.bySeverity.low || 0} |`);
    lines.push('');

    lines.push('### 按依赖类型统计');
    lines.push('');
    lines.push('| 类型 | 数量 |');
    lines.push('|------|------|');
    for (const [type, count] of Object.entries(report.summary.byDepType)) {
      lines.push(`| ${type} | ${count} |`);
    }
    lines.push('');

    lines.push('## 📦 项目列表');
    lines.push('');
    for (const project of report.projects) {
      lines.push(`### ${project.name}@${project.version}`);
      lines.push(`- 路径: \`${project.path}\``);
      
      const depTypes = Object.entries(project.dependencies)
        .filter(([, deps]) => Object.keys(deps).length > 0);
      
      for (const [type, deps] of depTypes) {
        const depCount = Object.keys(deps).length;
        lines.push(`- ${type}: ${depCount} 个`);
      }
      lines.push('');
    }

    if (report.outdated.length > 0) {
      lines.push('## ⚠️ 过时依赖');
      lines.push('');
      
      const byLevel: Record<string, OutdatedDependency[]> = {
        major: [],
        minor: [],
        patch: [],
        unknown: []
      };
      
      for (const dep of report.outdated) {
        byLevel[dep.level].push(dep);
      }

      for (const level of ['major', 'minor', 'patch', 'unknown'] as const) {
        const deps = byLevel[level];
        if (deps.length === 0) continue;

        const levelLabels: Record<string, string> = {
          major: '🔴 主版本更新',
          minor: '🟡 次版本更新',
          patch: '🟢 补丁更新',
          unknown: '⚪ 未知类型'
        };

        lines.push(`### ${levelLabels[level]} (${deps.length})`);
        lines.push('');
        lines.push('| 包名 | 当前版本 | 最新版本 | 项目 | 类型 |');
        lines.push('|------|----------|----------|------|------|');
        
        for (const dep of deps) {
          lines.push(`| ${dep.name} | ${dep.currentVersion} | ${dep.latestVersion} | ${dep.projectName} | ${dep.type} |`);
        }
        lines.push('');
      }
    }

    if (report.vulnerabilities.length > 0) {
      lines.push('## 🔒 安全告警');
      lines.push('');
      
      const bySeverity: Record<string, SecurityVulnerability[]> = {
        critical: [],
        high: [],
        moderate: [],
        low: []
      };
      
      for (const vuln of report.vulnerabilities) {
        bySeverity[vuln.severity].push(vuln);
      }

      for (const severity of ['critical', 'high', 'moderate', 'low'] as const) {
        const vulns = bySeverity[severity];
        if (vulns.length === 0) continue;

        const severityLabels: Record<string, string> = {
          critical: '🔴 严重 (Critical)',
          high: '🟠 高危 (High)',
          moderate: '🟡 中危 (Moderate)',
          low: '🟢 低危 (Low)'
        };

        lines.push(`### ${severityLabels[severity]} (${vulns.length})`);
        lines.push('');
        
        for (const vuln of vulns) {
          lines.push(`#### ${vuln.name}`);
          lines.push(`- **标题**: ${vuln.title}`);
          lines.push(`- **受影响版本**: ${vuln.vulnerableVersions}`);
          lines.push(`- **修复版本**: ${vuln.patchedVersions}`);
          lines.push(`- **当前版本**: ${vuln.currentVersion}`);
          lines.push(`- **受影响项目**: ${vuln.projectName}`);
          lines.push('');
        }
      }
    }

    if (report.conflicts.length > 0) {
      lines.push('## ⚔️ 版本冲突');
      lines.push('');
      
      for (const conflict of report.conflicts) {
        const uniqueVersions = new Set(conflict.versions.map(v => v.version));
        lines.push(`### ${conflict.packageName} (${uniqueVersions.size} 个版本)`);
        lines.push('');
        lines.push('| 版本 | 项目 | 类型 |');
        lines.push('|------|------|------|');
        
        for (const v of conflict.versions) {
          lines.push(`| ${v.version} | ${v.projectName} | ${v.type} |`);
        }
        lines.push('');
      }
    }

    if (report.fetchFailures.length > 0) {
      lines.push('## 🚫 版本查询失败');
      lines.push('');
      lines.push('> 以下依赖无法从 npm registry 获取最新版本，过时检查结果不完整。');
      lines.push('');
      lines.push('| 包名 | 失败原因 | 详情 |');
      lines.push('|------|----------|------|');
      for (const failure of report.fetchFailures) {
        lines.push(`| ${failure.packageName} | ${failure.reason} | ${failure.detail} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  toConsole(report: ScanReport): string {
    const lines: string[] = [];

    lines.push(chalk.bold.cyan('=' .repeat(60)));
    lines.push(chalk.bold.cyan('  仓库依赖分析报告'));
    lines.push(chalk.bold.cyan('=' .repeat(60)));
    lines.push('');
    lines.push(chalk.gray(`扫描时间: ${report.scanDate}`));
    lines.push(chalk.gray(`扫描路径: ${report.scanPath}`));
    lines.push('');

    lines.push(chalk.bold.yellow('📊 概览'));
    lines.push('');
    
    const summaryTable = new Table({
      head: [chalk.bold('指标'), chalk.bold('数量')],
      colWidths: [30, 20]
    });
    
    summaryTable.push(
      ['项目总数', report.totalProjects],
      ['依赖总数', report.summary.totalDependencies],
      ['过时依赖', chalk.yellow(report.summary.outdatedCount)],
      ['安全告警', chalk.red(report.summary.vulnerabilityCount)],
      ['版本冲突', chalk.magenta(report.summary.conflictCount)]
    );

    if (report.fetchFailures.length > 0) {
      summaryTable.push(['查询失败', chalk.bgRed.white.bold(report.summary.fetchFailureCount)]);
    }
    
    lines.push(summaryTable.toString());
    lines.push('');

    if (report.outdated.length > 0) {
      lines.push(chalk.bold.yellow('⚠️  过时依赖 TOP 20'));
      lines.push('');
      
      const outdatedTable = new Table({
        head: [chalk.bold('包名'), chalk.bold('当前'), chalk.bold('最新'), chalk.bold('级别'), chalk.bold('项目')],
        colWidths: [20, 12, 12, 10, 20]
      });

      const levelColors: Record<string, (s: string) => string> = {
        major: chalk.red,
        minor: chalk.yellow,
        patch: chalk.green,
        unknown: chalk.gray
      };

      for (const dep of report.outdated.slice(0, 20)) {
        const color = levelColors[dep.level];
        outdatedTable.push([
          dep.name,
          dep.currentVersion,
          dep.latestVersion,
          color(dep.level),
          dep.projectName
        ]);
      }
      
      lines.push(outdatedTable.toString());
      if (report.outdated.length > 20) {
        lines.push(chalk.gray(`... 还有 ${report.outdated.length - 20} 个过时依赖`));
      }
      lines.push('');
    }

    if (report.vulnerabilities.length > 0) {
      lines.push(chalk.bold.red('🔒 安全告警'));
      lines.push('');
      
      const vulnTable = new Table({
        head: [chalk.bold('严重程度'), chalk.bold('包名'), chalk.bold('标题'), chalk.bold('项目')],
        colWidths: [12, 18, 25, 15]
      });

      const severityColors: Record<string, (s: string) => string> = {
        critical: chalk.bgRed.white.bold,
        high: chalk.red.bold,
        moderate: chalk.yellow,
        low: chalk.green
      };

      for (const vuln of report.vulnerabilities.slice(0, 15)) {
        const color = severityColors[vuln.severity];
        vulnTable.push([
          color(vuln.severity),
          vuln.name,
          vuln.title.length > 24 ? vuln.title.substring(0, 24) + '...' : vuln.title,
          vuln.projectName
        ]);
      }
      
      lines.push(vulnTable.toString());
      if (report.vulnerabilities.length > 15) {
        lines.push(chalk.gray(`... 还有 ${report.vulnerabilities.length - 15} 个安全告警`));
      }
      lines.push('');
    }

    if (report.conflicts.length > 0) {
      lines.push(chalk.bold.magenta('⚔️  版本冲突 TOP 10'));
      lines.push('');
      
      for (const conflict of report.conflicts.slice(0, 10)) {
        const uniqueVersions = new Set(conflict.versions.map(v => v.version));
        lines.push(chalk.magenta(`  ${conflict.packageName}`) + chalk.gray(` (${uniqueVersions.size} 个版本)`));
        
        const versionMap = new Map<string, string[]>();
        for (const v of conflict.versions) {
          if (!versionMap.has(v.version)) {
            versionMap.set(v.version, []);
          }
          versionMap.get(v.version)!.push(v.projectName);
        }
        
        for (const [version, projects] of versionMap) {
          lines.push(`    ${chalk.yellow(version)} → ${projects.join(', ')}`);
        }
        lines.push('');
      }
      
      if (report.conflicts.length > 10) {
        lines.push(chalk.gray(`... 还有 ${report.conflicts.length - 10} 个版本冲突`));
        lines.push('');
      }
    }

    if (report.fetchFailures.length > 0) {
      lines.push(chalk.bold.red('🚫 版本查询失败'));
      lines.push(chalk.gray('  以下依赖无法获取最新版本，过时检查结果不完整'));
      lines.push('');

      const failureTable = new Table({
        head: [chalk.bold('包名'), chalk.bold('原因'), chalk.bold('详情')],
        colWidths: [20, 16, 40]
      });

      for (const failure of report.fetchFailures) {
        const reasonLabels: Record<string, string> = {
          network_error: '网络错误',
          timeout: '超时',
          http_error: 'HTTP 错误',
          no_latest_version: '无 latest',
          invalid_response: '无效响应'
        };
        failureTable.push([
          failure.packageName,
          reasonLabels[failure.reason] || failure.reason,
          failure.detail
        ]);
      }

      lines.push(failureTable.toString());
      lines.push('');
    }

    return lines.join('\n');
  }
}
