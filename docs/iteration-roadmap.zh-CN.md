# DigestPilot 功能汇总与迭代路线图

日期：2026-05-27

代码基线：`main`

## 当前定位

`DigestPilot` 已经从单一 RSS digest Skill 演进为一组面向通用 Agent 生态的信息流聚合、日报生成与研究 evidence 能力：

- `rss-ai-digest`：负责 RSS/Atom/OPML 导入、内容筛选、评分、去重、日报和重点资讯快速输出。
- `public-trend-radar`：负责公开渠道趋势发现，生成 `ai-tech` 和 `product-business` profiles 下的 trend cards。
- `rss-source-curator`：负责订阅源健康评估、源治理建议和 registry 维护。
- `subscription-research-agent`：负责围绕订阅来源组织本地优先深度研究工作流，生成 evidence brief，并指导 Agent 写作研究日报或研究 memo。
- `packages/research-cli`：提供本地 research workspace、SQLite 持久化、RSS evidence ingest、实体抽取和 evidence brief 生成。

当前项目不是完整 RSS 阅读器、托管研究平台或通知中心。它更像一套可被不同 Agent/runtime 包装调用的本地优先信息流研究底座，后续会扩展为 Claude Code/Codex 插件分发形态。

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
- Markdown digest 保持内容优先，不输出 run stats、failed feeds 或源健康维护细节；这些信息保留在 JSON 和源维护工作流中。
- `evaluate-sources` 输出源状态、分数、建议、失败次数、成功次数和最后错误。
- 缺少 health 的源会被视为 `unknown/watch`，不会被误判为低质量源。
- `curate-sources` 生成 `keep`、`watch`、`lower-priority`、`disable`、`remove` 等可审阅动作。
- `apply-source-patch` 支持 dry-run 或将已审阅 patch 写入新的 registry 文件。
- `subscription-research source-health` 可基于多次 ingest 的历史观察输出 `keep`、`watch`、`lower_priority`、`disable_candidate` 等建议。

当前治理策略是“建议优先、人工审阅后应用”，避免无审阅自动删除或禁用源。

### 4. 本地优先研究工作流

`subscription-research-agent` 和 `packages/research-cli` 已实现：

- `subscription-research init`：初始化本地 research workspace。
- `subscription-research ingest rss`：使用 Node RSS runtime，将订阅 evidence 归档到本地 workspace。
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

- Node research CLI 测试已覆盖 workspace 初始化、RSS ingest、direct RSS commands、OPML/RSS/Atom fixtures、筛选、评分、去重、health、源评估、source patch、public trend profiles、public signal adapters、public trend fetch、trend cards、entity extraction、evidence brief 和 source health。
- 已完成真实 RSS 全量回归验证，92-feed digest 优化后约 14-16 秒完成。
- 已通过 Skill validator 验证 3 个 Skill 包。
- 已发布 `v0.1.0` 稳定检查点。
- 已发布 `v0.3.0`，并将此前 `v0.2.0` 的 RSS Skills suite 范围合并进该版本。

## 当前能力边界

### 当前实现快照

截至 2026-05-27，仓库已形成 4 个正式 Skills 和 1 个共享 Node/TypeScript runtime：

- `rss-ai-digest`：普通 RSS/Atom 日报、重点资讯、快速查询、OPML 导入、筛选、评分、去重和 `check-new` 监控入口。
- `public-trend-radar`：公开渠道趋势发现，输出 `ai-tech` 和 `product-business` profiles 下的 trend cards。
- `rss-source-curator`：源质量评估、健康历史、失败源治理、registry patch 生成和人工审阅后应用。
- `subscription-research-agent`：本地优先深度研究工作流，归档订阅 evidence，生成 evidence brief，由 Agent 写最终研究日报或 memo。
- `packages/research-cli`：共享 deterministic runtime，当前承载 RSS runtime、SQLite workspace、正文 enrichment、feed discovery、source health 和 evidence brief。

已落地的 P2 基础能力：

- `subscription-research content fetch`：可选正文抓取、Readability extraction、`article_content` SQLite 表和 `data/content-cache/`。
- `subscription-research rss discover --url ...`：从网页 alternate links 发现 RSS/Atom feed。
- `subscription-research rss discover --input candidate-pages.md`：从 URL/Markdown 列表批量发现源并跨页面去重。
- `subscription-research rss discover --validate`：校验候选 feed 可解析性，并生成可审阅 `registry_patches`。
- `subscription-research rss apply-source-patch`：可将审阅后的 discovery patch 新增到 registry，仍默认 dry-run。
- `subscription-research trend fetch-public`：从 HN 和 GitHub releases 采集真实公开趋势输入。
- `subscription-research trend scan`：从公开 URL 列表、HN item JSON 和 GitHub release JSON 生成 profile-aware trend cards。

已经具备：

- 通用 Agent 可调用的 RSS/AI 技术内容发现 MVP。
- 面向高质量源筛选的源治理基础。
- 本地优先订阅研究 workspace foundation。
- Agent 写作研究日报所需的 evidence brief 和日报契约。
- 文件化、可迁移、平台中立的 CLI contract。
- 正文 enrichment 和 feed discovery 的第一阶段能力。

尚未具备：

- 内置 scheduler、daemon 或后台服务。
- 通知渠道集成，例如 Email、飞书、Slack、Webhook、Obsidian。
- 无审阅的全自动源发现、评分和合入。
- 自动无审阅源清理。
- 将全文分析作为普通日报的强依赖。
- deterministic CLI 自动生成最终研究日报。
- 语义去重、相似文章合并、LLM rerank。
- Claude Code/Codex 插件 packaging 和多 runtime 安装器尚未实现，但已进入分发层规划。
- 多用户、多 workspace profile、长期趋势 dashboard 或 Web UI。

## 当前观察到的问题

### 普通日报仍偏慢

2026-05-22 的“产品经理方向昨日报”真实使用暴露出一个体验问题：如果每次用户要日报时都临时全量抓取基础 OPML，会因为 92 个 feed 并发请求、失败源等待超时、沙箱/网络重试以及多轮筛选而变慢。

这不是日报内容质量问题，也不应该通过源治理报告或深度研究流程解决。它属于 `rss-ai-digest` 的快速查询体验问题。

需要改进为：

- 先由定时任务或手动 ingest 将 RSS 条目归档到本地 SQLite。
- 普通日报、重点资讯和方向查询优先查询本地 archive，而不是实时全量抓取。
- 为产品经理、AI、工程、安全等方向维护较小的 source profile 或 registry subset。
- 在一次请求内复用抓取结果，避免因为调整关键词或分类重复抓取同一批 feed。
- 将实时抓取作为 fallback，而不是默认查询路径。

## 后续迭代任务

### P2：公开趋势雷达（当前优先）

目标：把项目从 RSS-only 信息源扩展为公开渠道趋势发现模块，作为信息流 Agent 的上游感知层。它负责发现趋势、聚合证据和输出 trend cards；日报只是它的下游消费者之一。

扩展方向：

- 使用独立模块或 Skill：`public-trend-radar`。
- 采用一个共享趋势雷达框架，但用 profile 分开判断逻辑：`ai-tech` 和 `product-business`。
- 渠道接入以公开渠道为边界，不纳入私有群聊、邮箱、浏览器历史或需要复杂账号权限的来源。
- 输出趋势卡片，而不是直接生成日报正文。

优先范围：

- `ai-tech` profile：优先 GitHub、HN、arXiv/Hugging Face papers、官方工程博客和 package registry。
- `product-business` profile：优先官方 changelog、launch URL list、HN、公司博客、产品目录和公开定价/docs 页面。
- 定义 trend card contract：趋势标题、profile、类型、分数、置信度、为什么升温、primary evidence、community signals、关联实体和 downstream 建议。
- 建立趋势评分：freshness、velocity、cross-source、authority、discussion、relevance、novelty 和 evidence depth。
- 保持趋势 discovery 与日报、源治理、发布器分离。
- 已新增 `subscription-research trend fetch-public` 和 `trend scan` 的 MVP，支持 `ai-tech` 和 `product-business` profiles，并可从 HN、GitHub releases、公开 URL 列表生成 trend cards。

暂缓范围：

- Twitter/X、LinkedIn、私有 Slack/Discord/飞书群、邮箱和浏览器历史。
- 发布器和通知 adapter。
- Web UI、后台 daemon 和复杂 scheduler。
- 插件市场 packaging。

### P0：版本与发布卫生（已完成）

目标：让当前已合并功能有清晰版本边界，降低后续拆 Skill 或插件化时的认知成本。

- 已将此前 `v0.2.0` source curator scope 合并进 `v0.3.0` 一次发布。
- 已更新 `VERSION`、release notes 和 changelog 的实际状态。
- 已完成 Node tests、typecheck、Skill validation、`npm pack --dry-run` 和 `git diff --check`。
- 已发布 `v0.3.0` tag 和 GitHub Release。
- 已将本地安装目录与仓库 Skill 目录同步。

建议：短期重点已经转向 research Agent，下一阶段进入真实本地日报验证。

### P1：真实本地研究工作流加固（已完成）

目标：把“能跑通”推进到“可稳定用于日常研究日报”。

- 已完成 3 次真实 AI/技术日报链路回归，覆盖 `72h` AI、`24h` AI 和 `72h` 工程/系统主题。
- 已将 evidence brief、source-health 摘要、失败原因和优化结论整理为小型验证记录。
- 已在同一个临时 research workspace 连续运行 2 次真实 ingest，积累 source health observations 并验证 `source-health --min-observations 2`。
- 已建立日报质量 checklist：来源覆盖、原始来源归因、重复内容、噪声过滤、中文摘要可读性、后续问题质量。
- 已调整 daily report contract，让 Agent 更稳定地区分事实、判断、风险和待跟踪问题，并减少源治理信息在日报中的占比。
- 已增加针对真实失败模式的回归样例，单元测试继续避免依赖网络。

### P1：源健康历史到 registry patch 的闭环（已完成）

目标：让 source health history 能自然进入可审阅维护流程。

- 已扩展 `source-health` 命令，可从 `source_health_observations` 生成 reviewable registry patch。
- patch 继续保持人工审阅，不自动写回原 registry。
- 已支持按观察次数、失败率和错误类型生成 `keep`、`watch`、`disable` 建议。
- 已输出治理解释，说明为什么建议 keep、watch 或 disable。
- 已补充 Node tests 和 Skill reference 文档。
- 已补充连续失败次数、最近成功时间、最近失败时间、维护优先级和 `lower-priority` 建议。
- P1 范围已闭环；后续结合 registry 源先验分数和标签生成更细降权 patch 进入常规 P2/P3 源治理增强。

### P1：研究日报质量增强（已完成）

目标：提升日报从“条目罗列”到“研究判断”的稳定性。

- 已在 evidence brief 中提供更清晰的 priority buckets。
- 已增加重复主题合并提示，避免多个源转载同一事件或同组 release note 时日报膨胀。
- 已强化 `commentary_source` 与 `original_source` 的展示规则，并增加 Agent 可直接消费的 attribution label。
- 已为中文日报补充推荐文风：短标题、关键信息、影响判断、行动建议。
- 已增加“低置信度/仅二手来源”标记，降低误读转载内容的风险。
- 已将日报质量 checklist 同步到 evidence brief 和 `subscription-research-agent` Skill reference。

### P1：普通日报查询性能优化（待做）

目标：让“日报/重点资讯/快速查询”从实时全量抓取转为 archive-first，提升交互速度并降低重复网络请求。

- 新增 archive-first 普通日报路径：优先从 SQLite 或本地归档读取昨天/今天的条目。
- 为 `rss-ai-digest` 增加明确的“本地归档查询”工作流说明。
- 增加 CLI 查询能力，例如按日期、topic、关键词、source profile 从 archive 中筛选条目。
- 在一次日报请求中复用抓取结果，避免产品方向、关键词方向、全量方向多次重复抓取。
- 支持 source profile：例如 `product-manager`、`ai`、`engineering`、`security`。
- 为产品经理方向补充和维护更合适的订阅源池，而不是只依赖基础技术博客 OPML。
- 将实时 RSS 抓取保留为 fallback，并在 fallback 时使用更短 timeout、更小 source set。
- 补充一次真实回归：对比 realtime full-fetch 与 archive-first 查询的耗时和输出质量。

验收标准：

- 已有本地归档时，普通日报输出不需要重新抓取 92 个 feed。
- 同一日期和方向的二次查询应接近秒级。
- 日报正文只呈现资讯内容，不输出源治理、失败源列表或维护建议。

### P2：正文获取与内容质量过滤（进行中）

目标：从 feed metadata 级别推进到正文级 evidence。

- 已引入可选正文抓取，不作为基础 digest 的硬依赖。
- 已增加基于 `@mozilla/readability` 和 `jsdom` 的 HTML readability extraction。
- 已为正文抓取建立 SQLite `article_content` 表和 `data/content-cache/` JSON 缓存。
- 已新增 `subscription-research content fetch`，可对已归档文章按 `since`、`min-score`、`limit` 和 `article-id` 做正文 enrichment。
- 已让 evidence brief 在存在 enrichment 时优先使用 cleaned full-text excerpt，缺失时继续使用 RSS summary。
- 支持正文级关键词、实体和主题提取。
- 加入长文截断、引用边界和来源保真策略。
- 为 LLM rerank 预留接口，但不让核心流程依赖特定 LLM provider。

### P2：RSS feed discovery（进行中）

目标：降低优质源维护成本。

- 新增 `rss-feed-discovery` Skill 或 CLI 子命令。
- 已新增 `subscription-research rss discover --url ...`，可从网页 HTML 的 RSS/Atom alternate link 自动发现 feed 候选。
- 已支持 `--input candidate-pages.md` 从 URL 列表或 Markdown 列表批量发现源，并对跨页面重复 feed 去重。
- 已支持 `--validate`，可抓取候选 feed、验证 RSS/Atom 是否可解析，并输出可审阅 registry patch 候选。
- 已打通 discovery patch 与 `apply-source-patch`：审阅后的 `registry_patches` 可以新增到 registry，也可以继续走 dry-run。
- 从 GitHub Awesome list、博客列表和目录页抽取候选源的第一阶段已覆盖 URL/Markdown 列表；后续可增加更强的目录结构解析。
- 对候选源做健康检查、主题推断和初始评分。
- 输出可审阅 OPML。

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

1. 继续 P2 `public-trend-radar`：在已有 `fetch-public` 和 `trend scan` 基础上补 arXiv、Hugging Face papers 或更多 GitHub repo presets。
2. 继续强化两个 profile：`ai-tech` 和 `product-business` 共享趋势聚类、评分和输出结构，但保持渠道权重和判断标准分离。
3. 首批公开渠道继续控制在 GitHub/HN/web-url-list/arXiv 或 Hugging Face papers 这类低风险来源。
4. 回到 P1 普通日报查询性能优化，把常用日报改成 archive-first，并允许日报消费 trend cards 作为一个信息源。
5. 暂缓 publisher、通知 adapter 和插件市场 packaging，直到多源 ingestion 数据契约更稳定。

研究日报与源治理 P1 已完成。P2 正文 enrichment 与 feed discovery 已完成第一阶段；当前优先级切换为公开趋势雷达，普通日报性能 P1 随后继续收尾。
