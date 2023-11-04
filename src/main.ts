import { app, BrowserWindow } from 'electron'
import { createWindow } from './window'
import { DesktopService } from './service'
import { GDTabPageContainer } from './pages'

app.whenReady().then(() => {
  DesktopService.shared.init()

  createWindow()

  GDTabPageContainer.shared.switchTab('https://www.gaoding.com')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
