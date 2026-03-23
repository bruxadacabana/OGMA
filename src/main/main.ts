import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { ensureDirs } from './paths'
import { getDb } from './database'
import { registerIpcHandlers } from './ipc'
import { startReminderScheduler } from './scheduler'
import { createLogger, setupGlobalErrorHandlers } from './logger'

const log = createLogger('main')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

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

// Compatibilidade GPU no Linux (eglCreateImage / EGL_BAD_MATCH)
// Estes flags são necessários em algumas combinações de driver/compositor
app.commandLine.appendSwitch('disable-gpu-vsync')
app.commandLine.appendSwitch('disable-gpu-memory-buffer-compositor-resources')
app.commandLine.appendSwitch('disable-gpu-memory-buffer-video-frames')
app.commandLine.appendSwitch('enable-zero-copy', 'false')
// Fallback para SwiftShader (software GL) se a GPU falhar
app.commandLine.appendSwitch('use-angle', 'swiftshader-webgl')

app.whenReady().then(() => {
  setupGlobalErrorHandlers()
  ensureDirs()
  log.info('OGMA iniciando', { version: '0.1.0', platform: process.platform })

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

app.on('before-quit', () => {
  log.info('OGMA encerrando')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
