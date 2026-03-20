import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLangStore } from '@/store/langStore'
import { Btn, ProgBar, Field, Txt } from '@/components/ui'
import { ArrowLeft, ArrowRight, Clock, AlertCircle, CheckCircle2, XCircle, Trophy, RotateCcw, MessageSquare, Send, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

// ── Answer review collapsible component ───────────────────────────────────
function AnswerReview({ qs, ans, getTrans }) {
  const [open, setOpen] = useState(false)
  const correct = qs.filter(q => {
    const sel = ans[q.id]
    return sel && (q.answer_options?.find(o => o.id === sel)?.is_correct ?? false)
  }).length

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-900 text-sm">Answer Review</span>
          <span className="text-xs text-gray-500">{correct}/{qs.length} correct</span>
          <span className="flex gap-1">
            {qs.map((q,i) => {
              const sel = ans[q.id]
              const ok = sel && (q.answer_options?.find(o => o.id === sel)?.is_correct ?? false)
              return <span key={i} className={"w-2 h-2 rounded-full " + (ok ? 'bg-green-500' : sel ? 'bg-red-400' : 'bg-gray-300')}/>
            })}
          </span>
        </div>
        <ChevronDown size={16} className={"text-gray-400 transition-transform " + (open ? 'rotate-180' : '')}/>
      </button>
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {qs.map((q, i) => {
            const qTrans = getTrans(q.question_translations)
            const selId = ans[q.id]
            const isCorrect = selId ? (q.answer_options?.find(o => o.id === selId)?.is_correct ?? false) : false
            const notAnswered = !selId
            return (
              <div key={q.id} className={"px-5 py-4 " + (isCorrect ? 'bg-green-50/40' : notAnswered ? '' : 'bg-red-50/40')}>
                <div className="flex items-start gap-3 mb-2.5">
                  <div className={"w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold " +
                    (isCorrect ? 'bg-green-100 text-green-700' : notAnswered ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600')}>
                    {i + 1}
                  </div>
                  <p className="text-sm font-medium text-gray-800 leading-relaxed flex-1">{qTrans?.question_text}</p>
                  {isCorrect ? <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5"/>
                    : notAnswered ? <span className="text-xs text-gray-400 shrink-0 mt-1">Skipped</span>
                    : <XCircle size={16} className="text-red-400 shrink-0 mt-0.5"/>}
                </div>
                <div className="space-y-1 ml-9">
                  {[...(q.answer_options || [])].sort((a, b) => a.order_index - b.order_index).map(opt => {
                    const oTrans = getTrans(opt.answer_option_translations)
                    const wasSel = opt.id === selId
                    return (
                      <div key={opt.id} className={"flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs " +
                        (opt.is_correct ? 'bg-green-100 text-green-800 font-medium'
                          : wasSel ? 'bg-red-100 text-red-700 line-through'
                          : 'text-gray-400')}>
                        {opt.is_correct ? <CheckCircle2 size={11} className="text-green-600 shrink-0"/>
                          : wasSel ? <XCircle size={11} className="text-red-500 shrink-0"/>
                          : <div className="w-2.5 h-2.5 rounded-full border border-gray-200 shrink-0"/>}
                        {oTrans?.option_text}
                      </div>
                    )
                  })}
                </div>
                {qTrans?.explanation && (
                  <div className="mt-2 ml-9 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-700"><strong>Explanation: </strong>{qTrans.explanation}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function QuizPage() {
  const { quizId } = useParams()
  const { user } = useAuthStore()
  const { language } = useLangStore()
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
  const [feedback, setFeedback] = useState({ rating: 0, body: '', name: '', category: '' })
  const [feedbackSent, setFeedbackSent] = useState(false)
  const startedAt = useRef(new Date())
  const timerRef = useRef(null)

  useEffect(() => { fetchQuiz(); return () => clearInterval(timerRef.current) }, [quizId])

  const fetchQuiz = async () => {
    setLoading(true)
    const [qzRes, questRes] = await Promise.all([
      supabase.from('quizzes').select('*, units!quizzes_unit_id_fkey(id, chapter_id, chapters!units_chapter_id_fkey(subject_id))').eq('id', quizId).single(),
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

  // Get translation for current language with English fallback
  const getTrans = (arr = [], langOverride = null) => {
    const lang = langOverride || language || 'english'
    if (!arr || !arr.length) return null
    return arr.find(row => row.language === lang)
        || arr.find(row => row.language === 'english')
        || arr[0]
  }

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
        quiz_id: quizId, student_id: user.id, language: language || 'english',
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
      feedback_type: feedback.category || 'quiz',
      rating: feedback.rating || null,
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

  // ── Result ──────────────────────────────────────────────────────────────
  if (phase === 'result' || phase === 'feedback') {
    const { score, maxScore, pct, passed, questions: qs, answers: ans } = result
    const msg = pct >= 90 ? { t: 'Outstanding! 🏆', c: 'text-amber-500' }
              : pct >= 75 ? { t: 'Great work! 🎉', c: 'text-blue-600' }
              : pct >= 50 ? { t: 'Well done! 👍', c: 'text-blue-500' }
              : { t: 'Keep practising! 💪', c: 'text-gray-600' }
    const R = 48, C = 2 * Math.PI * R
    const correct = qs.filter(q => {
      const sel = ans[q.id]
      return sel && (q.answer_options?.find(o => o.id === sel)?.is_correct ?? false)
    }).length

    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── Score card ── */}
        <div className="card p-5 sm:p-8 text-center animate-scale-in">
          {/* Circle score */}
          <div className="flex justify-center mb-4">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={R} fill="none" stroke="#e5e7eb" strokeWidth="10"/>
                <circle cx="60" cy="60" r={R} fill="none"
                  stroke={passed ? '#2563eb' : '#ef4444'} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C}
                  style={{ transition: 'stroke-dashoffset 1.2s ease' }}/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-bold text-2xl sm:text-3xl text-gray-900">{pct}%</span>
                <span className="text-xs text-gray-400">{score}/{maxScore}</span>
              </div>
            </div>
          </div>
          <h1 className={"font-bold text-xl sm:text-2xl mb-1 " + msg.c}>{msg.t}</h1>
          <p className="text-gray-500 text-sm mb-3">
            You scored <strong className="text-gray-800">{score} out of {maxScore}</strong> marks
            · <span className="font-medium">{correct}/{qs.length}</span> correct
          </p>
          <span className={"inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold " + (passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
            {passed ? <><Trophy size={14}/> Passed!</> : <><RotateCcw size={14}/> Try again</>}
          </span>
          {!user && (
            <p className="mt-4 text-xs text-blue-600 bg-blue-50 rounded-xl px-4 py-2">
              <strong>Save your scores</strong> — <a href="/register" className="underline">Create a free account →</a>
            </p>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Btn variant="white" className="gap-2 justify-center" onClick={() => navigate(-1)}>
            <ArrowLeft size={15}/> Back
          </Btn>
          <Btn variant="white" className="gap-2 justify-center" onClick={() => { setPhase('quiz'); setAnswers({}); setIdx(0); setResult(null); startedAt.current = new Date() }}>
            <RotateCcw size={15}/> Retake
          </Btn>
          {quiz?.unit_id && (
            <Btn variant="blue" className="col-span-2 sm:col-span-1 gap-2 justify-center"
              onClick={() => { const subjectId = quiz?.units?.chapters?.subject_id; if(subjectId) navigate('/subjects/' + subjectId); else navigate(-1) }}>
              Next Unit →
            </Btn>
          )}
        </div>

        {/* ── Answer review (collapsible) ── */}
        <AnswerReview qs={qs} ans={ans} getTrans={getTrans} />

        {/* ── Feedback ── */}
        <div className="card p-5">
          <h2 className="font-bold text-base text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-500"/> Share Feedback
          </h2>
          {feedbackSent ? (
            <div className="text-center py-3">
              <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2"/>
              <p className="font-medium text-gray-800 text-sm">Thank you! 🙏</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Quiz difficulty','Question quality','Explanation clarity','Content accuracy','Technical issue','General'].map(cat => (
                    <button key={cat} type="button" onClick={() => setFeedback(f => ({ ...f, category: cat }))}
                      className={"px-2.5 py-1 rounded-lg text-xs font-medium border-2 transition-all " + (feedback.category === cat
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Rating</p>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} type="button" onClick={() => setFeedback(f => ({ ...f, rating: star }))}
                      className={"text-2xl sm:text-3xl transition-all hover:scale-110 " + (feedback.rating >= star ? 'text-amber-400' : 'text-gray-200')}>
                      ★
                    </button>
                  ))}
                  {feedback.rating > 0 && <span className="text-xs text-gray-400 ml-2">{['','Poor','Fair','Good','Great','Excellent'][feedback.rating]}</span>}
                </div>
              </div>
              <Field label="Your name (optional)" placeholder="Kasun Perera"
                value={feedback.name} onChange={e => setFeedback(f => ({ ...f, name: e.target.value }))}/>
              <Txt label="Comments *" placeholder="Tell us what you thought…"
                value={feedback.body} onChange={e => setFeedback(f => ({ ...f, body: e.target.value }))}
                className="min-h-[70px]"/>
              <Btn variant="blue" onClick={handleFeedback} disabled={!feedback.body.trim()} className="w-full justify-center gap-2">
                <Send size={14}/> Send Feedback
              </Btn>
            </div>
          )}
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
