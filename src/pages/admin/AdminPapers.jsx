import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '@/lib/supabase'
import { Btn, Field, Sel, Txt, Modal, Badge, PageHead, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, ChevronRight, FileText, FileDown, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const GRADES = ['6','7','8','9','10','11']
const SUBJECTS = ['Science','Mathematics','Sinhala','English','Tamil','History','Geography','Health','Civics','Religion','ICT','Art']
const TYPES = ['past_paper','model_paper','term_test','mock_exam','sample']
const TYPE_LABELS = { past_paper:'Past Paper', model_paper:'Model Paper', term_test:'Term Test', mock_exam:'Mock Exam', sample:'Sample' }
const TYPE_COLORS = { past_paper:'blue', model_paper:'green', term_test:'amber', mock_exam:'red', sample:'gray' }

const blankForm = () => ({
  grade:'6', subject:'Science', paper_type:'past_paper', year:'', term:'',
  title:'', description:'', duration_mins:'', total_marks:'100', is_active:true, pdf_url:''
})

export default function AdminPapers() {
  const navigate = useNavigate()
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterGrade, setFilterGrade] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState(blankForm())

  useEffect(() => { fetchPapers() }, [])

  const fetchPapers = async () => {
    setLoading(true)
    const { data } = await supabaseAdmin.from('papers')
      .select('id, grade, subject, paper_type, year, term, title, is_active, total_marks, duration_mins, pdf_url, paper_sections(id)')
      .order('grade').order('subject').order('year', { ascending: false })
    setPapers(data || [])
    setLoading(false)
  }

  const openCreate = () => { setEditing(null); setForm(blankForm()); setModalOpen(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({ grade:String(p.grade), subject:p.subject, paper_type:p.paper_type, year:p.year||'', term:p.term||'',
      title:p.title, description:p.description||'', duration_mins:p.duration_mins||'', total_marks:p.total_marks||100, is_active:p.is_active, pdf_url:p.pdf_url||'' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    setSaving(true)
    const payload = {
      grade: form.grade, subject: form.subject, paper_type: form.paper_type,
      year: form.year ? parseInt(form.year) : null,
      term: form.term ? parseInt(form.term) : null,
      title: form.title.trim(), description: form.description||null,
      duration_mins: form.duration_mins ? parseInt(form.duration_mins) : null,
      total_marks: parseInt(form.total_marks)||100,
      is_active: form.is_active,
      pdf_url: form.pdf_url?.trim() || null,
    }
    if (editing) {
      const {error} = await supabaseAdmin.from('papers').update(payload).eq('id', editing.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Paper updated')
    } else {
      const {error} = await supabaseAdmin.from('papers').insert(payload)
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Paper created')
    }
    setSaving(false); setModalOpen(false); fetchPapers()
  }

  const handleDelete = async (id) => {
    const {error} = await supabaseAdmin.from('papers').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted'); setDeleteConfirm(null); fetchPapers()
  }

  const f = (p) => {
    if (filterGrade !== 'all' && String(p.grade) !== filterGrade) return false
    if (filterType !== 'all' && p.paper_type !== filterType) return false
    return true
  }
  const filtered = papers.filter(f)

  return (
    <div>
      <PageHead title="Papers" sub={`${papers.length} papers`}
        action={<Btn variant="blue" onClick={openCreate} className="gap-2"><Plus size={16}/> Add Paper</Btn>}/>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {['all',...GRADES].map(g => (
            <button key={g} onClick={() => setFilterGrade(g)}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                filterGrade===g?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700')}>
              {g==='all'?'All':('G'+g)}
            </button>
          ))}
        </div>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="inp text-sm py-2 w-40">
          <option value="all">All Types</option>
          {TYPES.map(t=><option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array(5).fill(0).map((_,i)=><div key={i} className="skeleton h-16"/>)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No papers" desc="Add your first paper."/>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Title','Grade','Type','Year','PDF','Sections','Marks','Status','Actions'].map(h=>(
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p=>(
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                      <p className="truncate">{p.title}</p>
                      <p className="text-xs text-gray-400">{p.subject}</p>
                    </td>
                    <td className="px-4 py-3"><Badge color="blue">G{p.grade}</Badge></td>
                    <td className="px-4 py-3"><Badge color={TYPE_COLORS[p.paper_type]||'gray'}>{TYPE_LABELS[p.paper_type]}</Badge></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.year||'—'}</td>
                    <td className="px-4 py-3">{p.pdf_url ? <span className="bdg-blue text-xs">✓ PDF</span> : <span className="text-gray-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.paper_sections?.length||0}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.total_marks}</td>
                    <td className="px-4 py-3"><Badge color={p.is_active?'green':'gray'}>{p.is_active?'Active':'Hidden'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>navigate(`/admin/papers/${p.id}/sections`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Sections">
                          <ChevronRight size={15}/>
                        </button>
                        <button onClick={()=>openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"><Edit2 size={15}/></button>
                        <button onClick={()=>setDeleteConfirm(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={15}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Paper':'Add Paper'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Grade" value={form.grade} onChange={e=>setForm(f=>({...f,grade:e.target.value}))}>
              {GRADES.map(g=><option key={g} value={g}>Grade {g}</option>)}
            </Sel>
            <Sel label="Subject" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}>
              {SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}
            </Sel>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Paper Type" value={form.paper_type} onChange={e=>setForm(f=>({...f,paper_type:e.target.value}))}>
              {TYPES.map(t=><option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </Sel>
            <Field label="Year (optional)" type="number" placeholder="2023" value={form.year}
              onChange={e=>setForm(f=>({...f,year:e.target.value}))}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Term (1/2/3)" type="number" min="1" max="3" placeholder="1" value={form.term}
              onChange={e=>setForm(f=>({...f,term:e.target.value}))}/>
            <Field label="Duration (min)" type="number" placeholder="180" value={form.duration_mins}
              onChange={e=>setForm(f=>({...f,duration_mins:e.target.value}))}/>
          </div>
          <Field label="Title *" placeholder="e.g. 2023 Grade 10 Science Paper I" value={form.title}
            onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Marks" type="number" value={form.total_marks}
              onChange={e=>setForm(f=>({...f,total_marks:e.target.value}))}/>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} className="w-4 h-4 accent-blue-600"/>
                Active
              </label>
            </div>
          </div>
          <Txt label="Description (optional)" placeholder="Brief description" value={form.description}
            onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="min-h-[70px]"/>
          {/* PDF section */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1">
              <FileDown size={13}/> PDF Paper (for download)
            </p>
            <Field label="PDF URL" placeholder="https://drive.google.com/file/d/.../view or direct .pdf link"
              value={form.pdf_url} onChange={e=>setForm(f=>({...f,pdf_url:e.target.value}))}/>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Paste a <strong>direct PDF link</strong> or <strong>Google Drive share URL</strong>.<br/>
              For Google Drive: File → Share → Copy link (set to &quot;Anyone with link&quot;).
            </p>
            {form.pdf_url?.trim() && (
              <a href={form.pdf_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:underline font-medium">
                <FileDown size={11}/> Test PDF link →
              </a>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="white" className="flex-1" onClick={()=>setModalOpen(false)}>Cancel</Btn>
            <Btn variant="blue" className="flex-1" loading={saving} onClick={handleSave}>
              {editing?'Save Changes':'Create Paper'}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={()=>setDeleteConfirm(null)} title="Delete Paper" size="sm">
        <p className="text-gray-600 mb-5">Delete <strong>{deleteConfirm?.title}</strong>? All sections and questions will be removed.</p>
        <div className="flex gap-3">
          <Btn variant="white" className="flex-1" onClick={()=>setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="red" className="flex-1" onClick={()=>handleDelete(deleteConfirm?.id)}>Delete</Btn>
        </div>
      </Modal>
    </div>
  )
}
