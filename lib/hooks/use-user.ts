'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { User as AppUser } from '@/lib/types/database'

export function useUser() {
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    const getUser = async () => {
      try {
        // Add timeout to auth call to prevent hanging
        const authPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth call timeout')), 3000)
        )
        
        const { data: { user }, error: authError } = await Promise.race([authPromise, timeoutPromise])
        
        if (authError) {
          setLoading(false)
          return
        }
        
        setAuthUser(user)

        if (user) {
          // Get user profile
          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

          setProfile(profileData)

          // Get company name if user has a company
          if (profileData?.company_id) {
            const { data: companyData } = await supabase
              .from('companies')
              .select('name')
              .eq('id', profileData.company_id)
              .single()

            setCompanyName(companyData?.name || null)
          }
        }

        setLoading(false)
      } catch (error) {
        setLoading(false)
      }
    }

    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      setLoading(false)
    }, 5000)

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

          // Get company name if user has a company
          if (profileData?.company_id) {
            const { data: companyData } = await supabase
              .from('companies')
              .select('name')
              .eq('id', profileData.company_id)
              .single()

            setCompanyName(companyData?.name || null)
          } else {
            setCompanyName(null)
          }
        } else {
          setProfile(null)
          setCompanyName(null)
        }

        setLoading(false)
      }
    )

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  return {
    authUser,
    user: authUser,
    profile,
    companyName,
    loading,
  }
}
