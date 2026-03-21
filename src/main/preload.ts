import { contextBridge, ipcRenderer } from 'electron'

const api = (channel: string, data?: any) => ipcRenderer.invoke(channel, data)

contextBridge.exposeInMainWorld('db', {
  workspace: {
    get: ()         => api('workspace:get'),
    update: (d: any) => api('workspace:update', d),
  },
  projects: {
    list:   ()       => api('projects:list'),
    create: (d: any) => api('projects:create', d),
    update: (d: any) => api('projects:update', d),
    delete: (id: number) => api('projects:delete', { id }),
  },
  pages: {
    list:   (project_id: number) => api('pages:list', { project_id }),
    create: (d: any)  => api('pages:create', d),
    update: (d: any)  => api('pages:update', d),
    delete: (id: number) => api('pages:delete', { id }),
  },
  kanban: {
    getBoard:        (page_id: number)                          => api('kanban:getBoard',        { page_id }),
    createColumn:    (d: any)                                   => api('kanban:createColumn',    d),
    updateColumn:    (d: any)                                   => api('kanban:updateColumn',    d),
    deleteColumn:    (id: number)                               => api('kanban:deleteColumn',    { id }),
    createCard:      (d: any)                                   => api('kanban:createCard',      d),
    updateCard:      (d: any)                                   => api('kanban:updateCard',      d),
    moveCard:        (d: any)                                   => api('kanban:moveCard',        d),
    deleteCard:      (id: number)                               => api('kanban:deleteCard',      { id }),
    createChecklist: (d: any)                                   => api('kanban:createChecklist', d),
    updateChecklist: (d: any)                                   => api('kanban:updateChecklist', d),
    deleteChecklist: (id: number)                               => api('kanban:deleteChecklist', { id }),
    setCardTags:     (card_id: number, tag_names: string[])     => api('kanban:setCardTags',     { card_id, tag_names }),
  },
  config: {
    get:    (key: string)               => api('config:get', { key }),
    set:    (key: string, value: string) => api('config:set', { key, value }),
    getAll: ()                          => api('config:getAll'),
  },
  log: {
    renderer: (entry: any) => api('log:renderer', entry),
  },
  uploads: {
    saveImage: (d: any) => api('uploads:saveImage', d),
  },
})
