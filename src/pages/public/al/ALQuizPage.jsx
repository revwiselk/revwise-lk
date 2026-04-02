import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useLangStore } from '@/store/langStore'
import { ArrowLeft, ArrowRight, Clock, CheckCircle2, XCircle, Trophy, RotateCcw, ChevronDown } from 'lucide-react'
import { Btn } from '@/components/ui'
import clsx from 'clsx'

export default function ALQuizPage() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { language } = useLangStore()

  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState('quiz')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const startedAt = useRef(new Date())

  useEffect(() => {
    Promise.all([
      supabase.from('al_quizzes').select('*, al_sub_units(title)').eq('id',quizId).single(),
      supabase.from('al_questions')
        .select('*, al_question_translations(*), al_answer_options(*, al_answer_option_translations(*))')
        .eq('quiz_id',quizId).eq('status','published').order('order_index'),
    ]).then(([qzRes,questRes])=>{
      if(qzRes.data) setQuiz(qzRes.data)
      setQuestions(questRes.data||[])
      setLoading(false)
    })
  }, [quizId])

  const getTrans = (arr) => {
    if(!arr||!arr.length) return null
    return arr.find(r=>r.language===language)||arr.find(r=>r.language==='english')||arr[0]
  }

  const handleSubmit = useCallback(async () => {
    if(submitting) return
    setSubmitting(true)
    let score=0, maxScore=0
    const rows=[]
    for(const q of questions){
      const marks=q.marks||1; maxScore+=marks
      const selId=answers[q.id]||null
      const isCorrect=selId?(q.al_answer_options?.find(o=>o.id===selId)?.is_correct??false):false
      if(isCorrect) score+=marks
      rows.push({question_id:q.id,selected_option_id:selId,is_correct:isCorrect,marks_awarded:isCorrect?marks:0})
    }
    const pct=maxScore>0?Math.round((score/maxScore)*100):0
    const passed=pct>=(quiz?.pass_mark_percent||50)
    const timeTaken=Math.round((new Date()-startedAt.current)/1000)
    if(user){
      const{data:att}=await supabase.from('al_quiz_attempts').insert({quiz_id:quizId,student_id:user.id,language:language||'english',score,max_score:maxScore,passed,time_taken_seconds:timeTaken}).select().single()
    }
    setResult({score,maxScore,pct,passed,questions,answers})
    setPhase('result')
    setSubmitting(false)
  }, [submitting,answers,questions,quiz,user,quizId,language])

  if(loading) return <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">{Array(3).fill(0).map((_,i)=><div key={i} className="skeleton h-24 rounded-2xl"/>)}</div>
  if(!quiz||!questions.length) return <div className="max-w-xl mx-auto py-20 text-center px-4"><p className="text-gray-500 mb-4">No questions available.</p><Btn variant="white" onClick={()=>navigate(-1)}>Go Back</Btn></div>

  if(phase==='result'&&result){
    const {score,maxScore,pct,passed}=result
    const msg=pct>=90?{t:'Outstanding! 🏆',c:'text-amber-500'}:pct>=75?{t:'Great work! 🎉',c:'text-blue-600'}:pct>=50?{t:'Well done! 👍',c:'text-blue-500'}:{t:'Keep studying! 💪',c:'text-gray-600'}
    const R=48,C=2*Math.PI*R
    const correct=result.questions.filter(q=>{const sel=result.answers[q.id];return sel&&(q.al_answer_options?.find(o=>o.id===sel)?.is_correct??false)}).length

    return(
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="card p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={R} fill="none" stroke="#e5e7eb" strokeWidth="10"/>
                <circle cx="60" cy="60" r={R} fill="none" stroke={passed?'#7c3aed':'#ef4444'} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C-(pct/100)*C} style={{transition:'stroke-dashoffset 1.2s ease'}}/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-bold text-2xl text-gray-900">{pct}%</span>
                <span className="text-xs text-gray-400">{score}/{maxScore}</span>
              </div>
            </div>
          </div>
          <h1 className={"font-bold text-xl mb-1 "+msg.c}>{msg.t}</h1>
          <p className="text-gray-500 text-sm mb-3">{score}/{maxScore} marks · {correct}/{result.questions.length} correct</p>
          <span className={"inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold "+(passed?'bg-green-100 text-green-700':'bg-red-100 text-red-600')}>
            {passed?<><Trophy size={14}/>Passed!</>:<><RotateCcw size={14}/>Failed</>}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Btn variant="white" className="justify-center" onClick={()=>navigate(-1)}><ArrowLeft size={15}/>Back</Btn>
          <Btn variant="white" className="justify-center" onClick={()=>{setPhase('quiz');setAnswers({});setIdx(0);setResult(null);startedAt.current=new Date()}}><RotateCcw size={15}/>Retake</Btn>
        </div>
        {/* Answer Review */}
        <div className="card overflow-hidden">
          <button onClick={()=>setReviewOpen(!reviewOpen)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50">
            <span className="font-semibold text-sm text-gray-900">Answer Review — {correct}/{result.questions.length}</span>
            <ChevronDown size={16} className={"text-gray-400 transition-transform "+(reviewOpen?'rotate-180':'')}/>
          </button>
          {reviewOpen && <div className="border-t border-gray-100 divide-y divide-gray-50">
            {result.questions.map((q,i)=>{
              const qTrans=getTrans(q.al_question_translations)
              const selId=result.answers[q.id]
              const isCorrect=selId&&(q.al_answer_options?.find(o=>o.id===selId)?.is_correct??false)
              return(
                <div key={q.id} className={"px-5 py-4 "+(isCorrect?'bg-green-50/40':'bg-red-50/30')}>
                  <div className="flex items-start gap-3 mb-2">
                    <div className={"w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 "+(isCorrect?'bg-green-500':'bg-red-400')}>{i+1}</div>
                    <p className="text-sm font-medium text-gray-800 flex-1">{qTrans?.question_text}</p>
                    {isCorrect?<CheckCircle2 size={15} className="text-green-500 shrink-0"/>:<XCircle size={15} className="text-red-400 shrink-0"/>}
                  </div>
                  <div className="space-y-1 ml-9">
                    {q.al_answer_options?.map(opt=>{
                      const oTrans=getTrans(opt.al_answer_option_translations)
                      const wasSel=opt.id===selId
                      return(
                        <div key={opt.id} className={"flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs "+(opt.is_correct?'bg-green-100 text-green-800 font-medium':wasSel?'bg-red-100 text-red-700':'text-gray-400')}>
                          {opt.is_correct?<CheckCircle2 size={11} className="text-green-600 shrink-0"/>:wasSel?<XCircle size={11} className="text-red-500 shrink-0"/>:<div className="w-2.5 h-2.5 rounded-full border border-gray-200 shrink-0"/>}
                          {oTrans?.option_text}
                        </div>
                      )
                    })}
                  </div>
                  {qTrans?.explanation&&<div className="ml-9 mt-2 p-2 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-800"><strong>Explanation: </strong>{qTrans.explanation}</div>}
                </div>
              )
            })}
          </div>}
        </div>
      </div>
    )
  }

  const q=questions[idx]
  const qTrans=getTrans(q?.al_question_translations)
  const sel=answers[q?.id]
  const answered=Object.keys(answers).length
  const isLast=idx===questions.length-1

  return(
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={()=>{if(window.confirm('Exit quiz?'))navigate(-1)}} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={14}/>Exit</button>
        <span className="text-sm text-gray-500">Q{idx+1}/{questions.length}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-violet-500 rounded-full transition-all" style={{width:`${((idx+1)/questions.length)*100}%`}}/>
      </div>
      <div className="flex gap-1 mb-4 flex-wrap">
        {questions.map((qq,i)=>(
          <button key={qq.id} onClick={()=>setIdx(i)} className={clsx('w-7 h-7 rounded-full text-xs font-bold transition-all',i===idx?'bg-violet-600 text-white scale-110':answers[qq.id]?'bg-violet-200 text-violet-700':'bg-gray-200 text-gray-400')}>{i+1}</button>
        ))}
      </div>
      <div className="card p-5 sm:p-6 mb-4">
        {q?.image_url&&<img src={q.image_url} alt="" className="h-36 rounded-xl border border-gray-200 object-cover mb-4" onError={e=>e.target.style.display='none'}/>}
        <p className="text-lg font-medium text-gray-900 leading-relaxed mb-5">{qTrans?.question_text}</p>
        <div className="space-y-3">
          {q?.al_answer_options?.sort((a,b)=>a.order_index-b.order_index).map(opt=>{
            const oTrans=getTrans(opt.al_answer_option_translations)
            return(
              <button key={opt.id} onClick={()=>setAnswers(p=>({...p,[q.id]:opt.id}))}
                className={clsx('w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all',sel===opt.id?'border-violet-500 bg-violet-50 text-violet-900':'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50')}>
                <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',sel===opt.id?'border-violet-600 bg-violet-600':'border-gray-300')}>
                  {sel===opt.id&&<div className="w-2 h-2 rounded-full bg-white"/>}
                </div>
                <span className="text-sm">{oTrans?.option_text}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Btn variant="white" onClick={()=>setIdx(i=>Math.max(0,i-1))} disabled={idx===0} className="gap-2"><ArrowLeft size={15}/>Prev</Btn>
        <span className="text-xs text-gray-400">{answered<questions.length?`${questions.length-answered} unanswered`:'✓ All answered'}</span>
        {isLast?<Btn variant="blue" onClick={handleSubmit} loading={submitting}>Submit ✓</Btn>:<Btn variant="blue" onClick={()=>setIdx(i=>i+1)} className="gap-2">Next<ArrowRight size={15}/></Btn>}
      </div>
      {!isLast&&answered===questions.length&&(
        <div className="mt-3 text-center"><Btn variant="outline" onClick={handleSubmit} loading={submitting}>Submit Now ✓</Btn></div>
      )}
    </div>
  )
}
