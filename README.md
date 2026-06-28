# Mineradio · macOS

沉浸式桌面音乐播放器，融合天气电台、歌词舞台、粒子视觉和 3D 歌单架，打造属于你的私人音乐空间。

> 当前版本：**v1.1.1 **|  平台：**macOS（Apple Silicon / Intel）**  |  许可证：**GPL-3.0**

***

## 近期更新

- **壁纸模式**：桌面级粒子背景，Three.js 独立渲染，与主应用视觉对等；支持透明度调节、快捷键隐藏（`Cmd+Shift+H`）
- **节拍驱动视觉增强**：增强相机冲击力（FOV ×5、冲击缓动 0.82）、粒子节拍径向爆发与白色闪烁、泛光脉冲
- **Emily粒子专辑+行星环preste7**：双倍粒子，双倍快乐，视觉冲击更强！
- **macOS 菜单栏托盘**：MR 图标，单击打开窗口，右键菜单支持打开 / 退出
- **UI 清理**：移除壁纸模式 badge overlay，提升画面纯净度

***

## 核心特性

**音乐播放**

- 网易云音乐完整接入：搜索、扫码登录、歌单、播客、歌词、红心、收藏
- QQ 音乐接入：搜索、登录、歌单、歌词、歌手详情、评论
- 多音质支持：超清母带 / 高清臻音 / 无损 SQ / 极高 HQ / 标准
- 天气电台：基于 Open-Meteo 天气数据 + IP 定位，根据天气 mood 智能推荐音乐

**沉浸视觉**

- Three.js 粒子封面：将专辑封面转化为 3D 粒子网格（最高 3.35 万粒子）
- 基于节奏的电影镜头系统，实时音频频谱驱动视觉
- 多视觉预设：emily、安魂、星河、唱片、星球、滚筒、虚空
- 自由摄影机控制，DIY 视觉控制台（粒子参数、颜色、清晰度、4 个存档槽位）
- 专为长播客和 DJ 曲目打造的专属视觉模式

**歌词系统**

- 舞台歌词：主界面实时同步歌词展示
- 桌面歌词：独立透明悬浮窗，支持置顶、锁定穿透、拖拽、透明度调节、自定义样式
- 自定义歌词导入

**桌面功能**

- 壁纸模式：银河粒子背景嵌入桌面（macOS 全工作空间透明窗口）
- 3D 歌单架：右键唤起，支持歌单队列浏览和播客歌单
- 全局热键：可配置快捷键，冲突检测
- 自动更新：GitHub Releases 检测 + 国内镜像加速

***

## macOS 适配说明

本仓库是 Mineradio 的 macOS 专属版本，针对 macOS 做了以下平台适配：

**窗口与全屏**

- 原生窗口框架（`frame: true` + `hiddenInset`），标题栏与应用深色背景融为一体
- 原生红绿灯按钮（关闭 / 最小化 / 全屏），支持 macOS 标准全屏动画
- 红色按钮隐藏到 Dock 而非退出，点 Dock 图标恢复窗口（标准 macOS 行为）
- ESC 键退出全屏
- DPI 自适应：屏幕缩放因子 < 1.25 时禁用 `--force-device-scale-factor`，避免布局异常

**触摸板滚动**

- 歌单列表滚动速度适配 macOS 触摸板，通过每帧事件数量检测触摸板 vs 鼠标滚轮
- 触摸板累积 delta 乘以阻尼系数，避免滚动过快
- 主内容区 shelf 滚动节流（rAF + 40ms 最小间隔）

**安全与隐私**

- 移除 Electron `--options runtime` 签名参数，避免 macOS dyld 加载失败
- Cookie 存储路径：`~/Library/Application Support/Mineradio/.cookie`（每个用户独立，不随应用分发）
- 节奏分析缓存：`~/Library/Application Support/Mineradio/beatmaps/`

**打包与分发**

- 构建目标：DMG（x64 + arm64 双架构）
- 解压后双击运行，无需安装
- 未签名应用首次运行需右键 → 打开，或终端执行 `xattr -cr Mineradio.app`

***

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/ShijingYangwow27/Mineradio--macOS.git
cd Mineradio--macOS/Mineradio- macOS

# 安装依赖
npm install

# 启动应用
npm start

# 构建 DMG 安装包（x64 + arm64）
npm run build:mac
```

产物输出到 `dist/` 目录。

***

## 项目结构

```
Mineradio- macOS/
├── desktop/              # Electron 主进程
│   ├── main.js           #   窗口管理、IPC、全屏、热键、更新、macOS 适配
│   ├── preload.js        #   主窗口 preload（contextBridge + 平台标记）
│   └── overlay-preload.js #  桌面歌词/壁纸 overlay preload
├── public/               # 前端资源
│   ├── index.html        #   主界面（CSS + HTML + JS 单文件）
│   ├── desktop-lyrics.html  # 桌面歌词悬浮窗
│   └── wallpaper.html    #   壁纸模式
├── build/                # 打包资源（图标、after-pack 签名脚本）
├── server.js             # 本地后端 API（40+ 端点）
├── dj-analyzer.js        # 播客/DJ 节奏分析引擎
├── start.sh              # 一键启动脚本
└── package.json
```

***

## 技术栈

| 类别     | 技术                           |
| ------ | ---------------------------- |
| 桌面框架   | Electron 42.x                |
| 3D 渲染  | Three.js r128                |
| 动画引擎   | GSAP                         |
| 节奏分析   | music-tempo + 自研 dj-analyzer |
| 音乐 API | NeteaseCloudMusicApi         |
| 天气 API | Open-Meteo                   |
| 前端     | 纯 HTML / CSS / JS（无框架）       |
| 构建打包   | electron-builder             |

***

## 已处理的问题

以下是 macOS 适配过程中解决的主要问题：

| 问题            | 原因                                                                           | 解决方案                                                      |
| ------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| 透明窗口全屏不铺满     | `transparent: true` + Electron 原生全屏在 macOS 上不兼容                              | macOS 使用 `setFullScreen(true)` + `frame: true` + 不透明背景    |
| 绿色按钮不变图标      | 自定义 maximize 事件拦截了原生全屏行为                                                     | macOS 上移除 maximize 拦截，直接走原生全屏                             |
| ESC 无法退出全屏    | `before-input-event` 中 `win.isFullScreen()` 对 `setSimpleFullScreen` 返回 false | 改用原生 `setFullScreen`，ESC 检测 `isFullScreen()` 正确返回         |
| 触摸板滚动过快       | 自定义 GSAP 平滑滚动对触摸板高频事件无节流                                                     | 每帧 rAF 合并事件 + 触摸板检测（每帧多事件）+ 0.08 阻尼系数                     |
| 从 Dock 恢复窗口黑屏 | `transparent: true` 下 macOS hide/show 导致渲染丢失                                 | macOS 用 `frame: true` + `backgroundColor: '#0a0a0a'` 替代透明 |
| DIY/引导按钮被隐藏   | CSS 规则 `.desktop-window-controls{display:none}` 过于宽泛                         | 改为只隐藏 `[data-window-action]` 按钮                           |
| 分发包含登录数据      | Cookie 存储在应用目录内                                                              | 迁移到 `~/Library/Application Support/Mineradio/`            |
| 打包后 dyld 加载失败 | `after-pack.js` 的 `--options runtime` 与 electron-builder 签名冲突                | 移除 `--options runtime` 和 `hardenedRuntime`                |

***

## 第三方音乐平台说明

Mineradio 不是网易云音乐、QQ 音乐或腾讯音乐娱乐集团的官方客户端，也不隶属于任何音乐平台。

项目中的第三方平台接入仅用于个人学习、本地客户端体验和用户自有账号的播放辅助。请遵守对应平台的用户协议、版权规则和会员权益规则。项目不会提供绕过付费、绕过会员、破解音质或重新分发音乐内容的能力。

## 用户数据与隐私

登录 Cookie、搜索历史、自定义封面、自定义歌词、节奏分析缓存等数据只保存在本机，不会上传到任何服务器。详见 [PRIVACY.md](./PRIVACY.md)。

## 致谢

Mineradio 由 [XxHuberrr](https://github.com/XxHuberrr) 主要设计与打造，感谢原作者开源！开源大法好！

## 许可证

[GPL-3.0](./LICENSE)

## 版权与授权

原作版权：Copyright (C) 2026 XxHuberrr.

衍生作品版权：Copyright (C) 2026 ShijingYangwow27.

本项目为 Mineradio 的二次创作，采用 GPL-3.0 授权。详见 [LICENSE](./LICENSE)。

MR Logo、Mineradio 名称、界面视觉设计与原创视觉表达归原作者所有；第三方依赖和第三方服务分别遵循其各自授权与服务条款。
