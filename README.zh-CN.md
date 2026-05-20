# RSS Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[English README](./README.md) | [调用示例](./examples/README.md) | [更新日志](./CHANGELOG.md)

面向通用 Agent 生态的 RSS 相关 Skills 仓库。

当前仓库从 `rss-ai-digest` 开始，聚焦 AI 与技术内容发现。它帮助 Agent 导入订阅源、监控新文章、筛选高信号内容、维护已读状态，并评估 RSS 源质量，同时保持与具体运行时解耦。

## 当前状态

| 项目 | 状态 |
| --- | --- |
| 当前 Skill | `rss-ai-digest` |
| 运行契约 | 标准 Skill 结构 + 确定性 Python CLI |
| 发布阶段 | `v0.1.0` 稳定检查点 |
| 依赖模型 | 当前实现仅使用 Python 标准库 |
| 平台支持 | 运行时中立，可被不同 Agent 或调度器包装 |

## Agent 适用场景

当 Agent 需要以下能力时使用 `rss-ai-digest`：

- 将 RSS/Atom 源转换成 AI 或技术阅读摘要。
- 将 OPML 文件导入结构化 feed registry。
- 按关键词、作者、日期、分类或语言监控新条目。
- 追踪 seen-state，避免重复报告同一篇文章。
- 长期评估源健康和源质量。
- 在修改 registry 前生成可审阅的源治理建议。

它目前不是完整 RSS 阅读器、通知中心、后台调度服务或插件市场成品。这些能力后续可以作为 wrapper 或独立 Skill 扩展。

## 当前 Skill

```text
skills/rss-ai-digest/
├── SKILL.md
├── agents/openai.yaml
├── references/
│   ├── automation.md
│   ├── base-feeds.opml
│   ├── feed-registry.md
│   ├── scoring.md
│   └── source-metadata.json
└── scripts/rss_monitor.py
```

`SKILL.md` 是 Agent 入口。Python 脚本是 Skill 背后的确定性实现，不是项目的主要产品界面。

## 仓库结构

```text
.
├── skills/rss-ai-digest/        # 可移植 Skill 包
├── examples/                    # Agent 和 Skill 调用示例
├── docs/                        # 项目状态、设计和验证历史
├── tests/                       # 行为回归测试
├── AGENTS.md                    # 通用编码 Agent 指令
├── CONTRIBUTING.md              # 贡献说明
├── LICENSE                      # MIT License
└── README.md                    # 英文 README
```

## 能力概览

`rss-ai-digest` 当前支持：

- RSS 2.0 和 Atom 解析。
- OPML 导入，并保留 outline 分类。
- 面向 AI、工程、安全、产品和通用技术博客的基础 OPML。
- 通过 source metadata 设置 `base_score`、`language`、`tags` 等源先验。
- token-aware 关键词匹配和短语匹配。
- 严格 AI digest preset 和噪声排除。
- 带 `score_reasons` 的文章评分。
- seen-state 去重。
- source health 持久化和 failed feeds 报告。
- 源质量评估和可审阅源治理 patch。
- 面向人阅读的 Markdown 输出和面向自动化的 JSON 输出。

## Agent 工作流

1. 读取 [`skills/rss-ai-digest/SKILL.md`](./skills/rss-ai-digest/SKILL.md) 判断应该使用哪个工作流。
2. 需要初始订阅源时，使用 [`skills/rss-ai-digest/references/base-feeds.opml`](./skills/rss-ai-digest/references/base-feeds.opml)。
3. 将 `feeds.json`、`seen.json`、`source-health.json` 等运行时文件保留在 Git 之外。
4. 用户可读日报优先输出 Markdown；自动化管道优先输出 JSON。
5. 修改 registry 前先审阅 `curate-sources` 结果。

## CLI 契约

Agent 和 wrapper 可以通过 `scripts/rss_monitor.py` 调用确定性实现。这里的 CLI 是实现契约，不应取代 Skill 入口。

| 命令 | 用途 |
| --- | --- |
| `import-opml` | 将 OPML 转换为 feed registry JSON。 |
| `fetch` | 抓取启用的源并输出标准化 entries。 |
| `digest` | 抓取、筛选、评分、去重并生成阅读摘要。 |
| `check-new` | 为监控流程报告新增匹配条目。 |
| `evaluate-sources` | 基于 registry 和 health 数据评估源质量。 |
| `curate-sources` | 生成可审阅源治理动作。 |
| `apply-source-patch` | dry-run 或将已审阅 patch 写入明确的输出 registry。 |

最小初始化：

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py import-opml \
  --opml skills/rss-ai-digest/references/base-feeds.opml \
  --metadata skills/rss-ai-digest/references/source-metadata.json \
  --registry feeds.json
```

典型 AI digest：

```bash
python3 skills/rss-ai-digest/scripts/rss_monitor.py digest \
  --registry feeds.json \
  --state seen.json \
  --health source-health.json \
  --since 24h \
  --preset ai-strict \
  --min-score 7 \
  --format markdown
```

更多 Agent 级调用示例见 [examples/README.md](./examples/README.md)。

## 数据与隐私

- feed registry、seen-state 和 source-health 可能暴露阅读兴趣。
- `feeds.json`、`seen.json`、`source-health.json`、`digest.md`、`rss-output/` 等运行时文件默认被 Git 忽略。
- 除非用户明确指定通知渠道，否则不要把 digest 或订阅数据发送到外部服务。
- `apply-source-patch` 只写入显式指定的 output 文件，应在审阅 curation 结果后使用。

## 文档

主要 Skill 文档：

- [Skill 入口](./skills/rss-ai-digest/SKILL.md)
- [Feed registry 与状态结构](./skills/rss-ai-digest/references/feed-registry.md)
- [评分规则](./skills/rss-ai-digest/references/scoring.md)
- [自动化参考](./skills/rss-ai-digest/references/automation.md)
- [源元数据种子](./skills/rss-ai-digest/references/source-metadata.json)

项目维护文档：

- [项目状态](./docs/project-status.zh-CN.md)
- [v0.1.0 release notes](./docs/releases/v0.1.0.md)
- [Agent 指令](./AGENTS.md)
- [Claude Code 指令](./CLAUDE.md)
- [贡献说明](./CONTRIBUTING.md)
- [更新日志](./CHANGELOG.md)
- [Release checklist](./docs/release-checklist.md)
- [许可证](./LICENSE)

设计和实现历史保存在 [`docs/superpowers/`](./docs/superpowers/) 下。它们是规划和验证归档，不是主要使用文档。

## 开发

运行测试：

```bash
python3 -m unittest tests/test_rss_monitor.py -v
```

检查 whitespace：

```bash
git diff --check
```

如果本地有 Skill validator，可验证 Skill 包：

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
```

## 路线图

后续可能拆分的 Skills 或插件模块：

- `rss-source-curator`：源清理、排序和 OPML 维护。
- `rss-alert-monitor`：关键词、作者、项目和主题监控。
- `rss-digest-publisher`：发布到 Email、飞书、Slack、Obsidian 或 webhook。
- `rss-feed-discovery`：从网站、GitHub 列表和目录发现 RSS 源。

这些模块应围绕共享 RSS primitives 进行扩展，而不是把同一套流程做成某个运行时专用 fork。拆分前应先发布当前稳定版本。
