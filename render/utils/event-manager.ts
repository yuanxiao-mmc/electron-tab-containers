/**
 * 通知事件 KEY
 */
export const eventKey: string = 'GAODING_NATIVE_BRIDGE_EVENT_KEY'

type EventCallback = (data: any) => void

export class GNBEventManager {
  private static instance: GNBEventManager

  // eventName: keys
  private eventKeys: Map<string, Array<string>> = new Map()

  // key: callback
  private callbacks: Map<string, EventCallback> = new Map()

  static get shared(): GNBEventManager {
    if (!GNBEventManager.instance) {
      GNBEventManager.instance = new GNBEventManager()
    }
    return GNBEventManager.instance
  }

  /**
   * 在全局注册 GNBEventManager
   */
  register() {
    window.addEventListener(eventKey as any, (event: CustomEvent) => {
      const detail = event.detail
      const eventName = detail.eventName
      const data = detail.data
      const keys = this.eventKeys.get(eventName)
      if (keys) {
        keys.forEach((key) => {
          const callback = this.callbacks.get(key)
          callback && callback(data)
        })
      }
    })
  }

  /**
   * 监听事件
   */
  on(source: any, eventName: string, callback: EventCallback) {
    const key = this.getKey(eventName, source)
    let keys = this.eventKeys.get(eventName)
    if (!keys) {
      keys = []
      this.eventKeys.set(eventName, keys)
    }
    keys.push(key)
    this.callbacks.set(key, callback)
  }

  /**
   * 注销监听事件
   */
  off(source: any, eventName: string) {
    const key = this.getKey(eventName, source)
    const keys = this.eventKeys.get(eventName)
    if (keys) {
      const index = keys.indexOf(key)
      if (index !== -1) {
        keys.splice(index, 1)
      }
    }
    this.callbacks.delete(key)
  }

  private getKey(eventName: string, source: any) {
    return eventName + '&' + Symbol(source).description
  }
}
