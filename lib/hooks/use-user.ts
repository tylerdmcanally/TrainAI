'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { User as AppUser } from '@/lib/types/database'

export function useUser() {
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setAuthUser(user)

      if (user) {
        // Get user profile
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        setProfile(profileData)
      }

      setLoading(false)
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthUser(session?.user ?? null)

        if (session?.user) {
          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setProfile(profileData)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { authUser, profile, loading }
}
