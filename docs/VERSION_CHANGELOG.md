# Mineradio 版本变更记录

本文档记录 Mineradio 开发过程中的关键问题修复和视觉调整。

## v1.1.1 总览

本次版本包含以下模块改动：
- 视觉控制台下 3D 歌单误触修复
- 3D 歌单架常驻实卡质感与歌词层级
- 3D 歌单架内容开关与连续滚动
- 3D 歌单详情页动态/静态绑定边界
- 歌词必须绑定封面粒子世界轴
- 3D 歌单架详情页和固定角度偏好
- 3D 歌单架滚动选择音和滚轮热区
- 3D 歌单架常驻不遮挡歌词
- 封面粒子丝带/行星环特效 (Preset 7)
- 壁纸模式视角调整 - Preset 5/6 星河/骷髅

---

## 视觉控制台下 3D 歌单误触修复

**问题描述：**
用户在视觉控制台（DIY 玩家模式）下操作时，右键唤起 3D 歌单架会误触底部的播放器控制台，导致控制台意外弹出，打断视觉调整流程。

**问题根源：**
视觉控制台打开时，底部播放器控制台的热区/播放态 reveal 仍然激活，右键事件穿透到播放器控制台，触发其显示。

**修复方案：**
歌单架打开期间强制隐藏底部控制台，并阻止热区/播放态 reveal。

```javascript
// 歌单架打开期间抑制底部控制台
function openShelf() {
  // 隐藏底部播放器控制台
  controlBar.style.display = 'none';
  // 阻止热区/播放态 reveal
  controlBarRevealLocked = true;
}

function closeShelf() {
  controlBar.style.display = '';
  controlBarRevealLocked = false;
}
```

**涉及文件：**
- `public/index.html`：3D 歌单架打开/关闭逻辑
- `docs/3D_PLAYLIST_SHELF_MEMORY.md`：交互边界记录

**用户反馈：**
- "右键唤起 3D 歌单架时误唤出播放器控制台"
- 修复后确认不再误触

---

## 3D 歌单架常驻实卡质感与歌词层级

**问题描述：**
常驻 3D 歌单架的卡片在自动隐藏/常驻状态下，被压成灰暗半透明"幽灵卡"，缺乏右键展开后的实体卡质感。

**修复方案：**
保留 `shelfBgOpacity` 的实卡黑玻璃底，`passiveAlways` 只做极轻微透明/亮度压制。未命中时 shelf group/card 仍保持在歌词后层，只有鼠标真实命中/选中卡片后，通过 `selected` / `floatMix` 浮起动画把卡片抬到歌词前景。

```javascript
// 常驻卡片默认保持实卡质感
card.mesh.material.opacity = shelfBgOpacity;  // 实卡黑玻璃底
passiveAlways.material.opacity *= 0.92;       // 极轻微压制

// 选中后浮起到前景
function updateCardFloat(card) {
  card.floatMix += (card.selected ? 1 : 0 - card.floatMix) * 0.18;
  card.mesh.renderOrder = card.floatMix > 0.5 ? 10 : 0;
}
```

**涉及文件：**
- `public/index.html`：`makeShelfManager().placeCard()`、`updateShelfCardHoverSelection()`
- `docs/3D_PLAYLIST_SHELF_MEMORY.md`

**禁止回退：**
不要为了常驻实卡质感把歌单架永久抬到歌词上层；不要再把常驻默认卡片透明度压回 0.5 左右。

---

## 3D 歌单架内容开关与连续滚动

**问题描述：**
用户需要独立控制播客歌单的显示，以及「我的歌单」与「收藏歌单」的滚动行为。

**新增功能：**
- `fx.shelfShowPodcasts`：控制播客歌单是否显示，默认 `true`
- `fx.shelfMergeCollections`：控制是否合并收藏歌单，默认 `false`

**实现逻辑：**
```javascript
// 合并收藏歌单后连续滚动
function activePlaylists() {
  if (fx.shelfMergeCollections) {
    return minePlaylists.concat(favoritePlaylists);  // 一条线连续滚
  }
  return { mine: minePlaylists, fav: favoritePlaylists };  // 二段体验
}

// 切换时重建 shelf
function togglePodcasts() {
  fx.shelfShowPodcasts = !fx.shelfShowPodcasts;
  shelfManager.rebuild(true);
}
```

**涉及文件：**
- `public/index.html`：控制台 UI、`activePlaylists()`、`shelfManager.rebuild()`
- `docs/3D_PLAYLIST_SHELF_MEMORY.md`

---

## 3D 歌单详情页动态/静态绑定边界

**问题描述：**
动态镜头模式下，歌单详情页应该跟随镜头移动；静态/固定模式下，应该和封面粒子/画布绑定旋转移动。之前两种情况混淆，导致详情页行为异常。

**修复方案：**
```javascript
function updateDetailPage() {
  if (shouldUseShelfDynamicCamera('shelf-detail')) {
    // 动态：跟随镜头
    detailGroup.quaternion.copy(camera.quaternion);
  } else {
    // 静态：跟随封面粒子
    detailGroup.quaternion.copy(particles.quaternion);
  }
}
```

**涉及文件：**
- `public/index.html`：`makeContentListManager().open()/update()`

---

## 歌词必须绑定封面粒子世界轴

**问题描述：**
旋转封面粒子到左上方俯视等大角度时，歌词出现偏轴、过度倾斜、像绕另一个轴滑走的感觉。

**修复方案：**
使用 `particles.getWorldPosition()` 和 `particles.getWorldQuaternion()` 作为歌词组的世界位置/四元数基准，不再使用相机坐标轴叠加封面欧拉角。

```javascript
function updateStageLyrics3D() {
  const worldPos = new THREE.Vector3();
  const worldQuat = new THREE.Quaternion();
  particles.getWorldPosition(worldPos);
  particles.getWorldQuaternion(worldQuat);
  
  lyricsGroup.position.copy(worldPos);
  lyricsGroup.quaternion.copy(worldQuat);
}
```

**涉及文件：**
- `public/index.html`：`updateStageLyrics3D()`、`setStageLyricViewBasisFromCameraOrQuaternion()`

---

## 3D 歌单架详情页和固定角度偏好

**问题描述：**
用户反馈歌单详情页偏小、偏下、硬贴镜头，侧向角度不够平行。

**调整参数：**
- 静态/固定镜头默认侧向角度：`-15`（与画布粒子平行）
- 动态镜头默认侧向角度：`0`
- 详情页非骷髅布局：放大、上移、轻微收中

```javascript
function shelfDefaultAngleForCameraMode(mode) {
  return mode === 'static' ? -15 : 0;  // 静态 -15，动态 0
}

// 详情页布局
const detailProfile = shelfLayoutProfile().detail;
detailGroup.position.x = detailProfile.x || 0.08;
detailGroup.position.y = detailProfile.y || 0.12;
```

**涉及文件：**
- `public/index.html`：`shelfDefaultAngleForCameraMode()`、`shelfLayoutProfile()`

---

## 3D 歌单架滚动选择音和滚轮热区

**问题描述：**
滚动选择高亮不跟随，滚轮热区吃掉封面粒子半屏。

**修复方案：**
- 滚动选择必须跟随中心卡/中心行高亮
- 选择音效：WebAudio 合成 PSP/机械齿轮咔哒质感
- 滚轮热区：只接受真实卡片命中、详情面板/行命中、右侧窄热区

```javascript
// 选择音效
function playShelfSelectTick() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = 1800 + Math.random() * 400;
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.06);
}
```

**涉及文件：**
- `public/index.html`：`playShelfSelectTick()`、`isShelfWheelZone()`

---

## 3D 歌单架常驻不遮挡歌词

**问题描述：**
常驻歌单架未选中时长期遮挡歌词。

**修复方案：**
常驻未选中时 shelf group/card 降低层级和透明度，只有鼠标命中/选中卡片后才通过 `floatMix` 浮起到歌词前景。

```javascript
function updateShelfCardHoverSelection() {
  cards.forEach(card => {
    const hit = raycastShelfCards(card);
    card.hovered = hit;
    if (hit) setSelected(card.index);
  });
}

function setSelected(index) {
  cards.forEach(card => {
    card.selected = card.index === index;
    // 选中卡片浮起到前景
    if (card.selected) {
      card.floatMix += (1 - card.floatMix) * 0.22;
      card.mesh.renderOrder = 10;
    } else {
      card.floatMix += (0 - card.floatMix) * 0.15;
      card.mesh.renderOrder = 0;
    }
  });
}
```

**涉及文件：**
- `public/index.html`：`updateShelfCardHoverSelection()`、`setSelected()`

---

## 封面粒子丝带/行星环特效 (Preset 7)

**问题描述：**
用户希望将 Emily 粒子专辑与星河特效结合，创建"行星 + 行星环"的视觉体验，作为新的第 8 个预设。

**实现方案：**
- 主应用 (`index.html`)：添加 `createRibbonLayer()` 和 `updateRibbonLayer()`，实现 4 层同心行星环
- 壁纸模式 (`wallpaper.html`)：镜像实现 ribbon layer，使用 lazy initialization

**关键参数：**
- 粒子数量：15000
- 4 层行星环半径：4.2、6.5、8.8、11.2
- 轨道速度：0.14 - ringIdx * 0.018
- 金色边缘：`goldMix = smoothstep(0.30, 0.75, ridge) * (0.28 + beatKick * 0.38)`
- 渲染顺序：ribbon renderOrder = 2（在 bloom 粒子之后）

**技术约束与修复：**
- JavaScript 中必须使用 `Math.cos()` / `Math.sin()`，GLSL 中用 `cos()` / `sin()`
- wallpaper.html r128 中不能修改 `camera.position`，只能修改 `scene.position`
- 使用直接属性赋值 `scene.position.x = ...`，不能用 `.set()` 方法
- Preset 7 通过 `uPreset < 0.5 || uPreset > 6.5` 路由到 SILK 粒子逻辑

**涉及文件：**
- `public/index.html`：shader 逻辑、`createRibbonLayer()`、presetMeta
- `public/wallpaper.html`：镜像 ribbon layer、场景位移实现俯角+环游

---

## 壁纸模式视角调整 - Preset 5/6 星河/骷髅

**问题描述：**
用户在壁纸模式下使用 Preset 5/6（星河/骷髅特效）时，反馈当前视角看不到更远的粒子，场景整体感觉偏低。

**技术约束：**
在 Three.js r128 的 Electron 环境中，直接修改 `camera.position` 会导致渲染完全丢失。因此所有相机位置调整必须通过修改 `scene.position` 和 `scene.rotation` 来实现。

**坐标方向说明：**
Three.js 中 y 轴正方向朝上，负方向朝下。因此"上移"对应增加 y 值，"下沉"对应减少 y 值。

**调整过程：**

1. 初始状态：`scene.position.y = -3.5`（场景下沉）
2. 第一次调整：改为 `scene.position.y = -8.5`（误以为负值是上移，实际是下沉 5 个单位）
3. 方向纠正：改为 `scene.position.y = 1.5`（正确上移 5 个单位）
4. 最终微调：改为 `scene.position.y = 0.5`（从 1.5 下沉 1 个单位，找到更合适的视角）

**实现位置：**
文件：`public/wallpaper.html`
代码段：Preset 5/6 视角控制逻辑

```javascript
// Preset 5/6: 俯拍视角（场景上移+前倾）
else if (_wallpaperPreset === 5 || _wallpaperPreset === 6) {
  scene.position.x = 0;
  scene.position.y = 0.5;  // 调整场景高度
  scene.position.z = 0;
  scene.rotation.y = -0.2;  // 侧向旋转
  scene.rotation.x = 0.45;  // 前倾角度
}
```

**配合调整：**
- 广角 FOV：动态调整至 50°，增强纵深感
- 俯拍角度：`scene.rotation.x = 0.45` 保持前倾
- 侧向角度：`scene.rotation.y = -0.2` 保持侧倾

**用户反馈：**
- "整体比刚才好不少"
- "还是看不到更远的粒子"
- "有一点，还是不太对的。我怎么感觉俯拍镜头要好点"
- 最终调整后用户认可当前视角

**经验总结：**
1. 在 r128 中必须使用 `scene.position` 而非 `camera.position` 来调整视角
2. 直接属性赋值（`scene.position.y = 0.5`）比 `.set()` 方法更稳定
3. 用户描述的"上移/下沉"需要明确坐标方向后再调整，避免方向误解

---

## 相关技术备忘

- Three.js 版本：r128
- 渲染器：WebGLRenderer，抗锯齿关闭，像素比限制为 2
- 壁纸窗口：macOS 桌面级模式，透明背景
- 性能策略：高 GPU 性能模式，禁用后台节流
- 所有相机调整必须通过 `scene.position` / `scene.rotation`，不能直接修改 `camera.position`
