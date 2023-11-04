import { WebContents } from 'electron'
import path from 'path'
import { GDTabPageContainer } from '../pages'

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
