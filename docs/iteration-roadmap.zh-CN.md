# RSS Agent Skills 功能汇总与迭代路线图

日期：2026-05-22

代码基线：`main` / `619531c`

## 当前定位

`rss-agent-skills` 已经从单一 RSS digest Skill 演进为一组面向通用 Agent 生态的订阅信息处理能力：

- `rss-ai-digest`：负责 RSS/Atom/OPML 导入、内容筛选、评分、去重和摘要输出。
- `rss-source-curator`：负责订阅源健康评估、源治理建议和 registry 维护。
- `subscription-research-agent`：负责围绕订阅来源组织本地优先研究工作流，生成 evidence brief，并指导 Agent 写作研究日报。
- `packages/research-cli`：提供本地 research workspace、SQLite 持久化、RSS evidence ingest、实体抽取和 evidence brief 生成。

当前项目不是完整 RSS 阅读器、托管研究平台、通知中心或插件市场包。它更像一套可被不同 Agent/runtime 包装调用的本地优先订阅研究底座。

## 已实现功能汇总

### 1. Skill 套件结构

- 已建立标准 Skill 目录：`skills/<skill-name>/SKILL.md`。
- 当前包含 3 个正式 Skills：`rss-ai-digest`、`rss-source-curator`、`subscription-research-agent`。
- 每个 Skill 都保留平台中立入口，不要求依赖 Codex、Claude、Cursor、OpenClaw、n8n、GitHub Actions 或单一 notes app。
- 运行时 metadata 目前只作为可选适配层保留在 `agents/openai.yaml`，不进入核心能力契约。
- 已提供英文 README、中文 README、examples、AGENTS.md、CLAUDE.md、CONTRIBUTING.md、CHANGELOG.md、release notes 和 release checklist。

### 2. RSS 内容发现与日报能力

`rss-ai-digest` 已实现：

- RSS 2.0 和 Atom 解析。
- OPML 导入，并保留 OPML outline 分组为 feed category。
- 基础 OPML：`skills/rss-ai-digest/references/base-feeds.opml`，包含 AI、工程、安全、产品和通用技术源。
- 通过 `source-metadata.json` 应用源先验，例如 `base_score`、`language` 和 `tags`。
- `subscription-research rss import-opml`、`fetch`、`digest`、`check-new`、`evaluate-sources`、`curate-sources`、`apply-source-patch` 等 Node 命令。
- Markdown 和 JSON 输出；JSON 使用 envelope，便于 Agent 或自动化系统消费。

内容筛选已支持：

- 关键词、作者、日期窗口、分类和语言。
- token-aware 单词匹配，避免 `ai` 等短词误命中长词。
- 多词短语匹配。
- `--must-keywords`、`--should-keywords`、`--exclude-keywords`。
- `--keyword-mode all`。
- `--require-any-title-keyword`。
- `ai-strict`、`ai-research`、`engineering-deep-dive`、`security-risk`、`product-tech` 等确定性 presets。

评分与排序已支持：

- 10 分制 deterministic scoring。
- `--min-score`。
- `score_reasons`。
- `matched_keywords` 和 `matched_keyword_locations`。
- topic assignment：`AI / LLM`、`Engineering`、`Security`、`Product / Business`、`Other`。
- 并发抓取后的稳定排序。

状态与去重已支持：

- `seen.json` 已见状态。
- 基于 link、GUID、title、published 的 entry identity。
- `--mark-seen reported-only`、`all-filtered`、`none`。
- 默认推荐只标记已报告条目，避免低分候选被提前隐藏。

### 3. 源治理与健康维护能力

`rss-source-curator` 和 RSS monitor 已实现：

- `--health` 持久化源健康状态。
- 单次运行失败不会中断整体 digest。
- JSON digest 输出 `health`、`failures`、`stats` 和 `generated_at`。
- Markdown digest 输出 run stats 和 failed feeds。
- `evaluate-sources` 输出源状态、分数、建议、失败次数、成功次数和最后错误。
- 缺少 health 的源会被视为 `unknown/watch`，不会被误判为低质量源。
- `curate-sources` 生成 `keep`、`watch`、`lower-priority`、`disable`、`remove` 等可审阅动作。
- `apply-source-patch` 支持 dry-run 或将已审阅 patch 写入新的 registry 文件。
- `subscription-research source-health` 可基于多次 ingest 的历史观察输出 `keep`、`watch`、`disable_candidate` 等建议。

当前治理策略是“建议优先、人工审阅后应用”，避免无审阅自动删除或禁用源。

### 4. 本地优先研究工作流

`subscription-research-agent` 和 `packages/research-cli` 已实现：

- `subscription-research init`：初始化本地 research workspace。
- `subscription-research ingest rss`：默认使用 Node RSS runtime，将订阅 evidence 归档到本地 workspace；可通过 `--rss-runtime python` 使用兼容 worker。
- `subscription-research brief evidence`：从本地数据生成 evidence brief。
- evidence brief 已支持清洗后的摘要和 `must_keyword_mode`，宽泛日报不再默认要求所有 must keyword 同时命中。
- `subscription-research source-health`：汇总多次 ingest 形成的源健康历史。
- `subscription-research source-health --format patch`：将源健康历史转换为可审阅 registry patch envelope。
- SQLite schema migration，当前已包含 ingest run、article attribution、source health observation 等表结构演进。
- RSS ingest run 写入 SQLite，记录筛选条件、worker stats、source health summary、归档数量和实体链接数量。
- article archive 和 evidence brief 支持保守来源归因：`commentary_source`、`original_source`、`original_url`。
- entity extraction 和 article-entity linking，用于后续按公司、项目、人物、技术主题组织研究材料。
- evidence brief 是来源上下文包，不直接伪装成最终研究结论。
- daily report contract 已规定 Agent 写作日报时的章节、来源边界、判断方式和后续问题。

### 5. 测试、验证与发布基础

- Python RSS monitor 单元测试已覆盖 OPML、RSS、Atom、筛选、评分、去重、health、failed feeds、并发抓取、排序、源评估和源 patch。
- Node research CLI 测试已覆盖 workspace 初始化、RSS ingest、entity extraction、evidence brief 和 source health。
- 已完成真实 RSS 全量回归验证，92-feed digest 优化后约 14-16 秒完成。
- 已通过 Skill validator 验证 3 个 Skill 包。
- 已发布 `v0.1.0` 稳定检查点。
- `v0.3.0` release notes / changelog 已准备，并包含此前 `v0.2.0` 的 RSS Skills suite 范围，但尚未创建 release tag。

## 当前能力边界

已经具备：

- 通用 Agent 可调用的 RSS/AI 技术内容发现 MVP。
- 面向高质量源筛选的源治理基础。
- 本地优先订阅研究 workspace foundation。
- Agent 写作研究日报所需的 evidence brief 和日报契约。
- 文件化、可迁移、平台中立的 CLI contract。

尚未具备：

- 内置 scheduler、daemon 或后台服务。
- 通知渠道集成，例如 Email、飞书、Slack、Webhook、Obsidian。
- 自动 feed discovery。
- 自动无审阅源清理。
- 全文抓取、HTML 清洗和 readability extraction。
- deterministic CLI 自动生成最终研究日报。
- 语义去重、相似文章合并、LLM rerank。
- 插件市场 packaging、Claude plugin packaging 或多 runtime 安装器。
- 多用户、多 workspace profile、长期趋势 dashboard 或 Web UI。

## 后续迭代任务

### P0：版本与发布卫生

目标：让当前已合并功能有清晰版本边界，降低后续拆 Skill 或插件化时的认知成本。

- 将此前 `v0.2.0` source curator scope 合并进 `v0.3.0` 一次发布。
- 更新 `VERSION`、release notes 和 changelog 的实际状态。
- 在发布前运行 Python tests、Node tests、typecheck、Skill validation 和 `git diff --check`。
- 发布后把本地安装目录与仓库 Skill 目录再次同步。

建议：短期重点已经转向 research Agent，优先发布 `v0.3.0`，并在 release note 中说明 `v0.2.0` 能力已被包含。

### P1：真实本地研究工作流加固

目标：把“能跑通”推进到“可稳定用于日常研究日报”。

- 连续运行 3-5 次真实 AI/技术日报，积累 source health observations。
- 将每次日报的 evidence brief、日报成品、source-health summary 和失败原因归档为小型验证记录。
- 建立日报质量 checklist：来源覆盖、原始来源归因、重复内容、标题党过滤、中文摘要可读性、后续问题质量。
- 已调整 daily report contract，让 Agent 更稳定地区分事实、判断、风险和待跟踪问题，并减少源治理信息在日报中的占比。
- 增加针对真实失败模式的回归样例，但单元测试继续避免依赖网络。

### P1：源健康历史到 registry patch 的闭环

目标：让 source health history 能自然进入可审阅维护流程。

- 已扩展 `source-health` 命令，可从 `source_health_observations` 生成 reviewable registry patch。
- patch 继续保持人工审阅，不自动写回原 registry。
- 已支持按观察次数、失败率和错误类型生成 `keep`、`watch`、`disable` 建议。
- 已输出治理解释，说明为什么建议 keep、watch 或 disable。
- 已补充 Node tests 和 Skill reference 文档。
- 后续可继续补充连续失败次数、最近成功时间、源优先级和 `lower-priority` 建议。

### P1：研究日报质量增强

目标：提升日报从“条目罗列”到“研究判断”的稳定性。

- 在 evidence brief 中提供更清晰的 priority buckets。
- 增加重复主题合并提示，避免多个源转载同一事件时日报膨胀。
- 强化 `commentary_source` 与 `original_source` 的展示规则。
- 为中文日报补充推荐文风：短标题、关键信息、影响判断、行动建议。
- 增加“低置信度/仅二手来源”标记，降低误读转载内容的风险。

### P2：正文获取与内容质量过滤

目标：从 feed metadata 级别推进到正文级 evidence。

- 引入可选正文抓取，不作为基础 digest 的硬依赖。
- 增加 HTML 清洗和 readability extraction。
- 为正文抓取建立缓存，避免重复访问和不必要网络请求。
- 支持正文级关键词、实体和主题提取。
- 加入长文截断、引用边界和来源保真策略。
- 为 LLM rerank 预留接口，但不让核心流程依赖特定 LLM provider。

### P2：RSS feed discovery

目标：降低优质源维护成本。

- 新增 `rss-feed-discovery` Skill 或 CLI 子命令。
- 从网页 HTML 的 RSS/Atom link 自动发现 feed。
- 从 GitHub Awesome list、博客列表和目录页抽取候选源。
- 对候选源做解析、健康检查、主题推断和初始评分。
- 输出可审阅 OPML 或 registry patch，而不是直接污染主 registry。

### P2：监控与告警拆分

目标：把“日报”和“监控”拆成不同使用心智。

- 规划 `rss-alert-monitor` Skill。
- 支持关键词、作者、项目、公司、论文、漏洞和产品发布监控。
- 保持输出为 JSON/Markdown，由外部 scheduler 或通知系统负责触发和发送。
- 增加 alert 去重、冷却窗口和优先级字段。

### P3：发布与通知适配器

目标：将结果交付到用户真正阅读的位置。

- 规划 `rss-digest-publisher` Skill。
- 支持 Email、飞书、Slack、Webhook、Obsidian 等 adapter。
- 所有外发渠道必须显式启用，并清楚处理隐私边界。
- publisher 只消费 digest/evidence/report 文件，不重新实现 RSS 逻辑。

### P3：插件化与分发

目标：在核心能力稳定后扩展到插件市场。

- 先保持 Skill core 平台中立。
- 后续再添加 Claude plugin、OpenAI/Codex plugin、OpenClaw 或其他 runtime wrapper。
- wrapper 只负责安装、权限、UI metadata 和命令调用，不分叉核心实现。
- 为 marketplace 准备 manifest、版本策略、示例工作流和安全说明。

### P3：多工作区与可视化

目标：服务更长期的个人或团队研究工作流。

- workspace profile 管理。
- 多主题订阅集。
- 长期源质量趋势。
- 研究主题趋势。
- Web dashboard 或本地 TUI。
- 数据导入导出和备份恢复策略。

## 推荐下一步

建议按以下顺序推进：

1. 做一次 `v0.3.0` 发布前验证，跳过单独 `v0.2.0` release。
2. 连续跑真实 AI/技术研究日报，验证 evidence brief、日报质量和 source-health history。
3. 补强日报质量 checklist 与 daily report contract。
4. 再决定下一批拆分 Skill：优先 `rss-feed-discovery` 或 `rss-alert-monitor`，暂缓 publisher 和插件市场 packaging。

当前最值得优先投入的是 P1。它能直接提高本地研究工作流的可用性，也能为后续 feed discovery、publisher 和插件化提供更稳定的数据契约。
