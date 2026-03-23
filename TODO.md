# OGMA — TODO

> Atualizado: 2026-03-23
> Sequência de desenvolvimento pós-Fases 1–3. Executar em ordem, fase a fase.

---

## ⚠ Padrões Obrigatórios

### Tratamento de Erros — EXTREMA IMPORTÂNCIA

É de extrema importância manter tipagem completa em **cada etapa do desenvolvimento**:

- Todo código que chama `db()` no renderer **deve** usar `fromIpc<T>` de `src/renderer/types/errors.ts`
- Nunca usar `fromIpc<any>` — sempre tipar o genérico com o tipo concreto esperado
- Nunca usar `.then((r: any) => ...)` sem encapsulamento tipado
- Usar `async/await` em vez de `.then()` encadeado em `ResultAsync` dentro de `Promise.all`
- `pushToast` via `useAppStore()` é o canal de feedback de erros para o utilizador
- Todo novo código deve passar em `tsc --noEmit` sem erros nos ficheiros da aplicação

### TODO.md
Sempre manter este arquivo atualizado. Toda funcionalidade ou mudança pedida pelo utilizador deve ser anotada aqui (marcar com `[x]` quando concluída).

### Git
Fazer `git commit` após cada funcionalidade ou mudança implementada, com mensagem descritiva do que foi feito.

---

## Bugs conhecidos / Prioridade imediata

- [x] Dashboard reseta ao trocar de aba (DashboardView desmontava — corrigido: sempre montado com display:none)
- [x] Cor de acento não aplicada ao CSS (accent_color guardado mas não aplicado à variável --accent — corrigido: useEffect em App.tsx)
- [x] Atividades do Planner não aparecem no Calendário Global nem no widget de Agenda (UNION planned_tasks nas queries events:listForMonth e events:listUpcoming)
- [ ] Algoritmo de agendamento automático do Planner precisa de melhoria + edição manual
- [ ] Lembretes: mover para dentro do Planner do projeto; adicionar múltiplos lembretes, opções de tempo e prioridade

---

## Fase Extra — Prioridade Imediata

Funcionalidades em falta ou incompletas nas áreas já iniciadas (Biblioteca, Editor, Produtividade).

- [x] Leituras → Recurso: selecionar livro existente ao registar leitura
- [x] Sessões de leitura: registar sessões individuais com data e páginas lidas
- [x] Abas de leitura: Geral, Notas, Citações, Vínculos (detalhe de uma leitura)
- [x] Recursos: vista em galeria + detalhe com metadados + conexões a páginas
- [x] `reading_links`: vincular leitura ↔ página do OGMA
- [x] Progresso de leitura por páginas ou porcentagem (escolha ao cadastrar)
- [ ] Meta de leitura anual (tabela `reading_goals`)
- [ ] Histórico de versões de página (tabela `page_versions` já existe no schema)
- [x] Backlinks: mostrar no PageView as páginas que referenciam a atual
- [ ] Pomodoro / timer com histórico por página (tabela `time_sessions`) — aba "Tempo" no ProjectDashboardView: relógio SVG animado, modo Pomodoro (25/5min), registo manual de sessões (página, duração, data, notas, tags); independente do Planner; sessões ligadas a project_id + page_id, disponíveis globalmente para analytics
- [ ] Exportar página como PDF ou Markdown

---

## Fase 4 — Kanban

- [x] Drag & drop entre colunas (muda `prop_value` do Status)
- [x] Filtros e ordenação na view

---

## Fase 5 — Table / List

- [x] Edição inline de propriedades nas views (TableView)
- [x] Filtros, ordenação e busca nas views (TableView: busca + filtro por select; ListView: busca + sort por título/data)

---

## Fase 6 — Módulo Académico Completo

- [x] `colorUtils.ts` — cores HSL automáticas por disciplina (disciplineColor + disciplineColorAlpha)
- [x] Gerador de código `PREFIX###` automático (IPC pages:create, propriedade built-in `codigo`)
- [x] Pré-requisitos entre páginas com detecção de ciclo (IPC + UI no PageView para projetos académicos)
- ~~Script de migração do StudyFlow~~ (cancelado)

---

## Fase 8 — Calendário, Lembretes e Analytics

- [x] Lembretes via Notification API do Electron (scheduler.ts com polling de 60s)
- [x] Actividades académicas: tipos Prova, Trabalho, Seminário, Defesa, Prazo, Reunião, Outro
- [x] PageEventsPanel — criar actividades/lembretes dentro de cada página
- [x] UpcomingEventsPanel — painel de próximas actividades no dashboard do projecto
- [x] GlobalCalendarView — eventos no grid + aba Agenda (próximos 60 dias) + aba Lembretes
- [ ] Analytics de tempo por página e projeto (requer Pomodoro/time_sessions)

---

## Fase 9 — Dashboard Global

- [x] Fase da lua (cálculo astronómico) — getMoonPhase() com referência J2000 + ciclo 29.53 dias
- [x] Drag-and-drop dos widgets + persistência da ordem (localStorage `ogma_dashboard_order`)
- [x] Roda do Ano (WheelOfYearWidget) — SVG com 8 Sabás, setores sazonais, marcador do dia atual, próximo Sabá destacado
- [x] Três tamanhos por widget (SM/MD/LG) com layouts adaptativos + persistência (localStorage `ogma_widget_sizes`)
- [x] LG: ocupa 2 colunas × 2 linhas na grid (permite 2 widgets SM empilhados ao lado)
- [x] Localização do utilizador (cidade, estado, país, lat/lon, hemisfério, timezone) via geocoding Open-Meteo → Settings → Localização
- [x] Widget de Previsão do Tempo (WeatherWidget) — Open-Meteo forecast, layouts por tamanho, WMO codes em PT
- [x] Roda do Ano com hemisfério real e datas astronómicas (Meeus) por localização configurada

### Gestão de widgets

- [x] Remover widget do dashboard (botão × no hover)
- [x] Adicionar widget oculto de volta (card "+ Adicionar widget" no final do grid)
- [x] Persistência de widgets ocultos (`localStorage ogma_hidden_widgets`)

### Widgets novos (Fase 9c)

#### Alta prioridade (dados já disponíveis)
- [x] **Agenda da Semana** — faixa de 7 dias com chips de `calendar_events` por dia, coloridos por tipo
- [x] **Lembretes Pendentes** — lista de reminders com `is_dismissed = 0` e `trigger_at` próximo, ordenados por data
- [x] **Próximas Provas / Defesas** — filtro de `calendar_events` por tipos acadêmicos (`prova`, `defesa`, `trabalho`) com countdown em dias
- [x] **Progresso dos Projetos** — barra de progresso por projeto ativo (tarefas planeadas e páginas)
- [x] **Citação Aleatória** — citação aleatória de `reading_quotes`, renovável a clique

#### Média prioridade (UI mais rica)
- [ ] **Mapa de Calor de Atividade** — grid estilo GitHub de horas estudadas por matéria/página/tag (não por páginas criadas; requer Pomodoro/time_sessions)
- [ ] **Sumário do Dia** — briefing textual: eventos hoje, prazos próximos, lembretes ativos

#### Futuros (dependem de features pendentes)
- [ ] **Meta de Leitura Anual** — gauge circular de progresso da meta (depende de `reading_goals`)
- [ ] **Tempo de Foco Hoje** — sessões Pomodoro do dia (depende de Pomodoro/`time_sessions`)
- [ ] **Grafo de Conexões** — mini grafo de força com páginas mais interligadas via backlinks (requer lib de visualização)

---

## Fase 9b — Planejador Acadêmico (Planner)

Agendamento de tarefas com horas estimadas, replanejamento automático e vínculo com páginas do projeto.

- [ ] Migrations: tabelas `planned_tasks` e `work_blocks`
- [ ] IPC handlers: CRUD de `planned_tasks` + algoritmo de scheduling (EDF, capacidade diária global, replanejamento de missed blocks)
- [ ] Aba "Planner" no ProjectView — lista de tarefas planejáveis + calendário semanal com blocos de horas + criar/vincular página ao criar tarefa
- [ ] Widget "Plano do Dia" no Dashboard — consolidado de todos os projetos para hoje, com checkbox de sessão concluída
- [ ] Campo "Capacidade diária (horas)" em Settings (padrão 4h)
- [x] Criar uma aba para o planner global no menu lateral (GlobalPlannerView: fundo pontilhado + cosmos, estética bullet journal, mini calendário, urgente/hoje à esquerda, log completo com agrupamento/criação/detalhe inline à direita)

---

## Sincronização entre dispositivos

- [x] `data/settings.json` — preferências do utilizador separadas do banco (`electron-store` substituído por JSON direto via `src/main/settings.ts`)
- [x] Migrar `localStorage` (tema, localização, dashboard_order, widget_sizes, hidden_widgets) → `data/settings.json` via IPC `appSettings:*`
- ~~rclone + Proton Drive~~ — removido (v0.1); incompatibilidade com a API do Proton Drive (erro 422 persistente ao actualizar ficheiros). Ver alternativas em `# IDEIAS → ## Sincronização`

## Ícone da aplicação

- [x] Ícone temporário criado (`assets/ogma.ico`) — design: fundo castanho escuro, símbolo ✦ dourado, estrelas cosmos, texto "OGMA"
- [x] Ícone aplicado ao `BrowserWindow` (`icon: ICON_PATH` em `src/main/main.ts`)
- [x] Ícone configurado no `electron-builder` (`build.win.icon`)
- [x] Atalhos Windows atualizados com `IconLocation` para o `.ico`

---

## Fase 10 — Polimento

- [x] Ícone do app (temporário) — ver secção "Ícone da aplicação" acima
- [ ] Decoração cósmica completa, animações, ícone final definitivo

---

## Fase 11 — Futuro

- [ ] Pomodoro Timer completo com estatísticas
- [ ] Templates customizados de projeto
- [ ] IA: integração com Ollama e APIs externas

---

# IDEIAS

## Widgets

### Alta prioridade (dados já disponíveis)
- [ ] **Agenda da Semana** — faixa de 7 dias com chips de `calendar_events` coloridos por tipo
- [ ] **Lembretes Pendentes** — lista de `reminders` não dispensados com countdown
- [ ] **Próximas Provas** — eventos do tipo prova/defesa/trabalho com dias restantes em destaque
- [ ] **Progresso dos Projetos** — barra de progresso por projeto activo (páginas concluídas / total)
- [ ] **Citação Aleatória** — uma citação aleatória de `reading_quotes`, renovável a clique
- [ ] **Decoração de estação do ano atual com animação no card de boas vindas do dashboard**

### Média prioridade (UI mais rica)
- [ ] **Mapa de Calor** — grid estilo GitHub dos últimos 90 dias (páginas criadas/editadas)
- [ ] **Nuvem de Tags** — tags com tamanho proporcional à frequência, clicáveis
- [ ] **Leituras em Progresso** — livros com barra de progresso e % concluída
- [ ] **Meta de Leitura Anual** — gauge circular de progresso (depende de `reading_goals`)
- [ ] **Sumário do Dia** — briefing textual: eventos hoje + prazos + planner

### Futuros (dependem de features pendentes)
- [ ] **Tempo de Foco Hoje** — sessões Pomodoro do dia (depende de `time_sessions`)
- [ ] **Streak de Estudo** — dias consecutivos com blocos concluídos (`work_blocks`)
- [ ] **Grafo de Conexões** — mini grafo de força com `page_backlinks` (requer lib de visualização)

## Sincronização

Alternativas ao rclone + Proton Drive (para avaliar):

- **Syncthing** — P2P, sem cloud, funciona em LAN ou via relay; suporta SQLite se a BD estiver fechada no momento da sync
- **Restic + B2/S3** — backup incremental com dedup; adequado para BD; requer script de backup periódico em vez de sync contínuo
- **Git LFS** — versionar a BD com LFS; útil se quiser histórico de versões dos dados
- **SQLite Cloud** — substituir ficheiro local por base de dados remota (libsql/Turso); muda a arquitectura fundamentalmente
- **Electron-store com cifra + iCloud/OneDrive** — mais simples para ficheiros pequenos (settings); iCloud tem conflito automático
- **Custom HTTP sync** — endpoint próprio com autenticação; controlo total mas requer servidor

## Analytics

### Por projeto / académico
- [ ] **Horas por projecto** — gráfico de barras com `work_blocks` agrupados por projecto
- [ ] **Taxa de conclusão do Planner** — tarefas concluídas vs. atrasadas por mês
- [ ] **Distribuição de tipos de tarefa** — pizza de `task_type` (aula/prova/atividade…)
- [ ] **Progresso por prazo** — linha do tempo de tarefas vs. deadline

### Leitura
- [ ] **Ritmo de leitura** — páginas/dia ao longo do tempo (`reading_sessions`)
- [ ] **Livros concluídos por mês** — gráfico de barras
- [ ] **Progresso da meta anual** — gauge + projecção de conclusão

### Conhecimento
- [ ] **Páginas mais conectadas** — top backlinks (hubs de conhecimento)
- [ ] **Tags mais usadas** — evolução temporal
- [ ] **Actividade por dia da semana** — padrão de produtividade
