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

### Widgets novos

#### Alta prioridade (dados já disponíveis)
- [ ] **Agenda da Semana** — faixa de 7 dias com chips de `calendar_events` por dia, coloridos por tipo
- [ ] **Lembretes Pendentes** — lista de reminders com `is_dismissed = 0` e `trigger_at` próximo, ordenados por data
- [ ] **Próximas Provas / Defesas** — filtro de `calendar_events` por tipos acadêmicos (`prova`, `defesa`, `trabalho`) com countdown em dias
- [ ] **Progresso dos Projetos** — barra de progresso por projeto ativo (páginas concluídas / total)
- [ ] **Leituras Pendentes** — recursos do tipo `book`/`article` ainda não lidos (requer campo `status` em `page_resources`)

#### Média prioridade (UI mais rica)
- [ ] **Mapa de Calor de Atividade** — grid estilo GitHub dos últimos 90 dias com contagem de páginas criadas/editadas
- [ ] **Nuvem de Tags** — tags mais usadas com tamanho proporcional à frequência, clicáveis para filtrar
- [ ] **Sumário do Dia** — briefing textual: eventos hoje, prazos próximos, lembretes ativos

#### Futuros (dependem de features pendentes)
- [ ] **Meta de Leitura Anual** — gauge circular de progresso da meta (depende de `reading_goals`)
- [ ] **Tempo de Foco Hoje** — sessões Pomodoro do dia (depende de Pomodoro/`time_sessions`)
- [ ] **Grafo de Conexões** — mini grafo de força com páginas mais interligadas via backlinks (requer lib de visualização)

---

## Fase 10 — Polimento

- [ ] Decoração cósmica completa, animações, ícone do app

---

## Fase 11 — Futuro

- [ ] Pomodoro Timer completo com estatísticas
- [ ] Templates customizados de projeto
- [ ] IA: integração com Ollama e APIs externas
