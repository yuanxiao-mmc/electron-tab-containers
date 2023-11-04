type EventHandler = (...args: any[]) => void

/**
 * GNB 事件总线
 */
export class GNBEventBus {
  private static instance: GNBEventBus

  static get shared(): GNBEventBus {
    if (!GNBEventBus.instance) {
      GNBEventBus.instance = new GNBEventBus()
    }
    return GNBEventBus.instance
  }

  handlers: EventHandler[] = []

  subscribe(handler: EventHandler) {
    this.handlers.push(handler)
  }

  unsubscribe(handler: EventHandler) {
    const index = this.handlers.indexOf(handler)
    if (index !== -1) {
      this.handlers.splice(index, 1)
    }
  }

  emit(...args: any[]) {
    this.handlers.forEach((handler) => {
      handler.apply(null, args)
    })
  }
}
