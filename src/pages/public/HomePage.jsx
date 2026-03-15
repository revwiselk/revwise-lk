import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle2, Globe, GraduationCap, ArrowRight, Star } from 'lucide-react'

const SUBJECTS = [
  { name:'Science',     emoji:'🔬', bg:'bg-blue-50',   text:'text-blue-700',   border:'border-blue-200'   },
  { name:'Mathematics', emoji:'📐', bg:'bg-purple-50', text:'text-purple-700', border:'border-purple-200' },
  { name:'Sinhala',     emoji:'📖', bg:'bg-amber-50',  text:'text-amber-700',  border:'border-amber-200'  },
  { name:'English',     emoji:'📝', bg:'bg-sky-50',    text:'text-sky-700',    border:'border-sky-200'    },
  { name:'History',     emoji:'🏛️', bg:'bg-orange-50', text:'text-orange-700', border:'border-orange-200' },
  { name:'Geography',   emoji:'🌍', bg:'bg-green-50',  text:'text-green-700',  border:'border-green-200'  },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5"/>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5"/>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 text-sm font-medium mb-6 animate-fade-in">
            <Star size={14} className="text-yellow-300 fill-yellow-300"/> Sri Lanka's Curriculum-Aligned Learning Platform
          </div>
          <h1 className="font-bold text-4xl sm:text-5xl lg:text-6xl mb-6 leading-tight animate-fade-up">
            Learn Smarter,<br/><span className="text-cyan-300">Score Higher</span>
          </h1>
          <p className="text-blue-100 text-lg sm:text-xl max-w-2xl mx-auto mb-10 animate-fade-up s2">
            Grade 6–11 government syllabus. Unit-wise notes & quizzes.<br/>
            <strong className="text-white">No login needed to browse and attempt quizzes!</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up s3">
            <Link to="/subjects" className="btn-lg btn-white gap-2 w-full sm:w-auto justify-center shadow-lg">
              Browse Subjects <ArrowRight size={18}/>
            </Link>
            <Link to="/register" className="btn-lg w-full sm:w-auto justify-center border-2 border-white/40 text-white hover:bg-white/10 rounded-xl font-medium px-6 py-3 transition-all inline-flex items-center gap-2">
              Create Free Account
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mt-14 animate-fade-up s4">
            {[{label:'Grades',v:'6–11'},{label:'Languages',v:'3'},{label:'Free',v:'100%'}].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-2xl p-4">
                <div className="font-bold text-2xl text-white">{s.v}</div>
                <div className="text-blue-200 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="font-bold text-3xl text-gray-900 mb-3">Everything you need to succeed</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Built for Sri Lankan students. Follows the official government syllabus.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon:BookOpen,      title:'Unit Notes',      desc:'Structured Markdown notes with images, tables and examples.' },
            { icon:CheckCircle2,  title:'Practice Quizzes', desc:'MCQ & True/False per unit. Score shown instantly.' },
            { icon:Globe,         title:'3 Languages',      desc:'Full content in Sinhala, Tamil and English.' },
            { icon:GraduationCap, title:'No Login Needed',  desc:'Browse and attempt quizzes freely. Login only to save scores.' },
          ].map((f, i) => (
            <div key={f.title} className={`card p-6 animate-fade-up s${i+1}`}>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <f.icon size={22} className="text-blue-600"/>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subjects */}
      <section className="bg-gray-50 border-y border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-bold text-3xl text-gray-900 mb-3">Explore Subjects</h2>
            <p className="text-gray-500">All subjects across Grade 6–11</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {SUBJECTS.map((s, i) => (
              <Link key={s.name} to="/subjects"
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 text-center transition-all hover:shadow-md hover:-translate-y-0.5 animate-fade-up s${Math.min(i+1,5)} ${s.bg} ${s.text} ${s.border}`}>
                <span className="text-3xl">{s.emoji}</span>
                <span className="text-sm font-semibold">{s.name}</span>
              </Link>
            ))}
          </div>
          <div className="text-center">
            <Link to="/subjects" className="btn-md btn-blue gap-2 inline-flex">View All Subjects <ArrowRight size={16}/></Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl p-10 text-white">
          <h2 className="font-bold text-3xl mb-4">Start learning right now</h2>
          <p className="text-blue-100 mb-8 max-w-md mx-auto">No account needed to browse notes and take quizzes. Create an account to track your progress.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/subjects" className="btn-lg btn-white gap-2 inline-flex justify-center">Browse Subjects <ArrowRight size={18}/></Link>
            <Link to="/register" className="btn-lg border-2 border-white/40 text-white hover:bg-white/10 rounded-xl font-medium px-6 py-3 inline-flex items-center gap-2 justify-center transition-all">Free Account →</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
