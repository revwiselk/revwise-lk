import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      profile: null,
      role: null,       // 'student' | 'admin' | null
      loading: true,

      setLoading: (v) => set({ loading: v }),

      loadProfile: async (userId, email) => {
        // 1. Check admin_profiles
        const { data: adminRow } = await supabaseAdmin
          .from('admin_profiles')
          .select('id, email, full_name')
          .eq('email', email)
          .eq('is_active', true)
          .maybeSingle()

        if (adminRow) {
          set({ user: { id: userId, email }, profile: adminRow, role: 'admin', loading: false })
          return 'admin'
        }

        // 2. Student
        const { data: studentRow } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        set({
          user: { id: userId, email },
          profile: studentRow || { id: userId, email, full_name: email.split('@')[0] },
          role: 'student',
          loading: false,
        })
        return 'student'
      },

      setProfile: (profile) => set({ profile }),
      clear: () => set({ user: null, profile: null, role: null, loading: false }),
      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null, role: null })
      },
    }),
    {
      name: 'RevWise',
      partialize: () => ({}),
    }
  )
)
