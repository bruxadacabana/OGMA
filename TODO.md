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
- [ ] Backlinks: mostrar no PageView as páginas que referenciam a atual
- [ ] Pomodoro / timer com histórico por página (tabela `time_sessions`)
- [ ] Exportar página como PDF ou Markdown

---

## Fase 4 — Kanban

- [ ] Drag & drop entre colunas (muda `prop_value` do Status)
- [ ] Filtros e ordenação na view

---

## Fase 5 — Table / List

- [ ] Edição inline de propriedades nas views
- [ ] Filtros, ordenação e busca nas views

---

## Fase 6 — Módulo Académico Completo

- [ ] `colorUtils.ts` — cores HSL automáticas por disciplina
- [ ] Gerador de código `PREFIX###` automático
- [ ] Pré-requisitos com detecção de ciclo (BFS)
- [ ] Script de migração do StudyFlow

---

## Fase 8 — Calendário, Lembretes e Analytics

- [ ] Lembretes via Notification API do Electron
- [ ] Analytics de tempo por página e projeto

---

## Fase 9 — Dashboard Global

- [ ] Fase da lua (cálculo astronómico)
- [ ] Drag-and-drop dos widgets + persistência da ordem

---

## Fase 10 — Polimento

- [ ] Decoração cósmica completa, animações, ícone do app

---

## Fase 11 — Futuro

- [ ] Pomodoro Timer completo com estatísticas
- [ ] Templates customizados de projeto
- [ ] IA: integração com Ollama e APIs externas
