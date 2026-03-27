import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { BookOpen, Layers, HelpCircle, Users, TrendingUp, MessageSquare, ChevronRight, Award, Clock, BarChart2 } from 'lucide-react'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ subjects:0, chapters:0, units:0, questions:0, students:0, attempts:0, feedback:0, passed:0 })
  const [recentStudents, setRecentStudents] = useState([])
  const [recentAttempts, setRecentAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabaseAdmin.from('subjects').select('id', { count:'exact', head:true }),
      supabaseAdmin.from('chapters').select('id', { count:'exact', head:true }),
      supabaseAdmin.from('units').select('id', { count:'exact', head:true }),
      supabaseAdmin.from('questions').select('id', { count:'exact', head:true }),
      supabaseAdmin.from('student_profiles').select('id', { count:'exact', head:true }),
      supabaseAdmin.from('quiz_attempts').select('id', { count:'exact', head:true }),
      supabaseAdmin.from('feedback').select('id', { count:'exact', head:true }).eq('is_resolved', false),
      supabaseAdmin.from('quiz_attempts').select('id', { count:'exact', head:true }).eq('passed', true),
      supabaseAdmin.from('student_profiles').select('id, full_name, grade, school_name, created_at').order('created_at', { ascending:false }).limit(5),
      supabaseAdmin.from('quiz_attempts')
        .select('id, score, max_score, passed, submitted_at, student_id, student_profiles!quiz_attempts_student_id_fkey(full_name, grade), quizzes!quiz_attempts_quiz_id_fkey(units!quizzes_unit_id_fkey(title))')
        .not('submitted_at','is',null).order('submitted_at', { ascending:false }).limit(5),
    ]).then(([s, ch, u, q, st, att, fb, passed, recSt, recAtt]) => {
      setStats({
        subjects: s.count||0, chapters: ch.count||0, units: u.count||0,
        questions: q.count||0, students: st.count||0, attempts: att.count||0,
        feedback: fb.count||0, passed: passed.count||0,
      })
      setRecentStudents(recSt.data || [])
      setRecentAttempts(recAtt.data || [])
      setLoading(false)
    })
  }, [])

  const statCards = [
    { label:'Subjects',   value:stats.subjects,  icon:BookOpen,      color:'bg-blue-50 text-blue-600',   link:'/admin/subjects' },
    { label:'Units',      value:stats.units,     icon:Layers,        color:'bg-purple-50 text-purple-600', link:'/admin/subjects' },
    { label:'Questions',  value:stats.questions, icon:HelpCircle,    color:'bg-cyan-50 text-cyan-600',   link:'/admin/subjects' },
    { label:'Students',   value:stats.students,  icon:Users,         color:'bg-green-50 text-green-600', link:'/admin/students' },
    { label:'Attempts',   value:stats.attempts,  icon:TrendingUp,    color:'bg-amber-50 text-amber-600' },
    { label:'Pass Rate',  value: stats.attempts > 0 ? Math.round((stats.passed/stats.attempts)*100)+'%' : '—', icon:Award, color:'bg-emerald-50 text-emerald-600' },
    { label:'Chapters',   value:stats.chapters,  icon:Layers,        color:'bg-indigo-50 text-indigo-600', link:'/admin/subjects' },
    { label:'Feedback',   value:stats.feedback,  icon:MessageSquare, color:'bg-rose-50 text-rose-600',   link:'/admin/feedback' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-bold text-2xl text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">RevWise.lk — Content & Student Management</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        {statCards.map((c, i) => (
          <div key={c.label}
            onClick={c.link ? () => navigate(c.link) : undefined}
            className={`card p-4 text-center animate-fade-up s${Math.min(i+1,5)} ${c.link ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
            <div className={`w-9 h-9 rounded-xl ${c.color} flex items-center justify-center mx-auto mb-2`}>
              <c.icon size={16}/>
            </div>
            <div className="font-bold text-xl text-gray-900">{loading ? '–' : c.value}</div>
            <div className="text-xs text-gray-400 mt-0.5 leading-tight">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Students */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Users size={16} className="text-blue-600"/> Recent Students</h2>
            <button onClick={() => navigate('/admin/students')} className="text-xs text-blue-600 hover:underline">View all →</button>
          </div>
          {recentStudents.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No students yet</p>
          ) : (
            <div className="space-y-2">
              {recentStudents.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-700 text-xs font-bold">{(s.full_name||'S')[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.full_name}</p>
                      <p className="text-xs text-gray-400">{s.school_name || 'No school'}</p>
                    </div>
                  </div>
                  <span className="bdg-blue">Gr.{s.grade}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quiz Attempts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><TrendingUp size={16} className="text-green-600"/> Recent Attempts</h2>
          </div>
          {recentAttempts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No attempts yet</p>
          ) : (
            <div className="space-y-2">
              {recentAttempts.map(a => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{a.student_profiles?.full_name || 'Guest'}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[180px]">{a.quizzes?.units?.title || 'Unknown Unit'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-sm">{a.score}/{a.max_score}</span>
                    <span className={`bdg ${a.passed ? 'bdg-green' : 'bdg-red'}`}>{a.passed ? 'Pass' : 'Fail'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title:'Manage Subjects',  desc:'Add grades, subjects, chapters',       to:'/admin/subjects',  icon:BookOpen,      color:'bg-blue-50 text-blue-600' },
          { title:'View Students',    desc:'Browse by grade, district, school',    to:'/admin/students',  icon:Users,         color:'bg-green-50 text-green-600' },
          { title:'Feedback',         desc:'Read student feedback on quizzes',     to:'/admin/feedback',  icon:MessageSquare, color:'bg-rose-50 text-rose-600' },
          { title:'Analytics',        desc:'Quiz performance & pass rates',        to:'/admin/analytics', icon:BarChart2,     color:'bg-amber-50 text-amber-600' },
        ].map(a => (
          <div key={a.title} onClick={() => navigate(a.to)}
            className="card-lift p-5 flex items-start gap-3 group">
            <div className={`w-10 h-10 rounded-xl ${a.color} flex items-center justify-center shrink-0`}>
              <a.icon size={18}/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 mt-1"/>
          </div>
        ))}
      </div>
    </div>
  )
}
