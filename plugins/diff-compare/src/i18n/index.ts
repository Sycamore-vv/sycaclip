import { createI18n } from 'vue-i18n'
import zh from './locales/zh'
import en from './locales/en'
import ja from './locales/ja'

// Define the message schema for type safety
export type MessageSchema = typeof zh

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: 'zh',
  fallbackLocale: 'en',
  messages: {
    zh,
    en,
    ja
  }
})

export default i18n
