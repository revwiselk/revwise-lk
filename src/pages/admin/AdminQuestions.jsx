import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabaseAdmin, supabase } from '@/lib/supabase'
import { Btn, Field, Sel, Txt, Modal, Badge, PageHead, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, ArrowLeft, HelpCircle, CheckCircle2, Upload, Download, AlertCircle, X, Image } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import ExcelJS from 'exceljs'

const LANGS = ['english','sinhala','tamil']
const Q_TYPES = ['mcq','true_false']
const STATUS_OPTS = ['draft','published','archived']

const emptyOpt = (i) => ({
  _id: Math.random().toString(36).slice(2),
  order_index: i, is_correct: false, image_url: '',
  translations: { english:'', sinhala:'', tamil:'' },
})

const emptyQ = () => ({
  question_type:'mcq', order_index:1, marks:1, image_url:'', status:'published',
  translations: { english:{ text:'', explanation:'' }, sinhala:{ text:'', explanation:'' }, tamil:{ text:'', explanation:'' } },
  options: [emptyOpt(1), emptyOpt(2), emptyOpt(3), emptyOpt(4)],
})

function parseExcelRows(rows) {
  return rows.map((row, i) => {
    const options = [1,2,3,4].map(n => ({
      _id: Math.random().toString(36).slice(2),
      order_index: n, image_url: '',
      is_correct: String(row[`option${n}_correct`] || '').toLowerCase() === 'true' || row[`option${n}_correct`] === 1 || row[`option${n}_correct`] === true,
      translations: {
        english: String(row[`option${n}_en`] || ''),
        sinhala: String(row[`option${n}_si`] || ''),
        tamil:   String(row[`option${n}_ta`] || ''),
      },
    })).filter(o => o.translations.english.trim())
    return {
      question_type: row.question_type || 'mcq',
      order_index: i + 1,
      marks: parseInt(row.marks) || 1,
      status: row.status || 'published',
      image_url: '',
      translations: {
        english: { text: String(row.question_en || ''), explanation: String(row.explanation_en || '') },
        sinhala: { text: String(row.question_si || ''), explanation: String(row.explanation_si || '') },
        tamil:   { text: String(row.question_ta || ''), explanation: String(row.explanation_ta || '') },
      },
      options,
      _rowNum: i + 2,
    }
  }).filter(q => q.translations.english.text.trim())
}

// ── Image preview with clear button ──────────────────────────────────────────
function ImagePreview({ url, onClear, size = 'md' }) {
  if (!url?.trim()) return null
  const h = size === 'sm' ? 'h-14' : 'h-24'
  return (
    <div className="relative inline-block mt-2">
      <img src={url} alt="preview"
        className={`${h} rounded-xl border border-gray-200 object-cover bg-gray-50`}
        onError={e => { e.target.style.display = 'none' }}/>
      <button type="button" onClick={onClear}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600">
        <X size={10}/>
      </button>
    </div>
  )
}

// ── Image URL input with preview ──────────────────────────────────────────────
function ImageField({ label, value, onChange }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Image size={12} className="text-gray-400"/>
        <label className="text-xs font-medium text-gray-500">{label}</label>
      </div>
      <input
        type="url"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="https://..."
        className="inp text-sm py-1.5 w-full"
      />
      <ImagePreview url={value} onClear={() => onChange('')} size="sm"/>
    </div>
  )
}

export default function AdminQuestions() {
  const { unitId } = useParams()
  const navigate = useNavigate()
  const fileRef = useRef()
  const [unit, setUnit] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [activeLang, setActiveLang] = useState('english')
  const [form, setForm] = useState(emptyQ())
  const [importPreview, setImportPreview] = useState(null)
  const [importModal, setImportModal] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => { fetchData() }, [unitId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: unitData, error: unitErr } = await supabase
        .from('units')
        .select('id, title, chapter_id, chapters(title, subjects(name, grade))')
        .eq('id', unitId).single()
      if (unitErr) { toast.error('Unit not found: ' + unitErr.message); setLoading(false); return }
      if (unitData) setUnit(unitData)

      let quizData = null
      const { data: qzData, error: qzErr } = await supabase
        .from('quizzes').select('id, quiz_type, pass_mark_percent, time_limit_seconds, max_attempts, is_active')
        .eq('unit_id', unitId).maybeSingle()
      if (qzErr) { toast.error('Quiz error: ' + qzErr.message); setLoading(false); return }

      if (qzData) {
        quizData = qzData
      } else {
        const { data: newQuiz, error: createErr } = await supabase
          .from('quizzes').insert({ unit_id: unitId, quiz_type: 'practice', pass_mark_percent: 50, is_active: true })
          .select().single()
        if (createErr) { toast.error('Could not create quiz: ' + createErr.message) }
        else { quizData = newQuiz }
      }

      if (quizData) {
        setQuiz(quizData)
        // Fetch questions — include image_url on answer_options
        const { data: qData } = await supabase
          .from('questions')
          .select(`
            id, question_type, order_index, marks, status, image_url,
            question_translations(language, question_text, explanation),
            answer_options(
              id, is_correct, order_index, image_url,
              answer_option_translations(language, option_text)
            )
          `)
          .eq('quiz_id', quizData.id)
          .order('order_index')
        setQuestions(qData || [])
      }
    } catch (err) { toast.error('Error: ' + err.message) }
    setLoading(false)
  }

  const openCreate = () => {
    setEditing(null); setActiveLang('english')
    const q = emptyQ(); q.order_index = questions.length + 1
    setForm(q); setModalOpen(true)
  }

  const openEdit = (q) => {
    setEditing(q); setActiveLang('english')
    const trans = { english:{ text:'', explanation:'' }, sinhala:{ text:'', explanation:'' }, tamil:{ text:'', explanation:'' } }
    ;(q.question_translations || []).forEach(t => {
      trans[t.language] = { text: t.question_text||'', explanation: t.explanation||'' }
    })
    // Build options — include image_url from DB
    const options = [...(q.answer_options || [])].sort((a,b) => a.order_index - b.order_index).map(o => ({
      id: o.id, _id: o.id,
      order_index: o.order_index,
      is_correct: o.is_correct,
      image_url: o.image_url || '',                      // ← load option image
      translations: { english:'', sinhala:'', tamil:'' },
    }))
    ;(q.answer_options || []).forEach(o => {
      const opt = options.find(x => x._id === o.id)
      if (opt) (o.answer_option_translations || []).forEach(t => { opt.translations[t.language] = t.option_text })
    })
    setForm({
      question_type: q.question_type, order_index: q.order_index,
      marks: q.marks, image_url: q.image_url||'',        // ← load question image
      status: q.status||'published', translations: trans, options,
    })
    setModalOpen(true)
  }

  // Save a single question (create or update)
  const saveQuestion = async (f, qId = null) => {
    if (!f.translations.english.text.trim()) throw new Error('English question text is required')
    if (!f.options.some(o => o.is_correct)) throw new Error('Please mark one option as correct')
    if (!quiz) throw new Error('No quiz found')

    const qPayload = {
      quiz_id: quiz.id,
      question_type: f.question_type,
      order_index: parseInt(f.order_index)||1,
      marks: parseInt(f.marks)||1,
      image_url: f.image_url?.trim() || null,            // ← save question image
      status: f.status||'published',
    }

    let questionId = qId
    if (qId) {
      const { error } = await supabaseAdmin.from('questions').update(qPayload).eq('id', qId)
      if (error) throw new Error(error.message)
    } else {
      const { data, error } = await supabaseAdmin.from('questions').insert(qPayload).select().single()
      if (error) throw new Error(error.message)
      questionId = data.id
    }

    // Save translations
    for (const lang of LANGS) {
      const t = f.translations[lang]
      if (!t.text.trim()) continue
      await supabaseAdmin.from('question_translations').upsert({
        question_id: questionId, language: lang,
        question_text: t.text.trim(),
        explanation: t.explanation?.trim() || null,
      }, { onConflict: 'question_id,language' })
    }

    // Delete old options, insert new with image_url
    await supabaseAdmin.from('answer_options').delete().eq('question_id', questionId)
    for (const opt of f.options) {
      const { data: newOpt, error: optErr } = await supabaseAdmin.from('answer_options').insert({
        question_id: questionId,
        is_correct: opt.is_correct,
        order_index: opt.order_index,
        image_url: opt.image_url?.trim() || null,        // ← save option image
      }).select().single()

      if (optErr || !newOpt) continue

      const rows = LANGS
        .filter(l => opt.translations[l]?.trim())
        .map(l => ({ answer_option_id: newOpt.id, language: l, option_text: opt.translations[l].trim() }))
      if (rows.length) await supabaseAdmin.from('answer_option_translations').insert(rows)
    }
    return questionId
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveQuestion(form, editing?.id)
      toast.success(editing ? 'Question updated' : 'Question created')
      setModalOpen(false); fetchData()
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    await supabaseAdmin.from('questions').delete().eq('id', id)
    toast.success('Deleted'); setDeleteConfirm(null); fetchData()
  }

  // ── Excel ─────────────────────────────────────────────────────────────────
  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Questions')
    const headers = [
      'question_type','marks','status',
      'question_en','question_si','question_ta',
      'explanation_en','explanation_si','explanation_ta',
      'option1_en','option1_si','option1_ta','option1_correct',
      'option2_en','option2_si','option2_ta','option2_correct',
      'option3_en','option3_si','option3_ta','option3_correct',
      'option4_en','option4_si','option4_ta','option4_correct',
    ]
    ws.columns = headers.map(h => ({ header: h, key: h, width: 22 }))
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    })
    ws.addRow({
      question_type:'mcq', marks:1, status:'published',
      question_en:'What is the capital of Sri Lanka?',
      option1_en:'Colombo', option1_si:'Colombo', option1_ta:'Colombo', option1_correct:'false',
      option2_en:'Sri Jayawardenepura Kotte', option2_si:'Sri Jayawardenepura Kotte', option2_ta:'Sri Jayawardenepura Kotte', option2_correct:'true',
      option3_en:'Kandy', option3_si:'Kandy', option3_ta:'Kandy', option3_correct:'false',
      option4_en:'Galle', option4_si:'Galle', option4_ta:'Galle', option4_correct:'false',
    })
    const buf = await wb.xlsx.writeBuffer()
    const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const a = document.createElement('a'); a.href = url; a.download = 'revwise_questions_template.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const ws = wb.worksheets[0]
      const headerRow = ws.getRow(1).values
      const headers = Array.isArray(headerRow) ? headerRow.slice(1) : []
      const rows = []
      ws.eachRow((row, rowNum) => {
        if (rowNum === 1) return
        const obj = {}
        row.values.forEach((val, ci) => {
          if (ci === 0) return
          const h = headers[ci-1]
          if (h) obj[h] = val === null || val === undefined ? '' : val
        })
        rows.push(obj)
      })
      setImportPreview(parseExcelRows(rows))
      setImportModal(true)
    } catch (err) { toast.error('Failed to read file: ' + err.message) }
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!importPreview?.length) return
    setImporting(true)
    let ok = 0, fail = 0
    for (const q of importPreview) {
      try { await saveQuestion({ ...q, order_index: questions.length + ok + 1 }); ok++ }
      catch { fail++ }
    }
    toast.success(`Imported ${ok} questions${fail ? `, ${fail} failed` : ''}`)
    setImporting(false); setImportModal(false); setImportPreview(null); fetchData()
  }

  const handleTypeChange = (type) => {
    let opts = form.options
    if (type === 'true_false') {
      opts = [
        { _id:'tf1', order_index:1, is_correct:true,  image_url:'', translations:{ english:'True',  sinhala:'සත්‍ය',  tamil:'உண்மை' } },
        { _id:'tf2', order_index:2, is_correct:false, image_url:'', translations:{ english:'False', sinhala:'අසත්‍ය', tamil:'பொய்' } },
      ]
    }
    setForm(f => ({ ...f, question_type:type, options:opts }))
  }

  const setCorrect = (_id) =>
    setForm(f => ({ ...f, options: f.options.map(o => ({ ...o, is_correct: o._id === _id })) }))

  const setOptTrans = (_id, lang, val) =>
    setForm(f => ({ ...f, options: f.options.map(o => o._id === _id ? { ...o, translations:{ ...o.translations, [lang]:val } } : o) }))

  const setOptImage = (_id, url) =>
    setForm(f => ({ ...f, options: f.options.map(o => o._id === _id ? { ...o, image_url: url } : o) }))

  const curTrans = form.translations[activeLang]
  const getEngText = (q) => q.question_translations?.find(t => t.language==='english')?.question_text || '—'

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <ArrowLeft size={16}/> Back to Units
      </button>

      <PageHead
        crumb={`${unit?.chapters?.subjects?.name} › ${unit?.chapters?.title} › ${unit?.title}`}
        title="Quiz Questions"
        sub={`${questions.length} questions · Pass mark: ${quiz?.pass_mark_percent || 50}%`}
        action={
          <div className="flex flex-wrap gap-2">
            <Btn variant="white" onClick={downloadTemplate} className="gap-2"><Download size={15}/> Template</Btn>
            <Btn variant="white" onClick={() => fileRef.current?.click()} className="gap-2"><Upload size={15}/> Import</Btn>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange}/>
            <Btn variant="blue" onClick={openCreate} className="gap-2"><Plus size={16}/> Add Question</Btn>
          </div>
        }/>

      {quiz && (
        <div className="card p-4 mb-6 flex items-center gap-6 flex-wrap">
          {[
            { label:'Type',        value:quiz.quiz_type },
            { label:'Pass mark',   value:`${quiz.pass_mark_percent}%` },
            { label:'Time limit',  value:quiz.time_limit_seconds ? `${Math.round(quiz.time_limit_seconds/60)} min` : 'Unlimited' },
            { label:'Max attempts',value:quiz.max_attempts || 'Unlimited' },
          ].map(i => (
            <div key={i.label} className="text-center">
              <div className="text-xs text-gray-400 mb-0.5">{i.label}</div>
              <div className="font-bold text-sm text-gray-800">{i.value}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_,i) => <div key={i} className="skeleton h-20"/>)}</div>
      ) : questions.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No questions" desc="Add questions manually or import from Excel."/>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => {
            const correct = q.answer_options?.find(o => o.is_correct)
            const correctText = correct?.answer_option_translations?.find(t => t.language==='english')?.option_text || '—'
            return (
              <div key={q.id} className="card p-4 sm:p-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">{i+1}</div>
                  <div className="flex-1 min-w-0">
                    {/* Question image thumbnail */}
                    {q.image_url && (
                      <img src={q.image_url} alt="" className="h-16 rounded-lg border border-gray-200 object-cover mb-2"
                        onError={e => { e.target.style.display='none' }}/>
                    )}
                    <p className="text-sm font-medium text-gray-900 mb-2 leading-relaxed line-clamp-2">{getEngText(q)}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge color="blue">{q.question_type.toUpperCase()}</Badge>
                      <Badge color="gray">{q.marks} mark{q.marks !== 1 ? 's' : ''}</Badge>
                      <Badge color={q.status === 'published' ? 'green' : 'amber'}>{q.status}</Badge>
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 size={12}/>{correctText}
                        {correct?.image_url && <Image size={11} className="text-gray-400 ml-1"/>}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(q)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"><Edit2 size={15}/></button>
                    <button onClick={() => setDeleteConfirm(q)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={15}/></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Question Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Question' : 'Add Question'} size="xl">
        <div className="space-y-5">

          {/* Basic fields */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Sel label="Type" value={form.question_type} onChange={e => handleTypeChange(e.target.value)}>
              {Q_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ').toUpperCase()}</option>)}
            </Sel>
            <Field label="Order" type="number" min="1" value={form.order_index}
              onChange={e => setForm(f => ({ ...f, order_index:e.target.value }))}/>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Marks" type="number" min="1" value={form.marks}
                onChange={e => setForm(f => ({ ...f, marks:e.target.value }))}/>
              <Sel label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status:e.target.value }))}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </Sel>
            </div>
          </div>

          {/* ── Question image ── */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Image size={13}/> Question Image (optional)
            </p>
            <Field placeholder="Paste image URL here — https://..." value={form.image_url}
              onChange={e => setForm(f => ({ ...f, image_url:e.target.value }))}/>
            <ImagePreview url={form.image_url} onClear={() => setForm(f => ({...f, image_url:''}))}/>
          </div>

          {/* ── Language tabs + text ── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Question Text & Explanation</p>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-3 w-fit">
              {LANGS.map(lang => (
                <button key={lang} type="button" onClick={() => setActiveLang(lang)}
                  className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    activeLang === lang ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                  {lang === 'english' ? 'EN' : lang === 'sinhala' ? 'SI' : 'TA'}
                  {form.translations[lang]?.text?.trim() && <span className="ml-1 text-green-500 text-xs">✓</span>}
                </button>
              ))}
            </div>
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
              <Txt label={`Question Text${activeLang==='english'?' *':''}`} placeholder="Enter question…"
                value={curTrans.text}
                onChange={e => setForm(f => ({ ...f, translations:{ ...f.translations, [activeLang]:{ ...f.translations[activeLang], text:e.target.value } } }))}
                className="min-h-[80px]"/>
              <Field label="Explanation (shown after answer)" placeholder="Why is this correct?"
                value={curTrans.explanation}
                onChange={e => setForm(f => ({ ...f, translations:{ ...f.translations, [activeLang]:{ ...f.translations[activeLang], explanation:e.target.value } } }))}/>
            </div>
          </div>

          {/* ── Answer Options ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Answer Options</p>
              {form.question_type === 'mcq' && (
                <Btn variant="ghost" size="sm"
                  onClick={() => setForm(f => ({ ...f, options:[...f.options, emptyOpt(f.options.length+1)] }))}
                  className="gap-1 text-xs">
                  <Plus size={12}/> Add Option
                </Btn>
              )}
            </div>
            <div className="space-y-3">
              {form.options.map((opt, oi) => (
                <div key={opt._id} className={clsx('p-3 rounded-xl border-2 transition-all',
                  opt.is_correct ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white')}>

                  {/* Option header */}
                  <div className="flex items-center gap-2 mb-3">
                    <button type="button" onClick={() => setCorrect(opt._id)}
                      className={clsx('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                        opt.is_correct ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-blue-400')}>
                      {opt.is_correct && <div className="w-2 h-2 rounded-full bg-white"/>}
                    </button>
                    <span className={clsx('text-xs font-semibold', opt.is_correct ? 'text-green-700' : 'text-gray-500')}>
                      Option {oi+1}{opt.is_correct ? ' ✓ Correct' : ''}
                    </span>
                    {form.question_type === 'mcq' && form.options.length > 2 && (
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, options:f.options.filter(o => o._id!==opt._id) }))}
                        className="ml-auto p-1 text-gray-300 hover:text-red-500 transition-colors">
                        <X size={13}/>
                      </button>
                    )}
                  </div>

                  {/* Option translations */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                    {LANGS.map(lang => (
                      <Field key={lang}
                        label={lang==='english'?'EN *':lang==='sinhala'?'SI':'TA'}
                        placeholder={`Option in ${lang}`}
                        value={opt.translations[lang]||''}
                        onChange={e => setOptTrans(opt._id, lang, e.target.value)}/>
                    ))}
                  </div>

                  {/* Option image */}
                  <ImageField
                    label="Option Image (optional)"
                    value={opt.image_url||''}
                    onChange={url => setOptImage(opt._id, url)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <Btn variant="white" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={handleSave}>
              {editing ? 'Save Changes' : 'Create Question'}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Excel import preview */}
      <Modal open={importModal} onClose={() => { setImportModal(false); setImportPreview(null) }}
        title="Import Questions" size="xl">
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
            <AlertCircle size={16} className="text-blue-600 shrink-0"/>
            <p className="text-sm text-blue-700">Found <strong>{importPreview?.length || 0} questions</strong>. Review and confirm.</p>
          </div>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {(importPreview || []).slice(0,20).map((q, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Badge color="blue">{q.question_type}</Badge>
                  <Badge color="gray">{q.marks} mark{q.marks!==1?'s':''}</Badge>
                  {!q.options.some(o => o.is_correct) && <Badge color="red">⚠ No correct answer</Badge>}
                </div>
                <p className="text-sm text-gray-800 truncate">{q.translations.english.text}</p>
              </div>
            ))}
            {(importPreview?.length||0)>20 && <p className="text-xs text-gray-400 text-center">+{importPreview.length-20} more</p>}
          </div>
          <div className="flex gap-3">
            <Btn variant="white" className="flex-1" onClick={() => { setImportModal(false); setImportPreview(null) }}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={importing} onClick={handleImport}>
              Import {importPreview?.length||0} Questions
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Question" size="sm">
        <p className="text-gray-600 mb-5">Delete this question? This cannot be undone.</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={() => handleDelete(deleteConfirm?.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}
