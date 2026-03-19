import { useLangStore } from '@/store/langStore'
import clsx from 'clsx'

const LANGS = [
  { key: 'english', label: 'EN', full: 'English' },
  { key: 'sinhala', label: 'SI', full: 'සිංහල' },
  { key: 'tamil',   label: 'TA', full: 'தமிழ்' },
]

export default function LangSwitcher({ showFull = false }) {
  const { language, setLanguage } = useLangStore()
  return (
    <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-xl">
      {LANGS.map(l => (
        <button key={l.key} onClick={() => setLanguage(l.key)}
          className={clsx(
            'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
            language === l.key
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
          )}>
          {showFull ? l.full : l.label}
        </button>
      ))}
    </div>
  )
}
