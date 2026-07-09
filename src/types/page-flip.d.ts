// Minimal typings for the parts of `page-flip` we use (the package ships none).
declare module 'page-flip' {
  export interface FlipSetting {
    width: number
    height: number
    size?: 'fixed' | 'stretch'
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    showCover?: boolean
    usePortrait?: boolean
    mobileScrollSupport?: boolean
    drawShadow?: boolean
    maxShadowOpacity?: number
    flippingTime?: number
  }

  export interface WidgetEvent {
    data: unknown
    object: PageFlip
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: FlipSetting)
    loadFromImages(images: string[]): void
    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void
    on(event: 'flip' | 'init' | 'changeState' | 'changeOrientation', cb: (e: WidgetEvent) => void): void
    flipNext(): void
    flipPrev(): void
    getCurrentPageIndex(): number
    getPageCount(): number
    destroy(): void
  }
}
