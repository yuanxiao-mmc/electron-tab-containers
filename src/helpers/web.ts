import { WebContents } from 'electron'
import path from 'path'
import { GDTabPageContainer } from '../pages'
import { app } from 'electron/main'

/**
 * 容器 ID 集合字段
 */
export const kContainerIdsKey = 'kDesktopContainerIdsKey'

/**
 * 发送事件 JS
 * @param eventName 事件名
 * @param eventData 事件内容
 */
export const getSendEventJS = (eventName: string, eventData: any) => {
  const eventDataStr = JSON.stringify(eventData)
  return `window.dispatchEvent(new CustomEvent('${eventName}', { detail: ${eventDataStr} }))`
}

/**
 * 获取 preload 路径
 */
export function getPreloadPath(): string {
  return path.join(__dirname, 'preload.js')
}

/**
 * 拦截打开 window 事件
 * @param webContents
 */
export function handleOpenWindow(webContents: WebContents): void {
  webContents.setWindowOpenHandler(({ url }) => {
    GDTabPageContainer.shared.switchTab(url)
    return {
      action: 'deny',
    }
  })
}

/**
 * 如果需要，开启开发工具
 * 界面操作：连击左边 control 3 次
 */
export function startDevToolsIfNeed(webContents: WebContents) {
  if (!app.isPackaged) {
    let clicks = 0
    let previousClickTime = 0
    webContents.addListener('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.code === 'ControlLeft') {
        const now = +new Date()
        if (now - previousClickTime < 300) {
          clicks++
        } else {
          clicks = 1
        }
        previousClickTime = now

        if (clicks >= 3) {
          webContents.openDevTools({
            mode: 'detach',
            activate: true,
          })
          webContents.devToolsWebContents?.focus()
          clicks = 0
        }
      }
    })
  }
}
