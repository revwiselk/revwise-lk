import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Btn, Field } from '@/components/ui'
import { Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { loadProfile } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = 'Email is required'
    if (!form.password) e.password = 'Password is required'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const role = await loadProfile(data.user.id, data.user.email)
    setLoading(false)

    if (role === 'admin') {
      toast.success('Welcome back, Admin!')
      navigate('/admin')
    } else {
      toast.success('Welcome back!')
      navigate('/dashboard')
    }
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
          <h1 className="font-bold text-2xl text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your account</p>
        </div>

        <div className="card p-8 animate-fade-up">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email address" type="email" placeholder="you@example.com"
              icon={Mail} value={form.email} error={errors.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
            <Field label="Password" type="password" placeholder="••••••••"
              icon={Lock} value={form.password} error={errors.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}/>
            <Btn type="submit" variant="blue" size="lg" className="w-full mt-2" loading={loading}>
              Sign In
            </Btn>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">Register free</Link>
          </p>
          {/* <p className="text-center text-xs text-gray-400 mt-2">
            Admin? Use your admin email and password.
          </p> */}
        </div>
      </div>
    </div>
  )
}
