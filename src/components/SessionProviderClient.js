"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SessionContext = createContext({})

export default function SessionProviderClient({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const SESSION_TIMEOUT_MS = 10000

    const getSession = async () => {
      try {
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session load timeout')), SESSION_TIMEOUT_MS)
        )
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise])
        if (error) {
          setUser(null)
          setSession(null)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (err) {
        setUser(null)
        setSession(null)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const value = {
    session,
    user,
    isLoading,
    supabase
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProviderClient')
  }
  return context
} 