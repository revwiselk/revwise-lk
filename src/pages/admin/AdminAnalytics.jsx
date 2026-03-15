import { useEffect, useState } from 'react'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { TrendingUp, Users, Award, BookOpen, BarChart2 } from 'lucide-react'

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-bold text-3xl ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [topUnits, setTopUnits] = useState([])
  const [gradeBreakdown, setGradeBreakdown] = useState([])

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const [attRes, passRes, stRes, gradeRes] = await Promise.all([
      supabaseAdmin.from('quiz_attempts').select('id, passed, score, max_score, submitted_at').not('submitted_at','is',null),
      supabaseAdmin.from('quiz_attempts').select('id', { count:'exact', head:true }).eq('passed', true).not('submitted_at','is',null),
      supabaseAdmin.from('student_profiles').select('id, grade'),
      supabaseAdmin.from('student_profiles').select('grade'),
    ])

    const attempts = attRes.data || []
    const totalAttempts = attempts.length
    const totalPassed = passRes.count || 0
    const passRate = totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : 0

    const avgScore = attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.max_score > 0 ? (a.score / a.max_score) * 100 : 0), 0) / attempts.length)
      : 0

    // Grade breakdown
    const gradeMap = {}
    ;(gradeRes.data || []).forEach(s => {
      gradeMap[s.grade] = (gradeMap[s.grade] || 0) + 1
    })
    const breakdown = Object.entries(gradeMap)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([grade, count]) => ({ grade, count }))

    setData({ totalAttempts, totalPassed, passRate, avgScore, totalStudents: stRes.data?.length || 0 })
    setGradeBreakdown(breakdown)

    // Top performing units — attempts per quiz
    const { data: unitData } = await supabaseAdmin
      .from('quiz_attempts')
      .select('quiz_id, passed, quizzes(units(title))')
      .not('submitted_at','is',null)
      .limit(200)

    const unitMap = {}
    ;(unitData || []).forEach(a => {
      const title = a.quizzes?.units?.title
      if (!title) return
      if (!unitMap[title]) unitMap[title] = { attempts: 0, passed: 0 }
      unitMap[title].attempts++
      if (a.passed) unitMap[title].passed++
    })
    const units = Object.entries(unitMap)
      .map(([title, d]) => ({ title, ...d, rate: Math.round((d.passed / d.attempts) * 100) }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 8)
    setTopUnits(units)
    setLoading(false)
  }

  if (loading) return (
    <div>
      <h1 className="font-bold text-2xl text-gray-900 mb-8">Analytics</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {Array(4).fill(0).map((_,i) => <div key={i} className="skeleton h-24"/>)}
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-bold text-2xl text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Quiz performance & student statistics</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Students"  value={data?.totalStudents} color="text-blue-600" sub="Registered accounts"/>
        <StatCard label="Total Attempts"  value={data?.totalAttempts} color="text-purple-600" sub="Quiz submissions"/>
        <StatCard label="Pass Rate"       value={`${data?.passRate}%`} color="text-green-600" sub={`${data?.totalPassed} passed`}/>
        <StatCard label="Avg Score"       value={`${data?.avgScore}%`} color="text-amber-600" sub="Across all quizzes"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students by grade */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={16} className="text-blue-600"/> Students by Grade
          </h2>
          {gradeBreakdown.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No students yet</p>
          ) : (
            <div className="space-y-3">
              {gradeBreakdown.map(g => {
                const max = Math.max(...gradeBreakdown.map(x => x.count))
                const pct = Math.round((g.count / max) * 100)
                return (
                  <div key={g.grade} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-16 shrink-0">Grade {g.grade}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}/>
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-gray-700">
                        {g.count} student{g.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top units by attempts */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-green-600"/> Most Attempted Units
          </h2>
          {topUnits.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No quiz attempts yet</p>
          ) : (
            <div className="space-y-2">
              {topUnits.map((u, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.title}</p>
                    <p className="text-xs text-gray-400">{u.attempts} attempts</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-bold text-sm ${u.rate >= 70 ? 'text-green-600' : u.rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                      {u.rate}%
                    </span>
                    <p className="text-xs text-gray-400">pass</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
