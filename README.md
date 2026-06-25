# Mineradio

沉浸式桌面音乐播放器，融合天气电台、歌词舞台、粒子视觉和 3D 歌单架，打造属于你的私人音乐空间。

> 当前版本：**v1.1.0**  |  平台：**Windows / macOS**  |  许可证：**GPL-3.0**

---

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
- 壁纸模式：银河粒子背景嵌入桌面（Windows WorkerW / macOS 全工作空间）
- 3D 歌单架：右键唤起，支持歌单队列浏览和播客歌单
- 全局热键：可配置快捷键，冲突检测
- 自动更新：GitHub Releases 检测 + 国内镜像加速

---

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/XxHuberrr/Mineradio.git
cd Mineradio

# 安装依赖
npm install

# 启动应用
npm start
```

**构建安装包：**

```bash
# Windows
npm run build:win

# macOS（x64 + arm64 双架构）
npm run build:mac
```

产物输出到 `dist/` 目录。

---

## 项目结构

```
Mineradio/
├── desktop/              # Electron 主进程
│   ├── main.js           #   窗口管理、IPC、全屏、热键、更新
│   ├── preload.js        #   主窗口 preload（contextBridge）
│   └── overlay-preload.js #  桌面歌词/壁纸 overlay preload
├── public/               # 前端资源
│   ├── index.html        #   主界面（CSS + HTML + JS 单文件）
│   ├── desktop-lyrics.html  # 桌面歌词悬浮窗
│   └── wallpaper.html    #   壁纸模式
├── build/                # 打包资源（图标、安装器脚本）
├── beatmaps/             # 节奏分析缓存
├── server.js             # 本地后端 API（40+ 端点）
├── dj-analyzer.js        # 播客/DJ 节奏分析引擎
├── docs/                 # 项目文档与记忆
└── package.json
```

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 桌面框架 | Electron |
| 3D 渲染 | Three.js r128 |
| 动画引擎 | GSAP |
| 节奏分析 | music-tempo + 自研 dj-analyzer |
| 音乐 API | NeteaseCloudMusicApi |
| 天气 API | Open-Meteo |
| 前端 | 纯 HTML / CSS / JS（无框架） |
| 构建打包 | electron-builder |

---

## 第三方音乐平台说明

Mineradio 不是网易云音乐、QQ 音乐或腾讯音乐娱乐集团的官方客户端，也不隶属于任何音乐平台。

项目中的第三方平台接入仅用于个人学习、本地客户端体验和用户自有账号的播放辅助。请遵守对应平台的用户协议、版权规则和会员权益规则。项目不会提供绕过付费、绕过会员、破解音质或重新分发音乐内容的能力。

## 用户数据与隐私

登录 Cookie、搜索历史、自定义封面、自定义歌词、节奏分析缓存等数据只保存在本机，不会上传到任何服务器。详见 [PRIVACY.md](./PRIVACY.md)。

## 致谢

Mineradio 由 [XxHuberrr](https://github.com/XxHuberrr) 主要设计与打造。感谢 emily 作为早期视觉底层想法与 `emily` 视觉预设改进方向的共创者和灵感来源。同时感谢小天才e宝、应春日、锋将军、軌跡、林中、骊、风痕、花椰菜在早期体验、测试反馈和发布准备中的帮助。

## 许可证

[GPL-3.0](./LICENSE)

## 版权与授权

Copyright (C) 2026 XxHuberrr.

本项目采用 GPL-3.0 授权。详见 [LICENSE](./LICENSE)。

MR Logo、Mineradio 名称、界面视觉设计与原创视觉表达归作者所有；第三方依赖和第三方服务分别遵循其各自授权与服务条款。
