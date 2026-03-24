# OGMA

Gerenciador unificado de projetos, estudos e leituras.
Estética de papel envelhecido · máquina de escrever · cosmos.
Stack: Electron + React + TypeScript + @libsql/client (Turso).

---

## ☁️ Sincronização e Banco de Dados (Turso)

O OGMA utiliza uma arquitetura *offline-first* com *embedded replicas*. Isso significa que o banco de dados funciona localmente na sua máquina para máxima velocidade e disponibilidade offline, sincronizando as alterações com a nuvem (Turso) em background.

Para configurar a sincronização na nuvem:

1. Crie uma conta gratuita em [turso.tech](https://turso.tech).
2. Instale a CLI do Turso:
   - Linux/macOS: `curl -sSfL https://get.tur.so/install.sh | bash`
   - Windows: Siga as instruções na documentação oficial ou use o WSL.
3. Autentique-se na CLI:
   ```bash
   turso auth login
   ```
4. Crie o banco de dados remoto:
   ```bash
   turso db create ogma
   ```
5. Obtenha a URL do seu banco (copie o endereço que começa com `libsql://`):
   ```bash
   turso db show ogma
   ```
6. Gere um token de autenticação:
   ```bash
   turso db tokens create ogma
   ```
7. Na raiz do projeto, dentro da pasta `data/`, crie um arquivo chamado `.env` (este arquivo é ignorado pelo Git) e adicione suas credenciais:
   ```env
   TURSO_URL=libsql://sua-url-aqui.turso.io
   TURSO_TOKEN=seu_token_aqui
   ```

> **Nota para uso 100% Offline:** Se você não quiser sincronizar com a nuvem, basta **não** configurar o arquivo `data/.env`. O OGMA detectará a ausência das credenciais e funcionará puramente no modo local.

---

## 🛠️ Setup de Desenvolvimento

Como o projeto agora utiliza o `@libsql/client`, **não** é mais necessário instalar ferramentas de compilação C++ (Visual Studio Build Tools) ou Python.

**Pré-requisitos:**
- Node.js >= 22 LTS (recomendado o uso de `nvm` ou `fnm`)
- Git

```bash
# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm run dev

# (Opcional) Script de conveniência para Linux
./iniciar.sh
```

---

## 📜 Scripts Disponíveis

| Comando              | Descrição                                       |
|----------------------|-------------------------------------------------|
| `npm run dev`        | Inicia Vite + Electron em modo desenvolvimento  |
| `npm run build`      | Build completo (renderer + main)                |
| `npm run typecheck`  | Verifica tipos TypeScript sem compilar          |
| `npm run dist:linux` | Gera AppImage + .deb                            |
| `npm run dist:win`   | Gera instalador NSIS (.exe)                     |

---

## 📁 Estrutura de Dados Locais

Todos os dados locais ficam salvos na pasta `data/` na raiz do projeto (modo dev) ou junto ao executável (modo prod). **Nunca** fora da pasta do projeto.

```text
data/
  ogma.db         ← banco SQLite local (réplica sincronizada com o Turso)
  settings.json   ← preferências do usuário (tema, layout do dashboard, localização)
  .env            ← credenciais de acesso ao Turso (não versionado)
  uploads/        ← imagens e arquivos inseridos no editor
  logs/           ← logs de execução da aplicação
```
```

O que achou? Se quiser adicionar mais alguma seção sobre funcionalidades específicas que já estão prontas (como o Planner, Calendário Global ou os Widgets Astronômicos), é só falar que a gente inclui!