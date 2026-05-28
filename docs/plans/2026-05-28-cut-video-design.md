# cut-video 设计文档

**日期**: 2026-05-28
**作者**: WorkBuddy
**状态**: MVP 设计稿（已与用户对齐）

## 1. 目标与场景

为本地个人使用打造一个"视频上传 → 自动剪辑 → 加字幕 → 加音频 → 导出"的网页工具。

**主要素材来源**: DJI Action 4 拍摄（4K/2.7K/1080p，单段最高 ~11GB）。
**部署形态**: 本地运行（不上云、不联网），后续可打包为 Tauri 桌面应用。

## 2. 架构

```
┌──────────────────────────────────────────────────────────────┐
│ 浏览器 (http://localhost:5173)                                │
│  ┌─────────────────────────────────────────────────┐         │
│  │ React + Vite + Tailwind                          │         │
│  │ - 文件选择 (本地路径，不上传)                     │         │
│  │ - 时间轴 / 字幕编辑 / 剪辑规则配置                 │         │
│  │ - 视频预览 (HTML5 <video>)                        │         │
│  │ - 任务进度 (SSE)                                  │         │
│  └─────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────┘
                  ↕ HTTP / SSE  (localhost:5174)
┌──────────────────────────────────────────────────────────────┐
│ 本地 Node 后端 (Fastify)                                      │
│  - /api/probe       读视频元信息 (ffprobe)                    │
│  - /api/transcribe  抽音轨 + Whisper.cpp 转写                 │
│  - /api/auto-cut    依据规则生成剪辑时间线                     │
│  - /api/render      执行 ffmpeg 合成 (剪辑/字幕/音频)         │
│  - /api/progress    SSE 推送进度                              │
│  - /api/files/*     本地视频静态访问 (range 请求)              │
└──────────────────────────────────────────────────────────────┘
                  ↕ 直接读硬盘 / 调用本机二进制
┌──────────────────────────────────────────────────────────────┐
│ 本机工具                                                       │
│  - ffmpeg / ffprobe  (brew install ffmpeg)                    │
│  - whisper.cpp       (brew install whisper-cpp)               │
│  - 模型: ggml-medium.bin (中英文)                              │
└──────────────────────────────────────────────────────────────┘
```

**关键设计决策**:
1. **不上传文件**：前端把本地路径发给后端，后端直接读硬盘 → 解决 11GB 大文件问题
2. **后端拉起本机二进制**：性能比 wasm 高一个数量级，4K 视频可处理
3. **同源代理**：Vite dev server 反代 `/api/*` 到 Node，避免 CORS
4. **SSE 推送进度**：长任务（转写 / 渲染）实时反馈

## 3. 核心功能

### 3.1 自动剪辑（多种规则可组合）

| 规则 | 说明 | 实现 |
|------|------|------|
| 静默删除 | 删除连续静默 ≥ N 秒的片段 | ffmpeg `silencedetect` 滤镜 |
| 按字幕断句切片 | Whisper 输出每句时间戳，可勾选保留/删除 | 渲染时拼接保留片段 |
| 镜头变化检测 | 用画面差异挑出"高动态"片段 | ffmpeg `select=gt(scene\,0.4)` |
| 时长裁剪 | 限制总时长 ≤ N 秒，自动均匀采样 | 自定义抽样逻辑 |

MVP 先实现 **静默删除 + 按字幕切片**，其他规则保留扩展点。

### 3.2 字幕

- **来源**：Whisper.cpp 本地离线转写，模型 `ggml-medium`（中英文都好用，1.5GB）
- **流程**：`ffmpeg 抽 16kHz 单声道 WAV` → `whisper-cpp` → SRT
- **可编辑**：字幕加载到右侧面板，可以改文字、删句子、合并
- **样式**：底部居中，黑底白字，可调字体大小

### 3.3 音频

- **保留原声**（默认开关）
- **叠加 BGM**：用户从本地选音乐文件，可调音量（0-100%），可勾选自动 fade in/out
- **AI 配音 / 音效**：MVP 不做，留 Phase 2

### 3.4 导出

- 输出 MP4 (H.264 + AAC)
- 用户选输出路径
- 字幕烧录进画面（hard sub）或外挂 .srt（软字幕，二选一）

## 4. 项目结构

```
cut-video/
├── apps/
│   ├── web/                    # React 前端
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── FilePicker.tsx
│   │   │   │   ├── VideoPreview.tsx
│   │   │   │   ├── Timeline.tsx
│   │   │   │   ├── SubtitlePanel.tsx
│   │   │   │   ├── AudioPanel.tsx
│   │   │   │   ├── CutRulesPanel.tsx
│   │   │   │   └── ExportPanel.tsx
│   │   │   ├── api.ts          # 后端调用封装
│   │   │   ├── store.ts        # zustand 状态管理
│   │   │   └── App.tsx
│   │   └── vite.config.ts      # 代理 /api → :5174
│   └── server/                 # Node 后端
│       ├── src/
│       │   ├── index.ts        # Fastify 入口
│       │   ├── routes/
│       │   │   ├── probe.ts
│       │   │   ├── transcribe.ts
│       │   │   ├── autocut.ts
│       │   │   ├── render.ts
│       │   │   └── files.ts
│       │   ├── lib/
│       │   │   ├── ffmpeg.ts   # spawn 封装 + 进度解析
│       │   │   ├── whisper.ts
│       │   │   └── progress.ts # SSE 通道
│       │   └── config.ts
│       └── tsconfig.json
├── scripts/
│   ├── setup.sh                # 一键安装 ffmpeg/whisper-cpp/模型
│   └── start.sh                # 一键启动前后端
├── docs/
│   └── plans/
└── package.json (workspaces)
```

## 5. 关键交互流程

### 流程 A：上传 → 自动剪辑 → 导出

1. 用户点"选择视频" → 浏览器原生 File picker → 拿到本地路径
2. 前端发 `POST /api/probe { path }` → 后端 ffprobe 读元数据 → 返回时长/分辨率/码率
3. 前端展示视频预览（`<video src="/api/files/?path=...">`，后端走 range 请求）
4. 用户勾选剪辑规则 → 点"自动转写+剪辑"
5. 前端发 `POST /api/transcribe { path }` → 后端抽音轨 + whisper → 返回 SRT
6. 前端展示字幕 + 自动算出"建议保留片段"
7. 用户调整字幕/勾选片段 → 配置音频 → 点"导出"
8. 前端发 `POST /api/render { path, segments, subtitle, audio, output }` → 后端 ffmpeg 合成
9. SSE 推送进度 → 完成后展示输出文件路径

## 6. 性能目标

| 任务 | 输入 | 目标耗时 |
|------|------|----------|
| ffprobe | 11GB 4K | < 2s |
| 转写 | 10 分钟视频 (medium 模型) | < 3 分钟 (M-series Mac) |
| 渲染 (无重编码切片) | 10 分钟剪到 5 分钟 | < 30s |
| 渲染 (字幕烧录+重编码) | 10 分钟 | < 5 分钟 |

## 7. MVP 分期

**Phase 1（本次实现）**:
- ✅ 项目骨架 + 一键安装脚本
- ✅ 后端 5 个核心接口
- ✅ 前端基础 UI (文件选择、预览、转写、简单剪辑、导出)
- ✅ 静默删除 + 按字幕切片两种自动剪辑规则
- ✅ BGM 叠加
- ✅ 字幕烧录导出

**Phase 2（后续按需）**:
- 镜头变化检测、自动时长裁剪
- LLM 字幕精修
- 多音轨混音 + 音效库
- Tauri 桌面打包

## 8. 待装依赖

```bash
brew install ffmpeg whisper-cpp
# 模型（自动下载到 ~/.cache/cut-video/models/）
curl -L -o ~/.cache/cut-video/models/ggml-medium.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin
```

前端：`react`, `vite`, `tailwindcss`, `zustand`, `@radix-ui/react-*`
后端：`fastify`, `@fastify/cors`, `@fastify/static`, `execa`, `tsx`
