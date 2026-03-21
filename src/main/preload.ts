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
  pages: {
    list:         (project_id: number) => api('pages:list',         { project_id }),
    get:          (id: number)         => api('pages:get',          { id }),
    create:       (d: any)             => api('pages:create',       d),
    update:       (d: any)             => api('pages:update',       d),
    delete:       (id: number)         => api('pages:delete',       { id }),
    reorder:      (items: any[])       => api('pages:reorder',      items),
    setPropValue: (d: any)             => api('pages:setPropValue', d),
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
