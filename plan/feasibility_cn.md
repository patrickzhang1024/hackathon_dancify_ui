# 可行性计划 — AI 编舞模拟器（音乐 + 歌词 → three.js）

> 计划类型：原理可行性（feasibility）。权威语言：英文。
> 中英对照：`plan/feasibility.md`（英文权威版）+ `plan/feasibility_cn.md`（本文件）。

## 目标（Objective）

构建一个完全运行在浏览器端的 HTML / three.js 应用：输入一首音乐（及可选歌词），针对六项
编排评审指标进行分析，产出一份评审指标报告（音频分析结果 + 由歌词微调），随后由一个专业
编舞师 Agent 将「报告 + 3 个随机创意种子」转化为 3 套各不相同的动作控制脚本，驱动一个绑定
骨骼的虚拟角色随音乐同步跳舞。

**成功标准**：单曲能产出 ≥3 套与节拍同步、贴合曲式段落的舞蹈成品，可在角色上播放，具备
可度量的卡拍准确度与段落/能量对齐，并覆盖多种身体状态（站立、坐、趴躺、跳跃）。

## 已确认决策（Confirmed Decisions）

- 播放 = 网页内的 three.js（实时，不用游戏引擎）。
- 完全客户端：MIR + LLM + 渲染都在浏览器中运行。无强制后端。
- LLM 由浏览器通过用户提供的 API key（BYO-key）调用。详见安全 Review。
- LLM 供应商 = **openDev**（小型模型代理）。假定为 OpenAI 兼容的
  `/chat/completions`；base URL + 模型 ID 作为运行时配置（需确认确切端点）。
- 种子 → 创意方向 = 确定性 **hash 表**（可复现）。
- 动作库 = **按姿态/身体状态分类的片段 + 转场状态机 + 参数化变体**，
  实现高自由度，含 站立 / 坐 / 趴躺(floor) / 跳空(air)。

## 核心原理（Core Principle）

MIR（音乐信息检索）特征映射到编舞决策：
节拍/tempo → 步点时机；结构（主歌/副歌/桥段）→ 分句与招牌动作；RMS/响度能量 → 动作幅度/
高度；valence-arousal → 动作质感；音色 → 纹理/卡点；曲风 → 动作词汇（取哪一舞种的片段子集）。

由一个充当「编舞师」的 LLM 基于结构化报告推理，编排出一条符号化时间线 = **动作控制脚本**。
动作以片段方式落地：打好标签的 Mixamo/glTF 片段按节拍网格做时间伸缩，并通过 three.js
`AnimationMixer` 在人形骨骼上交叉淡入淡出。生成式动作（EDGE / Bailando）作为后期升级，非 MVP。

## 六项评审指标 — 细分定义（Concrete Taxonomies）

每项指标 = 定义 + 允许取值集合 + 浏览器端如何测量 + 如何驱动舞蹈。

1. **节奏 Rhythm**
   - `tempo_bpm`：数值；`tempo_class`：{very_slow <70, slow 70-95, medium 95-115,
     upbeat 115-135, fast 135-160, very_fast >160}
   - `meter`：{4/4, 3/4, 6/8, 2/4, irregular}；`groove`：{straight, swing, shuffle, syncopated}
   - `rhythmic_density`：{sparse, moderate, busy}
   - 测量：essentia.js `RhythmExtractor2013` / `PercivalBpmEstimator`，aubio.js onset。
   - 驱动：步点时机、每小节换招频率、切分重音。

2. **情绪 Emotion**
   - `valence`：0-1 {negative, neutral, positive}；`arousal`：0-1 {calm, moderate, high}
   - `mood_label`：{happy, joyful, energetic, triumphant, romantic, tender, dreamy,
     melancholic, sad, nostalgic, tense, dark, aggressive, playful}
   - 测量：essentia.js TFJS MusiCNN 情绪/arousal-valence 模型；由歌词 LLM 修正。
   - 驱动：动作质感（利落 vs 流畅）、手势力度、表情标签。

3. **音乐结构 Music Structure**
   - `sections[]`：{label ∈ [intro, verse, pre_chorus, chorus, drop, bridge, breakdown,
     instrumental, outro], start_s, end_s, bars}；`repetition_map`：如 "A B A B C B"
   - 测量：JS 中的 chroma/MFCC 自相似矩阵 + novelty 峰值检测（中等置信度）；
     兜底 = 依据节拍网格的固定小节分句。
   - 驱动：分句、能量重置、副歌/drop 招牌动作。

4. **能量变化 Energy Change**
   - `per_section_energy`：{low, medium, high}；`contour`：曲线；`events`：{build_up, drop,
     sustain, decay}；`transition_type`：{sudden, gradual}
   - 测量：Meyda 分帧 RMS/响度 → 分段聚合 + 差分检测。
   - 驱动：幅度、起跳/高度变化、随 build-up/drop 拉升强度。

5. **音色 Timbre**
   - `brightness`：{dark, warm, neutral, bright}（spectral centroid）；
     `texture`：{smooth, rough, percussive, harmonic}（spectral contrast + HPSS）
   - `dominant_instruments`（多标签）：{vocal, piano, guitar_acoustic, guitar_electric,
     synth, strings, brass, drums_acoustic, drums_electronic, bass, orchestral}
   - 测量：Meyda `spectralCentroid`/`spectralContrast`/`mfcc`；essentia.js 音色描述子。
   - 驱动：流动 vs 顿挫的纹理、局部 isolation vs 全身、打击类音色上的卡点重音。

6. **音乐风格 / 曲风 Music Style / Genre**
   - `genre`：{pop, rock, hiphop, rap, rnb, reggae, dancehall, edm, house, techno, dubstep,
     trap, jazz, funk, disco, soul, blues, latin, reggaeton, salsa, kpop, jpop, classical,
     folk, country, metal, ballad, afrobeat, ambient}
   - `dance_genre`（派生）：{street_hiphop, breaking, popping, locking, house_dance,
     shuffle, jazz_funk, commercial_kpop, contemporary, lyrical, salsa, reggaeton, dancehall,
     waltz, ballet, freestyle}
   - 测量：essentia.js TFJS 曲风分类器（MusiCNN / Discogs）。
   - genre → 舞种映射：reggae/dancehall → dancehall；hiphop/rap/trap → street/popping；
     edm/house → shuffle/house_dance；pop/kpop → commercial/jazz_funk；
     ballad/慢速 rnb → contemporary/lyrical；latin/reggaeton → reggaeton/salsa；
     rock/metal → energetic freestyle；classical → ballet/contemporary。
   - 驱动：编舞师从哪个舞种的片段子集取材。

## 编舞师 Agent 工作流（浏览器，BYO-key）

确定性 JS 与 LLM 推理严格分离。仅有两步使用 LLM。

- **[JS] S0 摄入**：解码音频（`AudioContext.decodeAudioData`）+ 可选歌词（文本/LRC）。
- **[JS] S1 特征提取**：essentia.js（WASM）+ Meyda + aubio.js → 原始特征。
- **[JS] S2 报告构建**：将原始特征映射到六项指标的分类体系 →
  `CriteriaReport` JSON（每项含标签 + 置信度 + 证据）。
- **[LLM #1] S3 歌词分析师**：输入 {歌词, CriteriaReport} → 输出 {分段情绪/能量微调,
  主题, 叙事弧, 关键词}。合并 → `RefinedReport`。纯器乐曲目跳过此步。
- **[JS] S4 种子生成**：`crypto` RNG → 3 个随机字符串。确定性
  `hash(seed)` → `CreativeBrief` {dance_genre, energy_bias, complexity, spatial_style,
  body_state_bias, signature_moves[]}（可复现；保证 3 者之间的差异）。
- **[LLM #2 ×3] S5 编舞师**：每个种子输入 {RefinedReport, CreativeBrief,
  MoveLibraryManifest} → `MotionControlScript` JSON。3 个种子 → 3 套脚本。
- **[JS] S6 校验**：JSON-schema 校验、clipId 存在、节拍对齐、无空隙/重叠，
  以及身体状态机合法（每次状态切换都有转场片段）；失败则修复或重问。
  脚本是**数据而非代码** —— 绝不 `eval`。
- **[JS] S7 音序 + 渲染**：three.js `GLTFLoader` 加载片段，`AnimationMixer` 交叉淡化，
  `action.timeScale = clip_native_bpm / target_bpm`，起点对齐音频 `currentTime` 节拍网格。

## JSON Schema（概要）

- `CriteriaReport`：{rhythm, emotion, structure, energy, timbre, style} —— 每项对象遵循
  上文分类体系。
- `CreativeBrief`：{seed, dance_genre, energy_bias, complexity, spatial_style,
  body_state_bias, signature_moves[]}
- `MoveLibraryManifest`：[{clipId, name, type:{dance|transition|idle},
  bodyState:{stand|sit|floor|air}, fromState, toState（转场用）, danceGenres[],
  energy, mood[], beats, loopable, mirrorable}]
- `MotionControlScript`：{bpm, beatGrid, timeline:[{sectionLabel, startBeat, endBeat,
  moves:[{clipId, startBeat, durationBeats, intensity, facingDeg, mirror, ampScale, travel,
  transitionIn}]}]}

## 动作库与身体状态机（高自由度设计）

目标：在保持可控与可卡拍的前提下，实现高表观自由度与多种运动/姿态类型
（站立 / 坐 / 趴躺 / 跳空）。

- 片段按 `bodyState` 打标：STAND、SIT、FLOOR（趴躺/跪）、AIR（跳跃/腾空）。
- 两类片段：**dance**（状态内舞蹈片段）+ **transition**（切换状态的转场片段）。
- 状态机（每次转场都需要对应的转场片段）：
  STAND↔SIT、STAND↔FLOOR、SIT↔FLOOR、STAND→AIR→STAND（腾空仅经由跳跃，随后落回站立）。
- 编舞师在同一状态内排布 dance 片段，且每当 `bodyState` 改变时**必须插入转场片段**。
  S6 会拒绝任何缺少转场片段的状态跳变。
- 不新增片段的自由度放大器（脚本中的参数化变体）：`mirror`（左右镜像）、
  `facingDeg`（朝向旋转）、`ampScale`（幅度）、`travel`（空间位移）、
  `timeScale`（±15% BPM 内做卡拍）。
- 素材：Mixamo 包已覆盖 idle / sit / get-up / floor / jump / dance；不足处补充。
  保持同一套 Mixamo 人形骨骼，避免重定向 / 滑步。
- 编舞师提示词会收到按 `bodyState` 分组的清单加转场表，从而编排出合法、多变、
  跨状态的舞段。

## 架构 Review（Architecture Review）

- **原理**：成立。MIR → 结构化报告 → LLM 编排 → 节拍锁定的片段播放，是成熟的解耦。
  最弱的假设是主观美感；用精选片段库 + 硬性节拍锁 + schema 校验来缓解。
- **逻辑**：干净的 DAG —— 音频 → 特征 → 报告 →（歌词）→ RefinedReport →（×3 种子）
  → 3 套脚本 → 播放。除两个推理/创意点（歌词理解、编舞创作）外全程确定性。
  可测试、可控、种子可复现。
- **技术栈**（全浏览器/JS）：Web Audio API（解码）；essentia.js WASM
  （rhythm/tonal/timbre + TFJS MusiCNN 曲风/情绪/valence-arousal），Meyda
  （RMS/centroid/contrast/MFCC），aubio.js（onset/tempo 备用）；结构分段用 JS 自相似 +
  novelty（中等置信度，含小节分句兜底）；浏览器 `fetch` 到 openDev（OpenAI 兼容）配合
  BYO-key 与 JSON-schema 输出；three.js `GLTFLoader`/`FBXLoader`、`AnimationMixer`、
  `crossFadeTo`、`SkeletonUtils`、Mixamo 角色 + 片段；静态 HTML + CDN 库，生产可选
  serverless 代理保护密钥。
- **结论**：连贯、精简，契合 HTML 输出目标。

## 安全 Review（OWASP）

- 浏览器中的 API key = 暴露的密钥（A02 / A07）。缓解：运行时输入的 BYO-key，仅存于
  内存/`localStorage`，绝不提交仓库；向用户告警；生产环境建议加可选 serverless 代理；
  对密钥限定作用域并限流。
- 经歌词的提示注入（不可信文本 → LLM）：将 Agent 约束为严格 JSON schema 并校验所有输出；
  歌词内容不能触发超出 schema 字段的任何动作。
- LLM 输出按数据处理（一份动作脚本），在进入 three.js 前经 schema 校验。绝不 `eval`。
- 远程 glTF/音频素材：强制 CORS，使用前校验素材。

## 证据（Evidence）

| 论点 | 支撑 | 置信度 |
|------|------|--------|
| 浏览器端 节拍/BPM/onset | essentia.js, aubio.js, Meyda | 高 |
| 浏览器端 RMS/能量/音色 | Meyda, essentia.js | 高 |
| 浏览器端 曲风/情绪/valence-arousal | essentia.js TFJS MusiCNN 模型 | 中高 |
| 浏览器端 结构分段 | JS 自相似 + novelty（自研） | 中（最弱） |
| 歌词分析 + 编舞创作 | 经 BYO-key 的 LLM，JSON schema | 中高 |
| 节拍同步片段播放 + 重定向 | three.js AnimationMixer, Mixamo | 高 |
| 可复现的 种子 → 创意方向 | hash 解码表 | 高 |

## 风险与失败模式（Risks & Failure Modes）

- 纯 JS 结构分段是最弱环节（兜底：固定小节分句）。
- essentia.js TFJS 模型带来 MB 级下载 + 计算；低端设备较慢。
- LLM 延迟/成本：1 次歌词调用 + 3 次编舞调用；提示词较大（清单）。
- 重定向：使用同一套 Mixamo 骨骼，避免骨骼不匹配 / 滑步。
- 片段时间伸缩超过约 ±15% BPM 会显得不自然 → 让片段贴近目标 tempo。
- 3 个种子须既多样又都好看（多样性 vs 质量的权衡）。
- 若不做代理，API key 会暴露。

## 结论（Verdict）

**可行，但有前提（Feasible-with-caveats）**，完全浏览器端 + three.js。每个环节都能落到
真实的浏览器库上，无根本性障碍。最难的部分是 JS 结构分段与编舞美感 —— 属于工程/策划问题，
而非物理原理。MVP 走片段拼接；生成式动作留作升级。决定性理由：可控性 + 实时播放 + 无需
GPU，使片段方案可交付；生成式路线在后期抬高真实感上限。

## 下一步（最小去风险实验）

单曲 20–30 秒的静态 HTML 竖切：Web Audio 解码 → essentia.js 节拍 + 能量 →
极简 `CriteriaReport` → 基于 ~10 片段 Mixamo 清单的 1 次 LLM 编舞调用 →
schema 校验 → three.js `AnimationMixer` 节拍同步地在单个 glTF 角色上播放。
去风险目标：浏览器端 MIR + LLM 脚本生成 + three.js 同步播放。

## 待办项（实现时确认）

- openDev 的确切 base URL + 模型 ID（假定为 OpenAI 兼容的 `chat/completions`）。
- 批量导入哪些 Mixamo 包以覆盖全部身体状态。
