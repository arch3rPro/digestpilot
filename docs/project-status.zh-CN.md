# RSS Agent Skills 项目状态

日期：2026-05-20

## 当前定位

`rss-agent-skills` 是一个面向通用 agent 生态的 RSS Skills 仓库。当前已落地的正式 Skill 是 `rss-ai-digest`，用于 AI 与技术内容发现、订阅源聚合、条目筛选、评分、去重和源质量评估。

项目当前不是完整 RSS 阅读器，也不是独立 SaaS 产品。它更接近一个可被 Codex、Claude、OpenClaw、n8n、GitHub Actions、cron 或其他 agent/runtime 包装调用的可移植 RSS 工作流组件。

## 已实现功能

### 项目与 Skill 基础

- 已建立标准 Skill 结构：`skills/rss-ai-digest/SKILL.md`。
- 已提供平台中立的 CLI 实现：`skills/rss-ai-digest/scripts/rss_monitor.py`。
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

- `import-opml`：将 OPML 导入为 feed registry。
- `fetch`：抓取启用的订阅源并输出标准化 entries。
- `digest`：抓取、筛选、评分、去重并输出阅读摘要。
- `check-new`：检查新增匹配条目，适合监控类工作流。
- `evaluate-sources`：根据 registry 和 health 数据评估源质量。

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

### 性能与可靠性

- 已实现并发抓取。
- 支持 `--timeout`。
- 支持 `--max-workers`。
- 单个 feed 失败不会中断整个 digest。
- 已完成 92-feed 全量回归验证：优化后全量 digest 约 14-16 秒完成，旧串行路径约 2 分钟。

### 输出格式

- 支持 Markdown 输出，适合人阅读。
- 支持 JSON 输出，适合 agent、调度器、通知适配器或工作流系统消费。
- JSON digest 使用 envelope，而不是裸 entries 数组。

### 测试与验证

- 已有单元测试覆盖：
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
- 当前测试数量：23 个。
- Skill validator 已通过。
- 已有 post-optimization validation 文档记录真实性能和输出表现。

## 尚未实现功能

### 多 Skill 拆分

当前仍只有 `rss-ai-digest` 一个正式 Skill。以下 Roadmap Skill 尚未实现：

- `rss-source-curator`：源清理、源排序、OPML 维护。
- `rss-alert-monitor`：关键词、作者、项目、主题监控。
- `rss-digest-publisher`：发布到邮件、飞书、Slack、Obsidian 或 webhook。
- `rss-feed-discovery`：从网站、GitHub 列表和目录发现 RSS 源。

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

`evaluate-sources` 能给出建议，但不会自动修改 registry 或 OPML。

尚未实现：

- 自动禁用失败源。
- 自动删除低质量源。
- 生成 registry patch。
- 生成 OPML patch。
- 基于多次 health 观察的 cleanup command。

### RSS 源发现

尚未实现 feed discovery。

当前不能自动：

- 从网站 HTML 发现 RSS/Atom link。
- 从 GitHub Awesome list 或博客列表批量发现源。
- 从网页目录生成 OPML。
- 验证候选源后自动加入 registry。

### 高级筛选

尚未实现更复杂的筛选表达式：

- `--require-any-title-keyword`。
- must / should / exclude 关键词组。
- 布尔表达式筛选。
- 主题聚类。
- 语义去重。
- 相似文章合并。
- LLM rerank。

### 内容处理与摘要

当前处理的是 feed entry 元数据和 feed summary，不做完整正文处理。

尚未实现：

- 正文抓取。
- HTML 正文清洗。
- 可读性抽取。
- 长 summary 截断模式。
- 自动中文摘要。
- 自动生成日报导语。
- 按主题自动分组。
- 内容质量的 LLM 评审。

### 插件市场与 Claude 插件

当前仍是平台中立 Skill 包，尚未实现：

- Claude plugin packaging。
- 插件市场 manifest。
- 插件安装包。
- 插件版本发布流程。
- 多 runtime 插件适配层。

### 数据层与多用户

当前使用 JSON 文件作为轻量数据层。

尚未实现：

- SQLite 或数据库存储。
- 多用户 profile。
- 多工作区配置。
- 长期趋势分析。
- 可视化 dashboard。
- Web UI。

## 当前成熟度判断

当前项目已经达到“通用 agent 可调用的 RSS/AI 技术内容发现 Skill MVP + 性能和可观测性优化”阶段。

它适合用于：

- 日常 AI/技术 RSS digest。
- 新文章监控。
- 高质量技术源的基础维护。
- 作为未来插件或自动化工作流的底层 CLI。

它还不适合直接作为：

- 完整 RSS 阅读器。
- 多用户订阅平台。
- 通知中心。
- 插件市场成品。
- 自动源发现和清理系统。

## 推荐下一步

优先级最高的两个方向：

1. 继续增强内容质量筛选：扩展噪声源 metadata、must/should/exclude 关键词组和更严格的 AI digest preset。
2. 拆出 `rss-source-curator`：专门处理源评估、失败源治理、OPML/registry 清理和源质量维护。

如果目标是尽快进入可用工作流，建议先做内容质量筛选；如果目标是扩展成 RSS Skills 套件，建议先拆出 `rss-source-curator`。
