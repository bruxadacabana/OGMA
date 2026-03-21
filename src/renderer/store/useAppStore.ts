import { create } from 'zustand'
import { Project, Page, Workspace } from '../types'
import { createLogger } from '../utils/logger'

const log = createLogger('store')

interface AppState {
  // ── Dados ─────────────────────────────────────────────────────────────────
  workspace:       Workspace | null
  projects:        Project[]
  activeProjectId: number | null
  activeProject:   Project | null
  pages:           Page[]

  // ── UI ────────────────────────────────────────────────────────────────────
  dark:            boolean
  accentColor:     string
  loading:         boolean

  // ── Actions ───────────────────────────────────────────────────────────────
  setDark:         (dark: boolean) => void
  setAccentColor:  (color: string) => void
  setLoading:      (v: boolean) => void

  loadWorkspace:   () => Promise<void>
  loadProjects:    () => Promise<void>
  selectProject:   (id: number | null) => void
  loadPages:       (projectId: number) => Promise<void>

  createProject:   (input: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<Project | null>
  updateProject:   (data: Partial<Project> & { id: number }) => Promise<void>
  deleteProject:   (id: number) => Promise<void>
  updatePage:      (data: Partial<any> & { id: number }) => Promise<void>
}

const db = () => (window as any).db

export const useAppStore = create<AppState>((set, get) => ({
  workspace:       null,
  projects:        [],
  activeProjectId: null,
  activeProject:   null,
  pages:           [],
  dark:            false,
  accentColor:     '#b8860b',
  loading:         false,

  setDark: (dark) => set({ dark }),
  setAccentColor: (color) => set({ accentColor: color }),
  setLoading: (v) => set({ loading: v }),

  loadWorkspace: async () => {
    try {
      const res = await db().workspace.get()
      if (res?.ok && res.data) set({ workspace: res.data })
    } catch (e: any) {
      log.error('loadWorkspace', { error: e.message })
    }
  },

  loadProjects: async () => {
    try {
      const res = await db().projects.list()
      if (res?.ok) set({ projects: res.data ?? [] })
    } catch (e: any) {
      log.error('loadProjects', { error: e.message })
    }
  },

  selectProject: (id) => {
    const project = id ? get().projects.find(p => p.id === id) ?? null : null
    set({ activeProjectId: id, activeProject: project, pages: [] })
    if (id) get().loadPages(id)
  },

  loadPages: async (projectId) => {
    try {
      const res = await db().pages.list(projectId)
      if (res?.ok) set({ pages: res.data ?? [] })
    } catch (e: any) {
      log.error('loadPages', { error: e.message })
    }
  },

  createProject: async (input) => {
    try {
      const res = await db().projects.create(input)
      if (res?.ok && res.data) {
        set(s => ({ projects: [...s.projects, res.data] }))
        log.info('createProject', { id: res.data.id, name: res.data.name })
        return res.data
      }
      return null
    } catch (e: any) {
      log.error('createProject', { error: e.message })
      return null
    }
  },

  updateProject: async (data) => {
    try {
      const res = await db().projects.update(data)
      if (res?.ok && res.data) {
        set(s => ({
          projects: s.projects.map(p => p.id === data.id ? res.data : p),
          activeProject: s.activeProjectId === data.id ? res.data : s.activeProject,
        }))
      }
    } catch (e: any) {
      log.error('updateProject', { error: e.message })
    }
  },

  updatePage: async (data) => {
    try {
      const res = await db().pages.update(data)
      if (res?.ok && res.data) {
        set(s => ({ pages: s.pages.map(p => p.id === data.id ? res.data : p) }))
      }
    } catch (e: any) {
      log.error('updatePage', { error: e.message })
    }
  },

  deleteProject: async (id) => {
    try {
      await db().projects.delete(id)
      set(s => ({
        projects: s.projects.filter(p => p.id !== id),
        activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        activeProject:   s.activeProjectId === id ? null : s.activeProject,
      }))
    } catch (e: any) {
      log.error('deleteProject', { error: e.message })
    }
  },
}))
