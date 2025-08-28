"use client"

import { useState } from "react"
import TokenUsageDisplay from "@/components/ui/token-usage-display"
import { SessionProviderClient } from "@/components/SessionProviderClient"
import { Button } from "@/components/ui/button"

function TestTokenUsageContent() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const triggerTokenUpdate = async () => {
    setIsUpdating(true)
    try {
      // Test data - using the actual values from our tests
      const testData = {
        user_id: 'd292125a-fccb-4aa6-a850-1f4fae785856',
        id: 'e9513139-96ce-46d2-9145-d1b51b236372',
        tokensThisRequest: 500,
        model: 'gpt-4o'
      }
      
      const response = await fetch('/api/token-usage/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      })
      
      const result = await response.json()
      console.log('Token update result:', result)
      
      if (result.success) {
        setLastUpdate(`Updated: ${result.row.total_tokens} tokens total`)
        
        // Trigger the token usage display to refresh
        const tokenUsageEvent = new CustomEvent('tokenUsageUpdated')
        window.dispatchEvent(tokenUsageEvent)
      } else {
        setLastUpdate(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error updating tokens:', error)
      setLastUpdate(`Error: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Token Usage Test Page</h1>
        
        <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-4">Current Token Usage:</h2>
          <TokenUsageDisplay />
        </div>
        
        <div className="mt-8 bg-slate-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-4">Test Token Update:</h2>
          <div className="space-y-4">
            <Button 
              onClick={triggerTokenUpdate}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? 'Updating...' : 'Add 500 Tokens'}
            </Button>
            
            {lastUpdate && (
              <div className="text-sm text-slate-300">
                {lastUpdate}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 bg-slate-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-4">Test Instructions:</h2>
          <ul className="text-slate-300 space-y-2">
            <li>• Make sure you're logged in to see the token usage</li>
            <li>• The token usage should show: 6.7k / 50.0k (13%)</li>
            <li>• Click "Add 500 Tokens" to test the update functionality</li>
            <li>• The display should refresh automatically after the update</li>
            <li>• Check the browser console for debugging information</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function TestTokenUsagePage() {
  return (
    <SessionProviderClient>
      <TestTokenUsageContent />
    </SessionProviderClient>
  )
}
