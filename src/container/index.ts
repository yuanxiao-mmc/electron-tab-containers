import { GDWebContainer, GDWebContainerOptions } from './container'
import { BrowserViewConstructorOptions } from 'electron'
import { getSendEventJS, getPreloadPath, kContainerIdsKey } from '../helpers/web'
import { GNBEventBus } from '../helpers/event-bus'
import { eventKey } from '../const'

/**
 * 最大预加载容器数量
 */
const MAX_PRELOAD_CONTAINER_COUNT = 1

/**
 * 容器管理器
 */
class GDContainerManager {
  private static instance: GDContainerManager

  static get shared(): GDContainerManager {
    if (!GDContainerManager.instance) {
      GDContainerManager.instance = new GDContainerManager()
    }
    return GDContainerManager.instance
  }

  /**
   * 预加载缓存的 Containers
   */
  private readonly preloads: GDWebContainer[]
  /**
   * 已存在的 containers <id, GDWebContainer>
   */
  private readonly containers: Map<number, GDWebContainer>
  /**
   * 全局选项
   */
  private globalOptions?: BrowserViewConstructorOptions

  constructor() {
    this.configGlobalOptions()
    this.preloads = []
    this.containers = new Map()
    this.preloadContainer()
    this.listenGNBEvents()
  }

  // ================ Public Methods ================= //
  /**
   * 创建一个 Container
   */
  public createContainer(url: string, options?: GDWebContainerOptions): GDWebContainer {
    const webContainer = this.preloads.pop()
    if (!webContainer) {
      throw new Error('Container 创建失败')
    }
    options && webContainer.setOptions(options)
    webContainer.context.setAutoResize({
      width: true,
      height: true,
      horizontal: true,
    })
    webContainer.loadURL(url)
    this.containers.set(webContainer.id, webContainer)
    this.preloadContainer()
    return webContainer
  }

  /**
   * 通过 ID 获取容器
   * @param id 容器 ID
   */
  public getContainer(id: number): GDWebContainer | undefined {
    return this.containers.get(id)
  }

  /**
   * 移除 Container
   * @param url
   */
  public removeContainer(id: number): void {
    this.containers.get(id)?.context.webContents.close()
    this.containers.delete(id)
  }

  /**
   * 移除所有 Container
   */
  public removeAllContainers() {
    this.containers.clear()
  }

  /**
   * 发送事件通知容器
   */
  public listenGNBEvents() {
    GNBEventBus.shared.subscribe((data: any) => {
      for (const [id, container] of this.containers) {
        const dataInfo = data?.data || {}
        const containerIds = dataInfo[kContainerIdsKey]
        if (!containerIds || containerIds?.includes(id)) {
          // 如果是定向传输，过滤不在容器列表里的
          container?.executeJavaScript(getSendEventJS(eventKey, data))
        }
      }
    })
  }

  // ================ Private Methods ================= //
  /**
   * 预加载 Container
   */
  private preloadContainer() {
    const count = MAX_PRELOAD_CONTAINER_COUNT - this.preloads.length
    for (let i = 0; i < count; i++) {
      const view = new GDWebContainer(this.globalOptions)
      this.preloads.push(view)
    }
    console.log(
      `预加载 Container：${count}个，当前空闲 Container 数量：${this.preloads.length}，当前已占用 Container 数量：${this.containers.size}`
    )
  }

  /**
   * 配置全局选项
   */
  private configGlobalOptions() {
    this.globalOptions = {
      webPreferences: {
        preload: getPreloadPath(),
        nodeIntegrationInSubFrames: true,
      },
    }
  }
}

export default GDContainerManager
