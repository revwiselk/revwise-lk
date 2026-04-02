import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

import { PublicLayout, AdminLayout, StudentLayout, AuthGuard } from '@/components/layout/Layouts'

// ── Public pages ────────────────────────────────────────────────
import HomePage          from '@/pages/public/HomePage'
import SubjectsPage      from '@/pages/public/SubjectsPage'
import SubjectDetailPage from '@/pages/public/SubjectDetailPage'
import LoginPage         from '@/pages/public/LoginPage'
import RegisterPage      from '@/pages/public/RegisterPage'
import PapersPage        from '@/pages/public/PapersPage'
import PaperDetailPage   from '@/pages/public/PaperDetailPage'
import PaperAttemptPage  from '@/pages/public/PaperAttemptPage'
import PaperViewPage     from '@/pages/public/PaperViewPage'

// ── A/L public pages ───────────────────────────────────────────
import ALHomePage    from '@/pages/public/al/ALHomePage'
import ALStreamPage  from '@/pages/public/al/ALStreamPage'
import ALSubjectPage from '@/pages/public/al/ALSubjectPage'
import ALQuizPage    from '@/pages/public/al/ALQuizPage'

// ── Student ────────────────────────────────────────────────────
import StudentDashboard from '@/pages/student/Dashboard'
import QuizPage         from '@/pages/student/QuizPage'

// ── Grade 6-11 Admin ──────────────────────────────────────────
import AdminDashboard      from '@/pages/admin/AdminDashboard'
import AdminSubjects       from '@/pages/admin/AdminSubjects'
import AdminChapters       from '@/pages/admin/AdminChapters'
import AdminUnits          from '@/pages/admin/AdminUnits'
import AdminQuestions      from '@/pages/admin/AdminQuestions'
import AdminStudents       from '@/pages/admin/AdminStudents'
import AdminFeedback       from '@/pages/admin/AdminFeedback'
import AdminAnalytics      from '@/pages/admin/AdminAnalytics'
import AdminPapers         from '@/pages/admin/AdminPapers'
import AdminPaperSections  from '@/pages/admin/AdminPaperSections'
import AdminPaperQuestions from '@/pages/admin/AdminPaperQuestions'

// ── A/L Admin (same admin login, /admin/al/* section) ─────────
import ALDashboard     from '@/pages/admin/al/ALDashboard'
import ALStreams        from '@/pages/admin/al/ALStreams'
import ALSubjects      from '@/pages/admin/al/ALSubjects'
import ALContent       from '@/pages/admin/al/ALContent'
import ALSubUnitDetail from '@/pages/admin/al/ALSubUnitDetail'
import ALPapers           from '@/pages/admin/al/ALPapers'
import ALPaperSections     from '@/pages/admin/al/ALPaperSections'
import ALPaperQuestions    from '@/pages/admin/al/ALPaperQuestions'

function Loader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-xl">R</span>
        </div>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-blue-400"
              style={{ animation:'bounce 1.2s ease infinite', animationDelay:`${i*0.2}s` }}/>
          ))}
        </div>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(.8);opacity:.5}40%{transform:scale(1.2);opacity:1}}`}</style>
    </div>
  )
}

export default function App() {
  const { loadProfile, clear, setLoading, loading } = useAuthStore()

  useEffect(() => {
    setLoading(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user.id, session.user.email)
      else clear()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) loadProfile(session.user.id, session.user.email)
      else if (event === 'SIGNED_OUT') clear()
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <Loader/>

  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public ── */}
        <Route element={<PublicLayout/>}>
          <Route path="/"                    element={<HomePage/>}/>
          <Route path="/subjects"            element={<SubjectsPage/>}/>
          <Route path="/subjects/:subjectId" element={<SubjectDetailPage/>}/>
          <Route path="/quiz/:quizId"        element={<QuizPage/>}/>
          <Route path="/papers"              element={<PapersPage/>}/>
          <Route path="/papers/:paperId"     element={<PaperDetailPage/>}/>
          <Route path="/papers/:paperId/view"    element={<PaperViewPage/>}/>
          <Route path="/papers/:paperId/attempt" element={<PaperAttemptPage/>}/>
          {/* A/L public */}
          <Route path="/al"                    element={<ALHomePage/>}/>
          <Route path="/al/stream/:streamId"   element={<ALStreamPage/>}/>
          <Route path="/al/subject/:subjectId" element={<ALSubjectPage/>}/>
          <Route path="/al/quiz/:quizId"       element={<ALQuizPage/>}/>
        </Route>

        {/* ── Auth guard ── */}
        <Route element={<AuthGuard/>}>
          <Route path="/login"    element={<LoginPage/>}/>
          <Route path="/register" element={<RegisterPage/>}/>
        </Route>

        {/* ── Student ── */}
        <Route element={<StudentLayout/>}>
          <Route path="/dashboard" element={<StudentDashboard/>}/>
        </Route>

        {/* ── Admin (single panel, same login) ── */}
        <Route element={<AdminLayout/>}>
          {/* Grade 6-11 */}
          <Route path="/admin"                              element={<AdminDashboard/>}/>
          <Route path="/admin/subjects"                     element={<AdminSubjects/>}/>
          <Route path="/admin/subjects/:subjectId/chapters" element={<AdminChapters/>}/>
          <Route path="/admin/chapters/:chapterId/units"    element={<AdminUnits/>}/>
          <Route path="/admin/units/:unitId/questions"      element={<AdminQuestions/>}/>
          <Route path="/admin/students"                     element={<AdminStudents/>}/>
          <Route path="/admin/feedback"                     element={<AdminFeedback/>}/>
          <Route path="/admin/analytics"                    element={<AdminAnalytics/>}/>
          <Route path="/admin/papers"                       element={<AdminPapers/>}/>
          <Route path="/admin/papers/:paperId/sections"     element={<AdminPaperSections/>}/>
          <Route path="/admin/paper-sections/:sectionId/questions" element={<AdminPaperQuestions/>}/>

          {/* A/L section — same admin, different URL prefix */}
          <Route path="/admin/al"                        element={<ALDashboard/>}/>
          <Route path="/admin/al/streams"                element={<ALStreams/>}/>
          <Route path="/admin/al/subjects"               element={<ALSubjects/>}/>
          <Route path="/admin/al/content"                element={<ALContent/>}/>
          <Route path="/admin/al/sub-units/:subUnitId"   element={<ALSubUnitDetail/>}/>
          <Route path="/admin/al/papers"                 element={<ALPapers/>}/>
          <Route path="/admin/al/papers/:paperId/sections" element={<ALPaperSections/>}/>
          <Route path="/admin/al/paper-sections/:sectionId/questions" element={<ALPaperQuestions/>}/>
        </Route>

        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>
  )
}
