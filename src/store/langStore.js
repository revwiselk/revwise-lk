import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useLangStore = create(
  persist(
    (set) => ({
      language: 'english', // 'english' | 'sinhala' | 'tamil'
      setLanguage: (lang) => set({ language: lang }),
    }),
    { name: 'revwise-lang' }
  )
)

// Helper: get translated field with english fallback
export function t(translations = [], language = 'english', field = 'title') {
  const found = translations.find(t => t.language === language)
  const fallback = translations.find(t => t.language === 'english')
  const item = found || fallback || translations[0]
  return item?.[field] || ''
}
