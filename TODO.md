# OGMA — TODO

> Atualizado: 2026-03-22
> Sequência de desenvolvimento pós-Fases 1–3. Executar em ordem, fase a fase.

---

## ⚠ Padrões Obrigatórios

### Tratamento de Erros
Todo código que chama `db()` no renderer **deve** usar `fromIpc` de `src/renderer/types/errors.ts`.
Nunca usar `.then((r: any) => { if (r?.ok) ... })` sem encapsulamento tipado.
`pushToast` via `useAppStore()` é o canal de feedback de erros para o utilizador.

### TODO.md
Sempre manter este arquivo atualizado. Toda funcionalidade ou mudança pedida pelo utilizador deve ser anotada aqui (marcar com `[x]` quando concluída).

### Git
Fazer `git commit` após cada funcionalidade ou mudança implementada, com mensagem descritiva do que foi feito.

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
- [ ] Pomodoro / timer com histórico por página (tabela `time_sessions`)
- [ ] Exportar página como PDF ou Markdown

---

## Fase 4 — Kanban

- [ ] Drag & drop entre colunas (muda `prop_value` do Status)
- [ ] Filtros e ordenação na view

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
- [x] Localização do utilizador (cidade, estado, país, lat/lon, hemisfério, timezone) via geocoding Open-Meteo → Settings → Localização
- [x] Widget de Previsão do Tempo (WeatherWidget) — Open-Meteo forecast, layouts por tamanho, WMO codes em PT
- [x] Roda do Ano com hemisfério real e datas astronómicas (Meeus) por localização configurada

### Widgets novos (Fase 9c)

#### Alta prioridade (dados já disponíveis)
- [x] **Agenda da Semana** — faixa de 7 dias com chips de `calendar_events` por dia, coloridos por tipo
- [x] **Lembretes Pendentes** — lista de reminders com `is_dismissed = 0` e `trigger_at` próximo, ordenados por data
- [x] **Próximas Provas / Defesas** — filtro de `calendar_events` por tipos acadêmicos (`prova`, `defesa`, `trabalho`) com countdown em dias
- [x] **Progresso dos Projetos** — barra de progresso por projeto ativo (tarefas planeadas e páginas)
- [x] **Citação Aleatória** — citação aleatória de `reading_quotes`, renovável a clique

#### Média prioridade (UI mais rica)
- [ ] **Mapa de Calor de Atividade** — grid estilo GitHub dos últimos 90 dias com contagem de páginas criadas/editadas
- [ ] **Nuvem de Tags** — tags mais usadas com tamanho proporcional à frequência, clicáveis para filtrar
- [ ] **Sumário do Dia** — briefing textual: eventos hoje, prazos próximos, lembretes ativos

#### Futuros (dependem de features pendentes)
- [ ] **Meta de Leitura Anual** — gauge circular de progresso da meta (depende de `reading_goals`)
- [ ] **Tempo de Foco Hoje** — sessões Pomodoro do dia (depende de Pomodoro/`time_sessions`)
- [ ] **Grafo de Conexões** — mini grafo de força com páginas mais interligadas via backlinks (requer lib de visualização)

---

## Fase 9b — Planejador Académico (Planner)

Agendamento de tarefas com horas estimadas, replanejamento automático e vínculo com páginas do projeto.

- [ ] Migrations: tabelas `planned_tasks` e `work_blocks`
- [ ] IPC handlers: CRUD de `planned_tasks` + algoritmo de scheduling (EDF, capacidade diária global, replanejamento de missed blocks)
- [ ] Aba "Planner" no ProjectView — lista de tarefas planejáveis + calendário semanal com blocos de horas + criar/vincular página ao criar tarefa
- [ ] Widget "Plano do Dia" no Dashboard — consolidado de todos os projetos para hoje, com checkbox de sessão concluída
- [ ] Campo "Capacidade diária (horas)" em Settings (padrão 4h)

---

## Fase 10 — Polimento

- [ ] Decoração cósmica completa, animações, ícone do app

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
