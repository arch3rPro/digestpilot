# DigestPilot 项目状态

日期：2026-05-27

## 当前定位

`DigestPilot` 是一个面向通用 agent 生态的信息流聚合、日报生成与研究 evidence 工作流仓库。当前已落地的正式 Skills 是 `rss-ai-digest`、`public-trend-radar`、`rss-source-curator` 和 `subscription-research-agent`。`rss-ai-digest` 用于 AI 与技术内容发现、订阅源聚合、条目筛选、评分和去重；`public-trend-radar` 用于公开渠道趋势卡片；`rss-source-curator` 用于源质量治理和 registry 维护；`subscription-research-agent` 用于围绕订阅来源编排 evidence brief。

项目当前不是完整 RSS 阅读器，也不是独立 SaaS 产品或托管研究平台。它更接近一个可被不同 agent/runtime 包装调用的可移植 RSS 与订阅研究工作流组件。

## 已实现功能

### DigestPilot Skills Suite

- 已发布 `v0.1.0` 作为拆分前稳定检查点。
- Phase 2 已引入第二个正式 Skill：`rss-source-curator`。
- `v0.2.0` 的 RSS Skills suite 范围已并入 `v0.3.0`。
- `rss-ai-digest` 继续负责内容发现和日报。
- `public-trend-radar` 负责公开渠道趋势发现，不负责日报正文、源治理或发布。
- `rss-source-curator` 负责源质量治理和 registry 维护。

### Local-first Subscription Research Agent

- `v0.3` 引入 `subscription-research-agent` 作为深度研究编排 Skill。
- 新增 research workspace、evidence brief 与 daily report 契约文档。
- 本地 research workspace 使用 SQLite、JSONL、JSON 和 Markdown。
- CLI 生成 evidence brief，不直接生成最终研究报告。
- 研究日报或研究 memo 由 Agent 基于 evidence brief 写作，遵循稳定章节、来源边界、阅读顺序和后续问题契约。
- Node/TypeScript `subscription-research` CLI 是 `v0.3` 的本地执行层，用于 workspace 初始化、RSS evidence ingest、entity extraction 和 evidence brief generation。
- RSS ingest run 已写入 SQLite `research_runs`，记录筛选条件、RSS runtime stats、source health 摘要、归档数量和实体链接数量。
- article archive 和 evidence brief 已支持保守来源归因字段：`commentary_source`、`original_source` 和 `original_url`。
- evidence brief 已支持研究日报写作指导：source diversification、priority buckets、duplicate merge hints、attribution labels、low-confidence markers 和 quality checklist。
- 普通 RSS 日报、重点资讯和快速查询已明确归入 `rss-ai-digest`；源维护归入 `rss-source-curator`；深度研究归入 `subscription-research-agent`。
- RSS ingest 会写入每个源的历史健康观察，`subscription-research source-health` 可按多次观察输出 `keep`、`watch`、`lower_priority`、`disable_candidate` 建议。
- P2 正文 enrichment 已启动：`subscription-research content fetch` 可对已归档文章抓取正文、做 readability extraction，并写入 SQLite `article_content` 与 `data/content-cache/`。
- evidence brief 在存在正文 enrichment 时会优先使用 cleaned full-text excerpt；没有 enrichment 时继续使用 RSS summary。

### 项目与 Skill 基础

- 已建立标准 Skill 结构：`skills/rss-ai-digest/SKILL.md`、`skills/public-trend-radar/SKILL.md`、`skills/rss-source-curator/SKILL.md` 和 `skills/subscription-research-agent/SKILL.md`。
- 已提供本地研究 CLI：`packages/research-cli/`，其中 RSS ingest 和直接 RSS 命令统一使用 Node runtime。
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
- `subscription-research trend fetch-public`：公开趋势输入采集，用于从 HN 和 GitHub releases 生成本地输入文件。
- `subscription-research trend scan`：公开趋势雷达 MVP，用于从公开 URL 列表、HN item JSON 和 GitHub release JSON 生成 profile-aware trend cards，并支持 `--output` 直接落盘。
- `subscription-research content fetch`：对 research workspace 中已归档文章进行可选正文抓取、readability extraction、SQLite 写入和本地 cache。
- `subscription-research rss discover`：从网页 HTML 中发现 RSS/Atom alternate feed 候选。

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
- Markdown digest 保持内容优先，不输出 run stats、failed feeds 或源健康维护细节。
- `evaluate-sources` 已支持输出：
  - `status`
  - `score`
  - `recommendation`
  - `recommendation_reason`
  - `failure_count`
  - `success_count`
  - `last_error`
- 缺少 health 的源会被视为 `unknown/watch`，不会被误判为低质量。
- 失败源错误信息保留在 JSON、health 文件和源维护命令中，不进入普通日报正文。
- 可通过 `curate-sources` 生成 `keep`、`watch`、`lower-priority`、`disable`、`remove` 等源维护建议。
- `curate-sources` 只输出建议，不会自动禁用或删除源。
- 可通过 `apply-source-patch` 将已审阅 patch 安全应用到新的 registry 文件。

### 性能与可靠性

- 已实现并发抓取。
- 支持 `--timeout`。
- 支持 `--max-workers`。
- 单个 feed 失败不会中断整个 digest。
- 已完成 92-feed 全量回归验证：优化后全量 digest 约 14-16 秒完成，旧串行路径约 2 分钟。
- 真实“产品经理方向昨日报”使用表明：如果每次日报都临时全量抓取 92 个 feed，并且为补齐方向结果重复多轮筛选，交互体验仍会偏慢。

当前性能结论：

- 全量实时抓取适合作为刷新或 fallback，不适合作为每次普通日报的默认交互路径。
- 普通日报、重点资讯和方向查询应优先从本地归档或 SQLite 查询。
- 产品经理等垂直方向需要更小、更准确的 source profile，避免每次扫描完整基础 OPML。

### 输出格式

- 支持 Markdown 输出，适合人阅读。
- Markdown digest 会按确定性 topic 分组。
- 支持 JSON 输出，适合 agent、调度器、通知适配器或工作流系统消费。
- JSON digest 使用 envelope，而不是裸 entries 数组。
- JSON entries 包含 `topic` 字段，便于下游路由。

### 测试与验证

- 当前 Node research CLI 单元测试覆盖：
  - workspace 初始化。
  - RSS ingest 和 direct RSS commands。
  - OPML、RSS 和 Atom fixture 解析。
  - 关键词、作者、日期筛选。
  - token-aware keyword matching。
  - phrase matching。
  - 评分逻辑。
  - seen-state 去重。
  - health 持久化和 source health 历史。
  - Markdown 日报隐藏 failed-feed 维护细节，JSON 仍保留 failures。
  - 并发抓取。
  - deterministic ordering。
  - source evaluation 和 source patch。
  - content enrichment 和 readability extraction。
  - feed discovery、feed validation 和 discovery patch 合入。
  - public trend profiles、public signal adapters、public trend fetch、trend clustering、trend scoring 和 trend cards。
  - entity extraction、article attribution、evidence brief 和 daily-report guidance。
- 当前 Node research CLI 测试数量：61 个。
- Skill validator 已通过。
- 已有 post-optimization validation 与 P1 daily-report regression 文档记录真实性能和输出表现。
- P1 本地研究日报主线已完成 3 次真实回归，并验证多次 source-health observations。

## 尚未实现功能

### 普通日报 archive-first 查询

尚未实现从本地归档直接生成普通日报的快速路径。

当前问题：

- 用户临时请求日报时，默认仍容易走实时全量 RSS 抓取。
- 如果方向关键词过窄，Agent 可能需要重复运行不同筛选条件，导致同一批 feed 被多次抓取。
- `product-tech` preset 可以筛选产品/商业技术内容，但还不是产品经理方向的完整源池。

待实现：

- 按日期、关键词、topic、source profile 查询 SQLite/archive 中的 RSS 条目。
- 为普通日报增加 archive-first workflow，只有本地归档缺失或用户要求刷新时才实时抓取。
- 支持 `product-manager` 等方向 source profile 或 registry subset。
- 在同一次日报工作流中缓存抓取 envelope，避免重复网络请求。
- 增加性能回归记录：对比实时全量抓取和本地 archive 查询耗时。

### 后续多 Skill 扩展

当前已完成早期 RSS Skills Suite Phase 2 的主要文档与功能准备，正式 Skills 包括 `rss-ai-digest` 和 `rss-source-curator`。这部分能力已并入 `v0.3.0`。以下 Roadmap Skill 尚未实现：

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

已实现基础能力：

- `subscription-research source-health --format patch` 可基于历史观察生成可审阅 registry patch。

已增强：

- 输出连续失败次数、最近成功时间、最近失败时间和维护优先级。
- 对有成功记录但失败率偏高的源输出 `lower_priority`，避免直接归入持续失败。

后续仍可结合 registry 里的源先验分数和标签生成更细的降权 patch。

### RSS 源发现

已实现 feed discovery 的第一阶段：

- `subscription-research rss discover --url ...` 可抓取网页并解析 RSS/Atom `<link rel="alternate">`。
- `subscription-research rss discover --input candidate-pages.md` 可从 URL 列表或 Markdown 列表批量检查候选页面，并合并去重发现到的 feed。
- 输出候选 feed 的 `id`、`title`、`url`、`source_page` 和 `type`，不直接写入主 registry。
- `--validate` 可继续抓取候选 feed，验证是否能被 RSS/Atom parser 解析，记录 `valid` / `invalid`、条目数量、样例标题和错误信息。
- discovery 输出包含 `registry_patches`，可作为人工审阅后的 registry patch 候选。
- `apply-source-patch` 已支持从 discovery 的 `registry_patches` 新增源到 registry，仍默认 dry-run，显式 `--apply` 才写出结果。

尚未实现：

- 更强的 GitHub Awesome list 结构解析，例如按 section 自动生成 category/tag。
- 从网页目录生成 OPML。
- 候选源主题推断和初始质量评分。

### 更高级筛选

尚未实现更复杂的筛选表达式：

- 布尔表达式筛选。
- 语义去重。
- 相似文章合并。
- LLM rerank。

### 内容处理与摘要

当前已启动 P2 正文 enrichment：在 RSS ingest 之后，可用 `subscription-research content fetch` 对已归档文章抓取正文并做 readability extraction。结果写入 `article_content`，并缓存到 `data/content-cache/`。`subscription-research-agent` 已提供日报写作契约，日报综合仍由 Agent 基于 evidence brief 完成。

已实现：

- 可选正文抓取。
- 基于 `@mozilla/readability` 和 `jsdom` 的 HTML 正文清洗与可读性抽取。
- 正文 excerpt 持久化到 SQLite 和本地 JSON cache。
- evidence brief 优先使用正文 enrichment excerpt，缺失时回退 RSS summary。

尚未实现：

- 长 summary 截断模式。
- deterministic CLI 自动中文摘要。
- deterministic CLI 自动生成最终日报。
- 内容质量的 LLM 评审。
- 全文级原始来源解析；当前只做 RSS 元数据层面的保守归因。

### 插件市场与 Claude 插件

当前仍是平台中立 Skill 包，尚未实现：

- Claude Code/Codex plugin packaging。
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

当前项目已经达到“通用 agent 可调用的信息流聚合、RSS/AI 技术内容发现、公开趋势雷达与本地研究 evidence foundation”阶段。

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

1. 继续完善 `public-trend-radar`：当前 MVP 已支持 profile-aware trend cards 和 `web-url-list` 输入，下一步补 GitHub/HN/arXiv 或 Hugging Face papers。
2. 强化两个 profile：`ai-tech` 和 `product-business` 继续共享趋势聚类、评分和输出结构，但分开渠道权重和判断标准。
3. 首批公开渠道继续控制在 GitHub、HN、web-url-list、arXiv 或 Hugging Face papers；暂缓私有渠道和高权限社交渠道。
4. 完成普通日报 archive-first 查询，解决每次临时全量抓取导致的慢体验，并允许日报消费 trend cards。
5. 后续再规划 `rss-digest-publisher`、通知 adapter、插件包装和多 runtime 分发。

如果目标是继续扩展 DigestPilot Skills 套件，应优先保持共享数据结构、CLI 契约和文档入口一致。
