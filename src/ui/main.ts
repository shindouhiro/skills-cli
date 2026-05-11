import { createApp } from 'vue'
import AI_ICONS from '../commands/icons.json'
import App from './App.vue'
import { i18n } from './i18n'

import './styles.css'

declare global {
  interface Window {
    IconifyIcon?: {
      addCollection: (collection: unknown) => void
    }
  }
}

interface IconifyIconConstructor {
  addCollection?: (collection: unknown) => void
}

function addAiIconCollection(): boolean {
  if (window.IconifyIcon?.addCollection) {
    window.IconifyIcon.addCollection(AI_ICONS)
    return true
  }

  const iconifyElement = customElements.get('iconify-icon') as IconifyIconConstructor | undefined
  if (iconifyElement?.addCollection) {
    iconifyElement.addCollection(AI_ICONS)
    return true
  }

  return false
}

function registerAiIcons(): void {
  if (addAiIconCollection())
    return

  customElements.whenDefined('iconify-icon').then(() => {
    addAiIconCollection()
  })
}

registerAiIcons()
createApp(App).use(i18n).mount('#app')
