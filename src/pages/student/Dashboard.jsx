import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { EmptyState, Badge } from '@/components/ui'
import { BookOpen, ChevronRight, GraduationCap, Clock, Flame } from 'lucide-react'
import { useLangStore } from '@/store/langStore'
import clsx from 'clsx'

const EMOJI = { science:'🔬', mathematics:'📐', sinhala:'📖', english:'📝', history:'🏛️', geography:'🌍', health:'🏃', religion:'☸️', tamil:'📜', default:'📚' }

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function StudentDashboard() {
  const { user, profile } = useAuthStore()
  const { language } = useLangStore()
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const grade = profile?.grade || 6

  useEffect(() => { fetchData() }, [grade])

  const fetchData = async () => {
    setLoading(true)
    const [sRes, aRes] = await Promise.all([
      supabase.from('subjects').select('id, slug, name, grade, chapters(id), subject_translations(language, name)').eq('grade', grade).eq('is_active', true).order('order_index'),
      supabase.from('quiz_attempts')
        .select('id, score, max_score, percent_score, passed, submitted_at, quizzes(id, units(id, title))')
        .eq('student_id', user?.id).not('submitted_at','is',null)
        .order('submitted_at', { ascending: false }).limit(5),
    ])
    setSubjects(sRes.data || [])
    setAttempts(aRes.data || [])
    setLoading(false)
  }

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8 animate-fade-up">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-sm">{greeting()} 👋</p>
            <h1 className="font-bold text-3xl text-gray-900 mt-0.5">{profile?.full_name?.split(' ')[0] || 'Student'}</h1>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-2.5">
            <GraduationCap size={18} className="text-blue-600"/>
            <span className="font-bold text-blue-700">Grade {grade}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label:'Subjects',  v: subjects.length || '–', icon:'📚' },
            { label:'Quizzes',   v: attempts.length,         icon:'✅' },
            { label:'Medium',    v: profile?.medium ? profile.medium.charAt(0).toUpperCase()+profile.medium.slice(1) : '–', icon:'🌐' },
          ].map((s,i) => (
            <div key={i} className={`card p-4 text-center animate-fade-up s${i+1}`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="font-bold text-xl text-gray-900">{s.v}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent attempts */}
      {attempts.length > 0 && (
        <div className="mb-8 animate-fade-up s2">
          <h2 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2"><Flame size={18} className="text-orange-500"/> Recent Activity</h2>
          <div className="space-y-2">
            {attempts.map(a => (
              <div key={a.id} className="card px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{a.quizzes?.units?.title || 'Quiz'}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Clock size={11}/>{new Date(a.submitted_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900">{a.score}/{a.max_score}</span>
                  <Badge color={a.passed ? 'green' : 'red'}>{a.passed ? 'Passed' : 'Failed'}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subjects */}
      <div className="animate-fade-up s3">
        <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2"><BookOpen size={18} className="text-blue-600"/> Your Subjects</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array(6).fill(0).map((_,i) => <div key={i} className="skeleton h-28"/>)}</div>
        ) : subjects.length === 0 ? (
          <EmptyState icon={BookOpen} title="No subjects yet" desc="Subjects for your grade haven't been added yet."/>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((s,i) => (
              <div key={s.id} onClick={() => navigate(`/subjects/${s.id}`)}
                className={`card-lift p-5 flex items-center gap-4 group animate-fade-up s${Math.min(i+1,5)}`}>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">
                  {EMOJI[s.slug] || EMOJI.default}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{s.subject_translations?.find(t=>t.language===language)?.name || s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.chapters?.length || 0} chapters</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0"/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
