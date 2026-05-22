# RSS Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[English README](./README.md) | [调用示例](./examples/README.md) | [更新日志](./CHANGELOG.md)

面向通用 Agent 生态的 RSS 相关 Skills 与本地优先订阅研究工作流仓库。

当前仓库是面向 Agent 生态的 RSS Skills 套件。它帮助 Agent 导入订阅源、监控新文章、筛选高信号内容、维护已读状态、评估 RSS 源质量，并准备 evidence brief，同时保持与具体运行时解耦。

## 当前状态

| 项目 | 状态 |
| --- | --- |
| 稳定发布 | `v0.1.0` 包含 `rss-ai-digest` |
| 当前工作区 | `rss-ai-digest`、`rss-source-curator`、`subscription-research-agent` |
| 运行契约 | 标准 Skill 结构 + 确定性本地 CLI |
| 发布阶段 | `v0.3.0` 已准备，尚未发布；包含此前 `v0.2.0` 套件范围 |
| 依赖模型 | RSS primitives 使用 Python 标准库；research workspace tooling 使用 Node/TypeScript |
| 平台支持 | 运行时中立，可被不同 Agent 或调度器包装 |

## Agent 适用场景

当 Agent 需要以下能力时使用 `rss-ai-digest`：

- 将 RSS/Atom 源转换成 AI 或技术阅读摘要。
- 将 OPML 文件导入结构化 feed registry。
- 按关键词、作者、日期、分类或语言监控新条目。
- 追踪 seen-state，避免重复报告同一篇文章。

当 Agent 需要以下能力时使用 `rss-source-curator`：

- 长期评估源健康和源质量。
- 在修改 registry 前生成可审阅的源治理建议。

当 Agent 需要以下能力时使用 `subscription-research-agent`：

- 围绕订阅来源初始化本地优先 research workspace。
- 将 RSS evidence 归档到可查询的本地记忆。
- 生成带来源依据的 evidence brief，用于后续研究 memo 写作。
- 基于 evidence brief 写作包含来源边界、核心判断和后续问题的研究日报。

它目前不是完整 RSS 阅读器、通知中心、后台调度服务、托管研究平台或插件市场成品。这些能力后续可以作为 wrapper 或独立 Skill 扩展。

## 当前 Skills

| Skill | 用途 |
| --- | --- |
| `rss-ai-digest` | 发现、筛选、评分、去重并生成高信号 AI/技术阅读摘要。 |
| `rss-source-curator` | 评估 RSS 源质量、审查源健康、生成源治理动作，并应用已审阅 registry patch。 |
| `subscription-research-agent` | 围绕订阅来源编排本地优先 evidence brief 和 Agent 写作的研究日报。 |

## v0.2.0 套件范围

- `rss-ai-digest` 现在支持确定性 digest presets、关键词组和按主题分组的 Markdown 输出。
- `rss-source-curator` 负责源治理和 registry 维护工作流。
- 这部分能力已并入准备中的 `v0.3.0`，不再作为单独 release gate。

## v0.3.0 本地优先研究范围

- `subscription-research-agent` 增加本地订阅研究工作流的高层编排入口。
- evidence brief 被视为带来源依据的上下文包，而不是最终研究结论。
- 研究日报是 Agent 基于 evidence brief 写作的综合产物，包含稳定的核心判断、重点资讯、信息源健康和后续跟踪问题。
- research workspace 采用本地优先设计，使用 SQLite、JSONL、JSON 配置和 Markdown 输出。
- RSS ingest run 会写入 SQLite，记录筛选条件、worker stats、source health 摘要、归档数量和实体链接数量。
- 每个源的健康观察会跨 ingest run 持久化，帮助 Agent 区分持续失败和临时故障。
- 当 RSS 元数据能明确区分时，evidence item 会包含保守的评论源和原始来源归因字段。
- `subscription-research` CLI 契约保持文件化，便于不同 Agent runtime 包装且不改变 Skill core。

## Skill 包结构

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

skills/rss-source-curator/
├── SKILL.md
├── agents/openai.yaml
└── references/
    ├── registry-maintenance.md
    └── source-governance.md

skills/subscription-research-agent/
├── SKILL.md
├── agents/openai.yaml
└── references/
    ├── daily-report.md
    ├── evidence-brief.md
    └── research-workspace.md
```

每个 `SKILL.md` 都是 Agent 入口。Python 脚本是多个 Skills 背后的共享确定性实现，不是项目的主要产品界面。

## 仓库结构

```text
.
├── skills/rss-ai-digest/        # 可移植 Skill 包
├── skills/rss-source-curator/   # 源治理 Skill 包
├── skills/subscription-research-agent/
│                                  # 本地优先研究编排 Skill
├── packages/research-cli/        # v0.3 本地研究 CLI package
├── examples/                    # Agent 和 Skill 调用示例
├── docs/                        # 项目状态、设计和验证历史
├── tests/                       # 行为回归测试
├── AGENTS.md                    # 通用编码 Agent 指令
├── CONTRIBUTING.md              # 贡献说明
├── LICENSE                      # MIT License
└── README.md                    # 英文 README
```

## 安装模型

这个仓库应作为一个或多个 Skill 包被使用：

- Agent runtime 应按需加载或复制 `skills/` 下的目录。
- 使用 `skills/rss-ai-digest/` 进行内容发现和日报生成。
- 使用 `skills/rss-source-curator/` 进行源治理和 registry 维护。
- 使用 `skills/subscription-research-agent/` 进行本地优先 evidence brief 编排和研究日报综合写作。
- 人类维护者应把 [`README.zh-CN.md`](./README.zh-CN.md)、[`AGENTS.md`](./AGENTS.md) 和 [`CHANGELOG.md`](./CHANGELOG.md) 作为项目级文档。
- 除非项目明确进入插件打包阶段，否则运行时专用 wrapper 应保持在 Skill core 之外。

## Research CLI

`packages/research-cli/` 是 v0.3 本地优先 `subscription-research` CLI 的 package 位置。它负责 research workspace、SQLite schema、RSS evidence ingest、ingest-run metadata、per-source health history、entity extraction 和 evidence brief 生成。`v0.3` 阶段继续调用现有 Python RSS worker，不重写 RSS parser。最终研究日报仍由 Agent 基于 evidence brief 写作，并遵循 Skill reference 契约。

## 能力概览

`rss-ai-digest` 当前支持：

- RSS 2.0 和 Atom 解析。
- OPML 导入，并保留 outline 分类。
- 面向 AI、工程、安全、产品和通用技术博客的基础 OPML。
- 通过 source metadata 设置 `base_score`、`language`、`tags` 等源先验。
- token-aware 关键词匹配和短语匹配。
- 面向 AI research、engineering deep dive、security risk、product/technology 工作流的确定性 digest presets。
- must / should / exclude 关键词组，用于明确质量标准。
- 带 `score_reasons` 的文章评分。
- 确定性 topic assignment 和按主题分组的 Markdown 输出。
- seen-state 去重。
- source health 持久化和 failed feeds 报告。
- 源质量评估和可审阅源治理 patch。
- 面向人阅读的 Markdown 输出和面向自动化的 JSON 输出。

## Agent 工作流

1. 按任务选择 Skill 入口：内容发现和摘要使用 [`rss-ai-digest`](./skills/rss-ai-digest/SKILL.md)，源治理使用 [`rss-source-curator`](./skills/rss-source-curator/SKILL.md)，evidence brief 和研究日报工作流使用 [`subscription-research-agent`](./skills/subscription-research-agent/SKILL.md)。
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

`v0.3` 的 `subscription-research` CLI 契约新增本地 research workspace 命令：

| 命令 | 用途 |
| --- | --- |
| `init` | 初始化本地 research workspace。 |
| `ingest rss` | 将 RSS evidence 归档到 research workspace。 |
| `brief evidence` | 基于本地 workspace 数据生成带来源依据的 evidence brief。 |
| `source-health` | 汇总多次 ingest 形成的历史源健康观察。 |

CLI 本身不直接生成最终研究报告。Agent 应基于 evidence brief，并参考 `subscription-research-agent` 的日报契约写作日报。

宽泛日报场景优先使用 `--should-keywords` 或 `--must-keyword-mode any`。只有在每个 must keyword 都必须同时出现在同一条 evidence 中时，才使用 `--must-keyword-mode all`。

源健康历史：

```bash
subscription-research source-health \
  --workspace research-workspace \
  --min-observations 2 \
  --disable-threshold 3 \
  --format markdown
```

基于源健康历史生成可审阅 registry patch：

```bash
subscription-research source-health \
  --workspace research-workspace \
  --min-observations 2 \
  --disable-threshold 3 \
  --format patch > source-health-curation.json
```

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
- research workspace 可能包含私人阅读历史、实体列表和 brief 草稿；`research-workspace/` 默认应保留在 Git 之外。
- 除非用户明确指定通知渠道，否则不要把 digest 或订阅数据发送到外部服务。
- `apply-source-patch` 只写入显式指定的 output 文件，应在审阅 curation 结果后使用。

## 文档

主要 Skill 文档：

- [`rss-ai-digest` 入口](./skills/rss-ai-digest/SKILL.md)
- [`rss-source-curator` 入口](./skills/rss-source-curator/SKILL.md)
- [`subscription-research-agent` 入口](./skills/subscription-research-agent/SKILL.md)
- [`rss-ai-digest` Feed registry 与状态结构](./skills/rss-ai-digest/references/feed-registry.md)
- [`rss-ai-digest` 评分规则](./skills/rss-ai-digest/references/scoring.md)
- [`rss-ai-digest` 自动化参考](./skills/rss-ai-digest/references/automation.md)
- [`rss-source-curator` 源治理](./skills/rss-source-curator/references/source-governance.md)
- [`rss-source-curator` registry 维护](./skills/rss-source-curator/references/registry-maintenance.md)
- [`subscription-research-agent` research workspace](./skills/subscription-research-agent/references/research-workspace.md)
- [`subscription-research-agent` evidence brief contract](./skills/subscription-research-agent/references/evidence-brief.md)
- [`subscription-research-agent` daily report contract](./skills/subscription-research-agent/references/daily-report.md)
- [`rss-ai-digest` 源元数据种子](./skills/rss-ai-digest/references/source-metadata.json)

项目维护文档：

- [项目状态](./docs/project-status.zh-CN.md)
- [已实现功能与迭代路线图](./docs/iteration-roadmap.zh-CN.md)
- [v0.3.0 release notes](./docs/releases/v0.3.0.md)
- [v0.2.0 release notes](./docs/releases/v0.2.0.md)
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
cd packages/research-cli && npm test
```

检查 whitespace：

```bash
git diff --check
```

如果本地有 Skill validator，可验证 Skill 包：

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-source-curator
python3 /path/to/skill-creator/scripts/quick_validate.py skills/subscription-research-agent
```

## 路线图

后续可能拆分的 Skills 或插件模块：

- `rss-alert-monitor`：关键词、作者、项目和主题监控。
- `rss-digest-publisher`：发布到 Email、飞书、Slack、Obsidian 或 webhook。
- `rss-feed-discovery`：从网站、GitHub 列表和目录发现 RSS 源。

这些模块应围绕共享 RSS primitives 进行扩展，而不是把同一套流程做成某个运行时专用 fork。
