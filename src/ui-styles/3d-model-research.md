# Dancify 免费 3D 人形 / 骨骼模型调研

更新时间：2026-09-05

## 先定义“骨骼模型”

Dancify 需要的不是解剖学意义上的骨骼模型，而是可以被动作驱动的 humanoid character：模型有骨架（armature / rig），最好已经有蒙皮（skinned mesh），并能接收编舞动作或 Mixamo 动画。

网页 MVP 的优先格式是 **glTF / GLB**：文件可整体打包、加载速度和材质表现适合 three.js。FBX 也可以用于验证，但通常需要在 Blender 中转换成 GLB，再交给 `GLTFLoader` 和 `AnimationMixer` 播放。

## 平台对比

| 平台 | 适合 Dancify 的资源 | 格式 / 骨骼情况 | 授权与成本 | 风险与建议 |
| --- | --- | --- | --- | --- |
| [Mixamo](https://www.mixamo.com/) | 真人比例角色、动作库、快速验证“音乐 → 动作” | 角色与动作以 FBX 为主，也可下载无蒙皮动作；通常带骨骼和蒙皮 | 免费使用，需 Adobe 账号；具体权利以 Mixamo/Adobe 当前条款为准 | 最适合做动作原型。原始角色/动作文件不要直接打包成模型素材库或单独再分发；上线前留存条款截图并确认产品用途。 |
| [Quaternius](https://quaternius.com/) | 低多边形、风格统一的人形角色；[Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) 明确写有 Humanoid rig | 该角色包提供 FBX、glTF、OBJ、Blend；页面说明支持 retargeting | 角色包页面标注 CC0、可用于个人和商业项目；站点当前 QAL 说明禁止把素材本身作为独立资产包转售/再分发 | **最推荐作为 Dancify 内置角色**。优先下载 glTF/GLB；保存下载时对应的许可证页面，避免把原始压缩包开放给用户下载。 |
| [Sketchfab Free 3D Models](https://sketchfab.com/features/free-3d-models) | 资源量最大，能找到写实、卡通和舞者角色 | 格式、是否带 rig、是否可下载由单个模型决定；常见 FBX、glTF/GLB、OBJ | “免费”不等于统一授权；常见 CC BY、CC BY-NC、Standard、Editorial 等 | 逐个检查模型详情页的 license、作者和 download 权限。Dancify 商业化时避开 NC / Editorial；需要署名的模型在 About 或 credits 中保留作者信息。 |
| [Kenney Assets](https://kenney.nl/assets) | 风格化、轻量的游戏视觉资产，适合做占位 UI 或舞台道具 | 多为游戏资产；不以 humanoid rig / 舞蹈动作库为主，具体格式看资源包 | 官方 Support 页面说明资产页资源为 CC0，可用于商业项目且不要求署名 | 适合做背景、地面、装饰和 fallback 角色，不是第一选择的人形骨骼来源。 |
| [OpenGameArt](https://opengameart.org/) | 开放社区资源，可能找到角色、动作和贴图 | 格式和 rig 状态差异很大，需要逐项下载验证 | 每个资源自行选择许可证，可能是 CC0、CC BY、GPL 或其他许可 | 适合补充素材，不适合未经审核直接进入 release。必须记录作者、许可证、来源 URL 和是否允许商业使用。 |
| [VRoid Hub](https://hub.vroid.com/) | 二次元 / 虚拟主播风格角色，适合做更有个性的展示版本 | 常见 VRM；骨骼结构和可用动作取决于模型，three.js 通常需要 VRM 生态或先转换 | 授权由模型作者和平台规则共同决定，下载和再利用条件不统一 | 适合后续“角色自定义”方向；MVP 阶段不要把它当作默认内置角色来源，先确认 VRM loader、隐私和再分发条款。 |

## 推荐结论

### MVP：Quaternius + Mixamo

1. 用 Quaternius Universal Base Characters 的 glTF/GLB 作为网页默认角色。它的 Humanoid rig、低面数和多种比例更适合 Motion Poster 的快速加载，也方便保持视觉风格统一。
2. 用 Mixamo 为同一角色测试动作片段，先验证节拍点、动作切换、循环和速度倍率。Mixamo 动作通常以 FBX 导出，必要时在 Blender 中转换为 GLB 或提取动画。
3. three.js 侧统一走 `GLTFLoader` + `AnimationMixer`；只有在开发验证阶段才考虑 `FBXLoader`，避免 release 同时维护两套材质和骨骼管线。

### 后续扩展

- 想要更强的视觉辨识度：从 Quaternius 的基础人形开始改材质、颜色和服装，而不是直接混用多个来源的角色。
- 想要二次元角色：单独做 VRM 适配层，先明确模型作者允许的下载、修改和再分发范围。
- 想要社区上传模型：设计“来源 / 作者 / 许可证 / 是否可商用”字段，并在导入时阻止缺少许可证信息的模型进入公开项目。

## 下载与验证清单

- [ ] 确认模型是 humanoid rig，而不是只有静态网格。
- [ ] 在 Blender 或 three.js 中检查骨架姿势、脚底朝向、单位比例和 T-pose/A-pose。
- [ ] 至少播放一段走路或简单舞蹈循环，确认手脚没有明显错位。
- [ ] 优先导出单个 `.glb`，检查贴图是否内嵌、文件大小是否适合网页加载。
- [ ] 记录来源 URL、作者、下载日期、许可证原文链接和署名要求。
- [ ] 确认产品不会让用户直接下载原始模型文件；“嵌入到网页产品”与“重新分发素材本身”是两件事。

## 相关技术入口

- [three.js GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [three.js FBXLoader](https://threejs.org/docs/#examples/en/loaders/FBXLoader)
- [three.js AnimationMixer](https://threejs.org/docs/#api/en/animation/AnimationMixer)
- [Blender glTF 2.0 导出说明](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)

> 说明：本页是产品和工程选型参考，不构成法律意见。真正发布前，应以下载时看到的具体模型许可证和平台最新条款为准。
