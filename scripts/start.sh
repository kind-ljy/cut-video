#!/usr/bin/env bash
# 同时启动前端 (5173) 和 后端 (5174)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

# 依赖检查
command -v ffmpeg >/dev/null 2>&1 || { echo "请先运行 ./scripts/setup.sh 安装依赖"; exit 1; }
[ -d node_modules ] || { echo "请先运行 ./scripts/setup.sh 安装依赖"; exit 1; }

echo -e "${CYAN}启动 cut-video...${NC}"
echo -e "  前端: http://localhost:5173"
echo -e "  后端: http://localhost:5174"
echo

# 用 npm-run-all 并发跑
npm run dev
