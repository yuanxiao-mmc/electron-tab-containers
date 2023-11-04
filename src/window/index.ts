import { BrowserWindow } from 'electron'
import { getPreloadPath, getSendEventJS, handleOpenWindow } from '../helpers/web'
import { GNBEventBus } from '../helpers/event-bus'
import { eventKey } from '../const'

export let mainWindow: BrowserWindow

export function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: getPreloadPath(),
    },
  })

  win.loadURL('http://localhost:9080')

  win.webContents.openDevTools({
    mode: 'detach',
  })

  const handler = (data: any) => {
    win.webContents?.executeJavaScript(getSendEventJS(eventKey, data))
  }
  GNBEventBus.shared.subscribe(handler)

  handleOpenWindow(win.webContents)

  mainWindow = win
}
