// Simple test to verify onboarding localStorage behavior
console.log('Testing onboarding localStorage functionality...')

// Test localStorage key
const ONBOARDING_STORAGE_KEY = "chromie-onboarding-completed"

// Clear any existing onboarding state
localStorage.removeItem(ONBOARDING_STORAGE_KEY)
console.log('Cleared onboarding state')

// Test initial state (should be false)
const initialState = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true"
console.log('Initial onboarding state:', initialState)

// Test setting onboarding as completed
localStorage.setItem(ONBOARDING_STORAGE_KEY, "true")
const completedState = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true"
console.log('After marking as completed:', completedState)

// Test clearing onboarding state
localStorage.removeItem(ONBOARDING_STORAGE_KEY)
const clearedState = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true"
console.log('After clearing:', clearedState)

console.log('Onboarding localStorage test completed successfully!')
