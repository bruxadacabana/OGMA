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
