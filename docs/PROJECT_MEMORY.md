# Mineradio (macOS) Project Memory

这个文件用于解决新开对话时"失忆"的问题。每次用户明确说"保留""喜欢""这个很好""记住""保存一下"等表达时，要把关键结论追加到这里。

## Stable Project Facts

- 项目：Mineradio macOS 版本，Electron 桌面音乐播放器
- GitHub 仓库：`https://github.com/ShijingYangwow27/Mineradio--macOS`
- 技术栈：Electron 42 + Three.js + GSAP + koffi（native FFI）
- 当前源码版本：`v1.1.1`
- 构建命令：`npm run build:mac`（electron-builder --mac --publish never）
- 启动命令：`npm start`

## Repository Layout

```text
Mineradio- macOS/
├─ desktop/
│  ├─ main.js                    # Electron 主进程，窗口/IPC/壁纸/全屏/桌面歌词
│  ├─ preload.js                 # 主窗口预加载
│  ├─ overlay-preload.js         # 壁纸/桌面歌词 overlay 窗口预加载
│  └─ wallpaper-level-bridge.js   # macOS NSWindow 私有 API FFI 桥接（koffi）
├─ public/
│  ├─ index.html                 # 主 UI、CSS、歌词、粒子、3D 歌单架、视觉控制台
│  └─ wallpaper.html             # 壁纸窗口渲染（Three.js 独立）
├─ server.js                     # 本地 API、音乐源、更新检查
├─ dj-analyzer.js                # 节奏/音频分析
└─ package.json
```

## 壁纸模式架构（macOS）

壁纸模式通过独立 BrowserWindow 渲染 Three.js 粒子背景，作为桌面级窗口铺满屏幕（包含菜单栏和 Dock 区域）。

### 核心组件

- `wallpaperState`：壁纸状态（enabled / mode / actualMode / opacity）
- `wallpaperWindow`：壁纸 BrowserWindow（frame:false, transparent:true, focusable:false, skipTaskbar:true, enableLargerThanScreen:true）
- `wallpaper-level-bridge.js`：通过 koffi 调 libobjc / AppKit 的 NSWindow 私有 API
  - `setNSWindowLevel`：设 `kCGDesktopWindowLevel` (-2147483623)，让窗口在桌面图标下方
  - `setCollectionBehavior`：设 `NSWindowCollectionBehavior`，控制 Space 归属
  - `orderOutNSWindow`：`[NSWindow orderOut:nil]`，关闭前移出屏幕
- `applyWallpaperWindowMode(win, mode)`：统一应用层级模式，处理 desktop-level ↔ overlay 切换

### 关键技术点

- `getNativeWindowHandle()` 返回的是 **NSView**（BridgedContentView），不是 NSWindow！必须先 `[NSView window]` 取到 NSWindow 再调 `setLevel:` / `setCollectionBehavior:`
- koffi 不能用变参 `'...'` 声明 `objc_msgSend`，必须为每个 selector 给具体签名
- desktop-level 窗口对 Electron 的 `destroy()` / `close()` 不敏感，需要三步清理：`orderOut` → `setLevel:0` → `destroy`
- 壁纸窗口 `positionWallpaperWindow` 用 `display.size` 不用 `display.bounds`，桌面级模式需要铺满包含菜单栏和 Dock 的全部区域

## Important Known Sensitive Areas

- `public/index.html` 很大，主 UI、CSS、视觉预设、播放控制都在里面。改动要用 `grep` 精确定位，避免大块重写。
- `desktop/main.js` 的壁纸 / 全屏 / 桌面歌词逻辑相互关联，改一处要验证全屏 + 壁纸 + 桌面歌词的组合路径。

## How To Add New Memory

追加格式：

```markdown
### YYYY-MM-DD - 简短标题

- 用户认可/要求保留：
- 涉及文件：
- 关键参数/实现：
- 禁止回退或改坏的点：
```

## Memory Entries

### 2026-06-29 - 全屏 + 壁纸闪退修复（时序 + collection behavior）

- 用户认可/要求保留：全屏模式下打开 / 关闭壁纸模式闪退的问题已修复，用户实机验证通过（① 正常开壁纸→关壁纸 ② 进全屏→开壁纸→关壁纸→退出全屏 ③ 开壁纸→进全屏→退出全屏 ④ 进全屏→开壁纸→直接退出全屏 四条路径全过）。
- 涉及文件：`desktop/main.js`、`desktop/wallpaper-level-bridge.js`。
- 关键参数/实现：
  - 根因不是 `kCGDesktopWindowLevel` 本身，而是**窗口时序**：原来 `showInactive()` 在 `setLevel` / `setVisibleOnAllWorkspaces` 之前，窗口以普通层级进入当前活跃 Space（全屏主窗口所在的 Space），随后才被改成 desktop-level，这一瞬间 desktop-level 窗口存在于全屏 Space，触发 WindowServer 冲突闪退。
  - 正解：在窗口 `orderFront` / `show` **之前**设好 collection behavior 和 level：
    1. `attachWallpaperAsBackground`（Electron `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false })`）
    2. native `setCollectionBehavior(CanJoinAllSpaces(1) | Stationary(16))`，**不设** `FullScreenAuxiliary(256)`
    3. 最后 `setWallpaperWindowLevelBelowDock`（内部 `setLevel:kCGDesktopWindowLevel` + `orderFrontRegardless`）
  - 这样壁纸窗口 `orderFront` 时直接绑定到所有非全屏 Space（桌面1），不进入全屏主窗口所在的 Space（桌面2），desktop-level 与全屏 Space 永不相见，不闪退。
  - 关闭时恢复完整三步清理：`orderOut` → `setLevel:0` → `destroy`，不跳过。
- 禁止回退或改坏的点：
  - **不要再加"主窗口全屏就 fallback 到 overlay"逻辑**（`applyWallpaperWindowMode` 里的 `isMainFullScreen` 判断）——这会把壁纸强行拉进全屏 Space 当浮层，反而还是闪退 / 体验坏。
  - **不要再加"全屏时跳过 orderOut / setLevel"逻辑**（`closeWallpaperWindow` 里的 `isMainFullScreen` 判断）——壁纸窗口在非全屏 Space，关闭清理不会与全屏 Space 冲突。
  - **不要破坏 ready-to-show 时序**：macOS 下必须先 `applyWallpaperWindowMode` 再 `showInactive`；Windows 时序不变（`showInactive` 在 `attachWallpaperToWorkerW` 之前）。
  - **native `setCollectionBehavior` 必须在 `setWallpaperWindowLevelBelowDock`（含 `orderFrontRegardless`）之前调用**，否则窗口会在默认 Space（可能是全屏 Space）短暂出现导致闪退。

### 2026-06-29 - 壁纸模式开关位置（底部播放栏）

- 用户认可/要求保留：壁纸模式开关放在底部播放栏（歌词按钮旁边），透明度滑条保留在视觉控制台。全屏 DIY 入口不能遮挡壁纸开关。
- 涉及文件：`public/index.html`、`desktop/main.js`、`desktop/preload.js`。
- 关键参数/实现：底部播放栏 `.control-cluster` 新增壁纸 toggle 按钮，与歌词按钮并列；`mineradio-wallpaper-set-enabled` / `mineradio-wallpaper-update` IPC 通道；壁纸透明度通过 `wallpaperState.opacity` 控制（0.35~1）。
- 禁止回退或改坏的点：不要把壁纸开关塞回视觉控制台深处（用户找不到）；不要让全屏 DIY 浮层遮挡播放栏的壁纸按钮。

### 2026-06-29 - macOS 红色关闭按钮先退出全屏再隐藏

- 用户认可/要求保留：macOS 红色关闭按钮点击时，如果主窗口在全屏状态，必须先 `setFullScreen(false)`，等 `leave-full-screen` 事件后再 `hide()`，不能直接 hide 全屏窗口。
- 涉及文件：`desktop/main.js`（`mainWindow.on('close')`）。
- 关键参数/实现：`close` 事件里 `preventDefault()`，全屏时 `once('leave-full-screen', () => mainWindow.hide())` 再 `setFullScreen(false)`；非全屏直接 `hide()`。配合 `app.isQuitting` 标志位区分真正退出。
- 禁止回退或改坏的点：不要直接 hide 全屏窗口，会导致窗口残留 / Space 异常。
