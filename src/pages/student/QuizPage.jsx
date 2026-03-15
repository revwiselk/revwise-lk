import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Btn, ProgBar, Field, Txt } from '@/components/ui'
import { ArrowLeft, ArrowRight, Clock, AlertCircle, CheckCircle2, XCircle, Trophy, RotateCcw, MessageSquare, Send } from 'lucide-react'
import clsx from 'clsx'

export default function QuizPage() {
  const { quizId } = useParams()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // shown after submit
  const [phase, setPhase] = useState('quiz') // 'quiz' | 'result' | 'feedback'
  const [feedback, setFeedback] = useState({ rating: 0, body: '', name: '' })
  const [feedbackSent, setFeedbackSent] = useState(false)
  const startedAt = useRef(new Date())
  const timerRef = useRef(null)

  useEffect(() => { fetchQuiz(); return () => clearInterval(timerRef.current) }, [quizId])

  const fetchQuiz = async () => {
    setLoading(true)
    const [qzRes, questRes] = await Promise.all([
      supabase.from('quizzes').select('*').eq('id', quizId).single(),
      supabase.from('questions')
        .select(`id, question_type, order_index, marks, image_url,
          question_translations(language, question_text, explanation),
          answer_options(id, is_correct, order_index,
            answer_option_translations(language, option_text))`)
        .eq('quiz_id', quizId)
        .eq('status', 'published')
        .order('order_index'),
    ])
    if (qzRes.data) { setQuiz(qzRes.data); if (qzRes.data.time_limit_seconds) setTimeLeft(qzRes.data.time_limit_seconds) }
    setQuestions(questRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (timeLeft === null || phase !== 'quiz') return
    if (timeLeft <= 0) { handleSubmit(); return }
    timerRef.current = setInterval(() => setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); return 0 } return t - 1 }), 1000)
    return () => clearInterval(timerRef.current)
  }, [timeLeft !== null ? 'on' : 'off', phase])

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const getTrans = (arr = [], lang = 'english') =>
    arr.find(t => t.language === lang) || arr.find(t => t.language === 'english') || arr[0]

  const q = questions[idx]

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    clearInterval(timerRef.current)

    let score = 0, maxScore = 0
    const rows = []
    for (const question of questions) {
      const marks = question.marks || 1
      maxScore += marks
      const selId = answers[question.id] || null
      const isCorrect = selId ? (question.answer_options?.find(o => o.id === selId)?.is_correct ?? false) : false
      if (isCorrect) score += marks
      rows.push({ question_id: question.id, selected_option_id: selId, is_correct: isCorrect, marks_awarded: isCorrect ? marks : 0 })
    }

    const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
    const passed = pct >= (quiz?.pass_mark_percent || 50)
    const timeTaken = Math.round((new Date() - startedAt.current) / 1000)

    // Save attempt only if logged in
    if (user) {
      const { data: attempt } = await supabase.from('quiz_attempts').insert({
        quiz_id: quizId, student_id: user.id, language: 'english',
        started_at: startedAt.current.toISOString(),
        submitted_at: new Date().toISOString(),
        score, max_score: maxScore, passed, time_taken_seconds: timeTaken,
      }).select().single()

      if (attempt) {
        await supabase.from('attempt_answers').insert(rows.map(r => ({ ...r, attempt_id: attempt.id })))
      }
    }

    setResult({ score, maxScore, pct, passed, questions, answers })
    setPhase('result')
    setSubmitting(false)
  }, [submitting, answers, questions, quiz, user, quizId])

  const handleFeedback = async () => {
    if (!feedback.body.trim()) return
    await supabase.from('feedback').insert({
      unit_id: null,
      name: feedback.name.trim() || null,
      body: feedback.body.trim(),
      feedback_type: 'quiz',
    })
    setFeedbackSent(true)
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"/>
        <p className="text-gray-500">Loading quiz…</p>
      </div>
    </div>
  )

  if (!quiz || questions.length === 0) return (
    <div className="max-w-xl mx-auto py-20 text-center px-4">
      <AlertCircle size={40} className="text-gray-300 mx-auto mb-3"/>
      <p className="text-gray-500 mb-4">No questions available yet.</p>
      <Btn variant="white" onClick={() => navigate(-1)}>Go Back</Btn>
    </div>
  )

  // ── Result + Feedback ────────────────────────────────────────────────────
  if (phase === 'result' || phase === 'feedback') {
    const { score, maxScore, pct, passed, questions: qs, answers: ans } = result
    const msg = pct >= 90 ? { t: 'Outstanding! 🏆', c: 'text-amber-500' }
              : pct >= 75 ? { t: 'Great work! 🎉', c: 'text-blue-600' }
              : pct >= 50 ? { t: 'Well done! 👍', c: 'text-blue-500' }
              : { t: 'Keep practising! 💪', c: 'text-gray-500' }
    const R = 52, C = 2 * Math.PI * R

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Score card */}
        <div className="card p-8 text-center mb-6 animate-scale-in">
          <div className="flex justify-center mb-5">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={R} fill="none" stroke="#e5e7eb" strokeWidth="10"/>
                <circle cx="60" cy="60" r={R} fill="none"
                  stroke={passed ? '#2563eb' : '#ef4444'} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C}
                  style={{ transition: 'stroke-dashoffset 1s ease' }}/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-bold text-3xl text-gray-900">{pct}%</span>
                <span className="text-xs text-gray-400">{score}/{maxScore}</span>
              </div>
            </div>
          </div>
          <h1 className={clsx('font-bold text-2xl mb-2', msg.c)}>{msg.t}</h1>
          <p className="text-gray-500 mb-4">You scored <strong className="text-gray-800">{score} out of {maxScore}</strong> marks</p>
          <span className={clsx('bdg text-sm px-4 py-1.5', passed ? 'bdg-green' : 'bdg-red')}>
            {passed ? <span className="flex items-center gap-1.5"><Trophy size={14}/> Passed!</span>
                    : <span className="flex items-center gap-1.5"><RotateCcw size={14}/> Failed</span>}
          </span>

          {!user && (
            <p className="mt-4 text-sm text-blue-600 bg-blue-50 rounded-xl px-4 py-2">
              <strong>Want to save your scores?</strong>{' '}
              <a href="/register" className="underline">Create a free account →</a>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-8">
          <Btn variant="white" size="lg" className="flex-1" onClick={() => navigate(-2)}>← Back to Unit</Btn>
          <Btn variant="blue" size="lg" className="flex-1 gap-2" onClick={() => { setPhase('quiz'); setAnswers({}); setIdx(0); setResult(null); startedAt.current = new Date() }}>
            <RotateCcw size={16}/> Retake
          </Btn>
        </div>

        {/* Feedback section */}
        <div className="card p-6 mb-8">
          <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-500"/> Share Your Feedback
          </h2>
          {feedbackSent ? (
            <div className="text-center py-4">
              <CheckCircle2 size={36} className="text-green-500 mx-auto mb-2"/>
              <p className="font-medium text-gray-800">Thank you for your feedback! 🙏</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Star rating */}
              <div>
                <p className="text-sm text-gray-600 mb-2">How was this quiz?</p>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => setFeedback(f => ({ ...f, rating: star }))}
                      className={clsx('text-2xl transition-transform hover:scale-110', feedback.rating >= star ? 'text-amber-400' : 'text-gray-300')}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Your name (optional)" placeholder="Kasun Perera"
                value={feedback.name} onChange={e => setFeedback(f => ({ ...f, name: e.target.value }))}/>
              <Txt label="Comments or suggestions" placeholder="Tell us what you thought of this quiz…"
                value={feedback.body} onChange={e => setFeedback(f => ({ ...f, body: e.target.value }))}
                className="min-h-[80px]"/>
              <Btn variant="blue" onClick={handleFeedback} disabled={!feedback.body.trim()} className="gap-2">
                <Send size={15}/> Send Feedback
              </Btn>
            </div>
          )}
        </div>

        {/* Answer review */}
        <h2 className="font-bold text-lg text-gray-900 mb-4">Answer Review</h2>
        <div className="space-y-4">
          {qs.map((q, i) => {
            const qTrans = getTrans(q.question_translations)
            const selId = ans[q.id]
            const isCorrect = selId ? (q.answer_options?.find(o => o.id === selId)?.is_correct ?? false) : false
            return (
              <div key={q.id} className={clsx('card p-5 border-2', isCorrect ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30')}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5', isCorrect ? 'bg-green-100' : 'bg-red-100')}>
                    {isCorrect ? <CheckCircle2 size={14} className="text-green-600"/> : <XCircle size={14} className="text-red-500"/>}
                  </div>
                  <p className="text-sm font-medium text-gray-800 leading-relaxed">
                    <span className="text-gray-400 font-normal mr-1">Q{i+1}.</span>
                    {qTrans?.question_text}
                  </p>
                </div>
                <div className="space-y-1.5 ml-9">
                  {[...(q.answer_options || [])].sort((a, b) => a.order_index - b.order_index).map(opt => {
                    const oTrans = getTrans(opt.answer_option_translations)
                    const wasSel = opt.id === selId
                    return (
                      <div key={opt.id} className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                        opt.is_correct ? 'bg-green-100 text-green-800 font-medium'
                          : wasSel ? 'bg-red-100 text-red-700 line-through'
                          : 'text-gray-500')}>
                        {opt.is_correct ? <CheckCircle2 size={12} className="text-green-600 shrink-0"/>
                          : wasSel ? <XCircle size={12} className="text-red-500 shrink-0"/>
                          : <div className="w-3 h-3 rounded-full border border-gray-300 shrink-0"/>}
                        {oTrans?.option_text}
                      </div>
                    )
                  })}
                </div>
                {qTrans?.explanation && (
                  <div className="mt-3 ml-9 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-700"><strong>Explanation: </strong>{qTrans.explanation}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Quiz player ──────────────────────────────────────────────────────────
  const answered = Object.keys(answers).length
  const isLast = idx === questions.length - 1
  const qTrans = getTrans(q?.question_translations)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => { if (window.confirm('Exit quiz? Your progress will be lost.')) navigate(-1) }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={15}/> Exit
        </button>
        {timeLeft !== null && (
          <div className={clsx('flex items-center gap-1.5 font-bold text-sm px-3 py-1.5 rounded-full',
            timeLeft < 60 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700')}>
            <Clock size={14}/> {fmt(timeLeft)}
          </div>
        )}
        <span className="text-sm text-gray-500">Q{idx + 1} / {questions.length}</span>
      </div>

      {/* Progress */}
      <ProgBar value={idx + 1} max={questions.length} className="mb-3"/>
      <div className="flex gap-1 flex-wrap mb-6">
        {questions.map((qq, i) => (
          <button key={qq.id} onClick={() => setIdx(i)}
            className={clsx('w-7 h-7 rounded-full text-xs font-bold transition-all',
              i === idx ? 'bg-blue-600 text-white scale-110'
                : answers[qq.id] ? 'bg-blue-200 text-blue-700'
                : 'bg-gray-200 text-gray-400')}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question */}
      <div className="card p-6 lg:p-8 mb-5" key={q?.id}>
        {q?.image_url && (
          <img src={q.image_url} alt="Question diagram"
            className="w-full max-h-56 object-contain rounded-xl mb-5 bg-gray-50 p-2 border border-gray-200"/>
        )}
        <div className="flex items-center justify-between mb-4">
          <span className="bdg-blue">{q?.question_type?.replace('_', ' ').toUpperCase()}</span>
          <span className="text-xs text-gray-400">{q?.marks || 1} mark{q?.marks !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-lg text-gray-900 leading-relaxed mb-6 font-medium">{qTrans?.question_text}</p>
        {(q?.question_type === 'mcq' || q?.question_type === 'true_false') && (
          <div className="space-y-3">
            {[...(q.answer_options || [])].sort((a, b) => a.order_index - b.order_index).map(opt => {
              const oTrans = getTrans(opt.answer_option_translations)
              const sel = answers[q.id] === opt.id
              return (
                <button key={opt.id} onClick={() => setAnswers(p => ({ ...p, [q.id]: opt.id }))}
                  className={sel ? 'qopt-sel' : 'qopt-idle'}>
                  <div className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                    sel ? 'border-blue-600 bg-blue-600' : 'border-gray-300')}>
                    {sel && <div className="w-2 h-2 rounded-full bg-white"/>}
                  </div>
                  <span className="text-sm leading-relaxed">{oTrans?.option_text}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Btn variant="white" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="gap-2">
          <ArrowLeft size={15}/> Prev
        </Btn>
        <span className="text-xs text-gray-400">
          {answered < questions.length ? `${questions.length - answered} unanswered` : '✓ All answered'}
        </span>
        {isLast ? (
          <Btn variant="blue" onClick={handleSubmit} loading={submitting}>Submit Quiz ✓</Btn>
        ) : (
          <Btn variant="blue" onClick={() => setIdx(i => i + 1)} className="gap-2">
            Next <ArrowRight size={15}/>
          </Btn>
        )}
      </div>

      {!isLast && answered === questions.length && (
        <div className="mt-4 text-center">
          <Btn variant="outline" onClick={handleSubmit} loading={submitting}>
            Submit Now — All Answered ✓
          </Btn>
        </div>
      )}
    </div>
  )
}
