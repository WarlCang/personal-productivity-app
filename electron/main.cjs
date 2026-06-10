const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'TORRAS Productivity',
    backgroundColor: '#0a0a0b',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  win.removeMenu?.()
  win.loadFile(path.join(__dirname, '../dist/index.html'))
  // External links open in the system browser, not in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
