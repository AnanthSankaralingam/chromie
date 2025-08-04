import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Utility function to navigate to builder with project ID
export const navigateToBuilderWithProject = (projectId) => {
  // Navigate to builder with project ID in URL, then clear it
  window.location.href = `/builder?projectId=${projectId}`
}
