import { useBillingPlan } from '@/components/BillingPlanProviderClient'

/**
 * Paid-plan flags from session-scoped billing (one fetch per login session).
 * Enforcement remains on the server via checkPaidPlan in API routes.
 */
export function usePaidPlan() {
  const { isPaid, isLoading, plan } = useBillingPlan()
  return { isPaid, isLoading, plan }
}
