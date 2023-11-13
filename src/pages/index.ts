import { EventEmitter } from 'events'
import { GNBEventBus } from '../helpers/event-bus'
import GDContainerManager from '../container'
import { BrowserView, BrowserWindow } from 'electron'
import { GDWebContainer } from '../container/container'
import { mainWindow } from '../window'

/**
 * Tab 栏高度
 */
const subPageTabHeight = 40

const FRAME_READY = 'FRAME_READY'

/**
 * 页面容器管理
 */
export class GDTabPageContainer {
  private static instance: GDTabPageContainer

  static get shared(): GDTabPageContainer {
    if (!GDTabPageContainer.instance) {
      GDTabPageContainer.instance = new GDTabPageContainer()
    }
    return GDTabPageContainer.instance
  }

  /**
   * 存储的 tabs <url, id>
   */
  private tabs: Map<string, number>
  /**
   * 记录当前的 URL 集合
   */
  private urls: string[]
  /**
   * 是否初始化完成
   */
  private initialized = false
  /**
   * 回调事件
   */
  private emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
    this.tabs = new Map<string, number>()
    this.urls = []
  }

  // ================ Public Methods ================= //
  /**
   * 切换 Tab 页
   * @param url URL
   */
  public async switchTab(url: string): Promise<GDWebContainer> {
    await this.initFrameIfNeed()
    let id = this.tabs.get(url)
    if (!id) {
      id = this.createTab(url).id
      this.urls.push(url)
    }
    return this.switchTabWithId(id)
  }

  /**
   * 切换 Tab 页
   * @param id 容器 ID
   */
  public async switchTabWithId(id: number, notify = true): Promise<GDWebContainer> {
    console.log(`触发 Tab 切换 id: ${id}`)
    if (notify) {
      GNBEventBus.shared.emit({
        eventName: 'desktop.onSwitchTab',
        data: { id: id },
      })
    }
    const container = GDContainerManager.shared.getContainer(id)!
    this.attachContainerIfNeed(container)
    this.window.setTopBrowserView(container.context)
    this.removeAllWithoutTab(id)
    this.window.show()
    this.window.focus()
    container.context.webContents.focus()
    return container
  }

  /**
   * 创建 Tab 页
   * @param url URL
   */
  public createTab(url: string) {
    const container = GDContainerManager.shared.createContainer(url, {
      useHTMLTitleAndIcon: true,
      useLoadingView: true,
      useErrorView: true,
    })
    this.window.addBrowserView(container.context)
    this.setContainerBounds(container)
    this.tabs.set(url, container.id)
    GNBEventBus.shared.emit({
      eventName: 'desktop.onCreateTab',
      data: { id: container.id },
    })
    return container
  }

  /**
   * 关闭标签页
   * @param id ID
   */
  public closeTab(id: number, { needNotifyView = false } = {}): void {
    const container = GDContainerManager.shared.getContainer(id)
    if (container) {
      this.window.removeBrowserView(container.context)
      container.context.webContents.close()
    }
    if (needNotifyView) {
      GNBEventBus.shared.emit({
        eventName: 'desktop.onCloseTab',
        data: { id: id },
      })
    }
    GDContainerManager.shared.removeContainer(id)
    const url = this.getURLById(id)
    if (url) {
      this.deleteURL(url)
      this.tabs.delete(url)
    }
  }

  /**
   * 通过 URL 关闭标签页
   * @param url URL
   */
  public closeTabByURL(url: string): void {
    const id = this.tabs.get(url)
    if (id) {
      this.closeTab(id, {
        needNotifyView: true,
      })
    }
  }

  /**
   * 关闭当前标签
   */
  public closeCurrentTab() {
    const id = this.currentTab?.webContents.id
    if (id) {
      this.closeTab(id, {
        needNotifyView: true,
      })
    }
  }

  /**
   * 关闭所有标签页
   */
  public closeAllTabs(): void {
    for (const [_key, id] of this.tabs) {
      this.closeTab(id)
    }
    this.tabs.clear()
    const views = this.window.getBrowserViews() || []
    console.log(views.length)
    for (const view of views) {
      view.webContents.close()
    }
  }

  /**
   * 刷新当前 Tab
   */
  public reloadCurrentTab() {
    const container = this.getCurrentTabContainer()
    container?.reload()
  }

  /**
   * 当前 Tab
   */
  public get currentTab(): BrowserView | undefined {
    const views = this.window.getBrowserViews()
    return views.length ? views[views.length - 1] : undefined
  }

  /**
   * 聚焦
   */
  public focus() {
    this.window.focus()
  }

  /**
   * 设置框架准备完毕
   */
  public setFrameReady() {
    this.emitter.emit(FRAME_READY)
  }

  // ================ Private Methods ================= //
  private get window(): BrowserWindow {
    return mainWindow
  }

  private async initFrameIfNeed(): Promise<void> {
    if (this.initialized) {
      return
    }
    this.initialized = true

    return new Promise((resolve) => {
      this.emitter.once(FRAME_READY, () => {
        resolve()
      })
    })
  }

  private attachContainerIfNeed(container: GDWebContainer) {
    const exists = this.window.getBrowserViews() || []
    for (const view of exists) {
      if (view === container.context) {
        return
      }
    }
    this.window.addBrowserView(container.context)
    this.setContainerBounds(container)
  }

  /**
   * 通过容器 ID 获取 URL
   */
  private getURLById(id: number): string | undefined {
    for (const [key, value] of this.tabs.entries()) {
      if (value === id) {
        return key
      }
    }
    return undefined
  }

  /**
   * 在 window 上移除其他 BrowserView
   */
  private removeAllWithoutTab(containerId: number) {
    this.tabs.forEach((id) => {
      if (id !== containerId) {
        const container = GDContainerManager.shared.getContainer(id)!
        this.window.removeBrowserView(container.context)
      }
    })
  }

  /**
   * 移除 URL
   */
  private deleteURL(element: string) {
    const index = this.urls.findIndex((ele) => ele == element)
    this.urls.splice(index, 1)
  }

  /**
   * 获取当前 Tab 容器
   */
  private getCurrentTabContainer() {
    const id = this.currentTab?.webContents.id
    if (id) {
      const container = GDContainerManager.shared.getContainer(id)
      return container
    }
    return undefined
  }

  private setContainerBounds(container: GDWebContainer) {
    container.context.setBounds({
      x: 0,
      y: subPageTabHeight,
      width: this.window.getBounds().width || 1024,
      height: (this.window.getBounds().height || 768) - subPageTabHeight,
    })
  }
}
