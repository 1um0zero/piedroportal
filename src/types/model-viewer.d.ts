// TypeScript declarations for Google's <model-viewer> web component
import 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string
          'camera-controls'?: boolean
          'auto-rotate'?: boolean
          'auto-rotate-delay'?: string
          'shadow-intensity'?: string
          'tone-mapping'?: string
          'environment-image'?: string
          exposure?: string
          ar?: boolean
        },
        HTMLElement
      >
    }
  }
}
