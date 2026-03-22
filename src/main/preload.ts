import { contextBridge, ipcRenderer } from 'electron'

const api = (channel: string, data?: any) => ipcRenderer.invoke(channel, data)

contextBridge.exposeInMainWorld('db', {
  workspace: {
    get:    ()       => api('workspace:get'),
    update: (d: any) => api('workspace:update', d),
  },
  projects: {
    list:          ()            => api('projects:list'),
    create:        (d: any)      => api('projects:create', d),
    update:        (d: any)      => api('projects:update', d),
    delete:        (id: number)  => api('projects:delete', { id }),
    getProperties: (id: number)  => api('projects:getProperties', { id }),
    getViews:      (id: number)  => api('projects:getViews', { id }),
  },
  dashboard: {
    stats: () => api('dashboard:stats'),
  },
  calendar: {
    pagesForMonth: (year: number, month: number) => api('calendar:pagesForMonth', { year, month }),
  },
  pages: {
    list:         (project_id: number) => api('pages:list',         { project_id }),
    get:          (id: number)         => api('pages:get',          { id }),
    create:       (d: any)             => api('pages:create',       d),
    update:       (d: any)             => api('pages:update',       d),
    delete:       (id: number)         => api('pages:delete',       { id }),
    reorder:      (items: any[])       => api('pages:reorder',      items),
    setPropValue: (d: any)             => api('pages:setPropValue', d),
    search:      (query: string, limit?: number) => api('pages:search',      { query, limit: limit ?? 20 }),
    reindexAll:  ()                              => api('pages:reindexAll',  {}),
    listRecent:  (limit?: number)                => api('pages:listRecent',  { limit: limit ?? 8 }),
    listUpcoming:(days?: number)                 => api('pages:listUpcoming',{ days:  days  ?? 14 }),
  },
  properties: {
    create:         (d: any)                                    => api('properties:create',         d),
    update:         (d: any)                                    => api('properties:update',         d),
    delete:         (id: number)                                => api('properties:delete',         { id }),
    reorder:        (items: any[])                              => api('properties:reorder',        items),
    getOptions:     (id: number)                                => api('properties:getOptions',     { id }),
    createOption:   (d: any)                                    => api('properties:createOption',   d),
    updateOption:   (d: any)                                    => api('properties:updateOption',   d),
    deleteOption:   (id: number)                                => api('properties:deleteOption',   { id }),
    reorderOptions: (items: any[])                              => api('properties:reorderOptions', items),
  },
  views: {
    create:     (d: any)       => api('views:create',     d),
    update:     (d: any)       => api('views:update',     d),
    delete:     (id: number)   => api('views:delete',     { id }),
    setDefault: (id: number)   => api('views:setDefault', { id }),
  },
  tags: {
    list:        ()                                   => api('tags:list',        {}),
    create:      (name: string, color?: string)        => api('tags:create',      { name, color }),
    delete:      (id: number)                          => api('tags:delete',      { id }),
    listForPage: (page_id: number)                     => api('tags:listForPage', { page_id }),
    assign:      (page_id: number, tag_id: number)     => api('tags:assign',      { page_id, tag_id }),
    remove:      (page_id: number, tag_id: number)     => api('tags:remove',      { page_id, tag_id }),
  },
  readings: {
    list:   ()       => api('readings:list',   {}),
    create: (d: any) => api('readings:create', d),
    update: (d: any) => api('readings:update', d),
    delete: (id: number) => api('readings:delete', { id }),
  },
  resources: {
    list:   ()       => api('resources:list',   {}),
    create: (d: any) => api('resources:create', d),
    update: (d: any) => api('resources:update', d),
    delete: (id: number) => api('resources:delete', { id }),
  },
  config: {
    get:    (key: string)                => api('config:get',    { key }),
    set:    (key: string, value: string) => api('config:set',    { key, value }),
    getAll: ()                           => api('config:getAll'),
  },
  log: {
    renderer: (entry: any) => api('log:renderer', entry),
  },
  uploads: {
    saveImage: (d: any) => api('uploads:saveImage', d),
  },
})
