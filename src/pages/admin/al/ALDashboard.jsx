import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { GraduationCap, BookOpen, Layers, FileText, Users, TrendingUp, ChevronRight, BookMarked } from 'lucide-react'
import clsx from 'clsx'

export default function ALAdminDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [stats, setStats] = useState({ streams:0, subjects:0, chapters:0, units:0, papers:0, attempts:0 })
  const [recentAttempts, setRecentAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const safe = async (q) => { try { const r = await q; return r.error ? {count:0,data:[]} : r } catch { return {count:0,data:[]} } }
    Promise.all([
      safe(supabaseAdmin.from('al_streams').select('id',{count:'exact',head:true})),
      safe(supabaseAdmin.from('al_subjects').select('id',{count:'exact',head:true})),
      safe(supabaseAdmin.from('al_chapters').select('id',{count:'exact',head:true})),
      safe(supabaseAdmin.from('al_units').select('id',{count:'exact',head:true})),
      safe(supabaseAdmin.from('al_papers').select('id',{count:'exact',head:true})),
      safe(supabaseAdmin.from('al_quiz_attempts').select('id',{count:'exact',head:true})),
      safe(supabaseAdmin.from('al_quiz_attempts')
        .select('id,score,max_score,passed,submitted_at')
        .order('submitted_at',{ascending:false}).limit(8)),
    ]).then(([str,sub,ch,un,pa,att,recAtt]) => {
      setStats({ streams:str.count||0, subjects:sub.count||0, chapters:ch.count||0, units:un.count||0, papers:pa.count||0, attempts:att.count||0 })
      setRecentAttempts(recAtt.data||[])
      setLoading(false)
    })
  }, [])

  const cards = [
    { label:'Streams',  value:stats.streams,  icon:Layers,       color:'bg-violet-50 text-violet-600', link:'/admin/al/streams'  },
    { label:'Subjects', value:stats.subjects, icon:BookOpen,     color:'bg-blue-50 text-blue-600',     link:'/admin/al/subjects' },
    { label:'Chapters', value:stats.chapters, icon:BookMarked,   color:'bg-indigo-50 text-indigo-600', link:'/admin/al/content'  },
    { label:'Units',    value:stats.units,    icon:Layers,       color:'bg-cyan-50 text-cyan-600',     link:'/admin/al/content'  },
    { label:'Papers',   value:stats.papers,   icon:FileText,     color:'bg-amber-50 text-amber-600',   link:'/admin/al/papers'   },
    { label:'Attempts', value:stats.attempts, icon:TrendingUp,   color:'bg-green-50 text-green-600'                              },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm shrink-0">
          <GraduationCap size={20} className="text-white"/>
        </div>
        <div>
          <h1 className="font-bold text-2xl text-gray-900">A/L Section</h1>
          <p className="text-gray-500 text-sm">Advanced Level — Streams, Subjects & Papers</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} onClick={c.link ? ()=>navigate(c.link) : undefined}
            className={clsx('card p-4 text-center', c.link && 'cursor-pointer hover:shadow-md transition-shadow')}>
            <div className={`w-9 h-9 rounded-xl ${c.color} flex items-center justify-center mx-auto mb-2`}>
              <c.icon size={16}/>
            </div>
            <div className="font-bold text-xl text-gray-900">{loading ? '–' : c.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { title:'Manage Streams',  desc:'Configure A/L streams & subjects', to:'/admin/al/streams',  icon:Layers,       color:'bg-violet-50 text-violet-600' },
          { title:'Manage Subjects', desc:'Add subjects, assign to streams',  to:'/admin/al/subjects', icon:BookOpen,     color:'bg-blue-50 text-blue-600'    },
          { title:'Content',         desc:'Chapters, units, sub-units',       to:'/admin/al/content',  icon:BookMarked,   color:'bg-indigo-50 text-indigo-600' },
          { title:'Papers',          desc:'Past papers, model papers',        to:'/admin/al/papers',   icon:FileText,     color:'bg-amber-50 text-amber-600'  },
        ].map(a => (
          <div key={a.title} onClick={()=>navigate(a.to)} className="card p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl ${a.color} flex items-center justify-center shrink-0`}><a.icon size={18}/></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{a.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-violet-500 transition-colors shrink-0 mt-1"/>
          </div>
        ))}
      </div>
    </div>
  )
}
