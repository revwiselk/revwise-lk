import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLangStore } from '@/store/langStore'
import { Btn } from '@/components/ui'
import {
  ArrowLeft, ArrowRight, Clock, CheckCircle2, XCircle,
  Trophy, RotateCcw, ChevronDown, ExternalLink, Video
} from 'lucide-react'
import clsx from 'clsx'

const TYPE_LABEL = { mcq:'MCQ', short_answer:'Short Answer', essay:'Essay', structured:'Structured', fill_blank:'Fill Blank', true_false:'True/False' }

export default function PaperAttemptPage() {
  const { paperId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { language } = useLangStore()

  const [paper, setPaper] = useState(null)
  const [sections, setSections] = useState([])
  const [answers, setAnswers] = useState({})       // { qId: optId }
  const [revealed, setRevealed] = useState({})     // { qId: true } — show explanation
  const [phase, setPhase] = useState('quiz')       // quiz | result
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [activeSection, setActiveSection] = useState(0)
  const [reviewOpen, setReviewOpen] = useState(false)
  const timerRef = useRef(null)
  const startedAt = useRef(new Date())

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    fetchPaper()
    return () => clearInterval(timerRef.current)
  }, [paperId])

  useEffect(() => {
    if (timeLeft === null || phase !== 'quiz') return
    if (timeLeft <= 0) { handleSubmit(); return }
    timerRef.current = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { clearInterval(timerRef.current); return 0 }
      return t - 1
    }), 1000)
    return () => clearInterval(timerRef.current)
  }, [timeLeft !== null ? 'on' : 'off', phase])

  const fetchPaper = async () => {
    setLoading(true)
    const [pRes, sRes] = await Promise.all([
      supabase.from('papers').select('*').eq('id', paperId).single(),
      supabase.from('paper_sections')
        .select(`id, order_index, title, section_type, marks, instructions,
          paper_questions(
            id, order_index, question_text, question_si, question_ta,
            image_url, marks, question_type, model_answer,
            explanation, explanation_si, explanation_ta, video_link,
            paper_options(id, order_index, option_text, option_si, option_ta, is_correct, image_url)
          )`)
        .eq('paper_id', paperId).order('order_index'),
    ])
    if (pRes.data) {
      setPaper(pRes.data)
      if (pRes.data.duration_mins) setTimeLeft(pRes.data.duration_mins * 60)
    }
    const secs = (sRes.data || []).map(s => ({
      ...s,
      questions: (s.paper_questions || []).sort((a,b) => a.order_index - b.order_index).map(q => ({
        ...q,
        paper_options: (q.paper_options || []).sort((a,b) => a.order_index - b.order_index)
      }))
    }))
    setSections(secs)
    setLoading(false)
  }

  const getText = (en, si, ta) => {
    if (language === 'sinhala' && si?.trim()) return si
    if (language === 'tamil'   && ta?.trim()) return ta
    return en || ''
  }

  const getExplanation = (q) => {
    if (language === 'sinhala' && q.explanation_si?.trim()) return q.explanation_si
    if (language === 'tamil'   && q.explanation_ta?.trim()) return q.explanation_ta
    return q.explanation || ''
  }

  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`

  const isMCQ = (t) => t === 'mcq' || t === 'true_false'
  const allMCQQuestions = sections.filter(s => isMCQ(s.section_type)).flatMap(s => s.questions)

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)
    clearInterval(timerRef.current)

    // Score per section type
    let totalScore = 0, totalMax = 0
    const typeBreakdown = {}   // { mcq: {score, max}, short_answer: {score,max}, ...}
    const answerRows = []

    for (const sec of sections) {
      const isM = isMCQ(sec.section_type)
      const typeKey = sec.section_type
      if (!typeBreakdown[typeKey]) typeBreakdown[typeKey] = { score:0, max:0, label: TYPE_LABEL[typeKey]||typeKey }

      for (const q of sec.questions) {
        const marks = q.marks || 1
        typeBreakdown[typeKey].max += marks
        totalMax += marks

        if (isM) {
          const selId = answers[q.id] || null
          const isCorrect = selId ? (q.paper_options?.find(o => o.id === selId)?.is_correct ?? false) : false
          if (isCorrect) { typeBreakdown[typeKey].score += marks; totalScore += marks }
          answerRows.push({ question_id: q.id, option_id: selId, is_correct: isCorrect, marks_awarded: isCorrect ? marks : 0 })
        }
        // Written sections — not auto-scored
      }
    }

    const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
    // Passed if MCQ score >= 50% of total MCQ marks
    const mcqMax = typeBreakdown['mcq']?.max || typeBreakdown['true_false']?.max || totalMax
    const mcqScore = typeBreakdown['mcq']?.score || typeBreakdown['true_false']?.score || totalScore
    const passed = mcqMax > 0 ? (mcqScore / mcqMax) >= 0.5 : false
    const timeTaken = Math.round((new Date() - startedAt.current) / 1000)

    const { data: attempt } = await supabase.from('paper_attempts').insert({
      paper_id: paperId, user_id: user.id, language: language || 'english',
      started_at: startedAt.current.toISOString(),
      submitted_at: new Date().toISOString(),
      score: totalScore, max_score: totalMax, passed, time_taken_seconds: timeTaken,
    }).select().single()

    if (attempt && answerRows.length) {
      await supabase.from('paper_answers').insert(answerRows.map(r => ({ ...r, attempt_id: attempt.id })))
    }

    setResult({ totalScore, totalMax, pct, passed, sections, answers, typeBreakdown })
    setPhase('result')
    setSubmitting(false)
  }, [submitting, answers, sections, paper, user, paperId, language])

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
      {Array(4).fill(0).map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl"/>)}
    </div>
  )

  // ── Result page ────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const { totalScore, totalMax, pct, passed, typeBreakdown } = result
    const msg = pct>=90?{t:'Outstanding! 🏆',c:'text-amber-500'}
              : pct>=75?{t:'Great work! 🎉',c:'text-blue-600'}
              : pct>=50?{t:'Well done! 👍',c:'text-blue-500'}
              : {t:'Keep practising! 💪',c:'text-gray-600'}
    const R = 48, C = 2*Math.PI*R

    const mcqSections = result.sections.filter(s => isMCQ(s.section_type))
    const mcqTotal = mcqSections.flatMap(s=>s.questions).length
    const mcqCorrect = mcqSections.flatMap(s=>s.questions).filter(q=>{
      const sel = result.answers[q.id]
      return sel && (q.paper_options?.find(o=>o.id===sel)?.is_correct??false)
    }).length

    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Score circle */}
        <div className="card p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={R} fill="none" stroke="#e5e7eb" strokeWidth="10"/>
                <circle cx="60" cy="60" r={R} fill="none"
                  stroke={passed?'#2563eb':'#ef4444'} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C-(pct/100)*C}
                  style={{transition:'stroke-dashoffset 1.2s ease'}}/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-bold text-2xl sm:text-3xl text-gray-900">{pct}%</span>
                <span className="text-xs text-gray-400">{totalScore}/{totalMax}</span>
              </div>
            </div>
          </div>
          <h1 className={"font-bold text-xl sm:text-2xl mb-1 "+msg.c}>{msg.t}</h1>
          <p className="text-gray-500 text-sm mb-3">
            {totalScore} out of {totalMax} marks · {mcqCorrect}/{mcqTotal} MCQ correct
          </p>
          <span className={"inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold "+(passed?'bg-green-100 text-green-700':'bg-red-100 text-red-600')}>
            {passed?<><Trophy size={14}/> Passed!</>:<><RotateCcw size={14}/> Failed</>}
          </span>
        </div>

        {/* Per-type breakdown */}
        {Object.keys(typeBreakdown).length > 1 && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3 text-sm">Score Breakdown by Type</h2>
            <div className="space-y-3">
              {Object.entries(typeBreakdown).map(([type, bd]) => {
                const isM = isMCQ(type)
                const pctType = bd.max > 0 ? Math.round((bd.score/bd.max)*100) : null
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="w-24 shrink-0">
                      <p className="text-xs font-semibold text-gray-700">{bd.label}</p>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={clsx('h-full rounded-full transition-all',isM?'bg-blue-500':'bg-amber-400')}
                          style={{width: isM&&pctType!=null ? pctType+'%' : '100%', opacity: isM?1:0.3}}/>
                      </div>
                    </div>
                    <div className="w-24 text-right shrink-0">
                      {isM ? (
                        <span className="text-sm font-bold text-gray-800">{bd.score}/{bd.max}</span>
                      ) : (
                        <span className="text-xs text-amber-600">Written · {bd.max}m</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">Written sections (essay, short answer) are not auto-scored.</p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Btn variant="white" className="justify-center gap-2" onClick={()=>navigate('/papers')}>
            <ArrowLeft size={15}/> Papers
          </Btn>
          <Btn variant="white" className="justify-center gap-2" onClick={()=>navigate(`/papers/${paperId}`)}>
            Back to Paper
          </Btn>
        </div>

        {/* MCQ Review — collapsible */}
        {mcqTotal > 0 && (
          <div className="card overflow-hidden">
            <button onClick={()=>setReviewOpen(!reviewOpen)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <span className="font-semibold text-sm text-gray-900">
                Answer Review — {mcqCorrect}/{mcqTotal} correct
              </span>
              <ChevronDown size={16} className={"text-gray-400 transition-transform "+(reviewOpen?'rotate-180':'')}/>
            </button>

            {reviewOpen && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {mcqSections.map(sec => (
                  <div key={sec.id}>
                    <div className="px-5 py-2 bg-blue-50">
                      <p className="text-xs font-bold text-blue-700 uppercase">{sec.title}</p>
                    </div>
                    {sec.questions.map((q, qi) => {
                      const selId = result.answers[q.id]
                      const isCorrect = selId && (q.paper_options?.find(o=>o.id===selId)?.is_correct??false)
                      const expl = getExplanation(q)
                      return (
                        <div key={q.id} className={"px-5 py-4 "+(isCorrect?'bg-green-50/40':'bg-red-50/30')}>
                          <div className="flex items-start gap-3 mb-2">
                            <div className={"w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 "+(isCorrect?'bg-green-500':'bg-red-400')}>
                              {qi+1}
                            </div>
                            {q.image_url&&<img src={q.image_url} alt="" className="h-14 rounded-lg object-cover mb-1" onError={e=>e.target.style.display='none'}/>}
                            <p className="text-sm font-medium text-gray-800 flex-1 leading-relaxed">
                              {getText(q.question_text, q.question_si, q.question_ta)}
                            </p>
                            {isCorrect ? <CheckCircle2 size={16} className="text-green-500 shrink-0"/> : <XCircle size={16} className="text-red-400 shrink-0"/>}
                          </div>

                          {/* Options */}
                          <div className="space-y-1 ml-9 mb-2">
                            {q.paper_options?.map(opt => {
                              const wasSel = opt.id === selId
                              return (
                                <div key={opt.id} className={"flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs "+
                                  (opt.is_correct?'bg-green-100 text-green-800 font-medium':wasSel?'bg-red-100 text-red-700':'text-gray-400')}>
                                  {opt.is_correct?<CheckCircle2 size={11} className="text-green-600 shrink-0"/>
                                    :wasSel?<XCircle size={11} className="text-red-500 shrink-0"/>
                                    :<div className="w-2.5 h-2.5 rounded-full border border-gray-200 shrink-0"/>}
                                  {opt.image_url&&<img src={opt.image_url} alt="" className="h-8 rounded object-cover" onError={e=>e.target.style.display='none'}/>}
                                  {getText(opt.option_text, opt.option_si, opt.option_ta)}
                                </div>
                              )
                            })}
                          </div>

                          {/* Explanation + video */}
                          {(expl || q.video_link) && (
                            <div className="ml-9 p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-2">
                              {expl && (
                                <p className="text-xs text-purple-800 leading-relaxed">
                                  <strong className="font-semibold">Explanation: </strong>{expl}
                                </p>
                              )}
                              {q.video_link && (
                                <a href={q.video_link} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all">
                                  <Video size={12}/> Watch Video <ExternalLink size={10}/>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Quiz player ────────────────────────────────────────────────────────────
  const sec = sections[activeSection]
  const answeredCount = Object.keys(answers).length
  const totalMCQ = allMCQQuestions.length

  const handleAnswer = (qId, optId) => {
    setAnswers(p => ({...p, [qId]: optId}))
    // Don't auto-reveal — user can click reveal button
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <button onClick={()=>{ if(window.confirm('Exit? Progress will be lost.')) navigate(`/papers/${paperId}`) }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0">
          <ArrowLeft size={14}/> Exit
        </button>
        <p className="font-semibold text-sm text-gray-900 truncate flex-1 min-w-0">{paper?.title}</p>
        {timeLeft !== null && (
          <div className={clsx('flex items-center gap-1 font-bold text-sm px-3 py-1.5 rounded-full shrink-0',
            timeLeft<300?'bg-red-100 text-red-700 animate-pulse':'bg-gray-100 text-gray-700')}>
            <Clock size={13}/>{fmt(timeLeft)}
          </div>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-4 overflow-x-auto">
        {sections.map((s, i) => (
          <button key={s.id} onClick={()=>setActiveSection(i)}
            className={clsx('flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all',
              activeSection===i?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700')}>
            <span className={clsx('w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              activeSection===i?'bg-blue-600 text-white':'bg-gray-300 text-gray-600')}>
              {String.fromCharCode(65+i)}
            </span>
            <span className="hidden sm:inline truncate">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Section */}
      {sec && (
        <div>
          <div className="card p-4 mb-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="font-bold text-gray-900">{sec.title}</h2>
              <span className="bdg-blue text-xs shrink-0">{sec.marks} marks</span>
            </div>
            {sec.instructions && <p className="text-sm text-gray-500 italic">{sec.instructions}</p>}
          </div>

          {/* MCQ section */}
          {isMCQ(sec.section_type) && (
            <div className="space-y-4">
              {sec.questions.map((q, qi) => {
                const sel = answers[q.id]
                const isRevl = revealed[q.id]
                const expl = getExplanation(q)
                return (
                  <div key={q.id} className="card p-4 sm:p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">{qi+1}</span>
                      <div className="flex-1">
                        {q.image_url&&<img src={q.image_url} alt="" className="h-32 rounded-xl border border-gray-200 object-cover mb-2" onError={e=>e.target.style.display='none'}/>}
                        <p className="text-sm font-medium text-gray-900 leading-relaxed">{getText(q.question_text,q.question_si,q.question_ta)}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{q.marks}m</span>
                    </div>
                    <div className="space-y-2">
                      {q.paper_options?.map(opt=>(
                        <button key={opt.id} onClick={()=>handleAnswer(q.id, opt.id)}
                          className={clsx('w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                            sel===opt.id?'border-blue-500 bg-blue-50 text-blue-900':'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50')}>
                          <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                            sel===opt.id?'border-blue-600 bg-blue-600':'border-gray-300')}>
                            {sel===opt.id&&<div className="w-2 h-2 rounded-full bg-white"/>}
                          </div>
                          <div className="flex-1 min-w-0">
                            {opt.image_url&&<img src={opt.image_url} alt="" className="h-12 rounded-lg mb-1 object-cover" onError={e=>e.target.style.display='none'}/>}
                            <span className="text-sm">{getText(opt.option_text,opt.option_si,opt.option_ta)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Reveal explanation button (when answered) */}
                    {sel && (expl || q.video_link) && (
                      <div className="mt-3">
                        {!isRevl ? (
                          <button onClick={()=>setRevealed(r=>({...r,[q.id]:true}))}
                            className="text-xs text-purple-600 hover:underline font-medium">
                            Show explanation →
                          </button>
                        ) : (
                          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-2">
                            {expl&&<p className="text-xs text-purple-800 leading-relaxed"><strong>Explanation: </strong>{expl}</p>}
                            {q.video_link&&(
                              <a href={q.video_link} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all">
                                <Video size={12}/> Watch Video <ExternalLink size={10}/>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Written sections */}
          {!isMCQ(sec.section_type) && (
            <div className="space-y-4">
              {sec.questions.map((q, qi) => (
                <div key={q.id} className="card p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">{qi+1}</span>
                    <div className="flex-1">
                      {q.image_url&&<img src={q.image_url} alt="" className="h-32 rounded-xl border border-gray-200 object-cover mb-2" onError={e=>e.target.style.display='none'}/>}
                      <p className="text-sm font-medium text-gray-900 leading-relaxed mb-3">{getText(q.question_text,q.question_si,q.question_ta)}</p>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-xs text-amber-700 font-medium">📝 Written answer — {q.marks} mark{q.marks!==1?'s':''}</p>
                        <p className="text-xs text-amber-600 mt-0.5">Write your answer in your answer booklet</p>
                      </div>
                      {q.model_answer && (
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:underline">Show model answer</summary>
                          <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed">{q.model_answer}</div>
                        </details>
                      )}
                      {q.video_link && (
                        <a href={q.video_link} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all mt-2">
                          <Video size={12}/> Watch Video <ExternalLink size={10}/>
                        </a>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{q.marks}m</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom nav */}
      <div className="flex items-center justify-between gap-3 mt-6">
        <Btn variant="white" disabled={activeSection===0} onClick={()=>setActiveSection(i=>i-1)} className="gap-2">
          <ArrowLeft size={15}/> Prev
        </Btn>
        <span className="text-xs text-gray-400 text-center">
          {totalMCQ>0?`${answeredCount}/${totalMCQ} MCQ answered`:'Written paper'}
        </span>
        {activeSection < sections.length-1 ? (
          <Btn variant="blue" onClick={()=>setActiveSection(i=>i+1)} className="gap-2">
            Next <ArrowRight size={15}/>
          </Btn>
        ) : (
          <Btn variant="blue" onClick={handleSubmit} loading={submitting} className="gap-2">
            Submit ✓
          </Btn>
        )}
      </div>
    </div>
  )
}
