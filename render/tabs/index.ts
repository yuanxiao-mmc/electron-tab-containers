// @ts-ignore
import styles from './style.css?inline'

if (!document) {
  throw Error('electron-tabs module must be called in renderer process')
}

interface TabGroupOptions {
  closeButtonText: string
  defaultTab: TabOptions | ((tabGroup: TabGroup) => TabOptions)
  newTabButton: boolean
  newTabButtonText: string
  visibilityThreshold: number
}

interface TabOptions {
  active?: boolean
  badge?: Badge
  closable?: boolean
  icon?: string
  iconURL?: string
  ready?: (tab: Tab) => void
  containerId?: number
  title?: string
  visible?: boolean
  webviewAttributes?: { [key: string]: any }
}

interface Badge {
  text: string
  className: string
}

const CLASSNAMES = {
  ROOT: 'etabs',
  NAV: 'nav',
  TABS: 'tabs',
  TAB: 'tab',
  BUTTONS: 'buttons',
  VIEWS: 'views',
  VIEW: 'view',
}

function emit(emitter: TabGroup | Tab, type: string, args: any[]) {
  if (type === 'ready') {
    emitter.isReady = true
  }
  emitter.dispatchEvent(new CustomEvent(type, { detail: args }))
}

function on(emitter: TabGroup | Tab, type: string, fn: (detail: string) => void, options?: { [key: string]: any }) {
  if (type === 'ready' && emitter.isReady === true) {
    fn.apply(emitter, [emitter as any])
  }
  emitter.addEventListener(type, ((e: CustomEvent) => fn.apply(emitter, e.detail)) as EventListener, options)
}

class TabGroup extends HTMLElement {
  buttonContainer?: HTMLDivElement
  isReady: boolean
  newTabId: number
  options: TabGroupOptions
  shadow?: ShadowRoot
  tabContainer?: HTMLDivElement
  tabs: Array<Tab>

  private _tabGroupMargin: number = 0
  private _tabGroupWidth: number = 0

  constructor() {
    super()

    this.isReady = false
    // Options
    this.options = {
      closeButtonText: this.getAttribute('close-button-text') || '&#215;',
      defaultTab: { title: 'New Tab', active: true },
      newTabButton: !!this.getAttribute('new-tab-button') === true || false,
      newTabButtonText: this.getAttribute('new-tab-button-text') || '&#65291;',
      visibilityThreshold: Number(this.getAttribute('visibility-threshold')) || 0,
    }

    this.tabs = []
    this.newTabId = 0

    this.createComponent()
    this.initVisibility()
    this.emit('ready', this)
  }

  emit(type: string, ...args: any[]) {
    return emit(this, type, args)
  }

  on(type: string, fn: (...detail: any[]) => void) {
    return on(this, type, fn)
  }

  once(type: string, fn: (detail: string) => void) {
    return on(this, type, fn, { once: true })
  }

  connectedCallback() {
    // Support custom styles
    const style = this.querySelector('style')
    if (style) {
      this.shadow?.appendChild(style)
    }
  }

  private createComponent() {
    const shadow = this.attachShadow({ mode: 'open' })
    this.shadow = shadow

    const wrapper = document.createElement('div')
    wrapper.setAttribute('class', CLASSNAMES.ROOT)

    const tabGroup = document.createElement('nav')
    tabGroup.setAttribute('class', CLASSNAMES.NAV)
    wrapper.appendChild(tabGroup)

    const tabContainer = document.createElement('div')
    tabContainer.setAttribute('class', CLASSNAMES.TABS)
    tabGroup.appendChild(tabContainer)
    this.tabContainer = tabContainer

    const buttonContainer = document.createElement('div')
    buttonContainer.setAttribute('class', CLASSNAMES.BUTTONS)
    tabGroup.appendChild(buttonContainer)
    this.buttonContainer = buttonContainer

    if (this.options.newTabButton) {
      const button = this.buttonContainer.appendChild(document.createElement('button'))
      button.innerHTML = this.options.newTabButtonText
      button.addEventListener('click', this.addTab.bind(this, undefined), false)
    }

    const style = document.createElement('style')
    style.textContent = styles

    shadow.appendChild(style)
    shadow.appendChild(wrapper)
  }

  private initVisibility() {
    function toggleTabsVisibility(_tab?: Tab, tabGroup?: TabGroup) {
      const visibilityThreshold = tabGroup!.options.visibilityThreshold
      const el = tabGroup?.tabContainer?.parentElement
      if (tabGroup!.tabs.length >= visibilityThreshold) {
        el?.classList.add('visible')
      } else {
        el?.classList.remove('visible')
      }
    }
    this.on('tab-added', toggleTabsVisibility)
    this.on('tab-removed', toggleTabsVisibility)
    toggleTabsVisibility(undefined, this)
  }

  private updateTabGroupWidth() {
    const bodyWidth: number = document.body.getBoundingClientRect().width
    this._tabGroupWidth = bodyWidth - this._tabGroupMargin > 0 ? bodyWidth - this._tabGroupMargin : 0
  }

  // tab information configuration
  private updateTabWidth() {
    const numTabs = this.tabs.length
    // 计算总宽度
    const totalWidth = numTabs * 180 + 8 * (numTabs - 1) // 总宽度
    // 判断是否需要自适应宽度
    const isAutoWidth = totalWidth > this._tabGroupWidth
    let tabWidth = isAutoWidth ? (this._tabGroupWidth - 8 * (numTabs + 1)) / numTabs : 180
    let showScrollButtons = false
    if (tabWidth < 94) {
      tabWidth = 94
      showScrollButtons = true
    }
    // this.tabs.forEach((tab) => {
    //   if (tab.element) {
    //     tab.element.style.width = `${tabWidth}px`
    //   }
    // })
    // 滚到最后
    this.scrollTo({ left: totalWidth, behavior: 'smooth' })
    // 标签切换按钮
    this.emit('scroll-button-hidden:update', !showScrollButtons)
  }

  set tabGroupMargin(value: number) {
    this._tabGroupMargin = value
    this.updateTabGroupWidth()
  }

  setDefaultTab(tab: TabOptions) {
    this.options.defaultTab = tab
  }

  addTab(args = this.options.defaultTab) {
    if (typeof args === 'function') {
      args = args(this)
    }
    const id = this.newTabId
    this.newTabId++
    const tab = new Tab(this, id, args)
    this.tabs.push(tab)
    // Don't call tab.activate() before a tab is referenced in this.tabs
    if (args.active === true) {
      tab.activate()
    }
    this.emit('tab-added', tab, this)
    this.updateTabWidth()
    return tab
  }

  getTab(id: number) {
    for (const i in this.tabs) {
      if (this.tabs[i].id === id) {
        return this.tabs[i]
      }
    }
    return null
  }

  getTabByPosition(position: number) {
    const fromRight = position < 0
    for (const i in this.tabs) {
      if (this.tabs[i].getPosition(fromRight) === position) {
        return this.tabs[i]
      }
    }
    return null
  }

  getTabByRelPosition(position: number) {
    position = this.getActiveTab()!.getPosition() + position
    if (position <= 0) {
      return null
    }
    return this.getTabByPosition(position)
  }

  getNextTab() {
    return this.getTabByRelPosition(1)
  }

  getPreviousTab() {
    return this.getTabByRelPosition(-1)
  }

  getTabs() {
    return this.tabs.slice()
  }

  eachTab(fn: (tab: Tab) => void) {
    this.getTabs().forEach(fn)
  }

  getActiveTab() {
    if (this.tabs.length === 0) return null
    return this.tabs[0]
  }

  setActiveTab(tab: Tab) {
    this.removeTab(tab, { updateLayout: false })
    this.tabs.unshift(tab)
    this.emit('tab-active', tab, this)
  }

  removeTab(tab: Tab, options?: { triggerEvent?: boolean; updateLayout?: boolean }) {
    const { triggerEvent = false, updateLayout = true } = options || {}
    const id = tab.id
    const index = this.tabs.findIndex((t: Tab) => t.id === id)
    this.tabs.splice(index, 1)
    if (triggerEvent) {
      this.emit('tab-removed', tab, this)
    }
    if (updateLayout) {
      this.updateTabWidth()
    }
  }

  activateRecentTab() {
    if (this.tabs.length > 0) {
      this.tabs[0].activate()
    }
  }

  refreshTabsLayout() {
    this.updateTabGroupWidth()
    this.updateTabWidth()
  }
}
class Tab extends EventTarget {
  badge?: Badge
  closable: boolean
  element?: HTMLDivElement
  icon?: string
  iconURL?: string
  id: number
  isClosed: boolean
  isReady: boolean
  spans: { [key: string]: HTMLSpanElement }
  tabGroup: TabGroup
  title?: string
  containerId?: number

  constructor(tabGroup: TabGroup, id: number, args: TabOptions) {
    super()
    this.badge = args.badge
    this.closable = args.closable === false ? false : true
    this.icon = args.icon
    this.iconURL = args.iconURL
    this.id = id
    this.isClosed = false
    this.isReady = false
    this.spans = {}
    this.tabGroup = tabGroup
    this.title = args.title
    this.containerId = args.containerId

    this.initTab()

    if (args.visible !== false) {
      this.show()
    }
    if (typeof args.ready === 'function') {
      args.ready(this)
    } else {
      this.emit('ready', this)
    }
  }

  emit(type: string, ...args: any[]) {
    return emit(this, type, args)
  }

  on(type: string, fn: (...detail: any[]) => void) {
    return on(this, type, fn)
  }

  once(type: string, fn: (detail: string) => void) {
    return on(this, type, fn, { once: true })
  }

  private initTab() {
    const tab = (this.element = document.createElement('div'))
    tab.classList.add(CLASSNAMES.TAB)
    for (const el of ['icon', 'title', 'badge', 'close']) {
      const span = tab.appendChild(document.createElement('span'))
      span.classList.add(`${CLASSNAMES.TAB}-${el}`)
      if (el === 'icon') {
        span.classList.add('loading')
        const loading = span.appendChild(document.createElement('span'))
        loading.classList.add('tab-icon-loading')
      }
      this.spans[el] = span
    }
    this.setTitle(this.title || '')
    this.setBadge(this.badge)
    this.setIcon(this.iconURL || '', this.icon || '')
    this.initTabCloseButton()
    this.initTabClickHandler()
    this.tabGroup?.tabContainer?.appendChild(this.element)
  }

  private initTabCloseButton() {
    const container = this.spans.close
    if (this.closable) {
      const button = container.appendChild(document.createElement('button'))
      button.innerHTML = this.tabGroup.options.closeButtonText
      button.addEventListener('click', this.close.bind(this, false, false), false)
    }
  }

  private initTabClickHandler() {
    // Mouse up
    const tabClickHandler = (_: any) => {
      if (this.isClosed) return
    }
    this.element?.addEventListener('mouseup', tabClickHandler.bind(this), false)
    // Mouse down
    const tabMouseDownHandler = (e: any) => {
      if (this.isClosed) return
      if (e.which === 1) {
        if ((e.target as HTMLElement).matches('button')) return
        this.activate()
      }
    }
    this.element?.addEventListener('mousedown', tabMouseDownHandler.bind(this), false)
  }

  setTitle(title: string) {
    if (this.isClosed) return
    const span = this.spans.title
    span.innerHTML = title
    span.title = title
    this.title = title
    this.emit('title-changed', title, this)
    if (title && title.length > 0) {
      setTimeout(() => {
        this.loadingCompleted()
      }, 1000)
    }
    return this
  }

  getTitle() {
    if (this.isClosed) return
    return this.title
  }

  setBadge(badge?: Badge) {
    if (this.isClosed) return
    const span = this.spans.badge
    this.badge = badge

    if (badge) {
      span.innerHTML = badge.text
      span.classList.add(badge.className)
      span.classList.remove('hidden')
    } else {
      span.classList.add('hidden')
    }

    this.emit('badge-changed', badge, this)
  }

  getBadge() {
    if (this.isClosed) return
    return this.badge
  }

  setIcon(iconURL: string, icon: string) {
    if (this.isClosed) return
    this.iconURL = iconURL
    this.icon = icon
    const span = this.spans.icon
    if (iconURL) {
      span.innerHTML = `<img src="${iconURL}" />`
      span.classList.remove('background')
      this.emit('icon-changed', iconURL, this)
    } else if (icon) {
      span.innerHTML = `<i class="${icon}"></i>`
      span.classList.remove('background')
      this.emit('icon-changed', icon, this)
    } else {
      span.classList.add('background')
    }
    return this
  }

  getIcon() {
    if (this.isClosed) return
    if (this.iconURL) return this.iconURL
    return this.icon
  }

  getPosition(fromRight = false) {
    let position = 0
    let tab = this.element!
    while ((tab = tab.previousSibling as HTMLDivElement) != null) position++

    if (fromRight === true) {
      position -= this.tabGroup.tabContainer!.childElementCount
    }

    return position
  }

  activate() {
    if (this.isClosed) return
    const activeTab = this.tabGroup.getActiveTab()
    if (activeTab) {
      activeTab.element?.classList.remove('active')
      activeTab.emit('inactive', activeTab)
    }
    this.tabGroup.setActiveTab(this)
    this.element?.classList.add('active')
    this.emit('active', this)
    return this
  }

  get isActivated() {
    return this.element?.classList.contains('active')
  }

  show(flag = true) {
    if (this.isClosed) return
    if (flag) {
      this.element?.classList.add('visible')
      this.emit('visible', this)
    } else {
      this.element?.classList.remove('visible')
      this.emit('hidden', this)
    }
    return this
  }

  hide() {
    return this.show(false)
  }

  hasClass(className: string) {
    return this.element?.classList.contains(className)
  }

  close(force: boolean, triggerEvent = true) {
    const abortController = new AbortController()
    const abort = () => abortController.abort()
    if (!force) {
      this.emit('closing', this, abort)
    }

    const abortSignal = abortController.signal
    if (this.isClosed || (!this.closable && !force) || abortSignal.aborted) return

    this.isClosed = true
    const tabGroup = this.tabGroup
    tabGroup.tabContainer?.removeChild(this.element!)
    const activeTab = this.tabGroup.getActiveTab()
    tabGroup.removeTab(this, { triggerEvent: triggerEvent })

    this.emit('close', this)

    if (activeTab?.id === this.id) {
      tabGroup.activateRecentTab()
    }
  }

  loadingCompleted() {
    if (this.isClosed) return
    const span = this.spans.icon
    span.classList.remove('loading')
    return this
  }
}

customElements.define('tab-group', TabGroup)

export type { TabGroup, Tab }
