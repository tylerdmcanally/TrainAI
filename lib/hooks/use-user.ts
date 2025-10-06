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
        console.log('useUser: Getting initial user...')
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        console.log('useUser: Auth user:', { user, authError })
        
        if (authError) {
          console.error('useUser: Auth error:', authError)
          setLoading(false)
          return
        }
        
        setAuthUser(user)

        if (user) {
          // Get user profile
          console.log('useUser: Fetching user profile for:', user.id)
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

          console.log('useUser: Profile data:', { profileData, profileError })
          setProfile(profileData)

          // Get company name if user has a company
          if (profileData?.company_id) {
            console.log('useUser: Fetching company data for:', profileData.company_id)
            const { data: companyData, error: companyError } = await supabase
              .from('companies')
              .select('name')
              .eq('id', profileData.company_id)
              .single()

            console.log('useUser: Company data:', { companyData, companyError })
            setCompanyName(companyData?.name || null)
          }
        } else {
          console.log('useUser: No authenticated user')
        }

        console.log('useUser: Setting loading to false')
        setLoading(false)
      } catch (error) {
        console.error('useUser: Unexpected error:', error)
        setLoading(false)
      }
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
