import { BrowserView, BrowserViewConstructorOptions } from 'electron'
import { GNBEventBus } from '../helpers/event-bus'
import { handleOpenWindow, startDevToolsIfNeed } from '../helpers/web'

/**
 * Web 容器选项
 */
export interface GDWebContainerOptions extends BrowserViewConstructorOptions {
  /**
   * 是否使用加载视图
   */
  useLoadingView?: boolean
  /**
   * 是否使用错误视图
   */
  useErrorView?: boolean
  /**
   * 是否需要使用网页标题和图标
   */
  useHTMLTitleAndIcon?: boolean
}

/**
 * Web 容器
 */
export class GDWebContainer {
  /**
   * 唯一 ID
   */
  public readonly id: number
  /**
   * 封装的视图
   */
  public readonly context: BrowserView
  /**
   * 禁用关闭能力
   */
  public disableClose = false
  /**
   * 配置项
   */
  private options: GDWebContainerOptions
  /**
   * 加载地址
   */
  private url?: string
  /**
   * 是否已初始化
   */
  private initialized = false

  constructor(options: GDWebContainerOptions = {}) {
    const defaultOptions: GDWebContainerOptions = {
      useLoadingView: false,
      useErrorView: false,
      useHTMLTitleAndIcon: false,
    }
    this.options = {
      ...defaultOptions,
      ...options,
    }
    this.context = new BrowserView(this.options)
    this.context.setBackgroundColor('rgba(255, 255, 255, 0)')
    this.id = this.context.webContents.id
  }

  /**
   * 加载链接
   * @param url 链接
   */
  public async loadURL(url: string): Promise<void> {
    this.url = url
    if (!this.initialized) {
      this.setup()
      this.initialized = true
    }
    this.context.webContents.loadURL(this.url)
  }

  /**
   * 重新加载
   */
  public reload() {
    if (this.url) {
      this.context.webContents.loadURL(this.url)
    } else {
      this.context.webContents.reload()
    }
  }

  /**
   * 设置选项
   * @param options 选项
   */
  public async setOptions(options: GDWebContainerOptions) {
    this.options = {
      ...this.options,
      ...options,
    }
  }

  /**
   * 执行 JS 方法
   */
  public executeJavaScript(script: string) {
    if (this.context?.webContents?.isDestroyed()) {
      return
    }
    return this.context?.webContents?.executeJavaScript(script).catch((error) => {
      console.error(error)
    })
  }

  /**
   * 获取当前 URL
   */
  public getURL() {
    return this.url
  }

  // ================ Setter Getter ================= //
  private _title = ''

  /**
   * 标题
   */
  public get title() {
    return this._title
  }

  public set title(value: string) {
    this._title = value
    this.options.useHTMLTitleAndIcon &&
      GNBEventBus.shared.emit({
        eventName: 'desktop.onTabTitle',
        data: { id: this.id, title: this.title },
      })
  }

  // ================ Private Methods ================= //
  private setup() {
    // 配置页面信息
    this.configDocumentInfo()

    this.context.webContents.on('render-process-gone', (_event, details) => {
      console.error(details)
    })

    handleOpenWindow(this.context.webContents)

    startDevToolsIfNeed(this.context.webContents)
  }

  private configDocumentInfo() {
    this.context.webContents.on('dom-ready', async () => {
      const title = this.context.webContents.getTitle()
      if (!this.title && title) {
        this.title = title
      }
    })
  }
}
