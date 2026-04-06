"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useSession } from '@/components/SessionProviderClient'
import { derivePaidPlanFromStatusResponse } from '@/lib/billing-client'

const BillingPlanContext = createContext(null)

export function BillingPlanProviderClient({ children }) {
  const { user, isLoading: sessionLoading } = useSession()
  const [billing, setBilling] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [isPaid, setIsPaid] = useState(false)
  const [plan, setPlan] = useState('free')
  const [isLoading, setIsLoading] = useState(true)

  const loadStatus = useCallback(
    async (signal) => {
      const response = await fetch('/api/billing/status', {
        credentials: 'same-origin',
        signal,
      })
      if (!response.ok) {
        setBilling(null)
        setPurchases([])
        setIsPaid(false)
        setPlan('free')
        return
      }
      const data = await response.json()
      setBilling(data.billing ?? null)
      setPurchases(data.purchases ?? [])
      const derived = derivePaidPlanFromStatusResponse(data)
      setIsPaid(derived.isPaid)
      setPlan(derived.plan)
    },
    []
  )

  const userId = user?.id

  const refreshBilling = useCallback(async () => {
    if (!userId) return
    try {
      await loadStatus(undefined)
    } catch (error) {
      if (error?.name === 'AbortError') return
      console.error('Error refreshing billing:', error)
    }
  }, [userId, loadStatus])

  useEffect(() => {
    if (sessionLoading) {
      setIsLoading(true)
      return
    }

    if (!userId) {
      setBilling(null)
      setPurchases([])
      setIsPaid(false)
      setPlan('free')
      setIsLoading(false)
      return
    }

    const abortController = new AbortController()

    ;(async () => {
      setIsLoading(true)
      try {
        await loadStatus(abortController.signal)
      } catch (error) {
        if (error?.name === 'AbortError') return
        console.error('Error loading billing status:', error)
        setBilling(null)
        setPurchases([])
        setIsPaid(false)
        setPlan('free')
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false)
        }
      }
    })()

    return () => abortController.abort()
  }, [userId, sessionLoading, loadStatus])

  const value = useMemo(
    () => ({
      billing,
      purchases,
      isPaid,
      plan,
      isLoading,
      refreshBilling,
    }),
    [billing, purchases, isPaid, plan, isLoading, refreshBilling]
  )

  return (
    <BillingPlanContext.Provider value={value}>
      {children}
    </BillingPlanContext.Provider>
  )
}

export function useBillingPlan() {
  const ctx = useContext(BillingPlanContext)
  if (!ctx) {
    throw new Error('useBillingPlan must be used within BillingPlanProviderClient')
  }
  return ctx
}
