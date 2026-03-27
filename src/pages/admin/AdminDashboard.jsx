import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { BookOpen, Layers, HelpCircle, Users, TrendingUp, MessageSquare, ChevronRight, Award, BarChart2, FileText } from 'lucide-react'
import clsx from 'clsx'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    subjects:0, chapters:0, units:0, questions:0,
    students:0, attempts:0, feedback:0, passed:0,
    papers:0, paperAttempts:0,
  })
  const [recentStudents, setRecentStudents]     = useState([])
  const [recentQuizAttempts, setRecentQuizAttempts] = useState([])
  const [recentPaperAttempts, setRecentPaperAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [attemptTab, setAttemptTab] = useState('quiz') // 'quiz' | 'paper'

  useEffect(() => {
    const safe = (p) => p.catch(() => ({ count: 0, data: [] }))
    Promise.all([
      safe(supabaseAdmin.from('subjects').select('id', { count:'exact', head:true })),
      safe(supabaseAdmin.from('chapters').select('id', { count:'exact', head:true })),
      safe(supabaseAdmin.from('units').select('id', { count:'exact', head:true })),
      safe(supabaseAdmin.from('questions').select('id', { count:'exact', head:true })),
      safe(supabaseAdmin.from('student_profiles').select('id', { count:'exact', head:true })),
      safe(supabaseAdmin.from('quiz_attempts').select('id', { count:'exact', head:true })),
      safe(supabaseAdmin.from('feedback').select('id', { count:'exact', head:true }).eq('is_resolved', false)),
      safe(supabaseAdmin.from('quiz_attempts').select('id', { count:'exact', head:true }).eq('passed', true)),
      safe(supabaseAdmin.from('papers').select('id', { count:'exact', head:true })),
      safe(supabaseAdmin.from('paper_attempts').select('id', { count:'exact', head:true })),
      safe(supabaseAdmin.from('student_profiles')
        .select('id, full_name, grade, school_name, created_at')
        .order('created_at', { ascending:false }).limit(5)),
      safe(supabaseAdmin.from('quiz_attempts')
        .select('id, score, max_score, passed, submitted_at, student_profiles!quiz_attempts_student_id_fkey(full_name), quizzes!quiz_attempts_quiz_id_fkey(units!quizzes_unit_id_fkey(title))')
        .not('submitted_at','is',null).order('submitted_at', { ascending:false }).limit(5)),
      safe(supabaseAdmin.from('paper_attempts')
        .select('id, score, max_score, passed, submitted_at, user_id, papers!paper_attempts_paper_id_fkey(title, subject, grade)')
        .not('submitted_at','is',null).order('submitted_at', { ascending:false }).limit(5)),
    ]).then(([s,ch,u,q,st,att,fb,passed,papers,paperAtt,recSt,recQA,recPA]) => {
      setStats({
        subjects:  s.count||0,   chapters: ch.count||0,  units:      u.count||0,
        questions: q.count||0,   students: st.count||0,  attempts:   att.count||0,
        feedback:  fb.count||0,  passed:   passed.count||0,
        papers:    papers.count||0, paperAttempts: paperAtt.count||0,
      })
      setRecentStudents(recSt.data||[])
      setRecentQuizAttempts(recQA.data||[])
      setRecentPaperAttempts(recPA.data||[])
      setLoading(false)
    })
  }, [])

  const statCards = [
    { label:'Subjects',       value:stats.subjects,      icon:BookOpen,      color:'bg-blue-50 text-blue-600',    link:'/admin/subjects' },
    { label:'Units',          value:stats.units,         icon:Layers,        color:'bg-purple-50 text-purple-600', link:'/admin/subjects' },
    { label:'Questions',      value:stats.questions,     icon:HelpCircle,    color:'bg-cyan-50 text-cyan-600',    link:'/admin/subjects' },
    { label:'Students',       value:stats.students,      icon:Users,         color:'bg-green-50 text-green-600',  link:'/admin/students' },
    { label:'Quiz Attempts',  value:stats.attempts,      icon:TrendingUp,    color:'bg-amber-50 text-amber-600' },
    { label:'Pass Rate',      value:stats.attempts > 0 ? Math.round((stats.passed/stats.attempts)*100)+'%' : '—', icon:Award, color:'bg-emerald-50 text-emerald-600' },
    { label:'Papers',         value:stats.papers,        icon:FileText,      color:'bg-indigo-50 text-indigo-600', link:'/admin/papers' },
    { label:'Feedback',       value:stats.feedback,      icon:MessageSquare, color:'bg-rose-50 text-rose-600',    link:'/admin/feedback' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-bold text-2xl text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">RevWise.lk — Content & Student Management</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {statCards.map((c, i) => (
          <div key={c.label}
            onClick={c.link ? () => navigate(c.link) : undefined}
            className={clsx('card p-4 text-center', c.link && 'cursor-pointer hover:shadow-md transition-shadow')}>
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
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users size={16} className="text-blue-600"/> Recent Students
            </h2>
            <button onClick={() => navigate('/admin/students')} className="text-xs text-blue-600 hover:underline">View all →</button>
          </div>
          {recentStudents.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No students yet</p>
          ) : (
            <div className="space-y-2">
              {recentStudents.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-blue-700 text-xs font-bold">{(s.full_name||'S')[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.full_name}</p>
                      <p className="text-xs text-gray-400">{s.school_name || 'No school'}</p>
                    </div>
                  </div>
                  <span className="bdg-blue shrink-0">Gr.{s.grade}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Attempts — tabs for Quiz / Paper */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-600"/> Recent Attempts
            </h2>
            {/* Tab switcher */}
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
              <button onClick={() => setAttemptTab('quiz')}
                className={clsx('px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                  attemptTab==='quiz' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                Quiz
              </button>
              <button onClick={() => setAttemptTab('paper')}
                className={clsx('px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                  attemptTab==='paper' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                Paper
              </button>
            </div>
          </div>

          {/* Quiz attempts */}
          {attemptTab === 'quiz' && (
            recentQuizAttempts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No quiz attempts yet</p>
            ) : (
              <div className="space-y-2">
                {recentQuizAttempts.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {a.student_profiles?.full_name || 'Guest'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {a.quizzes?.units?.title || 'Unknown Unit'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-sm text-gray-700">{a.score}/{a.max_score}</span>
                      <span className={clsx('bdg text-xs', a.passed ? 'bdg-green' : 'bdg-red')}>
                        {a.passed ? 'Pass' : 'Fail'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Paper attempts */}
          {attemptTab === 'paper' && (
            recentPaperAttempts.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No paper attempts yet</p>
            ) : (
              <div className="space-y-2">
                {recentPaperAttempts.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {a.papers?.title || 'Unknown Paper'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {a.papers?.subject} · Grade {a.papers?.grade}
                        {a.submitted_at && (' · ' + new Date(a.submitted_at).toLocaleDateString())}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.score != null && <span className="font-bold text-sm text-gray-700">{a.score}/{a.max_score}</span>}
                      {a.passed != null && (
                        <span className={clsx('bdg text-xs', a.passed ? 'bdg-green' : 'bdg-red')}>
                          {a.passed ? 'Pass' : 'Fail'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title:'Manage Subjects', desc:'Subjects, chapters, units, quizzes', to:'/admin/subjects',  icon:BookOpen,      color:'bg-blue-50 text-blue-600'   },
          { title:'Manage Papers',   desc:'Past papers, model papers, tests',   to:'/admin/papers',    icon:FileText,      color:'bg-indigo-50 text-indigo-600' },
          { title:'View Students',   desc:'Browse by grade, district, school',  to:'/admin/students',  icon:Users,         color:'bg-green-50 text-green-600'  },
          { title:'Feedback',        desc:'Student feedback on quizzes',        to:'/admin/feedback',  icon:MessageSquare, color:'bg-rose-50 text-rose-600'    },
          { title:'Analytics',       desc:'Quiz performance & pass rates',      to:'/admin/analytics', icon:BarChart2,     color:'bg-amber-50 text-amber-600'  },
        ].map(a => (
          <div key={a.title} onClick={() => navigate(a.to)}
            className="card p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl ${a.color} flex items-center justify-center shrink-0`}>
              <a.icon size={18}/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{a.desc}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 mt-1"/>
          </div>
        ))}
      </div>
    </div>
  )
}
