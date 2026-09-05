# 技术栈计划 — AI 编舞模拟器（对应 `plan/feasibility.md`）

> 计划类型：代码技术栈（tech-stack）。权威语言：英文。
> 中英对照：`plan/tech-stack.md`（英文权威版）+ `plan/tech-stack_cn.md`（本文件）。
> 全新项目：尚无 `package.json` / HTML / 构建配置。按 3 个主题组织。

## 目标（Goal）

定义实现 `plan/feasibility.md` 的具体浏览器端技术栈：音频分析 → 结果报告；编舞师 Agent
（含 API key 处理、安全、记忆模块）；以及由控制脚本驱动的 three.js 人体模型播放。契合 HTML
输出目标，可静态部署，无强制后端。**项目将在本地调优后上线**，因此本计划补充了上线加固与
许可证审查。

## 已确认决策（最终）

- **构建工具** = Vite 5。
- **角色 / 动作片段** = Mixamo（FBX → glTF）。
- **记忆** = IndexedDB + localStorage。
- **语言** = MVP 用原生 JS（后续可选 TypeScript）。
- **上线** 已确认 → 下方补充生产加固 + 许可证替换方案。

## 构建工具（Build Tooling）

- **Vite 5**（ESM 开发服务器 + 静态构建）。能干净地处理 WASM 资源（essentia / TFJS）与 Web
  Worker；构建产物是可任意部署的静态 HTML + JS。极小的 MVP 切片可用单文件 CDN 方式，但一旦
  引入 WASM 就会变得笨重，故推荐 Vite。
- **原生 JS**（可选 TS）。MVP 不需要 React —— 用普通 DOM 加一个极小的状态存储即可。

## 技术栈决策（概要）

| 层 | 选型 | 理由 | 许可证 | 备选 |
|----|------|------|--------|------|
| 打包器 | Vite 5 | WASM/worker 处理、静态构建 | MIT | Parcel、esbuild、纯 CDN |
| 音频解码 | Web Audio API | 原生、无依赖 | — | ffmpeg.wasm（过重） |
| MIR 特征 | essentia.js（WASM）+ Meyda | 节奏/调性/音色 + 快速频谱 | AGPL-3.0 / MIT | aubio.js（备用）、自研 DSP |
| MIR 模型 | essentia.js-model + TFJS | 预训练 曲风/情绪/valence-arousal | AGPL-3.0 / Apache-2.0 | CLAP/MERT（重） |
| 结构分段 | 自研 SSM + novelty（JS） | 无好用库；可控 | 自研代码 | 固定小节分句兜底 |
| LLM 客户端 | `fetch` → openDev（OpenAI 兼容） | BYO-key、JSON schema | 自研代码 | 厂商 SDK（额外体积） |
| Schema 校验 | Ajv 8 | 对 LLM 输出做严格 JSON Schema | MIT | zod、手写 |
| 记忆存储 | IndexedDB（idb）+ localStorage | 项目/偏好持久化 | ISC | 无 / 内存 |
| 3D 渲染 | three.js 0.160+ | 成熟、AnimationMixer、Mixamo | MIT | Babylon.js |
| 角色/片段 | Mixamo（FBX → glTF） | 大量人形 + 动作库 | Adobe 免费条款 | VRM、自采动捕 |

## 主题 1 — 音频分析 → 结果报告

- **解码**：`AudioContext.decodeAudioData` → Float32 PCM（分析用单声道降混）。
- **移出主线程**：重型 MIR 放到 **Web Worker**（essentia WASM + TFJS）以保持 UI 流畅；
  TFJS 后端用 `wasm` 或 `webgl`。
- **essentia.js**：`RhythmExtractor2013` / `PercivalBpmEstimator`（BPM / 节拍 / 强拍）、
  onset 检测、调式/音阶、频谱描述子、HPSS 谐波/打击分离。
- **Meyda**：分帧 RMS/能量、`spectralCentroid`、`spectralContrast`、`spectralFlatness`、
  MFCC、chroma、ZCR（能量 + 音色 + chroma 供结构分析）。
- **aubio.js**：onset/tempo 备用 + BPM 交叉校验。
- **essentia.js-model（TFJS）**：MusiCNN / Discogs 曲风、情绪（happy/sad/aggressive/relaxed）、
  danceability、arousal/valence。
- **结构**：chroma/MFCC → 自相似矩阵 → 棋盘核 novelty → 峰值检测边界 → 聚类分段得到
  `repetition_map`。**兜底** = 依据节拍网格的固定 8 小节分句（中等置信度，最弱环节）。
- **reportBuilder.js**（确定性）：原始特征 → 遵循六项指标分类体系的 `CriteriaReport` JSON
  （标签 + 置信度 + 证据）。
- **依赖**：essentia.js `^0.1.3`、@tensorflow/tfjs `^4.17`、meyda `^5.6`、aubiojs `^0.1`。

## 主题 2 — API Key + 安全 + 记忆 + 编舞师 Agent

**LLM 客户端（`agent/openaiClient.js`）**

- `fetch` POST 到 openDev `/v1/chat/completions`（假定 OpenAI 兼容；确认 base URL）。
- 结构化输出：优先 `response_format: { type: 'json_schema' }`；兜底 `json_object` + Ajv 校验。
  无效 JSON 时走重试-修复循环（最多 N 次）。

**API key 处理 / 安全（本主题重点）**

- **BYO-key** 在 UI 运行时输入；存于 `localStorage` —— 绝不硬编码或提交（已有 `.gitignore`）。
  提供更严格的仅 `sessionStorage` 模式。
- **向用户告警**：浏览器持有的 key 是暴露的（OWASP A02 / A07）。生产缓解 = serverless 代理
  （Cloudflare Worker / Vercel Edge）持有 key + 限流 + 允许来源白名单。
- **CSP**：`connect-src` 限定到 openDev 端点。绝不记录 key；错误信息中脱敏。
- 在 openDev 侧设置消费 / 作用域上限。
- **提示注入防御**（歌词不可信）：严格 JSON schema、校验所有输出、歌词不能触发 schema 字段
  以外的任何动作；输出按**数据**处理（不 `eval`）。

**记忆模块（`agent/memory.js`）**

- **会话 / 短期**：当前报告、种子、3 套脚本、用户编辑 → 应用状态 + `localStorage`（项目自动
  保存）。
- **长期**：`AgentMemory { preferences: { likedGenres[], dislikedMoves[], intensityBias },
  projects: [{ songId, report, scripts, ratings }], styleProfiles[] }` 存于 **IndexedDB**（idb）。
- **检索（MVP）**：标签/键查找（按 genre/mood）→ 把相关偏好 + 喜欢过的历史舞段注入编舞师
  提示词。MVP 不用向量库（后续需要再加）。

**编舞师 Agent 定义 + 工作流**

- 两个 LLM 角色：**歌词分析师**（调用 #1）+ **编舞师**（调用 #2 ×3）。均走 openDev。
- **系统提示词** = 专业编舞师人设 + 六项指标定义 + genre → 舞种映射 + 动作库清单（按
  `bodyState` 分组）+ 身体状态机规则 + 输出 schema。
- **编排** = 小型 JS 状态机（不用 agent 框架）：S3 歌词 → S4 种子（crypto RNG +
  `hash → CreativeBrief` 表）→ S5 编舞师 ×3 → S6 Ajv + 状态机 校验/修复。
- **输出** = `MotionControlScript` JSON（数据），渲染前经 Ajv 校验。
- **依赖**：ajv `^8.12`、idb `^8.0`（RNG 用 `crypto.getRandomValues`）。

## 主题 3 — three.js 人体模型 + 脚本控制

- **three.js `^0.160`**（ESM）+ examples：`GLTFLoader` / `FBXLoader`、`OrbitControls`、
  `SkeletonUtils`。
- **角色**：一套一致的 Mixamo 人形骨骼；动作片段共用该骨骼，故**无需重定向**（避免滑步）。
  若不匹配，用 `retargetClip` 或坚持单骨骼策略。
- **播放核心（`render/sequencer.js`）**：`AnimationMixer` + `clipAction`；转场用
  `crossFadeTo` / `crossFadeFrom`；`setEffectiveTimeScale`、`setEffectiveWeight`、
  `action.time`、`play`。
- **脚本 → 控制映射**：
  - 解析 `MotionControlScript.timeline`；节拍 → 秒，经 `bpm` 与 `beatGrid`。
  - **调度器**在渲染循环中以**音频 `currentTime`**（`AudioBufferSourceNode` / `<audio>`）为准
    以避免漂移：`expectedBeat = audioTime * bpm / 60`；在各 move 的 `startBeat` 触发下一个
    动作；从上一个动作交叉淡化（`bodyState` 改变时插入转场片段）。
  - **卡拍**：`timeScale = clipNativeBpm / targetBpm`，钳制 ±15%。
  - **参数化变体**：`mirror`（预烘焙镜像片段或根翻转）、`facingDeg`（根 `rotation.y`）、
    `travel`（根位置偏移）。`ampScale` = 叠加 / 权重混合的近似，或 MVP 阶段暂缓。
  - 漂移超阈值则**重新同步**（把当前 `action.time` 重置到预期值）。
- **场景**：`WebGLRenderer`、地面、灯光（主光 + 环境光）、相机 + `OrbitControls`、可选阴影。
  时间线 UI 显示段落 + 当前节拍。

## 项目结构（Vite）

```
index.html; package.json; vite.config.js
src/
  main.js
  audio/{decode.js, features.js, structure.js, reportBuilder.js, worker.js}
  agent/{openaiClient.js, lyricsAgent.js, choreographer.js, seeds.js, schemas.js, validate.js, memory.js}
  moves/{manifest.json, clips/*.glb}
  render/{scene.js, character.js, sequencer.js, params.js}
  state/store.js
  config/{constants.js  // 分类体系、genre->舞种映射、状态机}
public/{models/*.glb, wasm 资源}
```

## 依赖（大致版本）

three `^0.160` · essentia.js `^0.1.3` · @tensorflow/tfjs `^4.17` · meyda `^5.6` ·
aubiojs `^0.1` · ajv `^8.12` · idb `^8.0` · vite `^5`（开发）。RNG 用 Web Crypto。

## 生产 / 上线加固（Go-Live）

- **托管**：Vite 静态构建 → Cloudflare Pages / Netlify / Vercel（HTTPS、全球 CDN）。
- **跨源隔离**：若 essentia WASM 使用线程 / `SharedArrayBuffer`，设置 COOP `same-origin` +
  COEP `require-corp` 头；否则用单线程构建。
- **资源交付**：brotli/gzip、内容哈希文件名 + 长缓存 `max-age`、代码分割、懒加载 TFJS 模型 +
  glTF、对 CDN + openDev 做 `preconnect`；加载 UI + 低端设备兜底。
- **安全头**：严格 CSP（`connect-src` = 仅 openDev + 资源 CDN）、HSTS、`X-Content-Type-Options`。
- **规模化 API key**：(a) **BYO-key** = 每位访客用**自己**的 openDev key（只对自己暴露，可
  接受），或 (b) **托管代理** = serverless 函数持有**站主**的 key + 鉴权 + 限流 + 来源白名单
  （当不希望用户自带 key 时需要）。绝不在客户端 JS 里内置共享 key。
- **鲁棒性**：优雅降级（无歌词 / 解码失败 / LLM 失败 / 模型加载失败）、LLM JSON 重试+修复、
  错误脱敏（日志不含 key）、可选的隐私友好遥测。
- **CI/CD**：推送即构建 → 部署到静态托管。

## 许可证审查（上线关键）

- **essentia.js = AGPL-3.0**、**aubiojs = GPL-3.0** → 强 copyleft；**网络提供**的专有产品将被
  要求开源。Meyda（MIT）、three.js（MIT）、@tensorflow/tfjs（Apache-2.0）、Ajv（MIT）、
  idb（ISC）、Vite（MIT）安全。Mixamo 按 Adobe 条款免费；托管产品中重分发片段需核实条款。
- **上线决策**：二选一 —— (a) 以 AGPL 兼容许可证发布本应用，或 (b) 把 copyleft 库换成 MIT 栈：
  - 节拍 / tempo → `web-audio-beat-detector`（MIT）/ `realtime-bpm-analyzer`（MIT）；
  - 能量 / 音色 / MFCC / chroma → Meyda（MIT）；
  - 曲风 / 情绪 / valence-arousal → 自托管宽松许可模型（CLAP / 自研 TFJS），或让 LLM 从已提取
    特征推断 曲风/情绪（MIT 安全）。
  - 若产品为专有，则 essentia / aubio 仅用于**本地**原型。

## 风险与待定问题

- essentia WASM + TFJS 模型 = MB 级下载 + 计算；用 worker + 懒加载；低端设备较慢。
- JS 结构分段是最弱环节；发布固定小节分句兜底。
- openDev 结构化输出支持（`json_schema` vs `json_object`）未知 → Ajv 兜底。
- 需要 Mixamo 骨骼一致性；`AnimationMixer` 中 `ampScale` 较难（暂缓）。
- 音频 / 片段 CORS；大 glTF 加载耗时。
- 不加代理则浏览器 API key 暴露。

## 下一步

1. 搭建 Vite 项目 + 依赖 + `index.html` 骨架。
2. 主题 1 worker：解码 → essentia 节拍 + 能量 → 最小 `CriteriaReport`（打印 JSON）。
3. 主题 3：加载 Mixamo 骨骼，在 three.js 中随音频卡拍播放一个片段。
4. 主题 2：`openaiClient` + Ajv schema + 基于 ~10 片段清单的 1 次编舞调用。
5. 打通端到端竖切（对应 feasibility 的下一步），随后扩展指标 + 记忆。

## 最终 Review 结论

技术栈连贯、纯浏览器端、可静态部署，且与 `plan/feasibility.md` 匹配。发现并解决了两个上线
阻塞项：(1) API key 暴露 → BYO-key 或托管 serverless 代理；(2) essentia/aubio 的 AGPL/GPL →
MIT 替换路径或以 AGPL 发布。处理好这两点后，该技术栈已达 MVP 生产就绪。
