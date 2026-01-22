import { useState, useEffect } from 'react'
import { useSession } from '@/components/SessionProviderClient'

/**
 * Hook to check if the current user has a paid plan
 * Returns: { isPaid: boolean, isLoading: boolean, plan: string }
 */
export function usePaidPlan() {
  const { user, isLoading: sessionLoading } = useSession()
  const [isPaid, setIsPaid] = useState(false)
  const [plan, setPlan] = useState('free')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (sessionLoading) {
      setIsLoading(true)
      return
    }

    if (!user) {
      setIsPaid(false)
      setPlan('free')
      setIsLoading(false)
      return
    }

    const checkPaidPlan = async () => {
      try {
        const response = await fetch('/api/billing/status')
        if (response.ok) {
          const data = await response.json()
          
          // Check if user has any active paid purchases
          const hasActivePurchase = data.purchases?.some(p => {
            if (p.status !== 'active') return false
            
            // Check if it's a subscription that hasn't expired
            if (p.purchase_type === 'subscription') {
              if (!p.expires_at) return true
              return new Date(p.expires_at) > new Date()
            }
            
            // For one-time purchases, check if they're active
            return p.purchase_type === 'one_time'
          })

          // Also check billing table for backwards compatibility
          const hasActiveBilling = data.billing?.status === 'active'

          const userIsPaid = hasActivePurchase || hasActiveBilling
          setIsPaid(userIsPaid)
          
          // Determine plan name
          if (hasActivePurchase) {
            const activePurchase = data.purchases.find(p => {
              if (p.status !== 'active') return false
              if (p.purchase_type === 'subscription') {
                return !p.expires_at || new Date(p.expires_at) > new Date()
              }
              return p.purchase_type === 'one_time'
            })
            setPlan(activePurchase?.plan || 'free')
          } else if (hasActiveBilling) {
            setPlan(data.billing?.plan || 'free')
          } else {
            setPlan('free')
          }
        } else {
          setIsPaid(false)
          setPlan('free')
        }
      } catch (error) {
        console.error('Error checking paid plan:', error)
        setIsPaid(false)
        setPlan('free')
      } finally {
        setIsLoading(false)
      }
    }

    checkPaidPlan()
  }, [user, sessionLoading])

  return { isPaid, isLoading, plan }
}
