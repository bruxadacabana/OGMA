# OGMA

Gerenciador unificado de projetos, estudos e leituras.
Estética de papel envelhecido · máquina de escrever · cosmos.
Stack: Electron + React + TypeScript + better-sqlite3.

---

## Setup — CachyOS

```bash
# Pré-requisitos: Node 22 LTS, ferramentas de compilação nativas
sudo pacman -S nodejs npm git base-devel python

# Verificar versão (precisa ser >= 22)
node -v

# Alternativa: usar nvm para controle de versão do Node
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc   # ou: source ~/.config/fish/config.fish (Fish shell)
nvm install 22 && nvm use 22 && nvm alias default 22

# Instalar dependências (compila better-sqlite3 automaticamente via postinstall)
npm install

# Se precisar recompilar os módulos nativos manualmente (ex.: após trocar versão do Node):
npm run rebuild

# Iniciar em modo desenvolvimento
npm run dev
# ou use o script de conveniência:
./iniciar.sh
```

## Setup — Windows 10

```bat
rem Pré-requisitos:
rem 1. Node 22 LTS — https://nodejs.org/en/download
rem 2. Git — https://git-scm.com/downloads
rem 3. Python 3 — https://www.python.org/downloads/
rem    (marcar "Add Python to PATH" no instalador)
rem 4. Visual C++ Build Tools — https://visualstudio.microsoft.com/visual-cpp-build-tools/
rem    (selecionar "Desenvolvimento para desktop com C++" no instalador)

npm install
npm run dev
```

> **Windows — se `npm install` falhar na compilação nativa:**
> Abra o "Developer Command Prompt for VS" (não o CMD comum) e tente novamente, ou:
> `npm install --global windows-build-tools` (Node 16 ou anterior — não necessário no Node 22)

## Scripts

| Comando              | Descrição                                       |
|----------------------|-------------------------------------------------|
| `npm run dev`        | Inicia Vite + Electron em modo desenvolvimento  |
| `npm run build`      | Build completo (renderer + main)                |
| `npm run rebuild`    | Recompila better-sqlite3 para o Electron atual  |
| `npm run typecheck`  | Verifica tipos TypeScript sem compilar          |
| `npm run dist:linux` | Gera AppImage + .deb                            |
| `npm run dist:win`   | Gera instalador NSIS (.exe)                     |

## Dados

Todos os dados ficam em `data/` na raiz do projeto (modo dev) ou junto ao executável (modo prod). Nunca fora da pasta do projeto.

```
data/
  ogma.db       ← banco SQLite (todos os projetos, páginas e propriedades)
  uploads/      ← imagens inseridas no editor
  logs/         ← logs de execução
```

---

*OGMA v0.1.0 — Arquitetura v2: Projetos como Databases*
