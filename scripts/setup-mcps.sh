#!/usr/bin/env bash
# Clone & build vendored MCP servers into vendor/.
# Idempotent: skips clone if directory exists, always re-runs install/build.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR_DIR="$ROOT_DIR/vendor"
mkdir -p "$VENDOR_DIR"

log() { printf "\033[36m[setup-mcps]\033[0m %s\n" "$*"; }
warn() { printf "\033[33m[setup-mcps]\033[0m %s\n" "$*"; }

# --- KPIC MCP (Node/TS) ---
KPIC_DIR="$VENDOR_DIR/kpic-mcp"
KPIC_REPO="https://github.com/antegral/kpic-mcp.git"

if [ ! -d "$KPIC_DIR/.git" ]; then
  log "cloning KPIC MCP into $KPIC_DIR"
  git clone --depth 1 "$KPIC_REPO" "$KPIC_DIR"
else
  log "KPIC MCP already cloned, skipping clone"
fi

if [ ! -f "$KPIC_DIR/dist/index.js" ]; then
  log "installing KPIC MCP deps + building"
  (cd "$KPIC_DIR" && NODE_ENV=development pnpm install --ignore-workspace --silent && pnpm build)
else
  log "KPIC MCP dist/index.js already present, skipping build"
fi

# --- DART MCP placeholder ---
# 2차 파이프라인용. 현재는 1차(KPIC)만 사용하므로 옵션 처리.
# DART MCP 사용 시: vendor/dart-mcp 에 clone + uv sync 수행.

log "done."
