# RSS Agent Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

[English README](./README.md) | [Agent 示例](./examples/README.md) | [更新日志](./CHANGELOG.md) | [v0.3.0](./docs/releases/v0.3.0.md)

面向 Agent 生态的可移植 RSS Skills 与本地优先订阅研究工作流。

这个仓库不是独立 RSS 应用，而是给 Agent 使用的 Skill 套件。Agent 应先加载对应的 `SKILL.md`，按需读取 references，用确定性 CLI 准备 evidence 和状态，最后由 Agent 写出用户需要的 digest、源评估或研究日报。

## Agent 路由

| 用户意图 | 加载的 Skill | 确定性步骤 | Agent 输出 |
| --- | --- | --- | --- |
| “做一份 AI/技术 RSS 日报。” | [`rss-ai-digest`](./skills/rss-ai-digest/SKILL.md) | 导入 OPML、抓取 RSS/Atom、筛选、评分、去重。 | 带选择理由的 Markdown 或 JSON digest。 |
| “监控某个主题的新文章。” | [`rss-ai-digest`](./skills/rss-ai-digest/SKILL.md) | 用明确的 state 路径运行 `check-new`。 | 新增匹配条目，并按策略更新 seen-state。 |
| “检查或清理订阅源。” | [`rss-source-curator`](./skills/rss-source-curator/SKILL.md) | 评估源健康并生成可审阅 patch。 | keep/watch/disable/remove 建议。 |
| “基于订阅信息写研究日报。” | [`subscription-research-agent`](./skills/subscription-research-agent/SKILL.md) | 将 evidence 归档到本地 workspace，并生成 evidence brief。 | 带来源边界和后续问题的 Agent 写作日报。 |

## Agent 工作流

1. 加载匹配的 Skill 入口：`skills/<skill-name>/SKILL.md`。
2. 只读取当前任务需要的 reference，例如 feed schema、评分规则、源治理、evidence brief 或日报契约。
3. 使用明确的 registry、seen-state、source-health、workspace、output 和 patch 路径。
4. 把 CLI 输出当作 evidence 和状态，不把它伪装成最终研究判断。
5. 按用户要求的语言和格式写最终产物。
6. 除非用户明确要求，不要发布、通知、删除源或禁用源。

## Skill 契约

### rss-ai-digest

用于内容发现和监控。覆盖 RSS 2.0、Atom、OPML 导入、关键词/日期/作者/分类/语言筛选、评分、主题分组、seen-state 去重，以及 Markdown 或 JSON digest 输出。

主要 references：

- [Feed registry](./skills/rss-ai-digest/references/feed-registry.md)
- [评分规则](./skills/rss-ai-digest/references/scoring.md)
- [自动化参考](./skills/rss-ai-digest/references/automation.md)
- [基础 OPML](./skills/rss-ai-digest/references/base-feeds.opml)

### rss-source-curator

用于源治理。它审查源质量、健康历史、失败源和 registry 变更。修改 registry 前，应先输出可审阅动作。

主要 references：

- [源治理](./skills/rss-source-curator/references/source-governance.md)
- [Registry 维护](./skills/rss-source-curator/references/registry-maintenance.md)

### subscription-research-agent

用于围绕订阅 evidence 的本地研究工作流。确定性工具准备 workspace 数据和 evidence brief；最终 memo 或日报由 Agent 写作。

主要 references：

- [Research workspace](./skills/subscription-research-agent/references/research-workspace.md)
- [Evidence brief](./skills/subscription-research-agent/references/evidence-brief.md)
- [日报契约](./skills/subscription-research-agent/references/daily-report.md)

## 确定性 Runtime

共享 runtime 是 [`packages/research-cli`](./packages/research-cli/README.md) 中的 Node/TypeScript `subscription-research` CLI。它保持文件化，方便不同 Agent runtime 调用同一套 Skill 契约。

常用命令：

- `subscription-research rss import-opml`
- `subscription-research rss digest`
- `subscription-research rss check-new`
- `subscription-research rss evaluate-sources`
- `subscription-research rss curate-sources`
- `subscription-research rss apply-source-patch`
- `subscription-research init`
- `subscription-research ingest rss`
- `subscription-research brief evidence`
- `subscription-research source-health`

Prompt 级示例见 [examples/README.md](./examples/README.md)。CLI 细节应放在 Skill references 和 package README 中，不放在项目首页里。

## 边界

当前不做：

- 完整 RSS 阅读器 UI。
- 托管研究服务。
- 内置 daemon、scheduler 或通知中心。
- Email、飞书、Slack、Webhook、Obsidian 发布器。
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

`feeds.json`、`seen.json`、`source-health.json`、`digest.md`、`research-workspace/` 等运行时输出不要提交进 Git。

## 项目文档

- [Agent 示例](./examples/README.md)
- [项目状态](./docs/project-status.zh-CN.md)
- [已实现功能与路线图](./docs/iteration-roadmap.zh-CN.md)
- [发布检查清单](./docs/release-checklist.md)
- [贡献说明](./CONTRIBUTING.md)
- [Agent 指令](./AGENTS.md)
- [Claude Code 指令](./CLAUDE.md)

设计历史保存在 [`docs/superpowers/`](./docs/superpowers/) 下。它是归档材料，不是使用文档。

## 维护者

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
