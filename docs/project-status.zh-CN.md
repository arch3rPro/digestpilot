# RSS Agent Skills 项目状态

日期：2026-05-21

## 当前定位

`rss-agent-skills` 是一个面向通用 agent 生态的 RSS Skills 与本地优先订阅研究工作流仓库。当前已落地的正式 Skills 是 `rss-ai-digest`、`rss-source-curator` 和 `subscription-research-agent`。`rss-ai-digest` 用于 AI 与技术内容发现、订阅源聚合、条目筛选、评分和去重；`rss-source-curator` 用于源质量治理和 registry 维护；`subscription-research-agent` 用于围绕订阅来源编排 evidence brief。

项目当前不是完整 RSS 阅读器，也不是独立 SaaS 产品或托管研究平台。它更接近一个可被不同 agent/runtime 包装调用的可移植 RSS 与订阅研究工作流组件。

## 已实现功能

### RSS Skills Suite

- 已发布 `v0.1.0` 作为拆分前稳定检查点。
- Phase 2 已引入第二个正式 Skill：`rss-source-curator`。
- `v0.2.0` 的 RSS Skills suite 范围已并入准备中的 `v0.3.0` release target。
- `rss-ai-digest` 继续负责内容发现和日报。
- `rss-source-curator` 负责源质量治理和 registry 维护。

### Local-first Subscription Research Agent

- `v0.3` 引入 `subscription-research-agent` 作为研究编排 Skill。
- 新增 research workspace、evidence brief 与 daily report 契约文档。
- 本地 research workspace 使用 SQLite、JSONL、JSON 和 Markdown。
- CLI 生成 evidence brief，不直接生成最终研究报告。
- 研究日报由 Agent 基于 evidence brief 写作，遵循稳定章节、来源边界、阅读顺序和后续问题契约。
- Node/TypeScript `subscription-research` CLI 是 `v0.3` 的本地执行层，用于 workspace 初始化、RSS evidence ingest、entity extraction 和 evidence brief generation。
- RSS ingest run 已写入 SQLite `research_runs`，记录筛选条件、RSS runtime stats、source health 摘要、归档数量和实体链接数量。
- article archive 和 evidence brief 已支持保守来源归因字段：`commentary_source`、`original_source` 和 `original_url`。
- RSS ingest 会写入每个源的历史健康观察，`subscription-research source-health` 可按多次观察输出 `keep`、`watch`、`disable_candidate` 建议。

### 项目与 Skill 基础

- 已建立标准 Skill 结构：`skills/rss-ai-digest/SKILL.md`、`skills/rss-source-curator/SKILL.md` 和 `skills/subscription-research-agent/SKILL.md`。
- 已提供平台中立的 Python 兼容 CLI：`skills/rss-ai-digest/scripts/rss_monitor.py`。
- 已新增本地研究 CLI：`packages/research-cli/`，其中 RSS ingest 默认使用 Node runtime。
- 已提供 README、CHANGELOG、AGENTS.md、CLAUDE.md 和设计/验证文档。
- 已保持核心行为与具体运行时解耦，不依赖 Codex、Claude 或特定插件市场。
- 已提供 OpenAI/Codex 风格的可选 UI metadata：`skills/rss-ai-digest/agents/openai.yaml`。

### RSS、Atom 与 OPML

- 支持 RSS 2.0 解析。
- 支持 Atom 解析。
- 支持 OPML 导入。
- 提供基础 OPML：`skills/rss-ai-digest/references/base-feeds.opml`。
- 基础 OPML 当前包含 92 个 AI、工程、安全、产品与通用技术博客源。
- OPML outline 分组会保留为 feed `category`。
- 支持导入时通过 `--metadata` 应用源先验元数据。
- 提供源元数据种子：`skills/rss-ai-digest/references/source-metadata.json`。

### CLI 命令

已实现以下命令：

- `subscription-research rss import-opml`：将 OPML 导入为 feed registry。
- `fetch`：抓取启用的订阅源并输出标准化 entries。
- `digest`：抓取、筛选、评分、去重并输出阅读摘要。
- `check-new`：检查新增匹配条目，适合监控类工作流。
- `evaluate-sources`：根据 registry 和 health 数据评估源质量。
- `subscription-research rss curate-sources`：生成可审阅源治理动作和 registry patch 建议，不直接修改源文件。
- `apply-source-patch`：对已审阅的源治理 patch 做 dry-run 或写入新的 registry 文件。
- `subscription-research source-health`：汇总多次 ingest 形成的历史源健康观察。

### 筛选能力

已支持按以下维度筛选条目：

- 关键词。
- 日期窗口，例如 `24h`。
- 作者。
- 分类。
- 语言。

关键词匹配已经做过优化：

- 单词关键词使用 token-aware 匹配，避免 `ai` 误命中无关长词。
- 多词关键词使用 phrase matching。
- 支持 `--preset ai-strict`，可一键应用严格 AI digest 默认筛选。
- 支持 `ai-research`、`engineering-deep-dive`、`security-risk`、`product-tech` 等确定性 digest presets。
- 支持 `--must-keywords`、`--should-keywords`、`--exclude-keywords` 关键词组，用于明确质量标准。
- 支持 `--require-any-title-keyword`，可过滤 summary-only 的弱匹配。
- 支持 `--exclude-keywords`，可排除噪声关键词或短语。
- 支持 `--keyword-mode all`，要求所有关键词都命中。
- 输出 `matched_keywords`。
- 输出 `matched_keyword_locations`，例如 `title` 或 `summary`。

### 评分与排序

- 已实现 10 分制文章评分。
- 支持 `--min-score` 分数门槛。
- 评分考虑 AI/工程相关性、技术深度、来源先验、发布时间、噪声特征等。
- 标题关键词命中会加分。
- 仅 summary 命中的弱匹配会降权。
- 条目会被分配确定性 topic：`AI / LLM`、`Engineering`、`Security`、`Product / Business` 或 `Other`。
- 输出 `score_reasons`，便于 agent 或用户解释推荐原因。
- 并发抓取后仍保持稳定排序，便于自动化和结果对比。

### 去重与状态

- 支持 `seen.json` 已见状态。
- 支持基于链接、GUID、标题和日期的条目 identity。
- 支持 `--mark-seen reported-only`、`--mark-seen all-filtered`、`--mark-seen none`。
- 默认推荐使用 `reported-only`，只标记已报告条目，避免低分条目被提前隐藏。

### 源健康与源治理

- `digest` 和 `check-new` 支持 `--health` 持久化源健康状态。
- health 会合并历史记录，而不是每次只保留单次结果。
- JSON digest 输出包含 `health`、`failures`、`stats` 和 `generated_at`。
- Markdown digest 输出包含 run stats 和 failed feeds。
- `evaluate-sources` 已支持输出：
  - `status`
  - `score`
  - `recommendation`
  - `recommendation_reason`
  - `failure_count`
  - `success_count`
  - `last_error`
- 缺少 health 的源会被视为 `unknown/watch`，不会被误判为低质量。
- 失败源会暴露错误信息，不再被隐藏成“没有匹配条目”。
- 可通过 `curate-sources` 生成 `keep`、`watch`、`lower-priority`、`disable`、`remove` 等源维护建议。
- `curate-sources` 只输出建议，不会自动禁用或删除源。
- 可通过 `apply-source-patch` 将已审阅 patch 安全应用到新的 registry 文件。

### 性能与可靠性

- 已实现并发抓取。
- 支持 `--timeout`。
- 支持 `--max-workers`。
- 单个 feed 失败不会中断整个 digest。
- 已完成 92-feed 全量回归验证：优化后全量 digest 约 14-16 秒完成，旧串行路径约 2 分钟。

### 输出格式

- 支持 Markdown 输出，适合人阅读。
- Markdown digest 会按确定性 topic 分组。
- 支持 JSON 输出，适合 agent、调度器、通知适配器或工作流系统消费。
- JSON digest 使用 envelope，而不是裸 entries 数组。
- JSON entries 包含 `topic` 字段，便于下游路由。

### 测试与验证

- 已有 Python 单元测试覆盖：
  - OPML 导入。
  - RSS 和 Atom 解析。
  - 关键词、作者、日期筛选。
  - token-aware keyword matching。
  - phrase matching。
  - 评分逻辑。
  - seen-state 去重。
  - health 持久化。
  - failed feeds 输出。
  - 并发抓取。
  - deterministic ordering。
  - source evaluation。
- 当前 Python RSS monitor 测试数量：44 个。
- 当前 Node research CLI 测试数量：14 个。
- Skill validator 已通过。
- 已有 post-optimization validation 文档记录真实性能和输出表现。

## 尚未实现功能

### 后续多 Skill 扩展

当前已完成 RSS Skills Suite Phase 2 的主要文档与功能准备，正式 Skills 包括 `rss-ai-digest` 和 `rss-source-curator`。这部分能力已并入准备中的 `v0.3.0` release target。以下 Roadmap Skill 尚未实现：

- `rss-alert-monitor`：关键词、作者、项目、主题监控。
- `rss-digest-publisher`：发布到邮件、飞书、Slack、Obsidian 或 webhook。
- `rss-feed-discovery`：从网站、GitHub 列表和目录发现 RSS 源。

拆分前稳定检查点已通过 `v0.1.0` 发布完成。后续新增 Skill 应继续复用共享 RSS primitives，并保持平台中立。

### 通知渠道集成

尚未内置以下通知渠道：

- Slack。
- 飞书。
- Email。
- Webhook。
- Obsidian。
- 其他消息或知识库系统。

当前做法是输出 Markdown 或 JSON，由外部 wrapper、agent 或自动化系统负责发送。

### 定时任务执行器

项目本身没有内置 scheduler、daemon 或后台服务。

已提供自动化参考，但以下能力尚未内建：

- 自动创建 cron job。
- 自带后台轮询。
- 自带 GitHub Actions 工作流模板执行。
- 自带 n8n workflow。
- 自带 Codex/Claude recurring automation 配置生成器。

### 自动源清理

`evaluate-sources` 和 `curate-sources` 能给出建议，`apply-source-patch` 能把已审阅 registry patch 写入新的 registry 文件。`subscription-research source-health` 已能基于多次 ingest 的历史观察区分稳定源、间歇失败源和持续失败源。

尚未实现：

- 无人工审阅的自动禁用失败源。
- 无人工审阅的自动删除低质量源。
- 生成 OPML patch。
- 基于历史观察自动生成 registry patch 的 cleanup command。

### RSS 源发现

尚未实现 feed discovery。

当前不能自动：

- 从网站 HTML 发现 RSS/Atom link。
- 从 GitHub Awesome list 或博客列表批量发现源。
- 从网页目录生成 OPML。
- 验证候选源后自动加入 registry。

### 更高级筛选

尚未实现更复杂的筛选表达式：

- 布尔表达式筛选。
- 语义去重。
- 相似文章合并。
- LLM rerank。

### 内容处理与摘要

当前处理的是 feed entry 元数据和 feed summary，不做完整正文处理。`subscription-research-agent` 已提供日报写作契约，但日报综合仍由 Agent 基于 evidence brief 完成。

尚未实现：

- 正文抓取。
- HTML 正文清洗。
- 可读性抽取。
- 长 summary 截断模式。
- deterministic CLI 自动中文摘要。
- deterministic CLI 自动生成最终日报。
- 内容质量的 LLM 评审。
- 全文级原始来源解析；当前只做 RSS 元数据层面的保守归因。

### 插件市场与 Claude 插件

当前仍是平台中立 Skill 包，尚未实现：

- Claude plugin packaging。
- 插件市场 manifest。
- 插件安装包。
- 插件版本发布流程。
- 多 runtime 插件适配层。

### 数据层与多用户

RSS digest 侧仍使用 JSON 文件作为轻量状态层。`subscription-research-agent` 的本地研究工作区已引入 SQLite、JSONL、JSON 配置和 Markdown 输出。

尚未实现：

- 多用户 profile。
- 多工作区配置。
- 长期趋势分析。
- 可视化 dashboard。
- Web UI。

## 当前成熟度判断

当前项目已经达到“通用 agent 可调用的 RSS/AI 技术内容发现 Skill MVP + 性能和可观测性优化”，并开始进入“本地优先订阅研究 Agent foundation”阶段。

它适合用于：

- 日常 AI/技术 RSS digest。
- 新文章监控。
- 高质量技术源的基础维护。
- 围绕订阅来源生成 evidence brief。
- 作为未来插件或自动化工作流的底层 CLI。

它还不适合直接作为：

- 完整 RSS 阅读器。
- 多用户订阅平台。
- 托管研究平台。
- 通知中心。
- 插件市场成品。
- 自动源发现和清理系统。

## 推荐下一步

优先级最高的方向：

1. 对 `v0.3.0` 做发布前审阅、验证、打 tag 和发布。
2. 继续用真实本地日报验证 research CLI、evidence brief、daily report contract 和 source-health history。
3. 实现 source-health history 到可审阅 registry patch 的闭环。
4. 继续增强内容质量筛选：扩展噪声源 metadata、布尔表达式、语义去重和 LLM rerank。
5. 规划后续独立 Skills，例如 `rss-alert-monitor`、`rss-digest-publisher` 和 `rss-feed-discovery`。

如果目标是继续扩展 RSS Skills 套件，应优先保持共享数据结构、CLI 契约和文档入口一致。
