# 仓库依赖分析报告

> 扫描时间: 2026-06-17T03:39:01.507Z
> 扫描路径: `D:\solor-06\18\solo6-18\test-fixtures`

## 📊 概览

| 指标 | 数量 |
|------|------|
| 项目总数 | 3 |
| 依赖总数 | 18 |
| 过时依赖 | 0 |
| 安全告警 | 6 |
| 版本冲突 | 3 |

### 按严重程度统计

| 严重程度 | 数量 |
|----------|------|
| 🔴 critical | 0 |
| 🟠 high | 4 |
| 🟡 moderate | 2 |
| 🟢 low | 0 |

### 按依赖类型统计

| 类型 | 数量 |
|------|------|
| dependencies | 12 |
| devDependencies | 6 |

## 📦 项目列表

### test-project-a@1.0.0
- 路径: `D:\solor-06\18\solo6-18\test-fixtures\project-a`
- dependencies: 4 个
- devDependencies: 2 个

### test-project-b@2.0.0
- 路径: `D:\solor-06\18\solo6-18\test-fixtures\project-b`
- dependencies: 4 个
- devDependencies: 2 个

### test-project-c@1.5.0
- 路径: `D:\solor-06\18\solo6-18\test-fixtures\project-c`
- dependencies: 4 个
- devDependencies: 2 个
- peerDependencies: 1 个

## 🔒 安全告警

### 🟠 高危 (High) (4)

#### dot-prop
- **标题**: Prototype Pollution in dot-prop
- **受影响版本**: <5.1.1
- **修复版本**: >=5.1.1
- **当前版本**: 5.0.0
- **受影响项目**: test-project-b

#### lodash
- **标题**: Prototype Pollution in lodash
- **受影响版本**: <4.17.21
- **修复版本**: >=4.17.21
- **当前版本**: 4.17.15
- **受影响项目**: test-project-a

#### lodash
- **标题**: Prototype Pollution in lodash
- **受影响版本**: <4.17.21
- **修复版本**: >=4.17.21
- **当前版本**: 3.10.1
- **受影响项目**: test-project-c

#### set-value
- **标题**: Prototype Pollution in set-value
- **受影响版本**: <2.0.1
- **修复版本**: >=2.0.1
- **当前版本**: 2.0.0
- **受影响项目**: test-project-c

### 🟡 中危 (Moderate) (2)

#### glob-parent
- **标题**: Regular Expression Denial of Service in glob-parent
- **受影响版本**: <5.1.2
- **修复版本**: >=5.1.2
- **当前版本**: 5.0.0
- **受影响项目**: test-project-c

#### minimist
- **标题**: Prototype Pollution in minimist
- **受影响版本**: <1.2.6
- **修复版本**: >=1.2.6
- **当前版本**: 1.2.0
- **受影响项目**: test-project-a

## ⚔️ 版本冲突

### lodash (3 个版本)

| 版本 | 项目 | 类型 |
|------|------|------|
| 4.17.21 | test-project-b | dependencies |
| 4.17.15 | test-project-a | dependencies |
| 3.10.1 | test-project-c | dependencies |

### react (3 个版本)

| 版本 | 项目 | 类型 |
|------|------|------|
| 18.2.0 | test-project-b | dependencies |
| 17.0.2 | test-project-a | dependencies |
| 16.14.0 | test-project-c | dependencies |

### typescript (3 个版本)

| 版本 | 项目 | 类型 |
|------|------|------|
| 5.0.0 | test-project-b | devDependencies |
| 4.5.0 | test-project-a | devDependencies |
| 3.9.0 | test-project-c | devDependencies |
