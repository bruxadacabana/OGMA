// ── Projeto ──────────────────────────────────────────────────────────────────

export type ProjectType =
  | 'academic' | 'creative' | 'research'
  | 'software' | 'health'  | 'custom'

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'

export interface Project {
  id:           number
  workspace_id: number
  name:         string
  description:  string | null
  icon:         string | null
  color:        string | null
  project_type: ProjectType
  subcategory:  string | null
  status:       ProjectStatus
  date_start:   string | null
  date_end:     string | null
  extra_fields: string | null  // JSON
  sort_order:   number
  created_at:   string
  updated_at:   string
}

export interface ProjectCreateInput {
  workspace_id: number
  name:         string
  description?: string
  icon?:        string
  color?:       string
  project_type: ProjectType
  subcategory?: string
  status?:      ProjectStatus
  date_start?:  string
  date_end?:    string
  extra_fields?: Record<string, any>
  sort_order?:  number
}

// ── Subcategorias por tipo ────────────────────────────────────────────────────

export const SUBCATEGORIES: Record<ProjectType, string[]> = {
  academic: ['Faculdade', 'Idiomas', 'Concurso Público', 'Curso Livre', 'Autodidata', 'Livre'],
  creative: ['Roteiro', 'Worldbuilding', 'Escrita Ficcional', 'Outro'],
  research: ['Científica', 'Jornalística', 'Pessoal', 'Outro'],
  software: ['Aplicativo Desktop', 'Web', 'Mobile', 'Biblioteca', 'Outro'],
  health:   ['Fitness', 'Nutrição', 'Saúde Mental', 'Geral'],
  custom:   [],
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  academic: 'Acadêmico',
  creative: 'Criativo',
  research: 'Pesquisa',
  software: 'Dev de Software',
  health:   'Saúde e Hábitos',
  custom:   'Personalizado',
}

export const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  academic: '🎓',
  creative: '✍️',
  research: '🔍',
  software: '💻',
  health:   '🌿',
  custom:   '✦',
}

export const PROJECT_TYPE_DESCRIPTIONS: Record<ProjectType, string> = {
  academic: 'Grades curriculares, disciplinas, semestres e prazos acadêmicos.',
  creative: 'Roteiros, worldbuilding, escrita ficcional e projetos criativos.',
  research: 'Pesquisas científicas, jornalísticas ou pessoais.',
  software: 'Desenvolvimento de aplicativos, APIs, bibliotecas e sistemas.',
  health:   'Rastreamento de hábitos, metas de saúde e rotinas.',
  custom:   'Estrutura totalmente personalizada para qualquer propósito.',
}

// Paleta de cores sugeridas para projetos
export const PROJECT_COLORS = [
  '#8B7355', // sépia
  '#8B3A2A', // vermelho desbotado
  '#4A6741', // verde musgo
  '#7A5C2E', // marrom
  '#2C5F8A', // azul
  '#6B4F72', // roxo
  '#5C8A6B', // verde água
  '#8A6B2C', // dourado
]

// ── Página ────────────────────────────────────────────────────────────────────

export type PageType = 'document' | 'database' | 'kanban' | 'calendar' | 'discipline'

export interface Page {
  id:           number
  project_id:   number | null
  parent_id:    number | null
  title:        string
  icon:         string | null
  cover:        string | null
  page_type:    PageType
  content_json: string | null
  sort_order:   number
  is_deleted:   number
  created_at:   string
  updated_at:   string
}

// ── Workspace ─────────────────────────────────────────────────────────────────

export interface Workspace {
  id:           number
  name:         string
  icon:         string
  accent_color: string
}

// ── API Response ──────────────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  ok:    boolean
  data?: T
  error?: string
}
