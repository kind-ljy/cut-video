# cut-video

> 本地运行的自动视频剪辑工具:**自动转写字幕 → 智能去除静默 → 烧录字幕 → 叠加配乐 → 一键导出**。
>
> 为 DJI Action 4 等大文件视频(4K/11GB+)设计:文件不上传,直接读硬盘。

## 截图(架构示意)

```
浏览器 (5173)  ←→  本地 Node 后端 (5174)  ←→  ffmpeg / whisper.cpp / 硬盘
```

## 功能

- ✅ **本地大文件直读**:浏览器拿到本地路径后,后端用 range 请求流式读取,4K 11GB 视频也能预览
- ✅ **Whisper 离线转写**:基于 `whisper.cpp` + `ggml-medium` 模型,完全离线,中英文都支持
- ✅ **可编辑字幕**:每句字幕可单独勾选/编辑/删除
- ✅ **自动剪辑**:
  - 删除静默(只保留有人说话的部分)
  - 按字幕断句切片(勾选保留哪些)
  - 自定义保留 padding 和最短片段时长
- ✅ **音频处理**:保留原声 / 叠加 BGM(可调音量+循环) / 全静音
- ✅ **字幕导出**:可选烧录到画面(hard sub)
- ✅ **实时进度**:SSE 推送转写/渲染进度

## 快速开始

### 一次性安装

```bash
./scripts/setup.sh
```

会自动:
1. 检查并装 `ffmpeg`、`whisper-cpp`(用 Homebrew)
2. 下载 Whisper `ggml-medium` 模型(约 1.5GB,放到 `~/.cache/cut-video/models/`)
3. 安装 npm 依赖

### 启动

```bash
./scripts/start.sh
```

打开浏览器访问 <http://localhost:5173>。

## 使用流程

1. **加载视频**:在 Finder 中右键视频(按住 Option)→ "拷贝 ...的路径名称",粘贴到输入框
2. **开始转写**:点右上角"开始转写",等待 1-3 分钟(10 分钟视频)
3. **编辑字幕**:勾选要保留的句子,直接点 textarea 修改文字
4. **配置规则**:开启"删除静默"、调整 padding;可选 BGM
5. **导出**:确认输出路径 → 点"开始导出"

## 项目结构

```
apps/
├── web/        # React + Vite + Tailwind 前端
└── server/     # Fastify + execa 后端,调用本机 ffmpeg / whisper-cpp
scripts/
├── setup.sh    # 一键安装依赖
└── start.sh    # 启动前后端
docs/plans/
└── 2026-05-28-cut-video-design.md   # 设计文档
```

## 常见问题

**Q: 浏览器选文件后报"无法获取文件绝对路径"?**
A: 浏览器安全限制。请改用"复制路径粘贴"的方式(Finder 右键 + Option → 拷贝路径名称)。

**Q: 转写很慢?**
A: `medium` 模型在 M1/M2/M3 上约 1-2x 实时速度。如果嫌慢,可以下载 `ggml-small.bin`(质量稍降,但快 3 倍)放到 `~/.cache/cut-video/models/`,然后改 `apps/server/src/config.ts` 里的 `WHISPER_MODEL`。

**Q: 输出文件在哪里?**
A: 你在"导出"面板里设置的路径。默认是原视频同目录下加 `_cut.mp4` 后缀。

**Q: 不想要烧录字幕,只要 SRT?**
A: 取消勾选"烧录字幕到画面"即可,SRT 文件会保留在 `~/.cache/cut-video/work/` 下。

## 后续计划

- [ ] LLM 字幕精修(去口头禅、压缩冗长)
- [ ] 镜头变化检测(自动挑高动态片段)
- [ ] Tauri 打包成 macOS 桌面 App
- [ ] 多音轨混音 + 音效库

## License

个人本地用工具,无 license 限制。
