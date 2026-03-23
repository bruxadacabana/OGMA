#!/usr/bin/env bash
# OGMA — Script de inicialização para CachyOS / Linux
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

# Se o app já está a correr, focar a janela existente e sair
if lsof -ti:5173 > /dev/null 2>&1; then
    # Tenta focar a janela Electron existente
    OGMA_PID=$(pgrep -f "electron \." | head -1)
    if [ -n "$OGMA_PID" ]; then
        # KDE: usa xdotool ou kdotool se disponível
        xdotool search --name "OGMA" windowactivate 2>/dev/null \
        || kdotool search --name "OGMA" windowactivate 2>/dev/null \
        || notify-send "OGMA" "O programa já está a correr." 2>/dev/null \
        || true
    fi
    exit 0
fi

exec > /tmp/ogma.log 2>&1
echo "=== OGMA $(date) ==="

npm run dev
