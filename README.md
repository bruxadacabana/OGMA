# OGMA

Gerenciador unificado de projetos, estudos e leituras.  
Estética de papel envelhecido · máquina de escrever · cosmos.  
Stack: Electron + React + TypeScript + better-sqlite3.

---

## Setup — CachyOS

```bash
# Pré-requisitos
sudo pacman -S nodejs npm git

# Usar Node 22 LTS (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22 && nvm use 22 && nvm alias default 22

# Instalar dependências
npm install

# Compilar módulos nativos para o Electron
npm run rebuild

# Fontes (baixar do Google Fonts → app/theme/fonts/ — opcional, carrega via CDN em dev)
# IM Fell English, Special Elite, Courier Prime

# Iniciar em modo desenvolvimento
npm run dev
# ou:
./iniciar.sh
```

## Setup — Windows 10

```bat
rem Pré-requisitos: Node 22 LTS (nodejs.org), Git
rem Visual C++ Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/

npm install
npm run rebuild
npm run dev
```

## Scripts

| Comando             | Descrição                          |
|---------------------|------------------------------------|
| `npm run dev`       | Inicia Vite + Electron em dev mode |
| `npm run build`     | Build completo (renderer + main)   |
| `npm run rebuild`   | Recompila better-sqlite3           |
| `npm run dist:linux`| Gera AppImage + deb                |
| `npm run dist:win`  | Gera instalador NSIS               |
| `npm run typecheck` | Verifica tipos TypeScript          |

## Dados

Todos os dados ficam em `data/` — nunca fora da pasta do projeto.

---

*OGMA v0.1.0 — Fase 1: Fundação*
