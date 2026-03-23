import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { ensureDirs } from './paths'
import { getDb, closeDb } from './database'
import { registerIpcHandlers } from './ipc'
import { startReminderScheduler } from './scheduler'
import { createLogger, setupGlobalErrorHandlers } from './logger'
import { initSettings, getSetting } from './settings'
import { syncPull, syncPush } from './sync'

const log = createLogger('main')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let quitting = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#F5F0E8',
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// Compatibilidade no Linux
app.commandLine.appendSwitch('disable-gpu-vsync')

app.whenReady().then(async () => {
  setupGlobalErrorHandlers()
  ensureDirs()
  log.info('OGMA iniciando', { version: '0.1.0', platform: process.platform })

  log.info('Carregando settings')
  initSettings()

  // Pull do remote antes de abrir o banco
  const syncEnabled = getSetting('sync_enabled')
  const syncRemote  = getSetting('sync_remote')
  if (syncEnabled && syncRemote) {
    log.info('Sync pull antes de abrir banco', { remote: syncRemote })
    try {
      await syncPull(syncRemote)
    } catch (e) {
      log.error('Sync pull falhou (continuando com dados locais)', { error: String(e) })
    }
  }

  log.info('Inicializando banco de dados')
  getDb()

  log.info('Registrando handlers IPC')
  registerIpcHandlers()

  log.info('Iniciando scheduler de lembretes')
  startReminderScheduler()

  log.info('Criando janela principal')
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', (e) => {
  if (quitting) return
  log.info('OGMA encerrando')

  const syncEnabled = getSetting('sync_enabled')
  const syncRemote  = getSetting('sync_remote')

  if (syncEnabled && syncRemote) {
    e.preventDefault()
    quitting = true
    log.info('Sync push antes de encerrar', { remote: syncRemote })
    syncPush(syncRemote)
      .catch(err => log.error('Sync push falhou', { error: String(err) }))
      .finally(() => {
        closeDb()
        app.quit()
      })
  } else {
    closeDb()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
