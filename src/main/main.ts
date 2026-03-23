import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { ensureDirs } from './paths'
import { getClient, closeClient, syncClient } from './database'
import { registerIpcHandlers } from './ipc'
import { startReminderScheduler } from './scheduler'
import { createLogger, setupGlobalErrorHandlers } from './logger'
import { initSettings } from './settings'

const log = createLogger('main')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

const ICON_PATH = app.isPackaged
  ? path.join(path.dirname(app.getPath('exe')), 'assets', 'ogma.ico')
  : path.resolve(__dirname, '..', '..', 'assets', 'ogma.ico')

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    icon: ICON_PATH,
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

  // Carregar variáveis de ambiente (credenciais Turso)
  try {
    const dotenv = await import('dotenv')
    const path   = await import('path')
    const { DATA_DIR } = await import('./paths')
    dotenv.config({ path: path.join(DATA_DIR, '.env') })
  } catch { /* dotenv opcional */ }

  log.info('Carregando settings')
  initSettings()

  log.info('Inicializando banco de dados')
  await getClient()

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

app.on('before-quit', async () => {
  log.info('OGMA encerrando')
  await syncClient().catch(() => {})
  closeClient()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
