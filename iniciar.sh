#!/usr/bin/env bash
# OGMA — Script de inicialização para CachyOS / Linux
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
npm run dev
