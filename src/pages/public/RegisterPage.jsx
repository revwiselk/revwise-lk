import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Btn, Field, Sel } from '@/components/ui'
import { Mail, Lock, User, School } from 'lucide-react'
import toast from 'react-hot-toast'

const GRADES = [6,7,8,9,10,11]
const MEDIUMS = ['sinhala','tamil','english']
const DISTRICTS = [
  'Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha',
  'Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala',
  'Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya',
  'Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya',
]

export default function RegisterPage() {
  const { loadProfile } = useAuthStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirm: '',
    grade: '6', medium: 'sinhala', school_name: '', district: 'Colombo',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const v1 = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (form.password.length < 6) e.password = 'Minimum 6 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    return e
  }

  const handleNext = () => {
    const e = v1()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({}); setStep(2)
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setLoading(true)

    // 1. Create Supabase auth user
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { full_name: form.full_name.trim() }, // stored in raw_user_meta_data
      },
    })

    if (error) {
      if (error.message.includes('rate limit') || error.status === 429) {
        toast.error('Too many sign-up attempts. Please wait a few minutes and try again.', { duration: 6000 })
      } else {
        toast.error(error.message)
      }
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (!userId) {
      // Email confirmation required — Supabase returns no session
      toast.success('Check your email to confirm your account, then log in!', { duration: 8000 })
      navigate('/login')
      setLoading(false)
      return
    }

    // 2. Insert student_profiles row
    const { error: profileErr } = await supabase.from('student_profiles').insert({
      id: userId,
      full_name: form.full_name.trim(),
      grade: parseInt(form.grade),
      medium: form.medium,
      school_name: form.school_name.trim() || null,
      district: form.district || null,
    })

    if (profileErr) {
      // Profile insert failed — still let them log in
      console.error('Profile insert error:', profileErr.message)
    }

    await loadProfile(userId, form.email.trim())
    toast.success('Account created! Welcome to RevWise 🎉')
    navigate('/dashboard')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="font-bold text-xl text-gray-900">RevWise<span className="text-blue-600">.lk</span></span>
          </Link>
          <h1 className="font-bold text-2xl text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1 text-sm">Free forever · No credit card needed</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{s}</div>
              <span className={`text-xs font-medium ${step >= s ? 'text-blue-600' : 'text-gray-400'}`}>{s === 1 ? 'Account' : 'Profile'}</span>
              {s < 2 && <div className="w-8 h-px bg-gray-300"/>}
            </div>
          ))}
        </div>

        <div className="card p-8 animate-fade-up">
          {step === 1 ? (
            <div className="space-y-4">
              <Field label="Full name" placeholder="Kasun Perera" icon={User}
                value={form.full_name} error={errors.full_name}
                onChange={e => set('full_name', e.target.value)}/>
              <Field label="Email address" type="email" placeholder="kasun@example.com"
                icon={Mail} value={form.email} error={errors.email}
                onChange={e => set('email', e.target.value)}/>
              <Field label="Password" type="password" placeholder="Minimum 6 characters"
                icon={Lock} value={form.password} error={errors.password}
                hint="At least 6 characters"
                onChange={e => set('password', e.target.value)}/>
              <Field label="Confirm password" type="password" placeholder="Repeat password"
                icon={Lock} value={form.confirm} error={errors.confirm}
                onChange={e => set('confirm', e.target.value)}/>
              <Btn variant="blue" size="lg" className="w-full mt-2" onClick={handleNext}>
                Continue →
              </Btn>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Sel label="Grade" value={form.grade} onChange={e => set('grade', e.target.value)}>
                  {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                </Sel>
                <Sel label="Medium" value={form.medium} onChange={e => set('medium', e.target.value)}>
                  {MEDIUMS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                </Sel>
              </div>
              <Field label="School name (optional)" placeholder="Nalanda College"
                icon={School} value={form.school_name}
                onChange={e => set('school_name', e.target.value)}/>
              <Sel label="District (optional)" value={form.district} onChange={e => set('district', e.target.value)}>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </Sel>
              <div className="flex gap-3 mt-2">
                <Btn type="button" variant="white" size="lg" className="flex-1" onClick={() => setStep(1)}>← Back</Btn>
                <Btn type="submit" variant="blue" size="lg" className="flex-1" loading={loading}>
                  Create Account 🎉
                </Btn>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
