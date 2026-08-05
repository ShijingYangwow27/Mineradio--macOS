# Home 页面改版：删除 home-hero-visual，整列堆叠 portrait + report

## Context

用户反馈：当前 `home-hero-visual`（图片/视频上传）和 `home-report`（听歌报告 mini）并排时**屏幕比例不协调**——visual 占左侧约 40% 宽度但实际只是装饰用途，而听歌报告的内容（数字、tab 切换、按钮）在窄列下展示效果受限。

**目标**：彻底删除 `home-hero-visual` 功能（含 crop modal 全部相关代码），把 `home-portrait`（用户信息栏）放到上方，`home-report`（听歌报告 mini）占满下方剩余空间，整列堆叠。同时同步调整 `home-right-col` 保持左右两列等高对齐。

**意图**：
- Home 左侧：上下结构，portrait 顶部信息 + report 完整宽度展开（数字/tab/按钮更易读）
- Home 右侧：维持 6 个 home-card + home-rail，不变
- 删除大量无用代码（hero-visual、crop modal、IndexedDB 视频持久化），减少维护负担

## 关键文件

主文件：`/Users/yangshijing/Documents/trae_projects/cyberaudioDemo/Mineradio- macOS/public/index.html`（30656 行）

## 实施步骤

### Step 1: HTML 删除

**1.1 删除 crop modal 整块**（行 13-35）
- 内容：`<div class="crop-modal-mask" id="crop-modal-mask" style="display:none">` 整个块（含 crop 视口、确认/取消按钮、video controls）

**1.2 删除 home-hero-visual 整块**（行 2267-2275）
- 内容：`<div class="home-hero-visual" id="home-hero-visual">` 含 input file、placeholder、img、video 4 个子元素

### Step 2: CSS 删除

**2.1 删除 4 条 home-hero-visual 规则**（行 279-284）
- `.home-hero-visual{...}` / `:hover` / `.home-hero-visual-placeholder{...}` / `svg` / `span` / `.home-hero-visual-img{...}`

**2.2 删除 24 条 crop modal 规则**（行 285-308）
- 从注释 `/* ── Hero Crop Modal ── */` 到 `.crop-video-hint` 结束
- 含 `.crop-modal-mask` / `.crop-modal` / `.crop-viewport` / `.crop-img` / `.crop-video` / `.crop-play-btn` / `.crop-action-btn` 等

### Step 3: CSS 修改

**3.1 home-hero-inner 改单列**（行 276）
- `grid-template-columns:.95fr 1.05fr` → `grid-template-columns:1fr`
- `grid-template-rows:auto 1fr` 保持不变（portrait 自适应，report 撑满剩余）

**3.2 home-portrait 移除 grid 定位**（行 325）
- 删除 `grid-column:1 / -1;grid-row:1;`

**3.3 home-portrait-empty 移除 grid 定位**（行 339）
- 删除 `grid-column:1 / -1;grid-row:1;`

**3.4 home-report 移除 grid 定位**（行 342）
- 删除 `grid-column:2;grid-row:2;`

### Step 4: JS 删除

**4.1 blockedSelector 中移除**（行 18349）
- 删除 `'.home-hero-visual',` 行

**4.2 Hero Visual IIFE 整段**（行 29596-29700，105 行）
- 含 `heroVisual`/`heroInput`/`heroImg`/`heroVideo`/`heroPlaceholder` 变量
- `openDB` / `saveVideoToDB` / `loadVideoFromDB` / `clearVideoDB` / `showImage` / `showVideo` 函数
- `loadVideoFromDB(...)` 启动恢复逻辑
- `heroInput.addEventListener('change', ...)` 文件上传监听

**4.3 Crop Modal 全部逻辑**（行 29702-29909，208 行）
- 全局变量 `_cropData`
- `openCropModal` / `fitCropImage` / `applyCropTransform` / `closeCropModal` / `confirmCrop` / `toggleVideoPreview` / `stopVideoPreview` / `cropVideoSpatial` 函数
- `document.addEventListener('DOMContentLoaded', ...)` 视口拖拽监听

### Step 5: 媒体查询调整

**5.1 行 510 `@media (max-width:840px)`**
- 删除 `.home-hero-visual{display:none}`（元素已不存在）

**5.2 行 512 `@media (max-width:620px)`**
- 删除 `.home-hero-visual{display:none}`

**5.3 行 507 `@media (max-width:1120px)`**
- `.home-hero-inner{grid-template-columns:.65fr 1fr}` → `grid-template-columns:1fr`

**5.4 行 508 `@media (max-height:760px)`**
- `.home-hero-inner{grid-template-columns:.63fr 1fr}` → `grid-template-columns:1fr`

### Step 6: desktop-shell 全屏模式调整

**6.1 行 559 `.home-hero-inner` 全屏 grid-template-rows**
- `grid-template-rows:auto auto auto 1fr` → `grid-template-rows:auto 1fr`（不再需要 4 行）

**6.2 行 560 `.home-hero-visual` 全屏规则**
- 整行删除：`body.desktop-shell.desktop-fullscreen .home-hero-visual,html:fullscreen body.desktop-shell .home-hero-visual{align-self:stretch;max-width:100%}`

**6.3 行 585 `@media (max-width:1120px)` desktop-shell `.home-hero-inner`**
- `grid-template-columns:minmax(0,1.16fr) minmax(126px,.52fr)` → `grid-template-columns:1fr`

### Step 7: 验证

**7.1 静态检查**
- `node -e "new Function(code)"` 验证 JS 语法
- grep 确认无残留 `home-hero-visual` / `crop-modal` / `heroVisual` / `openCropModal` / `_cropData`

**7.2 启动服务器**
```bash
cd "/Users/yangshijing/Documents/trae_projects/cyberaudioDemo/Mineradio- macOS"
PORT=3000 node server.js
```

**7.3 浏览器验证（窗口模式 1200×800）**
- home-portrait 顶部水平铺满
- home-report 占满下方剩余空间（不截断）
- home-right-col 6 cards + rail 正常
- Console 无 JS 错误
- Elements 搜索无残留

**7.4 响应式断点**
- 1120px / 840px / 760px / 620px 各验证一次

**7.5 功能回归**
- 登录/未登录 home-portrait 切换
- 听歌报告 tab 切换
- "查看听歌报告"按钮 → openReportModal
- 6 个 home-card 点击

## 风险点

| 风险 | 等级 | 应对 |
|---|---|---|
| R1: home-portrait-empty 状态未登录显示异常 | 中 | 移除 grid 定位后由自然流接管，肉眼验证 |
| R2: home-report 在小窗口（< 600px 高）被压扁 | 低 | grid-template-rows:auto 1fr 允许 report 自适应最小高度 |
| R3: home-right-col 高度变化后视觉重心改变 | 中 | home-grid 已有 `align-content:center`，cards 居中无溢出 |
| R4: IndexedDB 旧数据残留（mineradio-hero-db） | 低 | 不主动清理，浏览器存储会保留，清理存储后失效 |
| R5: 行 569/571 已有截断的 CSS 选择器（home-mosaic） | 无关 | 不在本次范围，不动 |

## 改动量估算

- HTML：-23 行（crop modal 23 行 + home-hero-visual 9 行，保留空行整理）
- CSS：-28 行 + 6 处改
- JS：-313 行（Hero Visual IIFE 105 + Crop Modal 208）
- 净减少：约 360 行代码
