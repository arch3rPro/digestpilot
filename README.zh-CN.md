# RSS Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[English README](./README.md) | [调用示例](./examples/README.md) | [更新日志](./CHANGELOG.md) | [v0.3.0](./docs/releases/v0.3.0.md)

面向通用 Agent 生态的 RSS Skills 与本地优先订阅研究工作流。

`rss-agent-skills` 帮助 Agent 导入 RSS/Atom/OPML 订阅源，发现高信号 AI 与技术内容，维护订阅源质量，并生成带来源依据的 evidence brief。核心能力保持平台中立：Codex、Claude、Cursor、调度器和未来插件 wrapper 都应复用同一套 Skills 与 CLI 契约。

## 包含内容

| Package | 作用 |
| --- | --- |
| [`rss-ai-digest`](./skills/rss-ai-digest/SKILL.md) | RSS/Atom/OPML 导入、筛选、评分、去重、digest 输出和直接 RSS 命令。 |
| [`rss-source-curator`](./skills/rss-source-curator/SKILL.md) | 订阅源健康评估、源质量治理和可审阅 registry 维护。 |
| [`subscription-research-agent`](./skills/subscription-research-agent/SKILL.md) | 本地优先研究编排、evidence brief 和 Agent 写作的研究日报。 |
| [`packages/research-cli`](./packages/research-cli/README.md) | Node/TypeScript CLI runtime，负责 RSS 命令、SQLite research workspace、evidence archive 和 source-health history。 |

## 常用工作流

导入 OPML，归档 RSS evidence，并生成 brief：

```bash
subscription-research init --workspace research-workspace
subscription-research rss import-opml \
  --opml skills/rss-ai-digest/references/base-feeds.opml \
  --metadata skills/rss-ai-digest/references/source-metadata.json \
  --registry feeds.json
subscription-research ingest rss \
  --workspace research-workspace \
  --registry feeds.json \
  --since 24h \
  --should-keywords "llm,agent,rag,evals,inference" \
  --min-score 7
subscription-research brief evidence \
  --workspace research-workspace \
  --question "AI technology daily" \
  --since 24h
```

不创建 research workspace，直接生成 RSS digest：

```bash
subscription-research rss digest \
  --registry feeds.json \
  --state seen.json \
  --health source-health.json \
  --since 24h \
  --preset ai-strict \
  --format markdown
```

审阅源健康并生成治理 patch：

```bash
subscription-research source-health \
  --workspace research-workspace \
  --min-observations 2 \
  --disable-threshold 3 \
  --format patch > source-health-curation.json
```

## CLI 契约

当前确定性 runtime 是 Node/TypeScript `subscription-research` CLI。它刻意保持文件化：Agent 通过明确的 registry、state、health、output 和 workspace 路径来调用。

| 命令组 | 命令 |
| --- | --- |
| RSS registry 与 digest | `rss import-opml`、`rss fetch`、`rss digest`、`rss check-new` |
| 源治理 | `rss evaluate-sources`、`rss curate-sources`、`rss apply-source-patch`、`source-health` |
| Research workspace | `init`、`ingest rss`、`brief evidence` |

CLI 负责准备确定性的 evidence 和状态。最终研究日报仍由 Agent 基于 evidence brief 综合写作，并遵循 [`subscription-research-agent/references/daily-report.md`](./skills/subscription-research-agent/references/daily-report.md)。

## 边界

这个仓库不是完整 RSS 阅读器、托管研究平台、后台调度服务、通知中心或插件市场包。后续这些能力可以作为 wrapper 或独立 Skill 扩展。

当前不包含：

- 内置 daemon、cron 安装器或托管服务。
- Email、飞书、Slack、Webhook、Obsidian 等通知适配器。
- 自动 feed discovery。
- 正文抓取和 readability extraction。
- deterministic CLI 自动生成最终研究结论。
- Claude/OpenAI/OpenClaw 插件打包。

## 仓库结构

```text
skills/
  rss-ai-digest/
  rss-source-curator/
  subscription-research-agent/
packages/
  research-cli/
docs/
  releases/
  superpowers/
examples/
```

Agent 入口是 `skills/<skill-name>/SKILL.md`。Schema、评分规则、源列表和工作流参考放在各 Skill 的 `references/` 目录。`feeds.json`、`seen.json`、`source-health.json`、`digest.md`、`research-workspace/` 等运行时输出不要提交进 Git。

## 文档

- [调用示例](./examples/README.md)
- [项目状态](./docs/project-status.zh-CN.md)
- [已实现功能与路线图](./docs/iteration-roadmap.zh-CN.md)
- [发布检查清单](./docs/release-checklist.md)
- [贡献说明](./CONTRIBUTING.md)
- [Agent 指令](./AGENTS.md)
- [Claude Code 指令](./CLAUDE.md)

设计和实现历史保存在 [`docs/superpowers/`](./docs/superpowers/) 下。它是归档材料，不是主要使用文档。

## 开发

```bash
cd packages/research-cli && npm test
cd packages/research-cli && npm run typecheck
git diff --check
```

如果本地有 Skill validator：

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-ai-digest
python3 /path/to/skill-creator/scripts/quick_validate.py skills/rss-source-curator
python3 /path/to/skill-creator/scripts/quick_validate.py skills/subscription-research-agent
```

## 路线图

近期重点是持续做真实本地日报验证，并提升日报质量。后续扩展应保持模块化：

- `rss-feed-discovery`：从网站和 curated list 发现候选 RSS/Atom 源。
- `rss-alert-monitor`：将 alert 监控从日报中拆分出来。
- `rss-digest-publisher`：在用户显式配置后发布报告到外部渠道。
- 插件 wrapper：为特定 runtime 打包同一套核心契约，不改变 Skill 行为。
