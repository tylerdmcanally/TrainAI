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
      console.log('useUser: Getting initial user...')
      const { data: { user } } = await supabase.auth.getUser()
      console.log('useUser: Auth user:', user)
      setAuthUser(user)

      if (user) {
        // Get user profile
        console.log('useUser: Fetching user profile...')
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        console.log('useUser: Profile data:', { profileData, profileError })
        setProfile(profileData)

        // Get company name if user has a company
        if (profileData?.company_id) {
          console.log('useUser: Fetching company data...')
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('name')
            .eq('id', profileData.company_id)
            .single()

          console.log('useUser: Company data:', { companyData, companyError })
          setCompanyName(companyData?.name || null)
        }
      }

      setLoading(false)
      console.log('useUser: Initial loading complete')
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('useUser: Auth state change:', { event, session: !!session })
        setAuthUser(session?.user ?? null)

        if (session?.user) {
          console.log('useUser: Auth state change - fetching profile...')
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          console.log('useUser: Auth state change - profile data:', { profileData, profileError })
          setProfile(profileData)

          // Get company name if user has a company
          if (profileData?.company_id) {
            const { data: companyData, error: companyError } = await supabase
              .from('companies')
              .select('name')
              .eq('id', profileData.company_id)
              .single()

            console.log('useUser: Auth state change - company data:', { companyData, companyError })
            setCompanyName(companyData?.name || null)
          } else {
            setCompanyName(null)
          }
        } else {
          console.log('useUser: Auth state change - no session, clearing data')
          setProfile(null)
          setCompanyName(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { authUser, profile, companyName, loading }
}
