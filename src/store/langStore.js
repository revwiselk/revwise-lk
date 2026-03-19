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
export function tr(translations, language, field) {
  if (!translations || !translations.length) return ''
  const found = translations.find(row => row.language === language)
  const fallback = translations.find(row => row.language === 'english')
  const item = found || fallback || translations[0]
  return item?.[field] || ''
}
