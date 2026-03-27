import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLangStore } from '@/store/langStore'
import { ArrowLeft, FileText } from 'lucide-react'

const SECTION_LABELS = { mcq:'MCQ', short_answer:'Short Answer', essay:'Essay', structured:'Structured', fill_blank:'Fill Blank', true_false:'True/False' }

export default function PaperViewPage() {
  const { paperId } = useParams()
  const navigate = useNavigate()
  const { language } = useLangStore()
  const [paper, setPaper] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('papers').select('*').eq('id', paperId).single().then(({data}) => setPaper(data))
    supabase.from('paper_sections')
      .select(`*, paper_questions(*, paper_options(*))`)
      .eq('paper_id', paperId).order('order_index')
      .then(({data}) => {
        setSections((data||[]).map(s => ({
          ...s,
          questions: (s.paper_questions||[]).sort((a,b)=>a.order_index-b.order_index).map(q=>({
            ...q, paper_options:(q.paper_options||[]).sort((a,b)=>a.order_index-b.order_index)
          }))
        })))
        setLoading(false)
      })
  }, [paperId])

  const getText = (en, si, ta) => {
    if (language==='sinhala'&&si?.trim()) return si
    if (language==='tamil'&&ta?.trim()) return ta
    return en||''
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-10"><div className="skeleton h-40 rounded-2xl"/></div>

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <button onClick={() => navigate(`/papers/${paperId}`)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-5">
        <ArrowLeft size={14}/> Back
      </button>

      {/* Paper header */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={18} className="text-blue-500"/>
          <h1 className="font-bold text-xl text-gray-900">{paper?.title}</h1>
        </div>
        <p className="text-gray-500 text-sm">{paper?.subject} · Grade {paper?.grade} · {paper?.total_marks} marks</p>
      </div>

      {sections.map((sec, si) => (
        <div key={sec.id} className="mb-8">
          <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
              {String.fromCharCode(65+si)}
            </div>
            <div>
              <p className="font-bold text-gray-900">{sec.title}</p>
              <p className="text-xs text-gray-500">{SECTION_LABELS[sec.section_type]} · {sec.marks} marks</p>
            </div>
          </div>
          {sec.instructions && <p className="text-sm text-gray-500 italic mb-3">{sec.instructions}</p>}
          <div className="space-y-4">
            {sec.questions.map((q, qi) => (
              <div key={q.id} className="card p-4">
                <div className="flex items-start gap-3 mb-2">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 font-bold text-xs flex items-center justify-center shrink-0">{qi+1}</span>
                  <div className="flex-1">
                    {q.image_url && <img src={q.image_url} alt="" className="h-28 rounded-xl border border-gray-200 object-cover mb-2" onError={e=>e.target.style.display='none'}/>}
                    <p className="text-sm font-medium text-gray-900 leading-relaxed">{getText(q.question_text, q.question_si, q.question_ta)}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{q.marks}m</span>
                </div>
                {sec.section_type === 'mcq' && q.paper_options?.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-10">
                    {q.paper_options.map((opt, oi) => (
                      <div key={opt.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                        <span className="font-bold text-gray-500 shrink-0">{String.fromCharCode(65+oi)}.</span>
                        {opt.image_url && <img src={opt.image_url} alt="" className="h-8 rounded object-cover" onError={e=>e.target.style.display='none'}/>}
                        <span className="text-gray-700">{getText(opt.option_text, opt.option_si, opt.option_ta)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {sec.section_type !== 'mcq' && (
                  <div className="ml-10 p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-400 italic">Answer space: {sec.section_type === 'essay' ? '1-2 pages' : '3-5 lines'}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
