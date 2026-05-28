#!/usr/bin/env bash
# cut-video 一键安装脚本
# 安装 ffmpeg / whisper-cpp,下载 whisper 模型

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${CYAN}[info]${NC}  $1"; }
ok()    { echo -e "${GREEN}[ ok ]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $1"; }
fail()  { echo -e "${RED}[fail]${NC}  $1"; exit 1; }

# 0. brew 检查
command -v brew >/dev/null 2>&1 || fail "未检测到 Homebrew,请先安装: https://brew.sh"

# 1. ffmpeg
if command -v ffmpeg >/dev/null 2>&1; then
  ok "ffmpeg 已安装: $(ffmpeg -version | head -1)"
else
  info "安装 ffmpeg ..."
  brew install ffmpeg
  ok "ffmpeg 安装完成"
fi

# 2. whisper-cpp
if command -v whisper-cpp >/dev/null 2>&1 || command -v whisper-cli >/dev/null 2>&1; then
  ok "whisper-cpp 已安装"
else
  info "安装 whisper-cpp ..."
  brew install whisper-cpp
  ok "whisper-cpp 安装完成"
fi

# 3. 模型
MODEL_DIR="$HOME/.cache/cut-video/models"
MODEL_FILE="$MODEL_DIR/ggml-medium.bin"
mkdir -p "$MODEL_DIR"

if [ -f "$MODEL_FILE" ]; then
  ok "Whisper medium 模型已就绪: $MODEL_FILE"
else
  info "下载 Whisper medium 模型 (约 1.5GB,可能需要几分钟)..."
  curl -L --fail -o "$MODEL_FILE" \
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin" \
    || fail "模型下载失败,可手动下载到 $MODEL_FILE"
  ok "模型下载完成"
fi

# 4. node 依赖
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

info "安装 npm 依赖..."
cd "$ROOT_DIR"
npm install

ok "全部安装完成!运行 ./scripts/start.sh 启动应用。"
